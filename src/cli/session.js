"use strict";
/**
 * Zero-DB CLI — session state.
 *
 * Wraps one ZeroDB engine instance and keeps the CLI-facing state: the open
 * root folder, the selected database and the signed-in account.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.session = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const zero_db_1 = require("../core/zero-db");
const auto_scaler_1 = require("../engine/auto-scaler");
const table_manager_1 = require("../managers/table-manager");
const cache_manager_1 = require("../utils/cache-manager");
const event_manager_1 = require("../utils/event-manager");
const md5_1 = require("../utils/md5");
const errors_1 = require("./errors");
const config_1 = require("./config");
const SYSTEM_FIELDS = new Set(['created_at', 'updated_at']);
function isFailure(value) {
    return value === false || value === null || value === undefined;
}
class SessionManager {
    constructor() {
        this.engine = null;
        this.schemaManager = null;
        this.rootPath = '';
        this.user = '';
        this.database = '';
        this.loggedIn = false;
        this.systemAdmin = false;
        this.errors = [];
        // EventManager emits both 'log' and a level-specific event. Without an
        // 'error' listener Node throws "Unhandled error" for every engine failure.
        event_manager_1.EventManager.on('error', () => { });
        // The engine reports failures through EventManager; keep the last ones so
        // a `false`/`null` return can become a useful one-line CLI error.
        event_manager_1.EventManager.on('log', (entry) => {
            if (entry.level === 'error' && typeof entry.message === 'string') {
                this.errors.push(entry.message);
            }
        });
    }
    get info() {
        return {
            rootPath: this.rootPath,
            user: this.user,
            database: this.database,
            loggedIn: this.loggedIn,
            systemAdmin: this.systemAdmin,
        };
    }
    get isOpen() {
        return this.engine !== null;
    }
    get db() {
        if (!this.engine) {
            throw new errors_1.CliError('No database root is open. Use `connect <path>` first.');
        }
        return this.engine;
    }
    get schema() {
        if (!this.schemaManager) {
            throw new errors_1.CliError('No database root is open. Use `connect <path>` first.');
        }
        return this.schemaManager;
    }
    clearErrors() {
        this.errors = [];
    }
    /** Errors collected since the last operation, without clearing them. */
    lastErrors() {
        return [...this.errors];
    }
    /** Open the configured root folder if no engine is loaded. */
    async ensureOpen() {
        if (this.engine)
            return;
        const config = (0, config_1.readStoredConfig)();
        await this.open((0, config_1.resolveRootPath)(config.rootPath), false);
    }
    /** Open a database root folder (the directory holding registry.zdb). */
    async open(rootPath, remember = true) {
        const resolved = node_path_1.default.resolve(rootPath);
        if (node_fs_1.default.existsSync(resolved)) {
            let stat;
            try {
                stat = node_fs_1.default.statSync(resolved);
            }
            catch (error) {
                throw new errors_1.CliError(`Cannot read '${resolved}': ${(0, errors_1.errorMessage)(error)}`);
            }
            if (!stat.isDirectory()) {
                throw new errors_1.CliError(`'${resolved}' is not a folder.`);
            }
        }
        else {
            node_fs_1.default.mkdirSync(resolved, { recursive: true });
        }
        await this.dispose();
        const config = (0, config_1.readStoredConfig)();
        this.engine = new zero_db_1.ZeroDB(resolved, config.cacheMB ?? 128, {
            backup: (0, config_1.backupDir)(resolved),
        });
        this.schemaManager = new table_manager_1.TableManager(resolved, new cache_manager_1.CacheManager(0));
        this.rootPath = resolved;
        this.resetSessionState();
        if (remember) {
            (0, config_1.writeStoredConfig)({ ...config, rootPath: resolved });
        }
        // Re-select the database used last time when it still exists.
        const lastDatabase = config.lastDatabase;
        // Scripts can provide credentials without storing a password on disk.
        const envUser = process.env.ZERODB_USER?.trim();
        const envPassword = process.env.ZERODB_PASSWORD;
        if (envUser && envPassword !== undefined) {
            const candidates = lastDatabase
                ? [lastDatabase]
                : this.listDatabases().filter((name) => this.databaseExists(name));
            const target = candidates.length === 1 ? candidates[0] : undefined;
            if (target) {
                this.clearErrors();
                if (this.engine.login(target, envUser, envPassword)) {
                    this.user = envUser;
                    this.database = target;
                    this.loggedIn = true;
                }
                this.clearErrors();
            }
        }
        if (lastDatabase && this.database !== lastDatabase && this.databaseExists(lastDatabase)) {
            this.clearErrors();
            if (this.engine.useDatabase(lastDatabase)) {
                this.database = lastDatabase;
                const info = this.engine.getDatabaseInfo(lastDatabase);
                if (info?.isPublic && !this.loggedIn) {
                    this.user = 'guest';
                }
            }
            this.clearErrors();
        }
    }
    /** Flush pending writes and release the engine. */
    async dispose() {
        if (this.engine) {
            try {
                await this.engine.clear();
            }
            catch {
                // Shutdown must not mask the command result.
            }
        }
        // The engine's InsertEngine starts a global metrics interval which is not
        // owned by the ZeroDB instance. Stop it so the process can exit cleanly.
        auto_scaler_1.autoScaler.stop();
        this.engine = null;
        this.schemaManager = null;
        this.rootPath = '';
        this.resetSessionState();
    }
    resetSessionState() {
        this.user = '';
        this.database = '';
        this.loggedIn = false;
        this.systemAdmin = false;
        this.errors = [];
    }
    /**
     * Run an engine call that signals failure with false/null/undefined and turn
     * the collected EventManager errors into a CliError.
     */
    async attempt(label, fn, failed = isFailure) {
        this.clearErrors();
        let result;
        try {
            result = await fn();
        }
        catch (error) {
            throw new errors_1.CliError((0, errors_1.errorMessage)(error));
        }
        if (failed(result)) {
            const detail = this.errors.join(' · ');
            this.clearErrors();
            throw new errors_1.CliError(detail || label);
        }
        return result;
    }
    /** Throw when the engine logged an error during the last operation. */
    assertClean(label) {
        if (this.errors.length === 0)
            return;
        const detail = this.errors.join(' · ');
        this.clearErrors();
        throw new errors_1.CliError(detail || label);
    }
    listDatabases() {
        try {
            return [...this.db.listDatabases()].sort((a, b) => a.localeCompare(b));
        }
        catch {
            return [];
        }
    }
    databaseExists(name) {
        try {
            return this.db.listDatabases().includes(name);
        }
        catch {
            return false;
        }
    }
    getDatabaseInfo(name) {
        try {
            return this.db.getDatabaseInfo(name);
        }
        catch {
            return null;
        }
    }
    listTables(dbName) {
        try {
            return this.db.getTables(dbName || this.database || undefined);
        }
        catch {
            return [];
        }
    }
    hasDatabase() {
        return this.database !== '';
    }
    requireDatabase() {
        if (!this.database) {
            throw new errors_1.CliError('No database selected. Use `use <database>` first.');
        }
        return this.database;
    }
    /** Switch database and remember it for the next run. */
    selectDatabase(name) {
        this.clearErrors();
        const selected = this.db.useDatabase(name);
        if (!selected) {
            const detail = this.errors.join(' · ');
            this.clearErrors();
            throw new errors_1.CliError(detail || `Database '${name}' could not be selected.`);
        }
        this.database = name;
        const info = this.getDatabaseInfo(name);
        if (!this.loggedIn)
            this.user = info?.isPublic ? 'guest' : '';
        (0, config_1.writeStoredConfig)({ ...(0, config_1.readStoredConfig)(), lastDatabase: name });
        this.clearErrors();
    }
    /** Sign in to a database. */
    login(dbName, username, password) {
        this.clearErrors();
        const success = this.db.login(dbName, username, password);
        if (!success) {
            const detail = this.errors.join(' · ');
            this.clearErrors();
            throw new errors_1.CliError(detail || 'Invalid credentials.');
        }
        this.user = username;
        this.database = dbName;
        this.loggedIn = true;
        this.systemAdmin = false;
        (0, config_1.writeStoredConfig)({
            ...(0, config_1.readStoredConfig)(),
            lastDatabase: dbName,
            lastUser: username,
        });
        this.clearErrors();
    }
    /** Sign in as the system-wide administrator. */
    loginAdmin(username, password) {
        this.clearErrors();
        if (!this.db.systemadmin.has) {
            throw new errors_1.CliError('No SystemAdmin exists in this database root.');
        }
        const success = this.db.systemadmin.login(username, password);
        if (!success) {
            const detail = this.errors.join(' · ');
            this.clearErrors();
            throw new errors_1.CliError(detail || 'Invalid SystemAdmin credentials.');
        }
        this.user = username;
        this.loggedIn = true;
        this.systemAdmin = true;
        (0, config_1.writeStoredConfig)({ ...(0, config_1.readStoredConfig)(), lastUser: username });
        this.clearErrors();
    }
    logout() {
        if (this.engine) {
            if (this.systemAdmin)
                this.engine.systemadmin.logout();
            this.engine.logout();
        }
        this.user = '';
        this.database = '';
        this.loggedIn = false;
        this.systemAdmin = false;
        this.clearErrors();
    }
    /** Reset what the engine already logged out for us (self-delete). */
    syncAfterUserDeleted(username) {
        if (this.user !== username)
            return;
        this.user = '';
        this.database = '';
        this.loggedIn = false;
        this.systemAdmin = false;
    }
    /** After dropping the selected database, pick another one or log out. */
    afterDatabaseDropped(name) {
        const config = (0, config_1.readStoredConfig)();
        if (config.lastDatabase === name) {
            (0, config_1.writeStoredConfig)({ ...config, lastDatabase: undefined });
        }
        if (this.database !== name)
            return;
        this.database = '';
        const remaining = this.listDatabases();
        if (remaining.length > 0) {
            try {
                this.selectDatabase(remaining[0]);
                return;
            }
            catch {
                // Fall through to a clean logout.
            }
        }
        this.logout();
    }
    createDatabase(name, options = {}) {
        this.clearErrors();
        const created = this.db.createDatabase(name, options);
        if (!created) {
            const detail = this.errors.join(' · ');
            this.clearErrors();
            throw new errors_1.CliError(detail || `Database '${name}' could not be created.`);
        }
        this.clearErrors();
    }
    async dropDatabase(name) {
        const dropped = await this.attempt(`Database '${name}' could not be dropped.`, () => this.db.dropDatabase(name));
        if (dropped)
            this.afterDatabaseDropped(name);
    }
    renameDatabase(newName) {
        this.requireDatabase();
        const result = this.db.renameDatabase(newName);
        if (!result) {
            const detail = this.errors.join(' · ');
            this.clearErrors();
            throw new errors_1.CliError(detail || `Database could not be renamed to '${newName}'.`);
        }
        this.database = newName;
        (0, config_1.writeStoredConfig)({ ...(0, config_1.readStoredConfig)(), lastDatabase: newName });
        this.clearErrors();
    }
    async setPublic(name, isPublic) {
        await this.attempt(`Database '${name}' could not be updated.`, () => this.db.setPublic(name, isPublic));
    }
    async createTable(name, fields) {
        await this.attempt(`Table '${name}' could not be created.`, () => this.db.createTable(name, fields));
    }
    async dropTable(name) {
        await this.attempt(`Table '${name}' could not be dropped.`, () => this.db.dropTable(name));
    }
    renameTable(oldName, newName) {
        const result = this.db.renameTable(oldName, newName);
        if (!result) {
            const detail = this.errors.join(' · ');
            this.clearErrors();
            throw new errors_1.CliError(detail || `Table '${oldName}' could not be renamed.`);
        }
        this.clearErrors();
    }
    /** Read field definitions through a read-only manifest reader. */
    describeTable(tableName) {
        const dbName = this.requireDatabase();
        this.schema.invalidate();
        const definition = this.schema.getTableDefinition(dbName, tableName);
        if (!definition) {
            throw new errors_1.CliError(`Table '${tableName}' not found in database '${dbName}'.`);
        }
        return [...definition.fields.values()];
    }
    isSystemField(name) {
        return SYSTEM_FIELDS.has(name);
    }
    /**
     * Store booleans as the engine does (`1`/`0`), so `--where active=true`
     * matches rows and `update ... active=false` writes a comparable value.
     */
    normalizeValues(tableName, values) {
        if (Object.keys(values).length === 0)
            return values;
        let types;
        try {
            types = new Map(this.describeTable(tableName).map((field) => [field.name, field.type]));
        }
        catch {
            return values;
        }
        const out = {};
        for (const [key, value] of Object.entries(values)) {
            if (types.get(key) !== 'boolean') {
                out[key] = value;
                continue;
            }
            const normal = value.trim().toLowerCase();
            if (['true', '1', 'yes', 'on'].includes(normal))
                out[key] = '1';
            else if (['false', '0', 'no', 'off'].includes(normal))
                out[key] = '0';
            else
                out[key] = value;
        }
        return out;
    }
    async tableCount(tableName) {
        this.clearErrors();
        const table = this.db.table(tableName);
        if (!table) {
            const detail = this.errors.join(' · ');
            this.clearErrors();
            throw new errors_1.CliError(detail || `Table '${tableName}' not found.`);
        }
        const count = await table.count();
        this.assertClean(`Could not count table '${tableName}'.`);
        return count;
    }
    async find(tableName, options = {}) {
        this.clearErrors();
        const table = this.db.table(tableName);
        if (!table) {
            const detail = this.errors.join(' · ');
            this.clearErrors();
            throw new errors_1.CliError(detail || `Table '${tableName}' not found.`);
        }
        table.select(options.select && options.select.length > 0 ? options.select : '*');
        if (options.where && Object.keys(options.where).length > 0) {
            table.where(this.normalizeValues(tableName, options.where));
        }
        for (const [field, pattern] of Object.entries(options.like ?? {})) {
            table.like(field, pattern);
        }
        if (options.order)
            table.orderBy(options.order, options.desc ? 'desc' : 'asc');
        if (options.limit !== undefined && options.limit > 0)
            table.limit(options.limit);
        if (options.page !== undefined && options.page > 0)
            table.page(options.page);
        const rows = await table.list();
        this.assertClean(`Query on '${tableName}' failed.`);
        return rows;
    }
    async countWhere(tableName, where) {
        this.clearErrors();
        const table = this.db.table(tableName);
        if (!table) {
            const detail = this.errors.join(' · ');
            this.clearErrors();
            throw new errors_1.CliError(detail || `Table '${tableName}' not found.`);
        }
        if (Object.keys(where).length > 0) {
            table.where(this.normalizeValues(tableName, where));
        }
        const count = await table.count();
        this.assertClean(`Count on '${tableName}' failed.`);
        return count;
    }
    async addRecord(tableName, data) {
        this.clearErrors();
        const table = this.db.table(tableName);
        if (!table) {
            const detail = this.errors.join(' · ');
            this.clearErrors();
            throw new errors_1.CliError(detail || `Table '${tableName}' not found.`);
        }
        const line = await table.add(data);
        this.assertClean(`Could not add the record to '${tableName}'.`);
        if (line <= 0) {
            throw new errors_1.CliError(`Could not add the record to '${tableName}'.`);
        }
        return line;
    }
    async updateRecords(tableName, where, data) {
        this.clearErrors();
        const table = this.db.table(tableName);
        if (!table) {
            const detail = this.errors.join(' · ');
            this.clearErrors();
            throw new errors_1.CliError(detail || `Table '${tableName}' not found.`);
        }
        const count = await table
            .where(this.normalizeValues(tableName, where))
            .update(this.normalizeValues(tableName, data));
        this.assertClean(`Could not update records in '${tableName}'.`);
        return count;
    }
    async deleteRecords(tableName, where) {
        this.clearErrors();
        const table = this.db.table(tableName);
        if (!table) {
            const detail = this.errors.join(' · ');
            this.clearErrors();
            throw new errors_1.CliError(detail || `Table '${tableName}' not found.`);
        }
        const count = await table
            .where(this.normalizeValues(tableName, where))
            .delete();
        this.assertClean(`Could not delete records from '${tableName}'.`);
        return count;
    }
    async addField(tableName, field) {
        const table = this.db.table(tableName);
        if (!table) {
            const detail = this.errors.join(' · ');
            this.clearErrors();
            throw new errors_1.CliError(detail || `Table '${tableName}' not found.`);
        }
        const committed = await table
            .modify()
            .addField(field.name, field.type, field.option ?? {})
            .commit();
        if (!committed) {
            const detail = this.errors.join(' · ');
            this.clearErrors();
            throw new errors_1.CliError(detail || `Field '${field.name}' could not be added.`);
        }
        this.clearErrors();
    }
    async dropField(tableName, fieldName) {
        const table = this.db.table(tableName);
        if (!table) {
            const detail = this.errors.join(' · ');
            this.clearErrors();
            throw new errors_1.CliError(detail || `Table '${tableName}' not found.`);
        }
        const committed = await table.modify().dropField(fieldName).commit();
        if (!committed) {
            const detail = this.errors.join(' · ');
            this.clearErrors();
            throw new errors_1.CliError(detail || `Field '${fieldName}' could not be dropped.`);
        }
        this.clearErrors();
    }
    async modifyField(tableName, fieldName, type, options) {
        const table = this.db.table(tableName);
        if (!table) {
            const detail = this.errors.join(' · ');
            this.clearErrors();
            throw new errors_1.CliError(detail || `Table '${tableName}' not found.`);
        }
        const committed = await table.modify().modifyField(fieldName, type, options).commit();
        if (!committed) {
            const detail = this.errors.join(' · ');
            this.clearErrors();
            throw new errors_1.CliError(detail || `Field '${fieldName}' could not be modified.`);
        }
        this.clearErrors();
    }
    renameField(tableName, oldName, newName) {
        const result = this.db.renameField(tableName, oldName, newName);
        if (!result) {
            const detail = this.errors.join(' · ');
            this.clearErrors();
            throw new errors_1.CliError(detail || `Field '${oldName}' could not be renamed.`);
        }
        this.clearErrors();
    }
    /** Users of one database (owners included). */
    listDatabaseUsers(dbName) {
        const info = this.getDatabaseInfo(dbName);
        if (!info)
            throw new errors_1.CliError(`Database '${dbName}' not found.`);
        const owners = new Set(info.owner);
        const names = new Set([...info.users.keys(), ...info.owner]);
        const rows = [];
        for (const name of names) {
            const user = info.users.get(name);
            rows.push({
                username: name,
                role: owners.has(name) ? 'owner' : 'member',
                permission: user?.permission ?? -1,
                grand: user?.isGrand ?? false,
                status: user?.status ?? null,
            });
        }
        return rows.sort((a, b) => a.username.localeCompare(b.username));
    }
    /** Global users; ZeroDB requires grand/system-admin privileges. */
    listGlobalUsers() {
        this.clearErrors();
        const users = this.db.listUsers();
        this.assertClean('Permission denied: only a grand or SystemAdmin user can list global users.');
        return [...users].sort((a, b) => a.localeCompare(b));
    }
    async addUser(username, password, permissions, isGrand, ownerDatabase) {
        this.clearErrors();
        const result = this.db.addUser(username, password, permissions, isGrand);
        if (!result) {
            const detail = this.errors.join(' · ');
            this.clearErrors();
            throw new errors_1.CliError(detail || `User '${username}' could not be created.`);
        }
        this.clearErrors();
        if (ownerDatabase) {
            await this.addOwner(ownerDatabase, username);
        }
    }
    async updateUser(username, password, permissions, isGrand, status) {
        this.clearErrors();
        const result = this.db.updateUser(username, password, permissions, isGrand, status);
        if (!result) {
            const detail = this.errors.join(' · ');
            this.clearErrors();
            throw new errors_1.CliError(detail || `User '${username}' could not be updated.`);
        }
        this.clearErrors();
    }
    async deleteUser(username, dbName) {
        this.clearErrors();
        // A global delete only touches the global user list, so remove any database
        // memberships and ownerships first; otherwise the account keeps showing up
        // as an owner/member of every database it belonged to.
        if (!dbName) {
            for (const name of this.listDatabases()) {
                const info = this.getDatabaseInfo(name);
                if (!info)
                    continue;
                if (info.users.has(username) && username !== this.user) {
                    try {
                        this.db.deleteUser(username, name);
                    }
                    catch {
                        // Best effort: keep deleting from the remaining databases.
                    }
                }
                if (info.owner.includes(username)) {
                    try {
                        await this.db.removeOwner(name, username);
                    }
                    catch {
                        // Best effort.
                    }
                }
            }
        }
        const result = this.db.deleteUser(username, dbName);
        if (!result) {
            const detail = this.errors.join(' · ');
            this.clearErrors();
            throw new errors_1.CliError(detail || `User '${username}' could not be deleted.`);
        }
        this.syncAfterUserDeleted(username);
        this.clearErrors();
    }
    async addOwner(dbName, username) {
        await this.attempt(`User '${username}' could not be added to '${dbName}'.`, () => this.db.addOwner(dbName, username));
    }
    async removeOwner(dbName, username) {
        await this.attempt(`User '${username}' could not be removed from '${dbName}'.`, () => this.db.removeOwner(dbName, username));
    }
    async backup(fileName) {
        const engine = this.db;
        engine.backupManager.setMaintenanceMode(true);
        try {
            return await engine.backup(fileName);
        }
        finally {
            engine.backupManager.setMaintenanceMode(false);
        }
    }
    async restore(fileName) {
        const engine = this.db;
        engine.backupManager.setMaintenanceMode(true);
        try {
            await engine.restore(fileName);
        }
        finally {
            engine.backupManager.setMaintenanceMode(false);
        }
    }
    cacheStats() {
        return this.db.getCacheStats();
    }
    backupDirectory() {
        return (0, config_1.backupDir)(this.db ? this.rootPath : (0, config_1.resolveRootPath)());
    }
    /** Hash helper kept here so commands don't need the engine internals. */
    static hash(value) {
        return md5_1.MD5.hash(value);
    }
}
exports.session = new SessionManager();
//# sourceMappingURL=session.js.map