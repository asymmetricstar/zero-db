# ⚡ ZeroDB Engine

> **Next-Gen File-Based Database** - A simple, secure, zero-dependency, and high-performance database engine for Node.js. Perfect for local storage, IoT, and embedded applications.
---


## 🚀 ZeroDB Architecture

ZeroDB combines the power of SQL databases with the simplicity of file-based systems. It is designed for maximum efficiency with its own unique architecture and zero external dependencies.

- **Cluster & Distributed Operations:** ZeroDB offers a cluster architecture that enables data to work simultaneously and synchronously across multiple servers. Data is replicated across different points seamlessly with high availability.
- **File Locking Mechanism:** Uses "Advisory Locking" at the operating system level to prevent multiple processes or servers from conflicting on the same file.
- **Atomic Operations:** Eliminates the risk of "partially committed data". Operations happen in a temporary state and are replaced with the original file in a single atomic step upon approval.
- **Log-Based Synchronization:** Keeps every change in small log files for real-time state synchronization between servers.
- **Strong Encryption:** Data is protected with industry-standard security protocols and MD5/CRC32 integrity checks.
- **Auto-Scaling:** Automatically optimizes itself relative to CPU power and system load, handling everything from 10 records to 100M+ records.
- **Tamper-Proof Integrity:** Instantly detects any unauthorized manual modification to the database files.

---

## 🛠 Installation & Settings

### Installation
```bash
npm install zero-db-engine
```

### Initial Configuration
```typescript
import { ZeroDB } from 'zero-db-engine';

const db = new ZeroDB("./databases", 256, {
  overwrite: false,
  backup: './backups',
});
```


### First-Run -> Create Database, User and Table Oparation
```typescript
  // 1. Database Preparation
  db.createDatabase('blog_db');
  // 2. User Preparation  
  db.addUser('admin', 'secretpass', 127, true, 'blog_db');
  // 3. Login & Access to Database
  db.login('blog_db', 'admin', 'secretpass'); 
  // 4. Table Creation
  db.createTable('posts', [
    { name: 'id', type: 'auto', option: { isAuto: true } },
    { name: 'title', type: 'string' },
    { name: 'content', type: 'string' }
  ]);
```

### First-Run -> Add Record & List Oparation.
```typescript
  const posts = db.table('posts');
  await posts.add({ title: 'Hello ZeroDB', content: 'This is my first post.' });
  const list = await posts.select('*').where({ title: 'Hello ZeroDB' }).list();
  console.log(list);
  db.exit();
```


### Custom AutoScaler & Settings Usage
```typescript

// 2. Create database (256MB cache, overwrite existing, with AutoScaler custom configuration)
const db = new ZeroDB('./databases', 256, {
  auth: { database: "my_app",  pass: "123456",  user: "admin" }, // Login Informations
  overwrite: false , // Database Overwrite
  backup: './my_backups' , // Backup Folder
  scaler: {
    sequentialThreshold: 10,    // Switch to batch processing after 10 records
    batchThreshold: 500,       // Switch to hybrid processing after 500 records
    workerThreshold: 10000,    // Switch to worker processing after 10K records
    streamThreshold: 100000,   // Switch to stream processing after 100K records
    maxWorkers: 4,             // Maximum number of worker threads
    batchSize: 100,            // Default batch size for operations
    adaptiveEnabled: true,     // Enable automatic scaling based on system resources
    metricsInterval: 1000,     // Metrics collection interval in ms
    memorySafetyThreshold: 0.85, // Scale down when memory usage > 85%
    cpuSafetyThreshold: 80       // Scale down when CPU usage > 80%
  }
});

```


### Methods
Data retrieval operations are performed with chained commands like `table.select(...).where(...).list()`:

| Method | What Does It Do? |
| :--- | :--- |
| `.where({ field: 'value' })` | Finds only rows where this field equals this value. |
| `.orWhere({ field: 'value' })` | Finds those matching one of the specified values. |
| `.whereIn('field', ['a', 'b'])` | Expects the field to match one of the values in this list. |
| `.whereBetween('field', 'min', 'max')` | Requires the value to be within the specified range. |
| `.like('field', 'pattern')` | Finds those matching a specific pattern (e.g., 'J%'). |
| `.asc('field')` | Sorts in ascending order. |
| `.desc('field')` | Sorts in descending order. |
| `.limit(number)` | Limits the number of resulting records to the specified number. |
| `.page(no)` | Divides the results into pages. |
| `.sum('field')` | Returns the sum of all values. |
| `.avg('field')` | Calculates the average of the values. |
| `.groupBy('field')` | Categorizes data by the specified field. |

#### Write Operations
- `.add(data)`: Adds a single record.
- `.addBatch([data1, data2])`: Adds multiple records.
- `.update(newData)`: Updates matching records.
- `.delete()`: Deletes matching records.
- `.upsert(data)`: Updates if exists, otherwise adds.


| Setting | Description |
| :--- | :--- |
| `db` | Default database name. |
| `auth` | Auto-login credentials `{ user, pass, database }`. |
| `overwrite` | If `true`, resets the database directory. |
| `backup` | Directory path for backup archives. |
| `scaler` | Auto-Scaling parameters (Thresholds for Batch, Worker, and Stream modes). |

---

## 🔐 User & Permission Management

ZeroDB uses a bitwise permission system for high-performance security checks.

| Permission | Array Key | Bit | Description |
| :--- | :--- | :--- | :--- |
| **Add** | `'add'` | 1 | Permission to insert new records. |
| **Delete** | `'delete'` | 2 | Permission to remove records. |
| **List** | `'list'` | 4 | Permission to query/read data. |
| **Update** | `'update'` | 8 | Permission to modify existing records. |
| **Create** | `'create'` | 16 | Permission to create new tables. |
| **Drop** | `'drop'` | 32 | Permission to delete entire tables. |
| **Rename** | `'rename'` | 64 | Permission to rename tables/fields. |
| **All** | `'all'` | 127 | All permissions granted. |


### Permission Options

| Format | Example | Best For |
|--------|---------|----------|
| **Number** | `127` | Advanced users |
| **Object** | `{ add: true, delete: false }` | Readable code |
| **Array** | `['add', 'update', 'list']` | Simple & clean |

### Available Permissions

| Permission | Array Value | Bit |
|------------|-------------|-----|
| Add records | `'add'` | 1 |
| Delete records | `'delete'` | 2 |
| List/Query records | `'list'` | 4 |
| Update records | `'update'` | 8 |
| Create tables | `'create'` | 16 |
| Drop tables | `'drop'` | 32 |
| Rename tables | `'rename'` | 64 |
| All permissions | `'all'` | 127 |



### Usage Examples:
```typescript
// Array format (Recommended)
db.addUser('editor', 'pass123', ['add', 'list', 'update'], false, 'myapp');

// Numeric format
db.addUser('admin', 'pass123', 127, true, 'myapp');

// Object format
db.addUser('viewer', 'pass123', { list: true }, false, 'myapp');
```

---

## 📖 API Reference

### Database Management

| Method | Description | Example |
| :--- | :--- | :--- |
| `createDatabase(name, options)` | Creates a new DB. | `db.createDatabase('db1', { isPublic: true })` |
| `dropDatabase(name)` | Completely deletes the DB. | `db.dropDatabase('db1')` |
| `listDatabases()` | Lists all DBs. | `const list = db.listDatabases()` |
| `renameDatabase(newName)` | Renames the current DB. | `db.renameDatabase('new_db')` |
| `setPublic(name, isPublic)` | Makes the DB public. | `db.setPublic('db1', true)` |


### 1. Table & Data Operations

Access table-specific methods via `db.table('tableName')`.

#### Querying (READ)
- `.select('*')` or `.select(['field1', 'field2'])`: Choose fields to retrieve.
- `.where({ id: '1' })`: Standard equality filter.
- `.orWhere({ status: 'pending' })`: OR condition.
- `.whereIn('category', ['electronics', 'books'])`: Match any in list.
- `.whereBetween('price', '10', '100')`: Range filter.
- `.like('name', 'John%')`: Pattern matching (SQL LIKE).
- `.asc('name')` / `.desc('date')`: Sorting.
- `.limit(10)` / `.page(1)`: Pagination.
- `.groupBy('city')`: Grouping results.
- `.distinct('email')`: Unique values only.

#### Data Modification (CUD)
- `.add({ name: 'Alice' })`: Insert one record.
- `.addBatch([{ name: 'A' }, { name: 'B' }])`: Fast batch insertion.
- `.update({ status: 'active' })`: Update records matching the criteria.
- `.delete()`: Remove records matching the criteria.
- `.upsert({ email: 'a@b.com', name: 'A' })`: Update if exists, otherwise insert.

### 2. Table Structure Modification (NEW)

`ALTER TABLE` operations using the fluent `modify()` API.

```typescript
await db.table('users').modify()
  .addField('phone', 'string', { maxLength: 20 })
  .renameField('username', 'fullname')
  .modifyField('age', 'number', { defaultValue: '18' })
  .dropField('temp_data')
  .commit();
```

### 3. Joins

ZeroDB supports `INNER`, `LEFT`, `RIGHT`, and `CROSS` joins.

```typescript
const result = await db.table("users")
  .select(["username", "email"])
  .join("orders", "userId", "id", ["orderId", "product"])
  .list();
```

---

## 📊 Performance Benchmarks

| Operation | 10K Records (Ops/Sec) | Status |
| :--- | :--- | :--- |
| **Query** | 1,250,000 | ✅ |
| **Insert** | 2,839 | ✅ |
| **Update** | 45,000 | ✅ |
| **Delete** | 61,000 | ✅ |

### Comparison

| Feature | SQLite | Redis | **ZeroDB** |
| :--- | :--- | :--- | :--- |
| Query Speed | 10K | 2M | **1.25M** |
| Zero Dependency | ✅ | ❌ | ✅ |
| Tamper-Proof | ❌ | ❌ | ✅ |
| Auto-Scaling | ❌ | ❌ | ✅ |

---

## 🛡️ Maintenance & Backup

ZeroDB includes a native backup manager to handle your data safely.

```typescript
// 1. Enter Maintenance Mode (Stops write operations)
db.backupManager.setMaintenanceMode(true);

// 2. Create Full Backup
await db.backup('stable-v1.tar.gz');

// 3. Restore
await db.restore('stable-v1.tar.gz');

// 4. Exit Maintenance Mode
db.backupManager.setMaintenanceMode(false);
```

---

## 📜 License
- **MIT** - Open source for everyone.
- **Commercial** - Dedicated support and custom features available.

---
*Developed with ❤️ by Levent Inan (@asymmetricstar)*
