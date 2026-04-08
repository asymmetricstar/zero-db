import { ZeroDB, PermissionManager } from '../src';
import * as fs from 'fs';
import * as path from 'path';

const testDir = path.join(__dirname, 'where_test_databases');

async function cleanup() {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

async function whereDebug() {
  await cleanup();
  console.log('=== WHERE Debug ===\n');

  const db = new ZeroDB(testDir);
  db.createDatabase('wheredb');
  (db as any).dbManager.addUser('wheredb', 'admin', 'admin123', PermissionManager.all(), true);
  db.clearCache();
  await db.login('wheredb', 'admin', 'admin123');
  
  await db.createTable('records', [
    { name: 'id', type: 'auto', option: { isAuto: true } },
    { name: 'value', type: 'number' },
    { name: 'data', type: 'string' }
  ]);
  
  const table = await db.table('records');
  const tableData = (table as any).data;
  if (!tableData) {
    console.log('Table error');
    return;
  }
  
  // Add records with value field
  await tableData.add({ value: '50000', data: 'Record 50000' });
  await tableData.add({ value: '123', data: 'Record 123' });
  await tableData.add({ value: '999', data: 'Record 999' });
  
  console.log('Added 3 records\n');
  
  // Try WHERE query
  console.log('\n--- WHERE query ---');
  const results = await tableData.where({ value: '50000' }).list();
  console.log('WHERE results:', results);
  
  // Try all records
  const all = await tableData.list();
  console.log('\nAll records:', all);
  
  // Try count
  const count = await tableData.count();
  console.log('\nCount:', count);
}

whereDebug().catch(console.error);