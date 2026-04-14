/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
import { SelectResult } from '../types';
import { PermissionManager } from '../managers/permission-manager';
import { DataManager, FieldSchema } from '../managers/data-manager';
import { FieldManager } from '../managers/field-manager';
import { TableManager } from '../managers/table-manager';
import { BackupManager } from '../managers/backup-manager';
import { ModifyBuilder } from './modify-builder';
export declare class QueryBuilder {
    private dbName;
    private tableName;
    private dataManager;
    private fieldManager;
    private tableManager;
    private permissionManager;
    private backupManager;
    private insertEngine;
    private selectedFields;
    private selectAll;
    private whereConditions;
    private likeConditions;
    private orWhereConditions;
    private whereInConditions;
    private whereBetweenConditions;
    private rangeMin;
    private rangeMax;
    private limitNum;
    private pageNum;
    private sortField;
    private sortOrder;
    private groupByField;
    private distinctField;
    private joinConfig;
    private schemas;
    private executed;
    constructor(dbName: string, tableName: string, dataManager: DataManager, fieldManager: FieldManager, tableManager: TableManager, permissionManager: PermissionManager, backupManager: BackupManager);
    private checkWriteAccess;
    modify(): ModifyBuilder;
    setSchemas(schemas: Map<string, FieldSchema>): QueryBuilder;
    select(fields: string[] | '*'): QueryBuilder;
    where(conditions: Record<string, string>): QueryBuilder;
    orWhere(conditions: Record<string, string>): QueryBuilder;
    whereIn(field: string, values: string[]): QueryBuilder;
    whereBetween(field: string, min: string, max: string): QueryBuilder;
    like(field: string, pattern: string): QueryBuilder;
    asc(field: string): QueryBuilder;
    desc(field: string): QueryBuilder;
    orderBy(field: string, order?: 'asc' | 'desc'): QueryBuilder;
    range(min: string, max: string): QueryBuilder;
    limit(num: number): QueryBuilder;
    page(page: number): QueryBuilder;
    groupBy(field: string): QueryBuilder;
    distinct(field: string): QueryBuilder;
    sum(field: string): Promise<number>;
    avg(field: string): Promise<number>;
    min(field: string): Promise<number | null>;
    max(field: string): Promise<number | null>;
    list(): Promise<SelectResult[]>;
    add(data: Record<string, string>): Promise<number>;
    addBatch(records: Record<string, string>[]): Promise<{
        success: boolean;
        lineNumbers: number[];
        errors: string[];
    }>;
    delete(): Promise<number>;
    update(data: Record<string, string>): Promise<number>;
    upsert(data: Record<string, string>): Promise<{
        success: boolean;
        action: 'insert' | 'update';
        id: number;
    }>;
    count(): Promise<number>;
    first(): Promise<SelectResult | null>;
    clone(): QueryBuilder;
    join(rightTableName: string, rightField: string, leftField: string, selectFields?: string[] | '*'): QueryBuilder;
}
//# sourceMappingURL=query-builder.d.ts.map