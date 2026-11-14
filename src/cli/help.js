"use strict";
/**
 * Zero-DB CLI — `help` and `--version`.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printVersion = printVersion;
exports.printHelp = printHelp;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const config_1 = require("./config");
const registry_1 = require("./commands/registry");
const theme_1 = require("./theme");
function packageVersion() {
    try {
        const raw = node_fs_1.default.readFileSync(node_path_1.default.join(__dirname, '..', '..', 'package.json'), 'utf8');
        const parsed = JSON.parse(raw);
        return parsed.version ?? '0.0.0';
    }
    catch {
        return '0.0.0';
    }
}
/** `--version`: one line, safe for scripts. */
function printVersion() {
    console.log(`${config_1.BIN} ${packageVersion()}`);
}
/** Grouped command list with usage and shell hints. */
function printHelp() {
    const out = [''];
    out.push(`  ${(0, theme_1.bold)('Zero DB')} ${(0, theme_1.dim)('(Database Editor)')} ${(0, theme_1.faint)(`v${packageVersion()}`)}`);
    out.push('');
    out.push(`  ${(0, theme_1.dim)('usage')}  ${(0, theme_1.cyan)(config_1.BIN)} ${(0, theme_1.dim)('<command> [options]')}`);
    out.push(`         ${(0, theme_1.cyan)(config_1.BIN)} ${(0, theme_1.dim)('start the interactive shell')}`);
    out.push(`         ${(0, theme_1.cyan)(config_1.BIN)} ${(0, theme_1.dim)('help <command>')}`);
    const nameWidth = Math.max(...registry_1.COMMANDS.map((command) => command.name.length));
    const aliasLabels = registry_1.COMMANDS.map((command) => command.aliases?.length ? `(${command.aliases.join(', ')})` : '');
    const aliasWidth = Math.max(0, ...aliasLabels.map((label) => label.length));
    for (const group of registry_1.GROUPS) {
        out.push('');
        out.push(`  ${(0, theme_1.cyan)('●')} ${(0, theme_1.bold)(group)}`);
        registry_1.COMMANDS.forEach((command, index) => {
            if (command.group !== group)
                return;
            const alias = aliasWidth === 0
                ? ''
                : `${(0, theme_1.faint)((aliasLabels[index] ?? '').padEnd(aliasWidth))}  `;
            out.push(`    ${(0, theme_1.cyan)(command.name.padEnd(nameWidth))}  ${alias}${command.summary}`);
        });
    }
    const section = (title) => {
        out.push('');
        out.push(`  ${(0, theme_1.cyan)('●')} ${(0, theme_1.bold)(title)}`);
    };
    const example = (command, note) => {
        out.push(`    ${(0, theme_1.dim)(command.padEnd(38))}${note ? (0, theme_1.faint)(note) : ''}`);
    };
    section('Examples');
    example(`${config_1.BIN} connect <path>`, 'choose a database root folder');
    example(`${config_1.BIN} use <database>`, 'switch database');
    example(`${config_1.BIN} table create <table> id:auto <field>:string`);
    example(`${config_1.BIN} find <table> --where <field>=<value> --json`);
    example(`${config_1.BIN} add <table> <field>=<value> --yes`);
    example(`${config_1.BIN} user add <user> --perm all --grand`);
    section('Shell');
    out.push(`    ${(0, theme_1.dim)('help · clear · exit')}   ${(0, theme_1.faint)('↑↓ history · tab complete · Ctrl+C cancels')}`);
    out.push(`    ${(0, theme_1.green)('✓')} ${(0, theme_1.dim)('the banner shows the signed-in user and selected database')}`);
    out.push('');
    console.log(out.join('\n'));
}
//# sourceMappingURL=help.js.map