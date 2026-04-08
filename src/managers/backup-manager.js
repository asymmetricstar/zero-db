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
exports.BackupManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const zlib = __importStar(require("zlib"));
const buffer_1 = require("buffer");
const event_manager_1 = require("../utils/event-manager");
const BACKUP_VERSION = 1;
class BackupManager {
    constructor(rootPath) {
        this.rootPath = rootPath;
    }
    async createBackup(dbName, options = {}) {
        const compressionLevel = options.compressionLevel ?? 6;
        const timestamp = Date.now();
        const backupDir = path.join(this.rootPath, '_backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        const metadata = {
            version: BACKUP_VERSION,
            createdAt: timestamp,
            dbName,
            tables: [],
            recordCounts: new Map(),
            checksum: ''
        };
        const dbHash = require('./md5').MD5.hash(dbName);
        const dbDir = path.join(this.rootPath, dbHash);
        if (!fs.existsSync(dbDir)) {
            event_manager_1.EventManager.error('Database not found');
            return '';
        }
        const backupData = {
            metadata,
            schema: null,
            tables: {}
        };
        if (options.includeSchema !== false) {
            const schemaPath = path.join(this.rootPath, 'schema.zdb');
            const manifestPath = path.join(this.rootPath, 'manifest.zdb');
            backupData.schema = {
                schema: fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath) : null,
                manifest: fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath) : null
            };
        }
        const tableDirs = fs.readdirSync(dbDir);
        for (const tableHash of tableDirs) {
            const tableDir = path.join(dbDir, tableHash);
            if (!fs.statSync(tableDir).isDirectory())
                continue;
            metadata.tables.push(tableHash);
            const tableData = {};
            const files = fs.readdirSync(tableDir);
            let recordCount = 0;
            for (const file of files) {
                if (!file.endsWith('.zdb') || file.includes('__meta__'))
                    continue;
                const filePath = path.join(tableDir, file);
                const data = fs.readFileSync(filePath);
                if (data.length > 9) {
                    const dataLen = data.readUInt32BE(5);
                    if (dataLen > 0 && dataLen <= data.length - 9) {
                        const decrypted = this.xorDecrypt(data.slice(9, 9 + dataLen));
                        tableData[file] = decrypted.toString('utf8');
                        const lines = decrypted.toString('utf8').split('\n').filter((l) => l && !l.startsWith(':'));
                        const lineNumbers = lines.map((line) => {
                            const parts = line.split(':');
                            const num = parseInt(parts[0] || '0');
                            return isNaN(num) ? 0 : num;
                        });
                        recordCount = Math.max(recordCount, ...lineNumbers);
                    }
                }
            }
            backupData.tables[tableHash] = tableData;
            metadata.recordCounts.set(tableHash, recordCount);
        }
        const jsonData = JSON.stringify(backupData, (key, value) => {
            if (value instanceof Map) {
                return Object.fromEntries(value);
            }
            if (buffer_1.Buffer.isBuffer(value)) {
                return value.toString('base64');
            }
            return value;
        });
        const compressed = zlib.deflateSync(buffer_1.Buffer.from(jsonData), { level: compressionLevel });
        const checksum = this.computeChecksum(compressed);
        metadata.checksum = checksum;
        const finalData = JSON.stringify({
            ...backupData,
            metadata: {
                ...metadata,
                recordCounts: Object.fromEntries(metadata.recordCounts)
            }
        });
        const finalCompressed = zlib.deflateSync(buffer_1.Buffer.from(finalData), { level: compressionLevel });
        const backupFileName = `${dbName}_${timestamp}.zdbbak`;
        const backupPath = path.join(backupDir, backupFileName);
        fs.writeFileSync(backupPath, finalCompressed);
        return backupPath;
    }
    async restoreBackup(backupPath, targetDbName) {
        if (!fs.existsSync(backupPath)) {
            return { success: false, error: 'Backup file not found' };
        }
        try {
            const compressed = fs.readFileSync(backupPath);
            const decompressed = zlib.inflateSync(compressed);
            const jsonData = decompressed.toString('utf8');
            const backupData = JSON.parse(jsonData);
            const metadata = backupData.metadata;
            if (metadata.version !== BACKUP_VERSION) {
                return { success: false, error: 'Unsupported backup version' };
            }
            const checksum = this.computeChecksum(compressed);
            if (checksum !== metadata.checksum) {
                return { success: false, error: 'Backup checksum mismatch' };
            }
            const dbName = targetDbName || metadata.dbName;
            const dbHash = require('./md5').MD5.hash(dbName);
            const dbDir = path.join(this.rootPath, dbHash);
            if (!fs.existsSync(this.rootPath)) {
                fs.mkdirSync(this.rootPath, { recursive: true });
            }
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }
            if (backupData.schema) {
                const schemaPath = path.join(this.rootPath, 'schema.zdb');
                const manifestPath = path.join(this.rootPath, 'manifest.zdb');
                if (backupData.schema.schema) {
                    const schemaBuffer = buffer_1.Buffer.from(backupData.schema.schema, 'base64');
                    fs.writeFileSync(schemaPath, schemaBuffer);
                }
                if (backupData.schema.manifest) {
                    const manifestBuffer = buffer_1.Buffer.from(backupData.schema.manifest, 'base64');
                    fs.writeFileSync(manifestPath, manifestBuffer);
                }
            }
            for (const [tableHash, tableData] of Object.entries(backupData.tables)) {
                const tableDir = path.join(dbDir, tableHash);
                if (!fs.existsSync(tableDir)) {
                    fs.mkdirSync(tableDir, { recursive: true });
                }
                for (const [fileName, data] of Object.entries(tableData)) {
                    const filePath = path.join(tableDir, fileName);
                    const content = data;
                    const encrypted = this.xorEncrypt(buffer_1.Buffer.from(content, 'utf8'));
                    const headerBuffer = buffer_1.Buffer.alloc(9);
                    const MAGIC_BYTES = buffer_1.Buffer.from([0x5A, 0x45, 0x44, 0x42]);
                    MAGIC_BYTES.copy(headerBuffer, 0);
                    headerBuffer.writeUInt8(1, 4);
                    headerBuffer.writeUInt32BE(encrypted.length, 5);
                    const finalBuffer = buffer_1.Buffer.concat([headerBuffer, encrypted]);
                    fs.writeFileSync(filePath, finalBuffer);
                }
            }
            return { success: true };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    }
    listBackups() {
        const backupDir = path.join(this.rootPath, '_backups');
        if (!fs.existsSync(backupDir)) {
            return [];
        }
        const backups = [];
        for (const file of fs.readdirSync(backupDir)) {
            if (!file.endsWith('.zdbbak'))
                continue;
            const filePath = path.join(backupDir, file);
            const stats = fs.statSync(filePath);
            const created = parseInt(file.split('_')[1]?.replace('.zdbbak', '') || '0');
            backups.push({
                name: file,
                path: filePath,
                size: stats.size,
                created
            });
        }
        return backups.sort((a, b) => b.created - a.created);
    }
    deleteBackup(backupPath) {
        try {
            if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath);
                return true;
            }
            return false;
        }
        catch {
            return false;
        }
    }
    xorEncrypt(data) {
        const ENCRYPTION_KEY = buffer_1.Buffer.from('ZeroDB_2024_SecureKey!@#$%');
        const result = buffer_1.Buffer.alloc(data.length);
        for (let i = 0; i < data.length; i++) {
            result[i] = data[i] ^ ENCRYPTION_KEY[i % ENCRYPTION_KEY.length];
        }
        return result;
    }
    xorDecrypt(data) {
        return this.xorEncrypt(data);
    }
    computeChecksum(data) {
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum = (sum + data[i]) % 0xFFFFFFFF;
        }
        return sum.toString(16);
    }
}
exports.BackupManager = BackupManager;
//# sourceMappingURL=backup-manager.js.map