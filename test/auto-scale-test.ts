import { ZeroDB, PermissionManager } from '../src';
import * as fs from 'fs';
import * as path from 'path';

const testDir = path.join(__dirname, 'auto_scale_test_databases');

async function cleanup() {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

async function runAutoScaleTest() {
  await cleanup();
  console.log('=== Auto-Scaling Engine Test ===\n');

  const db = new ZeroDB(testDir);
  db.createDatabase('scaledb');
  (db as any).dbManager.addUser('scaledb', 'admin', 'admin123', PermissionManager.all(), true);
  await db.login('scaledb', 'admin', 'admin123');

  await db.createTable('users', [
    { name: 'id', type: 'auto', option: { isAuto: true } },
    { name: 'username', type: 'string' },
    { name: 'email', type: 'string' }
  ]);

  const tableResult = db.table('users');
  if (!tableResult.ok) {
    console.error('Failed to get table:', tableResult.error);
    return;
  }
  const users = tableResult.data;

  // Test 1: Sequential (Small)
  console.log('--- Test 1: Sequential Strategy (5 records) ---');
  const smallBatch = Array.from({ length: 5 }, (_, i) => ({
    username: `user_small_${i}`,
    email: `small_${i}@example.com`
  }));
  const res1 = await users.addBatch(smallBatch);
  console.log(`Success: ${res1.success}, Records: ${res1.lineNumbers.length}`);

  // Test 2: Batch (Medium)
  console.log('\n--- Test 2: Batch Strategy (200 records) ---');
  const mediumBatch = Array.from({ length: 200 }, (_, i) => ({
    username: `user_med_${i}`,
    email: `med_${i}@example.com`
  }));
  const res2 = await users.addBatch(mediumBatch);
  console.log(`Success: ${res2.success}, Records: ${res2.lineNumbers.length}`);

  // Test 3: Hybrid (Large)
  console.log('\n--- Test 3: Hybrid Strategy (2000 records) ---');
  const largeBatch = Array.from({ length: 2000 }, (_, i) => ({
    username: `user_large_${i}`,
    email: `large_${i}@example.com`
  }));
  const res3 = await users.addBatch(largeBatch);
  console.log(`Success: ${res3.success}, Records: ${res3.lineNumbers.length}`);

  // Test 4: Worker (Very Large)
  console.log('\n--- Test 4: Worker Strategy (15000 records) ---');
  const veryLargeBatch = Array.from({ length: 15000 }, (_, i) => ({
    username: `user_vlarge_${i}`,
    email: `vlarge_${i}@example.com`
  }));
  const res4 = await users.addBatch(veryLargeBatch);
  console.log(`Success: ${res4.success}, Records: ${res4.lineNumbers.length}`);

  // Test 5: Stream (Extremely Large)
  console.log('\n--- Test 5: Stream Strategy (110000 records) ---');
  console.log('(This will take a few seconds...)');
  const extremeBatch = Array.from({ length: 110000 }, (_, i) => ({
    username: `user_extreme_${i}`,
    email: `extreme_${i}@example.com`
  }));
  const res5 = await users.addBatch(extremeBatch);
  console.log(`Success: ${res5.success}, Records: ${res5.lineNumbers.length}`);

  const count = await users.count();
  console.log(`Total records in table: ${count.toLocaleString()}`);

  if (count === (5 + 200 + 2000 + 15000 + 110000)) {
    console.log('✅ AUTO-SCALING TEST PASSED');
  } else {
    console.log(`❌ AUTO-SCALING TEST FAILED (Expected ${5 + 200 + 2000 + 15000 + 110000}, got ${count})`);
  }

  // await cleanup();
}

runAutoScaleTest().catch(console.error);
