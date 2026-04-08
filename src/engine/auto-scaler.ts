/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 * 
 * @asymmetricstar - https://github.com/asymmetricstar
 */

import { Worker } from 'worker_threads';
import * as path from 'path';
import * as os from 'os';
import { EventManager } from '../utils/event-manager';

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
  memorySafetyThreshold: number; // 0.0 to 1.0
  cpuSafetyThreshold: number;    // 0 to 100
}

export class AutoScaler {
  private config: ScaleConfig;
  private metrics: ScaleMetrics[] = [];
  private currentStrategy: ScaleStrategy = 'stream'; // Start with full capability
  private lastStrategyChange = Date.now();
  private initialized = false;
  private metricsTimer: NodeJS.Timeout | null = null;

  private static DEFAULT_CONFIG: ScaleConfig = {
    sequentialThreshold: 10,
    batchThreshold: 500,
    workerThreshold: 10000,
    streamThreshold: 100000,
    maxWorkers: Math.max(1, os.cpus().length - 1),
    batchSize: 100,
    adaptiveEnabled: true,
    metricsInterval: 1000,
    memorySafetyThreshold: 0.85,
    cpuSafetyThreshold: 80
  };

  constructor(config: Partial<ScaleConfig> = {}) {
    this.config = { ...AutoScaler.DEFAULT_CONFIG, ...config };
  }

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.startMetricsCollection();
  }

  stop(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
    this.initialized = false;
  }

  private startMetricsCollection(): void {
    if (!this.config.adaptiveEnabled) return;

    this.metricsTimer = setInterval(() => {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();

      this.metrics.push({
        cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000,
        memoryUsage: memUsage.heapUsed / memUsage.heapTotal,
        freeMemory: freeMem / totalMem,
        queueDepth: 0,
        throughput: 0,
        latency: 0,
        timestamp: Date.now()
      });

      if (this.metrics.length > 60) {
        this.metrics.shift();
      }

      this.evaluateGlobalStrategy();
    }, this.config.metricsInterval);
  }

  private evaluateGlobalStrategy(): void {
    if (this.metrics.length < 5) return;

    const recent = this.metrics.slice(-10);
    const avgMemory = recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length;
    const avgCpu = recent.reduce((sum, m) => sum + m.cpuUsage, 0) / recent.length;
    const avgFreeMem = recent.reduce((sum, m) => sum + m.freeMemory, 0) / recent.length;

    let newStrategy = this.currentStrategy;

    // Downgrade Path
    if (avgMemory > this.config.memorySafetyThreshold || avgFreeMem < 0.1 || avgCpu > this.config.cpuSafetyThreshold) {
      if (this.currentStrategy === 'stream') newStrategy = 'worker';
      else if (this.currentStrategy === 'worker') newStrategy = 'hybrid';
      else if (this.currentStrategy === 'hybrid') newStrategy = 'batch';
      else if (this.currentStrategy === 'batch') newStrategy = 'sequential';
    } 
    // Upgrade Path
    else if (avgMemory < 0.6 && avgFreeMem > 0.2 && avgCpu < 50) {
      if (this.currentStrategy === 'sequential') newStrategy = 'batch';
      else if (this.currentStrategy === 'batch') newStrategy = 'hybrid';
      else if (this.currentStrategy === 'hybrid') newStrategy = 'worker';
      else if (this.currentStrategy === 'worker') newStrategy = 'stream';
    }

    if (newStrategy !== this.currentStrategy && Date.now() - this.lastStrategyChange > 3000) {
      EventManager.info(`AutoScaler strategy changed: ${this.currentStrategy} → ${newStrategy}`, { cpu: avgCpu.toFixed(1), memory: (avgMemory*100).toFixed(1) });
      this.currentStrategy = newStrategy;
      this.lastStrategyChange = Date.now();
    }
  }

  determineStrategy(recordCount: number): ScaleStrategy {
    // 1. Ideal strategy based on record count
    let idealStrategy: ScaleStrategy = 'sequential';
    if (recordCount > this.config.streamThreshold) idealStrategy = 'stream';
    else if (recordCount > this.config.workerThreshold) idealStrategy = 'worker';
    else if (recordCount > this.config.batchThreshold) idealStrategy = 'hybrid';
    else if (recordCount > this.config.sequentialThreshold) idealStrategy = 'batch';

    if (!this.config.adaptiveEnabled) return idealStrategy;

    // 2. Cap based on system health
    const strategyLevels: Record<ScaleStrategy, number> = {
      'sequential': 0,
      'batch': 1,
      'hybrid': 2,
      'worker': 3,
      'stream': 4
    };

    const currentCapLevel = strategyLevels[this.currentStrategy];
    const idealLevel = strategyLevels[idealStrategy];

    if (idealLevel > currentCapLevel) {
      return this.currentStrategy;
    }

    return idealStrategy;
  }

  getCurrentStrategy(): ScaleStrategy {
    return this.currentStrategy;
  }

  recordOperation(recordCount: number, durationMs: number, success: boolean): void {
    if (this.metrics.length === 0) return;

    const latest = this.metrics[this.metrics.length - 1];
    latest.throughput = (recordCount / durationMs) * 1000;
    latest.latency = durationMs / recordCount;
  }

  updateQueueDepth(depth: number): void {
    if (this.metrics.length > 0) {
      this.metrics[this.metrics.length - 1].queueDepth = depth;
    }
  }

  getConfig(): ScaleConfig {
    return this.config;
  }

  updateConfig(config: Partial<ScaleConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getRecommendedWorkerCount(recordCount: number): number {
    const memUsage = process.memoryUsage();
    const freeMemory = os.freemem();
    const cpuCount = os.cpus().length;

    // Scale workers based on record count and available memory
    let count = Math.ceil(recordCount / 5000);
    count = Math.min(count, cpuCount, this.config.maxWorkers);
    
    // Safety check for memory
    if (freeMemory < 512 * 1024 * 1024) { // Less than 512MB
      return 1;
    }

    return Math.max(1, count);
  }

  getBatchSize(recordCount: number): number {
    if (recordCount > 50000) return 1000;
    if (recordCount > 10000) return 500;
    if (recordCount > 1000) return 100;
    return this.config.batchSize;
  }
}

export const autoScaler = new AutoScaler();
