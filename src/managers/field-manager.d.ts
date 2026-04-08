/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
import { CacheManager } from '../utils/cache-manager';
import { FieldDefinition } from '../types';
export declare class FieldManager {
    private rootPath;
    private manifestPath;
    private cache;
    constructor(rootPath: string, cache: CacheManager);
    private readBinaryFile;
    private getManifestContent;
    invalidate(): void;
    getFieldFileName(dbName: string, tableName: string, fieldName: string): string | null;
    getFieldPath(dbName: string, tableName: string, fieldName: string): string | null;
    getAllFields(dbName: string, tableName: string): Map<string, string>;
    getTableFields(dbName: string, tableName: string): FieldDefinition[];
}
//# sourceMappingURL=field-manager.d.ts.map