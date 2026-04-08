import { EventManager, eventmanager, LogLevel, LogEntry, ZeroDB, PermissionManager } from "../src";
import * as fs from "fs";
import * as path from "path";

const testDir = path.join(__dirname, "test_event_manager");

async function cleanup() {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

async function runTests() {
  await cleanup();
  console.log("=== Event Manager Test Suite ===\n");

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
    // ==================== TEST 1: Singleton ====================
    console.log("--- Test 1: Singleton Pattern ---");
    const instance1 = eventmanager.getInstance();
    const instance2 = eventmanager.getInstance();
    test("Same instance returned", instance1 === instance2);
    test("EventManager is singleton instance", EventManager === instance1);

    // ==================== TEST 2: Logging Methods ====================
    console.log("\n--- Test 2: Logging Methods ---");
    let logEvents: LogEntry[] = [];
    
    EventManager.on('log', (entry: LogEntry) => {
      logEvents.push(entry);
    });

    EventManager.info("Test info message");
    test("Info log emitted", logEvents.length === 1 && logEvents[0].level === 'info');

    EventManager.warn("Test warn message");
    test("Warn log emitted", logEvents.length === 2 && logEvents[1].level === 'warn');

    EventManager.error("Test error message");
    test("Error log emitted", logEvents.length === 3 && logEvents[2].level === 'error');

    EventManager.debug("Test debug message");
    test("Debug log emitted", logEvents.length === 4 && logEvents[3].level === 'debug');

    EventManager.query("SELECT * FROM users");
    test("Query log emitted", logEvents.length === 5 && logEvents[4].level === 'query');

    // ==================== TEST 3: Log Entry Structure ====================
    console.log("\n--- Test 3: Log Entry Structure ---");
    logEvents = [];
    
    EventManager.info("Structured log", { userId: 123, action: "login" });
    test("Log has timestamp", logEvents[0].timestamp !== undefined);
    test("Log has message", logEvents[0].message === "Structured log");
    test("Log has context", logEvents[0].context?.userId === 123);
    test("Timestamp is ISO format", !isNaN(Date.parse(logEvents[0].timestamp)));

    // ==================== TEST 4: Event Listeners ====================
    console.log("\n--- Test 4: Event Listeners ---");
    let errorCount = 0;
    let infoCount = 0;

    const errorHandler = (entry: LogEntry) => errorCount++;
    const infoHandler = (entry: LogEntry) => infoCount++;

    EventManager.on('error', errorHandler);
    EventManager.on('info', infoHandler);

    EventManager.error("Error 1");
    EventManager.error("Error 2");
    EventManager.info("Info 1");

    test("Error listener called twice", errorCount === 2);
    test("Info listener called once", infoCount === 1);

    EventManager.removeListener('error', errorHandler);
    EventManager.removeListener('info', infoHandler);

    // ==================== TEST 5: Enable/Disable ====================
    console.log("\n--- Test 5: Enable/Disable ---");
    logEvents = [];

    EventManager.setEnabled(false);
    EventManager.info("Disabled log");
    test("No logs when disabled", logEvents.length === 0);

    EventManager.setEnabled(true);
    EventManager.info("Enabled log");
    test("Logs work when enabled", logEvents.length === 1);

    // ==================== TEST 6: LogLevel Types ====================
    console.log("\n--- Test 6: LogLevel Types ---");
    const levels: LogLevel[] = ['info', 'warn', 'error', 'debug', 'query'];
    let allLevelsWork = true;

    for (const level of levels) {
      try {
        (EventManager as any)[level](`${level} test`);
      } catch {
        allLevelsWork = false;
      }
    }
    test("All log levels work", allLevelsWork);

    // ==================== TEST 7: Integration with ZeroDB ====================
    console.log("\n--- Test 7: ZeroDB Integration ---");
    let dbLogCount = 0;
    const dbLogHandler = (entry: LogEntry) => {
      if (entry.message.includes("initialized")) {
        dbLogCount++;
      }
    };

    EventManager.on('log', dbLogHandler);

    const db = new ZeroDB(testDir);
    test("ZeroDB emits log on init", dbLogCount === 1);

    EventManager.removeListener('log', dbLogHandler);

    // ==================== TEST 8: ZeroDB Operations with Logging ====================
    console.log("\n--- Test 8: ZeroDB Operations Logging ---");
    let operationLogs: LogEntry[] = [];
    const opHandler = (entry: LogEntry) => operationLogs.push(entry);
    EventManager.on('log', opHandler);

    db.createDatabase("test_db", { owner: ["admin"] });
    (db as any).dbManager.addUser("test_db", "admin", "admin123", PermissionManager.all(), true);
    db.login("test_db", "admin", "admin123");

    test("Database creation logged", operationLogs.some(e => e.message.includes("created")));
    test("Login logged", operationLogs.some(e => e.message.includes("logged in")));

    EventManager.removeListener('log', opHandler);

    // ==================== TEST 9: Export Verification ====================
    console.log("\n--- Test 9: Export Verification ---");
    test("EventManager is exported", EventManager !== undefined);
    test("eventmanager class is exported", typeof eventmanager === 'function');
    test("EventManager has info method", typeof EventManager.info === 'function');
    test("EventManager has warn method", typeof EventManager.warn === 'function');
    test("EventManager has error method", typeof EventManager.error === 'function');
    test("EventManager has debug method", typeof EventManager.debug === 'function');
    test("EventManager has query method", typeof EventManager.query === 'function');
    test("EventManager has setEnabled method", typeof EventManager.setEnabled === 'function');
    test("EventManager extends EventEmitter", typeof EventManager.on === 'function');

    // ==================== TEST 10: Multiple Context Types ====================
    console.log("\n--- Test 10: Context Types ---");
    logEvents = [];

    EventManager.info("String context", "simple string");
    test("String context works", logEvents[0].context === "simple string");

    EventManager.info("Object context", { key: "value", nested: { a: 1 } });
    test("Object context works", logEvents[1].context?.key === "value");

    EventManager.info("Array context", [1, 2, 3]);
    test("Array context works", Array.isArray(logEvents[2].context));

    EventManager.info("No context");
    test("No context works", logEvents[3].context === undefined);

    // ==================== SUMMARY ====================
    console.log("\n=== Test Summary ===");
    console.log(`Total: ${passed + failed}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

    if (failed === 0) {
      console.log("\n✓ All tests passed!");
    } else {
      console.log(`\n✗ ${failed} test(s) failed`);
    }

  } catch (error: any) {
    console.error(`\n✗ Test suite error: ${error.message}`);
    console.error(error.stack);
  } finally {
    await cleanup();
  }
}

runTests();
