/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
import { EventEmitter } from 'node:events';
export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'query';
export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: any;
}
export interface EventManagerType extends EventEmitter {
    info(message: string, context?: any): void;
    warn(message: string, context?: any): void;
    error(message: string, context?: any): void;
    debug(message: string, context?: any): void;
    query(message: string, context?: any): void;
    setEnabled(enabled: boolean): void;
    on(event: string, listener: (...args: any[]) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
    off(event: string, listener: (...args: any[]) => void): this;
}
export declare const EventManager: EventManagerType;
//# sourceMappingURL=event-manager.d.ts.map