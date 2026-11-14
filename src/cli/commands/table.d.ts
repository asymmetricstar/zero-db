/**
 * Table commands: list / create / drop / rename / schema.
 */
/** Shared by `table schema` and `field list`. */
export declare function schemaCommand(argv: string[]): Promise<void>;
export declare function tableCommand(argv: string[]): Promise<void>;
export declare const TABLE_ACTIONS: readonly ["list", "create", "drop", "rename", "schema"];
export declare function suggestTableArgs(rest: readonly string[]): string[];
export declare function tableUsage(): string[];
//# sourceMappingURL=table.d.ts.map