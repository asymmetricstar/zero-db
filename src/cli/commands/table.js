"use strict";
/**
 * Table commands: list / create / drop / rename / schema.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TABLE_ACTIONS = void 0;
exports.schemaCommand = schemaCommand;
exports.tableCommand = tableCommand;
exports.suggestTableArgs = suggestTableArgs;
exports.tableUsage = tableUsage;
const args_1 = require("../args");
const config_1 = require("../config");
const session_1 = require("../session");
const theme_1 = require("../theme");
const ui_1 = require("../ui");
const shared_1 = require("./shared");
async function listTables(argv) {
    const args = args_1.Args.parse(argv, { booleans: ['json', 'help'] });
    const dbName = session_1.session.requireDatabase();
    const tables = session_1.session.listTables();
    if (tables.length === 0) {
        if (args.has('json'))
            (0, ui_1.printJson)([]);
        else
            (0, ui_1.info)(`No tables in '${dbName}'. Create one with \`table create <table> <field:type ...>\`.`);
        return;
    }
    const entries = [];
    for (const name of tables) {
        let fields = null;
        let records = null;
        try {
            fields = session_1.session.describeTable(name).length;
        }
        catch {
            fields = null;
        }
        try {
            records = await session_1.session.tableCount(name);
        }
        catch {
            records = null;
            session_1.session.clearErrors();
        }
        entries.push({ name, fields, records });
    }
    if (args.has('json')) {
        (0, ui_1.printJson)(entries);
        return;
    }
    const rows = entries.map((entry) => [
        entry.name,
        entry.fields === null ? '-' : String(entry.fields),
        entry.records === null ? '-' : String(entry.records),
    ]);
    console.log((0, theme_1.table)(['TABLE', 'FIELDS', 'RECORDS'], rows));
    (0, ui_1.info)(`${tables.length} ${tables.length === 1 ? 'table' : 'tables'} in '${dbName}'.`);
}
async function createTable(argv) {
    const args = args_1.Args.parse(argv, { booleans: ['json', 'help'] });
    const name = args.positionals[0];
    if (!name) {
        (0, ui_1.fail)(`Usage: ${config_1.BIN} table create <table> <field:type ...>`);
    }
    let specs = [...args.positionals.slice(1), ...args.values('field')]
        .flatMap((spec) => spec.split(','))
        .map((spec) => spec.trim())
        .filter((spec) => spec !== '');
    if (specs.length === 0) {
        if (!process.stdin.isTTY) {
            (0, ui_1.fail)(`Usage: ${config_1.BIN} table create <table> <field:type ...>`);
        }
        const answer = await (0, ui_1.ask)(`Fields (name:type, e.g. id:auto name:string) ${(0, theme_1.dim)('[id:auto]')}: `);
        specs = (answer.trim() || 'id:auto')
            .split(/[\s,]+/)
            .filter((spec) => spec !== '');
    }
    const fields = specs.map((spec) => (0, args_1.parseFieldSpec)(spec));
    session_1.session.requireDatabase();
    await session_1.session.createTable(name, fields);
    (0, ui_1.ok)(`Table '${name}' created with ${fields.length + 2} fields (including timestamps).`);
    if (args.has('json')) {
        (0, ui_1.printJson)({ name, fields: fields.map((field) => ({ name: field.name, type: field.type })) });
    }
}
async function dropTable(argv) {
    const args = args_1.Args.parse(argv, { booleans: ['yes', 'json', 'help'] });
    const name = await (0, shared_1.chooseTable)(args.positionals[0]);
    if (!args.has('yes')) {
        const confirmed = await (0, ui_1.confirm)(`Drop table '${name}' and all of its records?`);
        if (!confirmed) {
            (0, ui_1.info)('Cancelled.');
            return;
        }
    }
    await session_1.session.dropTable(name);
    (0, ui_1.ok)(`Table '${name}' dropped.`);
}
async function renameTable(argv) {
    const args = args_1.Args.parse(argv, { booleans: ['help'] });
    const oldName = await (0, shared_1.chooseTable)(args.positionals[0]);
    const newName = args.positionals[1];
    if (!newName)
        (0, ui_1.fail)(`Usage: ${config_1.BIN} table rename <old-table> <new-table>`);
    session_1.session.renameTable(oldName, newName);
    (0, ui_1.ok)(`Table '${oldName}' renamed to '${newName}'.`);
}
/** Shared by `table schema` and `field list`. */
async function schemaCommand(argv) {
    const args = args_1.Args.parse(argv, { booleans: ['json', 'help'] });
    const name = await (0, shared_1.chooseTable)(args.positionals[0]);
    const fields = session_1.session.describeTable(name);
    if (args.has('json')) {
        (0, ui_1.printJson)(fields);
        return;
    }
    console.log('');
    console.log((0, theme_1.keyValue)([
        ['Database', (0, theme_1.accentBlue)(session_1.session.requireDatabase())],
        ['Table', (0, theme_1.accentBlue)(name)],
        ['Fields', String(fields.length)],
    ]));
    console.log('');
    const rows = fields.map((field) => [
        field.name,
        field.type,
        field.isAuto ? 'yes' : 'no',
        field.allowNull ? 'yes' : 'no',
        field.defaultValue === '' ? (0, theme_1.dim)('-') : field.defaultValue,
        String(field.maxLength),
    ]);
    console.log((0, theme_1.table)(['FIELD', 'TYPE', 'AUTO', 'NULL', 'DEFAULT', 'MAX'], rows));
    try {
        const count = await session_1.session.tableCount(name);
        (0, ui_1.info)(`${count} ${count === 1 ? 'record' : 'records'} in '${name}'.`);
    }
    catch {
        session_1.session.clearErrors();
    }
}
async function tableCommand(argv) {
    const [action, ...rest] = argv;
    switch ((action ?? 'list').toLowerCase()) {
        case 'list':
        case 'ls':
            return listTables(rest);
        case 'create':
        case 'new':
            return createTable(rest);
        case 'drop':
        case 'remove':
        case 'delete':
            return dropTable(rest);
        case 'rename':
            return renameTable(rest);
        case 'schema':
        case 'describe':
        case 'show':
            return schemaCommand(rest);
        default:
            (0, ui_1.fail)(`Unknown table action '${action}'. Try list, create, drop, rename or schema.`);
    }
}
exports.TABLE_ACTIONS = ['list', 'create', 'drop', 'rename', 'schema'];
function suggestTableArgs(rest) {
    if (rest.length <= 1)
        return [...exports.TABLE_ACTIONS];
    const action = rest[0];
    if (action === 'schema' && rest.length === 2)
        return session_1.session.listTables();
    if ((action === 'drop' || action === 'rename') && rest.length === 2) {
        return session_1.session.listTables();
    }
    return [];
}
function tableUsage() {
    return [
        `${config_1.BIN} table list [--json]`,
        `${config_1.BIN} table create <table> <field:type ...>`,
        `${config_1.BIN} table schema [<table>] [--json]`,
        `${config_1.BIN} table rename <old-table> <new-table>`,
        `${config_1.BIN} table drop [<table>] [--yes]`,
        '',
        'Field types: auto, string, number, boolean, timestamp, object, any',
        `Examples: ${(0, theme_1.dim)(`${config_1.BIN} table create <table> id:auto <field>:string <field>:string:100:!`)}`,
    ];
}
//# sourceMappingURL=table.js.map