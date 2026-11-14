/**
 * Command registry — one table drives dispatch, help, completion and aliases.
 */
export type CommandGroup = 'Connection' | 'Databases' | 'Tables' | 'Records' | 'Users' | 'System';
export interface CommandSpec {
    name: string;
    aliases?: readonly string[];
    group: CommandGroup;
    /** One line for `help`. */
    summary: string;
    /** Options offered by tab completion. */
    flags?: readonly string[];
    /** Usage lines shown by `help <command>`. */
    usage?: readonly string[];
    /** If true, the first argument completes as a folder/file path. */
    pathCompletes?: boolean;
    /** Dynamic candidates for the rest of the line (the current token included). */
    suggest?: (rest: readonly string[]) => string[];
    run: (argv: string[]) => Promise<void> | void;
}
/**
 * Commands are grouped by what they operate on, so the help screen mirrors the
 * database hierarchy: connection → databases → tables → records → users.
 */
export declare const COMMANDS: readonly CommandSpec[];
export declare const GROUPS: readonly CommandGroup[];
/** Commands the interactive shell handles itself. */
export declare const SHELL_BUILTINS: readonly ["clear", "exit", "help"];
/** Look a command up by name or alias, case-insensitively. */
export declare function findCommand(name: string): CommandSpec | undefined;
/** Every accepted command word, sorted, for completion. */
export declare function commandNames(): string[];
/** Usage block for `help <command>` and `<command> --help`. */
export declare function printCommandHelp(spec: CommandSpec): void;
/** Run one command line; unknown names fail like the one-shot CLI does. */
export declare function dispatch(argv: string[]): Promise<void>;
//# sourceMappingURL=registry.d.ts.map