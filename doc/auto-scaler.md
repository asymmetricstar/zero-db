# Auto-Scaler

ZeroDB automatically adjusts performance based on data size and system resources.

## Overview

Auto-Scaler switches between processing modes:

1. **Sequential** - < 10 records
2. **Batch** - 10-500 records
3. **Worker** - 500-10K records
4. **Stream** - 10K-100K records
5. **Large Stream** - 100K+ records

## Configuration

```typescript
const db = new ZeroDB('./data', 512, {
  scaler: {
    sequentialThreshold: 10,
    batchThreshold: 500,
    workerThreshold: 10000,
    streamThreshold: 100000,
    maxWorkers: 4,
    batchSize: 100,
    adaptiveEnabled: true,
    metricsInterval: 1000,
    memorySafetyThreshold: 0.85,
    cpuSafetyThreshold: 80
  }
});
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `sequentialThreshold` | 10 | Sequential → Batch |
| `batchThreshold` | 500 | Batch → Worker |
| `workerThreshold` | 10000 | Worker → Stream |
| `streamThreshold` | 100000 | Stream → Large Stream |
| `maxWorkers` | 4 | Maximum threads |
| `batchSize` | 100 | Default batch size |
| `adaptiveEnabled` | true | Auto-adjust |
| `metricsInterval` | 1000 | Check interval (ms) |
| `memorySafetyThreshold` | 0.85 | Scale down at 85% |
| `cpuSafetyThreshold` | 80 | Scale down at 80% |

## Disable Auto-Scaling

```typescript
const db = new ZeroDB('./data', 256, {
  scaler: {
    adaptiveEnabled: false
  }
});
```

## Manual Thresholds

```typescript
const db = new ZeroDB('./data', 256, {
  scaler: {
    batchThreshold: 1000,
    workerThreshold: 50000
  }
});
```