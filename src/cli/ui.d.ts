/**
 * Zero-DB CLI — terminal helpers.
 *
 * Commands ask their questions through the interactive shell when one is
 * running, so a single readline owns stdin and the display never garbles.
 */
import { bold, cyan, dim, faint, green, red, yellow, accentBlue, accentGreen, accentRed, formatCount, keyValue, table } from './theme';
export { bold, cyan, dim, faint, green, red, yellow, accentBlue, accentGreen, accentRed, formatCount, keyValue, table, };
/** A successful step. */
export declare function ok(message: string): void;
/** A neutral next step or piece of information. */
export declare function info(message: string): void;
/** A warning that does not stop the command. */
export declare function warn(message: string): void;
/** Stop the command with a readable error. */
export declare function fail(message: string): never;
export declare function printJson(value: unknown): void;
export interface PromptHandlers {
    ask(question: string): Promise<string>;
    askSecret(question: string): Promise<string>;
}
/** Install or remove the prompt handlers used by `ask`/`askSecret`. */
export declare function usePromptHandlers(handlers: PromptHandlers | null): void;
/** Read one line from the terminal, trimmed. */
export declare function ask(question: string): Promise<string>;
/** Read a password without echoing it; falls back to a normal line off a TTY. */
export declare function askSecret(question: string): Promise<string>;
/** Ask a yes/no question; non-interactive runs use the fallback. */
export declare function confirm(question: string, fallback?: boolean): Promise<boolean>;
/**
 * Numbered picker, used when a database/table argument is omitted.
 * Typing the name itself also works.
 */
export declare function pick(label: string, items: readonly string[]): Promise<string>;
//# sourceMappingURL=ui.d.ts.map