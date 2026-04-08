import { ZeroDB, PermissionManager } from '../src';
import * as path from 'path';
import * as fs from 'fs';

const testDir = path.join(__dirname, 'like_test_databases');

async function cleanup() {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

async function runLikeTest() {
  await cleanup();
  const db = new ZeroDB(testDir);
  db.createDatabase('liketdb');
  (db as any).dbManager.addUser('liketdb', 'admin', 'admin123', PermissionManager.all(), true);
  await db.login('liketdb', 'admin', 'admin123');

  await db.createTable('users', [
    { name: 'id', type: 'auto', option: { isAuto: true } },
    { name: 'username', type: 'string' }
  ]);

  const table = await db.table('users');
  const tableData = (table as any).data;

  await tableData.add({ username: 'apple' });
  await tableData.add({ username: 'banana' });
  await tableData.add({ username: 'cherry' });
  await tableData.add({ username: 'pineapple' });
  await tableData.add({ username: 'guava' });

  console.log('--- LIKE Test ---');
  
  const tests = [
    { pattern: 'a%', expected: ['apple'] }, // Starts with 'a'
    { pattern: '%a', expected: ['banana', 'guava'] }, // Ends with 'a'
    { pattern: '%an%', expected: ['banana'] }, // Contains 'an'
    { pattern: '%apple%', expected: ['apple', 'pineapple'] }, // Contains 'apple'
    { pattern: 'apple', expected: ['apple'] } // Exact match
  ];

  for (const t of tests) {
    const results = await tableData.like('username', t.pattern).list();
    const usernames = results.map((r: any) => r.username).sort();
    const expected = t.expected.sort();
    const passed = JSON.stringify(usernames) === JSON.stringify(expected);
    console.log(`Pattern: ${t.pattern} | Expected: ${expected} | Got: ${usernames} | ${passed ? '✅' : '❌'}`);
  }

  console.log('\n--- Combined WHERE & LIKE Test ---');
  // First record is apple (id 1), banana (id 2), etc.
  const combined = await tableData.where({ id: '1' }).like('username', 'a%').list();
  console.log(`WHERE id=1 AND LIKE a%: ${combined.map((r: any) => r.username)} | ${combined.length === 1 && combined[0].username === 'apple' ? '✅' : '❌'}`);

  const combined2 = await tableData.where({ id: '2' }).like('username', 'a%').list();
  console.log(`WHERE id=2 AND LIKE a%: ${combined2.map((r: any) => r.username)} | ${combined2.length === 0 ? '✅' : '❌'}`);

  process.exit(0);
}

runLikeTest().catch((e) => {
  console.error(e);
  process.exit(1);
});
