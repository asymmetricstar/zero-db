/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
import { DatabaseInfo } from '../managers/database-manager';
import { BackupManager } from '../managers/backup-manager';
import { QueryBuilder } from '../query/query-builder';
import { PermissionType, CreateFieldDefinition } from '../types';
import { ConnectionPool } from '../managers/connection-pool';
import { ZeroDBResult } from '../utils/validator';
import { EventEmitter } from 'node:events';
import { ScaleConfig } from '../engine/auto-scaler';
interface ZeroDBOptions {
    db?: string;
    auth?: {
        user?: string;
        pass?: string;
        database?: string;
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
    private currentDb;
    private storedCredentials;
    private isNetwork;
    private requestedDb;
    constructor(rootPath?: string, cacheMB?: number, options?: ZeroDBOptions);
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
    listUsers(dbName?: string): string[];
    addUser(username: string, password: string, permissions: Partial<Record<PermissionType, boolean>> | PermissionType[] | number, isGrand?: boolean, dbName?: string, status?: boolean): ZeroDB | null;
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
}
export {};
//# sourceMappingURL=zero-db.d.ts.map