import { ZeroDB } from '../src';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DB = './test/test_databases_new/range_edge_test';
const ROOT_PATH = path.dirname(TEST_DB);

// Temiz başlangıç
if (fs.existsSync(TEST_DB)) {
  fs.rmSync(TEST_DB, { recursive: true, force: true });
}

const db = new ZeroDB(ROOT_PATH, 64);

// Bootstrap
db.createDatabase('range_edge_db');
db.addUser('admin', 'pass', 127, true, 'range_edge_db');
db.login('range_edge_db', 'admin', 'pass');

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ ${testName}`);
      passed++;
    } else {
      console.log(`  ❌ ${testName}`);
      failed++;
    }
  }

  // ── Tablo Oluştur ──
  console.log('\n📋 Tablo oluşturuluyor...');
  db.createTable('users', [
    { name: 'id', type: 'auto', option: { isAuto: true } },
    { name: 'username', type: 'string', option: { maxLength: 50, allowNull: false } },
    { name: 'age', type: 'number', option: { allowNull: false } },
  ]);

  const table = db.table('users');

  // ── 10 Kayıt Ekle ──
  console.log('\n📝 10 kayıt ekleniyor...');
  for (let i = 1; i <= 10; i++) {
    await table.add({
      username: `user${i}`,
      age: String(20 + i),
    });
  }
  console.log('  ✅ 10 kayıt eklendi');

  // ── TEST 1: Negatif min değeri → default range(1,1) ──
  console.log('\n🧪 TEST 1: range(-1, 5) — Negatif min');
  const negMin = await table.select('*').range('-1', '5').list();
  assert(negMin.length === 1, `Default range(1,1) ile 1 kayıt dönmeli, dönen: ${negMin.length}`);
  assert(negMin[0]?.username === 'user2', `2. kayıt (index 1) user2 olmalı: ${negMin[0]?.username}`);

  // ── TEST 2: Negatif max değeri → default range(1,1) ──
  console.log('\n🧪 TEST 2: range(0, -5) — Negatif max');
  const negMax = await table.select('*').range('0', '-5').list();
  assert(negMax.length === 1, `Default range(1,1) ile 1 kayıt dönmeli, dönen: ${negMax.length}`);
  assert(negMax[0]?.username === 'user2', `2. kayıt (index 1) user2 olmalı: ${negMax[0]?.username}`);

  // ── TEST 3: NaN değeri → default range(1,1) ──
  console.log('\n🧪 TEST 3: range("abc", 5) — NaN min');
  const nanMin = await table.select('*').range('abc', '5').list();
  assert(nanMin.length === 1, `Default range(1,1) ile 1 kayıt dönmeli, dönen: ${nanMin.length}`);
  assert(nanMin[0]?.username === 'user2', `2. kayıt (index 1) user2 olmalı: ${nanMin[0]?.username}`);

  // ── TEST 4: Çok büyük max değeri → sınırlandırılmalı (tablo boyutuna) ──
  console.log('\n🧪 TEST 4: range(0, 5555555555) — Çok büyük max');
  const largeRange = await table.select('*').range('0', '5555555555').list();
  assert(largeRange.length === 10, `Tablo boyutuna sınırlandırılmalı (10), dönen: ${largeRange.length}`);

  // ── TEST 5: Tabloda olmayan başlangıç → boş dönmeli ──
  console.log('\n🧪 TEST 5: range(50, 100) — Tablo dışı aralık');
  const outOfRange = await table.select('*').range('50', '100').list();
  assert(outOfRange.length === 0, `0 kayıt dönmeli, dönen: ${outOfRange.length}`);

  // ── TEST 6: Float değeri → parseInt ile işlenmeli ──
  console.log('\n🧪 TEST 6: range(1.9, 5.7) — Float değerler');
  const floatRange = await table.select(['username']).range('1.9', '5.7').list();
  assert(floatRange.length === 5, `5 kayıt dönmeli (1-5), dönen: ${floatRange.length}`);

  // ── TEST 7: Boş string → varsayılan davranış ──
  console.log('\n🧪 TEST 7: range("", "") — Her ikisi de boş');
  const emptyRange = await table.select(['username']).range('', '').list();
  assert(emptyRange.length === 10, `10 kayıt dönmeli (tüm tablo), dönen: ${emptyRange.length}`);

  // ── TEST 8: Min > Max → boş dönmeli ──
  console.log('\n🧪 TEST 8: range(8, 2) — Min > Max');
  const invertedRange = await table.select('*').range('8', '2').list();
  assert(invertedRange.length === 0, `0 kayıt dönmeli (min > max), dönen: ${invertedRange.length}`);

  // ── TEST 9: Sınır değerler (0 ve son indeks) ──
  console.log('\n🧪 TEST 9: range(0, 9) — Tam tablo aralığı');
  const fullRange = await table.select(['username']).range('0', '9').list();
  assert(fullRange.length === 10, `10 kayıt dönmeli, dönen: ${fullRange.length}`);
  assert(fullRange[0]?.username === 'user1', `İlk: user1, gelen: ${fullRange[0]?.username}`);
  assert(fullRange[9]?.username === 'user10', `Son: user10, gelen: ${fullRange[9]?.username}`);

  // ── TEST 10: where + range kombinasyonunda güvenlik ──
  console.log('\n🧪 TEST 10: where + range(-1, 5) — Kombinasyonda negatif');
  const comboNeg = await table.select('*').where({ age: '25' }).range('-1', '5').list();
  assert(comboNeg.length <= 1, `Default range(1,1) ile en fazla 1 kayıt dönmeli: ${comboNeg.length}`);

  // ── Özet ──
  console.log('\n' + '='.repeat(50));
  console.log(`📊 TEST SONUÇLARI: ${passed} geçti, ${failed} başarısız`);
  console.log('='.repeat(50));

  // Temizlik
  db.logout();
  if (fs.existsSync(TEST_DB)) {
    fs.rmSync(TEST_DB, { recursive: true, force: true });
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('❌ Test hatası:', e);
  process.exit(1);
});
