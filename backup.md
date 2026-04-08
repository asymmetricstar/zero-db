# Understanding and Using Backup and Restore in ZeroDB (Simplified API)

This guide explains how to perform essential backup and restore operations using a simplified API, as demonstrated in common examples. These operations are crucial for safeguarding your data and ensuring its availability.

## Key Concepts

-   **Maintenance Mode:** Temporarily disabling write operations to ensure data consistency during backup or restore procedures. This prevents data corruption by ensuring no changes are made while the state is being saved or loaded.
-   **Backup:** Saving the current state of the database to a file.
-   **Restore:** Loading a previously saved backup file to revert the database to that specific state.

## Core Operations

ZeroDB provides a straightforward API for managing backups.

### 1. Enabling Maintenance Mode

Before performing backup or restore operations, it's recommended to enable maintenance mode. This prevents any new writes or modifications to the database, ensuring a consistent snapshot.

```typescript
// Assuming 'db' is an initialized ZeroDB instance
// Example: const db = new ZeroDB('./databases', 64);

db.backupManager.setMaintenanceMode(true);
console.log("Maintenance mode enabled. Writing operations are temporarily paused.");
```

### 2. Creating a Backup

Once maintenance mode is enabled, you can create a backup. The `db.backup()` method is used to save the current database state to a specified file.

```typescript
// Continuing from the previous step, with maintenance mode enabled

// Replace 'backup.tar.gz' with your desired backup filename
const backupFileName = 'backup.tar.gz'; 

try {
  await db.backup(backupFileName);
  console.log(`✅ Backup created successfully: ${backupFileName}`);
} catch (error) {
  console.error(`❌ Error creating backup: ${error}`);
}
```

### 3. Restoring from a Backup

To revert the database to a previous state, use the `db.restore()` method, providing the path to the backup file. **Caution:** Restoring a backup will overwrite the current database state.

```typescript
// Assuming maintenance mode is still enabled from the backup step,
// or re-enabled if other operations were performed.

// Replace 'backup.tar.gz' with the actual name of your backup file
const backupFileNameToRestore = 'backup.tar.gz'; 

try {
  await db.restore(backupFileNameToRestore);
  console.log(`✅ Database restored successfully from: ${backupFileNameToRestore}`);
} catch (error) {
  console.error(`❌ Error restoring database: ${error}`);
}
```

### 4. Disabling Maintenance Mode

After completing backup or restore operations, it's essential to disable maintenance mode to allow writing operations to resume.

```typescript
// Following a successful restore or backup operation

db.backupManager.setMaintenanceMode(false);
console.log("Maintenance mode disabled. Writing operations are reactivated.");

// If you are done with the ZeroDB instance, you might want to exit
// db.exit(); // Uncomment if needed
```

**Important Notes:**
- The exact availability and behavior of `db.backup()` and `db.restore()` methods might differ from the `backupManager` methods shown in previous examples. Always refer to the specific `zero-db` API documentation for the version you are using.
- Ensure that the backup file path provided to `db.restore()` is correct and accessible.
- Handle encryption passwords securely if using encrypted backups. The examples above assume unencrypted backups for simplicity as per the provided snippet.
