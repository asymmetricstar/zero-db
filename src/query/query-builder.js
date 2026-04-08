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
    constructor(dbName, tableName, dataManager, fieldManager, permissionManager, backupManager) {
        this.selectedFields = [];
        this.selectAll = false;
        this.whereConditions = new Map();
        this.likeConditions = new Map();
        this.orWhereConditions = new Map();
        this.whereInConditions = new Map();
        this.whereBetweenConditions = new Map();
        this.rangeMin = '';
        this.rangeMax = '';
        this.limitNum = 0;
        this.pageNum = 0;
        this.sortField = '';
        this.sortOrder = 'asc';
        this.groupByField = '';
        this.distinctField = '';
        this.schemas = new Map();
        this.executed = false;
        this.dbName = dbName;
        this.tableName = tableName;
        this.dataManager = dataManager;
        this.fieldManager = fieldManager;
        this.permissionManager = permissionManager;
        this.backupManager = backupManager;
        this.insertEngine = new insert_engine_1.InsertEngine(dataManager);
    }
    checkWriteAccess() {
        if (this.backupManager.maintenanceMode) {
            throw new Error("Sistem bakım modundadır, yazma işlemi yapılamaz.");
        }
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
    orWhere(conditions) {
        for (const [field, value] of Object.entries(conditions)) {
            const existing = this.orWhereConditions.get(field) || [];
            existing.push(value);
            this.orWhereConditions.set(field, existing);
        }
        return this;
    }
    whereIn(field, values) {
        if (values.length > 0) {
            this.whereInConditions.set(field, values);
        }
        return this;
    }
    whereBetween(field, min, max) {
        this.whereBetweenConditions.set(field, { min, max });
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
    orderBy(field, order = 'asc') {
        this.sortField = field;
        this.sortOrder = order;
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
    limit(num) {
        if (num > 0) {
            this.limitNum = num;
        }
        return this;
    }
    page(page) {
        if (page > 0) {
            this.pageNum = page;
        }
        return this;
    }
    groupBy(field) {
        this.groupByField = field;
        return this;
    }
    distinct(field) {
        this.distinctField = field;
        return this;
    }
    async sum(field) {
        try {
            const qb = this.clone();
            qb.select([field]);
            const results = await qb.list();
            let total = 0;
            for (const row of results) {
                const val = parseFloat(String(row[field] || '0'));
                if (!isNaN(val))
                    total += val;
            }
            return total;
        }
        catch (e) {
            event_manager_1.EventManager.error(`Sum failed`, { error: e.message });
            return 0;
        }
    }
    async avg(field) {
        try {
            const qb = this.clone();
            qb.select([field]);
            const results = await qb.list();
            if (results.length === 0)
                return 0;
            let total = 0;
            let count = 0;
            for (const row of results) {
                const val = parseFloat(String(row[field] || '0'));
                if (!isNaN(val)) {
                    total += val;
                    count++;
                }
            }
            return count > 0 ? total / count : 0;
        }
        catch (e) {
            event_manager_1.EventManager.error(`Avg failed`, { error: e.message });
            return 0;
        }
    }
    async min(field) {
        try {
            const qb = this.clone();
            qb.select([field]);
            const results = await qb.list();
            if (results.length === 0)
                return null;
            let minVal = null;
            for (const row of results) {
                const val = parseFloat(String(row[field] || '0'));
                if (!isNaN(val)) {
                    if (minVal === null || val < minVal)
                        minVal = val;
                }
            }
            return minVal;
        }
        catch (e) {
            event_manager_1.EventManager.error(`Min failed`, { error: e.message });
            return null;
        }
    }
    async max(field) {
        try {
            const qb = this.clone();
            qb.select([field]);
            const results = await qb.list();
            if (results.length === 0)
                return null;
            let maxVal = null;
            for (const row of results) {
                const val = parseFloat(String(row[field] || '0'));
                if (!isNaN(val)) {
                    if (maxVal === null || val > maxVal)
                        maxVal = val;
                }
            }
            return maxVal;
        }
        catch (e) {
            event_manager_1.EventManager.error(`Max failed`, { error: e.message });
            return null;
        }
    }
    async list() {
        try {
            if (!this.permissionManager.hasAccess('list')) {
                event_manager_1.EventManager.error('Permission denied: list access required');
                return [];
            }
            const fieldFileNames = this.fieldManager.getAllFields(this.dbName, this.tableName);
            let activeSelectedFields = [...this.selectedFields];
            // FIX: If no fields selected, always default to all fields regardless of execution status
            if (this.selectAll || activeSelectedFields.length === 0) {
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
            const results = await this.dataManager.selectRecords(this.dbName, this.tableName, allFieldsForQuery, fieldFileNames, undefined, this.likeConditions.size > 0 ? this.likeConditions : undefined);
            let filteredResults = [];
            for (const row of results) {
                const filteredRow = {};
                if (this.selectAll || activeSelectedFields.length === 0) {
                    Object.assign(filteredRow, row);
                }
                else {
                    for (const field of activeSelectedFields) {
                        if (row[field] !== undefined)
                            filteredRow[field] = row[field];
                    }
                    if (row['created_at'] !== undefined)
                        filteredRow['created_at'] = row['created_at'];
                    if (row['updated_at'] !== undefined)
                        filteredRow['updated_at'] = row['updated_at'];
                }
                filteredResults.push(filteredRow);
            }
            filteredResults = results.filter(row => {
                const matchesWhere = Array.from(this.whereConditions.entries()).every(([k, v]) => row[k] === v);
                const matchesOr = this.orWhereConditions.size === 0 ||
                    Array.from(this.orWhereConditions.entries()).some(([k, vals]) => vals.includes(row[k]));
                return matchesWhere && matchesOr;
            });
            if (this.whereInConditions.size > 0) {
                filteredResults = filteredResults.filter(row => {
                    for (const [field, values] of this.whereInConditions) {
                        if (!values.includes(row[field]))
                            return false;
                    }
                    return true;
                });
            }
            if (this.whereBetweenConditions.size > 0) {
                filteredResults = filteredResults.filter(row => {
                    for (const [field, { min, max }] of this.whereBetweenConditions) {
                        const val = parseFloat(row[field] || '0');
                        const minVal = parseFloat(min);
                        const maxVal = parseFloat(max);
                        if (val < minVal || val > maxVal)
                            return false;
                    }
                    return true;
                });
            }
            if (this.sortField) {
                filteredResults.sort((a, b) => {
                    const aVal = a[this.sortField] || '';
                    const bVal = b[this.sortField] || '';
                    // Check if numeric
                    const aNum = parseFloat(String(aVal));
                    const bNum = parseFloat(String(bVal));
                    if (!isNaN(aNum) && !isNaN(bNum)) {
                        return this.sortOrder === 'desc' ? bNum - aNum : aNum - bNum;
                    }
                    const cmp = String(aVal).localeCompare(String(bVal));
                    return this.sortOrder === 'desc' ? -cmp : cmp;
                });
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
            // Pagination and Limit logic fixed
            if (this.pageNum > 0) {
                const pageSize = this.limitNum > 0 ? this.limitNum : 10;
                const start = (this.pageNum - 1) * pageSize;
                const end = start + pageSize;
                filteredResults = filteredResults.slice(start, end);
            }
            else if (this.limitNum > 0) {
                filteredResults = filteredResults.slice(0, this.limitNum);
            }
            if (this.groupByField) {
                const grouped = {};
                for (const row of filteredResults) {
                    const key = row[this.groupByField] || 'null';
                    if (!grouped[key])
                        grouped[key] = [];
                    grouped[key].push(row);
                }
                const groupedResults = [];
                for (const [key, rows] of Object.entries(grouped)) {
                    const firstRow = rows[0];
                    groupedResults.push({
                        ...firstRow,
                        _groupKey: key,
                        _groupCount: String(rows.length)
                    });
                }
                filteredResults = groupedResults;
            }
            if (this.distinctField) {
                const seen = new Set();
                filteredResults = filteredResults.filter(row => {
                    const key = row[this.distinctField] || '';
                    if (seen.has(key))
                        return false;
                    seen.add(key);
                    return true;
                });
            }
            this.executed = true;
            this.whereConditions.clear();
            this.orWhereConditions.clear();
            this.whereInConditions.clear();
            this.whereBetweenConditions.clear();
            this.likeConditions.clear();
            this.rangeMin = '';
            this.rangeMax = '';
            this.limitNum = 0;
            this.pageNum = 0;
            this.sortField = '';
            this.groupByField = '';
            this.distinctField = '';
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
        this.checkWriteAccess();
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
        this.checkWriteAccess();
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
        this.checkWriteAccess();
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
        this.checkWriteAccess();
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
    async upsert(data) {
        this.checkWriteAccess();
        try {
            if (!data || Object.keys(data).length === 0) {
                event_manager_1.EventManager.error('Upsert requires data');
                return { success: false, action: 'insert', id: 0 };
            }
            if (!this.permissionManager.hasAccess('add') || !this.permissionManager.hasAccess('update')) {
                event_manager_1.EventManager.error('Permission denied: add and update access required for upsert');
                return { success: false, action: 'insert', id: 0 };
            }
            const fieldFileNames = this.fieldManager.getAllFields(this.dbName, this.tableName);
            if (!fieldFileNames || fieldFileNames.size === 0) {
                event_manager_1.EventManager.error('Table not found or has no fields');
                return { success: false, action: 'insert', id: 0 };
            }
            const idField = Array.from(fieldFileNames.keys()).find(f => this.schemas.has(f) && this.schemas.get(f)?.isAuto);
            let existingRecord = null;
            if (this.whereConditions.size > 0 && idField) {
                const results = await this.dataManager.selectRecords(this.dbName, this.tableName, Array.from(fieldFileNames.keys()), fieldFileNames, this.whereConditions);
                if (results && results.length > 0) {
                    existingRecord = results[0];
                }
            }
            if (existingRecord) {
                const updates = new Map();
                for (const [field, value] of Object.entries(data)) {
                    updates.set(field, value);
                }
                const result = await this.dataManager.updateRecords(this.dbName, this.tableName, fieldFileNames, updates, this.whereConditions, this.schemas.size > 0 ? this.schemas : undefined);
                await this.dataManager.flushAll();
                this.whereConditions.clear();
                const updateId = existingRecord && idField ? parseInt(String(existingRecord[idField] || '0')) : 0;
                return {
                    success: result && result.success,
                    action: 'update',
                    id: updateId
                };
            }
            else {
                const dataMap = new Map();
                for (const [field, value] of Object.entries(data)) {
                    dataMap.set(field, value);
                }
                const result = await this.dataManager.insertRecord(this.dbName, this.tableName, dataMap, fieldFileNames, this.schemas.size > 0 ? this.schemas : undefined);
                await this.dataManager.flushAll();
                this.whereConditions.clear();
                return {
                    success: result && result.success,
                    action: 'insert',
                    id: result ? result.lineNumber : 0
                };
            }
        }
        catch (e) {
            event_manager_1.EventManager.error(`Upsert failed`, { error: e.message });
            return { success: false, action: 'insert', id: 0 };
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
        const qb = new QueryBuilder(this.dbName, this.tableName, this.dataManager, this.fieldManager, this.permissionManager, this.backupManager);
        qb.selectedFields = [...this.selectedFields];
        qb.whereConditions = new Map(this.whereConditions);
        qb.orWhereConditions = new Map();
        for (const [key, val] of this.orWhereConditions) {
            qb.orWhereConditions.set(key, [...val]);
        }
        qb.whereInConditions = new Map(this.whereInConditions);
        qb.whereBetweenConditions = new Map(this.whereBetweenConditions);
        qb.likeConditions = new Map(this.likeConditions);
        qb.rangeMin = this.rangeMin;
        qb.rangeMax = this.rangeMax;
        qb.limitNum = this.limitNum;
        qb.pageNum = this.pageNum;
        qb.groupByField = this.groupByField;
        qb.distinctField = this.distinctField;
        qb.schemas = new Map(this.schemas);
        return qb;
    }
}
exports.QueryBuilder = QueryBuilder;
//# sourceMappingURL=query-builder.js.map