"use strict";
/**
 * Connection commands: open a root folder, switch database, sign in/out and
 * inspect the session.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectCommand = connectCommand;
exports.useCommand = useCommand;
exports.loginCommand = loginCommand;
exports.logoutCommand = logoutCommand;
exports.statusCommand = statusCommand;
const args_1 = require("../args");
const config_1 = require("../config");
const session_1 = require("../session");
const theme_1 = require("../theme");
const ui_1 = require("../ui");
const shared_1 = require("./shared");
/** Open a database root folder chosen by path. */
async function connectCommand(argv) {
    const args = args_1.Args.parse(argv, { booleans: ['help'] });
    let target = args.positionals[0];
    if (!target) {
        if (!process.stdin.isTTY) {
            (0, ui_1.fail)(`Usage: ${config_1.BIN} connect <path>`);
        }
        const fallback = (0, config_1.defaultRootPath)();
        const answer = await (0, ui_1.ask)(`Database root path ${(0, theme_1.faint)(`[${fallback}]`)}: `);
        target = answer.trim() || fallback;
    }
    await session_1.session.open(target);
    (0, ui_1.ok)(`Database root: ${session_1.session.info.rootPath}`);
    (0, shared_1.printBanner)();
}
/** Select a database inside the open root. */
async function useCommand(argv) {
    const args = args_1.Args.parse(argv, { booleans: ['help'] });
    let name = args.positionals[0];
    if (!name) {
        const databases = session_1.session.listDatabases();
        if (databases.length === 0) {
            (0, ui_1.fail)('No databases found. Create one with `db create <database>`.');
        }
        if (!process.stdin.isTTY) {
            (0, ui_1.fail)(`Usage: ${config_1.BIN} use <database>`);
        }
        name = await (0, ui_1.pick)('database', databases);
    }
    session_1.session.selectDatabase(name);
    (0, ui_1.ok)(`Using database '${name}'.`);
    (0, shared_1.printBanner)();
}
/** Sign in with a database user, or with --admin as the SystemAdmin. */
async function loginCommand(argv) {
    const args = args_1.Args.parse(argv, { booleans: ['admin'], aliases: { d: 'db' } });
    const admin = args.has('admin');
    let username = args.positionals[0];
    let password = args.positionals[1];
    const explicitDb = args.value('db');
    if (!username) {
        if (!process.stdin.isTTY) {
            (0, ui_1.fail)(`Usage: ${config_1.BIN} login <user> [<password>] [--db <database>] [--admin]`);
        }
        username = await (0, ui_1.ask)('Username: ');
    }
    if (!username)
        (0, ui_1.fail)('Username cannot be empty.');
    if (password === undefined) {
        if (!process.stdin.isTTY) {
            (0, ui_1.fail)('Password required: add it as the second argument or run the command in a terminal.');
        }
        password = await (0, ui_1.askSecret)(`Password for ${username}: `);
    }
    if (password === '')
        (0, ui_1.fail)('Password cannot be empty.');
    if (admin) {
        session_1.session.loginAdmin(username, password);
        let dbName = explicitDb;
        if (!dbName && session_1.session.hasDatabase())
            dbName = session_1.session.requireDatabase();
        if (!dbName) {
            const databases = session_1.session.listDatabases();
            if (databases.length === 1) {
                dbName = databases[0];
            }
            else if (databases.length > 1 && process.stdin.isTTY) {
                dbName = await (0, ui_1.pick)('database', databases);
            }
        }
        if (dbName)
            session_1.session.selectDatabase(dbName);
        (0, ui_1.ok)(`Signed in as SystemAdmin '${username}'.`);
        (0, shared_1.printBanner)();
        return;
    }
    let dbName = explicitDb;
    if (!dbName)
        dbName = session_1.session.hasDatabase() ? session_1.session.requireDatabase() : undefined;
    if (!dbName) {
        const databases = session_1.session.listDatabases();
        if (databases.length === 0) {
            (0, ui_1.fail)('No databases found. Create one with `db create <database>` first.');
        }
        if (databases.length === 1) {
            dbName = databases[0];
        }
        else if (process.stdin.isTTY) {
            dbName = await (0, ui_1.pick)('database', databases);
        }
        else {
            (0, ui_1.fail)('Use --db <database> to choose the database to sign in to.');
        }
    }
    session_1.session.login(dbName, username, password);
    (0, ui_1.ok)(`Signed in as '${username}' on '${dbName}'.`);
    (0, shared_1.printBanner)();
}
function logoutCommand(_argv) {
    const wasLoggedIn = session_1.session.info.loggedIn;
    session_1.session.logout();
    if (wasLoggedIn)
        (0, ui_1.ok)('Signed out.');
    else
        (0, ui_1.info)('No active session.');
    (0, shared_1.printBanner)();
}
/** Connection, session and cache details. */
function statusCommand(argv) {
    const args = args_1.Args.parse(argv, { booleans: ['json'] });
    const infoState = session_1.session.info;
    const databases = session_1.session.listDatabases();
    const tables = infoState.database ? session_1.session.listTables() : [];
    const cache = session_1.session.isOpen ? session_1.session.cacheStats() : null;
    if (args.has('json')) {
        (0, ui_1.printJson)({
            ...infoState,
            config: (0, config_1.configFilePath)(),
            databases,
            tables,
            cache,
        });
        return;
    }
    if (infoState.rootPath === '') {
        (0, ui_1.info)('No database root is open.');
        return;
    }
    console.log('');
    console.log((0, theme_1.banner)(infoState));
    console.log('');
    console.log((0, ui_1.keyValue)([
        ['Root', (0, theme_1.accentBlue)(infoState.rootPath)],
        ['Databases', String(databases.length)],
        ['Tables', infoState.database ? String(tables.length) : (0, theme_1.dim)('-')],
        ['Config', (0, theme_1.dim)((0, config_1.configFilePath)())],
        ['Cache', cache ? `${cache.entries} entries · ${cache.usedMB.toFixed(1)} MB of ${cache.maxMB} MB` : (0, theme_1.dim)('-')],
    ]));
    if (databases.length > 0) {
        console.log('');
        console.log((0, ui_1.table)(['DATABASE'], databases.map((name) => [name])));
    }
}
//# sourceMappingURL=connection.js.map