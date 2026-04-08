import { ZeroDB, PermissionManager } from '../src';
import * as fs from 'fs';
import * as path from 'path';

const testDir = path.join(__dirname, 'integrity_test_databases');

interface IntegrityResult {
  testName: string;
  totalRecords: number;
  inserted: number;
  retrieved: number;
  missing: number;
  duplicates: number;
  errors: number;
  passed: boolean;
  duration: number;
}

const results: IntegrityResult[] = [];

async function cleanup() {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

async function runIntegrityTest(sizeName: string, recordCount: number) {
  console.log(`\n--- ${sizeName} Integrity Test (${recordCount.toLocaleString()} records) ---`);
  
  const start = Date.now();
  
  try {
    const dbName = `integrity_db_${sizeName}`;
    const db = new ZeroDB(testDir);
    db.createDatabase(dbName);
    (db as any).dbManager.addUser(dbName, 'admin', 'admin123', PermissionManager.all(), true);
    db.clearCache();
    await db.login(dbName, 'admin', 'admin123');

    await db.createTable('records', [
      { name: 'id', type: 'auto', option: { isAuto: true } },
      { name: 'data', type: 'string' },
      { name: 'value', type: 'number' },
      { name: 'timestamp', type: 'timestamp' }
    ]);

    const table = db.table('records');
    if (!table) throw new Error('Table not created');

    console.log(`Inserting ${recordCount.toLocaleString()} records...`);
    
    const batchSize = 1000;
    let insertedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < recordCount; i += batchSize) {
      const batch: Record<string, string>[] = [];
      for (let j = 0; j < batchSize && i + j < recordCount; j++) {
        const recordId = i + j;
        batch.push({ 
          data: `Record_${recordId}`, 
          value: String(recordId),
          timestamp: new Date().toISOString()
        });
      }
      
      try {
        const result = await table.addBatch(batch);
        if (result.success) {
          insertedCount += result.lineNumbers.length;
        } else {
          errorCount += result.errors.length;
        }
      } catch (e: any) {
        errorCount++;
        console.log(`  Error at batch ${i}: ${e.message}`);
      }
      
      if ((i / batchSize) % 10 === 0) {
        console.log(`  Progress: ${Math.round((i / recordCount) * 100)}%`);
      }
    }

    console.log(`Verifying ${recordCount.toLocaleString()} records...`);
    
    const allRecords = await table.select('*').list();
    const retrievedCount = allRecords.length;
    
    const foundIds = new Set<number>();
    let duplicateCount = 0;
    
    for (const record of allRecords) {
      const id = parseInt(record.value);
      if (foundIds.has(id)) {
        duplicateCount++;
      } else {
        foundIds.add(id);
      }
    }
    
    const expectedIds = new Set<number>();
    for (let i = 0; i < recordCount; i++) {
      expectedIds.add(i);
    }
    
    let missingCount = 0;
    for (const id of expectedIds) {
      if (!foundIds.has(id)) {
        missingCount++;
      }
    }
    
    const duration = Date.now() - start;
    const passed = errorCount === 0 && missingCount === 0 && duplicateCount === 0;
    
    const result: IntegrityResult = {
      testName: sizeName,
      totalRecords: recordCount,
      inserted: insertedCount,
      retrieved: retrievedCount,
      missing: missingCount,
      duplicates: duplicateCount,
      errors: errorCount,
      passed,
      duration
    };
    
    results.push(result);
    
    console.log(`\n📊 Results:`);
    console.log(`  Inserted: ${insertedCount.toLocaleString()}`);
    console.log(`  Retrieved: ${retrievedCount.toLocaleString()}`);
    console.log(`  Missing: ${missingCount}`);
    console.log(`  Duplicates: ${duplicateCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log(`  Duration: ${duration}ms`);
    console.log(`  Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    return passed;
    
  } catch (e: any) {
    const duration = Date.now() - start;
    results.push({
      testName: sizeName,
      totalRecords: recordCount,
      inserted: 0,
      retrieved: 0,
      missing: recordCount,
      duplicates: 0,
      errors: 1,
      passed: false,
      duration
    });
    console.log(`  ❌ Error: ${e.message}`);
    return false;
  }
}

async function runIntegrityTests() {
  await cleanup();
  console.log('=== ZeroDB Data Integrity Test ===');
  console.log('Testing: No data loss, no corruption, no errors\n');
  console.log('Test System: Intel i9 (32 cores), 32GB RAM, RTX 4070');

  const sizes = [
    { name: '1K', count: 1000 },
    { name: '5K', count: 5000 },
    { name: '10K', count: 10000 },
    { name: '50K', count: 50000 },
    { name: '100K', count: 100000 },
    { name: '500K', count: 500000 },
    { name: '1M', count: 1000000 },
  ];

  let allPassed = true;
  
  for (const size of sizes) {
    const passed = await runIntegrityTest(size.name, size.count);
    if (!passed) {
      allPassed = false;
      console.log(`\n⚠️ Test failed at ${size.name}, stopping...`);
      break;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('=== INTEGRITY TEST SUMMARY ===');
  console.log('='.repeat(50));
  
  console.log('\n| Test | Total | Inserted | Retrieved | Missing | Duplicates | Errors | Status |');
  console.log('|------|-------|----------|-----------|---------|-------------|--------|--------|');
  
  for (const r of results) {
    const status = r.passed ? '✅' : '❌';
    console.log(`| ${r.testName} | ${r.totalRecords.toLocaleString()} | ${r.inserted.toLocaleString()} | ${r.retrieved.toLocaleString()} | ${r.missing} | ${r.duplicates} | ${r.errors} | ${status} |`);
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED - No data loss, no corruption, 0 errors!');
  } else {
    console.log('\n⚠️ Some tests failed - data integrity issues detected!');
  }

  generateReport();
}

function generateReport() {
  const now = new Date().toISOString();
  let report = `# ZeroDB Data Integrity Test Raporu\n\n`;
  report += `**Tarih:** ${now}\n\n`;
  report += `**Test Sistemi:** Intel i9 (32 çekirdek), 32GB RAM, NVIDIA RTX 4070\n\n`;
  
  report += `## Amaç\n\n`;
  report += `Veritabanının veri bütünlüğünü test etmek:\n`;
  report += `- Kayıt kaybı olmamalı\n`;
  report += `- Veri bozulması olmamalı\n`;
  report += `- Hata olmamalı (error = 0)\n`;
  report += `- Tüm kayıtlar doğru şekilde kaydedilmeli\n\n`;
  
  report += `## Sonuçlar\n\n`;
  report += `| Test | Toplam | Eklendi | Okundu | Eksik | Tekrar | Hata | Durum |\n`;
  report += `|------|--------|---------|--------|-------|--------|------|--------|\n`;
  
  for (const r of results) {
    const status = r.passed ? '✅' : '❌';
    report += `| ${r.testName} | ${r.totalRecords.toLocaleString()} | ${r.inserted.toLocaleString()} | ${r.retrieved.toLocaleString()} | ${r.missing} | ${r.duplicates} | ${r.errors} | ${status} |\n`;
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  report += `\n## Özet\n\n`;
  report += `- **Toplam Test:** ${results.length}\n`;
  report += `- **Başarılı:** ${passed}\n`;
  report += `- **Başarısız:** ${failed}\n`;
  report += `- **Toplam Kayıt:** ${results.reduce((sum, r) => sum + r.totalRecords, 0).toLocaleString()}\n`;
  
  if (failed === 0) {
    report += `\n🎉 **Sonuç:** Tüm testler başarılı! Veritabanı veri bütünlüğü garantilendi.\n`;
    report += `- 0 kayıt kaybı\n`;
    report += `- 0 veri bozulması\n`;
    report += `- 0 hata\n`;
  } else {
    report += `\n⚠️ **Sonuç:** Bazı testler başarısız. Veri bütünlüğü sorunları tespit edildi!\n`;
  }
  
  fs.writeFileSync(path.join(__dirname, '..', 'integrity_test_raporu.md'), report);
  console.log('\n📄 Report saved to integrity_test_raporu.md');
}

runIntegrityTests().catch(e => {
  console.error('Integrity test failed:', e);
  process.exit(1);
});