"use strict";
/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZeroDB = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const database_manager_1 = require("../managers/database-manager");
const table_manager_1 = require("../managers/table-manager");
const field_manager_1 = require("../managers/field-manager");
const data_manager_1 = require("../managers/data-manager");
const permission_manager_1 = require("../managers/permission-manager");
const backup_manager_1 = require("../managers/backup-manager");
const query_builder_1 = require("../query/query-builder");
const cache_manager_1 = require("../utils/cache-manager");
const md5_1 = require("../utils/md5");
const connection_pool_1 = require("../managers/connection-pool");
const validator_1 = require("../utils/validator");
const path_utils_1 = require("../utils/path-utils");
const event_manager_1 = require("../utils/event-manager");
const node_events_1 = require("node:events");
const auto_scaler_1 = require("../engine/auto-scaler");
class SystemAdminAPI {
    constructor(zdb) {
        this.zdb = zdb;
    }
    login(username, password) {
        return this.zdb.loginSystemAdmin(username, password);
    }
    logout() {
        return this.zdb.logoutSystemAdmin();
    }
    get active() {
        return this.zdb.isSystemAdmin();
    }
    get has() {
        return this.zdb.hasSystemAdmin();
    }
    get info() {
        return this.zdb.getSystemAdmin();
    }
    update(username, password) {
        return this.zdb.updateSystemAdminPassword(username, password);
    }
    createAdmin(username, password) {
        return this.zdb.createSystemAdmin(username, password);
    }
}
class ZeroDB extends node_events_1.EventEmitter {
    constructor(rootPath = './databases', cacheMB = 128, options = {}) {
        super();
        this.currentUser = null;
        this.currentSystemAdmin = null;
        this.currentDb = '';
        this.storedCredentials = null;
        this.isNetwork = false;
        this.requestedDb = '';
        this.rootPath = path.resolve(rootPath);
        if (options.overwrite && fs.existsSync(this.rootPath)) {
            fs.rmSync(this.rootPath, { recursive: true, force: true });
            event_manager_1.EventManager.info('Existing database overwritten');
        }
        this.isNetwork = (0, path_utils_1.isNetworkPath)(this.rootPath);
        this.requestedDb = options.database || '';
        this.cache = this.isNetwork ? new cache_manager_1.CacheManager(0) : new cache_manager_1.CacheManager(cacheMB);
        this.dbManager = new database_manager_1.DatabaseManager(this.rootPath, this.cache);
        this.tableManager = new table_manager_1.TableManager(this.rootPath, this.cache);
        this.fieldManager = new field_manager_1.FieldManager(this.rootPath, this.cache);
        this.dataManager = new data_manager_1.DataManager(this.rootPath, this.cache, this.isNetwork);
        this.backupManager = new backup_manager_1.BackupManager(this.rootPath, options.backup || './backup');
        this.connectionPool = new connection_pool_1.ConnectionPool();
        if (options.scaler) {
            auto_scaler_1.autoScaler.updateConfig(options.scaler);
            event_manager_1.EventManager.info('AutoScaler configuration updated', { scaler: options.scaler });
        }
        event_manager_1.EventManager.info('ZeroDB instance initialized', { rootPath, cacheMB, isNetwork: this.isNetwork });
        if (options.database) {
            const dbInfo = this.dbManager.getDatabaseInfo(options.database);
            if (dbInfo && dbInfo.isPublic) {
                this.useDatabase(options.database);
                event_manager_1.EventManager.info(`Auto-connected to public database '${options.database}'`);
            }
        }
        if (options.auth?.user && options.auth?.pass) {
            this.storedCredentials = { username: options.auth.user, password: options.auth.pass };
            if (options.database) {
                try {
                    this.login(options.database, options.auth.user, options.auth.pass);
                    event_manager_1.EventManager.info(`Auto-logged in to database '${options.database}'`);
                }
                catch (e) {
                    event_manager_1.EventManager.warn(`Failed to auto-login to database '${options.database}'`, { error: e.message });
                }
            }
        }
    }
    get systemadmin() {
        return new SystemAdminAPI(this);
    }
    get safe() {
        const z = this;
        return {
            createDatabase: (dbName, options) => (0, validator_1.safe)(() => z.createDatabase(dbName, options)),
            dropDatabase: (dbName) => (0, validator_1.safe)(() => z.dropDatabase(dbName)),
            login: (dbName, user, pass) => (0, validator_1.safe)(() => z.login(dbName, user, pass)),
            useDatabase: (dbName) => (0, validator_1.safe)(() => z.useDatabase(dbName)),
            table: (tableName) => (0, validator_1.safe)(() => z.table(tableName)),
            createTable: (tableName, fields) => (0, validator_1.safe)(() => z.createTable(tableName, fields)),
            dropTable: (tableName) => (0, validator_1.safe)(() => z.dropTable(tableName)),
            flushAll: () => (0, validator_1.safeAsync)(() => z.flushAll()),
            renameDatabase: (newName) => (0, validator_1.safe)(() => z.renameDatabase(newName)),
            renameTable: (oldName, newName) => (0, validator_1.safe)(() => z.renameTable(oldName, newName)),
            renameField: (tableName, oldName, newName) => (0, validator_1.safe)(() => z.renameField(tableName, oldName, newName)),
        };
    }
    createDatabase(dbName, options) {
        try {
            if (this.dbManager.databaseExists(dbName)) {
                event_manager_1.EventManager.error(`Database '${dbName}' already exists`);
                return false;
            }
            const success = this.dbManager.createDatabase(dbName, options);
            if (success) {
                event_manager_1.EventManager.info(`Database '${dbName}' created successfully`, { options });
            }
            return success;
        }
        catch (e) {
            event_manager_1.EventManager.error(`Failed to create database '${dbName}'`, { error: e.message, dbName, options });
            return false;
        }
    }
    dropDatabase(dbName) {
        try {
            if (!this.currentUser) {
                event_manager_1.EventManager.error('Not authenticated');
                return false;
            }
            const permissionManager = new permission_manager_1.PermissionManager(this.currentUser.permission);
            if (!permissionManager.hasAccess('drop')) {
                event_manager_1.EventManager.error('Permission denied: drop');
                return false;
            }
            const dbInfo = this.dbManager.getDatabaseInfo(dbName);
            if (dbInfo && !dbInfo.isPublic && !this.currentUser.isGrand) {
                const isOwner = dbInfo.owner.includes(this.currentUser.username);
                if (!isOwner) {
                    event_manager_1.EventManager.error('Permission denied: You are not the owner of this database');
                    return false;
                }
            }
            this.dataManager.clearPoolForDatabase(dbName);
            const success = this.dbManager.dropDatabase(dbName);
            if (success) {
                event_manager_1.EventManager.info(`Database '${dbName}' dropped successfully`, { dbName });
            }
            return success;
        }
        catch (e) {
            event_manager_1.EventManager.error(`Failed to drop database '${dbName}'`, { error: e.message, dbName });
            return false;
        }
    }
    login(dbName, username, password) {
        try {
            const user = this.dbManager.authenticate(dbName, username, password);
            if (user) {
                this.currentUser = user;
                this.currentDb = dbName;
                this.storedCredentials = { username, password };
                event_manager_1.EventManager.info(`User '${username}' logged in to database '${dbName}'`, { dbName, username });
                return true;
            }
            if (!this.dbManager.databaseExists(dbName)) {
                event_manager_1.EventManager.error(`Database '${dbName}' not found`);
            }
            else {
                event_manager_1.EventManager.error('Invalid credentials');
            }
            return false;
        }
        catch (e) {
            event_manager_1.EventManager.error(`Login failed for database '${dbName}'`, { error: e.message, dbName, username });
            return false;
        }
    }
    useDatabase(dbName) {
        try {
            if (!this.dbManager.databaseExists(dbName)) {
                event_manager_1.EventManager.error(`Database '${dbName}' does not exist`);
                return false;
            }
            const dbInfo = this.dbManager.getDatabaseInfo(dbName);
            if (!dbInfo) {
                event_manager_1.EventManager.error(`Could not retrieve information for database '${dbName}'`);
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
                    event_manager_1.EventManager.info(`Switched to public database '${dbName}' as guest user`);
                }
                else {
                    event_manager_1.EventManager.info(`Switched to public database '${dbName}'`, { currentUser: this.currentUser.username });
                }
                return true;
            }
            if (!this.currentUser) {
                event_manager_1.EventManager.error('Not authenticated. Please login first.');
                return false;
            }
            const userAccess = dbInfo.users.get(this.currentUser?.username ?? '');
            if (!userAccess && !this.currentUser.isGrand) {
                event_manager_1.EventManager.error(`Access denied: User '${this.currentUser?.username}' does not have access to database '${dbName}'`);
                return false;
            }
            this.currentDb = dbName;
            event_manager_1.EventManager.info(`Switched to database '${dbName}'`, { user: this.currentUser.username });
            return true;
        }
        catch (e) {
            event_manager_1.EventManager.error(`Failed to switch to database '${dbName}'`, { error: e.message, dbName });
            return false;
        }
    }
    logout() {
        const username = this.currentUser?.username;
        const dbName = this.currentDb;
        this.currentUser = null;
        this.currentDb = '';
        event_manager_1.EventManager.info('User logged out', { username, dbName });
    }
    isAuthenticated() {
        return this.currentUser !== null && this.currentUser.username !== 'guest';
    }
    table(tableName) {
        try {
            if (!this.currentDb) {
                const dbs = this.dbManager.listDatabases();
                if (dbs.length === 0) {
                    const dbName = this.requestedDb || this.currentDb;
                    event_manager_1.EventManager.error(dbName ? `Database '${dbName}' not found` : 'No database found');
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
                event_manager_1.EventManager.error('No database selected');
                return null;
            }
            if (!this.currentUser) {
                event_manager_1.EventManager.error('Not authenticated');
                return null;
            }
            if (!this.tableManager.tableExists(this.currentDb, tableName)) {
                event_manager_1.EventManager.error(`Table '${tableName}' not found`);
                return null;
            }
            const permissionManager = new permission_manager_1.PermissionManager(this.currentUser.permission);
            const qb = new query_builder_1.QueryBuilder(this.currentDb, tableName, this.dataManager, this.fieldManager, this.tableManager, permissionManager, this.backupManager);
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
        }
        catch (e) {
            event_manager_1.EventManager.error(`Failed to access table '${tableName}'`, { error: e.message, dbName: this.currentDb });
            return null;
        }
    }
    createTable(tableName, fields) {
        try {
            if (!this.currentDb) {
                const dbs = this.dbManager.listDatabases();
                if (dbs.length === 0) {
                    const dbName = this.requestedDb || this.currentDb;
                    event_manager_1.EventManager.error(dbName ? `Database '${dbName}' not found` : 'No database found');
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
                event_manager_1.EventManager.error('No database selected');
                return null;
            }
            if (!this.currentUser) {
                event_manager_1.EventManager.error('Not authenticated');
                return null;
            }
            const pm = new permission_manager_1.PermissionManager(this.currentUser.permission);
            if (!pm.hasAccess('create')) {
                event_manager_1.EventManager.error('Permission denied: create');
                return null;
            }
            if (this.tableManager.tableExists(this.currentDb, tableName)) {
                event_manager_1.EventManager.error(`Table '${tableName}' already exists`);
                return null;
            }
            this.tableManager.createTable(this.currentDb, tableName);
            if (fields && Array.isArray(fields)) {
                for (const field of fields) {
                    if (this.tableManager.hasField(this.currentDb, tableName, field.name)) {
                        event_manager_1.EventManager.error(`Field '${field.name}' already exists in table '${tableName}'`);
                    }
                    this.tableManager.addField(this.currentDb, tableName, field.name, field.type, field.option);
                }
            }
            event_manager_1.EventManager.info(`Table '${tableName}' created successfully in database '${this.currentDb}'`, { fields });
            return this.table(tableName);
        }
        catch (e) {
            event_manager_1.EventManager.error(`Failed to create table '${tableName}'`, { error: e.message, dbName: this.currentDb });
            return null;
        }
    }
    dropTable(tableName) {
        try {
            if (!this.currentUser) {
                event_manager_1.EventManager.error('Not authenticated');
                return false;
            }
            const pm = new permission_manager_1.PermissionManager(this.currentUser.permission);
            if (!pm.hasAccess('drop')) {
                event_manager_1.EventManager.error('Permission denied: drop');
                return false;
            }
            this.dataManager.clearPoolForTable(this.currentDb, tableName);
            const success = this.tableManager.dropTable(this.currentDb, tableName);
            if (success) {
                event_manager_1.EventManager.info(`Table '${tableName}' dropped successfully from database '${this.currentDb}'`);
            }
            return success;
        }
        catch (e) {
            event_manager_1.EventManager.error(`Failed to drop table '${tableName}'`, { error: e.message, dbName: this.currentDb });
            return false;
        }
    }
    getTables(dbName) {
        try {
            const targetDb = dbName || this.currentDb;
            if (targetDb) {
                const dbInfo = this.dbManager.getDatabaseInfo(targetDb);
                if (dbInfo && dbInfo.isPublic) {
                    return this.tableManager.getTableList(targetDb);
                }
            }
            if (!this.currentUser) {
                event_manager_1.EventManager.error('Not authenticated');
            }
            return this.tableManager.getTableList(this.currentDb);
        }
        catch (e) {
            event_manager_1.EventManager.error(`Failed to list tables`, { error: e.message, dbName: dbName || this.currentDb });
            return [];
        }
    }
    getDatabaseInfo(dbName) {
        try {
            return this.dbManager.getDatabaseInfo(dbName);
        }
        catch (e) {
            event_manager_1.EventManager.error(`Failed to get database info for '${dbName}'`, { error: e.message });
            return null;
        }
    }
    listDatabases() {
        try {
            return this.dbManager.listDatabases();
        }
        catch (e) {
            event_manager_1.EventManager.error(`Failed to list databases`, { error: e.message });
            return [];
        }
    }
    async addOwner(dbName, username) {
        try {
            const success = await this.dbManager.addOwner(dbName, username);
            if (success) {
                event_manager_1.EventManager.info(`Owner '${username}' added to database '${dbName}'`);
            }
            return success;
        }
        catch (e) {
            event_manager_1.EventManager.error(`Failed to add owner '${username}' to database '${dbName}'`, { error: e.message });
            return false;
        }
    }
    async removeOwner(dbName, username) {
        try {
            const success = await this.dbManager.removeOwner(dbName, username);
            if (success) {
                event_manager_1.EventManager.info(`Owner '${username}' removed from database '${dbName}'`);
            }
            return success;
        }
        catch (e) {
            event_manager_1.EventManager.error(`Failed to remove owner '${username}' from database '${dbName}'`, { error: e.message });
            return false;
        }
    }
    async setPublic(dbName, isPublic) {
        try {
            const success = await this.dbManager.setPublic(dbName, isPublic);
            if (success) {
                event_manager_1.EventManager.info(`Database '${dbName}' set to public: ${isPublic}`);
            }
            return success;
        }
        catch (e) {
            event_manager_1.EventManager.error(`Failed to set public status for database '${dbName}'`, { error: e.message, isPublic });
            return false;
        }
    }
    listUsers(dbName) {
        try {
            const targetDb = dbName || null;
            if (!this.currentUser || !this.currentUser.isGrand) {
                event_manager_1.EventManager.error('Permission denied: Only grand users can list users');
                return [];
            }
            if (targetDb) {
                return this.dbManager.listUsers(targetDb);
            }
            else {
                return this.dbManager.listUsers(null);
            }
        }
        catch (e) {
            event_manager_1.EventManager.error(`Failed to list users`, { error: e.message, dbName: dbName || this.currentDb });
            return [];
        }
    }
    addUser(username, password, permissions, isGrand = false, status = true) {
        try {
            if (!this.currentUser) {
                const allUsers = this.dbManager.listUsers(null);
                if (allUsers.length > 0 && !this.dbManager.hasSystemAdmin()) {
                    event_manager_1.EventManager.error('Not authenticated');
                    return null;
                }
            }
            let permBits;
            if (typeof permissions === 'number') {
                permBits = permissions;
            }
            else if (Array.isArray(permissions)) {
                permBits = permission_manager_1.PermissionManager.fromArray(permissions);
            }
            else {
                permBits = permission_manager_1.PermissionManager.fromObject(permissions);
            }
            if (!this.dbManager.addUser(username, password, permBits, isGrand, status)) {
                event_manager_1.EventManager.error(`User '${username}' already exists`);
                return null;
            }
            event_manager_1.EventManager.info(`User '${username}' added globally`, { permissions: permBits, isGrand: isGrand, status });
            return this;
        }
        catch (e) {
            event_manager_1.EventManager.error(`Failed to add user '${username}'`, { error: e.message });
            return null;
        }
    }
    updateUser(username, password, permissions, isGrand, status) {
        try {
            if (!this.currentUser) {
                event_manager_1.EventManager.error('Not authenticated');
                return null;
            }
            let permBits;
            if (permissions !== undefined) {
                if (typeof permissions === 'number') {
                    permBits = permissions;
                }
                else if (Array.isArray(permissions)) {
                    permBits = permission_manager_1.PermissionManager.fromArray(permissions);
                }
                else {
                    permBits = permission_manager_1.PermissionManager.fromObject(permissions);
                }
            }
            if (!this.dbManager.updateUser(username, password, permBits, isGrand, status)) {
                event_manager_1.EventManager.error(`Failed to update user '${username}'`);
                return null;
            }
            event_manager_1.EventManager.info(`User '${username}' updated globally`);
            return this;
        }
        catch (e) {
            event_manager_1.EventManager.error(`Failed to update user '${username}'`, { error: e.message });
            return null;
        }
    }
    deleteUser(username, dbName) {
        try {
            const targetDb = dbName || null;
            if (!this.currentUser) {
                event_manager_1.EventManager.error('Not authenticated');
                return null;
            }
            // Security check: Only grand users can delete other users.
            // Users can always delete themselves.
            if (!this.currentUser.isGrand && this.currentUser.username !== username) {
                event_manager_1.EventManager.error(`Permission denied: User '${this.currentUser.username}' cannot delete user '${username}'`);
                return null;
            }
            const success = this.dbManager.deleteUser(targetDb, username);
            if (success) {
                if (targetDb) {
                    event_manager_1.EventManager.info(`User '${username}' deleted from database '${targetDb}'`);
                }
                else {
                    event_manager_1.EventManager.info(`User '${username}' deleted globally`);
                }
                // If we deleted the current user, log them out
                if (this.currentUser && this.currentUser.username === username && (!targetDb || targetDb === this.currentDb)) {
                    this.logout();
                    event_manager_1.EventManager.info(`Current user '${username}' logged out after deletion`);
                }
                return this;
            }
            else {
                if (targetDb) {
                    event_manager_1.EventManager.error(`User '${username}' not found in database '${targetDb}'`, { dbName: targetDb });
                }
                else {
                    event_manager_1.EventManager.error(`User '${username}' not found globally`);
                }
                return null;
            }
        }
        catch (e) {
            event_manager_1.EventManager.error(`Failed to delete user '${username}'`, { error: e.message, dbName: dbName || this.currentDb });
            return null;
        }
    }
    renameDatabase(newName) {
        try {
            if (!this.currentUser) {
                event_manager_1.EventManager.error('Not authenticated');
                return null;
            }
            const pm = new permission_manager_1.PermissionManager(this.currentUser.permission);
            if (!pm.hasAccess('rename')) {
                event_manager_1.EventManager.error('Permission denied: rename');
                return null;
            }
            if (this.dbManager.databaseExists(newName)) {
                event_manager_1.EventManager.error(`Database '${newName}' already exists`);
                return null;
            }
            const oldDb = this.currentDb;
            const oldHash = md5_1.MD5.hash(oldDb);
            const newHash = md5_1.MD5.hash(newName);
            const oldDir = path.join(this.rootPath, oldHash);
            const newDir = path.join(this.rootPath, newHash);
            if (!fs.existsSync(oldDir)) {
                event_manager_1.EventManager.error(`Database directory not found`);
                return null;
            }
            fs.renameSync(oldDir, newDir);
            this.dbManager.renameDatabase(oldDb, newName);
            this.cache.invalidate('registry');
            this.cache.setNameMapping(newHash, newName);
            this.cache.invalidatePattern(oldHash);
            this.currentDb = newName;
            event_manager_1.EventManager.info(`Database renamed from '${oldDb}' to '${newName}'`);
            return this;
        }
        catch (e) {
            event_manager_1.EventManager.error(`Failed to rename database`, { error: e.message, oldDb: this.currentDb, newName });
            return null;
        }
    }
    renameTable(oldName, newName) {
        try {
            if (!this.currentUser) {
                event_manager_1.EventManager.error('Not authenticated');
                return null;
            }
            const pm = new permission_manager_1.PermissionManager(this.currentUser.permission);
            if (!pm.hasAccess('rename')) {
                event_manager_1.EventManager.error('Permission denied: rename');
                return null;
            }
            if (!this.tableManager.tableExists(this.currentDb, oldName)) {
                event_manager_1.EventManager.error(`Table '${oldName}' not found`);
                return null;
            }
            if (this.tableManager.tableExists(this.currentDb, newName)) {
                event_manager_1.EventManager.error(`Table '${newName}' already exists`);
                return null;
            }
            this.tableManager.renameTable(this.currentDb, oldName, newName);
            const dbHash = md5_1.MD5.hash(this.currentDb);
            const oldTableHash = md5_1.MD5.hash(oldName);
            const newTableHash = md5_1.MD5.hash(newName);
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
            event_manager_1.EventManager.info(`Table '${oldName}' renamed to '${newName}' in database '${this.currentDb}'`);
            return this;
        }
        catch (e) {
            event_manager_1.EventManager.error(`Failed to rename table '${oldName}'`, { error: e.message, tableName: oldName, newName, dbName: this.currentDb });
            return null;
        }
    }
    renameField(tableName, oldName, newName) {
        try {
            if (!this.currentUser) {
                event_manager_1.EventManager.error('Not authenticated');
                return null;
            }
            const pm = new permission_manager_1.PermissionManager(this.currentUser.permission);
            if (!pm.hasAccess('rename')) {
                event_manager_1.EventManager.error('Permission denied: rename');
                return null;
            }
            if (!this.tableManager.tableExists(this.currentDb, tableName)) {
                event_manager_1.EventManager.error(`Table '${tableName}' not found`);
                return null;
            }
            if (!this.tableManager.hasField(this.currentDb, tableName, oldName)) {
                event_manager_1.EventManager.error(`Field '${oldName}' not found in table '${tableName}'`);
                return null;
            }
            const tableDef = this.tableManager.getTableDefinition(this.currentDb, tableName);
            const fieldDef = tableDef?.fields.get(oldName);
            if (fieldDef?.type === 'timestamp') {
                event_manager_1.EventManager.error(`Field '${oldName}' is a system timestamp and cannot be renamed`);
                return null;
            }
            if (this.tableManager.hasField(this.currentDb, tableName, newName)) {
                event_manager_1.EventManager.error(`Field '${newName}' already exists in table '${tableName}'`);
                return null;
            }
            const oldFileName = this.tableManager.getFieldFileName(this.currentDb, tableName, oldName);
            if (!oldFileName) {
                event_manager_1.EventManager.error(`Field file not found`);
                return null;
            }
            this.tableManager.renameField(this.currentDb, tableName, oldName, newName, oldFileName);
            this.cache.invalidate('manifest');
            this.cache.setNameMapping(oldFileName, newName);
            event_manager_1.EventManager.info(`Field '${oldName}' renamed to '${newName}' in table '${tableName}'`);
            return this;
        }
        catch (e) {
            event_manager_1.EventManager.error(`Failed to rename field '${oldName}' in table '${tableName}'`, { error: e.message, tableName, oldName, newName, dbName: this.currentDb });
            return null;
        }
    }
    getCacheStats() {
        return this.cache.getStats();
    }
    async flushAll() {
        try {
            await this.dataManager.flushAll();
            event_manager_1.EventManager.info('All data manager spawns flushed.');
        }
        catch (e) {
            event_manager_1.EventManager.error('Failed to flush all data manager spawns', { error: e.message });
        }
    }
    getConnectionPool() {
        event_manager_1.EventManager.debug('Connection pool requested');
        return this.connectionPool;
    }
    clearCache() {
        event_manager_1.EventManager.info('Clearing cache and pools.');
        this.cache.clear();
        this.dbManager.invalidate();
        this.tableManager.invalidate();
        this.fieldManager.invalidate();
        this.dataManager.clearPool();
    }
    exit() {
        event_manager_1.EventManager.info('ZeroDB shutting down');
        this.clearCache();
        process.exit(0);
    }
    async backup(fileName) {
        return await this.backupManager.createFullBackup(fileName);
    }
    async restore(fileName) {
        return await this.backupManager.restoreFullBackup(fileName);
    }
    hasSystemAdmin() {
        return this.dbManager.hasSystemAdmin();
    }
    getSystemAdmin() {
        return this.dbManager.getSystemAdmin();
    }
    createSystemAdmin(username, password) {
        return this.dbManager.createSystemAdmin(username, password);
    }
    loginSystemAdmin(username, password) {
        const admin = this.dbManager.authenticateSystemAdmin(username, password);
        if (admin) {
            this.currentSystemAdmin = admin;
            this.currentUser = {
                username: admin.username,
                password: admin.password,
                permission: 127,
                isGrand: true,
                status: true
            };
            event_manager_1.EventManager.info(`System admin '${username}' logged in with grand privileges`);
            return true;
        }
        event_manager_1.EventManager.error('Invalid system admin credentials');
        return false;
    }
    logoutSystemAdmin() {
        const username = this.currentSystemAdmin?.username;
        this.currentSystemAdmin = null;
        if (this.currentUser?.isGrand && this.currentUser.username === username) {
            this.currentUser = null;
        }
        event_manager_1.EventManager.info(`System admin '${username}' logged out`);
    }
    isSystemAdmin() {
        return this.currentSystemAdmin !== null;
    }
    updateSystemAdminPassword(newUsername, newPassword) {
        if (!this.currentSystemAdmin) {
            event_manager_1.EventManager.error('Not authenticated as system admin');
            return false;
        }
        return this.dbManager.updateSystemAdmin(newUsername, newPassword);
    }
}
exports.ZeroDB = ZeroDB;
//# sourceMappingURL=zero-db.js.map