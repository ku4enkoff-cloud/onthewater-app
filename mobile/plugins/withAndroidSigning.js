const { withAppBuildGradle } = require('@expo/config-plugins');

const RELEASE_SIGNING_CONFIG = `
        release {
            def keystorePropsFile = rootProject.file("keystore.properties")
            if (keystorePropsFile.exists()) {
                def keystoreProps = new Properties()
                keystoreProps.load(new FileInputStream(keystorePropsFile))
                storeFile rootProject.file(keystoreProps["storeFile"])
                storePassword keystoreProps["storePassword"]
                keyAlias keystoreProps["keyAlias"]
                keyPassword keystoreProps["keyPassword"]
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

    // release buildType должен использовать keystore.properties если есть (вместо debug)
    contents = contents.replace(
      /release \{[\s\S]*?signingConfig signingConfigs\.debug/,
      (m) => m.replace(
        /signingConfig signingConfigs\.debug/,
        'signingConfig file("${rootProject.projectDir}/keystore.properties").exists() ? signingConfigs.release : signingConfigs.debug'
      )
    );

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withAndroidSigning;
