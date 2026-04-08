import { ZeroDB, PermissionManager } from '../src';
import * as fs from 'fs';
import * as path from 'path';

const testDir = path.join(__dirname, 'debug_test_databases');

const logs: string[] = [];

function log(msg: string) {
  logs.push(msg);
}

async function cleanup() {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

async function debugTest() {
  await cleanup();
  log('=== Debug Test ===');

  const db = new ZeroDB(testDir);
  db.createDatabase('testdb');
  (db as any).dbManager.addUser('testdb', 'admin', 'admin123', PermissionManager.all(), true);
  db.clearCache();
  await db.login('testdb', 'admin', 'admin123');
  
  await db.createTable('records', [
    { name: 'id', type: 'auto', option: { isAuto: true } },
    { name: 'data', type: 'string' }
  ]);
  
  const table = await db.table('records');
  if (!table.ok) throw new Error('Table not created');
  log('Table created');
  
  const dataManager = (db as any).dataManager;
  const spawnPool = dataManager.spawnPool;
  
  // Add first record
  log('--- Adding record 0 ---');
  const r0 = await table.data.add({ data: 'Record 0' });
  log(`Added with line number: ${r0}`);
  
  // Check spawn max line directly
  for (const [key, spawn] of spawnPool) {
    const maxLine = spawn.getMaxLine();
    log(`  ${key.split(':').pop()}: maxLine=${maxLine}`);
  }
  
  // Force flush to disk
  await dataManager.flushAll();
  log('Flushed to disk');
  
  // Add second record
  log('--- Adding record 1 ---');
  const r1 = await table.data.add({ data: 'Record 1' });
  log(`Added with line number: ${r1}`);
  
  for (const [key, spawn] of spawnPool) {
    const maxLine = spawn.getMaxLine();
    log(`  ${key.split(':').pop()}: maxLine=${maxLine}, cache=${JSON.stringify(Array.from((spawn as any).dataCache.entries()))}`);
  }
  
  // Force flush again
  await dataManager.flushAll();
  log('Flushed to disk');
  
  // Add third record
  log('--- Adding record 2 ---');
  const r2 = await table.data.add({ data: 'Record 2' });
  log(`Added with line number: ${r2}`);
  for (const [key, spawn] of spawnPool) {
    log(`  ${key.split(':').pop()}: cache.size=${(spawn as any).dataCache?.size}, maxLine=${spawn.getMaxLine()}, autoInc=${spawn.getAutoIncrement()}`);
  }
  
  // Check file on disk
  log('--- Checking files on disk ---');
  
  const ENCRYPTION_KEY = 'ZeroDB_2024_SecureKey!@#$%';
  
  // Get actual file paths from spawn pool
  for (const [key, spawn] of spawnPool) {
    const filePath = (spawn as any).filePath;
    log(`\nKey: ${key}`);
    log(`File: ${filePath}`);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath);
      log(`Total size: ${content.length} bytes`);
      
      // Header is first 9 bytes
      const magic = content.slice(0, 4).toString();
      const version = content.readUInt8(4);
      const dataLen = content.readUInt32BE(5);
      log(`Header: magic=${magic}, version=${version}, dataLen=${dataLen}`);
      
      // Decode the body using correct key
      const body = content.slice(9);
      let decoded = '';
      for (let i = 0; i < body.length; i++) {
        decoded += String.fromCharCode(body[i] ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length));
      }
      log(`Decoded: ${decoded}`);
    } else {
      log(`File does NOT exist`);
    }
  }
  
  // Final check
  const count = await table.data.count();
  log(`Final count: ${count}`);
}

debugTest().then(() => {
  console.log('\n=== LOGS ===\n');
  console.log(logs.join('\n'));
}).catch(e => {
  console.log('\n=== LOGS ===\n');
  console.log(logs.join('\n'));
  console.error(e);
});