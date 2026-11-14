#!/usr/bin/env node
"use strict";
/**
 * Zero-DB CLI entry point.
 *
 *   zerodb                      interactive shell
 *   zerodb <command> [options]  one-shot command
 *
 * The engine and its module layout are untouched; this file only wires the
 * terminal interface on top of ZeroDB.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const registry_1 = require("./cli/commands/registry");
const errors_1 = require("./cli/errors");
const help_1 = require("./cli/help");
const repl_1 = require("./cli/repl");
const session_1 = require("./cli/session");
const theme_1 = require("./cli/theme");
/** Only start the shell when a person is actually looking at the terminal. */
function isInteractive() {
    return Boolean(process.stdin.isTTY) && Boolean(process.stdout.isTTY);
}
async function main(argv) {
    const [command, ...rest] = argv;
    if (command === undefined) {
        if (isInteractive()) {
            await (0, repl_1.startShell)();
        }
        else {
            (0, help_1.printHelp)();
        }
        return;
    }
    if (command === 'help' || command === '--help' || command === '-h' || command === '?') {
        const target = rest[0];
        const spec = target ? (0, registry_1.findCommand)(target) : undefined;
        if (spec)
            (0, registry_1.printCommandHelp)(spec);
        else
            (0, help_1.printHelp)();
        return;
    }
    if (command === '--version' || command === '-v' || command === 'version') {
        (0, help_1.printVersion)();
        return;
    }
    if (command === 'shell' || command === 'repl') {
        await (0, repl_1.startShell)();
        return;
    }
    await (0, registry_1.dispatch)([command, ...rest]);
}
main(process.argv.slice(2))
    .then(async () => {
    await session_1.session.dispose();
})
    .catch(async (error) => {
    console.error(`${(0, theme_1.red)('✗')} ${(0, errors_1.errorMessage)(error)}`);
    await session_1.session.dispose();
    process.exitCode = 1;
});
//# sourceMappingURL=cli.js.map