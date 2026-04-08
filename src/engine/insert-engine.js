"use strict";
/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsertEngine = void 0;
const auto_scaler_1 = require("./auto-scaler");
const event_manager_1 = require("../utils/event-manager");
class InsertEngine {
    constructor(dataManager) {
        this.dataManager = dataManager;
        auto_scaler_1.autoScaler.initialize();
    }
    async insert(dbName, tableName, records, fieldFileNames, schemas) {
        const startTime = Date.now();
        const strategy = auto_scaler_1.autoScaler.determineStrategy(records.length);
        event_manager_1.EventManager.info(`InsertEngine using strategy: ${strategy} for ${records.length} records`);
        let result;
        try {
            switch (strategy) {
                case 'sequential':
                    result = await this.insertSequential(dbName, tableName, records, fieldFileNames, schemas);
                    break;
                case 'batch':
                    result = await this.insertBatch(dbName, tableName, records, fieldFileNames, schemas);
                    break;
                case 'hybrid':
                    result = await this.insertHybrid(dbName, tableName, records, fieldFileNames, schemas);
                    break;
                case 'worker':
                    result = await this.insertWorker(dbName, tableName, records, fieldFileNames, schemas);
                    break;
                case 'stream':
                    result = await this.insertStream(dbName, tableName, records, fieldFileNames, schemas);
                    break;
                default:
                    result = await this.insertBatch(dbName, tableName, records, fieldFileNames, schemas);
            }
            const duration = Date.now() - startTime;
            auto_scaler_1.autoScaler.recordOperation(records.length, duration, result.success);
            return result;
        }
        catch (error) {
            event_manager_1.EventManager.error(`InsertEngine error during insert`, { error: error.message });
            return {
                success: false,
                lineNumbers: [],
                errors: [error.message]
            };
        }
    }
    async insertSequential(dbName, tableName, records, fieldFileNames, schemas) {
        const lineNumbers = [];
        const allErrors = [];
        for (const record of records) {
            const fields = new Map(Object.entries(record));
            const result = await this.dataManager.insertRecord(dbName, tableName, fields, fieldFileNames, schemas);
            if (result.success) {
                lineNumbers.push(result.lineNumber);
            }
            else {
                allErrors.push(...result.errors);
            }
        }
        return {
            success: allErrors.length === 0,
            lineNumbers,
            errors: allErrors
        };
    }
    async insertBatch(dbName, tableName, records, fieldFileNames, schemas) {
        const lineNumbers = [];
        const allErrors = [];
        const batchSize = auto_scaler_1.autoScaler.getBatchSize(records.length);
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            const batchPromises = batch.map(async (record) => {
                const fields = new Map(Object.entries(record));
                return this.dataManager.insertRecord(dbName, tableName, fields, fieldFileNames, schemas);
            });
            const results = await Promise.all(batchPromises);
            results.forEach((result) => {
                if (result.success) {
                    lineNumbers.push(result.lineNumber);
                }
                else {
                    allErrors.push(...result.errors);
                }
            });
        }
        return {
            success: allErrors.length === 0,
            lineNumbers,
            errors: allErrors
        };
    }
    async insertHybrid(dbName, tableName, records, fieldFileNames, schemas) {
        const lineNumbers = [];
        const allErrors = [];
        const batchSize = auto_scaler_1.autoScaler.getBatchSize(records.length) * 2;
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            const results = await Promise.all(batch.map(async (record) => {
                const fields = new Map(Object.entries(record));
                return this.dataManager.insertRecord(dbName, tableName, fields, fieldFileNames, schemas);
            }));
            results.forEach(res => {
                if (res.success)
                    lineNumbers.push(res.lineNumber);
                else
                    allErrors.push(...res.errors);
            });
            if (i % (batchSize * 5) === 0) {
                await new Promise(resolve => setImmediate(resolve));
            }
        }
        return {
            success: allErrors.length === 0,
            lineNumbers,
            errors: allErrors
        };
    }
    async insertWorker(dbName, tableName, records, fieldFileNames, schemas) {
        const workerCount = auto_scaler_1.autoScaler.getRecommendedWorkerCount(records.length);
        const chunkSize = Math.ceil(records.length / workerCount);
        event_manager_1.EventManager.info(`InsertEngine spawning ${workerCount} workers for ${records.length} records`);
        const workerPromises = [];
        for (let i = 0; i < workerCount; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, records.length);
            if (start >= end)
                break;
            const chunk = records.slice(start, end);
            workerPromises.push(this.processChunk(dbName, tableName, chunk, fieldFileNames, schemas));
        }
        const results = await Promise.all(workerPromises);
        const lineNumbers = results.flatMap(r => r.lineNumbers);
        const allErrors = results.flatMap(r => r.errors);
        return {
            success: allErrors.length === 0,
            lineNumbers,
            errors: allErrors
        };
    }
    async insertStream(dbName, tableName, records, fieldFileNames, schemas) {
        const lineNumbers = [];
        const allErrors = [];
        const streamChunkSize = 5000;
        event_manager_1.EventManager.info(`InsertEngine stream strategy activated for ${records.length} records`);
        for (let i = 0; i < records.length; i += streamChunkSize) {
            const chunk = records.slice(i, i + streamChunkSize);
            const result = await this.insertBatch(dbName, tableName, chunk, fieldFileNames, schemas);
            lineNumbers.push(...result.lineNumbers);
            allErrors.push(...result.errors);
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        return {
            success: allErrors.length === 0,
            lineNumbers,
            errors: allErrors
        };
    }
    async processChunk(dbName, tableName, records, fieldFileNames, schemas) {
        const lineNumbers = [];
        const errors = [];
        const chunkBatchSize = 100;
        for (let i = 0; i < records.length; i += chunkBatchSize) {
            const batch = records.slice(i, i + chunkBatchSize);
            const results = await Promise.all(batch.map(r => {
                const fields = new Map(Object.entries(r));
                return this.dataManager.insertRecord(dbName, tableName, fields, fieldFileNames, schemas);
            }));
            results.forEach(res => {
                if (res.success)
                    lineNumbers.push(res.lineNumber);
                else
                    errors.push(...res.errors);
            });
        }
        return { lineNumbers, errors };
    }
}
exports.InsertEngine = InsertEngine;
//# sourceMappingURL=insert-engine.js.map