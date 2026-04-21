# Table & Data Operations

CRUD operations and queries.

## Create Table

```typescript
db.createTable('users', [
  { name: 'id', type: 'auto' },
  { name: 'name', type: 'string' },
  { name: 'email', type: 'string' }
]);
```

## Access Table

```typescript
const users = db.table('users');
```

## Insert Data

```typescript
// Single record
await users.add({ name: 'Alice', email: 'alice@example.com' });

// Multiple records
await users.addBatch([
  { name: 'Bob', email: 'bob@example.com' },
  { name: 'Carol', email: 'carol@example.com' }
]);
```

## Select Data

```typescript
// All
await users.select('*').list();

// Specific columns
await users.select(['name', 'email']).list();

// With filter
await users.select('*').where({ name: 'Alice' }).list();

// First match
await users.select('*').where({ id: '1' }).first();

// Limit
await users.select('*').limit(10).list();

// Sorted
await users.select('*').orderBy('name', 'asc').list();

// Search
await users.select('*').like('name', 'A%').list();
```

## Update Data

```typescript
await users.update({ name: 'Alice Smith' })
  .where({ name: 'Alice' })
  .commit();
```

## Delete Data

```typescript
await users.delete().where({ name: 'Alice' }).commit();
```

## Upsert (Update or Insert)

```typescript
await users.upsert({ email: 'alice@example.com', name: 'Alice' })
  .where({ email: 'alice@example.com' })
  .commit();
```

## Query Operators

| Method | Description |
|--------|-------------|
| `.where({ field: 'value' })` | Equal |
| `.orWhere({ field: 'value' })` | OR |
| `.whereIn('field', ['a', 'b'])` | IN list |
| `.whereBetween('field', 'min', 'max')` | Range |
| `.like('field', 'pattern')` | Pattern matching |

## Query Modifiers

| Method | Description |
|--------|-------------|
| `.select('*')` | All fields |
| `.select(['field1', 'field2'])` | Specific fields |
| `.orderBy('field', 'asc')` | Sort |
| `.limit(10)` | Limit results |
| `.page(1)` | Pagination |
| `.groupBy('field')` | Group results |
| `.distinct('field')` | Unique values |

## ALTER TABLE

```typescript
await db.table('users').modify()
  .addField('phone', 'string', { maxLength: 20 })
  .renameField('username', 'fullname')
  .modifyField('age', 'number', { defaultValue: '18' })
  .dropField('temp')
  .commit();
```

## Joins

```typescript
const result = await db.table('users')
  .select(['users.name', 'orders.total'])
  .join('orders', 'users.id', 'orders.user_id')
  .list();
```