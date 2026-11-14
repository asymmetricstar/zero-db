/**
 * Zero-DB CLI — error helpers
 * A command failure is reported as a one-line message by the shell.
 */
export declare class CliError extends Error {
    constructor(message: string);
}
/** Turn anything thrown into a readable, single-line message. */
export declare function errorMessage(error: unknown): string;
//# sourceMappingURL=errors.d.ts.map