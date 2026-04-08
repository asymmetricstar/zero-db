import { ZeroDB } from '../src';
import { autoScaler } from '../src/engine/auto-scaler';
import * as path from 'path';
import * as fs from 'fs';

const testDir = path.join(__dirname, 'exit_test_databases');

async function cleanup() {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

async function runExitTest() {
  console.log('--- Exit Timeout Test ---');
  await cleanup();
  
  const db = new ZeroDB(testDir);
  console.log('ZeroDB initialized (AutoScaler started).');
  
  // Create a database and table to trigger some engine activity
  db.createDatabase('exittdb', { owner: ['admin'] });
  (db as any).dbManager.addUser('exittdb', 'admin', 'admin123', 127, true);
  const loginResult = await db.login('exittdb', 'admin', 'admin123');
  if (!loginResult.ok) {
    throw new Error(`Login failed: ${loginResult.error}`);
  }
  await db.createTable('test', [
    { name: 'id', type: 'auto', option: { isAuto: true } },
    { name: 'data', type: 'string' }
  ]);
  
  const tableResult = await db.table('test');
  if (!tableResult.ok) {
    throw new Error(`Failed to get table: ${tableResult.error}`);
  }
  const table = tableResult.data;
  
  console.log('Inserting a record to ensure engine is active...');
  await table.add({ data: 'test' });

  console.log('Stopping AutoScaler...');
  autoScaler.stop();
  
  console.log('Test completed. Process should exit now.');
  
  // Set a timeout to fail the test if the process doesn't exit
  const timeout = setTimeout(() => {
    console.error('❌ FAILED: Process did not exit within 5 seconds. Something is keeping it alive!');
    process.exit(1);
  }, 5000);
  
  // Unref the timeout so it doesn't keep the process alive itself
  timeout.unref();
}

runExitTest().catch(console.error);
