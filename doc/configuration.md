# Configuration

All ZeroDB configuration options.

## Basic Options

```typescript
const db = new ZeroDB('./data', 256, {
  overwrite: false,
  backup: './backups'
});
```

## All Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `rootPath` | `string` | `'./databases'` | Database directory |
| `cacheMB` | `number` | `128` | Cache size in MB |
| `database` | `string` | - | Auto-connect to database |
| `auth` | `object` | - | Auto-login credentials |
| `overwrite` | `boolean` | `false` | Reset database |
| `backup` | `string` | `'./backup'` | Backup directory |
| `scaler` | `object` | - | Auto-scaling config |

## Database Option

Connect to a database on startup.

```typescript
// Public database - no login needed
new ZeroDB('./data', 128, { database: 'public_blog' });

// Private database - will require login
new ZeroDB('./data', 128, { database: 'myapp' });
```

## Auth Option

Auto-login on startup.

```typescript
new ZeroDB('./data', 256, {
  database: 'myapp',
  auth: {
    user: 'admin',
    pass: 'secret123'
  }
});
```

## Full Example

```typescript
const db = new ZeroDB('./databases', 512, {
  database: 'myapp',
  auth: {
    user: 'admin',
    pass: 'secure_password'
  },
  overwrite: false,
  backup: './backups',
  scaler: {
    sequentialThreshold: 10,
    batchThreshold: 500,
    workerThreshold: 10000,
    maxWorkers: 4,
    batchSize: 100,
    adaptiveEnabled: true
  }
});
```

## Auto-Scaler Options

| Option | Default | Description |
|--------|---------|-------------|
| `sequentialThreshold` | 10 | Switch to batch after 10 records |
| `batchThreshold` | 500 | Switch to worker after 500 |
| `workerThreshold` | 10000 | Switch to stream after 10K |
| `streamThreshold` | 100000 | Switch to large stream after 100K |
| `maxWorkers` | 4 | Maximum worker threads |
| `batchSize` | 100 | Default batch size |
| `adaptiveEnabled` | true | Auto-adjust based on resources |
| `metricsInterval` | 1000 | Metrics collection ms |
| `memorySafetyThreshold` | 0.85 | Scale down at 85% memory |
| `cpuSafetyThreshold` | 80 | Scale down at 80% CPU |

See [Auto-Scaler](auto-scaler.md) for details.