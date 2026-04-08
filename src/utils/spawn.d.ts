/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
export interface SpawnStats {
    hits: number;
    misses: number;
    size: number;
    buffered: number;
}
export declare class Spawn {
    private static writeQueue;
    private static pendingWrites;
    private static readonly QUEUE_THRESHOLD;
    filePath: string;
    private dataCache;
    private writeBuffer;
    private deleteBuffer;
    private autoIncrement;
    private stats;
    private flushTimer;
    private loaded;
    private isReading;
    private readPromise;
    constructor(rootPath: string, dbName: string, tableName: string, fieldName: string, fileName: string);
    static create(rootPath: string, dbName: string, tableName: string, fieldName: string, fileName: string): Spawn;
    private static getQueueKey;
    private static shouldQueue;
    static queueWrite(filePath: string, writeFn: () => Promise<void>): Promise<void>;
    static flushQueue(filePath: string): Promise<void>;
    static clearQueue(filePath: string): void;
    /**
     * Streaming Read - Bypasses Node.js 2GB Buffer Limit
     */
    read(): Promise<void>;
    private processLine;
    private write;
    private doWrite;
    append(line: number, value: string): void;
    update(lines: Set<number>, value: string): void;
    delete(lines: Set<number>): void;
    getAll(): Map<number, string>;
    get(line: number): string | undefined;
    getAutoIncrement(): number;
    isLoaded(): boolean;
    resetLoaded(): void;
    reload(): void;
    ensureMaxLine(): Promise<number>;
    getMaxLine(): number;
    getDataCache(): Map<number, string>;
    setAutoIncrement(val: number): void;
    private scheduleFlush;
    private flush;
    forceFlush(): Promise<void>;
    getStats(): SpawnStats;
}
//# sourceMappingURL=spawn.d.ts.map