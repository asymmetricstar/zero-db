import { ZeroDB } from './src';
import * as fs from 'fs';

const testDir = './test_special';
if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });

async function run() {
  console.log('--- Special Characters Test ---');
  const db = new ZeroDB(testDir, 64);
  db.createDatabase('special_db');
  db.addUser('admin', 'pass', 127, true, 'special_db');
  db.login('special_db', 'admin', 'pass');

  db.createTable('notes', [
    { name: 'id', type: 'auto', option: { isAuto: true } },
    { name: 'content', type: 'string' },
  ]);

  const table = db.table('notes');

  const specialValue = 'Line 1\nLine 2\rLine 3: With Colon';
  console.log('Inserting value with special characters...');
  console.log('Original value length:', specialValue.length);

  await table.add({ content: specialValue });
  
  // Clear cache to force disk read
  db.clearCache();
  
  console.log('Reading back from disk...');
  const records = await db.table('notes').select(['content']).list();
  
  if (records.length === 0) {
    console.error('ERROR: No records found!');
  } else {
    const retrievedValue = records[0].content;
    console.log('Retrieved value length:', retrievedValue?.length);
    
    if (retrievedValue === specialValue) {
      console.log('✅ SUCCESS: Special characters handled correctly!');
    } else {
      console.error('❌ FAILURE: Value mismatch!');
      console.log('Expected:', JSON.stringify(specialValue));
      console.log('Received:', JSON.stringify(retrievedValue));
    }
  }

  db.logout();
  // if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
}

run().catch(console.error);
