/**
 * Zero-DB CLI — session state.
 *
 * Wraps one ZeroDB engine instance and keeps the CLI-facing state: the open
 * root folder, the selected database and the signed-in account.
 */
import { ZeroDB } from '../core/zero-db';
import type { DatabaseInfo } from '../managers/database-manager';
import { CreateFieldDefinition, FieldDefinition, PermissionType, SelectResult } from '../types';
export interface SessionInfo {
    rootPath: string;
    user: string;
    database: string;
    loggedIn: boolean;
    systemAdmin: boolean;
}
export interface UserRow {
    username: string;
    role: 'owner' | 'member' | 'global';
    permission: number;
    grand: boolean;
    status: boolean | null;
}
export interface FindOptions {
    where?: Record<string, string>;
    like?: Record<string, string>;
    order?: string;
    desc?: boolean;
    limit?: number;
    page?: number;
    select?: string[];
}
declare class SessionManager {
    private engine;
    private schemaManager;
    private rootPath;
    private user;
    private database;
    private loggedIn;
    private systemAdmin;
    private errors;
    constructor();
    get info(): SessionInfo;
    get isOpen(): boolean;
    get db(): ZeroDB;
    private get schema();
    clearErrors(): void;
    /** Errors collected since the last operation, without clearing them. */
    lastErrors(): string[];
    /** Open the configured root folder if no engine is loaded. */
    ensureOpen(): Promise<void>;
    /** Open a database root folder (the directory holding registry.zdb). */
    open(rootPath: string, remember?: boolean): Promise<void>;
    /** Flush pending writes and release the engine. */
    dispose(): Promise<void>;
    private resetSessionState;
    /**
     * Run an engine call that signals failure with false/null/undefined and turn
     * the collected EventManager errors into a CliError.
     */
    attempt<T>(label: string, fn: () => T | Promise<T>, failed?: (value: T) => boolean): Promise<T>;
    /** Throw when the engine logged an error during the last operation. */
    assertClean(label: string): void;
    listDatabases(): string[];
    databaseExists(name: string): boolean;
    getDatabaseInfo(name: string): DatabaseInfo | null;
    listTables(dbName?: string): string[];
    hasDatabase(): boolean;
    requireDatabase(): string;
    /** Switch database and remember it for the next run. */
    selectDatabase(name: string): void;
    /** Sign in to a database. */
    login(dbName: string, username: string, password: string): void;
    /** Sign in as the system-wide administrator. */
    loginAdmin(username: string, password: string): void;
    logout(): void;
    /** Reset what the engine already logged out for us (self-delete). */
    syncAfterUserDeleted(username: string): void;
    /** After dropping the selected database, pick another one or log out. */
    afterDatabaseDropped(name: string): void;
    createDatabase(name: string, options?: {
        isPublic?: boolean;
        owner?: string[];
    }): void;
    dropDatabase(name: string): Promise<void>;
    renameDatabase(newName: string): void;
    setPublic(name: string, isPublic: boolean): Promise<void>;
    createTable(name: string, fields: CreateFieldDefinition[]): Promise<void>;
    dropTable(name: string): Promise<void>;
    renameTable(oldName: string, newName: string): void;
    /** Read field definitions through a read-only manifest reader. */
    describeTable(tableName: string): FieldDefinition[];
    isSystemField(name: string): boolean;
    /**
     * Store booleans as the engine does (`1`/`0`), so `--where active=true`
     * matches rows and `update ... active=false` writes a comparable value.
     */
    private normalizeValues;
    tableCount(tableName: string): Promise<number>;
    find(tableName: string, options?: FindOptions): Promise<SelectResult[]>;
    countWhere(tableName: string, where: Record<string, string>): Promise<number>;
    addRecord(tableName: string, data: Record<string, string>): Promise<number>;
    updateRecords(tableName: string, where: Record<string, string>, data: Record<string, string>): Promise<number>;
    deleteRecords(tableName: string, where: Record<string, string>): Promise<number>;
    addField(tableName: string, field: CreateFieldDefinition): Promise<void>;
    dropField(tableName: string, fieldName: string): Promise<void>;
    modifyField(tableName: string, fieldName: string, type: FieldDefinition['type'], options: NonNullable<CreateFieldDefinition['option']>): Promise<void>;
    renameField(tableName: string, oldName: string, newName: string): void;
    /** Users of one database (owners included). */
    listDatabaseUsers(dbName: string): UserRow[];
    /** Global users; ZeroDB requires grand/system-admin privileges. */
    listGlobalUsers(): string[];
    addUser(username: string, password: string, permissions: PermissionType[] | number, isGrand: boolean, ownerDatabase?: string): Promise<void>;
    updateUser(username: string, password: string | undefined, permissions: PermissionType[] | number | undefined, isGrand: boolean | undefined, status: boolean | undefined): Promise<void>;
    deleteUser(username: string, dbName?: string): Promise<void>;
    addOwner(dbName: string, username: string): Promise<void>;
    removeOwner(dbName: string, username: string): Promise<void>;
    backup(fileName: string): Promise<string>;
    restore(fileName: string): Promise<void>;
    cacheStats(): import("../utils/cache-manager").CacheStats;
    backupDirectory(): string;
    /** Hash helper kept here so commands don't need the engine internals. */
    static hash(value: string): string;
}
export declare const session: SessionManager;
export {};
//# sourceMappingURL=session.d.ts.map