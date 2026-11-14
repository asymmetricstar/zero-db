"use strict";
/**
 * System commands: backups and restores.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupCommand = backupCommand;
exports.restoreCommand = restoreCommand;
exports.backupUsage = backupUsage;
const node_path_1 = __importDefault(require("node:path"));
const args_1 = require("../args");
const config_1 = require("../config");
const session_1 = require("../session");
const ui_1 = require("../ui");
const shared_1 = require("./shared");
async function backupCommand(argv) {
    const args = args_1.Args.parse(argv, { booleans: ['help'] });
    const requested = args.positionals[0] ?? `zerodb-${(0, shared_1.timestamp)()}.tar.gz`;
    const fileName = node_path_1.default.basename(requested);
    (0, ui_1.info)(`Backup folder: ${session_1.session.backupDirectory()}`);
    const written = await session_1.session.backup(fileName);
    (0, ui_1.ok)(`Backup written to ${written}`);
}
async function restoreCommand(argv) {
    const args = args_1.Args.parse(argv, { booleans: ['yes', 'help'] });
    const requested = args.positionals[0];
    if (!requested)
        (0, ui_1.fail)(`Usage: ${config_1.BIN} restore <file> [--yes]`);
    const fileName = node_path_1.default.basename(requested);
    if (!args.has('yes')) {
        const confirmed = await (0, ui_1.confirm)(`Restore '${fileName}' over the current database root? Existing files may be overwritten.`);
        if (!confirmed) {
            (0, ui_1.info)('Cancelled.');
            return;
        }
    }
    await session_1.session.restore(fileName);
    (0, ui_1.ok)(`Backup '${fileName}' restored.`);
}
function backupUsage() {
    return [
        `${config_1.BIN} backup [<file.tar.gz>]`,
        `${config_1.BIN} restore <file.tar.gz> [--yes]`,
        '',
        'Backups are stored under',
        `  ${session_1.session.backupDirectory()}`,
    ];
}
//# sourceMappingURL=system.js.map