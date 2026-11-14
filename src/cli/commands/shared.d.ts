/**
 * Helpers shared by the command modules.
 */
import { session } from '../session';
/** Print the state banner (after connect/use/login/logout). */
export declare function printBanner(): void;
/** A table name from the arguments, or a numbered picker in a terminal. */
export declare function chooseTable(name?: string): Promise<string>;
/** A database name from the arguments, or a numbered picker in a terminal. */
export declare function chooseDatabase(name?: string): Promise<string>;
/** `20261114-153012`, used for the default backup file name. */
export declare function timestamp(): string;
export { session };
//# sourceMappingURL=shared.d.ts.map