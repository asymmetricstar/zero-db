/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
import { CacheManager } from '../utils/cache-manager';
import { TableDefinition, FieldDefinition, FieldType } from '../types';
export declare class TableManager {
    private rootPath;
    private schemaPath;
    private manifestPath;
    private cache;
    private tableIndex;
    constructor(rootPath: string, cache: CacheManager);
    invalidate(): void;
    getTableDir(dbName: string, tableName: string): string;
    private getTableIndex;
    private loadTableIndex;
    private readBinaryFile;
    private writeBinaryFile;
    private getSchemaContent;
    private getManifestContent;
    private invalidateSchema;
    private invalidateManifest;
    createTable(dbName: string, tableName: string, fields?: Array<{
        name: string;
        type: FieldType;
        option?: {
            isAuto?: boolean;
            allowNull?: boolean;
            defaultValue?: string;
            maxLength?: number;
        };
    }>): boolean;
    addField(dbName: string, tableName: string, fieldName: string, type: FieldType, options?: {
        isAuto?: boolean;
        allowNull?: boolean;
        defaultValue?: string;
        maxLength?: number;
    }): boolean;
    getTableDefinition(dbName: string, tableName: string): TableDefinition | null;
    getTableList(dbName: string): string[];
    tableExists(dbName: string, tableName: string): boolean;
    hasField(dbName: string, tableName: string, fieldName: string): boolean;
    getAllFields(dbName: string, tableName: string): Map<string, string>;
    getTableFields(dbName: string, tableName: string): FieldDefinition[];
    dropTable(dbName: string, tableName: string): boolean;
    renameTable(dbName: string, oldName: string, newName: string): void;
    renameField(dbName: string, tableName: string, oldName: string, newName: string, oldFileName: string): void;
    dropField(dbName: string, tableName: string, fieldName: string): boolean;
    modifyField(dbName: string, tableName: string, fieldName: string, type: FieldType, options?: {
        isAuto?: boolean;
        allowNull?: boolean;
        defaultValue?: string;
        maxLength?: number;
    }): boolean;
    private updateTableSchema;
    getFieldFileName(dbName: string, tableName: string, fieldName: string): string | null;
    private appendToFile;
}
//# sourceMappingURL=table-manager.d.ts.map