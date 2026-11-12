/**
 * Xcode 15+ запускает скрипты сборки в песочнице (ENABLE_USER_SCRIPT_SANDBOXING).
 * Скрипты CocoaPods (hermes-engine, копирование YandexMapsMobile.xcframework) пишут
 * через rsync вне разрешённых путей → «Sandbox: rsync deny» и PhaseScriptExecution failed.
 * Отключаем песочницу для Pods и для таргетов приложения в post_install Podfile.
 */
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

const MARKER = '# withIosDisableScriptSandboxing';

const SNIPPET = `
    ${MARKER}
    installer.pods_project.targets.each do |t|
      t.build_configurations.each do |c|
        c.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
      end
    end
    installer.aggregate_targets.each do |at|
      at.user_project.native_targets.each do |nt|
        nt.build_configurations.each do |c|
          c.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
        end
      end
      at.user_project.save
    end
`;

function withIosDisableScriptSandboxing(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return config;
      let contents = fs.readFileSync(podfilePath, 'utf8');
      if (contents.includes(MARKER)) return config;

      const anchor = /post_install do \|installer\|\n/;
      if (anchor.test(contents)) {
        contents = contents.replace(anchor, (m) => `${m}${SNIPPET}`);
      } else {
        contents += `\npost_install do |installer|\n${SNIPPET}\nend\n`;
      }
      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
}

module.exports = withIosDisableScriptSandboxing;
