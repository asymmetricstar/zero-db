# ⚡ ZeroDB Engine

> **Next-Gen File-Based Database** - A simple, secure, zero-dependency database engine for Node.js. Perfect for local storage, IoT, and embedded applications.

---

## 🚀 ZeroDB Architecture

-  * Cluster & Distributed Operations: ZeroDB offers a cluster architecture that enables data to work simultaneously and synchronously across multiple servers. Thanks to its distributed structure, your data is replicated across different points seamlessly with high availability.

   * File Locking Mechanism: To prevent multiple servers from conflicting on the same file, it uses "Advisory Locking" at the operating system level. This ensures no data conflicts occur during operations.

   * Atomic Operations: Eliminates the risk of "partially committed data" during data transfer between servers. Data is first prepared in a temporary file and, once the operation is flawlessly approved, it's replaced with the original file in a single atomic step.

   * Log-Based Synchronization: To maintain the current state between servers, it keeps every change in small log files. Other servers monitor these logs to continuously keep their local data up-to-date.

- **Strong Encryption:** Your data is protected with industry-standard security protocols.
- **Auto-Scaling:** Whether your data consists of 10 records or 100 Million records, ZeroDB analyzes your resources and automatically optimizes itself relative to CPU power.
- **Zero Dependency:** Start using it immediately without dealing with complex configurations.
- **Data Integrity:** Thanks to its Tamper-Proof structure, if any unauthorized modification is made to your data, the system instantly detects it.
- **TB+ Data Capacity:** With its limitless structure, ZeroDB does not compromise on performance as your data grows.

---

## 🛠 ZeroDB Initial Settings

The settings for the `const db = new ZeroDB(directory, memory, settings);` command are as follows:

| Setting | Description |
| :--- | :--- |
| `db` | Default database name to connect to. |
| `auth` | Automatic login information with `{ user: "username", pass: "password" }`. |
| `overwrite` | If `true`, deletes the existing database and sets it up from scratch. |
| `backup` | Folder path where backups will be saved (default: `./backup`). |
| `scaler` | **Auto-Scaling Settings (Detailed):** |
| `scaler.sequentialThreshold` | Switches from sequential processing to batch processing after 10 records. |
| `scaler.batchThreshold` | Switches to hybrid processing after 500 records. |
| `scaler.workerThreshold` | Switches to background workers after 10,000 records. |
| `scaler.streamThreshold` | Switches to stream mode after 100,000 records. |
| `scaler.maxWorkers` | Maximum number of workers to run based on CPU power. |
| `scaler.adaptiveEnabled` | Automatically adjusts itself based on system load (true/false). |
| `scaler.memorySafetyThreshold` | Puts the system into protection by slowing it down if memory usage exceeds 85%. |
| `scaler.cpuSafetyThreshold` | Puts the system into protection by slowing it down if CPU usage exceeds 80%. |

---

## 🔐 User and Permission Management

### Add User: `db.addUser(name, password, permissions, is_admin, database)`

**Permissions (Permission List):**
- `'add'`: Can add data.
- `'delete'`: Can delete data.
- `'list'`: Can read/query data.
- `'update'`: Can update data.
- `'create'`: Can create new tables.
- `'drop'`: Can completely drop a table.
- `'rename'`: Can rename a table.
- `'all'`: All permissions (Numeric equivalent: 127).

---
## 💻 Quick Start

### Installation
[ZeroDB First Run](./install.md)

```bash
npm install zero-db-engine
```

### Basic Usage

```typescript
import { ZeroDB } from 'zero-db-engine';


// 1. Create database (256MB cache, overwrite existing, without AutoScaler)
  const db = new ZeroDB("./databases", 256, {
    auth: { database: "my_app", pass: "123456", user: "admin" },
    overwrite: false ,
    backup: './my_backups' ,
  });


// 2. Create database (256MB cache, overwrite existing, with AutoScaler configuration)
const db = new ZeroDB('./databases', 256, {
  overwrite: false ,
  backup: './my_backups' ,
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

// Create database & user
db.createDatabase('myapp');
db.addUser('admin', 'password123', ['add','delete','list','update','create','drop','rename'], true, 'myapp');
//db.deleteUser('eskikullanici', 'my_app'); -> Delete user
db.login('myapp', 'admin', 'password123');

// Create table
db.createTable('users', [
  { name: 'id', type: 'auto', option: { isAuto: true } },
  { name: 'name', type: 'string' },
  { name: 'email', type: 'string' }
]);

// CRUD Operations
const users = db.table('users');
await users.add({ name: 'John', email: 'john@test.com' });
const all = await users.select('*').list();
await users.where({ name: 'John' }).update({ name: 'John Doe' });
await users.where({ name: 'John' }).delete();

// Exit
db.exit();
```

---

## 📖 API Reference

### Database Operations

```typescript
// Create/Drop databases
db.createDatabase('my_db');
db.dropDatabase('my_db');
const dbs = db.listDatabases();
const info = db.getDatabaseInfo('my_db');
```

### Users & Permissions

```typescript
// Add user - Number format
db.addUser('admin', 'password123', 127, true, 'myapp');

// Add user - Object format
db.addUser('admin', 'password123', {
  add: true,
  delete: false,
  list: true
}, false, 'myapp');

// Add user - Array format (recommended)
db.addUser('editor', 'pass', ['add', 'update', 'list'], false, 'myapp');

// Login/Logout
db.login('my_db', 'username', 'password');
db.logout();

// Delete user
db.deleteUser('username', 'my_db');

// Public/Private
db.setPublic('my_db', true);

// Owners
db.addOwner('my_db', 'username');
db.removeOwner('my_db', 'username');
```

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


**Examples:**
```typescript
// All permissions
db.addUser('admin', 'pass', 'all', true, 'myapp');
db.addUser('admin', 'pass', ['add','delete','list','update','create','drop','rename'], true, 'myapp');

// Specific permissions
db.addUser('editor', 'pass', ['add', 'update', 'list'], false, 'myapp');
```

### Table Operations

```typescript
db.createTable('products', [
  { name: 'id', type: 'auto', option: { isAuto: true } },
  { name: 'name', type: 'string', option: { maxLength: 100 } },
  { name: 'price', type: 'number' }
]);
db.dropTable('products');
db.renameTable('old', 'new');
```

### CRUD Operations

```typescript
const table = db.table('users');

// Create
await table.add({ name: 'John', email: 'john@test.com' });
await table.addBatch([{ name: 'A' }, { name: 'B' }]);

// Read
await table.select('*').list();
await table.select(['name', 'email']).where({ name: 'John' }).list();
await table.where({ id: '1' }).first();
await table.count();

// Update
await table.where({ name: 'John' }).update({ name: 'John Doe' });

// Delete
await table.where({ name: 'John' }).delete();

// Upsert (Insert or Update)
await table.where({ email: 'john@test.com' }).upsert({ name: 'John', email: 'john@test.com' });
```

### Query Options

```typescript
const table = db.table('users');

// Filter (WHERE)
await table.where({ status: 'active' }).list();

// LIKE search
await table.like('name', 'J%').list();

// Sorting (ORDER BY)
await table.asc('name').list();              // Ascending
await table.desc('created_at').list();      // Descending
await table.orderBy('name', 'desc').list(); // Flexible (default asc)

// Pagination
await table.select('*').limit(10).list();           // First 10 records
await table.select('*').page(1).list();            // Page 1 (default 10 records)
await table.select('*').page(2).limit(20).list(); // Page 2, 20 records/page
await table.select('*').range(0, 10).list();      // Range (min-max)

// Count
await table.count();

// First record
await table.where({ id: '1' }).first();

// Aggregation
await table.sum('price');     // Sum
await table.avg('age');       // Average
await table.min('price');     // Minimum
await table.max('price');    // Maximum
await table.groupBy('category').list();  // Grouping
await table.distinct('category').list(); // Unique values (removes duplicates)

// Complex Conditions
await table.orWhere({ status: 'active' }).list();
await table.whereIn('id', ['1', '2', '3']).list();
await table.whereBetween('age', '18', '65').list();
```
---


## Example Usage

Let's assume you have set up tables named `users`, `orders`, `addresses`, and `no_orders_users` and populated them with data as shown in the test cases.

**Users Table (simplified schema):**
- `id` (auto, primary key)
- `username` (string)
- `email` (string)

**Orders Table (simplified schema):**
- `orderId` (auto, primary key)
- `userId` (string, foreign key to `users.id`)
- `product` (string)
- `amount` (number, although stored as string in test setup)

**Addresses Table (simplified schema):**
- `addressId` (auto, primary key)
- `userId` (string, foreign key to `users.id`)
- `address` (string)
- `id` (string, potential naming conflict with `users.id`)

### Example 1: INNER JOIN to get users and their orders

This query will return only users who have placed orders, along with their order details. The `join` method takes the right table name, the foreign key field in the right table, the primary key field in the left table, and an array of fields to select from the right table.

```typescript
import { ZeroDB } from 'zero-db';
import * as path from 'path';

// Assuming db is initialized and tables are set up as in join-test.ts
// const db = new ZeroDB(path.join(__dirname, 'test_databases', 'new_join_test_db'));
// db.useDatabase('join_db');

async function getUsersWithOrders(db: ZeroDB) {
  try {
    const usersTable = db.table("users");
    if (!usersTable) throw new Error("Users table not found.");

    // Using the programmatic API for INNER JOIN
    const queryResult = await usersTable
      .select(["id", "username", "email"]) // Fields from the 'users' table
      .join("orders", "userId", "id", ["orderId", "product", "amount"]) // Join with 'orders'
      .list(); // Execute the query

    console.log("Users with their orders:", queryResult);
    /* Expected Output might look like:
    [
      { id: '1', username: 'alice', email: 'alice@example.com', orderId: '101', product: 'Laptop', amount: '1200' },
      { id: '1', username: 'alice', email: 'alice@example.com', orderId: '102', product: 'Mouse', amount: '25' },
      { id: '2', username: 'bob', email: 'bob@example.com', orderId: '103', product: 'Keyboard', amount: '75' }
    ]
    */

  } catch (error) {
    console.error("Error executing join query:", error);
  }
}

// To run this example, you would need to initialize ZeroDB and set up tables.
// Example call (assuming db is initialized):
// getUsersWithOrders(db);
```
### Example 3: Handling Field Name Conflicts during Joins

When joining tables where a field name is the same in both tables (e.g., `id` in `users` and `addresses`), ZeroDB automatically renames the conflicting field from the *right* table to prevent ambiguity. It typically appends `_0` to the conflicting field name from the right table.

```typescript
import { ZeroDB } from 'zero-db';
import * as path from 'path';

// Assuming db is initialized and tables are set up as in join-test.ts
// const db = new ZeroDB(path.join(__dirname, 'test_databases', 'new_join_test_db'));
// db.useDatabase('join_db');

async function joinWithFieldConflict(db: ZeroDB) {
  try {
    const usersTable = db.table("users");
    if (!usersTable) throw new Error("Users table not found.");

    const queryResult = await usersTable
      .where({ username: "alice" })
      .join("addresses", "userId", "id", ["address", "id"]) // Joining with 'addresses' which also has an 'id' field
      .list();

    console.log("Join with field conflict:", queryResult);
    /* Expected Output might look like:
    [
      {
        id: '1', // users.id
        username: 'alice',
        email: 'alice@example.com',
        address: '123 Main St',
        id_0: 'address_abc' // addresses.id, renamed to id_0 due to conflict
      }
    ]
    */
  } catch (error) {
    console.error("Error executing join with field conflict:", error);
  }
}

// Example call:
// joinWithFieldConflict(db);
```

**Note:** The exact API methods (`db.table()`, `.select()`, `.join()`, `.leftJoin()`, `.where()`, `.list()`) and their parameters are based on the observed syntax in `join-test.ts`. You should refer to the `zero-db` project's specific documentation or source code for definitive usage.



## 🛡 Maintenance and Backup
[Backup / Restore Example](./backup.md)

1. **Maintenance Mode:** `db.backupManager.setMaintenanceMode(true);` (Stops writing).
2. **Backup:** `await db.backup('backup.tar.gz');`
3. **Restore:** `await db.restore('backup.tar.gz');`
4. **Exit Mode:** `db.backupManager.setMaintenanceMode(false);` (Reactivates the system).
5. **Set Backup Folder:** `ZeroDB("./databases", 256, { backup: './my_backups'});` (ZeroDB instance to use the ./my_backups directory).

---

## **Performance Test Results**
[Results Details](./test_raporu.md)

### Data Integrity (0 errors, 0 data loss)

| Records | Inserted | Retrieved | Status |
|---------|----------|-----------|--------|
| 1K | 1,000 | 1,000 | ✅ |
| 10K | 10,000 | 10,000 | ✅ |
| 100K | 100,000 | 100,000 | ✅ |

### Operations per Second

| Operation | 1K Records | 10K Records |
|-----------|------------|--------------|
| **Query** | 500K ops/s | 1.25M ops/s |
| **Insert** | 7,752 ops/s | 2,839 ops/s |
| **Update** | 50K ops/s | 45K ops/s |
| **Delete** | 47K ops/s | 61K ops/s |

### Auto-Scaling Strategies

| Data Size | Strategy | Threads |
|-----------|----------|----------|
| < 10 | sequential | 1 |
| 10-500 | batch | 2-4 |
| 500-10K | hybrid | 4-8 |
| 10K-100K | worker | 8-16 |
| > 100K | stream | 16-32 |

---

## 🏆 Comparison

| Feature | SQLite | PostgreSQL | Redis | **ZeroDB** |
|---------|--------|------------|-------|------------|
| Query Speed | 10K | 100K | 2M | **1.25M** |
| Zero Dependency | ✅ | ❌ | ❌ | ✅ |
| Tamper-Proof | ❌ | ✅ | ❌ | ✅ |
| Auto-Scaling | ❌ | ❌ | ❌ | ✅ |
| Easy Setup | ✅ | ❌ | ❌ | ✅ |

---


## License

- **MIT** - Open source
- **Commercial** - Available for paid versions

---

*ZeroDB | Author: Levent Inan (@asymmetricstar)*
