import { ZeroDB, EventManager } from "zero-db-engine";


EventManager.on("log", (entry: any) => {
  console.log("LOG:", entry.message);
});

EventManager.on("error", (entry: any) => {
  console.log("ERROR:", entry.message);
});


async function main() {
  
  const db = new ZeroDB("./db", 256, { 
    overwrite: false ,
    backup: './my_backups' ,
    scaler: {
      sequentialThreshold: 10,    // Switch to batch processing after 10 records
      batchThreshold: 500,       // Switch to hybrid processing after 500 records
      workerThreshold: 10000,    // Switch to worker processing after 10K records
      streamThreshold: 100000,   // Switch to stream processing after 100K records
      maxWorkers: 4,             // Maximum number of worker threads
      batchSize: 100,            // Default batch size for operations
      adaptiveEnabled: true,     // Enable automatic scaling based on system resources
      metricsInterval: 1000,     // Metrics collection interval in ms
      memorySafetyThreshold: 0.85, // Scale down when memory usage > 85%
      cpuSafetyThreshold: 80       // Scale down when CPU usage > 80%
    }
  });

  /*   
      First Run -> Create Database
      
      db.createDatabase("my_app");
      db.addUser("admin", "123456", PermissionManager.all(), true, "my_app");
      db.login("my_app", "admin", "123456");

      db.createTable("users", [
        { name: "id", type: "auto", option: { isAuto: true } },
        { name: "name", type: "string", option: { maxLength: 50 } },
        { name: "email", type: "string" }
      ]); 
      
  */

  const users = db.table("users");
  if (!users) throw new Error("Tablo bulunamadı");

  await users.add({ name: "Ahmet", email: "ahmet@example.com" });
  await users.add({ name: "Ayşe", email: "ayse@example.com" });

  const result = await users.select("*").list();
  console.log("Kullanıcılar:", result);
   
  db.exit();
}

main();