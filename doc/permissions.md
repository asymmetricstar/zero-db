# Permissions

User management and access control in ZeroDB.

## Permission Table

Each permission has a numeric value. Add them together:

```typescript
// Example: Add(1) + List(4) + Update(8) = 13
db.addUser('editor', 'pass', 13, false);
```

| Name | Value | Description |
|------|-------|-------------|
| Add | 1 | Insert new records |
| Delete | 2 | Delete existing records |
| List | 4 | Query and read data |
| Update | 8 | Modify existing records |
| Create | 16 | Create new tables |
| Drop | 32 | Delete tables |
| Rename | 64 | Rename tables/fields |

## Common Permission Values

| Value | Permissions | Use Case |
|-------|-------------|---------|
| 1 | Add only | Can insert |
| 3 | Add + Delete | Can insert/delete |
| 5 | Add + List | Can insert/read |
| 7 | Add + Delete + List | Basic CRUD |
| 13 | Add + List + Update | Insert/read/update |
| 15 | Add + Delete + List + Update | Standard CRUD |
| 31 | Add + Delete + List + Update + Create + Drop | Table manager |
| 63 | All except Rename | Advanced user |
| 127 | All permissions | Full admin |

## How to Use

### Array Format (Recommended)

```typescript
// Clear and readable
db.addUser('editor', 'pass', ['add', 'list', 'update'], false);

// Multiple permissions
db.addUser('moderator', 'pass', ['add', 'delete', 'list', 'update'], false);
```

### Object Format

```typescript
// Explicit true/false
db.addUser('viewer', 'pass', { list: true }, false);

// Mixed
db.addUser('limited', 'pass', { list: true, add: true }, false);
```

### Numeric Format

```typescript
// Direct value
db.addUser('editor', 'pass', 13, false);

// Common values
db.addUser('admin', 'pass', 127, true);      // Full
db.addUser('user', 'pass', 31, false);        // Without rename
db.addUser('viewer', 'pass', 4, false);      // Read only
```

## Grand Admin (isGrand)

When `isGrand = true`, user has **full access** to all assigned databases:

```typescript
db.addUser('superadmin', 'pass', 127, true);
```

Grand admin can:
- Perform all operations on assigned databases
- Add/remove users
- Create/drop tables
- Bypass permission checks

## Database Assignment

The `dbName` parameter is **optional**. Users can be assigned to databases in two ways:

### 1. Assign when creating database (owner)

```typescript
// Create database and assign owner
db.createDatabase('blog', { owner: ['admin', 'editor'] });
```

### 2. Assign later using addOwner

```typescript
// Add user first (without database)
db.addUser('john', 'pass123', 127, true);

// Then assign to database
db.addOwner('blog', 'john');
```

### Optional dbName Parameter

```typescript
// With explicit database
db.addUser('editor', 'pass', 13, false, 'blog');

// Without database (user created, assign later)
db.addUser('editor', 'pass', 13, false);

// Same as above
db.addUser('editor', 'pass', 13, false, undefined);
```

## Examples

### Read-Only User

```typescript
db.addUser('reader', 'pass', ['list'], false);
```

### Content Editor

```typescript
db.addUser('editor', 'pass', ['add', 'delete', 'list', 'update'], false);
```

### Full Admin

```typescript
db.addUser('admin', 'pass', 127, true);
```

### Custom Combination

```typescript
// Can add and list, but NOT delete or update
db.addUser('contributor', 'pass', ['add', 'list'], false);
```

### With Database Assignment

```typescript
// Step 1: Create user without database
db.addUser('newuser', 'pass', 127, true);

// Step 2: Assign to database
db.createDatabase('blog');
db.addOwner('blog', 'newuser');
```