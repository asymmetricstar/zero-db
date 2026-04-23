"use strict";
/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spawn = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("./crypto");
const event_manager_1 = require("./event-manager");
class Spawn {
    constructor(rootPath, dbName, tableName, fieldName, fileName) {
        this.flushTimer = null;
        this.loaded = false;
        this.isReading = false;
        this.readPromise = null;
        const dbHash = crypto_1.Crypto.hash(dbName);
        const tableHash = crypto_1.Crypto.hash(tableName);
        this.filePath = path.join(rootPath, dbHash, tableHash, fileName);
        this.dataCache = new Map();
        this.writeBuffer = new Map();
        this.deleteBuffer = new Set();
        this.autoIncrement = 1;
        this.stats = { hits: 0, misses: 0, size: 0, buffered: 0 };
    }
    static create(rootPath, dbName, tableName, fieldName, fileName) {
        return new Spawn(rootPath, dbName, tableName, fieldName, fileName);
    }
    static getQueueKey(filePath) {
        return filePath;
    }
    static shouldQueue(filePath) {
        const count = Spawn.pendingWrites.get(filePath) || 0;
        return count >= Spawn.QUEUE_THRESHOLD;
    }
    static async queueWrite(filePath, writeFn) {
        const key = this.getQueueKey(filePath);
        const current = this.pendingWrites.get(key) || 0;
        this.pendingWrites.set(key, current + 1);
        try {
            const previousWrite = this.writeQueue.get(key);
            const chain = previousWrite || Promise.resolve();
            const newWrite = chain.then(async () => {
                await writeFn();
            });
            this.writeQueue.set(key, newWrite);
            await newWrite;
        }
        finally {
            const count = this.pendingWrites.get(key) || 1;
            this.pendingWrites.set(key, count - 1);
        }
    }
    static async flushQueue(filePath) {
        const key = this.getQueueKey(filePath);
        const pending = this.writeQueue.get(key);
        if (pending) {
            await pending;
        }
    }
    static clearQueue(filePath) {
        const key = this.getQueueKey(filePath);
        this.writeQueue.delete(key);
        this.pendingWrites.delete(key);
    }
    /**
     * Streaming Read - Bypasses Node.js 2GB Buffer Limit
     */
    async read() {
        const hasExistingData = this.dataCache.size > 0;
        if (this.loaded)
            return;
        if (this.isReading)
            return this.readPromise;
        if (!fs.existsSync(this.filePath)) {
            this.loaded = true;
            return;
        }
        this.isReading = true;
        this.readPromise = new Promise((resolve, reject) => {
            const stream = fs.createReadStream(this.filePath);
            let headerProcessed = false;
            let remainingHeader = Buffer.alloc(0);
            let dataLength = 0;
            let processedLength = 0;
            let remainingData = '';
            stream.on('data', (chunk) => {
                let currentChunk = chunk;
                if (!headerProcessed) {
                    const combined = Buffer.concat([remainingHeader, currentChunk]);
                    if (combined.length < 9) {
                        remainingHeader = combined;
                        return;
                    }
                    if (combined.slice(0, 4).equals(Buffer.from([0x5A, 0x45, 0x44, 0x42]))) {
                        dataLength = combined.readUInt32BE(5);
                        headerProcessed = true;
                        currentChunk = combined.slice(9);
                    }
                    else {
                        headerProcessed = true;
                        currentChunk = combined;
                        dataLength = -1;
                    }
                }
                let text = '';
                if (dataLength === -1) {
                    text = currentChunk.toString('utf8');
                }
                else {
                    const decrypted = crypto_1.Crypto.xor(currentChunk, processedLength);
                    processedLength += currentChunk.length;
                    text = decrypted.toString('utf8');
                }
                remainingData += text;
                const lines = remainingData.split('\n');
                remainingData = lines.pop() || '';
                for (const line of lines) {
                    if (hasExistingData) {
                        // Merge: only add line if it doesn't exist in cache (keep newer in-memory data)
                        const parts = line.trim().split(':');
                        if (parts.length >= 2) {
                            const lineNum = parseInt(parts[0], 10);
                            if (!this.dataCache.has(lineNum)) {
                                this.processLine(line);
                            }
                        }
                    }
                    else {
                        this.processLine(line);
                    }
                }
            });
            stream.on('end', () => {
                if (remainingData) {
                    if (hasExistingData) {
                        const parts = remainingData.trim().split(':');
                        if (parts.length >= 2) {
                            const lineNum = parseInt(parts[0], 10);
                            if (!this.dataCache.has(lineNum)) {
                                this.processLine(remainingData);
                            }
                        }
                    }
                    else {
                        this.processLine(remainingData);
                    }
                }
                this.stats.size = this.dataCache.size;
                this.loaded = true;
                this.isReading = false;
                resolve();
            });
            stream.on('error', (err) => {
                event_manager_1.EventManager.error(`Error reading file stream`, { path: this.filePath, error: err.message });
                this.isReading = false;
                reject(err);
            });
        });
        return this.readPromise;
    }
    processLine(line) {
        const trimmed = line.trim();
        if (!trimmed)
            return;
        if (trimmed.startsWith('AUTO_INCREMENT:')) {
            const parts = trimmed.split(':');
            if (parts.length > 1) {
                this.autoIncrement = parseInt(parts[1], 10);
            }
            return;
        }
        const parts = trimmed.split(':');
        if (parts.length >= 2) {
            const lineNum = parseInt(parts[0], 10);
            const value = parts.slice(1).join(':');
            this.dataCache.set(lineNum, value);
        }
    }
    async write() {
        if (Spawn.shouldQueue(this.filePath)) {
            return Spawn.queueWrite(this.filePath, async () => {
                await this.doWrite();
            });
        }
        else {
            return this.doWrite();
        }
    }
    async doWrite() {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
            return;
        }
        if (!fs.existsSync(this.filePath)) {
            return;
        }
        return new Promise((resolve, reject) => {
            const writeStream = fs.createWriteStream(this.filePath);
            const header = Buffer.alloc(9);
            Buffer.from([0x5A, 0x45, 0x44, 0x42]).copy(header, 0);
            header.writeUInt8(1, 4);
            const sortedKeys = Array.from(this.dataCache.keys()).sort((a, b) => a - b);
            let totalLength = Buffer.byteLength(`AUTO_INCREMENT:${this.autoIncrement}\n`, 'utf8');
            for (const lineNum of sortedKeys) {
                const value = this.dataCache.get(lineNum);
                if (value !== undefined) {
                    totalLength += Buffer.byteLength(`${lineNum}:${value}\n`, 'utf8');
                }
            }
            header.writeUInt32BE(totalLength, 5);
            writeStream.write(header);
            let processedLength = 0;
            const xorWrite = (content) => {
                const buf = Buffer.from(content, 'utf8');
                const encrypted = crypto_1.Crypto.xor(buf, processedLength);
                processedLength += buf.length;
                return writeStream.write(encrypted);
            };
            xorWrite(`AUTO_INCREMENT:${this.autoIncrement}\n`);
            for (const lineNum of sortedKeys) {
                const value = this.dataCache.get(lineNum);
                if (value !== undefined) {
                    xorWrite(`${lineNum}:${value}\n`);
                }
            }
            writeStream.end();
            writeStream.on('finish', () => {
                this.writeBuffer.clear();
                this.deleteBuffer.clear();
                this.loaded = true; // Mark as loaded since dataCache is now in sync with disk
                resolve();
            });
            writeStream.on('error', reject);
        });
    }
    append(line, value) {
        this.dataCache.set(line, value);
        this.writeBuffer.set(line, value);
        // Update autoIncrement to track the next available ID
        if (line >= this.autoIncrement) {
            this.autoIncrement = line + 1;
        }
        this.scheduleFlush();
    }
    update(lines, value) {
        for (const line of lines) {
            this.dataCache.set(line, value);
            this.writeBuffer.set(line, value);
        }
        this.scheduleFlush();
    }
    delete(lines) {
        for (const line of lines) {
            this.dataCache.delete(line);
            this.deleteBuffer.add(line);
        }
        this.scheduleFlush();
    }
    getAll() {
        this.stats.hits++;
        return new Map(this.dataCache);
    }
    get(line) {
        const val = this.dataCache.get(line);
        if (val !== undefined)
            this.stats.hits++;
        else
            this.stats.misses++;
        return val;
    }
    getAutoIncrement() {
        if (fs.existsSync(this.filePath)) {
            const content = fs.readFileSync(this.filePath);
            if (content.length > 9) {
                const dataLength = content.readUInt32BE(5);
                const body = content.slice(9, 9 + dataLength);
                const decrypted = crypto_1.Crypto.xor(body, 0);
                const text = decrypted.toString('utf8');
                const autoMatch = text.match(/^AUTO_INCREMENT:(\d+)/m);
                if (autoMatch) {
                    return parseInt(autoMatch[1], 10);
                }
            }
        }
        return this.autoIncrement;
    }
    isLoaded() {
        return this.loaded;
    }
    resetLoaded() {
        this.loaded = false;
        this.dataCache.clear();
    }
    reload() {
        // Clear cache and mark as not loaded so we re-read from disk
        this.loaded = false;
        this.dataCache.clear();
    }
    async ensureMaxLine() {
        if (!this.loaded && fs.existsSync(this.filePath)) {
            await this.read();
        }
        return this.getMaxLine();
    }
    getMaxLine() {
        if (this.dataCache.size === 0 && fs.existsSync(this.filePath)) {
            const content = fs.readFileSync(this.filePath);
            if (content.length > 9) {
                const dataLength = content.readUInt32BE(5);
                const body = content.slice(9, 9 + dataLength);
                const decrypted = crypto_1.Crypto.xor(body, 0);
                const text = decrypted.toString('utf8');
                const lines = text.split('\n');
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed)
                        continue;
                    if (trimmed.startsWith('AUTO_INCREMENT:'))
                        continue;
                    const parts = trimmed.split(':');
                    if (parts.length >= 2) {
                        const lineNum = parseInt(parts[0], 10);
                        if (!isNaN(lineNum)) {
                            this.dataCache.set(lineNum, parts.slice(1).join(':'));
                        }
                    }
                }
            }
        }
        let max = 0;
        for (const line of this.dataCache.keys()) {
            if (line > max)
                max = line;
        }
        return max;
    }
    getDataCache() {
        return new Map(this.dataCache);
    }
    setAutoIncrement(val) {
        this.autoIncrement = val;
        this.scheduleFlush();
    }
    scheduleFlush() {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
        }
        this.flushTimer = setTimeout(() => this.flush(), 100);
    }
    async flush() {
        this.flushTimer = null;
        await this.write();
    }
    async forceFlush() {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }
        await this.write();
    }
    getStats() {
        return { ...this.stats, buffered: this.writeBuffer.size };
    }
}
exports.Spawn = Spawn;
Spawn.writeQueue = new Map();
Spawn.pendingWrites = new Map();
Spawn.QUEUE_THRESHOLD = 5;
//# sourceMappingURL=spawn.js.map