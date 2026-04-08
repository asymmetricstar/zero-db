# ⚡ ZeroDB Engine

> **Next-Gen File-Based Database** - 32+ paralel thread ile yüksek performans, dinamik dosya mimarisi ile network gücü, CPU/RAM'e göre otomatik ölçeklenen, CRC32 tamper-proof güvenlikli, sıfır bağımlılıklı, 100K+ kayıtta 0 hata garantisi ile TB+ veri destekleyen modern veritabanı motoru.

---

## 🚀 TypeScript Kurulum

```bash
npm install zero-db-engine
npm install ts-node @types/node --save-dev
```

### tsconfig.json Ayarları

Projenize `tsconfig.json` ekleyin:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "ignoreDeprecations": "6.0",
    "types": ["node"]
  }
}
```

### TypeScript Örnek

```typescript
import { ZeroDB, EventManager } from "zero-db-engine";
import * as fs from "fs";

EventManager.on("log", (entry) => console.log("LOG:", entry.message));
EventManager.on("error", (entry) => console.log("ERROR:", entry.message));

const dbPath = "./test_db";

if (fs.existsSync(dbPath)) {
  fs.rmSync(dbPath, { recursive: true, force: true });
}

const db = new ZeroDB(dbPath, 256, { overwrite: true });

async function main() {
  db.createDatabase("my_app");
  db.addUser("admin", "123456", ["add", "delete", "list", "update", "create", "drop", "rename"], true, "my_app");
  db.login("my_app", "admin", "123456");

  db.createTable("users", [
    { name: "id", type: "auto", option: { isAuto: true } },
    { name: "name", type: "string" },
    { name: "email", type: "string" }
  ]);

  const users = db.table("users");
  if (!users) throw new Error("Table not found");

  await users.add({ name: "Ahmet", email: "ahmet@example.com" });
  await users.add({ name: "Ayşe", email: "ayse@example.com" });

  const result = await users.select("*").list();
  console.log("Result:", result);
}

main().then(() => console.log("Done"));
```

**Çalıştırmak için:**
```bash
npx ts-node index.ts
```

---

## 🚀 Vanilla JavaScript Kurulum

```bash
npm install zero-db-engine
```

### Vanilla JS Örnek

```javascript
const { ZeroDB, EventManager } = require("zero-db-engine");
const fs = require("fs");

EventManager.on("log", (entry) => console.log("LOG:", entry.message));
EventManager.on("error", (entry) => console.log("ERROR:", entry.message));

const dbPath = "./test_db";

if (fs.existsSync(dbPath)) {
  fs.rmSync(dbPath, { recursive: true, force: true });
}

const db = new ZeroDB(dbPath, 256, { overwrite: true });

async function main() {
  db.createDatabase("my_app");
  db.addUser("admin", "123456", ["add", "delete", "list", "update", "create", "drop", "rename"], true, "my_app");
  db.login("my_app", "admin", "123456");

  db.createTable("users", [
    { name: "id", type: "auto", option: { isAuto: true } },
    { name: "name", type: "string" },
    { name: "email", type: "string" }
  ]);

  const users = db.table("users");
  if (!users) throw new Error("Table not found");

  await users.add({ name: "Ahmet", email: "ahmet@example.com" });
  await users.add({ name: "Ayşe", email: "ayse@example.com" });

  const result = await users.select("*").list();
  console.log("Result:", result);
}

main().then(() => console.log("Done"));
```

**Çalıştırmak için:**
```bash
node index.js
```

Not: Vanilla JS için dosya uzantısı `.js` olmalı ve `require` kullanılmalıdır.
