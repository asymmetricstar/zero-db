/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
export type ScaleStrategy = 'sequential' | 'batch' | 'worker' | 'stream' | 'hybrid';
export interface ScaleMetrics {
    cpuUsage: number;
    memoryUsage: number;
    freeMemory: number;
    queueDepth: number;
    throughput: number;
    latency: number;
    timestamp: number;
}
export interface ScaleConfig {
    sequentialThreshold: number;
    batchThreshold: number;
    workerThreshold: number;
    streamThreshold: number;
    maxWorkers: number;
    batchSize: number;
    adaptiveEnabled: boolean;
    metricsInterval: number;
    memorySafetyThreshold: number;
    cpuSafetyThreshold: number;
}
export declare class AutoScaler {
    private config;
    private metrics;
    private currentStrategy;
    private lastStrategyChange;
    private initialized;
    private metricsTimer;
    private static DEFAULT_CONFIG;
    constructor(config?: Partial<ScaleConfig>);
    initialize(): void;
    stop(): void;
    private startMetricsCollection;
    private evaluateGlobalStrategy;
    determineStrategy(recordCount: number): ScaleStrategy;
    getCurrentStrategy(): ScaleStrategy;
    recordOperation(recordCount: number, durationMs: number, success: boolean): void;
    updateQueueDepth(depth: number): void;
    getConfig(): ScaleConfig;
    updateConfig(config: Partial<ScaleConfig>): void;
    getRecommendedWorkerCount(recordCount: number): number;
    getBatchSize(recordCount: number): number;
}
export declare const autoScaler: AutoScaler;
//# sourceMappingURL=auto-scaler.d.ts.map