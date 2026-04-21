# Public Database

ZeroDB supports **public databases** that work without authentication. Any user can query public databases without logging in.

## Overview

Public databases are perfect for:
- **Read-only data** - public information, catalogs, settings
- **Open APIs** - data that everyone can access
- **Guest access** - without user registration

## Create Public Database

```typescript
const db = new ZeroDB('./data');

db.createDatabase('public_blog', { isPublic: true });
```

## Query Without Login

### Method 1: Auto-connect on Startup

```typescript
const db = new ZeroDB('./data', 128, { 
  database: 'public_blog' 
});

const posts = db.table('posts');
const list = await posts.select('*').list();
```

### Method 2: Direct Access

```typescript
const db = new ZeroDB('./data');

const posts = db.table('posts');
const list = await posts.select('*').list();
```

ZeroDB automatically finds and connects to the first public database.

## Automatic Connection

ZeroDB auto-connects to public databases when:

1. **`database` option is set:**
```typescript
new ZeroDB('./data', 128, { database: 'public_blog' });
```

2. **`db.table()` is called** without current database:
```typescript
const db = new ZeroDB('./data');
db.table('posts');  // Auto-finds and connects to public DB
```

## Guest User

When accessing a public database without login, ZeroDB creates a **guest user** with:

| Property | Value |
|----------|-------|
| username | `'guest'` |
| permission | `31` (add, delete, list, update) |
| isGrand | `false` |

## Set Database to Public

### At Creation

```typescript
db.createDatabase('my_db', { isPublic: true });
```

### After Creation

```typescript
await db.setPublic('my_db', true);
```

## Examples

### Read-Only Blog

```typescript
const db = new ZeroDB('./data', 128, { database: 'blog' });

const posts = db.table('posts');
const recentPosts = await posts
  .select(['id', 'title', 'created_at'])
  .orderBy('created_at', 'desc')
  .limit(10)
  .list();

console.log(recentPosts);
```

### Public Settings

```typescript
db.createDatabase('settings', { isPublic: true });
db.createTable('settings', [
  { name: 'key', type: 'string' },
  { name: 'value', type: 'string' }
]);

db.table('settings').add({ key: 'site_name', value: 'My Blog' });
db.table('settings').add({ key: 'theme', value: 'dark' });

const settings = await db.table('settings').select('*').list();
const config = Object.fromEntries(settings.map(s => [s.key, s.value]));
console.log(config);
// { site_name: 'My Blog', theme: 'dark' }
```

## Make Database Private Again

```typescript
await db.setPublic('public_blog', false);
```

Now login is required:

```typescript
db.login('public_blog', 'admin', 'password');
db.table('posts');
```

## Options Reference

| Option | Description | Type |
|--------|-------------|------|
| `isPublic` | Make database public | `boolean` |
| `owner` | Restrict to owners | `string[]` |

### Examples

```typescript
// Fully public
db.createDatabase('public_db', { isPublic: true });

// Owner-only (but still requires login)
db.createDatabase('owner_db', { isPublic: false, owner: ['admin'] });

// Private with password
db.createDatabase('private_db', { isPublic: false });
```

## Security Notes

1. **Public = No Auth** - Anyone can read and write
2. **Guest Permissions** - Limited to basic operations (add, delete, list, update)
3. **No Grand Admin** - Guest cannot drop tables or databases
4. **Combine with SystemAdmin** - Use for full control:

```typescript
db.systemadmin.login('admin', 'password');
db.createTable('posts', [...], 'public_blog');  // Admin operations
```

---

*Zero-DB File-Based Database Engine*
*Author: Levent Inan (@asymmetricstar)*