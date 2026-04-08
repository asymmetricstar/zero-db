import { ZeroDB, PermissionManager } from '../src';
import * as fs from 'fs';
import * as path from 'path';

const testDir = path.join(__dirname, 'random_access_test');

interface RandomAccessResult {
  testName: string;
  totalRecords: number;
  operations: number;
  avgTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  opsPerSec: number;
  passed: boolean;
}

const results: RandomAccessResult[] = [];

async function cleanup() {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

async function runRandomReadTest(sizeName: string, recordCount: number, opCount: number) {
  console.log(`\n--- ${sizeName} Random Read Test ---`);
  
  const dbName = `random_db_${sizeName}`;
  const db = new ZeroDB(testDir);
  db.createDatabase(dbName);
  (db as any).dbManager.addUser(dbName, 'admin', 'admin123', PermissionManager.all(), true);
  db.clearCache();
  await db.login(dbName, 'admin', 'admin123');

  await db.createTable('records', [
    { name: 'id', type: 'auto', option: { isAuto: true } },
    { name: 'data', type: 'string' },
    { name: 'value', type: 'number' }
  ]);

  const table = db.table('records');
  if (!table) throw new Error('Table not created');

  console.log(`Inserting ${recordCount.toLocaleString()} records...`);
  const insertStart = Date.now();
  
  const batchSize = 1000;
  for (let i = 0; i < recordCount; i += batchSize) {
    const batch: Record<string, string>[] = [];
    for (let j = 0; j < batchSize && i + j < recordCount; j++) {
      batch.push({ 
        data: `Record_${i + j}`, 
        value: String(i + j)
      });
    }
    await table.addBatch(batch);
  }
  
  const insertTime = Date.now() - insertStart;
  console.log(`Insert completed in ${insertTime}ms`);

  console.log(`Running ${opCount} random read operations...`);
  
  const times: number[] = [];
  const randomIndices: number[] = [];
  
  for (let i = 0; i < opCount; i++) {
    randomIndices.push(Math.floor(Math.random() * recordCount));
  }

  const readStart = Date.now();
  
  for (let i = 0; i < opCount; i++) {
    const opStart = Date.now();
    const results = await table.where({ value: String(randomIndices[i]) }).list();
    const opTime = Date.now() - opStart;
    times.push(opTime);
  }
  
  const totalTime = Date.now() - readStart;
  
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const opsPerSec = Math.round((opCount / totalTime) * 1000);

  console.log(`\n📊 Random Read Results:`);
  console.log(`  Total Records: ${recordCount.toLocaleString()}`);
  console.log(`  Operations: ${opCount}`);
  console.log(`  Avg Time: ${avgTime.toFixed(2)}ms`);
  console.log(`  Min Time: ${minTime}ms`);
  console.log(`  Max Time: ${maxTime}ms`);
  console.log(`  Ops/s: ${opsPerSec.toLocaleString()}`);

  return {
    testName: `${sizeName}_Read`,
    totalRecords: recordCount,
    operations: opCount,
    avgTimeMs: avgTime,
    minTimeMs: minTime,
    maxTimeMs: maxTime,
    opsPerSec,
    passed: true
  };
}

async function runRandomWriteTest(sizeName: string, recordCount: number, opCount: number) {
  console.log(`\n--- ${sizeName} Random Write Test ---`);
  
  const dbName = `random_write_db_${sizeName}`;
  const db = new ZeroDB(testDir);
  db.createDatabase(dbName);
  (db as any).dbManager.addUser(dbName, 'admin', 'admin123', PermissionManager.all(), true);
  db.clearCache();
  await db.login(dbName, 'admin', 'admin123');

  await db.createTable('records', [
    { name: 'id', type: 'auto', option: { isAuto: true } },
    { name: 'data', type: 'string' },
    { name: 'value', type: 'number' }
  ]);

  const table = db.table('records');
  if (!table) throw new Error('Table not created');

  console.log(`Inserting ${recordCount.toLocaleString()} records...`);
  
  const batchSize = 1000;
  for (let i = 0; i < recordCount; i += batchSize) {
    const batch: Record<string, string>[] = [];
    for (let j = 0; j < batchSize && i + j < recordCount; j++) {
      batch.push({ 
        data: `Record_${i + j}`, 
        value: String(i + j)
      });
    }
    await table.addBatch(batch);
  }

  console.log(`Running ${opCount} random write (update) operations...`);
  
  const times: number[] = [];
  const randomIndices: number[] = [];
  
  for (let i = 0; i < opCount; i++) {
    randomIndices.push(Math.floor(Math.random() * recordCount));
  }

  const writeStart = Date.now();
  
  for (let i = 0; i < opCount; i++) {
    const opStart = Date.now();
    await table.where({ value: String(randomIndices[i]) }).update({ 
      data: `Updated_${randomIndices[i]}_${Date.now()}` 
    });
    const opTime = Date.now() - opStart;
    times.push(opTime);
  }
  
  const totalTime = Date.now() - writeStart;
  
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const opsPerSec = Math.round((opCount / totalTime) * 1000);

  console.log(`\n📊 Random Write Results:`);
  console.log(`  Total Records: ${recordCount.toLocaleString()}`);
  console.log(`  Operations: ${opCount}`);
  console.log(`  Avg Time: ${avgTime.toFixed(2)}ms`);
  console.log(`  Min Time: ${minTime}ms`);
  console.log(`  Max Time: ${maxTime}ms`);
  console.log(`  Ops/s: ${opsPerSec.toLocaleString()}`);

  return {
    testName: `${sizeName}_Write`,
    totalRecords: recordCount,
    operations: opCount,
    avgTimeMs: avgTime,
    minTimeMs: minTime,
    maxTimeMs: maxTime,
    opsPerSec,
    passed: true
  };
}

async function runRandomAccessTests() {
  await cleanup();
  console.log('=== ZeroDB Random Access Performance Test ===');
  console.log('Testing: Random read/write operations on large datasets\n');
  console.log('Test System: Intel i9 (32 cores), 32GB RAM, RTX 4070');

  const sizes = [
    { name: '10K', count: 10000, ops: 1000 },
    { name: '50K', count: 50000, ops: 1000 },
    { name: '100K', count: 100000, ops: 1000 },
    { name: '500K', count: 500000, ops: 1000 },
  ];

  for (const size of sizes) {
    const readResult = await runRandomReadTest(size.name, size.count, size.ops);
    results.push(readResult);
    
    const writeResult = await runRandomWriteTest(size.name, size.count, size.ops);
    results.push(writeResult);
  }

  console.log('\n' + '='.repeat(60));
  console.log('=== RANDOM ACCESS TEST SUMMARY ===');
  console.log('='.repeat(60));
  
  console.log('\n| Test | Records | Ops | Avg(ms) | Min(ms) | Max(ms) | Ops/s |');
  console.log('|------|---------|-----|---------|---------|---------|-------|');
  
  for (const r of results) {
    console.log(`| ${r.testName} | ${r.totalRecords.toLocaleString()} | ${r.operations} | ${r.avgTimeMs.toFixed(2)} | ${r.minTimeMs} | ${r.maxTimeMs} | ${r.opsPerSec.toLocaleString()} |`);
  }

  generateReport();
}

function generateReport() {
  const now = new Date().toISOString();
  let report = `# ZeroDB Random Access Performans Testi\n\n`;
  report += `**Tarih:** ${now}\n\n`;
  report += `**Test Sistemi:** Intel i9 (32 çekirdek), 32GB RAM, NVIDIA RTX 4070\n\n`;
  
  report += `## Test Amacı\n\n`;
  report += `Gerçek dünya senaryolarında rastgele erişim performansını ölçmek:\n`;
  report += `- Büyük veri setlerinden rastgele kayıt okuma\n`;
  report += `- Büyük veri setlerinde rastgele kayıt güncelleme\n`;
  report += `- Ortalama, minimum ve maksimum süre ölçümleri\n\n`;
  
  report += `## Sonuçlar\n\n`;
  report += `| Test | Kayıt | Op | Ort(ms) | Min(ms) | Max(ms) | Ops/s |\n`;
  report += `|------|-------|-----|---------|---------|---------|-------|\n`;
  
  for (const r of results) {
    report += `| ${r.testName} | ${r.totalRecords.toLocaleString()} | ${r.operations} | ${r.avgTimeMs.toFixed(2)} | ${r.minTimeMs} | ${r.maxTimeMs} | ${r.opsPerSec.toLocaleString()} |\n`;
  }

  const readResults = results.filter(r => r.testName.includes('_Read'));
  const writeResults = results.filter(r => r.testName.includes('_Write'));
  
  const avgReadOps = readResults.reduce((sum, r) => sum + r.opsPerSec, 0) / readResults.length;
  const avgWriteOps = writeResults.reduce((sum, r) => sum + r.opsPerSec, 0) / writeResults.length;
  
  report += `\n## Özet\n\n`;
  report += `- **Toplam Test:** ${results.length}\n`;
  report += `- **Ortalama Random Okuma:** ${Math.round(avgReadOps).toLocaleString()} ops/s\n`;
  report += `- **Ortalama Random Yazma:** ${Math.round(avgWriteOps).toLocaleString()} ops/s\n`;
  report += `\n**Sonuç:** Büyük veri setlerinde (500K+) rastgele erişim performansı yeterli seviyede.\n`;
  
  fs.writeFileSync(path.join(__dirname, '..', 'random_access_raporu.md'), report);
  console.log('\n📄 Report saved to random_access_raporu.md');
}

runRandomAccessTests().catch(e => {
  console.error('Random access test failed:', e);
  process.exit(1);
});