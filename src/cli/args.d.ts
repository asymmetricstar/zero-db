/**
 * Zero-DB CLI — argument parsing.
 *
 * A tiny parser keeps the commands readable: positionals, repeatable flags,
 * `field=value` assignments and the compact `name:type` field syntax.
 */
import { CreateFieldDefinition, PermissionType } from '../types';
export interface ParseOptions {
    /** Flags that never consume the next token. */
    booleans?: readonly string[];
    /** Short/long aliases, e.g. `{ w: 'where', n: 'limit' }`. */
    aliases?: Readonly<Record<string, string>>;
}
export declare class Args {
    readonly positionals: string[];
    private readonly flags;
    private constructor();
    static parse(argv: readonly string[], options?: ParseOptions): Args;
    has(name: string): boolean;
    value(name: string): string | undefined;
    values(name: string): string[];
    /** Repeatable `--where field=value` and friends. */
    pairs(name: string, label?: string): Record<string, string>;
    /** `field=value` positionals passed to add/update. */
    assignments(name?: string): Record<string, string>;
    int(name: string, label?: string): number | undefined;
}
/** Parse strings like `id=1`, keeping everything after the first `=`. */
export declare function parsePairs(values: readonly string[], label: string): Record<string, string>;
/** Split a comma separated list, dropping empty entries. */
export declare function splitList(value: string | undefined): string[];
/** Used by the interactive add/update wizards. */
export declare function tokenizePairs(text: string): string[];
/**
 * `name:type` plus optional suffixes:
 *
 *   id:auto              auto increment
 *   email:string:!       NOT NULL
 *   bio:string:500       maxLength 500
 *   active:boolean:=true default value
 *   note:string:default=hello
 */
export declare function parseFieldSpec(spec: string): CreateFieldDefinition;
/**
 * Accepts a number (`15`), a name list (`add,list`), aliases (`read`, `crud`,
 * `all`, `none`) and returns what ZeroDB's addUser/updateUser expects.
 */
export declare function parsePermissions(input: string | undefined): PermissionType[] | number | undefined;
/** Bits for display and for sorting users. */
export declare function permissionBits(value: PermissionType[] | number): number;
export declare function permissionLabel(bits: number): string;
/** yes/no/true/false/on/off/1/0, or undefined for "leave unchanged". */
export declare function parseYesNo(input: string | undefined): boolean | undefined;
//# sourceMappingURL=args.d.ts.map