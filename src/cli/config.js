"use strict";
/**
 * Zero-DB CLI — local settings.
 *
 * Only the last root folder, database and username are stored. Passwords are
 * never written to disk by the CLI.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BIN = void 0;
exports.configDir = configDir;
exports.configFilePath = configFilePath;
exports.historyFile = historyFile;
exports.defaultRootPath = defaultRootPath;
exports.resolveRootPath = resolveRootPath;
exports.backupDir = backupDir;
exports.readStoredConfig = readStoredConfig;
exports.writeStoredConfig = writeStoredConfig;
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
exports.BIN = 'zerodb';
/** `~/.zerodb`, overridable with ZERODB_HOME. */
function configDir() {
    const override = process.env.ZERODB_HOME?.trim();
    return override ? node_path_1.default.resolve(override) : node_path_1.default.join(node_os_1.default.homedir(), '.zerodb');
}
function configFilePath() {
    return node_path_1.default.join(configDir(), 'config.json');
}
function historyFile() {
    return node_path_1.default.join(configDir(), 'history');
}
function defaultRootPath() {
    return node_path_1.default.resolve(process.cwd(), 'db');
}
/** ZERODB_PATH wins over the saved folder so scripts can target a database. */
function resolveRootPath(configured) {
    const fromEnv = process.env.ZERODB_PATH?.trim();
    if (fromEnv)
        return node_path_1.default.resolve(fromEnv);
    if (configured && configured.trim() !== '')
        return node_path_1.default.resolve(configured);
    return defaultRootPath();
}
/** A separate backup folder per database root, under the CLI config folder. */
function backupDir(rootPath) {
    const hash = node_crypto_1.default.createHash('md5').update(node_path_1.default.resolve(rootPath)).digest('hex');
    return node_path_1.default.join(configDir(), 'backups', hash);
}
function readStoredConfig() {
    try {
        const raw = node_fs_1.default.readFileSync(configFilePath(), 'utf8');
        const parsed = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null)
            return {};
        return parsed;
    }
    catch {
        return {};
    }
}
function writeStoredConfig(config) {
    try {
        node_fs_1.default.mkdirSync(configDir(), { recursive: true });
        const clean = {};
        if (config.rootPath)
            clean.rootPath = config.rootPath;
        if (config.lastDatabase)
            clean.lastDatabase = config.lastDatabase;
        if (config.lastUser)
            clean.lastUser = config.lastUser;
        if (config.cacheMB !== undefined)
            clean.cacheMB = config.cacheMB;
        node_fs_1.default.writeFileSync(configFilePath(), `${JSON.stringify(clean, null, 2)}\n`, 'utf8');
    }
    catch {
        // A read-only home folder must not stop the CLI.
    }
}
//# sourceMappingURL=config.js.map