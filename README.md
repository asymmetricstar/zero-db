# ⚡ ZeroDB Engine

> **Next-Gen File-Based Database** - A simple, secure, zero-dependency database engine for Node.js. Perfect for local storage, IoT, and embedded applications.

---

## 🚀 Why ZeroDB?

- **Zero Dependencies** - No external packages required
- **TypeScript** - Full type safety
- **Tamper-Proof** - CRC32 data integrity protection
- **Auto-Scaling** - Automatic performance optimization
- **Easy Setup** - Install and use in seconds
- **TB+ Data Support** - Handles large datasets

---

## 💻 Quick Start

### Installation
[ZeroDB Install Docs](./install.md)

```bash
npm install zero-db-engine
```

### Basic Usage

```typescript
import { ZeroDB } from 'zero-db-engine';

// Create database (256MB cache, overwrite existing)
const db = new ZeroDB('./databases', 256, { overwrite: true });

// Create database & user
db.createDatabase('myapp');
db.addUser('admin', 'password123', ['add','delete','list','update','create','drop','rename'], true, 'myapp');
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
```

### Query Options

```typescript
// Filter
await table.where({ status: 'active' }).list();

// Like
await table.like('name', 'J%').list();

// Sort
await table.asc('name').list();
await table.desc('created_at').list();

// Pagination
await table.select('*').limit(10).offset(20).list();
```

---

## 📊 Performance Test Results

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

*ZeroDB v1.0 | Author: Levent Inan (@asymmetricstar)*