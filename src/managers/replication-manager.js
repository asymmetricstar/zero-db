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
exports.ReplicationManager = void 0;
exports.createReplicationManager = createReplicationManager;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const md5_1 = require("../utils/md5");
const event_manager_1 = require("../utils/event-manager");
class ReplicationManager {
    constructor(rootPath, config) {
        this.syncInterval = null;
        this.pendingSync = [];
        this.rootPath = rootPath;
        this.config = config;
        this.WAL_PATH = path.join(rootPath, '_wal');
        if (!fs.existsSync(this.WAL_PATH)) {
            fs.mkdirSync(this.WAL_PATH, { recursive: true });
        }
    }
    start() {
        if (!this.config.enabled || this.config.mode !== 'master')
            return;
        this.syncInterval = setInterval(() => {
            this.syncToSlave();
        }, this.config.syncInterval);
    }
    stop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }
    logOperation(op) {
        if (!this.config.enabled || this.config.mode !== 'master')
            return;
        this.pendingSync.push(op);
        const walFile = path.join(this.WAL_PATH, `${Date.now()}.json`);
        fs.writeFileSync(walFile, JSON.stringify(op));
    }
    async syncToSlave() {
        if (!this.config.targetPath || this.pendingSync.length === 0)
            return;
        try {
            for (const op of this.pendingSync) {
                await this.applyOperationToSlave(op);
            }
            this.pendingSync = [];
        }
        catch (e) {
            event_manager_1.EventManager.error('Replication sync failed', { error: e });
        }
    }
    async applyOperationToSlave(op) {
        const targetDbDir = path.join(this.config.targetPath, md5_1.MD5.hash(op.dbName));
        if (!fs.existsSync(targetDbDir)) {
            fs.mkdirSync(targetDbDir, { recursive: true });
        }
        const tableHash = md5_1.MD5.hash(op.tableName);
        const tableDir = path.join(targetDbDir, tableHash);
        if (!fs.existsSync(tableDir)) {
            fs.mkdirSync(tableDir, { recursive: true });
        }
        for (const [fieldName, value] of Object.entries(op.data)) {
            const fieldFileName = md5_1.MD5.hash(fieldName).substring(0, 12) + '.zdb';
            const fieldPath = path.join(tableDir, fieldFileName);
            if (op.operation === 'insert') {
                const exists = fs.existsSync(fieldPath);
                const content = exists ? fs.readFileSync(fieldPath, 'utf8') : '';
                const newContent = content + `${op.lineNumber}:${value}\n`;
                fs.writeFileSync(fieldPath, newContent, 'utf8');
            }
            else if (op.operation === 'update' && op.lineNumber) {
                const content = fs.readFileSync(fieldPath, 'utf8');
                const lines = content.split('\n').map(line => {
                    if (line.startsWith(`${op.lineNumber}:`)) {
                        return `${op.lineNumber}:${value}`;
                    }
                    return line;
                }).join('\n');
                fs.writeFileSync(fieldPath, lines, 'utf8');
            }
            else if (op.operation === 'delete' && op.lineNumber) {
                const content = fs.readFileSync(fieldPath, 'utf8');
                const lines = content.split('\n').filter(line => {
                    return !line.startsWith(`${op.lineNumber}:`);
                }).join('\n');
                fs.writeFileSync(fieldPath, lines, 'utf8');
            }
        }
    }
    getStatus() {
        return {
            pending: this.pendingSync.length,
            enabled: this.config.enabled,
            mode: this.config.mode
        };
    }
    purgeWAL(beforeTimestamp) {
        if (!fs.existsSync(this.WAL_PATH))
            return;
        for (const file of fs.readdirSync(this.WAL_PATH)) {
            const filePath = path.join(this.WAL_PATH, file);
            const timestamp = parseInt(file.replace('.json', ''));
            if (timestamp < beforeTimestamp) {
                fs.unlinkSync(filePath);
            }
        }
    }
}
exports.ReplicationManager = ReplicationManager;
function createReplicationManager(rootPath, config) {
    return new ReplicationManager(rootPath, config);
}
//# sourceMappingURL=replication-manager.js.map