"use strict";
/**
 * Zero-DB CLI — error helpers
 * A command failure is reported as a one-line message by the shell.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CliError = void 0;
exports.errorMessage = errorMessage;
class CliError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CliError';
    }
}
exports.CliError = CliError;
/** Turn anything thrown into a readable, single-line message. */
function errorMessage(error) {
    if (error instanceof Error)
        return error.message;
    if (typeof error === 'string')
        return error;
    if (error === undefined || error === null)
        return 'Unknown error';
    return String(error);
}
//# sourceMappingURL=errors.js.map