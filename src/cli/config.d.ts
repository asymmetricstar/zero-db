/**
 * Zero-DB CLI — local settings.
 *
 * Only the last root folder, database and username are stored. Passwords are
 * never written to disk by the CLI.
 */
export declare const BIN = "zerodb";
export interface StoredConfig {
    /** Folder that contains registry.zdb, schema.zdb and manifest.zdb. */
    rootPath?: string;
    /** Last database selected with `use`. */
    lastDatabase?: string;
    /** Last successfully signed-in username (used as a prompt default). */
    lastUser?: string;
    /** Cache size passed to the engine, in MB. */
    cacheMB?: number;
}
/** `~/.zerodb`, overridable with ZERODB_HOME. */
export declare function configDir(): string;
export declare function configFilePath(): string;
export declare function historyFile(): string;
export declare function defaultRootPath(): string;
/** ZERODB_PATH wins over the saved folder so scripts can target a database. */
export declare function resolveRootPath(configured?: string): string;
/** A separate backup folder per database root, under the CLI config folder. */
export declare function backupDir(rootPath: string): string;
export declare function readStoredConfig(): StoredConfig;
export declare function writeStoredConfig(config: StoredConfig): void;
//# sourceMappingURL=config.d.ts.map