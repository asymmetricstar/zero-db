"use strict";
/**
 * Helpers shared by the command modules.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.session = void 0;
exports.printBanner = printBanner;
exports.chooseTable = chooseTable;
exports.chooseDatabase = chooseDatabase;
exports.timestamp = timestamp;
const session_1 = require("../session");
Object.defineProperty(exports, "session", { enumerable: true, get: function () { return session_1.session; } });
const theme_1 = require("../theme");
const ui_1 = require("../ui");
/** Print the state banner (after connect/use/login/logout). */
function printBanner() {
    console.log('');
    console.log((0, theme_1.banner)(session_1.session.info));
}
/** A table name from the arguments, or a numbered picker in a terminal. */
async function chooseTable(name) {
    if (name)
        return name;
    session_1.session.requireDatabase();
    const tables = session_1.session.listTables();
    if (tables.length === 0) {
        (0, ui_1.fail)('No tables in this database. Create one with `table create <table> <field:type ...>`.');
    }
    if (!process.stdin.isTTY) {
        (0, ui_1.fail)(`Specify a table name (available: ${tables.join(', ')}).`);
    }
    return (0, ui_1.pick)('table', tables);
}
/** A database name from the arguments, or a numbered picker in a terminal. */
async function chooseDatabase(name) {
    if (name)
        return name;
    if (session_1.session.hasDatabase())
        return session_1.session.requireDatabase();
    const databases = session_1.session.listDatabases();
    if (databases.length === 0) {
        (0, ui_1.fail)('No databases found. Create one with `db create <database>`.');
    }
    if (!process.stdin.isTTY) {
        (0, ui_1.fail)(`Specify a database name (available: ${databases.join(', ')}).`);
    }
    return (0, ui_1.pick)('database', databases);
}
/** `20261114-153012`, used for the default backup file name. */
function timestamp() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    return (`${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
        `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`);
}
//# sourceMappingURL=shared.js.map