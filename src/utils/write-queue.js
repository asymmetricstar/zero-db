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
exports.WriteQueue = void 0;
const fs = __importStar(require("fs"));
const crc32_1 = require("./crc32");
class WriteQueue {
    constructor(maxRetries = 3, retryDelay = 50) {
        this.queue = [];
        this.knownCrcs = new Map();
        this.processing = false;
        this.maxRetries = maxRetries;
        this.retryDelay = retryDelay;
    }
    enqueue(filePath, content) {
        this.queue.push({
            filePath,
            content,
            timestamp: Date.now()
        });
    }
    async flush() {
        if (this.processing)
            return { success: false, errors: ['Flush already in progress'] };
        this.processing = true;
        const errors = [];
        while (this.queue.length > 0) {
            const op = this.queue.shift();
            const success = await this.processWrite(op, errors);
            if (!success)
                break;
        }
        this.processing = false;
        return { success: errors.length === 0, errors };
    }
    async processWrite(op, errors) {
        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                const currentContent = fs.existsSync(op.filePath) ? fs.readFileSync(op.filePath, 'utf8') : '';
                const currentCrc = this.extractCrc(currentContent);
                const known = this.knownCrcs.get(op.filePath);
                if (known && known.crc !== currentCrc) {
                    if (attempt < this.maxRetries - 1) {
                        await this.sleep(this.retryDelay * (attempt + 1));
                        continue;
                    }
                    errors.push(`Write conflict on ${op.filePath} after ${this.maxRetries} retries`);
                    return false;
                }
                const newContent = op.content;
                const newCrc = crc32_1.CRC32.compute(newContent);
                const finalContent = `${newContent}\n#crc:${crc32_1.CRC32.toHex(newCrc)}`;
                const tempPath = op.filePath + '.tmp';
                fs.writeFileSync(tempPath, finalContent, 'utf8');
                fs.renameSync(tempPath, op.filePath);
                this.knownCrcs.set(op.filePath, { crc: newCrc, timestamp: Date.now() });
                return true;
            }
            catch (e) {
                if (attempt < this.maxRetries - 1) {
                    await this.sleep(this.retryDelay * (attempt + 1));
                    continue;
                }
                errors.push(`Write failed on ${op.filePath}: ${e.message}`);
                return false;
            }
        }
        return false;
    }
    syncFile(filePath) {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            const crc = this.extractCrc(content);
            this.knownCrcs.set(filePath, { crc, timestamp: Date.now() });
        }
    }
    clear() {
        this.queue = [];
        this.knownCrcs.clear();
    }
    size() {
        return this.queue.length;
    }
    extractCrc(content) {
        const lines = content.split('\n');
        const lastLine = lines[lines.length - 2];
        if (lastLine && lastLine.startsWith('#crc:')) {
            return parseInt(lastLine.substring(5), 16);
        }
        return 0;
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.WriteQueue = WriteQueue;
//# sourceMappingURL=write-queue.js.map