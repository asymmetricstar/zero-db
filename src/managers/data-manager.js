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
exports.DataManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const spawn_1 = require("../utils/spawn");
const uuid_1 = require("../utils/uuid");
const event_manager_1 = require("../utils/event-manager");
class DataManager {
    constructor(rootPath, cacheManager, isNetwork = false) {
        this.autoIncrementCounters = new Map();
        this.operationLocks = new Map();
        this.rootPath = rootPath;
        this.spawnPool = new Map();
        this.cacheManager = cacheManager;
        this.isNetwork = isNetwork;
        this.networkLockPath = path.join(this.rootPath, 'network.zdb');
        this.engineId = uuid_1.UUID.v4();
    }
    getAutoIncrementKey(dbName, tableName) {
        return `${dbName}:${tableName}`;
    }
    getLockKey(dbName, tableName) {
        return `${dbName}:${tableName}`;
    }
    async readNetworkState() {
        if (!fs.existsSync(this.networkLockPath)) {
            return { nextSequence: 1, activeLocks: {} };
        }
        try {
            const content = fs.readFileSync(this.networkLockPath, 'utf-8');
            if (!content.trim())
                return { nextSequence: 1, activeLocks: {} };
            const state = JSON.parse(content);
            return {
                nextSequence: state.nextSequence || 1,
                activeLocks: state.activeLocks || {}
            };
        }
        catch (e) {
            return { nextSequence: 1, activeLocks: {} };
        }
    }
    async writeNetworkState(state) {
        const tmpPath = this.networkLockPath + '.tmp';
        try {
            const dir = path.dirname(this.networkLockPath);
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2));
            fs.renameSync(tmpPath, this.networkLockPath);
            return true;
        }
        catch (e) {
            if (fs.existsSync(tmpPath))
                fs.unlinkSync(tmpPath);
            return false;
        }
    }
    async acquireDistributedLock(dbName, tableName) {
        const resource = `${dbName}:${tableName}`;
        const MAX_RETRIES = 200;
        const RETRY_DELAY = 50;
        for (let i = 0; i < MAX_RETRIES; i++) {
            const state = await this.readNetworkState();
            if (state.activeLocks[resource]) {
                // Stale lock check (30 seconds)
                if (Date.now() - state.activeLocks[resource].timestamp > 30000) {
                    delete state.activeLocks[resource];
                }
                else {
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY + Math.random() * 20));
                    continue;
                }
            }
            const sequence = state.nextSequence;
            state.activeLocks[resource] = {
                engineId: this.engineId,
                sequence,
                timestamp: Date.now(),
                dbName,
                tableName
            };
            state.nextSequence++;
            if (await this.writeNetworkState(state)) {
                return sequence;
            }
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY + Math.random() * 20));
        }
        event_manager_1.EventManager.error(`Distributed lock timeout for ${resource}`);
        return -1;
    }
    async releaseDistributedLock(dbName, tableName, sequence) {
        const resource = `${dbName}:${tableName}`;
        const MAX_RETRIES = 50;
        for (let i = 0; i < MAX_RETRIES; i++) {
            const state = await this.readNetworkState();
            const lock = state.activeLocks[resource];
            if (lock && lock.engineId === this.engineId && lock.sequence === sequence) {
                delete state.activeLocks[resource];
                if (await this.writeNetworkState(state))
                    return;
            }
            else {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 20));
        }
    }
    async withAtomicLock(dbName, tableName, fn) {
        const key = this.getLockKey(dbName, tableName);
        // In-memory lock chain
        const previousLock = this.operationLocks.get(key);
        const chain = previousLock || Promise.resolve();
        const newLock = chain.then(async () => {
            let sequence = -1;
            if (this.isNetwork) {
                sequence = await this.acquireDistributedLock(dbName, tableName);
            }
            try {
                return await fn();
            }
            finally {
                if (this.isNetwork && sequence !== -1) {
                    await this.releaseDistributedLock(dbName, tableName, sequence);
                }
            }
        });
        this.operationLocks.set(key, newLock);
        return newLock;
    }
    async syncAutoIncrementFromDisk(dbName, tableName, fileName) {
        const spawn = this.getSpawn(dbName, tableName, fileName);
        await spawn.read();
        const diskValue = spawn.getAutoIncrement();
        const key = this.getAutoIncrementKey(dbName, tableName);
        const memValue = this.autoIncrementCounters.get(key) || 0;
        const maxVal = Math.max(diskValue, memValue);
        this.autoIncrementCounters.set(key, maxVal);
        return maxVal;
    }
    reserveAutoIncrement(dbName, tableName) {
        const key = this.getAutoIncrementKey(dbName, tableName);
        const current = this.autoIncrementCounters.get(key) || 1;
        const next = current + 1;
        this.autoIncrementCounters.set(key, next);
        return current;
    }
    getSpawn(dbName, tableName, fileName) {
        const key = `${dbName}:${tableName}:${fileName}`;
        if (!this.spawnPool.has(key)) {
            const spawn = spawn_1.Spawn.create(this.rootPath, dbName, tableName, '', fileName);
            this.spawnPool.set(key, spawn);
        }
        return this.spawnPool.get(key);
    }
    async flushAll() {
        const promises = [];
        for (const spawn of this.spawnPool.values()) {
            promises.push(spawn.forceFlush());
        }
        await Promise.all(promises);
    }
    validateAndCastData(data, schemas, isUpdate = false) {
        const errors = [];
        const castedData = new Map();
        if (isUpdate) {
            for (const [fieldName, value] of data) {
                const schema = schemas.get(fieldName);
                if (!schema) {
                    errors.push(`Unknown field: ${fieldName}`);
                    continue;
                }
                if (schema.type === 'timestamp') {
                    // Silently ignore timestamp fields
                    continue;
                }
                const casted = this.castValue(fieldName, value, schema, errors);
                if (casted !== null)
                    castedData.set(fieldName, casted);
            }
        }
        else {
            for (const [fieldName, schema] of schemas) {
                const value = data.get(fieldName);
                // Silently ignore timestamp fields if provided (they're auto-managed)
                if (schema.type === 'timestamp') {
                    if (value)
                        castedData.set(fieldName, value);
                    continue;
                }
                if (!value || value.trim() === '') {
                    if (!schema.allowNull && !schema.isAuto) {
                        errors.push(`Field '${fieldName}' cannot be null`);
                        continue;
                    }
                    if (schema.isAuto) {
                        castedData.set(fieldName, value || '');
                    }
                    else if (schema.defaultValue !== undefined) {
                        castedData.set(fieldName, schema.defaultValue);
                    }
                    else {
                        castedData.set(fieldName, '');
                    }
                    continue;
                }
                const casted = this.castValue(fieldName, value, schema, errors);
                if (casted !== null)
                    castedData.set(fieldName, casted);
            }
            for (const fieldName of data.keys()) {
                if (!schemas.has(fieldName)) {
                    errors.push(`Unknown field: ${fieldName}`);
                }
            }
        }
        return { valid: errors.length === 0, errors, castedData };
    }
    castValue(fieldName, value, schema, errors) {
        if (schema.maxLength > 0 && value.length > schema.maxLength && schema.type !== 'object' && schema.type !== 'any') {
            errors.push(`Field '${fieldName}' exceeds max length (${schema.maxLength})`);
            return null;
        }
        switch (schema.type) {
            case 'number':
                if (isNaN(Number(value))) {
                    errors.push(`Field '${fieldName}' must be a number, got: ${value}`);
                    return null;
                }
                return String(Number(value));
            case 'boolean':
                if (value !== 'true' && value !== 'false' && value !== '0' && value !== '1') {
                    errors.push(`Field '${fieldName}' must be a boolean, got: ${value}`);
                    return null;
                }
                return (value === 'true' || value === '1') ? '1' : '0';
            case 'object':
                try {
                    JSON.parse(value);
                    return value;
                }
                catch {
                    errors.push(`Field '${fieldName}' must be valid JSON object, got: ${value}`);
                    return null;
                }
            case 'any':
                return value;
            case 'string':
            case 'auto':
                return value;
        }
        return value;
    }
    async insertRecord(dbName, tableName, fields, fieldFileNames, schemas) {
        return this.withAtomicLock(dbName, tableName, async () => {
            return this.doInsertRecord(dbName, tableName, fields, fieldFileNames, schemas);
        });
    }
    async doInsertRecord(dbName, tableName, fields, fieldFileNames, schemas) {
        let autoField = null;
        let autoValue = 0;
        if (schemas) {
            for (const [fieldName, schema] of schemas) {
                if (schema.type === 'timestamp') {
                    fields.set(fieldName, new Date().toISOString());
                }
            }
            for (const [fieldName, schema] of schemas) {
                if (schema.isAuto) {
                    autoField = fieldName;
                    break;
                }
            }
            const validation = this.validateAndCastData(fields, schemas, false);
            if (!validation.valid) {
                return { success: false, lineNumber: -1, errors: validation.errors };
            }
            fields = validation.castedData;
            if (autoField && !fields.get(autoField)) {
                autoValue = await this.getNextAutoIncrement(dbName, tableName, autoField, fieldFileNames);
                fields.set(autoField, String(autoValue));
            }
        }
        const spawns = new Map();
        let maxLine = 0;
        for (const [fieldName] of fields) {
            const fileName = fieldFileNames.get(fieldName);
            if (!fileName)
                continue;
            const spawn = this.getSpawn(dbName, tableName, fileName);
            spawns.set(fieldName, spawn);
            await spawn.read();
            const line = spawn.getMaxLine();
            if (line > maxLine)
                maxLine = line;
        }
        const usingUserProvidedId = autoField && fields.get(autoField);
        const newLine = usingUserProvidedId ? autoValue : maxLine + 1;
        for (const [fieldName, value] of fields) {
            const spawn = spawns.get(fieldName);
            if (!spawn)
                continue;
            spawn.append(newLine, value);
        }
        if (autoField) {
            const autoSpawn = spawns.get(autoField);
            if (autoSpawn) {
                // autoSpawn.setAutoIncrement(newLine + 1); // Removed: Spawn now handles its own increment.
            }
        }
        return { success: true, lineNumber: newLine, errors: [] };
    }
    async getNextAutoIncrement(dbName, tableName, fieldName, fieldFileNames) {
        const fileName = fieldFileNames.get(fieldName);
        if (!fileName)
            return 1;
        await this.syncAutoIncrementFromDisk(dbName, tableName, fileName);
        return this.reserveAutoIncrement(dbName, tableName);
    }
    async checkDuplicate(dbName, tableName, fieldFileNames, uniqueFields, values) {
        for (const fieldName of uniqueFields) {
            const value = values.get(fieldName);
            if (!value)
                continue;
            const fileName = fieldFileNames.get(fieldName);
            if (!fileName)
                continue;
            const spawn = this.getSpawn(dbName, tableName, fileName);
            await spawn.read();
            const records = spawn.getAll();
            for (const [, v] of records) {
                if (v === value)
                    return true;
            }
        }
        return false;
    }
    async selectRecords(dbName, tableName, selectFields, fieldFileNames, conditions, likeConditions) {
        const allFields = new Set(selectFields);
        if (conditions) {
            for (const c of conditions.keys())
                allFields.add(c);
        }
        const fieldData = new Map();
        for (const fieldName of allFields) {
            const fileName = fieldFileNames.get(fieldName);
            if (!fileName)
                continue;
            const spawn = this.getSpawn(dbName, tableName, fileName);
            await spawn.read();
            fieldData.set(fieldName, spawn.getAll());
        }
        if (conditions && conditions.size > 0) {
            let matching = new Set();
            let first = true;
            for (const [condField, condValue] of conditions) {
                const records = fieldData.get(condField);
                if (!records) {
                    matching = new Set();
                    break;
                }
                const lines = new Set();
                for (const [l, v] of records) {
                    if (v === condValue)
                        lines.add(l);
                }
                if (first) {
                    matching = lines;
                    first = false;
                }
                else {
                    const inter = new Set();
                    for (const l of matching)
                        if (lines.has(l))
                            inter.add(l);
                    matching = inter;
                }
            }
            if (matching.size === 0)
                return [];
            for (const [fn, records] of fieldData) {
                const filtered = new Map();
                for (const [l, v] of records) {
                    if (matching.has(l))
                        filtered.set(l, v);
                }
                fieldData.set(fn, filtered);
            }
        }
        // Apply LIKE conditions
        if (likeConditions && likeConditions.size > 0) {
            let matching = new Set();
            let first = true;
            for (const [condField, condPattern] of likeConditions) {
                const records = fieldData.get(condField);
                if (!records) {
                    matching = new Set();
                    break;
                }
                const lines = new Set();
                // Convert SQL LIKE pattern to regex
                // Escape regex special chars FIRST, then replace SQL % wildcard
                let escaped = condPattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
                let regexPattern = escaped.replace(/%/g, '.*');
                const regex = new RegExp(`^${regexPattern}$`, 'i');
                for (const [l, v] of records) {
                    if (regex.test(v))
                        lines.add(l);
                }
                if (first) {
                    matching = lines;
                    first = false;
                }
                else {
                    const inter = new Set();
                    for (const l of matching)
                        if (lines.has(l))
                            inter.add(l);
                    matching = inter;
                }
            }
            if (matching.size === 0)
                return [];
            for (const [fn, records] of fieldData) {
                const filtered = new Map();
                for (const [l, v] of records) {
                    if (matching.has(l))
                        filtered.set(l, v);
                }
                fieldData.set(fn, filtered);
            }
        }
        const results = [];
        const allLines = new Set();
        for (const r of fieldData.values()) {
            for (const l of r.keys())
                allLines.add(l);
        }
        const sortedLines = Array.from(allLines).sort((a, b) => a - b);
        // Sistem alanları (timestamp) her zaman sonuçlara dahil edilir
        const outputFields = [...selectFields];
        const systemFields = ['created_at', 'updated_at'];
        for (const sf of systemFields) {
            if (fieldData.has(sf) && !outputFields.includes(sf)) {
                outputFields.push(sf);
            }
        }
        for (const line of sortedLines) {
            const row = {};
            for (const fn of outputFields) {
                const r = fieldData.get(fn);
                if (r && r.has(line))
                    row[fn] = r.get(line) ?? '';
            }
            results.push(row);
        }
        return results;
    }
    async deleteRecords(dbName, tableName, fieldFileNames, conditions) {
        let linesToDelete = new Set();
        let first = true;
        for (const [condField, condValue] of conditions) {
            const fileName = fieldFileNames.get(condField);
            if (!fileName)
                continue;
            const spawn = this.getSpawn(dbName, tableName, fileName);
            await spawn.read();
            const records = spawn.getAll();
            const lines = new Set();
            for (const [l, v] of records) {
                if (v === condValue)
                    lines.add(l);
            }
            if (first) {
                linesToDelete = lines;
                first = false;
            }
            else {
                const inter = new Set();
                for (const l of linesToDelete)
                    if (lines.has(l))
                        inter.add(l);
                linesToDelete = inter;
            }
        }
        if (linesToDelete.size === 0)
            return 0;
        for (const [, fileName] of fieldFileNames) {
            const spawn = this.getSpawn(dbName, tableName, fileName);
            await spawn.read();
            spawn.delete(linesToDelete);
        }
        return linesToDelete.size;
    }
    async updateRecords(dbName, tableName, fieldFileNames, updates, conditions, schemas) {
        if (schemas) {
            const validation = this.validateAndCastData(updates, schemas, true);
            if (!validation.valid)
                return { success: false, count: 0, errors: validation.errors };
            updates = validation.castedData;
        }
        let linesToUpdate = new Set();
        let first = true;
        for (const [condField, condValue] of conditions) {
            const fileName = fieldFileNames.get(condField);
            if (!fileName)
                continue;
            const spawn = this.getSpawn(dbName, tableName, fileName);
            await spawn.read();
            const records = spawn.getAll();
            const lines = new Set();
            for (const [l, v] of records) {
                if (v === condValue)
                    lines.add(l);
            }
            if (first) {
                linesToUpdate = lines;
                first = false;
            }
            else {
                const inter = new Set();
                for (const l of linesToUpdate)
                    if (lines.has(l))
                        inter.add(l);
                linesToUpdate = inter;
            }
        }
        if (linesToUpdate.size === 0)
            return { success: false, count: 0, errors: ['No matching records'] };
        if (schemas) {
            for (const [fieldName, schema] of schemas) {
                if (schema.type === 'timestamp' && fieldName !== 'created_at') {
                    updates.set(fieldName, new Date().toISOString());
                }
            }
        }
        for (const [updateField, updateValue] of updates) {
            const fileName = fieldFileNames.get(updateField);
            if (!fileName)
                continue;
            const spawn = this.getSpawn(dbName, tableName, fileName);
            await spawn.read();
            spawn.update(linesToUpdate, updateValue);
        }
        return { success: true, count: linesToUpdate.size, errors: [] };
    }
    getPoolStats() {
        const stats = {};
        for (const [key, spawn] of this.spawnPool) {
            stats[key] = spawn.getStats();
        }
        return stats;
    }
    async clearPool() {
        await this.flushAll();
        this.spawnPool.clear();
    }
    async clearPoolForDatabase(dbName) {
        const prefix = `${dbName}:`;
        const promises = [];
        for (const [key, spawn] of this.spawnPool.entries()) {
            if (key.startsWith(prefix)) {
                promises.push(spawn.forceFlush());
                this.spawnPool.delete(key);
            }
        }
        await Promise.all(promises);
    }
    async clearPoolForTable(dbName, tableName) {
        const prefix = `${dbName}:${tableName}:`;
        const promises = [];
        const keysToDelete = [];
        for (const [key, spawn] of this.spawnPool.entries()) {
            if (key.startsWith(prefix)) {
                keysToDelete.push(key);
                promises.push(spawn.forceFlush());
            }
        }
        await Promise.all(promises);
        for (const key of keysToDelete) {
            this.spawnPool.delete(key);
        }
    }
}
exports.DataManager = DataManager;
//# sourceMappingURL=data-manager.js.map