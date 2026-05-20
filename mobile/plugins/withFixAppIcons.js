/**
 * Один раз за prebuild (локально и EAS) генерирует full-bleed иконки.
 * Отключить: EXPO_SKIP_FIX_APP_ICONS=1
 */
const { withDangerousMod } = require('@expo/config-plugins');
const { execSync } = require('child_process');
const path = require('path');

const MOBILE_ROOT = path.join(__dirname, '..');
const SCRIPT = 'scripts/fix-app-icons.py';

let iconsFixedThisPrebuild = false;

function commandExists(cmd) {
  try {
    execSync(process.platform === 'win32' ? `where ${cmd}` : `command -v ${cmd}`, {
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function hasPillow(pythonBin) {
  try {
    execSync(`${pythonBin} -c "from PIL import Image"`, { cwd: MOBILE_ROOT, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function resolvePython() {
  for (const bin of ['python', 'python3']) {
    if (commandExists(bin)) return bin;
  }
  return null;
}

function ensurePillow(pythonBin) {
  if (hasPillow(pythonBin)) return;
  console.log('[withFixAppIcons] Installing Pillow…');
  execSync(`${pythonBin} -m pip install Pillow --quiet`, {
    cwd: MOBILE_ROOT,
    stdio: 'inherit',
  });
}

function runFixAppIcons() {
  if (process.env.EXPO_SKIP_FIX_APP_ICONS === '1') {
    console.log('[withFixAppIcons] Skipped (EXPO_SKIP_FIX_APP_ICONS=1)');
    return;
  }

  const pythonBin = resolvePython();
  if (!pythonBin) {
    console.warn('[withFixAppIcons] Python not found; app icons were not regenerated.');
    return;
  }

  ensurePillow(pythonBin);
  console.log('[withFixAppIcons] Regenerating full-bleed app icons…');
  execSync(`${pythonBin} ${SCRIPT}`, { cwd: MOBILE_ROOT, stdio: 'inherit' });
}

function runFixAppIconsOnce() {
  if (iconsFixedThisPrebuild) return;
  iconsFixedThisPrebuild = true;
  runFixAppIcons();
}

function withFixAppIcons(config) {
  let next = withDangerousMod(config, [
    'ios',
    async (cfg) => {
      runFixAppIconsOnce();
      return cfg;
    },
  ]);
  next = withDangerousMod(next, [
    'android',
    async (cfg) => {
      runFixAppIconsOnce();
      return cfg;
    },
  ]);
  return next;
}

module.exports = withFixAppIcons;
