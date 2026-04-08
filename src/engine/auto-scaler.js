"use strict";
/**
 * Zero-DB File-Based Database Engine
 * Author: Levent Inan (@asymmetricstar)
 *
 * @asymmetricstar - https://github.com/asymmetricstar
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoScaler = exports.AutoScaler = void 0;
const os = __importStar(require("os"));
const event_manager_1 = require("../utils/event-manager");
class AutoScaler {
    constructor(config = {}) {
        this.metrics = [];
        this.currentStrategy = 'stream'; // Start with full capability
        this.lastStrategyChange = Date.now();
        this.initialized = false;
        this.metricsTimer = null;
        this.config = { ...AutoScaler.DEFAULT_CONFIG, ...config };
    }
    initialize() {
        if (this.initialized)
            return;
        this.initialized = true;
        this.startMetricsCollection();
    }
    stop() {
        if (this.metricsTimer) {
            clearInterval(this.metricsTimer);
            this.metricsTimer = null;
        }
        this.initialized = false;
    }
    startMetricsCollection() {
        if (!this.config.adaptiveEnabled)
            return;
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
    evaluateGlobalStrategy() {
        if (this.metrics.length < 5)
            return;
        const recent = this.metrics.slice(-10);
        const avgMemory = recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length;
        const avgCpu = recent.reduce((sum, m) => sum + m.cpuUsage, 0) / recent.length;
        const avgFreeMem = recent.reduce((sum, m) => sum + m.freeMemory, 0) / recent.length;
        let newStrategy = this.currentStrategy;
        // Downgrade Path
        if (avgMemory > this.config.memorySafetyThreshold || avgFreeMem < 0.1 || avgCpu > this.config.cpuSafetyThreshold) {
            if (this.currentStrategy === 'stream')
                newStrategy = 'worker';
            else if (this.currentStrategy === 'worker')
                newStrategy = 'hybrid';
            else if (this.currentStrategy === 'hybrid')
                newStrategy = 'batch';
            else if (this.currentStrategy === 'batch')
                newStrategy = 'sequential';
        }
        // Upgrade Path
        else if (avgMemory < 0.6 && avgFreeMem > 0.2 && avgCpu < 50) {
            if (this.currentStrategy === 'sequential')
                newStrategy = 'batch';
            else if (this.currentStrategy === 'batch')
                newStrategy = 'hybrid';
            else if (this.currentStrategy === 'hybrid')
                newStrategy = 'worker';
            else if (this.currentStrategy === 'worker')
                newStrategy = 'stream';
        }
        if (newStrategy !== this.currentStrategy && Date.now() - this.lastStrategyChange > 3000) {
            event_manager_1.EventManager.info(`AutoScaler strategy changed: ${this.currentStrategy} → ${newStrategy}`, { cpu: avgCpu.toFixed(1), memory: (avgMemory * 100).toFixed(1) });
            this.currentStrategy = newStrategy;
            this.lastStrategyChange = Date.now();
        }
    }
    determineStrategy(recordCount) {
        // 1. Ideal strategy based on record count
        let idealStrategy = 'sequential';
        if (recordCount > this.config.streamThreshold)
            idealStrategy = 'stream';
        else if (recordCount > this.config.workerThreshold)
            idealStrategy = 'worker';
        else if (recordCount > this.config.batchThreshold)
            idealStrategy = 'hybrid';
        else if (recordCount > this.config.sequentialThreshold)
            idealStrategy = 'batch';
        if (!this.config.adaptiveEnabled)
            return idealStrategy;
        // 2. Cap based on system health
        const strategyLevels = {
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
    getCurrentStrategy() {
        return this.currentStrategy;
    }
    recordOperation(recordCount, durationMs, success) {
        if (this.metrics.length === 0)
            return;
        const latest = this.metrics[this.metrics.length - 1];
        latest.throughput = (recordCount / durationMs) * 1000;
        latest.latency = durationMs / recordCount;
    }
    updateQueueDepth(depth) {
        if (this.metrics.length > 0) {
            this.metrics[this.metrics.length - 1].queueDepth = depth;
        }
    }
    getConfig() {
        return this.config;
    }
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    getRecommendedWorkerCount(recordCount) {
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
    getBatchSize(recordCount) {
        if (recordCount > 50000)
            return 1000;
        if (recordCount > 10000)
            return 500;
        if (recordCount > 1000)
            return 100;
        return this.config.batchSize;
    }
}
exports.AutoScaler = AutoScaler;
AutoScaler.DEFAULT_CONFIG = {
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
exports.autoScaler = new AutoScaler();
//# sourceMappingURL=auto-scaler.js.map