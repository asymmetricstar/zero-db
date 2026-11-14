"use strict";
/**
 * Zero-DB CLI — palette, banner, prompt and table rendering.
 *
 * The layout mirrors the existing command-line projects: a compact terminal
 * palette, a small state banner and a path-aware prompt.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_BANNER_WIDTH = exports.accentRed = exports.accentBlue = exports.accentGreen = exports.cyan = exports.yellow = exports.green = exports.red = exports.bold = exports.dim = exports.faint = void 0;
exports.visibleWidth = visibleWidth;
exports.padVisible = padVisible;
exports.banner = banner;
exports.promptText = promptText;
exports.table = table;
exports.keyValue = keyValue;
exports.cell = cell;
exports.formatCount = formatCount;
/** Colour is only used on a real terminal; piped output stays plain. */
const colour = Boolean(process.stdout.isTTY) && process.env.NO_COLOR === undefined;
const paint = (spec) => (text) => colour ? `\u001b[${spec}m${text}\u001b[0m` : text;
/** Structural lines and separators. */
exports.faint = paint('38;5;240');
/** Secondary text, metadata and hints. */
exports.dim = paint('38;5;246');
exports.bold = paint('1');
exports.red = paint('38;5;203');
exports.green = paint('38;5;114');
exports.yellow = paint('38;5;179');
/** The single accent colour: nodes, command names, links. */
exports.cyan = paint('38;5;75');
const paintHex = (r, g, b) => paint(`38;2;${r};${g};${b}`);
exports.accentGreen = paintHex(0x17, 0xb8, 0x8b);
exports.accentBlue = paintHex(0x58, 0xa1, 0xff);
exports.accentRed = paintHex(0xdc, 0x5b, 0x5e);
const ANSI = /\u001b\[[0-9;]*m/g;
/** Length of a styled string as it appears on screen. */
function visibleWidth(value) {
    return value.replace(ANSI, '').length;
}
/** Pad a styled string to a visible width. */
function padVisible(value, width) {
    const missing = width - visibleWidth(value);
    return missing > 0 ? `${value}${' '.repeat(missing)}` : value;
}
exports.DEFAULT_BANNER_WIDTH = 34;
/**
 * Session banner:
 *
 *   ├──────────────────────────────────
 *   ├─ Zero DB (Database Editor)
 *   ├─ Status   : @<user> ● Logged in
 *   ├─ Database : <database>
 *   ├──────────────────────────────────
 */
function banner(info) {
    const rows = [];
    rows.push(`├─ ${(0, exports.bold)('Zero DB')} ${(0, exports.dim)('(Database Editor)')}`);
    let status;
    if (info.loggedIn) {
        const suffix = info.systemAdmin ? ` ${(0, exports.faint)('·')} ${(0, exports.dim)('system admin')}` : '';
        status = `${(0, exports.faint)('@')}${(0, exports.accentGreen)(info.user)} ${(0, exports.green)('●')} ${(0, exports.dim)('Logged in')}${suffix}`;
    }
    else if (info.database) {
        status = `${(0, exports.faint)('@')}${(0, exports.dim)(info.user || 'guest')} ${(0, exports.faint)('○')} ${(0, exports.dim)('Guest access')}`;
    }
    else {
        status = `${(0, exports.faint)('@')}${(0, exports.dim)('guest')} ${(0, exports.faint)('○')} ${(0, exports.dim)('Not logged in')}`;
    }
    rows.push(`├─ ${(0, exports.dim)('Status'.padEnd(8))} : ${status}`);
    const database = info.database ? (0, exports.accentBlue)(info.database) : (0, exports.dim)('—');
    rows.push(`├─ ${(0, exports.dim)('Database'.padEnd(8))} : ${database}`);
    const longest = Math.max(...rows.map((row) => visibleWidth(row) - 1));
    const width = Math.max(exports.DEFAULT_BANNER_WIDTH, longest);
    const border = (0, exports.faint)(`├${'─'.repeat(width)}`);
    return [border, ...rows, border].join('\n');
}
/** `$ user@database ` — the prompt shown while the shell waits for input. */
function promptText(info) {
    const user = info.loggedIn
        ? (0, exports.accentGreen)(info.user)
        : info.database
            ? (0, exports.accentBlue)(info.user || 'guest')
            : (0, exports.dim)(info.user || 'guest');
    const database = info.database ? (0, exports.accentBlue)(info.database) : (0, exports.dim)('—');
    return `${(0, exports.faint)('$')} ${user}${(0, exports.faint)('@')}${database} `;
}
/**
 * A small aligned table with a dashed header underline. Cell values are plain
 * text; the header is styled after the columns have been measured.
 */
function table(headers, rows) {
    const widths = headers.map((header, index) => Math.max(header.length, ...rows.map((row) => (row[index] ?? '').length)));
    const pad = (cells) => cells.map((cell, index) => (cell ?? '').padEnd(widths[index] ?? 0));
    const line = (cells) => pad(cells).join('  ').trimEnd();
    return [
        pad(headers)
            .map((cell) => (0, exports.bold)(cell))
            .join('  ')
            .trimEnd(),
        widths.map((width) => (0, exports.faint)('─'.repeat(width))).join('  '),
        ...rows.map(line),
    ].join('\n');
}
/** Label/value block used by `status`, `db info` and `table schema`. */
function keyValue(entries) {
    const width = Math.max(0, ...entries.map(([label]) => label.length));
    return entries
        .map(([label, value]) => `  ${(0, exports.dim)(label.padEnd(width))}  ${value}`)
        .join('\n');
}
/** One-line cell rendering for query results. */
function cell(value, maxLength = 60) {
    const text = value === undefined || value === null ? '' : String(value);
    const oneLine = text.replace(/\r?\n/g, '\\n');
    return oneLine.length > maxLength ? `${oneLine.slice(0, maxLength - 1)}…` : oneLine;
}
function formatCount(count, singular, plural = `${singular}s`) {
    return `${(0, exports.bold)(String(count))} ${(0, exports.dim)(count === 1 ? singular : plural)}`;
}
//# sourceMappingURL=theme.js.map