"use strict";
/**
 * Record commands: find / count / add / update / remove.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RECORD_NAMES = void 0;
exports.findCommand = findCommand;
exports.countCommand = countCommand;
exports.addCommand = addCommand;
exports.updateCommand = updateCommand;
exports.removeCommand = removeCommand;
exports.suggestRecordArgs = suggestRecordArgs;
exports.findUsage = findUsage;
exports.recordUsage = recordUsage;
const args_1 = require("../args");
const config_1 = require("../config");
const session_1 = require("../session");
const theme_1 = require("../theme");
const ui_1 = require("../ui");
const shared_1 = require("./shared");
function columnsFor(tableName, rows) {
    let fields = [];
    try {
        fields = session_1.session.describeTable(tableName);
    }
    catch {
        fields = [];
    }
    const schemaFields = fields.map((field) => field.name);
    const types = new Map(fields.map((field) => [field.name, field.type]));
    const present = new Set();
    for (const row of rows) {
        for (const key of Object.keys(row))
            present.add(key);
    }
    const ordered = schemaFields.filter((field) => present.has(field));
    for (const key of present) {
        if (!ordered.includes(key))
            ordered.push(key);
    }
    return { columns: ordered, types };
}
/** Show stored `1`/`0` as true/false for boolean fields in the table view. */
function displayCell(value, type) {
    const text = (0, theme_1.cell)(value);
    if (type === 'boolean') {
        if (text === '1' || text === 'true')
            return 'true';
        if (text === '0' || text === 'false')
            return 'false';
    }
    return text;
}
async function findCommand(argv) {
    const args = args_1.Args.parse(argv, {
        booleans: ['desc', 'json', 'help'],
        aliases: { w: 'where', o: 'order', n: 'limit', p: 'page', s: 'select', d: 'desc' },
    });
    const tableName = await (0, shared_1.chooseTable)(args.positionals[0]);
    const rows = await session_1.session.find(tableName, {
        where: args.pairs('where', '--where'),
        like: args.pairs('like', '--like'),
        order: args.value('order'),
        desc: args.has('desc'),
        limit: args.int('limit'),
        page: args.int('page'),
        select: (0, args_1.splitList)(args.value('select')),
    });
    if (args.has('json')) {
        (0, ui_1.printJson)(rows);
        return;
    }
    if (rows.length === 0) {
        (0, ui_1.info)(`No records found in '${tableName}'.`);
        return;
    }
    const { columns, types } = columnsFor(tableName, rows);
    const body = rows.map((row, index) => [
        String(index + 1),
        ...columns.map((column) => displayCell(row[column], types.get(column))),
    ]);
    console.log((0, theme_1.table)(['#', ...columns], body));
    const limit = args.int('limit');
    (0, ui_1.info)(`${(0, theme_1.formatCount)(rows.length, 'record')} from ${(0, theme_1.accentBlue)(tableName)}` +
        (limit !== undefined && rows.length === limit
            ? ` ${(0, theme_1.faint)(`(limit ${limit}; use --page to continue)`)}`
            : ''));
}
async function countCommand(argv) {
    const args = args_1.Args.parse(argv, {
        booleans: ['json', 'help'],
        aliases: { w: 'where' },
    });
    const tableName = await (0, shared_1.chooseTable)(args.positionals[0]);
    const where = args.pairs('where', '--where');
    const count = await session_1.session.countWhere(tableName, where);
    if (args.has('json')) {
        (0, ui_1.printJson)({ table: tableName, count, where });
        return;
    }
    console.log(`${(0, theme_1.formatCount)(count, 'record')} in ${(0, theme_1.accentBlue)(tableName)}.`);
}
/** Ask one value per user field; Enter accepts the default. */
async function addWizard(tableName) {
    const fields = session_1.session
        .describeTable(tableName)
        .filter((field) => !session_1.session.isSystemField(field.name) && !field.isAuto);
    const data = {};
    console.log('');
    for (const field of fields) {
        const hint = field.defaultValue !== ''
            ? ` [${field.defaultValue}]`
            : field.allowNull
                ? ' [empty]'
                : ' (required)';
        const answer = await (0, ui_1.ask)(`  ${field.name} ${(0, theme_1.dim)(`(${field.type})`)}${(0, theme_1.faint)(hint)}: `);
        if (answer === '') {
            if (field.defaultValue !== '')
                data[field.name] = field.defaultValue;
            else if (!field.allowNull)
                (0, ui_1.fail)(`Field '${field.name}' is required.`);
            continue;
        }
        data[field.name] = answer;
    }
    return data;
}
async function addCommand(argv) {
    const args = args_1.Args.parse(argv, { booleans: ['yes', 'json', 'help'] });
    const tableName = await (0, shared_1.chooseTable)(args.positionals[0]);
    let data = (0, args_1.parsePairs)(args.positionals.slice(1), 'record value');
    if (Object.keys(data).length === 0) {
        if (!process.stdin.isTTY) {
            (0, ui_1.fail)(`Usage: ${config_1.BIN} add <table> <field>=<value> ...`);
        }
        data = await addWizard(tableName);
    }
    if (!args.has('yes') && process.stdin.isTTY) {
        console.log('');
        console.log((0, theme_1.keyValue)(Object.entries(data).map(([key, value]) => [key, value === '' ? (0, theme_1.dim)('(empty)') : value])));
        const confirmed = await (0, ui_1.confirm)(`Add this record to '${tableName}'?`, true);
        if (!confirmed) {
            (0, ui_1.info)('Cancelled.');
            return;
        }
    }
    const line = await session_1.session.addRecord(tableName, data);
    if (args.has('json')) {
        (0, ui_1.printJson)({ success: true, table: tableName, line, data });
        return;
    }
    (0, ui_1.ok)(`Record added to '${tableName}' (line ${line}).`);
}
async function updateCommand(argv) {
    const args = args_1.Args.parse(argv, {
        booleans: ['yes', 'json', 'help'],
        aliases: { w: 'where' },
    });
    const tableName = await (0, shared_1.chooseTable)(args.positionals[0]);
    let where = args.pairs('where', '--where');
    let data = (0, args_1.parsePairs)(args.positionals.slice(1), 'record value');
    if (Object.keys(where).length === 0) {
        if (!process.stdin.isTTY) {
            (0, ui_1.fail)(`Usage: ${config_1.BIN} update <table> <field>=<value> ... --where <field>=<value>`);
        }
        const answer = await (0, ui_1.ask)('Where (<field>=<value>): ');
        where = (0, args_1.parsePairs)((0, args_1.tokenizePairs)(answer), 'where');
    }
    if (Object.keys(where).length === 0) {
        (0, ui_1.fail)('A where condition is required; refusing to update every record.');
    }
    if (Object.keys(data).length === 0) {
        if (!process.stdin.isTTY) {
            (0, ui_1.fail)(`Usage: ${config_1.BIN} update <table> <field>=<value> ... --where <field>=<value>`);
        }
        const answer = await (0, ui_1.ask)('Set (<field>=<value>, ...): ');
        data = (0, args_1.parsePairs)((0, args_1.tokenizePairs)(answer), 'set');
    }
    if (Object.keys(data).length === 0) {
        (0, ui_1.fail)('Nothing to update; provide at least one <field>=<value>.');
    }
    const count = await session_1.session.updateRecords(tableName, where, data);
    if (args.has('json')) {
        (0, ui_1.printJson)({ table: tableName, updated: count, where, data });
        return;
    }
    if (count === 0) {
        (0, ui_1.warn)(`No records matched in '${tableName}'.`);
        return;
    }
    (0, ui_1.ok)(`${count} ${count === 1 ? 'record' : 'records'} updated in '${tableName}'.`);
}
async function removeCommand(argv) {
    const args = args_1.Args.parse(argv, {
        booleans: ['yes', 'json', 'help'],
        aliases: { w: 'where' },
    });
    const tableName = await (0, shared_1.chooseTable)(args.positionals[0]);
    let where = args.pairs('where', '--where');
    if (Object.keys(where).length === 0) {
        if (!process.stdin.isTTY) {
            (0, ui_1.fail)(`Usage: ${config_1.BIN} remove <table> --where <field>=<value> [--yes]`);
        }
        const answer = await (0, ui_1.ask)('Where (<field>=<value>): ');
        where = (0, args_1.parsePairs)((0, args_1.tokenizePairs)(answer), 'where');
    }
    if (Object.keys(where).length === 0) {
        (0, ui_1.fail)('A where condition is required; refusing to delete every record.');
    }
    if (!args.has('yes')) {
        const confirmed = await (0, ui_1.confirm)(`Delete matching records from '${tableName}'? (${Object.entries(where)
            .map(([key, value]) => `${key}=${value}`)
            .join(', ')})`);
        if (!confirmed) {
            (0, ui_1.info)('Cancelled.');
            return;
        }
    }
    const count = await session_1.session.deleteRecords(tableName, where);
    if (args.has('json')) {
        (0, ui_1.printJson)({ table: tableName, deleted: count, where });
        return;
    }
    if (count === 0) {
        (0, ui_1.warn)(`No records matched in '${tableName}'.`);
        return;
    }
    (0, ui_1.ok)(`${count} ${count === 1 ? 'record' : 'records'} deleted from '${tableName}'.`);
}
exports.RECORD_NAMES = ['find', 'count', 'add', 'update', 'remove'];
function suggestRecordArgs(rest) {
    if (rest.length <= 1)
        return session_1.session.listTables();
    return [];
}
function findUsage() {
    return [
        `${config_1.BIN} find <table> [--where <field>=<value>] [--like <field>=<pattern>]`,
        `              [--order <field>] [--desc] [--limit <n>] [--page <n>]`,
        `              [--select <field>,<field>] [--json]`,
        '',
        `Examples: ${(0, theme_1.dim)(`${config_1.BIN} find <table> --where <field>=<value> --order <field> --desc --limit 20`)}`,
    ];
}
function recordUsage() {
    return [
        `${config_1.BIN} count <table> [--where <field>=<value>] [--json]`,
        `${config_1.BIN} add <table> <field>=<value> ... [--yes] [--json]`,
        `${config_1.BIN} update <table> <field>=<value> ... --where <field>=<value> [--yes] [--json]`,
        `${config_1.BIN} remove <table> --where <field>=<value> [--yes] [--json]`,
    ];
}
//# sourceMappingURL=record.js.map