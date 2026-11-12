# ZeroDB Engine

A simple, secure, zero-dependency, high-performance file-based database engine for Node.js.

ZeroDB combines the familiarity of SQL-style tables with the simplicity of a file-based system. No separate server, no native dependencies, no setup — just a folder for your data.

```js
import { ZeroDB } from 'zero-db';

const db = new ZeroDB('./data');
db.createDatabase('my_store');
db.useDatabase('my_store');
```

## Features

- **File-based, zero-dependency** — Data is stored as files. No server process, no native modules.
- **Atomic operations** — Writes are atomic, so you don't end up with partially committed data.
- **File locking** — Advisory locking at OS level for safe concurrent access.
- **Tamper-proof integrity** — Detects unauthorized modifications to stored data.
- **Encryption** — Industry-standard encryption for data at rest.
- **Auto-scaling** — Designed to handle from 10 records to 100M+ records without manual sharding.
- **Cluster & distributed operations** — Data can work across multiple servers with log-based synchronization.
- **Permissions & admin** — Built-in user management and an optional system admin.

## Installation

```bash
npm install zero-db-engine
```

> Package name on npm is `zero-db-engine`. Import name is `zero-db`.

Requires Node.js 18+.

## Quick Start

ZeroDB has no admin panel or automation dashboard. It is an engine, so setup and usage are two separate processes.

Run setup **once, manually**. Run your app code **every time**.

### 1. Setup — Run Once (`setup.js`)

Create the admin, database and table. Do not put this code in your app — run it once and delete it from your main flow.

```js
// setup.js — run once: node setup.js
import { ZeroDB } from 'zero-db';

const db = new ZeroDB('./data');

// System admin — created only once
db.systemadmin.createAdmin('admin', 'pass123');

// Database — created only once
db.createDatabase('my_store');
db.useDatabase('my_store');

// Table — created only once
db.createTable('products', [
  { name: 'id', type: 'number', option: { isAuto: true } },
  { name: 'name', type: 'string' },
  { name: 'price', type: 'number' },
]);

db.clear();
db.exit();
console.log('Setup done.');
```

### 2. Use — Every Run (`app.js`)

In your real application you only connect to the existing database and run queries. No `createAdmin`, no `createDatabase`, no `createTable`.

```js
// app.js — run every time: node app.js
import { ZeroDB } from 'zero-db';

const db = new ZeroDB('./data');

db.systemadmin.login('admin', 'pass123');
db.useDatabase('my_store');

const products = db.table('products');

// CRUD
await products.add({ name: 'Laptop', price: 1200 });

const all = await products.select('*').list();
console.log(all);

await products.where({ name: 'Laptop' }).update({ price: 1100 });
await products.where({ name: 'Laptop' }).delete();

db.clear();
db.exit();
```

> Why two files? If you run the setup code on every start, you will try to create the same admin / database / table again. Keep setup separate, run it once manually when you first create your data.

## Documentation

Full guides are in the `doc/` folder.

**Getting Started**

- [Configuration](doc/configuration.md) — All options

**Core Features**

- [Database](doc/database.md) — Create, drop, rename
- [Table & Data](doc/table-data.md) — CRUD, queries, joins
- [Permissions](doc/permissions.md) — User management

**Advanced**

- [SystemAdmin](doc/system-admin.md) — System-wide admin (optional)
- [Public Database](doc/public-database.md) — No-auth databases
- [Backup](doc/backup.md) — Backup & restore
- [Auto-Scaler](doc/auto-scaler.md) — Performance tuning

**Reference**

- [Field Types](doc/field-types.md) — All data types
- [API Reference](doc/api-reference.md) — Complete method list

Examples are in the `examples/` folder.

## Performance

Benchmarks below are from the local test suite with 10K records. Results vary by hardware, disk and Node.js version — use them as a rough indication, not a guarantee.

| Operation | Ops / sec (10K records) |
| --- | --- |
| Query | 1,250,000 |
| Insert | 2,839 |
| Update | 45,000 |
| Delete | 61,000 |

### Comparison

| Feature | SQLite | Redis | ZeroDB |
| --- | --- | --- | --- |
| Query speed | 10K | 2M | 1.25M |
| Zero dependency | Yes | No | Yes |
| Tamper-proof | No | No | Yes |
| Auto-scaling | No | No | Yes |

ZeroDB is not meant to replace SQLite or Redis in every case. Choose it when you want a zero-setup, file-based database with built-in integrity checks and no external service to manage.

## License

MIT — see [LICENSE](LICENSE) for details. Commercial support is available on request.

---

Developed by Levent Inan ([@asymmetricstar](https://github.com/asymmetricstar))
