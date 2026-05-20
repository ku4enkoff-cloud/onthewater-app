#!/usr/bin/env node
/**
 * Проверяет, что ios/ сгенерирован под owner (ru.onthewater.owner), а не под client.
 * Запуск: node scripts/verify-ios-bundle-id.mjs [owner|client]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.join(__dirname, '..');
const iosDir = path.join(mobileRoot, 'ios');
const expected = (process.argv[2] || 'owner').trim() === 'owner' ? 'owner' : 'client';

const EXPECTED = {
  owner: 'ru.onthewater.owner',
  client: 'ru.onthewater.client',
};

function findPbxproj(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) out.push(...findPbxproj(full));
    else if (name.name.endsWith('.pbxproj')) out.push(full);
  }
  return out;
}

function extractBundleIds(pbxContent) {
  const ids = new Set();
  const re = /PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g;
  let m;
  while ((m = re.exec(pbxContent)) !== null) {
    ids.add(m[1].trim().replace(/"/g, ''));
  }
  return [...ids];
}

if (!fs.existsSync(iosDir)) {
  console.error('Папка mobile/ios не найдена. Сначала выполните:');
  console.error(
    expected === 'owner'
      ? '  npm run prebuild:owner:ios'
      : '  npm run prebuild:client:ios'
  );
  process.exit(1);
}

const pbxFiles = findPbxproj(iosDir);
if (!pbxFiles.length) {
  console.error('Не найден .pbxproj в mobile/ios');
  process.exit(1);
}

const allIds = new Set();
for (const file of pbxFiles) {
  extractBundleIds(fs.readFileSync(file, 'utf8')).forEach((id) => allIds.add(id));
}

const want = EXPECTED[expected];
const ids = [...allIds].filter((id) => !id.includes('org.reactjs') && !id.startsWith('com.facebook'));

console.log('Ожидается Bundle ID:', want);
console.log('Найдено в Xcode-проекте:', ids.length ? ids.join(', ') : '(нет)');

const ok = ids.includes(want);
if (!ok) {
  console.error('\n❌ ios/ собран НЕ под', expected);
  console.error('Выполните на Mac:');
  console.error('  cd mobile');
  console.error(
    expected === 'owner'
      ? '  npm run prebuild:owner:ios'
      : '  npm run prebuild:client:ios'
  );
  console.error('  cd ios && pod install');
  process.exit(1);
}

console.log('\n✓ Bundle ID в ios/ совпадает с', expected);
