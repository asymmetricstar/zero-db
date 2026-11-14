"use strict";
/**
 * Database commands: list / create / drop / rename / info / public / use.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DB_ACTIONS = void 0;
exports.dbCommand = dbCommand;
exports.suggestDatabaseArgs = suggestDatabaseArgs;
exports.dbUsage = dbUsage;
const args_1 = require("../args");
const config_1 = require("../config");
const session_1 = require("../session");
const theme_1 = require("../theme");
const ui_1 = require("../ui");
const shared_1 = require("./shared");
const connection_1 = require("./connection");
function visibility(isPublic) {
    return isPublic ? 'public' : 'private';
}
function requireName(value, usage) {
    if (!value)
        (0, ui_1.fail)(`Usage: ${config_1.BIN} ${usage}`);
    return value;
}
function listDatabases(argv) {
    const args = args_1.Args.parse(argv, { booleans: ['json', 'help'] });
    const databases = session_1.session.listDatabases();
    if (args.has('json')) {
        (0, ui_1.printJson)(databases.map((name) => {
            const info = session_1.session.getDatabaseInfo(name);
            return {
                name,
                public: info?.isPublic ?? false,
                owners: info?.owner ?? [],
                tables: info?.tables ?? [],
                users: [...(info?.users.keys() ?? [])],
            };
        }));
        return;
    }
    if (databases.length === 0) {
        (0, ui_1.info)('No databases yet. Create one with `db create <database>`.');
        return;
    }
    const rows = databases.map((name) => {
        const info = session_1.session.getDatabaseInfo(name);
        return [
            name,
            visibility(info?.isPublic ?? false),
            info?.owner.join(', ') || '-',
            String(info?.tables.length ?? 0),
        ];
    });
    console.log((0, theme_1.table)(['DATABASE', 'VISIBILITY', 'OWNERS', 'TABLES'], rows));
    (0, ui_1.info)(`${databases.length} ${databases.length === 1 ? 'database' : 'databases'}.`);
}
async function createDatabase(argv) {
    const args = args_1.Args.parse(argv, { booleans: ['public', 'json', 'help'] });
    const name = requireName(args.positionals[0], 'db create <database> [--public] [--owner <user,user>]');
    const owners = args.values('owner').flatMap((value) => (0, args_1.splitList)(value));
    if (owners.length === 0 && session_1.session.info.loggedIn && session_1.session.info.user) {
        owners.push(session_1.session.info.user);
    }
    const isPublic = args.has('public');
    session_1.session.createDatabase(name, { isPublic, owner: owners });
    (0, ui_1.ok)(`Database '${name}' created (${visibility(isPublic)}).`);
    if (owners.length > 0) {
        (0, ui_1.info)(`Owners: ${owners.join(', ')}`);
    }
    else {
        (0, ui_1.warn)('No owner assigned. Only a SystemAdmin or grand user can open it until an owner is added.');
    }
    (0, ui_1.info)(`Select it with \`use ${name}\`.`);
}
async function dropDatabase(argv) {
    const args = args_1.Args.parse(argv, { booleans: ['yes', 'json', 'help'] });
    const name = args.positionals[0] ??
        (session_1.session.hasDatabase() ? session_1.session.requireDatabase() : undefined);
    if (!name)
        (0, ui_1.fail)(`Usage: ${config_1.BIN} db drop <database> [--yes]`);
    const wasCurrent = session_1.session.info.database === name;
    if (!args.has('yes')) {
        const confirmed = await (0, ui_1.confirm)(`Drop database '${name}' and all of its data?`);
        if (!confirmed) {
            (0, ui_1.info)('Cancelled.');
            return;
        }
    }
    await session_1.session.dropDatabase(name);
    (0, ui_1.ok)(`Database '${name}' dropped.`);
    if (wasCurrent)
        (0, shared_1.printBanner)();
}
function renameDatabase(argv) {
    const args = args_1.Args.parse(argv, { booleans: ['help'] });
    const newName = requireName(args.positionals[0], 'db rename <new-database>');
    const oldName = session_1.session.requireDatabase();
    session_1.session.renameDatabase(newName);
    (0, ui_1.ok)(`Database '${oldName}' renamed to '${newName}'.`);
    (0, shared_1.printBanner)();
}
async function infoDatabase(argv) {
    const args = args_1.Args.parse(argv, { booleans: ['json', 'help'] });
    const name = await (0, shared_1.chooseDatabase)(args.positionals[0]);
    const info = session_1.session.getDatabaseInfo(name);
    if (!info)
        (0, ui_1.fail)(`Database '${name}' not found.`);
    if (args.has('json')) {
        (0, ui_1.printJson)({
            name: info.name,
            public: info.isPublic,
            owners: info.owner,
            tables: info.tables,
            users: [...info.users.values()].map((user) => ({
                username: user.username,
                permission: user.permission,
                grand: user.isGrand ?? false,
                status: user.status ?? true,
            })),
        });
        return;
    }
    console.log('');
    console.log((0, theme_1.keyValue)([
        ['Name', (0, theme_1.accentBlue)(info.name)],
        ['Visibility', info.isPublic ? 'public' : 'private'],
        ['Owners', info.owner.length > 0 ? info.owner.join(', ') : (0, theme_1.dim)('-')],
        ['Users', String(info.users.size)],
        ['Tables', String(info.tables.length)],
        ['Selected', info.name === session_1.session.info.database ? 'yes' : (0, theme_1.dim)('no')],
    ]));
    if (info.tables.length > 0) {
        console.log('');
        console.log((0, theme_1.table)(['TABLE'], info.tables.map((name) => [name])));
    }
}
async function publicDatabase(argv) {
    const args = args_1.Args.parse(argv, { booleans: ['help'] });
    let state = args.positionals[0];
    if (!state) {
        if (!process.stdin.isTTY) {
            (0, ui_1.fail)(`Usage: ${config_1.BIN} db public <on|off> [<database>]`);
        }
        state = await (0, ui_1.ask)('Visibility [on/off]: ');
    }
    const isPublic = parseVisibility(state);
    const name = await (0, shared_1.chooseDatabase)(args.positionals[1]);
    await session_1.session.setPublic(name, isPublic);
    (0, ui_1.ok)(`Database '${name}' is now ${visibility(isPublic)}.`);
}
function parseVisibility(value) {
    const normal = value.trim().toLowerCase();
    if (['on', 'public', 'true', '1', 'yes'].includes(normal))
        return true;
    if (['off', 'private', 'false', '0', 'no'].includes(normal))
        return false;
    (0, ui_1.fail)(`Unknown visibility '${value}'. Use on or off.`);
}
async function dbCommand(argv) {
    const [action, ...rest] = argv;
    switch ((action ?? 'list').toLowerCase()) {
        case 'list':
        case 'ls':
            return listDatabases(rest);
        case 'create':
        case 'new':
            return createDatabase(rest);
        case 'drop':
        case 'remove':
        case 'delete':
            return dropDatabase(rest);
        case 'rename':
            return renameDatabase(rest);
        case 'info':
        case 'show':
            return infoDatabase(rest);
        case 'public':
            return publicDatabase(rest);
        case 'use':
            return (0, connection_1.useCommand)(rest);
        default:
            (0, ui_1.fail)(`Unknown db action '${action}'. Try list, create, drop, rename, info, public or use.`);
    }
}
exports.DB_ACTIONS = [
    'list',
    'create',
    'drop',
    'rename',
    'info',
    'public',
    'use',
];
function suggestDatabaseArgs(rest) {
    if (rest.length <= 1)
        return [...exports.DB_ACTIONS];
    const action = rest[0];
    if (action === 'use' || action === 'info') {
        return rest.length === 2 ? session_1.session.listDatabases() : [];
    }
    if (action === 'public') {
        if (rest.length === 2)
            return ['on', 'off'];
        if (rest.length === 3)
            return session_1.session.listDatabases();
    }
    return [];
}
function dbUsage(action) {
    if (action === 'create') {
        return [
            `${config_1.BIN} db create <database> [--public] [--owner <user,user>]`,
            '',
            `  ${(0, theme_1.dim)('--public')}          Anyone may read it without signing in.`,
            `  ${(0, theme_1.dim)('--owner <user,user>')}   Comma separated database owners.`,
        ];
    }
    if (action === 'public')
        return [`${config_1.BIN} db public <on|off> [<database>]`];
    return [
        `${config_1.BIN} db list [--json]`,
        `${config_1.BIN} db create <database> [--public] [--owner <user,user>]`,
        `${config_1.BIN} db info [<database>] [--json]`,
        `${config_1.BIN} db rename <new-database>`,
        `${config_1.BIN} db public <on|off> [<database>]`,
        `${config_1.BIN} db drop [<database>] [--yes]`,
        `${config_1.BIN} db use <database>`,
    ];
}
//# sourceMappingURL=database.js.map