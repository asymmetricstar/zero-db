"use strict";
/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryBuilder = void 0;
const insert_engine_1 = require("../engine/insert-engine");
const event_manager_1 = require("../utils/event-manager");
class QueryBuilder {
    constructor(dbName, tableName, dataManager, fieldManager, permissionManager) {
        this.selectedFields = [];
        this.selectAll = false;
        this.whereConditions = new Map();
        this.likeConditions = new Map();
        this.rangeMin = '';
        this.rangeMax = '';
        this.sortField = '';
        this.sortOrder = 'asc';
        this.schemas = new Map();
        this.executed = false;
        this.dbName = dbName;
        this.tableName = tableName;
        this.dataManager = dataManager;
        this.fieldManager = fieldManager;
        this.permissionManager = permissionManager;
        this.insertEngine = new insert_engine_1.InsertEngine(dataManager);
    }
    setSchemas(schemas) {
        this.schemas = schemas;
        return this;
    }
    select(fields) {
        if (!this.permissionManager.hasAccess('list')) {
            event_manager_1.EventManager.error('Permission denied: list access required');
            return this;
        }
        if (fields === '*') {
            this.selectAll = true;
            this.selectedFields = [];
        }
        else {
            this.selectAll = false;
            this.selectedFields = fields;
        }
        return this;
    }
    where(conditions) {
        for (const [field, value] of Object.entries(conditions)) {
            this.whereConditions.set(field, value);
        }
        return this;
    }
    like(field, pattern) {
        this.likeConditions.set(field, pattern);
        return this;
    }
    asc(field) {
        this.sortField = field;
        this.sortOrder = 'asc';
        return this;
    }
    desc(field) {
        this.sortField = field;
        this.sortOrder = 'desc';
        return this;
    }
    range(min, max) {
        try {
            if (min !== '' && (isNaN(parseInt(min, 10)) || parseInt(min, 10) < 0)) {
                this.rangeMin = '1';
                this.rangeMax = '1';
                return this;
            }
            if (max !== '' && (isNaN(parseInt(max, 10)) || parseInt(max, 10) < 0)) {
                this.rangeMin = '1';
                this.rangeMax = '1';
                return this;
            }
            this.rangeMin = min;
            this.rangeMax = max;
        }
        catch {
            this.rangeMin = '1';
            this.rangeMax = '1';
        }
        return this;
    }
    async list() {
        try {
            if (!this.permissionManager.hasAccess('list')) {
                event_manager_1.EventManager.error('Permission denied: list access required');
                return [];
            }
            const fieldFileNames = this.fieldManager.getAllFields(this.dbName, this.tableName);
            let activeSelectedFields = [...this.selectedFields];
            if (this.selectAll || (activeSelectedFields.length === 0 && !this.executed)) {
                activeSelectedFields = Array.from(fieldFileNames.keys());
            }
            const allFieldsForQuery = [...activeSelectedFields];
            if (this.whereConditions.size > 0) {
                for (const condField of this.whereConditions.keys()) {
                    if (!allFieldsForQuery.includes(condField)) {
                        allFieldsForQuery.push(condField);
                    }
                }
            }
            const systemFields = ['created_at', 'updated_at'];
            for (const sf of systemFields) {
                if (fieldFileNames.has(sf) && !allFieldsForQuery.includes(sf)) {
                    allFieldsForQuery.push(sf);
                }
            }
            const results = await this.dataManager.selectRecords(this.dbName, this.tableName, allFieldsForQuery, fieldFileNames, this.whereConditions.size > 0 ? this.whereConditions : undefined, this.likeConditions.size > 0 ? this.likeConditions : undefined);
            let filteredResults = [];
            for (const row of results) {
                const filteredRow = {};
                for (const field of activeSelectedFields) {
                    if (row[field] !== undefined) {
                        filteredRow[field] = row[field];
                    }
                }
                if (row['created_at'] !== undefined) {
                    filteredRow['created_at'] = row['created_at'];
                }
                if (row['updated_at'] !== undefined) {
                    filteredRow['updated_at'] = row['updated_at'];
                }
                filteredResults.push(filteredRow);
            }
            if (this.rangeMin !== '' || this.rangeMax !== '') {
                let start = this.rangeMin !== '' ? parseInt(this.rangeMin, 10) : 0;
                let end = this.rangeMax !== '' ? parseInt(this.rangeMax, 10) : filteredResults.length;
                if (isNaN(start) || start < 0)
                    start = 0;
                if (isNaN(end) || end < 0)
                    end = filteredResults.length;
                if (start > filteredResults.length)
                    start = filteredResults.length;
                if (end > filteredResults.length - 1)
                    end = filteredResults.length - 1;
                filteredResults = filteredResults.slice(start, end + 1);
            }
            if (this.sortField) {
                filteredResults.sort((a, b) => {
                    const aVal = a[this.sortField] || '';
                    const bVal = b[this.sortField] || '';
                    const cmp = String(aVal).localeCompare(String(bVal));
                    return this.sortOrder === 'desc' ? -cmp : cmp;
                });
            }
            this.executed = true;
            this.whereConditions.clear();
            this.likeConditions.clear();
            this.rangeMin = '';
            this.rangeMax = '';
            this.sortField = '';
            this.selectAll = false;
            this.selectedFields = [];
            return filteredResults;
        }
        catch (e) {
            event_manager_1.EventManager.error(`Query failed`, { error: e.message });
            return [];
        }
    }
    async add(data) {
        try {
            if (!this.permissionManager.hasAccess('add')) {
                event_manager_1.EventManager.error('Permission denied: add access required');
                return 0;
            }
            const fieldFileNames = this.fieldManager.getAllFields(this.dbName, this.tableName);
            const dataMap = new Map();
            for (const [field, value] of Object.entries(data)) {
                dataMap.set(field, value);
            }
            const idField = Array.from(fieldFileNames.keys()).find(f => this.schemas.has(f) && this.schemas.get(f)?.isAuto);
            if (idField && dataMap.has(idField)) {
                const isDuplicate = await this.dataManager.checkDuplicate(this.dbName, this.tableName, fieldFileNames, [idField], dataMap);
                if (isDuplicate) {
                    event_manager_1.EventManager.error(`Duplicate ID: ${dataMap.get(idField)}`);
                    return 0;
                }
            }
            const result = await this.dataManager.insertRecord(this.dbName, this.tableName, dataMap, fieldFileNames, this.schemas.size > 0 ? this.schemas : undefined);
            if (!result.success) {
                event_manager_1.EventManager.error(`Add failed`, { errors: result.errors });
                return 0;
            }
            await this.dataManager.flushAll();
            this.whereConditions.clear();
            return result.lineNumber;
        }
        catch (e) {
            event_manager_1.EventManager.error(`Add failed`, { error: e.message });
            return 0;
        }
    }
    async addBatch(records) {
        try {
            if (!this.permissionManager.hasAccess('add')) {
                event_manager_1.EventManager.error('Permission denied: add access required');
                return { success: false, lineNumbers: [], errors: ['Permission denied: add access required'] };
            }
            if (records.length === 0) {
                return { success: true, lineNumbers: [], errors: [] };
            }
            const fieldFileNames = this.fieldManager.getAllFields(this.dbName, this.tableName);
            const result = await this.insertEngine.insert(this.dbName, this.tableName, records, fieldFileNames, this.schemas.size > 0 ? this.schemas : undefined);
            await this.dataManager.flushAll();
            this.whereConditions.clear();
            return result;
        }
        catch (e) {
            event_manager_1.EventManager.error(`Batch add failed`, { error: e.message });
            return { success: false, lineNumbers: [], errors: [e.message] };
        }
    }
    async delete() {
        try {
            if (!this.permissionManager.hasAccess('delete')) {
                event_manager_1.EventManager.error('Permission denied: delete access required');
                return 0;
            }
            if (this.whereConditions.size === 0) {
                event_manager_1.EventManager.error('Delete requires where conditions for safety');
                return 0;
            }
            const fieldFileNames = this.fieldManager.getAllFields(this.dbName, this.tableName);
            const count = await this.dataManager.deleteRecords(this.dbName, this.tableName, fieldFileNames, this.whereConditions);
            await this.dataManager.flushAll();
            this.whereConditions.clear();
            return count;
        }
        catch (e) {
            event_manager_1.EventManager.error(`Delete failed`, { error: e.message });
            return 0;
        }
    }
    async update(data) {
        try {
            if (!this.permissionManager.hasAccess('update')) {
                event_manager_1.EventManager.error('Permission denied: update access required');
                return 0;
            }
            if (this.whereConditions.size === 0) {
                event_manager_1.EventManager.error('Update requires where conditions for safety');
                return 0;
            }
            const updates = new Map();
            for (const [field, value] of Object.entries(data)) {
                updates.set(field, value);
            }
            const fieldFileNames = this.fieldManager.getAllFields(this.dbName, this.tableName);
            const result = await this.dataManager.updateRecords(this.dbName, this.tableName, fieldFileNames, updates, this.whereConditions, this.schemas.size > 0 ? this.schemas : undefined);
            if (!result.success) {
                event_manager_1.EventManager.error(`Update failed`, { errors: result.errors });
                return 0;
            }
            await this.dataManager.flushAll();
            this.whereConditions.clear();
            return result.count;
        }
        catch (e) {
            event_manager_1.EventManager.error(`Update failed`, { error: e.message });
            return 0;
        }
    }
    async count() {
        try {
            const results = await this.list();
            return results.length;
        }
        catch (e) {
            event_manager_1.EventManager.error(`Count failed`, { error: e.message });
            return 0;
        }
    }
    async first() {
        try {
            const results = await this.list();
            return results.length > 0 ? results[0] : null;
        }
        catch (e) {
            event_manager_1.EventManager.error(`First failed`, { error: e.message });
            return null;
        }
    }
    clone() {
        const qb = new QueryBuilder(this.dbName, this.tableName, this.dataManager, this.fieldManager, this.permissionManager);
        qb.selectedFields = [...this.selectedFields];
        qb.whereConditions = new Map(this.whereConditions);
        qb.likeConditions = new Map(this.likeConditions);
        qb.rangeMin = this.rangeMin;
        qb.rangeMax = this.rangeMax;
        qb.schemas = new Map(this.schemas);
        return qb;
    }
}
exports.QueryBuilder = QueryBuilder;
//# sourceMappingURL=query-builder.js.map