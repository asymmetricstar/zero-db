import { ZeroDB, PermissionManager } from '../src';
import * as fs from 'fs';
import * as path from 'path';

const testDir = path.join(__dirname, 'gigabyte_test_databases');
const TARGET_SIZE_GB = 2;
const TARGET_SIZE_BYTES = TARGET_SIZE_GB * 1024 * 1024 * 1024;
const RECORD_SIZE_BYTES = 1024 * 10;
const RECORD_COUNT = Math.floor(TARGET_SIZE_BYTES / RECORD_SIZE_BYTES);

async function cleanup() {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

function getDirSize(dirPath: string): number {
  let size = 0;
  if (!fs.existsSync(dirPath)) return 0;
  
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      size += getDirSize(filePath);
    } else {
      size += stat.size;
    }
  }
  return size;
}

async function runGigabyteTest() {
  await cleanup();
  console.log('=== 2GB+ Scale Test ===');
  console.log(`Target size: ${TARGET_SIZE_GB}GB`);
  console.log(`Estimated records: ${RECORD_COUNT.toLocaleString()}`);
  console.log(`Record size: ${RECORD_SIZE_BYTES} bytes\n`);

  const startTime = Date.now();

  const db = new ZeroDB(testDir);
  db.createDatabase('gigadb');
  (db as any).dbManager.addUser('gigadb', 'admin', 'admin123', PermissionManager.all(), true);
  db.clearCache();
  await db.login('gigadb', 'admin', 'admin123');

  await db.createTable('records', [
    { name: 'id', type: 'auto', option: { isAuto: true } },
    { name: 'data', type: 'string', option: { maxLength: 11000 } }
  ]);

  const table = await db.table('records');
  const tableData = (table as any).data;

  console.log('Inserting records...');
  const insertStart = Date.now();

  const LARGE_DATA = 'A'.repeat(RECORD_SIZE_BYTES - 100);

  let lastReport = Date.now();
  let errors = 0;
  let totalWritten = 0;
  const BATCH_SIZE = 100; // 1MB batch

  for (let i = 0; i < RECORD_COUNT; i += BATCH_SIZE) {
    const batch = [];
    for (let j = 0; j < BATCH_SIZE && i + j < RECORD_COUNT; j++) {
      batch.push({
        data: LARGE_DATA + (i + j)
      });
    }

    try {
      await tableData.addBatch(batch);
      totalWritten += batch.length * RECORD_SIZE_BYTES;

      if (Date.now() - lastReport > 5000) {
        const currentSize = getDirSize(testDir);
        console.log(`Progress: ${i.toLocaleString()} / ${RECORD_COUNT.toLocaleString()} | Size: ${(currentSize / 1024 / 1024).toFixed(1)}MB`);
        lastReport = Date.now();
      }
    } catch (e: any) {
      errors++;
      if (errors <= 5) {
        console.log(`Insert error at ${i}: ${e.message}`);
      }
    }
  }

  const insertTime = Date.now() - insertStart;
  console.log(`\nInsert completed in ${insertTime}ms`);
  console.log(`Errors: ${errors}`);

  const finalSize = getDirSize(testDir);
  console.log(`\nFinal database size: ${(finalSize / 1024 / 1024 / 1024).toFixed(2)}GB`);

  console.log('\nReading records...');
  const readStart = Date.now();

  const count = await tableData.count();
  console.log(`Count: ${count.toLocaleString()}`);

  const first = await tableData.first();
  console.log(`First record: ${first ? 'OK (id=' + first.id + ')' : 'FAIL'}`);

  const readTime = Date.now() - readStart;
  console.log(`Read test completed in ${readTime}ms`);

  const totalTime = Date.now() - startTime;
  console.log(`\n=== Total Time: ${(totalTime / 1000 / 60).toFixed(1)} minutes ===`);
  console.log(`=== Errors: ${errors} ===`);
  console.log(`=== Final Size: ${(finalSize / 1024 / 1024 / 1024).toFixed(2)}GB ===`);

  if (errors === 0 && finalSize > TARGET_SIZE_BYTES * 0.9) {
    console.log('✅ 2GB+ TEST PASSED');
  } else if (errors === 0) {
    console.log('⚠️ TEST COMPLETED but size less than target');
  } else {
    console.log('❌ TEST FAILED');
  }
}

runGigabyteTest().catch(console.error);
