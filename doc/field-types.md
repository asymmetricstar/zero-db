# Field Types

Data types for table fields.

## Available Types

| Type | Description | Example |
|------|-------------|---------|
| `auto` | Auto-incrementing ID | `1`, `2`, `3` |
| `string` | Text (max 255 chars) | `'Hello World'` |
| `number` | Numeric values | `42`, `3.14` |
| `boolean` | True/false | `true`, `false` |
| `timestamp` | Auto-managed datetime | Auto-generated |
| `object` | Valid JSON | `{ key: 'value' }` |
| `any` | Free-form data | Any string |

## Usage

```typescript
db.createTable('users', [
  { name: 'id', type: 'auto' },
  { name: 'name', type: 'string' },
  { name: 'age', type: 'number' },
  { name: 'active', type: 'boolean' },
  { name: 'metadata', type: 'object' },
  { name: 'notes', type: 'any' }
]);
```

---

## Field Options

When creating a table, each field can have an `option` object:

```typescript
db.createTable('table_name', [
  {
    name: 'field_name',
    type: 'string',
    option: {
      isAuto: false,        // Auto-increment (for auto type only)
      allowNull: true,    // Allow null values
      defaultValue: '',   // Default value when not provided
      maxLength: 255     // Maximum character limit
    }
  }
]);
```

### Option: `isAuto`

Auto-increment field. Only works with `type: 'auto'`.

```typescript
db.createTable('posts', [
  { name: 'id', type: 'auto' }
]);
// or explicitly:
db.createTable('posts', [
  { name: 'id', type: 'auto', option: { isAuto: true } }
]);
```

### Option: `allowNull`

Whether the field can be null. Default: `true`.

```typescript
// Field CAN be null (default)
db.createTable('users', [
  { name: 'email', type: 'string', option: { allowNull: true } }
]);

// Field CANNOT be null
db.createTable('users', [
  { name: 'email', type: 'string', option: { allowNull: false } }
]);
```

### Option: `defaultValue`

Value used when no data is provided. Default: `''` (empty string).

```typescript
// String default
db.createTable('users', [
  { name: 'status', type: 'string', option: { defaultValue: 'active' } }
]);

// Number default
db.createTable('products', [
  { name: 'price', type: 'number', option: { defaultValue: '0' } }
]);

// Boolean default
db.createTable('users', [
  { name: 'active', type: 'boolean', option: { defaultValue: 'true' } }
]);
```

### Option: `maxLength`

Maximum character limit. Default: 255 for string, 65535 for object/any.

```typescript
// Limit title to 200 chars
db.createTable('posts', [
  { name: 'title', type: 'string', option: { maxLength: 200 } }
]);

// Long text (65535 max)
db.createTable('posts', [
  { name: 'content', type: 'string', option: { maxLength: 1000 } }
]);

// JSON data (65535 max)
db.createTable('users', [
  { name: 'profile', type: 'object', option: { maxLength: 65535 } }
]);
```

---

## Complete Examples

### Example 1: User Table

```typescript
db.createTable('users', [
  { name: 'id', type: 'auto' },
  { name: 'username', type: 'string', option: { maxLength: 50, allowNull: false } },
  { name: 'email', type: 'string', option: { maxLength: 100, allowNull: false } },
  { name: 'bio', type: 'string', option: { maxLength: 500 } },
  { name: 'age', type: 'number', option: { defaultValue: '18' } },
  { name: 'active', type: 'boolean', option: { defaultValue: 'true' } },
  { name: 'metadata', type: 'object' }
]);
```

### Example 2: Product Table

```typescript
db.createTable('products', [
  { name: 'id', type: 'auto' },
  { name: 'name', type: 'string', option: { maxLength: 200, allowNull: false } },
  { name: 'price', type: 'number', option: { defaultValue: '0' } },
  { name: 'description', type: 'string', option: { maxLength: 2000 } },
  { name: 'in_stock', type: 'boolean', option: { defaultValue: 'false' } },
  { name: 'json_data', type: 'object' }
]);
```

---

## Adding Fields Later

You can add new fields to an existing table using `modify()`:

```typescript
await db.table('users').modify()
  .addField('phone', 'string', { maxLength: 20 })
  .addField('verified', 'boolean', { defaultValue: 'false' })
  .commit();
```

---

## Modifying Field Options

Change options on existing fields:

```typescript
await db.table('users').modify()
  .modifyField('email', 'string', { maxLength: 150, allowNull: false })
  .commit();
```

---

## Summary

| Option | Type | Default | Description |
|-------|------|---------|-------------|
| `isAuto` | boolean | `false` | Auto-increment |
| `allowNull` | boolean | `true` | Allow null |
| `defaultValue` | string | `''` | Default value |
| `maxLength` | number | `255` | Max characters |