/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
export type ZeroDBResult<T = void> = {
    ok: true;
    data: T;
} | {
    ok: false;
    error: string;
};
export declare function ok<T>(data: T): ZeroDBResult<T>;
export declare function err<T>(error: string): ZeroDBResult<T>;
export declare function safe<T>(fn: () => T): ZeroDBResult<T>;
export declare function safeAsync<T>(fn: () => Promise<T>): Promise<ZeroDBResult<T>>;
export declare class ZeroDBError extends Error {
    constructor(message: string);
}
//# sourceMappingURL=validator.d.ts.map