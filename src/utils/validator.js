"use strict";
/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZeroDBError = void 0;
exports.ok = ok;
exports.err = err;
exports.safe = safe;
exports.safeAsync = safeAsync;
function ok(data) {
    return { ok: true, data };
}
function err(error) {
    return { ok: false, error };
}
function safe(fn) {
    try {
        return ok(fn());
    }
    catch (e) {
        return err(e.message || 'Unknown error');
    }
}
async function safeAsync(fn) {
    try {
        return ok(await fn());
    }
    catch (e) {
        return err(e.message || 'Unknown error');
    }
}
class ZeroDBError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ZeroDBError';
    }
}
exports.ZeroDBError = ZeroDBError;
//# sourceMappingURL=validator.js.map