import fs from 'node:fs';
import path from 'node:path';

const mobileDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const androidDir = path.join(mobileDir, 'android');

const defaultSdkDir = path.join(process.env.USERPROFILE || 'C:\\Users\\ku4en', 'AppData', 'Local', 'Android', 'Sdk');
const sdkDirRaw = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || defaultSdkDir;

function escapeForLocalProperties(p) {
  // local.properties читает Java Properties: backslash = escape
  return p.replace(/\\/g, '\\\\');
}

fs.mkdirSync(androidDir, { recursive: true });
const target = path.join(androidDir, 'local.properties');
fs.writeFileSync(target, `sdk.dir=${escapeForLocalProperties(sdkDirRaw)}\n`, 'utf8');
console.log(`[local.properties] written: ${target}`);
console.log(`[local.properties] sdk.dir=${sdkDirRaw}`);

