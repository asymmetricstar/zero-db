# ⚡ ZeroDB Engine

> **Next-Gen File-Based Database** - A simple, secure, zero-dependency, and high-performance database engine for Node.js.

---

## 🚀 Architecture

ZeroDB combines the power of SQL databases with the simplicity of file-based systems.

- **Cluster & Distributed Operations:** Data works simultaneously across multiple servers
- **File Locking Mechanism:** Advisory Locking at OS level
- **Atomic Operations:** Eliminates partially committed data risk
- **Log-Based Synchronization:** Real-time state synchronization
- **Strong Encryption:** Industry-standard security protocols
- **Auto-Scaling:** Handles 10 to 100M+ records automatically
- **Tamper-Proof Integrity:** Detects unauthorized modifications

---

## 📦 Installation

```bash
npm install zero-db-engine
```

---

## 🏃 Quick Start

```typescript
import { ZeroDB } from 'zero-db-engine';

const db = new ZeroDB('./data');

// 1. Create database
db.createDatabase('blog');

// 2. Create user and assign as owner
db.addUser('admin', 'pass123', 127, true);
db.addOwner('blog', 'admin');

// 3. Login
db.login('blog', 'admin', 'pass123');

// 4. Create table
db.createTable('posts', [
  { name: 'id', type: 'auto' },
  { name: 'title', type: 'string' },
  { name: 'content', type: 'string' }
]);

// 5. CRUD operations
const posts = db.table('posts');
await posts.add({ title: 'Hello ZeroDB', content: 'First post' });
const list = await posts.select('*').list();

db.exit();
```

---

## 📖 Documentation

### Getting Started
| Guide | Description |
|-------|-------------|
| [Configuration](doc/configuration.md) | All options |

### Core Features
| Guide | Description |
|-------|-------------|
| [Database](doc/database.md) | Create, drop, rename |
| [Table & Data](doc/table.md) | CRUD, queries, joins |
| [Permissions](doc/permissions.md) | User management |

### Advanced
| Guide | Description |
|-------|-------------|
| [SystemAdmin](doc/systemadmin.md) | System-wide admin (optional) |
| [Public Database](doc/public-db.md) | No-auth databases |
| [Backup](doc/backup.md) | Backup & restore |
| [Auto-Scaler](doc/auto-scaler.md) | Performance tuning |

### Reference
| Guide | Description |
|-------|-------------|
| [Field Types](doc/field-types.md) | All data types |
| [API Reference](doc/api-reference.md) | Complete method list |

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


## 📜 License

- **MIT** - Open source
- **Commercial** - Dedicated support available

---

*Developed by Levent Inan (@asymmetricstar)*