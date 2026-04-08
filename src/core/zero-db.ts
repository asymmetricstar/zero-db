/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 * 
 * @asymmetricstar - https://github.com/asymmetricstar
 */

import * as path from 'path';
import * as fs from 'fs';
import { DatabaseManager, DatabaseInfo } from '../managers/database-manager';
import { TableManager } from '../managers/table-manager';
import { FieldManager } from '../managers/field-manager';
import { DataManager } from '../managers/data-manager';
import { PermissionManager } from '../managers/permission-manager';
import { QueryBuilder } from '../query/query-builder';
import { UserCredentials, FieldType, PermissionType, CreateFieldDefinition } from '../types';
import { CacheManager } from '../utils/cache-manager';
import { MD5 } from '../utils/md5';
import { ConnectionPool } from '../managers/connection-pool';
import { ZeroDBResult, ok, err, safe, safeAsync } from '../utils/validator';
import { isNetworkPath } from '../utils/path-utils';
import { EventManager } from '../utils/event-manager';
import { EventEmitter } from 'node:events';

interface ZeroDBOptions {
  db?: string;
  auth?: {
    user?: string;
    pass?: string;
  };
  overwrite?: boolean;
}

export class ZeroDB extends EventEmitter {
  private rootPath: string;
  private dbManager: DatabaseManager;
  private tableManager: TableManager;
  private fieldManager: FieldManager;
  private dataManager: DataManager;
  private cache: CacheManager;
  private connectionPool: ConnectionPool;
  private currentUser: UserCredentials | null = null;
  private currentDb: string = '';
  private storedCredentials: { username: string; password: string } | null = null;
  private isNetwork: boolean = false;
  private requestedDb: string = '';

  constructor(rootPath: string = './databases', cacheMB: number = 128, options: ZeroDBOptions = {}) {
    super();
    this.rootPath = path.resolve(rootPath);
    
    if (options.overwrite && fs.existsSync(this.rootPath)) {
      fs.rmSync(this.rootPath, { recursive: true, force: true });
      EventManager.info('Existing database overwritten');
    }
    
    this.isNetwork = isNetworkPath(this.rootPath);
    this.requestedDb = options.db || '';
    this.cache = this.isNetwork ? new CacheManager(0) : new CacheManager(cacheMB);
    this.dbManager = new DatabaseManager(this.rootPath, this.cache);
    this.tableManager = new TableManager(this.rootPath, this.cache);
    this.fieldManager = new FieldManager(this.rootPath, this.cache);
    this.dataManager = new DataManager(this.rootPath, this.cache, this.isNetwork);
    this.connectionPool = new ConnectionPool();

    EventManager.info('ZeroDB instance initialized', { rootPath, cacheMB, isNetwork: this.isNetwork });

    if (options.auth?.user && options.auth?.pass) {
      this.storedCredentials = { username: options.auth.user, password: options.auth.pass };
      
      if (options.db && options.db !== "*") {
        try {
          this.login(options.db, options.auth.user, options.auth.pass);
          EventManager.info(`Auto-logged in to database '${options.db}'`);
        } catch (e: any) {
          EventManager.warn(`Failed to auto-login to database '${options.db}'`, { error: e.message });
        }
      }
    }
  }

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
  } {
    const z = this;
    return {
      createDatabase: (dbName, options) => safe(() => z.createDatabase(dbName, options)),
      dropDatabase: (dbName) => safe(() => z.dropDatabase(dbName)),
      login: (dbName, user, pass) => safe(() => z.login(dbName, user, pass)),
      useDatabase: (dbName) => safe(() => z.useDatabase(dbName)),
      table: (tableName) => safe(() => z.table(tableName)),
      createTable: (tableName, fields) => safe(() => z.createTable(tableName, fields)),
      dropTable: (tableName) => safe(() => z.dropTable(tableName)),
      flushAll: () => safeAsync(() => z.flushAll()),
      renameDatabase: (newName) => safe(() => z.renameDatabase(newName)),
      renameTable: (oldName, newName) => safe(() => z.renameTable(oldName, newName)),
      renameField: (tableName, oldName, newName) => safe(() => z.renameField(tableName, oldName, newName)),
    };
  }

  createDatabase(dbName: string, options?: { isPublic?: boolean; owner?: string[] }): boolean {
    try {
      if (this.dbManager.databaseExists(dbName)) {
        EventManager.error(`Database '${dbName}' already exists`);
        return false;
      }
      const success = this.dbManager.createDatabase(dbName, options);
      if (success) {
        EventManager.info(`Database '${dbName}' created successfully`, { options });

      }
      return success;
    } catch (e: any) {
      EventManager.error(`Failed to create database '${dbName}'`, { error: e.message, dbName, options });
      return false;
    }
  }

  dropDatabase(dbName: string): boolean {
    try {
      if (!this.currentUser) {
        EventManager.error('Not authenticated');
        return false;
      }
      
      const permissionManager = new PermissionManager(this.currentUser.permission);
      if (!permissionManager.hasAccess('drop')) {
        EventManager.error('Permission denied: drop');
        return false;
      }
      
      const dbInfo = this.dbManager.getDatabaseInfo(dbName);
      if (dbInfo && !dbInfo.isPublic && !this.currentUser.isGrand) {
        const isOwner = dbInfo.owner.includes(this.currentUser.username);
        if (!isOwner) {
          EventManager.error('Permission denied: You are not the owner of this database');
          return false;
        }
      }
      
      this.dataManager.clearPoolForDatabase(dbName);
      const success = this.dbManager.dropDatabase(dbName);
      if (success) {
        EventManager.info(`Database '${dbName}' dropped successfully`, { dbName });

      }
      return success;
    } catch (e: any) {
      EventManager.error(`Failed to drop database '${dbName}'`, { error: e.message, dbName });
      return false;
    }
  }

  login(dbName: string, username: string, password: string): boolean {
    try {
      const user = this.dbManager.authenticate(dbName, username, password);
      if (user) {
        this.currentUser = user;
        this.currentDb = dbName;
        this.storedCredentials = { username, password };
        EventManager.info(`User '${username}' logged in to database '${dbName}'`, { dbName, username });
        return true;
      }
      if (!this.dbManager.databaseExists(dbName)) {
        EventManager.error(`Database '${dbName}' not found`);
      } else {
        EventManager.error('Invalid credentials');
      }
      return false;
    } catch (e: any) {
      EventManager.error(`Login failed for database '${dbName}'`, { error: e.message, dbName, username });
      return false;
    }
  }

  useDatabase(dbName: string): boolean {
    try {
      if (!this.dbManager.databaseExists(dbName)) {
        EventManager.error(`Database '${dbName}' does not exist`);
        return false;
      }
      
      const dbInfo = this.dbManager.getDatabaseInfo(dbName);
      if (!dbInfo) {
        EventManager.error(`Could not retrieve information for database '${dbName}'`);
        return false;
      }
      
      if (dbInfo.isPublic) {
        this.currentDb = dbName;
        if (!this.currentUser) {
          this.currentUser = {
            username: 'guest',
            password: '',
            permission: 31,
            isGrand: false
          };
          EventManager.info(`Switched to public database '${dbName}' as guest user`);
        } else {
          EventManager.info(`Switched to public database '${dbName}'`, { currentUser: this.currentUser.username });
        }
        return true;
      }
      
      if (!this.currentUser) {
        EventManager.error('Not authenticated. Please login first.');
        return false;
      }
      
      const userAccess = dbInfo.users.get(this.currentUser?.username ?? '');
      if (!userAccess && !this.currentUser.isGrand) {
        EventManager.error(`Access denied: User '${this.currentUser?.username}' does not have access to database '${dbName}'`);
        return false;
      }
      
      this.currentDb = dbName;
      EventManager.info(`Switched to database '${dbName}'`, { user: this.currentUser.username });
      return true;
    } catch (e: any) {
      EventManager.error(`Failed to switch to database '${dbName}'`, { error: e.message, dbName });
      return false;
    }
  }

  logout(): void {
    const username = this.currentUser?.username;
    const dbName = this.currentDb;
    this.currentUser = null;
    this.currentDb = '';
    EventManager.info('User logged out', { username, dbName });
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null && this.currentUser.username !== 'guest';
  }

  table(tableName: string): QueryBuilder | null {
    try {
      if (!this.currentDb) {
        const dbs = this.dbManager.listDatabases();
        if (dbs.length === 0) {
          const dbName = this.requestedDb || this.currentDb;
          EventManager.error(dbName ? `Database '${dbName}' not found` : 'No database found');
          return null;
        }
        for (const dbName of dbs) {
          const info = this.dbManager.getDatabaseInfo(dbName);
          if (info && info.isPublic) {
            this.useDatabase(dbName);
            break;
          }
        }
      }

      if (!this.currentDb) {
        EventManager.error('No database selected');
        return null;
      }

      if (!this.currentUser) {
        EventManager.error('Not authenticated');
        return null;
      }
      
      if (!this.tableManager.tableExists(this.currentDb, tableName)) {
        EventManager.error(`Table '${tableName}' not found`);
        return null;
      }
      const permissionManager = new PermissionManager(this.currentUser.permission);

      const qb = new QueryBuilder(
        this.currentDb,
        tableName,
        this.dataManager,
        this.fieldManager,
        permissionManager
      );

      const tableDef = this.tableManager.getTableDefinition(this.currentDb, tableName);
      const fieldMappings = this.tableManager.getAllFields(this.currentDb, tableName);
      if (tableDef) {
        const schemas = new Map();
        for (const [key, field] of tableDef.fields) {
          const fieldName = fieldMappings.get(key) ? key : (field.name || key);
          const mappedFileName = fieldMappings.get(fieldName) || key;
          schemas.set(fieldName, {
            name: fieldName,
            type: field.type,
            isAuto: field.isAuto,
            allowNull: field.allowNull,
            defaultValue: field.defaultValue,
            maxLength: field.maxLength,
            fileName: mappedFileName
          });
        }
        qb.setSchemas(schemas);
      }

      return qb;
    } catch (e: any) {
      EventManager.error(`Failed to access table '${tableName}'`, { error: e.message, dbName: this.currentDb });
      return null;
    }
  }

  createTable(tableName: string, fields?: CreateFieldDefinition[]): QueryBuilder | null {
    try {
      if (!this.currentDb) {
        const dbs = this.dbManager.listDatabases();
        if (dbs.length === 0) {
          const dbName = this.requestedDb || this.currentDb;
          EventManager.error(dbName ? `Database '${dbName}' not found` : 'No database found');
          return null;
        }
        for (const dbName of dbs) {
          const info = this.dbManager.getDatabaseInfo(dbName);
          if (info && info.isPublic) {
            this.useDatabase(dbName);
            break;
          }
        }
      }

      if (!this.currentDb) {
        EventManager.error('No database selected');
        return null;
      }

      if (!this.currentUser) {
        EventManager.error('Not authenticated');
        return null;
      }
      const pm = new PermissionManager(this.currentUser.permission);
      if (!pm.hasAccess('create')) {
        EventManager.error('Permission denied: create');
        return null;
      }
      if (this.tableManager.tableExists(this.currentDb, tableName)) {
        EventManager.error(`Table '${tableName}' already exists`);
        return null;
      }
      this.tableManager.createTable(this.currentDb, tableName);

      if (fields && Array.isArray(fields)) {
        for (const field of fields) {
          if (this.tableManager.hasField(this.currentDb, tableName, field.name)) {
            EventManager.error(`Field '${field.name}' already exists in table '${tableName}'`);
          }
          this.tableManager.addField(this.currentDb, tableName, field.name, field.type, field.option);
        }
      }
      EventManager.info(`Table '${tableName}' created successfully in database '${this.currentDb}'`, { fields });
      return this.table(tableName);
    } catch (e: any) {
      EventManager.error(`Failed to create table '${tableName}'`, { error: e.message, dbName: this.currentDb });
      return null;
    }
  }

  dropTable(tableName: string): boolean {
    try {
      if (!this.currentUser) {
        EventManager.error('Not authenticated');
        return false;
      }
      const pm = new PermissionManager(this.currentUser.permission);
      if (!pm.hasAccess('drop')) {
        EventManager.error('Permission denied: drop');
        return false;
      }
      this.dataManager.clearPoolForTable(this.currentDb, tableName);
      const success = this.tableManager.dropTable(this.currentDb, tableName);
      if (success) {
        EventManager.info(`Table '${tableName}' dropped successfully from database '${this.currentDb}'`);
      }
      return success;
    } catch (e: any) {
      EventManager.error(`Failed to drop table '${tableName}'`, { error: e.message, dbName: this.currentDb });
      return false;
    }
  }

  getTables(dbName?: string): string[] {
    try {
      const targetDb = dbName || this.currentDb;
      
      if (targetDb) {
        const dbInfo = this.dbManager.getDatabaseInfo(targetDb);
        if (dbInfo && dbInfo.isPublic) {
          return this.tableManager.getTableList(targetDb);
        }
      }
      
      if (!this.currentUser) {
        EventManager.error('Not authenticated');
      }
      
      return this.tableManager.getTableList(this.currentDb);
    } catch (e: any) {
      EventManager.error(`Failed to list tables`, { error: e.message, dbName: dbName || this.currentDb });
      return [];
    }
  }

  getDatabaseInfo(dbName: string): DatabaseInfo | null {
    try {
      return this.dbManager.getDatabaseInfo(dbName);
    } catch (e: any) {
      EventManager.error(`Failed to get database info for '${dbName}'`, { error: e.message });
      return null;
    }
  }

  listDatabases(): string[] {
    try {
      return this.dbManager.listDatabases();
    } catch (e: any) {
      EventManager.error(`Failed to list databases`, { error: e.message });
      return [];
    }
  }

  async addOwner(dbName: string, username: string): Promise<boolean> {
    try {
      const success = await this.dbManager.addOwner(dbName, username);
      if (success) {
        EventManager.info(`Owner '${username}' added to database '${dbName}'`);
      }
      return success;
    } catch (e: any) {
      EventManager.error(`Failed to add owner '${username}' to database '${dbName}'`, { error: e.message });
      return false;
    }
  }

  async removeOwner(dbName: string, username: string): Promise<boolean> {
    try {
      const success = await this.dbManager.removeOwner(dbName, username);
      if (success) {
        EventManager.info(`Owner '${username}' removed from database '${dbName}'`);
      }
      return success;
    } catch (e: any) {
      EventManager.error(`Failed to remove owner '${username}' from database '${dbName}'`, { error: e.message });
      return false;
    }
  }

  async setPublic(dbName: string, isPublic: boolean): Promise<boolean> {
    try {
      const success = await this.dbManager.setPublic(dbName, isPublic);
      if (success) {
        EventManager.info(`Database '${dbName}' set to public: ${isPublic}`);
      }
      return success;
    } catch (e: any) {
      EventManager.error(`Failed to set public status for database '${dbName}'`, { error: e.message, isPublic });
      return false;
    }
  }

  addUser(
    username: string,
    password: string,
    permissions: Partial<Record<PermissionType, boolean>> | number,
    isGrand: boolean = false,
    dbName?: string
  ): ZeroDB | null {
    try {
      const targetDb = dbName || this.currentDb;
      if (!targetDb) {
        EventManager.error('No database selected');
        return null;
      }
      
      if (!this.currentUser) {
        const dbInfo = this.dbManager.getDatabaseInfo(targetDb);
        if (dbInfo && dbInfo.users.size > 0) {
          EventManager.error('Not authenticated');
          return null;
        }
      }
      
      const permBits = typeof permissions === 'number'
        ? permissions
        : PermissionManager.fromObject(permissions);
      this.dbManager.addUser(targetDb, username, password, permBits, isGrand);
      EventManager.info(`User '${username}' added to database '${targetDb}'`, { permissions: permBits, isGrand: isGrand });
      return this;
    } catch (e: any) {
      EventManager.error(`Failed to add user '${username}'`, { error: e.message, dbName: dbName || this.currentDb });
      return null;
    }
  }

  renameDatabase(newName: string): ZeroDB | null {
    try {
      if (!this.currentUser) {
        EventManager.error('Not authenticated');
        return null;
      }
      const pm = new PermissionManager(this.currentUser.permission);
      if (!pm.hasAccess('rename')) {
        EventManager.error('Permission denied: rename');
        return null;
      }
      if (this.dbManager.databaseExists(newName)) {
        EventManager.error(`Database '${newName}' already exists`);
        return null;
      }

      const oldDb = this.currentDb;
      const oldHash = MD5.hash(oldDb);
      const newHash = MD5.hash(newName);

      const oldDir = path.join(this.rootPath, oldHash);
      const newDir = path.join(this.rootPath, newHash);

      if (!fs.existsSync(oldDir)) {
        EventManager.error(`Database directory not found`);
        return null;
      }

      fs.renameSync(oldDir, newDir);
      this.dbManager.renameDatabase(oldDb, newName);
      this.cache.invalidate('registry');
      this.cache.setNameMapping(newHash, newName);
      this.cache.invalidatePattern(oldHash);

      this.currentDb = newName;
      EventManager.info(`Database renamed from '${oldDb}' to '${newName}'`);
      return this;
    } catch (e: any) {
      EventManager.error(`Failed to rename database`, { error: e.message, oldDb: this.currentDb, newName });
      return null;
    }
  }

  renameTable(oldName: string, newName: string): ZeroDB | null {
    try {
      if (!this.currentUser) {
        EventManager.error('Not authenticated');
        return null;
      }
      const pm = new PermissionManager(this.currentUser.permission);
      if (!pm.hasAccess('rename')) {
        EventManager.error('Permission denied: rename');
        return null;
      }
      if (!this.tableManager.tableExists(this.currentDb, oldName)) {
        EventManager.error(`Table '${oldName}' not found`);
        return null;
      }
      if (this.tableManager.tableExists(this.currentDb, newName)) {
        EventManager.error(`Table '${newName}' already exists`);
        return null;
      }

      this.tableManager.renameTable(this.currentDb, oldName, newName);

      const dbHash = MD5.hash(this.currentDb);
      const oldTableHash = MD5.hash(oldName);
      const newTableHash = MD5.hash(newName);

      const dbDir = path.join(this.rootPath, dbHash);
      const oldTableDir = path.join(dbDir, oldTableHash);
      const newTableDir = path.join(dbDir, newTableHash);

      if (fs.existsSync(oldTableDir)) {
        if (!fs.existsSync(newTableDir)) {
          fs.renameSync(oldTableDir, newTableDir);
        }
      }

      this.cache.invalidate('schema');
      this.cache.invalidate('manifest');
      this.cache.setNameMapping(newTableHash, newName);
      EventManager.info(`Table '${oldName}' renamed to '${newName}' in database '${this.currentDb}'`);
      return this;
    } catch (e: any) {
      EventManager.error(`Failed to rename table '${oldName}'`, { error: e.message, tableName: oldName, newName, dbName: this.currentDb });
      return null;
    }
  }

  renameField(tableName: string, oldName: string, newName: string): ZeroDB | null {
    try {
      if (!this.currentUser) {
        EventManager.error('Not authenticated');
        return null;
      }
      const pm = new PermissionManager(this.currentUser.permission);
      if (!pm.hasAccess('rename')) {
        EventManager.error('Permission denied: rename');
        return null;
      }
      if (!this.tableManager.tableExists(this.currentDb, tableName)) {
        EventManager.error(`Table '${tableName}' not found`);
        return null;
      }
      if (!this.tableManager.hasField(this.currentDb, tableName, oldName)) {
        EventManager.error(`Field '${oldName}' not found in table '${tableName}'`);
        return null;
      }

      const tableDef = this.tableManager.getTableDefinition(this.currentDb, tableName);
      const fieldDef = tableDef?.fields.get(oldName);
      if (fieldDef?.type === 'timestamp') {
        EventManager.error(`Field '${oldName}' is a system timestamp and cannot be renamed`);
        return null;
      }

      if (this.tableManager.hasField(this.currentDb, tableName, newName)) {
        EventManager.error(`Field '${newName}' already exists in table '${tableName}'`);
        return null;
      }

      const oldFileName = this.tableManager.getFieldFileName(this.currentDb, tableName, oldName);
      if (!oldFileName) {
        EventManager.error(`Field file not found`);
        return null;
      }

      this.tableManager.renameField(this.currentDb, tableName, oldName, newName, oldFileName);
      this.cache.invalidate('manifest');
      this.cache.setNameMapping(oldFileName, newName);
      EventManager.info(`Field '${oldName}' renamed to '${newName}' in table '${tableName}'`);
      return this;
    } catch (e: any) {
      EventManager.error(`Failed to rename field '${oldName}' in table '${tableName}'`, { error: e.message, tableName, oldName, newName, dbName: this.currentDb });
      return null;
    }
  }

  getCacheStats() {
    return this.cache.getStats();
  }

  async flushAll(): Promise<void> {
    try {
      await this.dataManager.flushAll();
      EventManager.info('All data manager spawns flushed.');
    } catch (e: any) {
      EventManager.error('Failed to flush all data manager spawns', { error: e.message });
    }
  }

  getConnectionPool(): ConnectionPool {
    EventManager.debug('Connection pool requested');
    return this.connectionPool;
  }

  clearCache(): void {
    EventManager.info('Clearing cache and pools.');
    this.cache.clear();
    this.dbManager.invalidate();
    this.tableManager.invalidate();
    this.fieldManager.invalidate();
    this.dataManager.clearPool();
  }

  exit(): void {
    EventManager.info('ZeroDB shutting down');
    this.clearCache();
    process.exit(0);
  }
}
