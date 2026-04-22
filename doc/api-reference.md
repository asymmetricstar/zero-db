# API Reference

Complete method reference for ZeroDB engine.

## ZeroDB Methods

### Database Operations

| Method | Description | Returns |
|--------|-------------|---------|
| `createDatabase(name, options)` | Create database | `boolean` |
| `dropDatabase(name)` | Delete database | `boolean` |
| `renameDatabase(newName)` | Rename current DB | `ZeroDB` |
| `listDatabases()` | List all databases | `string[]` |
| `setPublic(name, isPublic)` | Set public/private | `Promise<boolean>` |
| `getDatabaseInfo(name)` | Get DB info | `DatabaseInfo` |
| `useDatabase(name)` | Switch database | `boolean` |

### User Authentication

| Method | Description | Returns |
|--------|-------------|---------|
| `login(db, user, pass)` | Login to database | `boolean` |
| `logout()` | Logout | `void` |
| `isAuthenticated()` | Check login status | `boolean` |

### User Management

| Method | Description | Returns |
|--------|-------------|---------|
| `addUser(user, pass, perms, isGrand, db?)` | Add new user (db optional) | `ZeroDB | null` |
| `updateUser(user, pass?, perms?, isGrand?, status?)` | Update existing user (db optional) | `ZeroDB | null` |
| `deleteUser(user, db?)` | Delete user | `ZeroDB | null` |
| `listUsers(db?)` | List users | `string[]` |
| `addOwner(db, user)` | Assign user to database | `Promise<boolean>` |
| `removeOwner(db, user)` | Remove user from database | `Promise<boolean>` |

### Table Operations

| Method | Description | Returns |
|--------|-------------|---------|
| `createTable(name, fields)` | Create table | `QueryBuilder` |
| `dropTable(name)` | Delete table | `boolean` |
| `getTables(db?)` | List tables | `string[]` |
| `table(name)` | Access table | `QueryBuilder` |
| `renameTable(old, new)` | Rename table | `ZeroDB` |
| `renameField(table, old, new)` | Rename field | `ZeroDB` |

### System

| Method | Description | Returns |
|--------|-------------|---------|
| `exit()` | Exit | `void` |
| `clearCache()` | Clear cache | `void` |
| `getCacheStats()` | Cache stats | `object` |
| `getConnectionPool()` | Connection pool | `ConnectionPool` |

### Backup

| Method | Description | Returns |
|--------|-------------|---------|
| `backup(filename)` | Create backup | `Promise<string>` |
| `restore(filename)` | Restore backup | `Promise<void>` |

### SystemAdmin

| Method | Description | Returns |
|--------|-------------|---------|
| `systemadmin.createAdmin(user, pass)` | Create SystemAdmin | `boolean` |
| `systemadmin.login(user, pass)` | Login | `boolean` |
| `systemadmin.logout()` | Logout | `void` |
| `systemadmin.active` | Is active | `boolean` |
| `systemadmin.has` | Exists | `boolean` |
| `systemadmin.info` | Info | `SystemAdminCredentials` |
| `systemadmin.update(user, pass)` | Update password | `boolean` |

## QueryBuilder Methods

### Read Operations

| Method | Description |
|--------|-------------|
| `select(fields)` | Select fields |
| `where(condition)` | Filter |
| `orWhere(condition)` | OR filter |
| `whereIn(field, values)` | IN filter |
| `whereBetween(field, min, max)` | Range filter |
| `like(field, pattern)` | Pattern match |
| `orderBy(field, dir)` | Sort (asc/desc) |
| `limit(n)` | Limit results |
| `page(n)` | Pagination |
| `groupBy(field)` | Group results |
| `distinct(field)` | Unique values |
| `first()` | First result |
| `list()` | All results |

### Write Operations

| Method | Description |
|--------|-------------|
| `add(data)` | Insert |
| `addBatch(data[])` | Batch insert |
| `update(data)` | Update |
| `delete()` | Delete |
| `upsert(data)` | Update or insert |

### ALTER TABLE

```typescript
db.table('name').modify()
  .addField(name, type, options)
  .renameField(old, new)
  .modifyField(name, type, options)
  .dropField(name)
  .commit()
```

## Configuration Options

```typescript
new ZeroDB(rootPath?, cacheMB?, options?)
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `database` | `string` | - | Auto-connect DB |
| `auth.user` | `string` | - | Username |
| `auth.pass` | `string` | - | Password |
| `overwrite` | `boolean` | `false` | Reset directory |
| `backup` | `string` | `'./backup'` | Backup folder |
| `scaler` | `object` | - | Auto-scaler config |