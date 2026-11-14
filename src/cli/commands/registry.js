"use strict";
/**
 * Command registry — one table drives dispatch, help, completion and aliases.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHELL_BUILTINS = exports.GROUPS = exports.COMMANDS = void 0;
exports.findCommand = findCommand;
exports.commandNames = commandNames;
exports.printCommandHelp = printCommandHelp;
exports.dispatch = dispatch;
const config_1 = require("../config");
const errors_1 = require("../errors");
const session_1 = require("../session");
const theme_1 = require("../theme");
const connection_1 = require("./connection");
const database_1 = require("./database");
const field_1 = require("./field");
const record_1 = require("./record");
const system_1 = require("./system");
const table_1 = require("./table");
const user_1 = require("./user");
/**
 * Commands are grouped by what they operate on, so the help screen mirrors the
 * database hierarchy: connection → databases → tables → records → users.
 */
exports.COMMANDS = [
    {
        name: 'connect',
        aliases: ['open'],
        group: 'Connection',
        summary: 'Open a database root folder (choose a path)',
        pathCompletes: true,
        usage: [
            `${config_1.BIN} connect <path>`,
            `${config_1.BIN} connect            ${(0, theme_1.dim)('(asks for the path)')}`,
            '',
            `Examples: ${(0, theme_1.dim)(`${config_1.BIN} connect <path>`)}`,
        ],
        run: connection_1.connectCommand,
    },
    {
        name: 'use',
        aliases: ['cd'],
        group: 'Connection',
        summary: 'Switch to another database in the open root',
        suggest: (rest) => (rest.length <= 1 ? session_1.session.listDatabases() : []),
        usage: [
            `${config_1.BIN} use <database>`,
            `${config_1.BIN} use                ${(0, theme_1.dim)('(asks with a numbered menu)')}`,
        ],
        run: connection_1.useCommand,
    },
    {
        name: 'login',
        aliases: ['auth'],
        group: 'Connection',
        summary: 'Sign in to a database, or as SystemAdmin with --admin',
        flags: ['--db', '--admin', '--help'],
        usage: [
            `${config_1.BIN} login <user> [<password>] [--db <database>]`,
            `${config_1.BIN} login <user> [<password>] --admin`,
            `${config_1.BIN} login              ${(0, theme_1.dim)('(asks for username and password)')}`,
        ],
        run: connection_1.loginCommand,
    },
    {
        name: 'logout',
        group: 'Connection',
        summary: 'End the current session',
        usage: [`${config_1.BIN} logout`],
        run: connection_1.logoutCommand,
    },
    {
        name: 'status',
        aliases: ['info'],
        group: 'Connection',
        summary: 'Show connection, session and cache details',
        flags: ['--json', '--help'],
        usage: [`${config_1.BIN} status [--json]`],
        run: connection_1.statusCommand,
    },
    {
        name: 'db',
        aliases: ['database', 'databases'],
        group: 'Databases',
        summary: 'List, create, drop, rename or inspect databases',
        flags: ['--public', '--owner', '--yes', '--json', '--help'],
        suggest: database_1.suggestDatabaseArgs,
        usage: (0, database_1.dbUsage)(),
        run: database_1.dbCommand,
    },
    {
        name: 'table',
        aliases: ['tables'],
        group: 'Tables',
        summary: 'List, create, drop, rename or inspect tables',
        flags: ['--field', '--json', '--yes', '--help'],
        suggest: table_1.suggestTableArgs,
        usage: (0, table_1.tableUsage)(),
        run: table_1.tableCommand,
    },
    {
        name: 'field',
        aliases: ['fields'],
        group: 'Tables',
        summary: 'Add, drop, rename or modify table fields',
        flags: ['--max', '--default', '--not-null', '--null', '--auto', '--yes', '--help'],
        suggest: field_1.suggestFieldArgs,
        usage: (0, field_1.fieldUsage)(),
        run: field_1.fieldCommand,
    },
    {
        name: 'find',
        aliases: ['select', 'query'],
        group: 'Records',
        summary: 'Query rows with where/like/order/limit filters',
        flags: ['--where', '--like', '--order', '--desc', '--limit', '--page', '--select', '--json', '--help'],
        suggest: record_1.suggestRecordArgs,
        usage: (0, record_1.findUsage)(),
        run: record_1.findCommand,
    },
    {
        name: 'count',
        group: 'Records',
        summary: 'Count rows, optionally filtered with --where',
        flags: ['--where', '--json', '--help'],
        suggest: record_1.suggestRecordArgs,
        usage: [`${config_1.BIN} count <table> [--where <field>=<value>] [--json]`],
        run: record_1.countCommand,
    },
    {
        name: 'add',
        aliases: ['insert'],
        group: 'Records',
        summary: 'Insert a record; asks field by field when values are omitted',
        flags: ['--yes', '--json', '--help'],
        suggest: record_1.suggestRecordArgs,
        usage: [
            `${config_1.BIN} add <table> <field>=<value> ... [--yes] [--json]`,
            `${config_1.BIN} add <table>       ${(0, theme_1.dim)('(asks field by field)')}`,
        ],
        run: record_1.addCommand,
    },
    {
        name: 'update',
        aliases: ['edit'],
        group: 'Records',
        summary: 'Update matching rows (--where is required)',
        flags: ['--where', '--yes', '--json', '--help'],
        suggest: record_1.suggestRecordArgs,
        usage: [`${config_1.BIN} update <table> <field>=<value> ... --where <field>=<value> [--yes] [--json]`],
        run: record_1.updateCommand,
    },
    {
        name: 'remove',
        aliases: ['delete', 'rm'],
        group: 'Records',
        summary: 'Delete matching rows (--where is required)',
        flags: ['--where', '--yes', '--json', '--help'],
        suggest: record_1.suggestRecordArgs,
        usage: [`${config_1.BIN} remove <table> --where <field>=<value> [--yes] [--json]`],
        run: record_1.removeCommand,
    },
    {
        name: 'user',
        aliases: ['users'],
        group: 'Users',
        summary: 'List, create, update or delete users and owners',
        flags: [
            '--global',
            '--password',
            '--perm',
            '--grand',
            '--no-grand',
            '--status',
            '--no-status',
            '--db',
            '--no-db',
            '--yes',
            '--json',
            '--help',
        ],
        suggest: user_1.suggestUserArgs,
        usage: (0, user_1.userUsage)(),
        run: user_1.userCommand,
    },
    {
        name: 'whoami',
        aliases: ['me'],
        group: 'Users',
        summary: 'Show the signed-in user and selected database',
        flags: ['--json', '--help'],
        usage: [`${config_1.BIN} whoami [--json]`],
        run: user_1.whoamiCommand,
    },
    {
        name: 'backup',
        group: 'System',
        summary: 'Write a tar.gz backup of the database root',
        flags: ['--help'],
        usage: [`${config_1.BIN} backup [file.tar.gz]`],
        run: system_1.backupCommand,
    },
    {
        name: 'restore',
        group: 'System',
        summary: 'Restore a backup over the database root',
        flags: ['--yes', '--help'],
        usage: [`${config_1.BIN} restore <file.tar.gz> [--yes]`],
        run: system_1.restoreCommand,
    },
];
exports.GROUPS = [
    'Connection',
    'Databases',
    'Tables',
    'Records',
    'Users',
    'System',
];
/** Commands the interactive shell handles itself. */
exports.SHELL_BUILTINS = ['clear', 'exit', 'help'];
/** Look a command up by name or alias, case-insensitively. */
function findCommand(name) {
    const needle = name.trim().toLowerCase();
    if (needle === '')
        return undefined;
    return exports.COMMANDS.find((command) => command.name === needle || command.aliases?.includes(needle) === true);
}
/** Every accepted command word, sorted, for completion. */
function commandNames() {
    const names = exports.COMMANDS.flatMap((command) => [
        command.name,
        ...(command.aliases ?? []),
    ]);
    return [...new Set(names)].sort();
}
/** Usage block for `help <command>` and `<command> --help`. */
function printCommandHelp(spec) {
    const out = [''];
    out.push(`  ${(0, theme_1.bold)(spec.name)}  ${spec.summary}`);
    if (spec.aliases?.length) {
        out.push(`  ${(0, theme_1.dim)('aliases')}  ${spec.aliases.join(', ')}`);
    }
    if (spec.usage?.length) {
        out.push('');
        out.push(`  ${(0, theme_1.dim)('usage')}`);
        for (const line of spec.usage)
            out.push(`    ${line}`);
    }
    if (spec.flags?.length) {
        out.push('');
        out.push(`  ${(0, theme_1.dim)('options')}  ${spec.flags.join('  ')}`);
    }
    out.push('');
    console.log(out.join('\n'));
}
/** Run one command line; unknown names fail like the one-shot CLI does. */
async function dispatch(argv) {
    const [name, ...rest] = argv;
    const command = name === undefined ? undefined : findCommand(name);
    if (command === undefined) {
        const label = name === undefined ? '' : ` '${name}'`;
        throw new errors_1.CliError(`Unknown command${label}. Type \`help\` to list the commands.`);
    }
    if (rest.includes('--help') || rest.includes('-h')) {
        printCommandHelp(command);
        return;
    }
    // `connect` chooses its own path; everything else needs an open root.
    if (command.name !== 'connect')
        await session_1.session.ensureOpen();
    await command.run(rest);
}
//# sourceMappingURL=registry.js.map