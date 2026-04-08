import { ZeroDB, PermissionManager } from "../src";
import * as fs from "fs";
import * as path from "path";

const testDir = path.join(__dirname, "test_databases_new");

async function cleanup() {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

async function runTests() {
  await cleanup();
  console.log("=== ZeroDB Comprehensive Test ===\n");

  let passed = 0;
  let failed = 0;

  function test(name: string, result: boolean, error?: string) {
    if (result) {
      console.log(`✓ ${name}`);
      passed++;
    } else {
      console.log(`✗ ${name}: ${error || "Failed"}`);
      failed++;
    }
  }

  try {
    // Test 1: Create database with owner
    console.log("--- Test 1: Create Database with Owner ---");
    const db1 = new ZeroDB(testDir);
    const createResult = db1.createDatabase("test_db", {
      owner: ["admin", "manager"],
    });
    test("Create database with owner", createResult);

    // Add user to database using addUser method (after manually setting up)
    // Since we can't login without users, we'll use a different approach
    // Use DatabaseManager directly to add users
    (db1 as any).dbManager.addUser("test_db", "admin", "admin123", PermissionManager.all(), true);
    (db1 as any).dbManager.addUser("test_db", "manager", "manager123", 127, false);
    (db1 as any).dbManager.addUser("test_db", "user1", "user1123", 3, false);

    // Test 2: Login with valid credentials
    console.log("\n--- Test 2: Login ---");
    const loginResult = db1.login("test_db", "admin", "admin123");
    test("Login with valid credentials", loginResult);

    // Test 3: Create public database
    console.log("\n--- Test 3: Public Database ---");
    const publicDb = new ZeroDB(testDir);
    const publicResult = publicDb.createDatabase("public_db", { isPublic: true });
    test("Create public database", publicResult);

    // Test 4: Access public database without login
    console.log("\n--- Test 4: Public Database Access ---");
    try {
      const publicOnly = new ZeroDB(testDir);
      publicOnly.useDatabase("public_db");
      const tables = publicOnly.getTables("public_db");
      test("Access public database without login", true);
    } catch (e: any) {
      test("Access public database without login", false, e.message);
    }

    // Test 5: useDatabase with owner
    console.log("\n--- Test 5: useDatabase ---");
    const db2 = new ZeroDB(testDir, 64, {
      db: "test_db",
      auth: { user: "admin", pass: "admin123" },
    });
    const useResult = db2.useDatabase("test_db");
    test("useDatabase with valid owner", useResult);

    // Test 6: useDatabase with non-owner (should fail)
    console.log("\n--- Test 6: Non-Owner Access ---");
    try {
      const db3 = new ZeroDB(testDir, 64, {
        auth: { user: "user1", pass: "user1123" },
      });
      db3.useDatabase("test_db");
      test("useDatabase with non-owner should fail", false);
    } catch (e: any) {
      test("useDatabase with non-owner should fail", true);
    }

    // Test 7: Create table with inline fields
    console.log("\n--- Test 7: Create Table with Inline Fields ---");
    const db4 = new ZeroDB(testDir, 64, {
      db: "public_db",
      auth: { user: "admin", pass: "admin123" },
    });
    const tableResult = db4.createTable("users", [
      { name: "id", type: "auto", option: { isAuto: true } },
      { name: "username", type: "string", option: { maxLength: 50 } },
      { name: "email", type: "string" },
      { name: "age", type: "number" },
    ]);
    test("Create table with inline fields", !!tableResult);

    // Test 8: Add data
    console.log("\n--- Test 8: Add Data ---");
    const table = db4.table("users");
    if (!table) throw new Error("Table 'users' not found");
    const addResult = await table.add({
      username: "john_doe",
      email: "john@example.com",
      age: "28",
    });
    test("Add data to table", addResult > 0, "Line number: " + addResult);

    // Test 9: Select data
    console.log("\n--- Test 9: Select Data ---");
    const table2 = db4.table("users");
    if (!table2) throw new Error("Table 'users' not found");
    const records = await table2.select(["username", "email"]).list();
    test("Select data from table", records.length > 0, "Records: " + records.length);

    // Test 10: Update data
    console.log("\n--- Test 10: Update Data ---");
    const table3 = db4.table("users");
    if (!table3) throw new Error("Table 'users' not found");
    const updateResult = await table3.where({ username: "john_doe" }).update({ email: "john_updated@example.com" });
    test("Update data", updateResult > 0, "Updated count: " + updateResult);

    // Test 11: Delete data
    console.log("\n--- Test 11: Delete Data ---");
    const table4 = db4.table("users");
    if (!table4) throw new Error("Table 'users' not found");
    const deleteResult = await table4.where({ username: "john_doe" }).delete();
    test("Delete data", deleteResult > 0, "Deleted count: " + deleteResult);

    // Test 12: Public database direct access
    console.log("\n--- Test 12: Public Database Direct Access ---");
    const publicDirect = new ZeroDB(testDir);
    const tableCreateResult = publicDirect.createTable("public_table", [
      { name: "id", type: "auto", option: { isAuto: true } },
      { name: "title", type: "string" },
    ]);
    test("Create table in public database", !!tableCreateResult);

    const table5 = publicDirect.table("public_table");
    if (!table5) throw new Error("Table 'public_table' not found");
    const addResultPublic = await table5.add({ title: "Public Post" });
    test("Add data to public table", addResultPublic > 0);

    // Test 13: getDatabaseInfo
    console.log("\n--- Test 13: getDatabaseInfo ---");
    const dbInfo = (db1 as any).dbManager.getDatabaseInfo("test_db");
    test("getDatabaseInfo returns correct data", !!dbInfo && dbInfo.name === "test_db");

    // Test 14: listDatabases
    console.log("\n--- Test 14: listDatabases ---");
    // Invalidate to reload from disk
    db1.clearCache();
    const dbList = (db1 as any).dbManager.listDatabases();
    console.log("  Database list:", dbList);
    test("listDatabases returns all databases", dbList.length >= 2, "Count: " + dbList.length);

    // Test 15: addOwner / removeOwner
    console.log("\n--- Test 15: addOwner / removeOwner ---");
    try {
      const addOwnerResult = await (db1 as any).dbManager.addOwner("test_db", "new_owner");
      test("addOwner to database", addOwnerResult);

      const dbInfoAfter = (db1 as any).dbManager.getDatabaseInfo("test_db");
      test("owner added successfully", dbInfoAfter.owner.includes("new_owner"));

      const removeOwnerResult = await (db1 as any).dbManager.removeOwner("test_db", "new_owner");
      test("removeOwner from database", removeOwnerResult);

      const dbInfoAfterRemove = (db1 as any).dbManager.getDatabaseInfo("test_db");
      test("owner removed successfully", !dbInfoAfterRemove.owner.includes("new_owner"));
    } catch (e: any) {
      test("addOwner / removeOwner", false, e.message);
    }

    // Test 16: setPublic
    console.log("\n--- Test 16: setPublic ---");
    try {
      const setPublicResult = await (db1 as any).dbManager.setPublic("test_db", true);
      test("setPublic to true", setPublicResult);

      const dbInfoPublic = (db1 as any).dbManager.getDatabaseInfo("test_db");
      test("database is now public", dbInfoPublic.isPublic === true);

      const setPrivateResult = await (db1 as any).dbManager.setPublic("test_db", false);
      test("setPublic to false", setPrivateResult);

      const dbInfoPrivate = (db1 as any).dbManager.getDatabaseInfo("test_db");
      test("database is now private", dbInfoPrivate.isPublic === false);
    } catch (e: any) {
      test("setPublic", false, e.message);
    }

    // Test 17: Grand user access test
    console.log("\n--- Test 17: Grand User Access ---");
    const grandDb = new ZeroDB(testDir, 64, {
      db: "test_db",
      auth: { user: "admin", pass: "admin123" },
    });
    test("Grand user can access", grandDb.isAuthenticated());

    // Grand user should have full permissions
    const grandUser = (grandDb as any).currentUser;
    test("Grand user has permission 127", grandUser && grandUser.permission === 127);
    test("Grand user has isGrand true", grandUser && grandUser.isGrand === true);
  } catch (error: any) {
    console.error("\n=== Test Error ===");
    console.error(error.message);
    failed++;
  }

  console.log("\n=== Test Results ===");
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
