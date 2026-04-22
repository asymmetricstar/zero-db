# SystemAdmin (Optional)

SystemAdmin is a **system-wide superuser** for the entire ZeroDB installation. Only one per system.

## When to Use?

- Manage **multiple databases** from one account
- System-wide operations without per-database login

## Create SystemAdmin

```typescript
// First create a database
db.createDatabase('firstdb');

// Then create SystemAdmin (once only)
db.systemadmin.createAdmin('sysadmin', 'secure_password');
```

## Login / Logout

```typescript
// Login
db.systemadmin.login('sysadmin', 'secure_password');

// Check status
console.log(db.systemadmin.active); // true/false
console.log(db.systemadmin.has);   // true/false

// Logout
db.systemadmin.logout();
```

## Update Password

```typescript
db.systemadmin.login('sysadmin', 'old_password');
db.systemadmin.update('sysadmin', 'new_password');
```

## Get Info

```typescript
console.log(db.systemadmin.info);
// { username: 'sysadmin', permission: 255 }
```

## Why Not Always Use?

For single database applications, use normal users instead:

```typescript
// Simpler for single DB
db.createDatabase('blog');
db.addUser('admin', 'pass', 127, true);
db.addOwner('blog', 'admin');
db.login('blog', 'admin', 'pass');
```

See [Permissions](permissions.md) for normal user management.