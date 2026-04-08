import { ZeroDB, PermissionManager } from '../src';
import * as fs from 'fs';

const testDir = './test/test_databases_new/ts_debug2';
if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });

async function run() {
  const db = new ZeroDB(testDir, 64);
  db.createDatabase('ts_db');
  (db as any).dbManager.addUser('ts_db', 'admin', 'pass', 127, true);
  await db.login('ts_db', 'admin', 'pass');

  db.createTable('items', [
    { name: 'id', type: 'auto', option: { isAuto: true } },
    { name: 'name', type: 'string', option: { maxLength: 50 } },
  ]);

  const table = db.table('items');
  await table.add({ name: 'Item1' });

  // selectRecords oncesi fieldFileNames kontrol
  const fieldManager = (db as any).fieldManager;
  const fieldFileNames = fieldManager.getAllFields('ts_db', 'items');
  console.log('fieldFileNames:', Array.from(fieldFileNames.keys()));

  // dataManager.selectRecords debug
  const dataManager = (db as any).dataManager;
  const selectFields = ['name', 'created_at', 'updated_at'];
  const results = await dataManager.selectRecords(
    'ts_db', 'items', selectFields, fieldFileNames
  );
  console.log('\nselectRecords result keys:', Object.keys(results[0] || {}));
  console.log('selectRecords result:', results[0]);

  // QueryBuilder ile test
  console.log('\n--- QueryBuilder test ---');
  const all = await table.select('*').list();
  console.log('select(*) keys:', Object.keys(all[0] || {}));

  const partial = await table.select(['name']).list();
  console.log('select([name]) keys:', Object.keys(partial[0] || {}));

  db.logout();
  if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
}

run().catch(console.error);
