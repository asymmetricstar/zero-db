import { ZeroDB, PermissionManager } from '../src';
import * as fs from 'fs';
import * as path from 'path';

const testDir = path.join(__dirname, 'large_scale_test_databases');
const RECORD_COUNT = 50000;

async function cleanup() {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

async function runLargeScaleTest() {
  await cleanup();
  console.log('=== Large Scale Test ===');
  console.log(`Target record count: ${RECORD_COUNT.toLocaleString()}\n`);

  const startTime = Date.now();

  const db = new ZeroDB(testDir);
  db.createDatabase('largedb');
  (db as any).dbManager.addUser('largedb', 'admin', 'admin123', PermissionManager.all(), true);
  db.clearCache();
  await db.login('largedb', 'admin', 'admin123');

  await db.createTable('records', [
    { name: 'id', type: 'auto', option: { isAuto: true } },
    { name: 'data', type: 'string', option: { maxLength: 100 } },
    { name: 'value', type: 'number' }
  ]);

  const table = await db.table('records');
  const tableData = (table as any).data;

  console.log('Inserting records...');
  const insertStart = Date.now();

  let errors = 0;
  const BATCH_SIZE = 1000;

  for (let i = 0; i < RECORD_COUNT; i += BATCH_SIZE) {
    const batch = [];
    for (let j = 0; j < BATCH_SIZE && i + j < RECORD_COUNT; j++) {
      batch.push({
        data: `record_${i + j}`,
        value: String(i + j)
      });
    }

    try {
      await tableData.addBatch(batch);
    } catch (e: any) {
      errors++;
      console.log(`Insert error at ${i}: ${e.message}`);
    }

    if ((i / BATCH_SIZE) % 10 === 0) {
      console.log(`Progress: ${i.toLocaleString()} / ${RECORD_COUNT.toLocaleString()}`);
    }
  }

  const insertTime = Date.now() - insertStart;
  console.log(`\nInsert completed in ${insertTime}ms`);
  console.log(`Errors: ${errors}`);

  console.log('\nReading records...');
  const readStart = Date.now();

  const count = await tableData.count();
  console.log(`Count: ${count.toLocaleString()}`);

  const all = await tableData.list();
  console.log(`Read ${all.length.toLocaleString()} records in ${Date.now() - readStart}ms`);

  console.log('\nTesting queries...');

  const where = await tableData.where({ data: 'record_100' }).first();
  console.log('WHERE test:', where ? 'OK' : 'FAIL');

  const like = await tableData.like('data', 'record_5%').list();
  console.log(`LIKE prefix (record_5%): ${like.length} records`);

  const asc = await tableData.asc('value').first();
  console.log('ASC test:', asc ? 'OK' : 'FAIL');

  const desc = await tableData.desc('value').first();
  console.log('DESC test:', desc ? 'OK' : 'FAIL');

  const totalTime = Date.now() - startTime;
  console.log(`\n=== Total Time: ${totalTime}ms ===`);
  console.log(`=== Errors: ${errors} / ${RECORD_COUNT} ===`);

  if (errors === 0 && count === RECORD_COUNT) {
    console.log('✅ LARGE SCALE TEST PASSED');
    process.exit(0);
  } else {
    console.log('❌ LARGE SCALE TEST FAILED');
    process.exit(1);
  }
}

runLargeScaleTest().catch((e) => {
  console.error(e);
  process.exit(1);
});
