"use strict";
/**
 * Field commands: list / add / drop / rename / modify (ALTER TABLE).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FIELD_ACTIONS = void 0;
exports.fieldCommand = fieldCommand;
exports.suggestFieldArgs = suggestFieldArgs;
exports.fieldUsage = fieldUsage;
const args_1 = require("../args");
const config_1 = require("../config");
const session_1 = require("../session");
const ui_1 = require("../ui");
const shared_1 = require("./shared");
const table_1 = require("./table");
function userFields(tableName) {
    try {
        return session_1.session
            .describeTable(tableName)
            .filter((field) => !session_1.session.isSystemField(field.name))
            .map((field) => field.name);
    }
    catch {
        return [];
    }
}
async function addField(argv) {
    const args = args_1.Args.parse(argv, { booleans: ['help'] });
    const tableName = await (0, shared_1.chooseTable)(args.positionals[0]);
    let specs = [...args.positionals.slice(1), ...args.values('field')]
        .flatMap((spec) => spec.split(','))
        .map((spec) => spec.trim())
        .filter((spec) => spec !== '');
    if (specs.length === 0) {
        if (!process.stdin.isTTY) {
            (0, ui_1.fail)(`Usage: ${config_1.BIN} field add <table> <field:type ...>`);
        }
        const answer = await (0, ui_1.ask)(`Field (name:type, e.g. phone:string) ${(0, ui_1.dim)('[phone:string]')}: `);
        specs = (answer.trim() || 'phone:string')
            .split(/[\s,]+/)
            .filter((spec) => spec !== '');
    }
    for (const spec of specs) {
        const field = (0, args_1.parseFieldSpec)(spec);
        if (session_1.session.isSystemField(field.name)) {
            (0, ui_1.fail)(`'${field.name}' is a system field and cannot be added.`);
        }
        await session_1.session.addField(tableName, field);
        (0, ui_1.ok)(`Field '${field.name}' (${field.type}) added to '${tableName}'.`);
    }
}
async function dropField(argv) {
    const args = args_1.Args.parse(argv, { booleans: ['yes', 'help'] });
    const tableName = await (0, shared_1.chooseTable)(args.positionals[0]);
    const fieldName = args.positionals[1];
    if (!fieldName)
        (0, ui_1.fail)(`Usage: ${config_1.BIN} field drop <table> <field> [--yes]`);
    if (session_1.session.isSystemField(fieldName)) {
        (0, ui_1.fail)(`'${fieldName}' is a system field and cannot be dropped.`);
    }
    if (!args.has('yes')) {
        const confirmed = await (0, ui_1.confirm)(`Drop field '${fieldName}' from '${tableName}'? Its values are lost.`);
        if (!confirmed) {
            (0, ui_1.info)('Cancelled.');
            return;
        }
    }
    await session_1.session.dropField(tableName, fieldName);
    (0, ui_1.ok)(`Field '${fieldName}' dropped from '${tableName}'.`);
}
async function renameField(argv) {
    const args = args_1.Args.parse(argv, { booleans: ['help'] });
    const tableName = await (0, shared_1.chooseTable)(args.positionals[0]);
    const oldName = args.positionals[1];
    const newName = args.positionals[2];
    if (!oldName || !newName) {
        (0, ui_1.fail)(`Usage: ${config_1.BIN} field rename <table> <old-field> <new-field>`);
    }
    if (session_1.session.isSystemField(oldName)) {
        (0, ui_1.fail)(`'${oldName}' is a system field and cannot be renamed.`);
    }
    if (session_1.session.isSystemField(newName)) {
        (0, ui_1.fail)(`'${newName}' is reserved for a system field.`);
    }
    session_1.session.renameField(tableName, oldName, newName);
    (0, ui_1.ok)(`Field '${oldName}' renamed to '${newName}' in '${tableName}'.`);
}
async function modifyField(argv) {
    const args = args_1.Args.parse(argv, {
        booleans: ['not-null', 'null', 'auto', 'help'],
    });
    const tableName = await (0, shared_1.chooseTable)(args.positionals[0]);
    const fieldName = args.positionals[1];
    let type = args.positionals[2];
    if (!fieldName)
        (0, ui_1.fail)(`Usage: ${config_1.BIN} field modify <table> <field> <type> [options]`);
    if (!type) {
        if (!process.stdin.isTTY) {
            (0, ui_1.fail)(`Usage: ${config_1.BIN} field modify <table> <field> <type> [options]`);
        }
        type = await (0, ui_1.ask)(`New type for '${fieldName}' ${(0, ui_1.dim)('[string]')}: `);
        type = type.trim() || 'string';
    }
    const parts = [`${fieldName}:${type}`];
    if (args.has('max'))
        parts.push(`max=${args.value('max')}`);
    if (args.has('default'))
        parts.push(`=${args.value('default') ?? ''}`);
    if (args.has('not-null'))
        parts.push('!');
    if (args.has('null'))
        parts.push('null');
    if (args.has('auto'))
        parts.push('auto');
    const field = (0, args_1.parseFieldSpec)(parts.join(':'));
    await session_1.session.modifyField(tableName, fieldName, field.type, field.option ?? {});
    (0, ui_1.ok)(`Field '${fieldName}' updated in '${tableName}'.`);
}
async function fieldCommand(argv) {
    const [action, ...rest] = argv;
    switch ((action ?? 'list').toLowerCase()) {
        case 'list':
        case 'schema':
            return (0, table_1.schemaCommand)(rest);
        case 'add':
            return addField(rest);
        case 'drop':
        case 'remove':
        case 'delete':
            return dropField(rest);
        case 'rename':
            return renameField(rest);
        case 'modify':
        case 'update':
            return modifyField(rest);
        default:
            (0, ui_1.fail)(`Unknown field action '${action}'. Try list, add, drop, rename or modify.`);
    }
}
exports.FIELD_ACTIONS = ['list', 'add', 'drop', 'rename', 'modify'];
function suggestFieldArgs(rest) {
    if (rest.length <= 1)
        return [...exports.FIELD_ACTIONS];
    const action = rest[0];
    if (['add', 'drop', 'rename', 'modify'].includes(action)) {
        if (rest.length === 2)
            return session_1.session.listTables();
        if (rest.length === 3)
            return userFields(rest[1]);
    }
    return [];
}
function fieldUsage() {
    return [
        `${config_1.BIN} field list [<table>]`,
        `${config_1.BIN} field add <table> <field:type ...>`,
        `${config_1.BIN} field rename <table> <old-field> <new-field>`,
        `${config_1.BIN} field modify <table> <field> <type> [--max <n>] [--default <value>] [--not-null|--null] [--auto]`,
        `${config_1.BIN} field drop <table> <field> [--yes]`,
    ];
}
//# sourceMappingURL=field.js.map