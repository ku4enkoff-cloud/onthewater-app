const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const { getMainApplication, addMetaDataItemToMainApplication } = require('@expo/config-plugins/build/android/Manifest');

const YANDEX_MAPS_API_KEY_META = 'com.yandex.maps.apikey';
const MAPKIT_INIT_TAG = '@boatrent/yandex-mapkit-init';

function getMapKitApiKey(config) {
  return (config.extra?.yandexMapkitApiKey || '').trim();
}

function escapeNativeString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function patchObjCAppDelegate(contents, apiKey) {
  const key = escapeNativeString(apiKey);
  if (contents.includes(MAPKIT_INIT_TAG)) return contents;

  if (!contents.includes('#import <YandexMapsMobile/YMKMapKitFactory.h>')) {
    if (contents.includes('#import "AppDelegate.h"')) {
      contents = contents.replace(
        '#import "AppDelegate.h"',
        '#import "AppDelegate.h"\n#import <YandexMapsMobile/YMKMapKitFactory.h>'
      );
    } else if (contents.includes('#import <React/RCTBridge.h>')) {
      contents = contents.replace(
        '#import <React/RCTBridge.h>',
        '#import <React/RCTBridge.h>\n#import <YandexMapsMobile/YMKMapKitFactory.h>'
      );
    } else {
      contents = `#import <YandexMapsMobile/YMKMapKitFactory.h>\n${contents}`;
    }
  }

  const block = `
  // ${MAPKIT_INIT_TAG}
  [YMKMapKit setLocale:@"ru_RU"];
  [YMKMapKit setApiKey:@"${key}"];
  [YMKMapKit mapKit];
`;

  if (contents.includes('return [super application:')) {
    return contents.replace('return [super application:', `${block}\n  return [super application:`);
  }
  if (/\s+return YES;/.test(contents)) {
    return contents.replace(/\s+return YES;/, `${block}\n  return YES;`);
  }
  return contents;
}

function patchSwiftAppDelegate(contents, apiKey) {
  const key = escapeNativeString(apiKey);
  if (contents.includes(MAPKIT_INIT_TAG)) {
    return contents.replace(
      'YMKMapKit.setLocale(withLocale: "ru_RU")',
      'YMKMapKit.setLocale("ru_RU")'
    );
  }

  if (!contents.includes('import YandexMapsMobile')) {
    const importAnchor = contents.includes('import Expo') ? 'import Expo' : 'import UIKit';
    contents = contents.replace(importAnchor, `${importAnchor}\nimport YandexMapsMobile`);
  }

  const block = `
    // ${MAPKIT_INIT_TAG}
    YMKMapKit.setLocale("ru_RU")
    YMKMapKit.setApiKey("${key}")
    _ = YMKMapKit.sharedInstance()
`;

  if (contents.includes('return super.application(application, didFinishLaunchingWithOptions: launchOptions)')) {
    return contents.replace(
      'return super.application(application, didFinishLaunchingWithOptions: launchOptions)',
      `${block}\n    return super.application(application, didFinishLaunchingWithOptions: launchOptions)`
    );
  }
  if (contents.includes('return super.application(')) {
    return contents.replace(/return super\.application\(/, `${block}\n    return super.application(`);
  }
  return contents;
}

function patchAppDelegateFile(filePath, apiKey) {
  let contents = fs.readFileSync(filePath, 'utf8');
  const isSwift = filePath.endsWith('.swift');
  const next = isSwift ? patchSwiftAppDelegate(contents, apiKey) : patchObjCAppDelegate(contents, apiKey);
  if (next !== contents) {
    fs.writeFileSync(filePath, next);
  }
}

function findAppDelegateFiles(iosRoot) {
  const candidates = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'Pods' || entry.name === 'build') continue;
        walk(full);
        continue;
      }
      if (/^AppDelegate\.(mm|m|swift)$/.test(entry.name)) {
        candidates.push(full);
      }
    }
  };
  walk(iosRoot);
  return candidates;
}

function withYandexMapKitIos(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const apiKey = getMapKitApiKey(cfg);
      if (!apiKey) return cfg;

      const iosRoot = cfg.modRequest.platformProjectRoot;
      const files = findAppDelegateFiles(iosRoot);
      for (const file of files) {
        patchAppDelegateFile(file, apiKey);
      }
      return cfg;
    },
  ]);
}

function withYandexMapKitAndroid(config) {
  return withAndroidManifest(config, (cfg) => {
    const apiKey = getMapKitApiKey(cfg);
    const mainApplication = getMainApplication(cfg.modResults) || cfg.modResults?.manifest?.application?.[0];
    if (!mainApplication) return cfg;
    if (apiKey) {
      addMetaDataItemToMainApplication(mainApplication, YANDEX_MAPS_API_KEY_META, apiKey);
    }
    return cfg;
  });
}

function withYandexMapKitKey(config) {
  config = withYandexMapKitAndroid(config);
  config = withYandexMapKitIos(config);
  return config;
}

module.exports = withYandexMapKitKey;
