import { ZeroDB, PermissionManager } from '../src';
import * as fs from 'fs';
import * as path from 'path';

const testDir = path.join(__dirname, 'test_databases_new', 'mid_scale_test');

async function cleanup() {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

async function runTests() {
  await cleanup();
  console.log('=== ZeroDB Mid-Scale Comprehensive Test ===\n');

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
  const db = new ZeroDB(testDir, 128);
  db.createDatabase('shop_db', { isPublic: false, owner: ['admin'] });
  (db as any).dbManager.addUser('shop_db', 'admin', 'admin123', PermissionManager.all(), true);
  (db as any).dbManager.addUser('shop_db', 'editor', 'editor123', 15, false);  // CRUD + CREATE
  (db as any).dbManager.addUser('shop_db', 'viewer', 'viewer123', 4, false);   // LIST only
  db.clearCache();
  await db.login('shop_db', 'admin', 'admin123');
  console.log('  ✅ Kurulum tamamlandı\n');

  // ── TEST 1: Tablo Oluşturma ──
  console.log('🧪 TEST 1: Tablo Oluşturma (Field Options)');
  const products = db.createTable('products', [
    { name: 'id', type: 'auto', option: { isAuto: true } },
    { name: 'name', type: 'string', option: { maxLength: 100, allowNull: false } },
    { name: 'price', type: 'number', option: { allowNull: false } },
    { name: 'category', type: 'string', option: { defaultValue: 'general' } },
    { name: 'in_stock', type: 'boolean', option: { defaultValue: '1' } },
  ]);
  test('products tablosu oluşturuldu', !!products);

  const orders = db.createTable('orders', [
    { name: 'id', type: 'auto', option: { isAuto: true } },
    { name: 'product_name', type: 'string', option: { maxLength: 100 } },
    { name: 'quantity', type: 'number' },
    { name: 'status', type: 'string', option: { defaultValue: 'pending' } },
  ]);
  test('orders tablosu oluşturuldu', !!orders);

  // ── TEST 2: CREATE — Tekil Ekleme ──
  console.log('\n🧪 TEST 2: CREATE — Tekil Kayıt Ekleme');
  const pTable = db.table('products');
  const line1 = await pTable.add({ name: 'Laptop', price: '15000', category: 'electronics', in_stock: '1' });
  test('Laptop eklendi', line1 > 0, `line: ${line1}`);

  const line2 = await pTable.add({ name: 'Phone', price: '8000', category: 'electronics', in_stock: '1' });
  test('Phone eklendi', line2 > 0, `line: ${line2}`);

  const line3 = await pTable.add({ name: 'Book', price: '50', category: 'education', in_stock: '1' });
  test('Book eklendi', line3 > 0, `line: ${line3}`);

  // ── TEST 3: CREATE — Toplu Ekleme ──
  console.log('\n🧪 TEST 3: CREATE — Toplu Kayıt Ekleme (addBatch)');
  const batchResult = await pTable.addBatch([
    { name: 'Tablet', price: '5000', category: 'electronics', in_stock: '1' },
    { name: 'Notebook', price: '30', category: 'education', in_stock: '0' },
    { name: 'Headphones', price: '1200', category: 'electronics', in_stock: '1' },
    { name: 'Mouse', price: '300', category: 'accessories', in_stock: '1' },
    { name: 'Keyboard', price: '800', category: 'accessories', in_stock: '1' },
    { name: 'Monitor', price: '7000', category: 'electronics', in_stock: '1' },
    { name: 'Desk', price: '3000', category: 'furniture', in_stock: '0' },
    { name: 'Chair', price: '2500', category: 'furniture', in_stock: '1' },
  ]);
  test('Toplu ekleme başarılı', batchResult.success, `eklenen: ${batchResult.lineNumbers.length}`);

  // ── TEST 4: READ — select(*) Performans ──
  console.log('\n🧪 TEST 4: READ — select(*)');
  const all = await pTable.select('*').list();
  test('Tüm kayıtlar getirildi', all.length === 11, `toplam: ${all.length}`);

  // ── TEST 5: READ — select(fields) Performans ──
  console.log('\n🧪 TEST 5: READ — select(fields)');
  const partial = await pTable.select(['name', 'price']).list();
  test('Kısmi seçim başarılı', partial.length === 11, `kayıt: ${partial.length}`);
  test('Sadece seçilen alanlar var', !!(partial[0].name && partial[0].price && !partial[0].category), '');

  // ── TEST 6: READ — where() ──
  console.log('\n🧪 TEST 6: READ — where()');
  const electronics = await pTable.select(['name', 'price']).where({ category: 'electronics' }).list();
  test('Elektronik ürünler', electronics.length === 5, `bulunan: ${electronics.length}`);

  const multiWhere = await pTable.select(['name']).where({ category: 'electronics', in_stock: '1' }).list();
  test('Çoklu where (AND)', multiWhere.length === 5, `bulunan: ${multiWhere.length}`);

  // ── TEST 7: READ — like() ──
  console.log('\n🧪 TEST 7: READ — like()');
  const startsWithM = await pTable.select(['name']).like('name', 'M%').list();
  test('LIKE M% (M ile başlayan)', startsWithM.length === 2, `bulunan: ${startsWithM.map(r => r.name).join(', ')}`);

  const containsO = await pTable.select(['name']).like('name', '%o%').list();
  test('LIKE %o% (içinde o geçen)', containsO.length >= 3, `bulunan: ${containsO.map(r => r.name).join(', ')}`);

  // ── TEST 8: READ — range() ──
  console.log('\n🧪 TEST 8: READ — range()');
  const first5 = await pTable.select(['name']).range('0', '4').list();
  test('range(0,4) — İlk 5 kayıt', first5.length === 5, `bulunan: ${first5.length}`);

  const midRange = await pTable.select(['name']).range('5', '9').list();
  test('range(5,9) — Orta dilim', midRange.length === 5, `bulunan: ${midRange.length}`);

  const outRange = await pTable.select('*').range('100', '200').list();
  test('range(100,200) — Tablo dışı', outRange.length === 0, `bulunan: ${outRange.length}`);

  // ── TEST 9: READ — range() kötü kullanım ──
  console.log('\n🧪 TEST 9: READ — range() kötü kullanım');
  const negRange = await pTable.select('*').range('-1', '5').list();
  test('range(-1,5) — Negatif min → default(1,1)', negRange.length === 1, `bulunan: ${negRange.length}`);

  const nanRange = await pTable.select('*').range('abc', '10').list();
  test('range("abc",10) — NaN → default(1,1)', nanRange.length === 1, `bulunan: ${nanRange.length}`);

  const bigRange = await pTable.select('*').range('0', '99999999').list();
  test('range(0,99999999) — Çok büyük → sınırlandırıldı', bigRange.length === 11, `bulunan: ${bigRange.length}`);

  // ── TEST 10: READ — range + where + like kombinasyonu ──
  console.log('\n🧪 TEST 10: READ — range + where + like kombinasyonu');
  const combo = await pTable
    .select(['name', 'price', 'category'])
    .where({ in_stock: '1' })
    .like('name', '%o%')
    .range('0', '2')
    .list();
  test('where + like + range kombinasyonu', combo.length <= 3, `bulunan: ${combo.length}`);

  // ── TEST 11: READ — asc/desc sıralama ──
  console.log('\n🧪 TEST 11: READ — asc/desc sıralama');
  const ascPrice = await pTable.select(['name', 'price']).asc('price').list();
  test('asc(price) — Artan fiyat', Number(ascPrice[0]?.price) <= Number(ascPrice[ascPrice.length - 1]?.price), '');

  const descName = await pTable.select(['name']).desc('name').list();
  test('desc(name) — Azalan isim', descName.length === 11, `sıralı: ${descName.map(r => r.name).join(', ')}`);

  // ── TEST 12: READ — count() ve first() ──
  console.log('\n🧪 TEST 12: READ — count() ve first()');
  const count = await pTable.count();
  test('count()', count === 11, `toplam: ${count}`);

  const first = await pTable.select(['name']).first();
  test('first()', first !== null && first.name === 'Laptop', `ilk: ${first?.name}`);

  // ── TEST 13: UPDATE ──
  console.log('\n🧪 TEST 13: UPDATE');
  const updated = await pTable.where({ name: 'Book' }).update({ price: '45', in_stock: '0' });
  test('Tek kayıt güncelleme', updated === 1, `güncellenen: ${updated}`);

  const bulkUpdate = await pTable.where({ category: 'accessories' }).update({ in_stock: '0' });
  test('Çoklu güncelleme', bulkUpdate === 2, `güncellenen: ${bulkUpdate}`);

  // created_at korunur, updated_at güncellenir
  const updatedRecord = await pTable.select('*').where({ name: 'Book' }).first();
  test('updated_at güncellendi', updatedRecord?.updated_at !== undefined, '');

  // ── TEST 14: DELETE ──
  console.log('\n🧪 TEST 14: DELETE');
  const deleted = await pTable.where({ name: 'Desk' }).delete();
  test('Tek kayıt silme', deleted === 1, `silinen: ${deleted}`);

  const afterDelete = await pTable.count();
  test('Silme sonrası count', afterDelete === 10, `kalan: ${afterDelete}`);

  // ── TEST 15: Sayfalama Senaryosu ──
  console.log('\n🧪 TEST 15: Sayfalama (range ile pagination)');
  const perPage = 4;
  const page1 = await pTable.select(['name', 'price']).range('0', '3').list();
  test('Sayfa 1 (0-3)', page1.length === 4, `kayıt: ${page1.length}`);

  const page2 = await pTable.select(['name', 'price']).range('4', '7').list();
  test('Sayfa 2 (4-7)', page2.length === 4, `kayıt: ${page2.length}`);

  const page3 = await pTable.select(['name', 'price']).range('8', '11').list();
  test('Sayfa 3 (8-11)', page3.length === 2, `kayıt: ${page3.length}`);

  // ── TEST 16: Yetki Kontrolü ──
  console.log('\n🧪 TEST 16: Yetki Kontrolü');
  const viewerDb = new ZeroDB(testDir, 64, {
    db: 'shop_db',
    auth: { user: 'viewer', pass: 'viewer123' },
  });
  const viewerTable = viewerDb.table('products');
  try {
    await viewerTable.select('*').list();
    test('Viewer okuma yapabilir', true);
  } catch {
    test('Viewer okuma yapabilir', false);
  }

  try {
    await viewerTable.add({ name: 'test', price: '100' });
    test('Viewer yazamaz', false);
  } catch {
    test('Viewer yazamaz (permission denied)', true);
  }

  // ── TEST 17: clone() ──
  console.log('\n🧪 TEST 17: clone()');
  const baseQuery = pTable.select(['name', 'price']).where({ in_stock: '1' }).range('0', '2');
  const cloned = baseQuery.clone();
  const originalResult = await baseQuery.list();
  const clonedResult = await cloned.list();
  test('clone() aynı sonuçları döner', originalResult.length === clonedResult.length, `orijinal: ${originalResult.length}, klon: ${clonedResult.length}`);

  // ── TEST 18: Tablo Yönetimi ──
  console.log('\n🧪 TEST 18: Tablo Yönetimi');
  const tables = db.getTables('shop_db');
  test('Tablolar listelendi', tables.length === 2, `tablolar: ${tables.join(', ')}`);

  db.renameTable('orders', 'customer_orders');
  const renamedTables = db.getTables('shop_db');
  test('Tablo yeniden adlandırıldı', renamedTables.includes('customer_orders'), '');

  // ── TEST 19: Database Info ──
  console.log('\n🧪 TEST 19: Database Info');
  const dbInfo = (db as any).dbManager.getDatabaseInfo('shop_db');
  test('Database info alındı', dbInfo && dbInfo.name === 'shop_db', '');
  test('Owner listesi doğru', dbInfo.owner.includes('admin'), '');

  // ── TEST 20: setPublic / addOwner ──
  console.log('\n🧪 TEST 20: setPublic / addOwner');
  await (db as any).dbManager.setPublic('shop_db', true);
  const infoAfterPublic = (db as any).dbManager.getDatabaseInfo('shop_db');
  test('setPublic(true)', infoAfterPublic.isPublic === true, '');

  await (db as any).dbManager.addOwner('shop_db', 'editor');
  const infoAfterOwner = (db as any).dbManager.getDatabaseInfo('shop_db');
  test('addOwner(editor)', infoAfterOwner.owner.includes('editor'), '');

  // ── TEST 21: Grand User Farklı DB Geçişi ──
  console.log('\n🧪 TEST 21: Grand User — Farklı DB Geçişi');
  db.createDatabase('secret_db', { isPublic: false, owner: ['admin'] });
  (db as any).dbManager.addUser('secret_db', 'admin', 'admin123', 127, true);
  const useResult = db.useDatabase('secret_db');
  test('Grand user farklı DB\'ye geçti', useResult, '');

  const backResult = db.useDatabase('shop_db');
  test('Grand user geri döndü', backResult, '');

  // ── TEST 22: Boş Tablo İşlemleri ──
  console.log('\n🧪 TEST 22: Boş Tablo İşlemleri');
  const emptyTable = db.table('customer_orders');
  const emptyList = await emptyTable.select('*').list();
  test('Boş tablo list()', emptyList.length === 0, '');

  const emptyCount = await emptyTable.count();
  test('Boş tablo count()', emptyCount === 0, '');

  const emptyFirst = await emptyTable.first();
  test('Boş tablo first()', emptyFirst === null, '');

  // ── TEST 23: Güvenlik — where olmadan update/delete ──
  console.log('\n🧪 TEST 23: Güvenlik — where olmadan update/delete');
  try {
    await pTable.update({ price: '0' });
    test('where olmadan update hata verir', false);
  } catch {
    test('where olmadan update hata verir', true);
  }

  try {
    await pTable.delete();
    test('where olmadan delete hata verir', false);
  } catch {
    test('where olmadan delete hata verir', true);
  }

  // ── ÖZET ──
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
