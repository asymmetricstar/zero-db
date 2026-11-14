/**
 * Record commands: find / count / add / update / remove.
 */
export declare function findCommand(argv: string[]): Promise<void>;
export declare function countCommand(argv: string[]): Promise<void>;
export declare function addCommand(argv: string[]): Promise<void>;
export declare function updateCommand(argv: string[]): Promise<void>;
export declare function removeCommand(argv: string[]): Promise<void>;
export declare const RECORD_NAMES: readonly ["find", "count", "add", "update", "remove"];
export declare function suggestRecordArgs(rest: readonly string[]): string[];
export declare function findUsage(): string[];
export declare function recordUsage(): string[];
//# sourceMappingURL=record.d.ts.map