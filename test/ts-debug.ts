import { ZeroDB, PermissionManager } from '../src';
import * as fs from 'fs';

const testDir = './test/test_databases_new/ts_debug';
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

  // Debug: fieldFileNames ve schemas kontrol
  const fieldManager = (db as any).fieldManager;
  const fieldFileNames = fieldManager.getAllFields('ts_db', 'items');
  console.log('fieldFileNames:', Array.from(fieldFileNames.entries()));

  // Debug: schema kontrol
  const schema = (db as any).dbManager.getSchema('ts_db', 'items');
  console.log('schema fields:', schema ? Array.from((schema as Map<string, any>).keys()) : 'no schema');

  // Debug: Spawn ile dosya okuma
  const dataManager = (db as any).dataManager;
  for (const [fieldName, fileName] of fieldFileNames.entries()) {
    const spawn = dataManager.getSpawn('ts_db', 'items', fileName);
    await spawn.read();
    const records = spawn.getAll();
    console.log(`  ${fieldName} (${fileName}): ${records.size} records`);
    for (const [line, val] of records.entries()) {
      console.log(`    line ${line}: "${val.substring(0, 50)}"`);
    }
  }

  // Sonuc
  const all = await table.select('*').list();
  console.log('\nselect(*) result keys:', Object.keys(all[0] || {}));
  console.log('select(*) result:', JSON.stringify(all[0], null, 2));

  db.logout();
  if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
}

run().catch(console.error);
