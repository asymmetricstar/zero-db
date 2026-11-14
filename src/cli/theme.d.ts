/**
 * Zero-DB CLI — palette, banner, prompt and table rendering.
 *
 * The layout mirrors the existing command-line projects: a compact terminal
 * palette, a small state banner and a path-aware prompt.
 */
import type { SessionInfo } from './session';
/** Structural lines and separators. */
export declare const faint: (text: string) => string;
/** Secondary text, metadata and hints. */
export declare const dim: (text: string) => string;
export declare const bold: (text: string) => string;
export declare const red: (text: string) => string;
export declare const green: (text: string) => string;
export declare const yellow: (text: string) => string;
/** The single accent colour: nodes, command names, links. */
export declare const cyan: (text: string) => string;
export declare const accentGreen: (text: string) => string;
export declare const accentBlue: (text: string) => string;
export declare const accentRed: (text: string) => string;
/** Length of a styled string as it appears on screen. */
export declare function visibleWidth(value: string): number;
/** Pad a styled string to a visible width. */
export declare function padVisible(value: string, width: number): string;
export declare const DEFAULT_BANNER_WIDTH = 34;
/**
 * Session banner:
 *
 *   ├──────────────────────────────────
 *   ├─ Zero DB (Database Editor)
 *   ├─ Status   : @<user> ● Logged in
 *   ├─ Database : <database>
 *   ├──────────────────────────────────
 */
export declare function banner(info: SessionInfo): string;
/** `$ user@database ` — the prompt shown while the shell waits for input. */
export declare function promptText(info: SessionInfo): string;
/**
 * A small aligned table with a dashed header underline. Cell values are plain
 * text; the header is styled after the columns have been measured.
 */
export declare function table(headers: readonly string[], rows: readonly (readonly string[])[]): string;
/** Label/value block used by `status`, `db info` and `table schema`. */
export declare function keyValue(entries: readonly (readonly [string, string])[]): string;
/** One-line cell rendering for query results. */
export declare function cell(value: unknown, maxLength?: number): string;
export declare function formatCount(count: number, singular: string, plural?: string): string;
//# sourceMappingURL=theme.d.ts.map