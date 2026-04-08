import { ZeroDB, PermissionManager } from '../src';
import * as fs from 'fs';

const testDir = './test/test_databases_new/ts_test';
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
  if (!table) throw new Error('Table not found');
  await table.add({ name: 'Item1' });

  console.log('=== Timestamp Sistem Alanlari Testi ===\n');

  // TEST 1: select(*) ile timestamp
  const all = await table.select('*').list();
  console.log('TEST 1: select(*)');
  console.log('  created_at var:', all[0]?.created_at !== undefined);
  console.log('  updated_at var:', all[0]?.updated_at !== undefined);
  console.log('  created_at:', all[0]?.created_at);
  console.log('  updated_at:', all[0]?.updated_at);

  // TEST 2: select(['name']) ile — timestamp yine gorunmeli
  const partial = await table.select(['name']).list();
  console.log('\nTEST 2: select([name]) — timestamp YINE gorunmeli');
  console.log('  name var:', partial[0]?.name !== undefined);
  console.log('  created_at var:', partial[0]?.created_at !== undefined);
  console.log('  updated_at var:', partial[0]?.updated_at !== undefined);
  console.log('  created_at:', partial[0]?.created_at);
  console.log('  updated_at:', partial[0]?.updated_at);

  // TEST 3: Update oncesi/sonrasi
  console.log('\nTEST 3: Update oncesi/sonrasi updated_at');
  const before = await table.select(['name']).where({ name: 'Item1' }).first();
  const beforeUpdated = before?.updated_at;
  await new Promise(r => setTimeout(r, 150));
  await table.where({ name: 'Item1' }).update({ name: 'Item1_Updated' });
  const after = await table.select(['name']).where({ name: 'Item1_Updated' }).first();
  console.log('  before updated_at:', beforeUpdated);
  console.log('  after updated_at:', after?.updated_at);
  console.log('  updated_at degisti:', beforeUpdated !== after?.updated_at);

  db.logout();
  if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
}

run().catch(console.error);
