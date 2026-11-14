"use strict";
/**
 * Zero-DB CLI — argument parsing.
 *
 * A tiny parser keeps the commands readable: positionals, repeatable flags,
 * `field=value` assignments and the compact `name:type` field syntax.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Args = void 0;
exports.parsePairs = parsePairs;
exports.splitList = splitList;
exports.tokenizePairs = tokenizePairs;
exports.parseFieldSpec = parseFieldSpec;
exports.parsePermissions = parsePermissions;
exports.permissionBits = permissionBits;
exports.permissionLabel = permissionLabel;
exports.parseYesNo = parseYesNo;
const errors_1 = require("./errors");
const types_1 = require("../types");
class Args {
    constructor(positionals, flags) {
        this.positionals = positionals;
        this.flags = flags;
    }
    static parse(argv, options = {}) {
        const booleans = new Set(options.booleans ?? []);
        const aliases = options.aliases ?? {};
        const positionals = [];
        const flags = new Map();
        let current = null;
        for (const raw of argv) {
            if (raw === '--') {
                current = null;
                continue;
            }
            if (/^--?[A-Za-z]/.test(raw)) {
                let name = raw.replace(/^--?/, '');
                let inlineValue;
                const equals = name.indexOf('=');
                if (equals !== -1) {
                    inlineValue = name.slice(equals + 1);
                    name = name.slice(0, equals);
                }
                name = aliases[name] ?? name;
                if (!flags.has(name))
                    flags.set(name, []);
                if (inlineValue !== undefined)
                    flags.get(name).push(inlineValue);
                current = booleans.has(name) ? null : name;
                continue;
            }
            if (current !== null) {
                flags.get(current).push(raw);
                current = null;
                continue;
            }
            positionals.push(raw);
        }
        return new Args(positionals, flags);
    }
    has(name) {
        return this.flags.has(name);
    }
    value(name) {
        return this.flags.get(name)?.[0];
    }
    values(name) {
        return [...(this.flags.get(name) ?? [])];
    }
    /** Repeatable `--where field=value` and friends. */
    pairs(name, label = `--${name}`) {
        return parsePairs(this.values(name), label);
    }
    /** `field=value` positionals passed to add/update. */
    assignments(name = 'value') {
        return parsePairs(this.positionals, name);
    }
    int(name, label = `--${name}`) {
        const raw = this.value(name);
        if (raw === undefined)
            return undefined;
        const parsed = Number(raw);
        if (!Number.isInteger(parsed) || parsed < 0) {
            throw new errors_1.CliError(`${label} expects a positive whole number (got '${raw}').`);
        }
        return parsed;
    }
}
exports.Args = Args;
/** Parse strings like `id=1`, keeping everything after the first `=`. */
function parsePairs(values, label) {
    const pairs = {};
    for (const value of values) {
        const equals = value.indexOf('=');
        if (equals <= 0) {
            throw new errors_1.CliError(`${label} expects field=value (got '${value}').`);
        }
        pairs[value.slice(0, equals)] = value.slice(equals + 1);
    }
    return pairs;
}
/** Split a comma separated list, dropping empty entries. */
function splitList(value) {
    if (!value)
        return [];
    return value
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part !== '');
}
/** Used by the interactive add/update wizards. */
function tokenizePairs(text) {
    return text
        .split(/[\s,]+/)
        .map((part) => part.trim())
        .filter((part) => part !== '');
}
const FIELD_TYPES = [
    'auto',
    'string',
    'number',
    'boolean',
    'timestamp',
    'object',
    'any',
];
/**
 * `name:type` plus optional suffixes:
 *
 *   id:auto              auto increment
 *   email:string:!       NOT NULL
 *   bio:string:500       maxLength 500
 *   active:boolean:=true default value
 *   note:string:default=hello
 */
function parseFieldSpec(spec) {
    const parts = spec.split(':');
    const name = (parts[0] ?? '').trim();
    const typeName = (parts[1] ?? '').trim().toLowerCase();
    if (name === '') {
        throw new errors_1.CliError(`Field spec '${spec}' is missing a name (use name:type).`);
    }
    if (!FIELD_TYPES.includes(typeName)) {
        throw new errors_1.CliError(`Unknown field type '${typeName}' for '${name}'. Use ${FIELD_TYPES.join(', ')}.`);
    }
    const type = typeName;
    const option = {};
    if (type === 'auto')
        option.isAuto = true;
    for (const raw of parts.slice(2)) {
        const token = raw.trim();
        if (token === '')
            continue;
        const lower = token.toLowerCase();
        if (lower === 'auto') {
            option.isAuto = true;
            continue;
        }
        if (lower === '!' || lower === 'notnull' || lower === 'required') {
            option.allowNull = false;
            continue;
        }
        if (token.startsWith('!=')) {
            option.allowNull = false;
            option.defaultValue = token.slice(2);
            continue;
        }
        if (lower === 'null' || lower === 'nullable') {
            option.allowNull = true;
            continue;
        }
        if (lower.startsWith('max=')) {
            const max = Number(lower.slice(4));
            if (!Number.isInteger(max) || max <= 0) {
                throw new errors_1.CliError(`Invalid maxLength '${token}' for '${name}'.`);
            }
            option.maxLength = max;
            continue;
        }
        if (/^\d+$/.test(lower)) {
            const max = Number(lower);
            if (max <= 0)
                throw new errors_1.CliError(`Invalid maxLength '${token}' for '${name}'.`);
            option.maxLength = max;
            continue;
        }
        if (token.startsWith('=')) {
            option.defaultValue = token.slice(1);
            continue;
        }
        if (lower.startsWith('default=')) {
            option.defaultValue = token.slice('default='.length);
            continue;
        }
        throw new errors_1.CliError(`Unknown field option '${token}' for '${name}'.`);
    }
    return Object.keys(option).length > 0 ? { name, type, option } : { name, type };
}
const PERMISSION_ALIASES = {
    read: ['list'],
    write: ['add', 'update'],
    crud: ['add', 'delete', 'list', 'update'],
    admin: ['add', 'delete', 'list', 'update', 'create', 'drop', 'rename'],
};
/**
 * Accepts a number (`15`), a name list (`add,list`), aliases (`read`, `crud`,
 * `all`, `none`) and returns what ZeroDB's addUser/updateUser expects.
 */
function parsePermissions(input) {
    if (input === undefined)
        return undefined;
    const value = input.trim().toLowerCase();
    if (value === '')
        return undefined;
    if (value === 'all' || value === 'admin' || value === '*') {
        return 127;
    }
    if (value === 'none')
        return 0;
    if (/^\d+$/.test(value))
        return Number(value);
    const result = new Set();
    for (const raw of value.split(/[,\s]+/).filter((part) => part !== '')) {
        const alias = PERMISSION_ALIASES[raw];
        if (alias) {
            for (const type of alias)
                result.add(type);
            continue;
        }
        if (raw in types_1.PERMISSION_BITS) {
            result.add(raw);
            continue;
        }
        throw new errors_1.CliError(`Unknown permission '${raw}'. Use ${Object.keys(types_1.PERMISSION_BITS).join(', ')}.`);
    }
    return [...result];
}
/** Bits for display and for sorting users. */
function permissionBits(value) {
    if (typeof value === 'number')
        return value;
    return value.reduce((bits, type) => bits | types_1.PERMISSION_BITS[type], 0);
}
function permissionLabel(bits) {
    if (bits < 0)
        return '-';
    const names = Object.keys(types_1.PERMISSION_BITS).filter((type) => (bits & types_1.PERMISSION_BITS[type]) === types_1.PERMISSION_BITS[type]);
    return names.length === 0 ? 'none' : names.join(', ');
}
/** yes/no/true/false/on/off/1/0, or undefined for "leave unchanged". */
function parseYesNo(input) {
    if (input === undefined)
        return undefined;
    const value = input.trim().toLowerCase();
    if (value === '')
        return undefined;
    if (['y', 'yes', 'true', '1', 'on', 'enabled'].includes(value))
        return true;
    if (['n', 'no', 'false', '0', 'off', 'disabled'].includes(value))
        return false;
    throw new errors_1.CliError(`Expected yes or no (got '${input}').`);
}
//# sourceMappingURL=args.js.map