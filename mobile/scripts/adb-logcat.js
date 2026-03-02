#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let adbPath = 'adb';
const args = ['logcat', '*:S', 'ReactNative:V', 'ReactNativeJS:V', 'Expo:V'];

if (process.platform === 'win32') {
  const localAppData = process.env.LOCALAPPDATA || '';
  const candidates = [
    path.join(localAppData, 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
    path.join(process.env.ANDROID_HOME || '', 'platform-tools', 'adb.exe'),
    path.join(process.env.ANDROID_SDK_ROOT || '', 'platform-tools', 'adb.exe'),
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) {
      adbPath = p;
      break;
    }
  }
  if (adbPath === 'adb') {
    console.error('adb не найден. Добавьте в PATH: %LOCALAPPDATA%\\Android\\Sdk\\platform-tools');
    process.exit(1);
  }
}

const child = spawn(adbPath, args, { stdio: 'inherit' });
child.on('error', (err) => {
  console.error('Ошибка:', err.message);
  process.exit(1);
});
child.on('exit', (code) => process.exit(code ?? 0));
