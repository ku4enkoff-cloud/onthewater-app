import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobileDir = path.resolve(__dirname, '..');
const storePath = path.join(mobileDir, 'version-codes.json');

const variant = (process.argv[2] || process.env.EXPO_PUBLIC_APP_VARIANT || 'client').trim();
if (!['client', 'owner'].includes(variant)) {
  console.error(`[versionCode] Unknown variant "${variant}". Use "client" or "owner".`);
  process.exit(1);
}

let store = { client: 1, owner: 1 };
if (fs.existsSync(storePath)) {
  try {
    store = { ...store, ...JSON.parse(fs.readFileSync(storePath, 'utf8')) };
  } catch {
    // if corrupted, keep defaults
  }
}

const next = Number(store[variant] || 0) + 1;
store[variant] = next;
fs.writeFileSync(storePath, JSON.stringify(store, null, 2) + '\n', 'utf8');

// Print in a parseable way; npm scripts can pick it up if needed
console.log(`[versionCode] ${variant} -> ${next}`);
