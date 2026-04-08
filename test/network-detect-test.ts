import { ZeroDB, PermissionManager } from '../src';
import * as path from 'path';
import * as fs from 'fs';

// Mocking a network path for Windows (UNC)
const networkPath = '\\\\LOCALHOST\\db\\network_lock_test';
const networkLockFile = path.join(networkPath, 'network.zdb');

async function cleanup() {
  if (fs.existsSync(networkPath)) {
    try {
      fs.rmSync(networkPath, { recursive: true, force: true });
    } catch (e) {}
  }
}

async function runNetworkLockTest() {
  console.log('--- Network Lock Detection Test ---');
  
  // Note: This test might fail if the environment doesn't allow creating directories with UNC-like names
  // But we can at least test the logic if we use a path that 'isNetworkPath' accepts.
  
  const db = new ZeroDB(networkPath);
  console.log('isNetwork:', (db as any).isNetwork);
  
  if (!(db as any).isNetwork) {
    console.error('❌ FAIL: Network path not detected correctly');
    process.exit(1);
  }

  console.log('Creating database...');
  db.createDatabase('netdb');
  (db as any).dbManager.addUser('netdb', 'admin', 'admin123', PermissionManager.all(), true);
  await db.login('netdb', 'admin', 'admin123');

  console.log('Creating table (this should trigger network lock)...');
  await db.createTable('test', [{ name: 'id', type: 'auto', option: { isAuto: true } }]);

  if (fs.existsSync(networkLockFile)) {
    console.log('✅ SUCCESS: network.zdb created');
    const content = fs.readFileSync(networkLockFile, 'utf-8');
    console.log('network.zdb content:', content);
  } else {
    console.log('❌ FAIL: network.zdb NOT created');
  }

  // cleanup();
  process.exit(0);
}

runNetworkLockTest().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
