/**
 * Database commands: list / create / drop / rename / info / public / use.
 */
export declare function dbCommand(argv: string[]): Promise<void>;
export declare const DB_ACTIONS: readonly ["list", "create", "drop", "rename", "info", "public", "use"];
export declare function suggestDatabaseArgs(rest: readonly string[]): string[];
export declare function dbUsage(action?: string): string[];
//# sourceMappingURL=database.d.ts.map