# Understanding and Using Backup and Restore in ZeroDB

Data backup is a critical process for safeguarding your database against data loss, corruption, or hardware failures. ZeroDB provides functionalities to create backups of your database state and restore it when necessary.

## Why Use Backup and Restore?

-   **Data Recovery:** Protects against accidental data deletion, system crashes, or disk failures.
-   **Versioning:** Allows you to revert to a previous state of your database if a recent change introduces issues.
-   **Migration:** Can be used to transfer data between different environments or instances.

## Backup Features

ZeroDB's backup manager likely offers the following capabilities:

-   **Create Backup:** Saves the current state of your database to a file or archive.
-   **Restore Backup:** Loads a previously saved backup to revert the database to that state.
-   **Backup Formats:** Backups might be stored in a compressed format (like `.zip`) for efficient storage and transfer.
-   **Selective Backups:** Potentially allows backing up specific tables or data ranges.

## Example Usage

Let's assume you have a ZeroDB instance running and have populated some data.

### Example 1: Creating a Database Backup

This example demonstrates how to create a backup of your current database state.

```typescript
import { ZeroDB } from 'zero-db';
import * as path from 'path'; // To handle file paths

async function createDatabaseBackup() {
  const db = new ZeroDB(); // Initialize ZeroDB
  const backupFileName = 'my-database-backup.zip'; // Name for the backup file
  const backupDir = path.join(__dirname, 'backups'); // Directory to save backups

  try {
    console.log(`Creating backup: \${backupFileName}...`);
    // Assuming a method like 'backupManager.create' exists
    // It might take a directory path and a filename.
    const backupResult = await db.backupManager.create({
      directory: backupDir,
      fileName: backupFileName,
      // format: 'zip' // Potentially an option for backup format
    });

    if (backupResult.success) {
      console.log(`Backup created successfully at: \${backupResult.filePath}`);
    } else {
      console.error("Backup creation failed:", backupResult.error);
    }

  } catch (error) {
    console.error("An unexpected error occurred during backup:", error);
  } finally {
    // db.close(); // If there's a close method
  }
}

createDatabaseBackup();
```

### Example 2: Restoring from a Database Backup

This example shows how to restore your database to a previous state from a backup file. **Caution:** Restoring a backup will overwrite your current database state.

```typescript
import { ZeroDB } from 'zero-db';
import * as path from 'path';

async function restoreDatabaseFromBackup() {
  const db = new ZeroDB(); // Initialize ZeroDB
  const backupFileName = 'my-database-backup.zip'; // The backup file to restore from
  const backupDir = path.join(__dirname, 'backups'); // Directory where the backup is located
  const backupFilePath = path.join(backupDir, backupFileName);

  try {
    console.log(`Restoring database from: \${backupFilePath}...`);
    // Assuming a method like 'backupManager.restore' exists
    // It might take the full path to the backup file.
    const restoreResult = await db.backupManager.restore({
      filePath: backupFilePath,
    });

    if (restoreResult.success) {
      console.log("Database restored successfully.");
    } else {
      console.error("Database restore failed:", restoreResult.error);
    }

  } catch (error) {
    console.error("An unexpected error occurred during restore:", error);
  } finally {
    // db.close(); // If there's a close method
  }
}

restoreDatabaseFromBackup();
```

**Note:** The exact API methods (`db.backupManager.create`, `db.backupManager.restore`, `directory`, `fileName`, `filePath`, etc.) and their parameters are hypothetical and based on common patterns. You should refer to the official `zero-db` documentation for the precise implementation details.
