import { ZeroDB, EventManager } from "zero-db-engine";

EventManager.on("log", (entry: any) => {
  console.log("LOG:", entry.message);
});

EventManager.on("error", (entry: any) => {
  console.log("ERROR:", entry.message);
});

async function main() {
  const db = new ZeroDB("./databases", 256, { overwrite: true });

  db.createDatabase("my_app");
  db.addUser("admin", "123456", PermissionManager.all(), true, "my_app");
  db.login("my_app", "admin", "123456");

  db.createTable("users", [
    { name: "id", type: "auto", option: { isAuto: true } },
    { name: "name", type: "string", option: { maxLength: 50 } },
    { name: "email", type: "string" }
  ]);

  const users = db.table("users");
  if (!users) throw new Error("Tablo bulunamadı");

  await users.add({ name: "Ahmet", email: "ahmet@example.com" });
  await users.add({ name: "Ayşe", email: "ayse@example.com" });

  const result = await users.select("*").list();
  console.log("Kullanıcılar:", result);
  
  db.exit();
}

main();