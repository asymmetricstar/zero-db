/**
 * Zero-DB CLI — interactive shell.
 *
 * History, tab completion and numbered pickers follow the same patterns as the
 * other terminal clients: one readline owns stdin, commands ask questions
 * through it, and every command line is queued so asynchronous output stays in
 * order.
 */
/**
 * Interactive shell: the same commands as the one-shot CLI, with history, tab
 * completion and a prompt. Runs until `exit`, Ctrl+C on an empty line or EOF.
 */
export declare function startShell(): Promise<void>;
//# sourceMappingURL=repl.d.ts.map