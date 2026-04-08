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
exports.FieldManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("../utils/crypto");
class FieldManager {
    constructor(rootPath, cache) {
        this.rootPath = rootPath;
        this.manifestPath = path.join(rootPath, 'manifest.zdb');
        this.cache = cache;
    }
    readBinaryFile(filePath) {
        if (!fs.existsSync(filePath))
            return '';
        const buffer = fs.readFileSync(filePath);
        return crypto_1.Crypto.unpack(buffer);
    }
    getManifestContent() {
        const cached = this.cache.get('manifest');
        if (cached !== null)
            return cached;
        const content = this.readBinaryFile(this.manifestPath);
        this.cache.set('manifest', content);
        return content;
    }
    invalidate() {
        this.cache.invalidate('manifest');
    }
    getFieldFileName(dbName, tableName, fieldName) {
        const fields = this.getAllFields(dbName, tableName);
        return fields.get(fieldName) || null;
    }
    getFieldPath(dbName, tableName, fieldName) {
        const fieldFileName = this.getFieldFileName(dbName, tableName, fieldName);
        if (!fieldFileName) {
            return null;
        }
        const tableDir = path.join(this.rootPath, crypto_1.Crypto.hash(dbName), crypto_1.Crypto.hash(tableName));
        return path.join(tableDir, fieldFileName);
    }
    getAllFields(dbName, tableName) {
        const fields = new Map();
        const content = this.getManifestContent();
        if (!content)
            return fields;
        const lines = content.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === '')
                continue;
            const parts = trimmed.split(':');
            if (parts.length >= 4 && parts[0] === dbName && parts[1] === tableName) {
                const fieldName = parts[2];
                const fileName = parts[3];
                if (fieldName && fileName) {
                    fields.set(fieldName, fileName);
                }
            }
        }
        return fields;
    }
    getTableFields(dbName, tableName) {
        const tableDir = path.join(this.rootPath, crypto_1.Crypto.hash(dbName), crypto_1.Crypto.hash(tableName));
        if (!fs.existsSync(tableDir)) {
            return [];
        }
        const fields = [];
        const files = fs.readdirSync(tableDir);
        for (const file of files) {
            if (file.endsWith('.zdb')) {
                const originalName = this.cache.getOriginalName(file) || file;
                fields.push({
                    name: originalName,
                    type: 'string',
                    isAuto: false,
                    allowNull: true,
                    defaultValue: '',
                    maxLength: 255,
                    fileName: file
                });
            }
        }
        return fields;
    }
}
exports.FieldManager = FieldManager;
//# sourceMappingURL=field-manager.js.map