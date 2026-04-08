"use strict";
/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventManager = void 0;
const node_events_1 = require("node:events");
class EventManagerClass extends node_events_1.EventEmitter {
    constructor() {
        super();
        this.enabled = true;
    }
    static getInstance() {
        if (!EventManagerClass.instance) {
            EventManagerClass.instance = new EventManagerClass();
        }
        return EventManagerClass.instance;
    }
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    log(level, message, context) {
        if (!this.enabled)
            return;
        const hasContext = context !== undefined && context !== null &&
            (typeof context !== 'object' || Object.keys(context).length > 0);
        if (!hasContext && level !== 'error') {
            return;
        }
        if (!hasContext) {
            context = undefined;
        }
        const entry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            context
        };
        this.emit('log', entry);
        this.emit(level, entry);
    }
    info(message, context) {
        this.log('info', message, context);
    }
    warn(message, context) {
        this.log('warn', message, context);
    }
    error(message, context) {
        this.log('error', message, context);
    }
    debug(message, context) {
        this.log('debug', message, context);
    }
    query(message, context) {
        this.log('query', message, context);
    }
}
exports.EventManager = EventManagerClass.getInstance();
//# sourceMappingURL=event-manager.js.map