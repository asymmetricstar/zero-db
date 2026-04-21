# Database Operations

Create, manage, and configure databases.

## Create Database

```typescript
db.createDatabase('myapp');
```

### Options

```typescript
// Public database (no login required)
db.createDatabase('public_app', { isPublic: true });

// Private with owners
db.createDatabase('private_app', { owner: ['admin', 'manager'] });
```

## List Databases

```typescript
const dbs = db.listDatabases();
console.log(dbs); // ['myapp', 'blog', 'users']
```

## Drop Database

```typescript
db.dropDatabase('old_app');
```

## Rename Database

```typescript
db.renameDatabase('old_name', 'new_name');
```

## Set Public/Private

```typescript
await db.setPublic('myapp', true);   // Public
await db.setPublic('myapp', false); // Private
```

## Database Info

```typescript
const info = db.getDatabaseInfo('myapp');
console.log({
  name: info.name,
  tables: info.tables,
  users: Array.from(info.users.keys()),
  isPublic: info.isPublic,
  owner: info.owner
});
```

## With SystemAdmin

When logged in as SystemAdmin, you can manage all databases:

```typescript
db.systemadmin.login('admin', 'pass');

// Use normal API - SystemAdmin has grand admin privileges
db.dropDatabase('any_database');
db.createDatabase('new_app');
```

## Public Database

Public databases work without login:

```typescript
db.createDatabase('blog', { isPublic: true });

// Query without login
const posts = db.table('posts');
```

See [Public Database](public-db.md) for details.