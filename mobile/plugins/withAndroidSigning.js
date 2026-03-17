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

    // Релиз всегда подписываем нашим ключом, если есть keystore.properties
    const releaseSigningLine = 'signingConfig rootProject.file("../keystore.properties").exists() ? signingConfigs.release : signingConfigs.debug';
    contents = contents.replace(
      /release\s*\{[\s\S]*?signingConfig\s+signingConfigs\.debug/,
      (m) => m.replace(/signingConfig\s+signingConfigs\.debug/, releaseSigningLine)
    );
    // На случай если в шаблоне нет signingConfig в release — подставляем после "release {"
    if (contents.includes('signingConfigs.release') && !contents.includes(releaseSigningLine)) {
      contents = contents.replace(
        /(buildTypes\s*\{\s*[\s\S]*?release\s*\{\s*)(\n)/,
        '$1\n            ' + releaseSigningLine + '$2'
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withAndroidSigning;
