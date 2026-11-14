/**
 * User commands: list / add / update / delete / owner, plus whoami.
 */
import { PermissionType } from '../../types';
/**
 * Parse the permission menu answer. Numbers may be separated (`1,4` / `1 4`)
 * or compact (`14`, `1234`, `17`); names work too (`add,update`). `a`/`all`
 * selects everything and `n`/`none` clears the selection.
 */
export declare function parsePermissionSelection(input: string): PermissionType[];
export declare function userCommand(argv: string[]): Promise<void>;
/** Current account and selected database. */
export declare function whoamiCommand(argv: string[]): void;
export declare const USER_ACTIONS: readonly ["list", "add", "update", "delete", "owner"];
export declare function suggestUserArgs(rest: readonly string[]): string[];
export declare function userUsage(): string[];
//# sourceMappingURL=user.d.ts.map