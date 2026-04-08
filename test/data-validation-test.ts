import { ZeroDB, PermissionManager } from '../src';
import * as fs from 'fs';
import * as path from 'path';

const testDir = path.join(__dirname, 'test_databases_new', 'validation_test');

async function cleanup() {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

async function runTests() {
  await cleanup();
  console.log('=== ZeroDB Data Validation Test ===\n');

  let passed = 0;
  let failed = 0;

  function test(name: string, result: boolean, detail?: string) {
    if (result) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else {
      console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
      failed++;
    }
  }

  // ── SETUP ──
  console.log('📦 Veritabanı kurulumu...');
  const db = new ZeroDB(testDir, 64);
  db.createDatabase('validation_db', { isPublic: false, owner: ['admin'] });
  (db as any).dbManager.addUser('validation_db', 'admin', 'admin123', PermissionManager.all(), true);
  db.clearCache();
  await db.login('validation_db', 'admin', 'admin123');
  console.log('  ✅ Kurulum tamamlandı\n');

  // ── Tablo Oluştur ──
  console.log('📋 Validasyon tablosu oluşturuluyor...');
  db.createTable('validated', [
    { name: 'id', type: 'auto', option: { isAuto: true } },
    { name: 'username', type: 'string', option: { maxLength: 20, allowNull: false } },
    { name: 'age', type: 'number', option: { allowNull: false } },
    { name: 'score', type: 'number', option: { allowNull: true, defaultValue: '0' } },
    { name: 'is_active', type: 'boolean', option: { defaultValue: '1' } },
    { name: 'bio', type: 'string', option: { maxLength: 100, allowNull: true, defaultValue: 'N/A' } },
  ]);

  const table = db.table('validated');

  // ══════════════════════════════════════════════════════
  // BÖLÜM 1: VERİ TİPİ DOĞRULAMA
  // ══════════════════════════════════════════════════════
  console.log('\n🧪 BÖLÜM 1: Veri Tipi Doğrulama');

  // TEST 1: number alanına metin → hata
  console.log('\n--- number alanına metin girişi ---');
  try {
    const r = await table.add({ username: 'test1', age: 'abc' });
    test('number alanına metin reddedilmeli', false, `kabul edildi, line: ${r}`);
  } catch (e: any) {
    test('number alanına metin reddedilmeli', e.message.includes('number'), e.message);
  }

  // TEST 2: number alanına boşluk/özel karakter
  console.log('\n--- number alanına özel karakter ---');
  try {
    const r = await table.add({ username: 'test2', age: '!@#$' });
    test('number alanına özel karakter reddedilmeli', false, `kabul edildi, line: ${r}`);
  } catch (e: any) {
    test('number alanına özel karakter reddedilmeli', e.message.includes('number'), e.message);
  }

  // TEST 3: number alanına geçerli sayı
  console.log('\n--- number alanına geçerli sayı ---');
  try {
    const r = await table.add({ username: 'test3', age: '25' });
    test('number alanına geçerli sayı kabul edilmeli', r > 0, `line: ${r}`);
  } catch (e: any) {
    test('number alanına geçerli sayı kabul edilmeli', false, e.message);
  }

  // TEST 4: number alanına ondalıklı sayı
  console.log('\n--- number alanına ondalıklı sayı ---');
  try {
    const r = await table.add({ username: 'test4', age: '3.14' });
    test('number alanına ondalıklı sayı kabul edilmeli', r > 0, `line: ${r}`);
  } catch (e: any) {
    test('number alanına ondalıklı sayı kabul edilmeli', false, e.message);
  }

  // TEST 5: number alanına negatif sayı
  console.log('\n--- number alanına negatif sayı ---');
  try {
    const r = await table.add({ username: 'test5', age: '-10' });
    test('number alanına negatif sayı kabul edilmeli', r > 0, `line: ${r}`);
  } catch (e: any) {
    test('number alanına negatif sayı kabul edilmeli', false, e.message);
  }

  // TEST 6: number alanına 0
  console.log('\n--- number alanına 0 ---');
  try {
    const r = await table.add({ username: 'test6', age: '0' });
    test('number alanına 0 kabul edilmeli', r > 0, `line: ${r}`);
  } catch (e: any) {
    test('number alanına 0 kabul edilmeli', false, e.message);
  }

  // ══════════════════════════════════════════════════════
  // BÖLÜM 2: BOOLEAN DOĞRULAMA
  // ══════════════════════════════════════════════════════
  console.log('\n🧪 BÖLÜM 2: Boolean Doğrulama');

  // TEST 7: boolean alanına geçerli değerler
  console.log('\n--- boolean geçerli değerler ---');
  const boolTests = [
    { val: 'true', expected: true },
    { val: 'false', expected: true },
    { val: '1', expected: true },
    { val: '0', expected: true },
  ];
  for (const bt of boolTests) {
    try {
      const r = await table.add({ username: `bool_${bt.val}`, age: '20', is_active: bt.val });
      test(`boolean "${bt.val}" kabul edilmeli`, r > 0, `line: ${r}`);
    } catch (e: any) {
      test(`boolean "${bt.val}" kabul edilmeli`, false, e.message);
    }
  }

  // TEST 8: boolean alanına geçersiz değer
  console.log('\n--- boolean geçersiz değerler ---');
  const invalidBools = ['yes', 'no', '2', '-1', 'TRUE', 'FALSE'];
  for (const ib of invalidBools) {
    try {
      const r = await table.add({ username: `bad_bool_${ib}`, age: '20', is_active: ib });
      test(`boolean "${ib}" reddedilmeli`, false, `kabul edildi, line: ${r}`);
    } catch (e: any) {
      test(`boolean "${ib}" reddedilmeli`, e.message.includes('boolean'), e.message);
    }
  }

  // ══════════════════════════════════════════════════════
  // BÖLÜM 3: maxLength DOĞRULAMA
  // ══════════════════════════════════════════════════════
  console.log('\n🧪 BÖLÜM 3: maxLength Doğrulama');

  // TEST 9: maxLength sınırı tam
  console.log('\n--- maxLength tam sınır ---');
  try {
    const exact20 = 'a'.repeat(20);
    const r = await table.add({ username: exact20, age: '20' });
    test('maxLength tam sınır kabul edilmeli (20 char)', r > 0, `line: ${r}`);
  } catch (e: any) {
    test('maxLength tam sınır kabul edilmeli (20 char)', false, e.message);
  }

  // TEST 10: maxLength aşımı
  console.log('\n--- maxLength aşımı ---');
  try {
    const over20 = 'a'.repeat(21);
    const r = await table.add({ username: over20, age: '20' });
    test('maxLength aşımı reddedilmeli (21 char)', false, `kabul edildi, line: ${r}`);
  } catch (e: any) {
    test('maxLength aşımı reddedilmeli (21 char)', e.message.includes('max length'), e.message);
  }

  // TEST 11: bio maxLength (100) tam sınır
  console.log('\n--- bio maxLength tam sınır (100) ---');
  try {
    const exact100 = 'b'.repeat(100);
    const r = await table.add({ username: 'bio_test', age: '20', bio: exact100 });
    test('bio maxLength tam sınır kabul edilmeli (100 char)', r > 0, `line: ${r}`);
  } catch (e: any) {
    test('bio maxLength tam sınır kabul edilmeli (100 char)', false, e.message);
  }

  // TEST 12: bio maxLength (100) aşımı
  console.log('\n--- bio maxLength aşımı (101) ---');
  try {
    const over100 = 'b'.repeat(101);
    const r = await table.add({ username: 'bio_over', age: '20', bio: over100 });
    test('bio maxLength aşımı reddedilmeli (101 char)', false, `kabul edildi, line: ${r}`);
  } catch (e: any) {
    test('bio maxLength aşımı reddedilmeli (101 char)', e.message.includes('max length'), e.message);
  }

  // ══════════════════════════════════════════════════════
  // BÖLÜM 4: allowNull DOĞRULAMA
  // ══════════════════════════════════════════════════════
  console.log('\n🧪 BÖLÜM 4: allowNull Doğrulama');

  // TEST 13: allowNull: false alanına boş değer
  console.log('\n--- allowNull: false alanına boş ---');
  try {
    const r = await table.add({ username: '', age: '20' });
    test('allowNull: false boş reddedilmeli (username)', false, `kabul edildi, line: ${r}`);
  } catch (e: any) {
    test('allowNull: false boş reddedilmeli (username)', e.message.includes('cannot be null') || e.message.includes('cannot be null'), e.message);
  }

  // TEST 14: allowNull: false alanına undefined
  console.log('\n--- allowNull: false alanına undefined ---');
  try {
    const r = await table.add({ age: '20' });
    test('allowNull: false undefined reddedilmeli (username)', false, `kabul edildi, line: ${r}`);
  } catch (e: any) {
    test('allowNull: false undefined reddedilmeli (username)', e.message.includes('cannot be null'), e.message);
  }

  // TEST 15: allowNull: false alanına boşluk
  console.log('\n--- allowNull: false alanına sadece boşluk ---');
  try {
    const r = await table.add({ username: '   ', age: '20' });
    test('allowNull: false sadece boşluk reddedilmeli', false, `kabul edildi, line: ${r}`);
  } catch (e: any) {
    test('allowNull: false sadece boşluk reddedilmeli', e.message.includes('cannot be null'), e.message);
  }

  // TEST 16: allowNull: true alanına boş → defaultValue
  console.log('\n--- allowNull: true alanına boş → defaultValue ---');
  try {
    const r = await table.add({ username: 'default_test', age: '20', score: '' });
    test('allowNull: true boş → defaultValue kullanılmalı', r > 0, `line: ${r}`);
    if (r > 0) {
      const record = await table.select(['score']).where({ username: 'default_test' }).first();
      test('score defaultValue "0" atanmalı', record?.score === '0', `score: "${record?.score}"`);
    }
  } catch (e: any) {
    test('allowNull: true boş → defaultValue kullanılmalı', false, e.message);
  }

  // TEST 17: allowNull: true alanına hiç değer girilmeme → defaultValue
  console.log('\n--- allowNull: true alanına hiç değer girilmeme ---');
  try {
    const r = await table.add({ username: 'no_score', age: '20' });
    test('alan hiç girilmese de defaultValue kullanılmalı', r > 0, `line: ${r}`);
    if (r > 0) {
      const record = await table.select(['score', 'bio', 'is_active']).where({ username: 'no_score' }).first();
      test('score defaultValue "0"', record?.score === '0', `score: "${record?.score}"`);
      test('bio defaultValue "N/A"', record?.bio === 'N/A', `bio: "${record?.bio}"`);
      test('is_active defaultValue "1"', record?.is_active === '1', `is_active: "${record?.is_active}"`);
    }
  } catch (e: any) {
    test('alan hiç girilmese de defaultValue kullanılmalı', false, e.message);
  }

  // ══════════════════════════════════════════════════════
  // BÖLÜM 5: BİLİNMEYEN ALAN
  // ══════════════════════════════════════════════════════
  console.log('\n🧪 BÖLÜM 5: Bilinmeyen Alan');

  // TEST 18: Tanımlanmamış alan
  console.log('\n--- Tanımlanmamış alan ---');
  try {
    const r = await table.add({ username: 'unknown_field', age: '20', unknown_col: 'value' });
    test('Bilinmeyen alan reddedilmeli', false, `kabul edildi, line: ${r}`);
  } catch (e: any) {
    test('Bilinmeyen alan reddedilmeli', e.message.includes('Unknown field'), e.message);
  }

  // ══════════════════════════════════════════════════════
  // BÖLÜM 6: TOPLU EKLEMEDE DOĞRULAMA
  // ══════════════════════════════════════════════════════
  console.log('\n🧪 BÖLÜM 6: Toplu Eklemede Doğrulama');

  // TEST 19: addBatch — karışık geçerli/geçersiz
  console.log('\n--- addBatch karışık veri ---');
  const batchResult = await table.addBatch([
    { username: 'batch_valid1', age: '25' },
    { username: 'batch_valid2', age: '30' },
    { username: 'batch_invalid', age: 'not_a_number' },
    { username: 'batch_valid3', age: '35' },
  ]);
  test('addBatch kısmen başarılı olmalı', batchResult.lineNumbers.length === 3, `başarılı: ${batchResult.lineNumbers.length}, hatalar: ${batchResult.errors.length}`);
  test('addBatch hata içermeli', batchResult.errors.length > 0, `hata sayısı: ${batchResult.errors.length}`);

  // ══════════════════════════════════════════════════════
  // BÖLÜM 7: UPDATE DOĞRULAMA
  // ══════════════════════════════════════════════════════
  console.log('\n🧪 BÖLÜM 7: Update Doğrulama');

  // TEST 20: update — number alanına metin
  console.log('\n--- update number alanına metin ---');
  try {
    const u = await table.where({ username: 'test3' }).update({ age: 'abc' });
    test('update number alanına metin reddedilmeli', false, `kabul edildi: ${u}`);
  } catch (e: any) {
    test('update number alanına metin reddedilmeli', e.message.includes('number'), e.message);
  }

  // TEST 21: update — maxLength aşımı
  console.log('\n--- update maxLength aşımı ---');
  try {
    const longName = 'x'.repeat(25);
    const u = await table.where({ username: 'test3' }).update({ username: longName });
    test('update maxLength aşımı reddedilmeli', false, `kabul edildi: ${u}`);
  } catch (e: any) {
    test('update maxLength aşımı reddedilmeli', e.message.includes('max length'), e.message);
  }

  // TEST 22: update — boolean geçersiz
  console.log('\n--- update boolean geçersiz ---');
  try {
    const u = await table.where({ username: 'test3' }).update({ is_active: 'maybe' });
    test('update boolean geçersiz reddedilmeli', false, `kabul edildi: ${u}`);
  } catch (e: any) {
    test('update boolean geçersiz reddedilmeli', e.message.includes('boolean'), e.message);
  }

  // TEST 23: update — geçerli
  console.log('\n--- update geçerli ---');
  try {
    const u = await table.where({ username: 'test3' }).update({ age: '30', is_active: '0' });
    test('update geçerli veri kabul edilmeli', u > 0, `güncellenen: ${u}`);
  } catch (e: any) {
    test('update geçerli veri kabul edilmeli', false, e.message);
  }

  // ══════════════════════════════════════════════════════
  // BÖLÜM 8: VERİ BÜTÜNLÜĞÜ — Diskten Okuma
  // ══════════════════════════════════════════════════════
  console.log('\n🧪 BÖLÜM 8: Veri Bütünlüğü — Diskten Okuma');

  // TEST 24: Cache temizle ve yeniden oku
  console.log('\n--- Cache temizleme ve yeniden okuma ---');
  db.clearCache();
  const freshTable = db.table('validated');
  const allRecords = await freshTable.select(['username', 'age', 'score', 'is_active', 'bio']).list();
  test('Cache temizlendikten sonra tüm kayıtlar okunabilmeli', allRecords.length > 0, `toplam: ${allRecords.length}`);

  // TEST 25: Her kaydın age alanı sayısal olmalı
  console.log('\n--- Tüm age değerleri sayısal ---');
  let allAgesNumeric = true;
  for (const rec of allRecords) {
    if (rec.age !== undefined && isNaN(Number(rec.age))) {
      allAgesNumeric = false;
      break;
    }
  }
  test('Tüm age değerleri sayısal olmalı', allAgesNumeric, '');

  // TEST 26: Her kaydın is_active 0 veya 1 olmalı
  console.log('\n--- Tüm is_active değerleri 0/1 ---');
  let allBoolsValid = true;
  for (const rec of allRecords) {
    if (rec.is_active !== undefined && rec.is_active !== '0' && rec.is_active !== '1') {
      allBoolsValid = false;
      break;
    }
  }
  test('Tüm is_active değerleri 0 veya 1 olmalı', allBoolsValid, '');

  // TEST 27: Hiçbir username 20 karakteri geçmemeli
  console.log('\n--- Tüm username uzunlukları ≤ 20 ---');
  let allUsernamesValid = true;
  for (const rec of allRecords) {
    if (rec.username && rec.username.length > 20) {
      allUsernamesValid = false;
      break;
    }
  }
  test('Tüm username uzunlukları ≤ 20 olmalı', allUsernamesValid, '');

  // ══════════════════════════════════════════════════════
  // BÖLÜM 9: SINIR DEĞERLER
  // ══════════════════════════════════════════════════════
  console.log('\n🧪 BÖLÜM 9: Sınır Değerler');

  // TEST 28: Çok büyük sayı
  console.log('\n--- Çok büyük sayı ---');
  try {
    const r = await table.add({ username: 'big_num', age: '999999999999999' });
    test('Çok büyük sayı kabul edilmeli', r > 0, `line: ${r}`);
  } catch (e: any) {
    test('Çok büyük sayı kabul edilmeli', false, e.message);
  }

  // TEST 29: Unicode karakterler
  console.log('\n--- Unicode username ---');
  try {
    const r = await table.add({ username: '用户', age: '20' });
    test('Unicode username kabul edilmeli', r > 0, `line: ${r}`);
  } catch (e: any) {
    test('Unicode username kabul edilmeli', false, e.message);
  }

  // TEST 30: Özel karakterler (string alanda)
  console.log('\n--- Özel karakterler ---');
  try {
    const r = await table.add({ username: 'test@#$%^&*()', age: '20' });
    test('Özel karakterli username kabul edilmeli', r > 0, `line: ${r}`);
  } catch (e: any) {
    test('Özel karakterli username kabul edilmeli', false, e.message);
  }

  // ══════════════════════════════════════════════════════
  // ÖZET
  // ══════════════════════════════════════════════════════
  console.log('\n' + '='.repeat(55));
  console.log(`📊 TEST SONUÇLARI: ${passed} geçti, ${failed} başarısız, ${passed + failed} toplam`);
  console.log('='.repeat(55));

  // Temizlik
  db.logout();
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('❌ Test hatası:', e);
  process.exit(1);
});
