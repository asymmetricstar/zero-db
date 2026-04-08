import { ZeroDB, PermissionManager } from '../src';
import * as fs from 'fs';
import * as path from 'path';

const testDir = path.join(__dirname, 'operator_test_databases');

async function cleanup() {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

async function testOperators() {
  await cleanup();
  console.log('=== Test LIKE, ASC, DESC ===\n');

  const db = new ZeroDB(testDir);
  db.createDatabase('testdb');
  (db as any).dbManager.addUser('testdb', 'admin', 'admin123', PermissionManager.all(), true);
  db.clearCache();
  await db.login('testdb', 'admin', 'admin123');
  
  await db.createTable('records', [
    { name: 'id', type: 'auto', option: { isAuto: true } },
    { name: 'name', type: 'string' },
    { name: 'value', type: 'number' }
  ]);
  
  const table = await db.table('records');
  const tableData = (table as any).data;
  if (!tableData) {
    console.log('Table error');
    return;
  }
  
  // Add test data
  await tableData.add({ name: 'apple', value: '10' });
  await tableData.add({ name: 'banana', value: '20' });
  await tableData.add({ name: 'apricot', value: '5' });
  await tableData.add({ name: 'blueberry', value: '15' });
  
  // Check count before flush
  const countBefore = await tableData.count();
  console.log('Count before flush:', countBefore);
  
  // Flush to see all data
  const dataManager = (db as any).dataManager;
  await dataManager.flushAll();
  
  // Check count after flush
  const countAfter = await tableData.count();
  console.log('Count after flush:', countAfter);
  
  console.log('Added 4 records\n');
  
  // Test WHERE
  const where = await tableData.where({ name: 'apple' }).list();
  console.log('WHERE name=apple:', where);
  
  // Test LIKE - başında
  const like1 = await tableData.like('name', 'ap%').list();
  console.log('\nLIKE name=ap% (a ile başlayanlar):', like1.map((r: any) => r.name));
  
  // Test LIKE - içinde - debug
  console.log('\n--- Debug %bb% ---');
  console.log('Pattern: %bb% -> regex: .*bb.*');
  console.log('Expected: blueberry');
  
  const like2 = await tableData.like('name', '%bb%').list();
  console.log('Result:', like2.map((r: any) => r.name));
  
  // Test LIKE - sonunda
  const like3 = await tableData.like('name', '%y').list();
  console.log('LIKE name=%y (y ile bitenler):', like3.map((r: any) => r.name));
  
  // Test ASC
  const asc = await tableData.asc('name').list();
  console.log('\nASC by name:', asc.map((r: any) => r.name));
  
  // Test DESC
  const desc = await tableData.desc('value').list();
  console.log('\nDESC by value:', desc.map((r: any) => r.value));
  
  // All
  const all = await tableData.list();
  console.log('\nAll:', all);
  
  // Test count
  const count = await tableData.count();
  console.log('\nCount:', count);
}

testOperators().catch(console.error);