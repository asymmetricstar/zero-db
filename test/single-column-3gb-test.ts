import { ZeroDB, PermissionManager } from '../src';
import * as fs from 'fs';
import * as path from 'path';

const testDir = path.join(__dirname, 'single_col_3gb_test');
const TARGET_GB = 3;
const TARGET_BYTES = TARGET_GB * 1024 * 1024 * 1024;
const CHUNK_SIZE = 100 * 1024 * 1024;
const CHUNK_COUNT = Math.ceil(TARGET_BYTES / CHUNK_SIZE);

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

async function run3GBSingleColumnTest() {
  await cleanup();
  console.log(`=== 3GB Single Column Test ===\n`);

  const db = new ZeroDB(testDir);
  db.createDatabase('test3gb');
  (db as any).dbManager.addUser('test3gb', 'admin', 'admin123', PermissionManager.all(), true);
  db.clearCache();
  await db.login('test3gb', 'admin', 'admin123');

  await db.createTable('bigdata', [
    { name: 'id', type: 'auto', option: { isAuto: true } },
    { name: 'payload', type: 'string', option: { maxLength: 3500000000 } }
  ]);

  const table = await db.table('bigdata');
  const tableData = (table as any).data;

  console.log('Writing 3GB in chunks...');
  const writeStart = Date.now();

  const data = 'X'.repeat(CHUNK_SIZE - 50);
  let lastReport = Date.now();
  let totalWritten = 0;
  let errors = 0;

  for (let i = 0; i < CHUNK_COUNT; i++) {
    try {
      await tableData.add({ payload: data + '_' + i });
      totalWritten += CHUNK_SIZE;

      if (Date.now() - lastReport > 10000) {
        const size = getDirSize(testDir);
        console.log(`Progress: ${(i+1)}/${CHUNK_COUNT} chunks | Size: ${(size/1024/1024/1024).toFixed(2)}GB`);
        lastReport = Date.now();
      }
    } catch (e: any) {
      errors++;
      if (errors <= 3) console.log(`Error at chunk ${i}: ${e.message}`);
    }
  }

  console.log(`\nWrite: ${errors} errors in ${Date.now() - writeStart}ms`);

  console.log('\nFlushing...');
  await tableData.flush();

  const finalSize = getDirSize(testDir);
  console.log(`Final DB size: ${(finalSize/1024/1024/1024).toFixed(2)}GB`);

  console.log('\nReading all data...');
  const readStart = Date.now();

  const count = await tableData.count();
  console.log(`Count: ${count}`);

  const all = await tableData.list();
  console.log(`Read ${all.length} records in ${Date.now() - readStart}ms`);

  const readSize = all.reduce((sum: number, r: any) => sum + (r.payload?.length || 0), 0);
  console.log(`Total data read: ${(readSize/1024/1024/1024).toFixed(2)}GB`);

  const totalTime = Date.now() - writeStart - (Date.now() - readStart);
  console.log(`\n=== 3GB TEST ${errors === 0 && count === CHUNK_COUNT ? '✅ PASSED' : '❌ FAILED'} ===`);
  console.log(`Errors: ${errors}, Records: ${count}/${CHUNK_COUNT}, Size: ${(finalSize/1024/1024/1024).toFixed(2)}GB`);
}

run3GBSingleColumnTest().catch(console.error);
