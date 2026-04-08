import { ZeroDB, PermissionManager } from '../src';
import * as fs from 'fs';
import * as path from 'path';

const testDir = path.join(__dirname, 'stress_test_databases');

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  recordCount: number;
  opsPerSec: number;
  error?: string;
}

const results: TestResult[] = [];

async function cleanup() {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

async function runTest(name: string, recordCount: number, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    const opsPerSec = Math.round((recordCount / duration) * 1000);
    results.push({ name, passed: true, duration, recordCount, opsPerSec });
    console.log(`✓ ${name}: ${recordCount} records in ${duration}ms (${opsPerSec.toLocaleString()} ops/sec)`);
  } catch (e: any) {
    const duration = Date.now() - start;
    results.push({ name, passed: false, duration, recordCount, opsPerSec: 0, error: e.message });
    console.log(`✗ ${name}: ${e.message} (${duration}ms)`);
  }
}

async function runStressTests() {
  await cleanup();
  console.log('=== ZeroDB Stress Test ===\n');

  const sizes = [
    { name: '1K', count: 1000 },
    { name: '10K', count: 10000 },
    { name: '100K', count: 100000 },
    { name: '1M', count: 1000000 },
    { name: '10M', count: 10000000 },
  ];

  let dbInstance: ZeroDB | null = null;

  for (const size of sizes) {
    console.log(`\n--- ${size.name} Test ---`);
    
    dbInstance = new ZeroDB(testDir);
    const dbName = `stress_db_${size.name}`;
    dbInstance.createDatabase(dbName);
    (dbInstance as any).dbManager.addUser(dbName, 'admin', 'admin123', PermissionManager.all(), true);
    dbInstance.clearCache();
    await dbInstance.login(dbName, 'admin', 'admin123');

    await dbInstance.createTable('records', [
      { name: 'id', type: 'auto', option: { isAuto: true } },
      { name: 'data', type: 'string' },
      { name: 'value', type: 'number' },
      { name: 'timestamp', type: 'timestamp' }
    ]);

    const table = dbInstance.table('records');
    if (!table) throw new Error('Table not created');

    await runTest(`Insert ${size.name}`, size.count, async () => {
      const batchSize = 1000;
      for (let i = 0; i < size.count; i += batchSize) {
        const batch: Record<string, string>[] = [];
        for (let j = 0; j < batchSize && i + j < size.count; j++) {
          batch.push({ 
            data: `Record ${i + j}`, 
            value: String(i + j),
            timestamp: new Date().toISOString()
          });
        }
        await table.addBatch(batch);
      }
    });

    if (size.count <= 10000) {
      await runTest(`Query ${size.name}`, size.count, async () => {
        const queryResults = await table.where({ value: String(Math.floor(size.count / 2)) }).list();
        if (queryResults.length === 0) throw new Error('No records found');
      });

      await runTest(`Update ${size.name}`, size.count, async () => {
        await table.where({ data: 'Record 0' }).update({ data: 'Updated Record' });
      });

      await runTest(`Delete ${size.name}`, size.count, async () => {
        await table.where({ data: 'Updated Record' }).delete();
      });
    }

    const count = await table.count();
    console.log(`  Total records: ${count.toLocaleString()}`);
  }

  console.log('\n=== Final Results ===\n');
  console.log('| Test | Records | Duration | Ops/sec | Status |');
  console.log('|------|---------|----------|---------|--------|');
  
  for (const r of results) {
    const status = r.passed ? '✓' : '✗';
    console.log(`| ${r.name} | ${r.recordCount.toLocaleString()} | ${r.duration}ms | ${r.opsPerSec.toLocaleString()} | ${status} |`);
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`\nTotal: ${passed} passed, ${failed} failed`);

  const report = generateReport();
  fs.writeFileSync(path.join(__dirname, '..', 'test_raporu.md'), report);
  console.log('\n📊 Report saved to test_raporu.md');
}

function generateReport(): string {
  const now = new Date().toISOString();
  let report = `# ZeroDB Stress Test Raporu\n\n`;
  report += `**Tarih:** ${now}\n\n`;
  report += `## Test Sonuçları\n\n`;
  report += `| Test | Kayıt | Süre (ms) | Ops/s | Durum |\n`;
  report += `|------|-------|------------|-------|--------|\n`;
  
  for (const r of results) {
    const status = r.passed ? '✅' : '❌';
    report += `| ${r.name} | ${r.recordCount.toLocaleString()} | ${r.duration} | ${r.opsPerSec.toLocaleString()} | ${status} |\n`;
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  report += `\n## Özet\n\n`;
  report += `- **Toplam Test:** ${results.length}\n`;
  report += `- **Başarılı:** ${passed}\n`;
  report += `- **Başarısız:** ${failed}\n`;
  
  return report;
}

runStressTests().catch(e => {
  console.error('Stress test failed:', e);
  process.exit(1);
});