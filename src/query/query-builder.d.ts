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
export declare class QueryBuilder {
    private dbName;
    private tableName;
    private dataManager;
    private fieldManager;
    private permissionManager;
    private insertEngine;
    private selectedFields;
    private selectAll;
    private whereConditions;
    private likeConditions;
    private rangeMin;
    private rangeMax;
    private sortField;
    private sortOrder;
    private schemas;
    private executed;
    constructor(dbName: string, tableName: string, dataManager: DataManager, fieldManager: FieldManager, permissionManager: PermissionManager);
    setSchemas(schemas: Map<string, FieldSchema>): QueryBuilder;
    select(fields: string[] | '*'): QueryBuilder;
    where(conditions: Record<string, string>): QueryBuilder;
    like(field: string, pattern: string): QueryBuilder;
    asc(field: string): QueryBuilder;
    desc(field: string): QueryBuilder;
    range(min: string, max: string): QueryBuilder;
    list(): Promise<SelectResult[]>;
    add(data: Record<string, string>): Promise<number>;
    addBatch(records: Record<string, string>[]): Promise<{
        success: boolean;
        lineNumbers: number[];
        errors: string[];
    }>;
    delete(): Promise<number>;
    update(data: Record<string, string>): Promise<number>;
    count(): Promise<number>;
    first(): Promise<SelectResult | null>;
    clone(): QueryBuilder;
}
//# sourceMappingURL=query-builder.d.ts.map