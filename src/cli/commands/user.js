"use strict";
/**
 * User commands: list / add / update / delete / owner, plus whoami.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.USER_ACTIONS = void 0;
exports.parsePermissionSelection = parsePermissionSelection;
exports.userCommand = userCommand;
exports.whoamiCommand = whoamiCommand;
exports.suggestUserArgs = suggestUserArgs;
exports.userUsage = userUsage;
const args_1 = require("../args");
const config_1 = require("../config");
const session_1 = require("../session");
const theme_1 = require("../theme");
const ui_1 = require("../ui");
const types_1 = require("../../types");
const shared_1 = require("./shared");
const PERMISSION_TYPES = Object.keys(types_1.PERMISSION_BITS);
function yesNo(value) {
    if (value === null)
        return '-';
    return value ? 'yes' : 'no';
}
async function choosePermissions() {
    console.log('');
    PERMISSION_TYPES.forEach((type, index) => {
        console.log(`  ${(0, theme_1.cyan)(`[${index + 1}]`)} ${type}`);
    });
    console.log(`  ${(0, theme_1.cyan)('[a]')} all`);
    console.log(`  ${(0, theme_1.cyan)('[n]')} none`);
    console.log(`  ${(0, theme_1.dim)('Choose several: 14 or 1,4 or 1 4')}`);
    console.log('');
    const answer = await (0, ui_1.ask)(`Permissions ${(0, theme_1.dim)('[a]')}: `);
    return parsePermissionSelection(answer);
}
/**
 * Parse the permission menu answer. Numbers may be separated (`1,4` / `1 4`)
 * or compact (`14`, `1234`, `17`); names work too (`add,update`). `a`/`all`
 * selects everything and `n`/`none` clears the selection.
 */
function parsePermissionSelection(input) {
    const answer = input.trim().toLowerCase();
    if (answer === '' || answer === 'a' || answer === 'all')
        return [...PERMISSION_TYPES];
    if (answer === 'n' || answer === 'none')
        return [];
    const selected = new Set();
    const addNumber = (digit, token) => {
        const number = Number(digit);
        const type = PERMISSION_TYPES[number - 1];
        if (!type)
            (0, ui_1.fail)(`Unknown permission number '${digit}' in '${token}'.`);
        selected.add(type);
    };
    for (const raw of answer.split(/[,\s]+/).filter((part) => part !== '')) {
        if (raw === 'a' || raw === 'all') {
            for (const type of PERMISSION_TYPES)
                selected.add(type);
            continue;
        }
        if (raw === 'n' || raw === 'none')
            continue;
        if (/^\d+$/.test(raw)) {
            // Accept separated ("1,4") and compact ("14", "1234") selections.
            for (const digit of raw)
                addNumber(digit, raw);
            continue;
        }
        if (PERMISSION_TYPES.includes(raw)) {
            selected.add(raw);
            continue;
        }
        (0, ui_1.fail)(`Unknown permission '${raw}'.`);
    }
    return [...selected];
}
async function listUsers(argv) {
    const args = args_1.Args.parse(argv, { booleans: ['global', 'json', 'help'] });
    if (args.has('global')) {
        const names = session_1.session.listGlobalUsers();
        if (args.has('json')) {
            (0, ui_1.printJson)(names.map((username) => ({ username, scope: 'global' })));
            return;
        }
        if (names.length === 0) {
            (0, ui_1.info)('No global users.');
            return;
        }
        console.log((0, theme_1.table)(['USER', 'SCOPE'], names.map((name) => [name, 'global'])));
        (0, ui_1.info)(`${names.length} global ${names.length === 1 ? 'user' : 'users'}.`);
        return;
    }
    const dbName = await (0, shared_1.chooseDatabase)(args.positionals[0]);
    const users = session_1.session.listDatabaseUsers(dbName);
    if (args.has('json')) {
        (0, ui_1.printJson)({ database: dbName, users });
        return;
    }
    if (users.length === 0) {
        (0, ui_1.info)(`No users assigned to '${dbName}'.`);
        return;
    }
    const rows = users.map((user) => [
        user.username,
        user.role,
        (0, args_1.permissionLabel)(user.permission),
        yesNo(user.grand),
        yesNo(user.status),
    ]);
    console.log((0, theme_1.table)(['USER', 'ROLE', 'PERMISSIONS', 'GRAND', 'STATUS'], rows));
    (0, ui_1.info)(`${users.length} ${users.length === 1 ? 'user' : 'users'} in '${dbName}'.`);
}
async function addUser(argv) {
    const args = args_1.Args.parse(argv, {
        booleans: ['grand', 'no-db', 'json', 'help'],
        aliases: { p: 'password' },
    });
    let username = args.positionals[0];
    if (!username) {
        if (!process.stdin.isTTY) {
            (0, ui_1.fail)(`Usage: ${config_1.BIN} user add <user> [--password <password>] [--perm <permissions>]`);
        }
        username = (await (0, ui_1.ask)('Username: ')).trim();
    }
    if (!username)
        (0, ui_1.fail)('Username cannot be empty.');
    let password = args.value('password');
    if (password === undefined) {
        if (!process.stdin.isTTY) {
            (0, ui_1.fail)('Password required: add --password <password> or run in a terminal.');
        }
        password = await (0, ui_1.askSecret)(`Password for '${username}': `);
    }
    if (password === '')
        (0, ui_1.fail)('Password cannot be empty.');
    let permissions = (0, args_1.parsePermissions)(args.value('perm'));
    if (permissions === undefined) {
        if (process.stdin.isTTY)
            permissions = await choosePermissions();
        else
            permissions = 127;
    }
    const ownerDatabase = args.has('no-db')
        ? undefined
        : args.value('db') ?? (session_1.session.hasDatabase() ? session_1.session.info.database : undefined);
    await session_1.session.addUser(username, password, permissions, args.has('grand'), ownerDatabase);
    if (args.has('json')) {
        (0, ui_1.printJson)({ username, grand: args.has('grand'), database: ownerDatabase ?? null });
        return;
    }
    (0, ui_1.ok)(`User '${username}' created.`);
    if (ownerDatabase)
        (0, ui_1.info)(`Added as an owner of '${ownerDatabase}'.`);
    if (!session_1.session.info.loggedIn) {
        (0, ui_1.info)(`Sign in with \`login ${username}\`.`);
    }
}
async function updateUser(argv) {
    const args = args_1.Args.parse(argv, {
        booleans: ['grand', 'no-grand', 'status', 'no-status', 'json', 'help'],
        aliases: { p: 'password', g: 'grand' },
    });
    const username = args.positionals[0];
    if (!username)
        (0, ui_1.fail)(`Usage: ${config_1.BIN} user update <user> [options]`);
    let password = args.value('password');
    let permissions = (0, args_1.parsePermissions)(args.value('perm'));
    let isGrand = args.has('grand') ? true : args.has('no-grand') ? false : undefined;
    let status = args.has('status') ? true : args.has('no-status') ? false : undefined;
    const hasOptions = password !== undefined ||
        permissions !== undefined ||
        isGrand !== undefined ||
        status !== undefined;
    if (!hasOptions && process.stdin.isTTY) {
        const newPassword = await (0, ui_1.askSecret)('New password (empty = keep): ');
        if (newPassword !== '')
            password = newPassword;
        const permAnswer = await (0, ui_1.ask)(`Permissions ${(0, theme_1.dim)('(empty = keep; e.g. 14, 1,4 or add,list)')}: `);
        if (permAnswer.trim() !== '')
            permissions = parsePermissionSelection(permAnswer);
        const grandAnswer = await (0, ui_1.ask)(`Grand admin? ${(0, theme_1.dim)('(empty = keep) [yes/no]')}: `);
        const grand = (0, args_1.parseYesNo)(grandAnswer);
        if (grand !== undefined)
            isGrand = grand;
        const statusAnswer = await (0, ui_1.ask)(`Enabled? ${(0, theme_1.dim)('(empty = keep) [yes/no]')}: `);
        const enabled = (0, args_1.parseYesNo)(statusAnswer);
        if (enabled !== undefined)
            status = enabled;
    }
    else if (!hasOptions) {
        (0, ui_1.fail)(`Usage: ${config_1.BIN} user update <user> [--password <password>] [--perm <permissions>] [--grand|--no-grand] [--status|--no-status]`);
    }
    if (password === '')
        (0, ui_1.fail)('Password cannot be empty.');
    await session_1.session.updateUser(username, password, permissions, isGrand, status);
    if (args.has('json')) {
        (0, ui_1.printJson)({ username, updated: true });
        return;
    }
    (0, ui_1.ok)(`User '${username}' updated.`);
}
async function deleteUser(argv) {
    const args = args_1.Args.parse(argv, {
        booleans: ['yes', 'json', 'global', 'help'],
    });
    const username = args.positionals[0];
    if (!username)
        (0, ui_1.fail)(`Usage: ${config_1.BIN} user delete <user> [--db <database>] [--yes]`);
    const dbName = args.value('db');
    const scope = dbName ? `from database '${dbName}'` : 'globally';
    if (!args.has('yes')) {
        const confirmed = await (0, ui_1.confirm)(`Delete user '${username}' ${scope}?`);
        if (!confirmed) {
            (0, ui_1.info)('Cancelled.');
            return;
        }
    }
    await session_1.session.deleteUser(username, dbName);
    if (dbName) {
        try {
            await session_1.session.removeOwner(dbName, username);
        }
        catch {
            // Not being an owner is fine when removing a member.
        }
    }
    if (args.has('json')) {
        (0, ui_1.printJson)({ username, deleted: true, database: dbName ?? null });
        return;
    }
    (0, ui_1.ok)(`User '${username}' deleted ${scope}.`);
    if (!session_1.session.info.loggedIn)
        (0, shared_1.printBanner)();
}
async function ownerCommand(argv) {
    const [action, ...rest] = argv;
    if (action !== 'add' && action !== 'remove') {
        (0, ui_1.fail)(`Usage: ${config_1.BIN} user owner <add|remove> <user> [--db <database>]`);
    }
    const args = args_1.Args.parse(rest, { booleans: ['help'] });
    const username = args.positionals[0];
    if (!username) {
        (0, ui_1.fail)(`Usage: ${config_1.BIN} user owner ${action} <user> [--db <database>]`);
    }
    const dbName = await (0, shared_1.chooseDatabase)(args.value('db'));
    if (action === 'add') {
        await session_1.session.addOwner(dbName, username);
        (0, ui_1.ok)(`User '${username}' added as an owner of '${dbName}'.`);
        const owner = session_1.session.getDatabaseInfo(dbName)?.users.get(username);
        if (owner && owner.password === '') {
            (0, ui_1.warn)(`'${username}' has no password yet. Run \`user add ${username}\` (or \`user update\`) to set one.`);
        }
    }
    else {
        await session_1.session.removeOwner(dbName, username);
        (0, ui_1.ok)(`User '${username}' removed as an owner of '${dbName}'.`);
    }
}
async function userCommand(argv) {
    const [action, ...rest] = argv;
    switch ((action ?? 'list').toLowerCase()) {
        case 'list':
        case 'ls':
            return listUsers(rest);
        case 'add':
        case 'create':
        case 'new':
            return addUser(rest);
        case 'update':
        case 'edit':
            return updateUser(rest);
        case 'delete':
        case 'remove':
            return deleteUser(rest);
        case 'owner':
            return ownerCommand(rest);
        default:
            (0, ui_1.fail)(`Unknown user action '${action}'. Try list, add, update, delete or owner.`);
    }
}
/** Current account and selected database. */
function whoamiCommand(argv) {
    const args = args_1.Args.parse(argv, { booleans: ['json'] });
    const state = session_1.session.info;
    if (args.has('json')) {
        (0, ui_1.printJson)(state);
        return;
    }
    if (!state.loggedIn) {
        (0, ui_1.info)('Not signed in.');
        (0, ui_1.info)(`Database: ${state.database ? (0, theme_1.accentBlue)(state.database) : (0, theme_1.dim)('none')}`);
        return;
    }
    console.log('');
    console.log((0, theme_1.keyValue)([
        ['User', (0, theme_1.accentBlue)(state.user) + (state.systemAdmin ? (0, theme_1.dim)(' (SystemAdmin)') : '')],
        ['Database', state.database ? (0, theme_1.accentBlue)(state.database) : (0, theme_1.dim)('-')],
        ['Root', (0, theme_1.dim)(state.rootPath)],
    ]));
}
exports.USER_ACTIONS = ['list', 'add', 'update', 'delete', 'owner'];
function suggestUserArgs(rest) {
    if (rest.length <= 1)
        return [...exports.USER_ACTIONS];
    const action = rest[0];
    if (action === 'list' && rest.length === 2)
        return session_1.session.listDatabases();
    if (action === 'owner') {
        if (rest.length === 2)
            return ['add', 'remove'];
        if (rest.length === 3)
            return session_1.session.listDatabases();
    }
    return [];
}
function userUsage() {
    return [
        `${config_1.BIN} user list [<database>] [--global] [--json]`,
        `${config_1.BIN} user add <user> [--password <password>] [--perm <permissions>] [--grand] [--db <database>]`,
        `${config_1.BIN} user update <user> [--password <password>] [--perm <permissions>] [--grand|--no-grand] [--status|--no-status]`,
        `${config_1.BIN} user delete <user> [--db <database>] [--yes]`,
        `${config_1.BIN} user owner <add|remove> <user> [--db <database>]`,
    ];
}
//# sourceMappingURL=user.js.map