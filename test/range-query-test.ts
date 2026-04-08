import { ZeroDB } from '../src';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DB = './test/test_databases_new/range_test';
const ROOT_PATH = path.dirname(TEST_DB);

// Temiz başlangıç
if (fs.existsSync(TEST_DB)) {
  fs.rmSync(TEST_DB, { recursive: true, force: true });
}

const db = new ZeroDB(ROOT_PATH, 64);

// Bootstrap
db.createDatabase('range_test_db');
db.addUser('admin', 'pass', 127, true, 'range_test_db');
db.login('range_test_db', 'admin', 'pass');

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
    { name: 'city', type: 'string', option: { defaultValue: 'unknown' } },
  ]);

  const table = db.table('users');

  // ── 20 Kayıt Ekle ──
  console.log('\n📝 20 kayıt ekleniyor...');
  const cities = ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya'];
  for (let i = 1; i <= 20; i++) {
    await table.add({
      username: `user${i}`,
      age: String(18 + (i % 30)),
      city: cities[i % cities.length],
    });
  }
  console.log('  ✅ 20 kayıt eklendi');

  // ── TEST 1: range() ile ilk 5 kayıt ──
  console.log('\n🧪 TEST 1: range(0, 4) — İlk 5 kayıt');
  const first5 = await table.select('*').range('0', '4').list();
  assert(first5.length === 5, `5 kayıt dönmeli, dönen: ${first5.length}`);
  assert(first5[0]?.username === 'user1', `İlk kayıt user1 olmalı: ${first5[0]?.username}`);
  assert(first5[4]?.username === 'user5', `Son kayıt user5 olmalı: ${first5[4]?.username}`);

  // ── TEST 2: range() ile orta dilim ──
  console.log('\n🧪 TEST 2: range(5, 9) — 6-10 arası kayıtlar');
  const mid = await table.select(['username', 'age']).range('5', '9').list();
  assert(mid.length === 5, `5 kayıt dönmeli, dönen: ${mid.length}`);
  assert(mid[0]?.username === 'user6', `İlk kayıt user6 olmalı: ${mid[0]?.username}`);
  assert(mid[4]?.username === 'user10', `Son kayıt user10 olmalı: ${mid[4]?.username}`);

  // ── TEST 3: range() + where() kombinasyonu ──
  console.log('\n🧪 TEST 3: where + range kombinasyonu');
  const filtered = await table
    .select(['username', 'city'])
    .where({ city: 'Istanbul' })
    .range('0', '1')
    .list();
  assert(filtered.length <= 2, `En fazla 2 kayıt dönmeli, dönen: ${filtered.length}`);
  filtered.forEach(r => {
    assert(r.city === 'Istanbul', `city Istanbul olmalı: ${r.city}`);
  });

  // ── TEST 4: range() + like() kombinasyonu ──
  console.log('\n🧪 TEST 4: like + range kombinasyonu');
  const likeRange = await table
    .select(['username'])
    .like('username', 'user1%')
    .range('0', '4')
    .list();
  assert(likeRange.length <= 5, `En fazla 5 kayıt dönmeli, dönen: ${likeRange.length}`);
  likeRange.forEach(r => {
    assert(r.username.startsWith('user1'), `username user1 ile başlamalı: ${r.username}`);
  });

  // ── TEST 5: range() + sıralama ──
  console.log('\n🧪 TEST 5: range + desc sıralama');
  const sortedRange = await table
    .select(['username', 'age'])
    .desc('age')
    .range('0', '2')
    .list();
  assert(sortedRange.length === 3, `3 kayıt dönmeli, dönen: ${sortedRange.length}`);

  // ── TEST 6: range() tek taraflı (sadece min) ──
  console.log('\n🧪 TEST 6: range(15, "") — 15. satırdan sona kadar');
  const from15 = await table.select(['username']).range('15', '').list();
  assert(from15.length === 5, `5 kayıt dönmeli (16-20), dönen: ${from15.length}`);

  // ── TEST 7: range() tek taraflı (sadece max) ──
  console.log('\n🧪 TEST 7: range("", 3) — Başlangıçtan 3. satıra kadar');
  const to3 = await table.select(['username']).range('', '3').list();
  assert(to3.length === 4, `4 kayıt dönmeli (0-3), dönen: ${to3.length}`);

  // ── TEST 8: range() aşırı büyük değer ──
  console.log('\n🧪 TEST 8: range(100, 200) — Tablo dışı aralık');
  const outOfRange = await table.select('*').range('100', '200').list();
  assert(outOfRange.length === 0, `0 kayıt dönmeli, dönen: ${outOfRange.length}`);

  // ── TEST 9: clone() ile range taşınması ──
  console.log('\n🧪 TEST 9: clone() ile range condition taşınması');
  const baseQuery = table.select(['username']).range('0', '2');
  const cloned = baseQuery.clone();
  const original = await baseQuery.list();
  const clonedResult = await cloned.list();
  assert(original.length === 3, `Orijinal 3 kayıt dönmeli: ${original.length}`);
  assert(clonedResult.length === 3, `Klon 3 kayıt dönmeli: ${clonedResult.length}`);

  // ── TEST 10: range() sonrası condition temizliği ──
  console.log('\n🧪 TEST 10: list() sonrası range condition temizliği');
  await table.select('*').range('0', '5').list();
  const afterRange = await table.select(['username']).list();
  assert(afterRange.length === 20, `Range temizlenmiş olmalı, 20 kayıt dönmeli: ${afterRange.length}`);

  // ── TEST 11: Sayfalama senaryosu ──
  console.log('\n🧪 TEST 11: Sayfalama (perPage=7, page=2)');
  const perPage = 7;
  const page = 2;
  const start = (page - 1) * perPage;
  const end = start + perPage - 1;
  const pageResults = await table
    .select(['username', 'age'])
    .range(String(start), String(end))
    .list();
  assert(pageResults.length === 7, `7 kayıt dönmeli (sayfa 2), dönen: ${pageResults.length}`);
  assert(pageResults[0]?.username === 'user8', `İlk kayıt user8 olmalı: ${pageResults[0]?.username}`);
  assert(pageResults[6]?.username === 'user14', `Son kayıt user14 olmalı: ${pageResults[6]?.username}`);

  // ── TEST 12: where + range + like + asc kombinasyonu ──
  console.log('\n🧪 TEST 12: where + range + like + asc tam kombinasyon');
  const fullCombo = await table
    .select(['username', 'age', 'city'])
    .where({ city: 'Ankara' })
    .like('username', 'user%')
    .range('0', '1')
    .asc('age')
    .list();
  assert(fullCombo.length <= 2, `En fazla 2 kayıt dönmeli: ${fullCombo.length}`);

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
