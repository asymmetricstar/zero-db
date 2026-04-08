/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
export declare class WriteQueue {
    private queue;
    private knownCrcs;
    private processing;
    private maxRetries;
    private retryDelay;
    constructor(maxRetries?: number, retryDelay?: number);
    enqueue(filePath: string, content: string): void;
    flush(): Promise<{
        success: boolean;
        errors: string[];
    }>;
    private processWrite;
    syncFile(filePath: string): void;
    clear(): void;
    size(): number;
    private extractCrc;
    private sleep;
}
//# sourceMappingURL=write-queue.d.ts.map