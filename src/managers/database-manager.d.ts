/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
import { CacheManager } from '../utils/cache-manager';
import { UserCredentials, SystemAdminCredentials } from '../types';
export interface DatabaseInfo {
    name: string;
    tables: string[];
    users: Map<string, UserCredentials>;
    isPublic: boolean;
    owner: string[];
}
export declare class DatabaseManager {
    private rootPath;
    private registryPath;
    private cache;
    private dbIndex;
    private sysAdminIndex;
    constructor(rootPath: string, cache: CacheManager);
    private loadIndex;
    private readRegistryRaw;
    private writeRegistry;
    private getRegistryContent;
    private saveRegistryFromIndex;
    invalidate(): void;
    databaseExists(dbName: string): boolean;
    createDatabase(dbName: string, options?: {
        isPublic?: boolean;
        owner?: string[];
    }): boolean;
    dropDatabase(dbName: string): boolean;
    authenticate(dbName: string, username: string, password: string): UserCredentials | null;
    addUser(dbName: string, username: string, password: string, permission: number, isGrand?: boolean, status?: boolean): boolean;
    listUsers(dbName: string): string[];
    deleteUser(dbName: string, username: string): boolean;
    getDatabaseInfo(dbName: string): DatabaseInfo | null;
    listDatabases(): string[];
    addOwner(dbName: string, username: string): boolean;
    removeOwner(dbName: string, username: string): boolean;
    setPublic(dbName: string, isPublic: boolean): boolean;
    renameDatabase(oldDb: string, newName: string): boolean;
    hasSystemAdmin(): boolean;
    getSystemAdmin(): SystemAdminCredentials | null;
    createSystemAdmin(username: string, password: string): boolean;
    updateSystemAdmin(username: string, password: string): boolean;
    deleteSystemAdmin(): boolean;
    authenticateSystemAdmin(username: string, password: string): SystemAdminCredentials | null;
    listAllDatabases(): DatabaseInfo[];
    listAllUsers(): Map<string, string[]>;
}
//# sourceMappingURL=database-manager.d.ts.map