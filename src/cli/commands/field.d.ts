/**
 * Field commands: list / add / drop / rename / modify (ALTER TABLE).
 */
export declare function fieldCommand(argv: string[]): Promise<void>;
export declare const FIELD_ACTIONS: readonly ["list", "add", "drop", "rename", "modify"];
export declare function suggestFieldArgs(rest: readonly string[]): string[];
export declare function fieldUsage(): string[];
//# sourceMappingURL=field.d.ts.map