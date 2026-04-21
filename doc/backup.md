# Backup & Restore

ZeroDB includes a native backup manager.

## Create Backup

```typescript
await db.backup('backup-2024-01-01.tar.gz');
```

## Restore Backup

```typescript
await db.restore('backup-2024-01-01.tar.gz');
```

## Maintenance Mode

Put database in maintenance mode before backup:

```typescript
db.backupManager.setMaintenanceMode(true);

await db.backup('stable-v1.tar.gz');

await db.restore('stable-v1.tar.gz');

db.backupManager.setMaintenanceMode(false);
```

## Auto-Backup

Set backup directory:

```typescript
const db = new ZeroDB('./data', 256, {
  backup: './my_backups'
});
```

## Backup Directory

Default: `./backup`

Custom:

```typescript
const db = new ZeroDB('./data', 256, {
  backup: '/path/to/backups'
});
```

## Best Practices

1. **Regular backups** - Schedule periodic backups
2. **Maintenance mode** - Use for consistent backups
3. **Test restore** - Verify backup integrity
4. **Off-site storage** - Copy backups to external storage