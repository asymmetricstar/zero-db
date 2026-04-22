# Quick Start

Get ZeroDB running in 5 minutes.

## 1. Installation

```bash
npm install zero-db-engine
```

## 2. Basic Setup

```typescript
import { ZeroDB } from 'zero-db-engine';

const db = new ZeroDB('./data');
```

## 3. Create Database

```typescript
db.createDatabase('myapp');
```

## 4. Create User

Create a user with full permissions (grand admin):

```typescript
// user, password, permissions, isGrand, database
db.addUser('admin', 'password123', 127, true, 'myapp');
```

## 5. Login & Create Table

```typescript
db.login('myapp', 'admin', 'password123');

db.createTable('users', [
  { name: 'id', type: 'auto' },
  { name: 'name', type: 'string' },
  { name: 'email', type: 'string' }
]);
```

## 6. CRUD Operations

```typescript
const users = db.table('users');

// Create
await users.add({ name: 'Alice', email: 'alice@example.com' });

// Read
const alice = await users.select('*').where({ name: 'Alice' }).first();

// Update
await users.update({ email: 'new@example.com' }).where({ name: 'Alice' }).commit();

// Delete
await users.delete().where({ name: 'Alice' }).commit();
```

## Complete Example

```typescript
import { ZeroDB } from 'zero-db-engine';

const db = new ZeroDB('./data');

// Setup
db.createDatabase('blog');
db.addUser('admin', 'pass123', 127, true, 'blog');

// Login
db.login('blog', 'admin', 'pass123');

// Create table
db.createTable('posts', [
  { name: 'id', type: 'auto' },
  { name: 'title', type: 'string' },
  { name: 'content', type: 'string' }
]);

// Insert data
const posts = db.table('posts');
await posts.add({ title: 'Hello', content: 'My first post' });

// Query
const all = await posts.select('*').list();
console.log(all);

// Exit
db.exit();
```

## Next Steps

- [Configuration](configuration.md) - More setup options
- [Permissions](permissions.md) - User access control
- [SystemAdmin](systemadmin.md) - System-wide admin (optional)