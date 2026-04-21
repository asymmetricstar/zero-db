# Permissions

User management and access control in ZeroDB.

## Permission Table

Each permission has a numeric value. Add them together:

```typescript
// Example: Add(1) + List(4) + Update(8) = 13
db.addUser('editor', 'pass', 13, false, 'blog');
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
db.addUser('editor', 'pass', ['add', 'list', 'update'], false, 'blog');

// Multiple permissions
db.addUser('moderator', 'pass', ['add', 'delete', 'list', 'update'], false, 'blog');
```

### Object Format

```typescript
// Explicit true/false
db.addUser('viewer', 'pass', { list: true }, false, 'blog');

// Mixed
db.addUser('limited', 'pass', { list: true, add: true }, false, 'blog');
```

### Numeric Format

```typescript
// Direct value
db.addUser('editor', 'pass', 13, false, 'blog');

// Common values
db.addUser('admin', 'pass', 127, true, 'blog');      // Full
db.addUser('user', 'pass', 31, false, 'blog');        // Without rename
db.addUser('viewer', 'pass', 4, false, 'blog');      // Read only
```

## Grand Admin (isGrand)

When `isGrand = true`, user has **full access** to the database:

```typescript
db.addUser('superadmin', 'pass', 127, true, 'blog');
```

Grand admin can:
- Perform all operations
- Add/remove users
- Create/drop tables
- Bypass permission checks

## Examples

### Read-Only User

```typescript
db.addUser('reader', 'pass', ['list'], false, 'blog');
```

### Content Editor

```typescript
db.addUser('editor', 'pass', ['add', 'delete', 'list', 'update'], false, 'blog');
```

### Full Admin

```typescript
db.addUser('admin', 'pass', 127, true, 'blog');
```

### Custom Combination

```typescript
// Can add and list, but NOT delete or update
db.addUser('contributor', 'pass', ['add', 'list'], false, 'blog');
```