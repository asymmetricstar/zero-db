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
exports.DatabaseManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("../utils/crypto");
class DatabaseManager {
    constructor(rootPath, cache) {
        this.rootPath = rootPath;
        this.registryPath = path.join(rootPath, 'registry.zdb');
        this.cache = cache;
        this.dbIndex = {
            databases: new Map(),
            loaded: false
        };
    }
    loadIndex() {
        if (this.dbIndex.loaded)
            return;
        const content = this.getRegistryContent();
        if (!content) {
            this.dbIndex.loaded = true;
            return;
        }
        const lines = content.split('\n');
        let currentDb = null;
        let currentTables = [];
        let currentUsers = new Map();
        let currentIsPublic = false;
        let currentOwner = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed)
                continue;
            if (trimmed.endsWith(':db') && !trimmed.includes(':user:')) {
                if (currentDb) {
                    this.dbIndex.databases.set(currentDb, {
                        name: currentDb,
                        tables: [...currentTables],
                        users: new Map(currentUsers),
                        isPublic: currentIsPublic,
                        owner: currentOwner
                    });
                }
                currentDb = trimmed.replace(':db', '');
                currentTables = [];
                currentUsers = new Map();
                currentIsPublic = false;
                currentOwner = [];
            }
            else if (trimmed.includes(':tables:')) {
                const parts = trimmed.split(':');
                const dbNameInLine = parts[0];
                if (dbNameInLine === currentDb) {
                    const tablesPart = trimmed.split(':tables:')[1];
                    if (tablesPart) {
                        currentTables = tablesPart.split(',').filter(t => t);
                    }
                }
            }
            else if (trimmed.includes(':user:') && currentDb) {
                const parts = trimmed.split(':');
                const dbNameInLine = parts[0];
                if (dbNameInLine === currentDb && parts.length >= 8) {
                    const username = parts[2];
                    const password = parts[4];
                    const permIndex = parts.indexOf('perm');
                    const permission = permIndex !== -1 ? parseInt(parts[permIndex + 1], 10) : 0;
                    const isGrandIndex = parts.indexOf('grand');
                    const isGrand = isGrandIndex !== -1 ? parseInt(parts[isGrandIndex + 1], 10) === 1 : false;
                    currentUsers.set(username, { username, password, permission, isGrand });
                }
            }
            else if (trimmed.startsWith(currentDb + ':isPublic:') && currentDb) {
                const isPublicVal = trimmed.split(':isPublic:')[1];
                currentIsPublic = isPublicVal === '1';
            }
            else if (trimmed.startsWith(currentDb + ':owner:') && currentDb) {
                const ownerVal = trimmed.split(':owner:')[1];
                currentOwner = ownerVal ? ownerVal.split(',').filter(o => o) : [];
            }
        }
        if (currentDb) {
            this.dbIndex.databases.set(currentDb, {
                name: currentDb,
                tables: [...currentTables],
                users: new Map(currentUsers),
                isPublic: currentIsPublic,
                owner: currentOwner
            });
        }
        this.dbIndex.loaded = true;
    }
    readRegistryRaw() {
        if (!fs.existsSync(this.registryPath)) {
            return Buffer.alloc(0);
        }
        return fs.readFileSync(this.registryPath);
    }
    writeRegistry(content) {
        const dir = path.dirname(this.registryPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (!content.trim()) {
            fs.writeFileSync(this.registryPath, Buffer.alloc(0));
            return;
        }
        fs.writeFileSync(this.registryPath, crypto_1.Crypto.pack(content));
    }
    getRegistryContent() {
        const cached = this.cache.get('registry');
        if (cached !== null) {
            return cached;
        }
        const buffer = this.readRegistryRaw();
        const content = crypto_1.Crypto.unpack(buffer);
        this.cache.set('registry', content);
        return content;
    }
    saveRegistryFromIndex() {
        const lines = [];
        for (const [dbName, dbInfo] of this.dbIndex.databases) {
            lines.push(`${dbName}:db`);
            if (dbInfo.tables.length > 0) {
                lines.push(`${dbName}:tables:${dbInfo.tables.join(',')}`);
            }
            else {
                lines.push(`${dbName}:tables:`);
            }
            // Save isPublic and owner
            lines.push(`${dbName}:isPublic:${dbInfo.isPublic ? 1 : 0}`);
            lines.push(`${dbName}:owner:${dbInfo.owner.join(',')}`);
            for (const [, user] of dbInfo.users) {
                lines.push(`${dbName}:user:${user.username}:pass:${user.password}:perm:${user.permission}:grand:${user.isGrand ? 1 : 0}`);
            }
        }
        const content = lines.join('\n');
        this.writeRegistry(content);
        this.cache.set('registry', content);
    }
    invalidate() {
        this.dbIndex.loaded = false;
        this.dbIndex.databases.clear();
    }
    databaseExists(dbName) {
        this.loadIndex();
        return this.dbIndex.databases.has(dbName);
    }
    createDatabase(dbName, options = {}) {
        this.loadIndex();
        if (this.dbIndex.databases.has(dbName)) {
            return false;
        }
        // Validate options
        if (options.isPublic === true && (!options.owner || options.owner.length === 0)) {
            // For public databases, owner is optional but if provided must have at least one owner
            // If no owner provided, we'll use an empty array meaning truly public (no ownership restriction)
        }
        if (!fs.existsSync(this.rootPath)) {
            fs.mkdirSync(this.rootPath, { recursive: true });
        }
        if (!fs.existsSync(this.rootPath)) {
            fs.mkdirSync(this.rootPath, { recursive: true });
        }
        const dbDir = path.join(this.rootPath, crypto_1.Crypto.hash(dbName));
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        this.dbIndex.databases.set(dbName, {
            name: dbName,
            tables: [],
            users: new Map(),
            isPublic: options.isPublic ?? false,
            owner: options.owner ?? []
        });
        this.saveRegistryFromIndex();
        return true;
    }
    dropDatabase(dbName) {
        this.loadIndex();
        if (!this.dbIndex.databases.has(dbName))
            return false;
        const dbDir = path.join(this.rootPath, crypto_1.Crypto.hash(dbName));
        if (fs.existsSync(dbDir)) {
            try {
                fs.rmSync(dbDir, { recursive: true, force: true });
            }
            catch (e) {
                // Ignore errors during deletion
            }
        }
        this.dbIndex.databases.delete(dbName);
        this.saveRegistryFromIndex();
        return true;
    }
    authenticate(dbName, username, password) {
        this.loadIndex();
        const db = this.dbIndex.databases.get(dbName);
        if (!db)
            return null;
        const user = db.users.get(username);
        if (user && user.password === password) {
            return user;
        }
        return null;
    }
    addUser(dbName, username, password, permission, isGrand = false, status = true) {
        this.loadIndex();
        const db = this.dbIndex.databases.get(dbName);
        if (!db)
            return false;
        db.users.set(username, { username, password, permission, isGrand, status });
        this.saveRegistryFromIndex();
        return true;
    }
    listUsers(dbName) {
        this.loadIndex();
        const db = this.dbIndex.databases.get(dbName);
        if (!db)
            return [];
        return Array.from(db.users.keys());
    }
    deleteUser(dbName, username) {
        this.loadIndex();
        const db = this.dbIndex.databases.get(dbName);
        if (!db)
            return false;
        const success = db.users.delete(username);
        if (success) {
            this.saveRegistryFromIndex();
        }
        return success;
    }
    getDatabaseInfo(dbName) {
        this.loadIndex();
        return this.dbIndex.databases.get(dbName) ?? null;
    }
    listDatabases() {
        this.loadIndex();
        return Array.from(this.dbIndex.databases.keys());
    }
    addOwner(dbName, username) {
        this.loadIndex();
        const db = this.dbIndex.databases.get(dbName);
        if (!db)
            return false;
        if (!db.owner.includes(username)) {
            db.owner.push(username);
            this.saveRegistryFromIndex();
        }
        return true;
    }
    removeOwner(dbName, username) {
        this.loadIndex();
        const db = this.dbIndex.databases.get(dbName);
        if (!db)
            return false;
        db.owner = db.owner.filter(o => o !== username);
        this.saveRegistryFromIndex();
        return true;
    }
    setPublic(dbName, isPublic) {
        this.loadIndex();
        const db = this.dbIndex.databases.get(dbName);
        if (!db)
            return false;
        db.isPublic = isPublic;
        this.saveRegistryFromIndex();
        return true;
    }
    renameDatabase(oldDb, newName) {
        this.loadIndex();
        const dbInfo = this.dbIndex.databases.get(oldDb);
        if (!dbInfo)
            return false;
        this.dbIndex.databases.delete(oldDb);
        dbInfo.name = newName;
        this.dbIndex.databases.set(newName, dbInfo);
        this.saveRegistryFromIndex();
        return true;
    }
}
exports.DatabaseManager = DatabaseManager;
//# sourceMappingURL=database-manager.js.map