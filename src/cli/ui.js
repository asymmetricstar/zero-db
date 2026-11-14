"use strict";
/**
 * Zero-DB CLI — terminal helpers.
 *
 * Commands ask their questions through the interactive shell when one is
 * running, so a single readline owns stdin and the display never garbles.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.table = exports.keyValue = exports.formatCount = exports.accentRed = exports.accentGreen = exports.accentBlue = exports.yellow = exports.red = exports.green = exports.faint = exports.dim = exports.cyan = exports.bold = void 0;
exports.ok = ok;
exports.info = info;
exports.warn = warn;
exports.fail = fail;
exports.printJson = printJson;
exports.usePromptHandlers = usePromptHandlers;
exports.ask = ask;
exports.askSecret = askSecret;
exports.confirm = confirm;
exports.pick = pick;
const node_readline_1 = __importDefault(require("node:readline"));
const errors_1 = require("./errors");
const theme_1 = require("./theme");
Object.defineProperty(exports, "bold", { enumerable: true, get: function () { return theme_1.bold; } });
Object.defineProperty(exports, "cyan", { enumerable: true, get: function () { return theme_1.cyan; } });
Object.defineProperty(exports, "dim", { enumerable: true, get: function () { return theme_1.dim; } });
Object.defineProperty(exports, "faint", { enumerable: true, get: function () { return theme_1.faint; } });
Object.defineProperty(exports, "green", { enumerable: true, get: function () { return theme_1.green; } });
Object.defineProperty(exports, "red", { enumerable: true, get: function () { return theme_1.red; } });
Object.defineProperty(exports, "yellow", { enumerable: true, get: function () { return theme_1.yellow; } });
Object.defineProperty(exports, "accentBlue", { enumerable: true, get: function () { return theme_1.accentBlue; } });
Object.defineProperty(exports, "accentGreen", { enumerable: true, get: function () { return theme_1.accentGreen; } });
Object.defineProperty(exports, "accentRed", { enumerable: true, get: function () { return theme_1.accentRed; } });
Object.defineProperty(exports, "formatCount", { enumerable: true, get: function () { return theme_1.formatCount; } });
Object.defineProperty(exports, "keyValue", { enumerable: true, get: function () { return theme_1.keyValue; } });
Object.defineProperty(exports, "table", { enumerable: true, get: function () { return theme_1.table; } });
/** A successful step. */
function ok(message) {
    console.log(`${(0, theme_1.green)('✓')} ${message}`);
}
/** A neutral next step or piece of information. */
function info(message) {
    console.log(`${(0, theme_1.cyan)('→')} ${message}`);
}
/** A warning that does not stop the command. */
function warn(message) {
    console.error(`${(0, theme_1.yellow)('!')} ${message}`);
}
/** Stop the command with a readable error. */
function fail(message) {
    throw new errors_1.CliError(message);
}
function printJson(value) {
    console.log(JSON.stringify(value, null, 2));
}
let promptHandlers = null;
/** Install or remove the prompt handlers used by `ask`/`askSecret`. */
function usePromptHandlers(handlers) {
    promptHandlers = handlers;
}
function askWith(rl, question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
        rl.once('close', () => resolve(''));
    });
}
/** Read one line from the terminal, trimmed. */
async function ask(question) {
    if (promptHandlers)
        return promptHandlers.ask(question);
    const rl = node_readline_1.default.createInterface({ input: process.stdin, output: process.stdout });
    try {
        return (await askWith(rl, question)).trim();
    }
    finally {
        rl.close();
        await new Promise((resolve) => setImmediate(resolve));
    }
}
/** Read a password without echoing it; falls back to a normal line off a TTY. */
async function askSecret(question) {
    if (promptHandlers)
        return promptHandlers.askSecret(question);
    if (!process.stdin.isTTY)
        return ask(question);
    const rl = node_readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
    });
    return new Promise((resolve) => {
        const internal = rl;
        const echo = internal._writeToOutput;
        internal._writeToOutput = echo;
        rl.setPrompt(question);
        rl.prompt();
        internal._writeToOutput = () => { };
        rl.once('close', () => {
            internal._writeToOutput = echo;
            resolve('');
        });
        rl.once('line', (answer) => {
            internal._writeToOutput = echo;
            process.stdout.write('\n');
            rl.close();
            setImmediate(() => resolve(answer));
        });
    });
}
/** Ask a yes/no question; non-interactive runs use the fallback. */
async function confirm(question, fallback = false) {
    if (!process.stdin.isTTY)
        return fallback;
    const answer = (await ask(`${question} ${fallback ? '[Y/n]' : '[y/N]'} `)).toLowerCase();
    if (answer === '')
        return fallback;
    return answer === 'y' || answer === 'yes';
}
/**
 * Numbered picker, used when a database/table argument is omitted.
 * Typing the name itself also works.
 */
async function pick(label, items) {
    if (items.length === 0)
        fail(`No ${label} available.`);
    if (items.length === 1)
        return items[0];
    console.log('');
    items.forEach((item, index) => {
        console.log(`  ${(0, theme_1.cyan)(`[${index + 1}]`)} ${item}`);
    });
    console.log('');
    const answer = (await ask(`Select ${label} ${(0, theme_1.faint)(`[1-${items.length}]`)}: `)).trim();
    const number = Number(answer);
    if (Number.isInteger(number) && number >= 1 && number <= items.length) {
        return items[number - 1];
    }
    const exact = items.find((item) => item === answer);
    if (exact)
        return exact;
    fail(`Invalid selection '${answer}'.`);
}
//# sourceMappingURL=ui.js.map