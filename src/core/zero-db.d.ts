/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
import { DatabaseInfo } from '../managers/database-manager';
import { BackupManager } from '../managers/backup-manager';
import { QueryBuilder } from '../query/query-builder';
import { PermissionType, CreateFieldDefinition, SystemAdminCredentials } from '../types';
import { ConnectionPool } from '../managers/connection-pool';
import { ZeroDBResult } from '../utils/validator';
import { EventEmitter } from 'node:events';
import { ScaleConfig } from '../engine/auto-scaler';
declare class SystemAdminAPI {
    private zdb;
    constructor(zdb: ZeroDB);
    login(username: string, password: string): boolean;
    logout(): void;
    get active(): boolean;
    get has(): boolean;
    get info(): SystemAdminCredentials | null;
    update(username: string, password: string): boolean;
    createAdmin(username: string, password: string): boolean;
}
interface ZeroDBOptions {
    database?: string;
    auth?: {
        user?: string;
        pass?: string;
    };
    overwrite?: boolean;
    scaler?: Partial<ScaleConfig>;
    backup?: string;
}
export declare class ZeroDB extends EventEmitter {
    private rootPath;
    private dbManager;
    private tableManager;
    private fieldManager;
    private dataManager;
    backupManager: BackupManager;
    private cache;
    private connectionPool;
    private currentUser;
    private currentSystemAdmin;
    private currentDb;
    private storedCredentials;
    private isNetwork;
    private requestedDb;
    constructor(rootPath?: string, cacheMB?: number, options?: ZeroDBOptions);
    get systemadmin(): SystemAdminAPI;
    get safe(): {
        createDatabase: (dbName: string, options?: any) => ZeroDBResult<boolean>;
        dropDatabase: (dbName: string) => ZeroDBResult<boolean>;
        login: (dbName: string, user: string, pass: string) => ZeroDBResult<boolean>;
        useDatabase: (dbName: string) => ZeroDBResult<boolean>;
        table: (tableName: string) => ZeroDBResult<QueryBuilder | null>;
        createTable: (tableName: string, fields?: any) => ZeroDBResult<QueryBuilder | null>;
        dropTable: (tableName: string) => ZeroDBResult<boolean>;
        flushAll: () => Promise<ZeroDBResult<void>>;
        renameDatabase: (newName: string) => ZeroDBResult<ZeroDB | null>;
        renameTable: (oldName: string, newName: string) => ZeroDBResult<ZeroDB | null>;
        renameField: (tableName: string, oldName: string, newName: string) => ZeroDBResult<ZeroDB | null>;
    };
    createDatabase(dbName: string, options?: {
        isPublic?: boolean;
        owner?: string[];
    }): boolean;
    dropDatabase(dbName: string): boolean;
    login(dbName: string, username: string, password: string): boolean;
    useDatabase(dbName: string): boolean;
    logout(): void;
    isAuthenticated(): boolean;
    table(tableName: string): QueryBuilder | null;
    createTable(tableName: string, fields?: CreateFieldDefinition[]): QueryBuilder | null;
    dropTable(tableName: string): boolean;
    getTables(dbName?: string): string[];
    getDatabaseInfo(dbName: string): DatabaseInfo | null;
    listDatabases(): string[];
    addOwner(dbName: string, username: string): Promise<boolean>;
    removeOwner(dbName: string, username: string): Promise<boolean>;
    setPublic(dbName: string, isPublic: boolean): Promise<boolean>;
    listUsers(dbName?: string | null): string[];
    addUser(username: string, password: string, permissions: Partial<Record<PermissionType, boolean>> | PermissionType[] | number, isGrand?: boolean, status?: boolean): ZeroDB | null;
    updateUser(username: string, password?: string, permissions?: Partial<Record<PermissionType, boolean>> | PermissionType[] | number, isGrand?: boolean, status?: boolean): ZeroDB | null;
    deleteUser(username: string, dbName?: string): ZeroDB | null;
    renameDatabase(newName: string): ZeroDB | null;
    renameTable(oldName: string, newName: string): ZeroDB | null;
    renameField(tableName: string, oldName: string, newName: string): ZeroDB | null;
    getCacheStats(): import("../utils/cache-manager").CacheStats;
    flushAll(): Promise<void>;
    getConnectionPool(): ConnectionPool;
    clearCache(): void;
    exit(): void;
    backup(fileName: string): Promise<string>;
    restore(fileName: string): Promise<void>;
    private hasSystemAdmin;
    private getSystemAdmin;
    private createSystemAdmin;
    private loginSystemAdmin;
    private logoutSystemAdmin;
    private isSystemAdmin;
    private updateSystemAdminPassword;
}
export {};
//# sourceMappingURL=zero-db.d.ts.map