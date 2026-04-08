/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
import { CacheManager } from '../utils/cache-manager';
import { SelectResult, FieldType } from '../types';
export interface FieldSchema {
    name: string;
    type: FieldType;
    isAuto: boolean;
    allowNull: boolean;
    defaultValue: string;
    maxLength: number;
    fileName: string;
}
export declare class DataManager {
    private rootPath;
    private spawnPool;
    private cacheManager;
    private autoIncrementCounters;
    private operationLocks;
    private isNetwork;
    private readonly networkLockPath;
    private engineId;
    constructor(rootPath: string, cacheManager: CacheManager, isNetwork?: boolean);
    private getAutoIncrementKey;
    private getLockKey;
    private readNetworkState;
    private writeNetworkState;
    private acquireDistributedLock;
    private releaseDistributedLock;
    private withAtomicLock;
    private syncAutoIncrementFromDisk;
    private reserveAutoIncrement;
    private getSpawn;
    flushAll(): Promise<void>;
    validateAndCastData(data: Map<string, string>, schemas: Map<string, FieldSchema>, isUpdate?: boolean): {
        valid: boolean;
        errors: string[];
        castedData: Map<string, string>;
    };
    private castValue;
    insertRecord(dbName: string, tableName: string, fields: Map<string, string>, fieldFileNames: Map<string, string>, schemas?: Map<string, FieldSchema>): Promise<{
        success: boolean;
        lineNumber: number;
        errors: string[];
    }>;
    private doInsertRecord;
    private getNextAutoIncrement;
    checkDuplicate(dbName: string, tableName: string, fieldFileNames: Map<string, string>, uniqueFields: string[], values: Map<string, string>): Promise<boolean>;
    selectRecords(dbName: string, tableName: string, selectFields: string[], fieldFileNames: Map<string, string>, conditions?: Map<string, string>, likeConditions?: Map<string, string>): Promise<SelectResult[]>;
    deleteRecords(dbName: string, tableName: string, fieldFileNames: Map<string, string>, conditions: Map<string, string>): Promise<number>;
    updateRecords(dbName: string, tableName: string, fieldFileNames: Map<string, string>, updates: Map<string, string>, conditions: Map<string, string>, schemas?: Map<string, FieldSchema>): Promise<{
        success: boolean;
        count: number;
        errors: string[];
    }>;
    getPoolStats(): Record<string, any>;
    clearPool(): Promise<void>;
    clearPoolForDatabase(dbName: string): Promise<void>;
    clearPoolForTable(dbName: string, tableName: string): Promise<void>;
}
//# sourceMappingURL=data-manager.d.ts.map