"use strict";
/**
 * Zero-DB CLI — interactive shell.
 *
 * History, tab completion and numbered pickers follow the same patterns as the
 * other terminal clients: one readline owns stdin, commands ask questions
 * through it, and every command line is queued so asynchronous output stays in
 * order.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startShell = startShell;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_readline_1 = __importDefault(require("node:readline"));
const config_1 = require("./config");
const errors_1 = require("./errors");
const help_1 = require("./help");
const registry_1 = require("./commands/registry");
const session_1 = require("./session");
const theme_1 = require("./theme");
const ui_1 = require("./ui");
const HISTORY_LIMIT = 500;
const EXIT_WORDS = ['exit', 'quit', 'q', ':q'];
/** Directory and file completions for a path prefix. */
function getDirAndFileCompletions(prefix) {
    try {
        let dirToList;
        let namePrefix;
        const lastSlash = Math.max(prefix.lastIndexOf('/'), prefix.lastIndexOf('\\'));
        if (lastSlash !== -1) {
            dirToList = prefix.slice(0, lastSlash + 1);
            namePrefix = prefix.slice(lastSlash + 1);
        }
        else {
            dirToList = '.';
            namePrefix = prefix;
        }
        let resolveBase = dirToList === '.' ? process.cwd() : dirToList;
        if (resolveBase === './' || resolveBase === '.\\')
            resolveBase = process.cwd();
        const resolvedDir = node_path_1.default.resolve(resolveBase);
        let entries = [];
        try {
            entries = node_fs_1.default.readdirSync(resolvedDir, { withFileTypes: true });
        }
        catch {
            return [];
        }
        return entries
            .filter((entry) => entry.name.startsWith(namePrefix))
            .map((entry) => {
            let correctPath;
            if (dirToList === '.' || dirToList === './' || dirToList === '.\\') {
                correctPath = dirToList === '.' ? entry.name : `${dirToList}${entry.name}`;
            }
            else {
                const endsWithSeparator = dirToList.endsWith('/') || dirToList.endsWith('\\');
                correctPath = endsWithSeparator ? `${dirToList}${entry.name}` : `${dirToList}/${entry.name}`;
            }
            return entry.isDirectory() ? `${correctPath}/` : correctPath;
        });
    }
    catch {
        return [];
    }
}
/** Split a line into arguments, keeping quoted phrases in one argument. */
function tokenize(line) {
    const tokens = [];
    let current = '';
    let quote = null;
    let started = false;
    for (const char of line) {
        if (quote !== null) {
            if (char === quote)
                quote = null;
            else
                current += char;
            continue;
        }
        if (char === '"' || char === "'") {
            quote = char;
            started = true;
            continue;
        }
        if (char === ' ' || char === '\t') {
            if (started || current !== '') {
                tokens.push(current);
                current = '';
                started = false;
            }
            continue;
        }
        current += char;
        started = true;
    }
    if (started || current !== '')
        tokens.push(current);
    return tokens;
}
function readHistory() {
    try {
        return node_fs_1.default
            .readFileSync((0, config_1.historyFile)(), 'utf8')
            .split(/\r?\n/)
            .filter((line) => line.trim() !== '')
            .slice(-HISTORY_LIMIT);
    }
    catch {
        return [];
    }
}
function writeHistory(entries) {
    const oldestFirst = [...entries].reverse().slice(-HISTORY_LIMIT);
    if (oldestFirst.length === 0)
        return;
    try {
        node_fs_1.default.mkdirSync(node_path_1.default.dirname((0, config_1.historyFile)()), { recursive: true });
        node_fs_1.default.writeFileSync((0, config_1.historyFile)(), `${oldestFirst.join('\n')}\n`, 'utf8');
    }
    catch {
        // Losing the history file must never break the shell.
    }
}
/** Commands, subcommands, flags, table/database names and paths. */
function complete(line) {
    const trimmed = line.replace(/^\s+/, '');
    const tokens = trimmed.split(/\s+/).filter((token) => token !== '');
    const endsWithSpace = /\s$/.test(line);
    if (tokens.length === 0) {
        return [[...new Set([...(0, registry_1.commandNames)(), ...registry_1.SHELL_BUILTINS])].sort(), ''];
    }
    const current = endsWithSpace ? '' : tokens[tokens.length - 1] ?? '';
    const words = endsWithSpace ? tokens : tokens.slice(0, -1);
    let pool = [];
    if (words.length === 0) {
        pool = [...new Set([...(0, registry_1.commandNames)(), ...registry_1.SHELL_BUILTINS])];
    }
    else {
        const spec = (0, registry_1.findCommand)(words[0]);
        if (!spec)
            return [[], current];
        const rest = words.slice(1);
        if (current.startsWith('-')) {
            pool = [...(spec.flags ?? []), '--help'];
        }
        else if (spec.pathCompletes && rest.length === 0) {
            pool = getDirAndFileCompletions(current);
        }
        else if (spec.suggest) {
            pool = spec.suggest([...rest, current]);
        }
    }
    const hits = [...new Set(pool)].filter((candidate) => candidate.startsWith(current)).sort();
    if (hits.length === 0)
        return [[], current];
    return [hits.length === 1 ? [`${hits[0]} `] : hits, current];
}
function clearScreen() {
    process.stdout.write('\u001b[2J\u001b[3J\u001b[H');
}
function printHeader(terminal) {
    console.log((0, theme_1.banner)(session_1.session.info));
    console.log('');
    const databases = session_1.session.listDatabases();
    if (!session_1.session.info.database && databases.length > 0) {
        console.log(`  ${(0, theme_1.dim)('databases')} ${databases.map((name) => (0, theme_1.cyan)(name)).join((0, theme_1.dim)(', '))}`);
        console.log(`  ${(0, theme_1.dim)('select one with')} ${(0, theme_1.cyan)('use <database>')} ${(0, theme_1.dim)('· sign in with')} ${(0, theme_1.cyan)('login')}`);
        console.log('');
    }
    if (terminal) {
        console.log(`  ${(0, theme_1.faint)('↑↓ history   tab complete   help commands   clear screen   exit to quit')}`);
    }
}
/**
 * Interactive shell: the same commands as the one-shot CLI, with history, tab
 * completion and a prompt. Runs until `exit`, Ctrl+C on an empty line or EOF.
 */
async function startShell() {
    const terminal = Boolean(process.stdin.isTTY);
    if (terminal)
        clearScreen();
    // First run: ask for the database root instead of silently using the default.
    const stored = (0, config_1.readStoredConfig)();
    if (terminal && !stored.rootPath && !process.env.ZERODB_PATH) {
        const fallback = (0, config_1.defaultRootPath)();
        const answer = await (0, ui_1.ask)(`Database root path ${(0, theme_1.faint)(`[${fallback}]`)}: `);
        try {
            await session_1.session.open(answer.trim() || fallback);
            (0, ui_1.ok)(`Database root: ${session_1.session.info.rootPath}`);
        }
        catch (error) {
            (0, ui_1.warn)((0, errors_1.errorMessage)(error));
        }
    }
    else {
        try {
            await session_1.session.ensureOpen();
        }
        catch (error) {
            (0, ui_1.warn)((0, errors_1.errorMessage)(error));
        }
    }
    const rl = node_readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal,
        history: readHistory(),
        historySize: HISTORY_LIMIT,
        removeHistoryDuplicates: true,
        completer: complete,
    });
    let closed = false;
    let draining = false;
    const queue = [];
    let drainPromise = Promise.resolve();
    let pending = null;
    const finishPending = (answer) => {
        const current = pending;
        pending = null;
        if (current === null)
            return;
        current.cleanup();
        current.resolve(answer);
    };
    const askLine = (question) => new Promise((resolve) => {
        rl.setPrompt(question);
        rl.prompt();
        pending = { resolve, cleanup: () => { } };
    });
    const askSecretLine = (question) => new Promise((resolve) => {
        const internal = rl;
        const echo = internal._writeToOutput;
        internal._writeToOutput = echo;
        rl.setPrompt(question);
        rl.prompt();
        internal._writeToOutput = () => { };
        pending = {
            resolve,
            cleanup: () => {
                internal._writeToOutput = echo;
                process.stdout.write('\n');
            },
        };
    });
    const prompt = () => {
        if (closed)
            return;
        rl.setPrompt((0, theme_1.promptText)(session_1.session.info));
        rl.prompt();
    };
    const runBuiltin = (word) => {
        switch (word) {
            case 'clear':
                if (terminal) {
                    clearScreen();
                    printHeader(terminal);
                }
                else {
                    process.stdout.write('\n');
                }
                return true;
            case 'version':
                (0, help_1.printVersion)();
                return true;
            default:
                return false;
        }
    };
    /** Returns true when the shell should stop. */
    const handleLine = async (raw) => {
        const input = raw.trim();
        if (input === '') {
            prompt();
            return false;
        }
        const [word, ...args] = tokenize(input);
        if (word === undefined) {
            prompt();
            return false;
        }
        if (EXIT_WORDS.includes(word.toLowerCase())) {
            rl.close();
            return true;
        }
        if (word.toLowerCase() === 'help') {
            const spec = args[0] ? (0, registry_1.findCommand)(args[0]) : undefined;
            if (spec)
                (0, registry_1.printCommandHelp)(spec);
            else
                (0, help_1.printHelp)();
            prompt();
            return false;
        }
        if (runBuiltin(word.toLowerCase())) {
            prompt();
            return false;
        }
        if (terminal)
            (0, ui_1.usePromptHandlers)({ ask: askLine, askSecret: askSecretLine });
        try {
            await (0, registry_1.dispatch)([word, ...args]);
        }
        catch (error) {
            console.log(`${(0, theme_1.red)('✗')} ${(0, errors_1.errorMessage)(error)}`);
        }
        finally {
            (0, ui_1.usePromptHandlers)(null);
            if (!closed)
                prompt();
        }
        return false;
    };
    const drain = async () => {
        if (draining)
            return drainPromise;
        draining = true;
        drainPromise = (async () => {
            try {
                // Keep going after stdin closes so piped input is not truncated.
                while (queue.length > 0) {
                    const line = queue.shift();
                    if (line === undefined)
                        break;
                    if (await handleLine(line))
                        break;
                }
            }
            finally {
                draining = false;
            }
        })();
        return drainPromise;
    };
    /** Answers typed at a command's prompt are not worth keeping. */
    const dropFromHistory = (answer) => {
        const history = rl.history;
        if (history !== undefined && history[0] === answer)
            history.shift();
    };
    rl.on('line', (line) => {
        if (pending !== null) {
            finishPending(line);
            dropFromHistory(line);
            return;
        }
        queue.push(line);
        void drain();
    });
    rl.on('SIGINT', () => {
        if (pending !== null) {
            finishPending('');
            return;
        }
        if (draining)
            return;
        if (rl.line.trim() !== '') {
            rl.write(null, { ctrl: true, name: 'u' });
            process.stdout.write('\n');
            prompt();
            return;
        }
        process.stdout.write('\n');
        rl.close();
    });
    rl.on('close', () => {
        closed = true;
        writeHistory(rl.history);
        if (terminal)
            process.stdout.write('\n');
    });
    printHeader(terminal);
    prompt();
    await new Promise((resolve) => rl.once('close', resolve));
    // A piped script closes stdin as soon as the last line is written; finish
    // any queued commands before tearing the engine down.
    await drainPromise;
    await session_1.session.dispose();
}
//# sourceMappingURL=repl.js.map