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

class EventManagerClass extends EventEmitter {
  private static instance: EventManagerClass;
  private enabled: boolean = true;

  private constructor() {
    super();
  }

  public static getInstance(): EventManagerClass {
    if (!EventManagerClass.instance) {
      EventManagerClass.instance = new EventManagerClass();
    }
    return EventManagerClass.instance;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private log(level: LogLevel, message: string, context?: any): void {
    if (!this.enabled) return;

    const hasContext = context !== undefined && context !== null && 
      (typeof context !== 'object' || Object.keys(context).length > 0);

    if (!hasContext && level !== 'error') {
      return;
    }

    if (!hasContext) {
      context = undefined;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context
    };

    this.emit('log', entry);
    this.emit(level, entry);
  }

  public info(message: string, context?: any): void {
    this.log('info', message, context);
  }

  public warn(message: string, context?: any): void {
    this.log('warn', message, context);
  }

  public error(message: string, context?: any): void {
    this.log('error', message, context);
  }

  public debug(message: string, context?: any): void {
    this.log('debug', message, context);
  }

  public query(message: string, context?: any): void {
    this.log('query', message, context);
  }
}

export const EventManager: EventManagerType = EventManagerClass.getInstance();
