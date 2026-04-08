import { ZeroDB, PermissionManager } from '../src';
import * as fs from 'fs';
import * as path from 'path';

const testDir = path.join(__dirname, 'batch_test_databases');

async function cleanup() {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

async function batchDebug() {
  await cleanup();
  console.log('=== Batch Insert Debug ===\n');

  const db = new ZeroDB(testDir);
  db.createDatabase('batchdb');
  (db as any).dbManager.addUser('batchdb', 'admin', 'admin123', PermissionManager.all(), true);
  db.clearCache();
  await db.login('batchdb', 'admin', 'admin123');
  
  await db.createTable('records', [
    { name: 'id', type: 'auto', option: { isAuto: true } },
    { name: 'data', type: 'string' }
  ]);
  
  const table = await db.table('records');
  if (!table.ok) {
    console.log('Table creation failed:', table.error);
    return;
  }
  console.log('Table created\n');
  
  // Test sequential inserts first
  console.log('--- Sequential Inserts (5 records) ---');
  for (let i = 0; i < 5; i++) {
    const line = await table.data.add({ data: `Seq ${i}` });
    console.log(`Insert ${i}: line=${line}`);
  }
  
  const seqCount = await table.data.count();
  console.log(`Sequential count: ${seqCount}\n`);
  
  // Clear and test parallel
  db.clearCache();
  await db.login('batchdb', 'admin', 'admin123');
  
  console.log('--- Parallel Inserts (5 promises) ---');
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(table.data.add({ data: `Parallel ${i}` }));
  }
  const lines = await Promise.all(promises);
  console.log('Lines:', lines);
  
  const parCount = await table.data.count();
  console.log(`Parallel count: ${parCount}\n`);
  
  // Check file on disk
  const dataManager = (db as any).dataManager;
  await dataManager.flushAll();
  
  const spawnPool = dataManager.spawnPool;
  for (const [key, spawn] of spawnPool) {
    const filePath = (spawn as any).filePath;
    if (fs.existsSync(filePath) && key.includes('data')) {
      const content = fs.readFileSync(filePath);
      if (content.length > 9) {
        const body = content.slice(9);
        const ENCRYPTION_KEY = 'ZeroDB_2024_SecureKey!@#$%';
        let decoded = '';
        for (let i = 0; i < body.length; i++) {
          decoded += String.fromCharCode(body[i] ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length));
        }
        console.log(`File ${key.split(':').pop()}:`);
        console.log(decoded);
      }
    }
  }
  
  // List all records
  const all = await table.data.list();
  console.log(`\nTotal records in list: ${all.length}`);
  all.forEach((r: any) => console.log(`  id=${r.id}, data=${r.data}`));
}

batchDebug().catch(console.error);