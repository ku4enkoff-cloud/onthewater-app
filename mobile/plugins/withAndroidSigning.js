const { withAppBuildGradle } = require('@expo/config-plugins');

const RELEASE_SIGNING_CONFIG = `
        release {
            def keystorePropsFile = rootProject.file("../keystore.properties")
            if (keystorePropsFile.exists()) {
                def keystoreProps = new Properties()
                keystoreProps.load(new FileInputStream(keystorePropsFile))
                def storeFileName = keystoreProps["storeFile"] != null ? keystoreProps["storeFile"].trim() : ""
                if (storeFileName) {
                    def keystoreDir = keystorePropsFile.getParentFile()
                    def storeFileObj = new File(keystoreDir, storeFileName)
                    if (!storeFileObj.exists()) {
                        throw new GradleException("Release keystore not found: " + storeFileObj.getAbsolutePath() + " (check mobile/keystore.properties and that " + storeFileName + " is in mobile/)")
                    }
                    storeFile storeFileObj
                    storePassword keystoreProps["storePassword"]
                    keyAlias keystoreProps["keyAlias"]
                    keyPassword keystoreProps["keyPassword"]
                }
            }
        }
`;

function withAndroidSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Добавить release в signingConfigs (если ещё нет)
    if (!contents.includes('signingConfigs.release')) {
      // Заменить debug block закрывающую скобку на добавление release + }
      contents = contents.replace(
        /(signingConfigs \{\s+debug \{[^}]+}\s+)\}/,
        `$1${RELEASE_SIGNING_CONFIG}    }`
      );
    }

    // ВАЖНО: для релиза всегда используем release keystore, для debug — debug keystore.
    // Не используем условные signingConfig, иначе Play периодически получает debug-подпись.
    const debugSigningLine = 'signingConfig signingConfigs.debug';
    const releaseSigningLine = 'signingConfig signingConfigs.release';

    // 1) Попытаться заменить существующие signingConfig внутри buildTypes/debug и buildTypes/release
    contents = contents.replace(
      /(buildTypes\s*\{[\s\S]*?\bdebug\s*\{[\s\S]*?)\bsigningConfig\s+[^\n\r]+/m,
      `$1${debugSigningLine}`
    );
    contents = contents.replace(
      /(buildTypes\s*\{[\s\S]*?\brelease\s*\{[\s\S]*?)\bsigningConfig\s+[^\n\r]+/m,
      `$1${releaseSigningLine}`
    );

    // 2) Если строки signingConfig не было — вставить сразу после "debug {" / "release {"
    if (!new RegExp(`buildTypes\\s*\\{[\\s\\S]*?\\bdebug\\s*\\{[\\s\\S]*?\\b${debugSigningLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(contents)) {
      contents = contents.replace(
        /(buildTypes\s*\{[\s\S]*?\bdebug\s*\{\s*\n)/,
        `$1            ${debugSigningLine}\n`
      );
    }
    if (!new RegExp(`buildTypes\\s*\\{[\\s\\S]*?\\brelease\\s*\\{[\\s\\S]*?\\b${releaseSigningLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(contents)) {
      contents = contents.replace(
        /(buildTypes\s*\{[\s\S]*?\brelease\s*\{\s*\n)/,
        `$1            ${releaseSigningLine}\n`
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withAndroidSigning;
