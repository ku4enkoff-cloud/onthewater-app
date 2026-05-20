import Constants from 'expo-constants';

/**
 * client | owner
 * В __DEV__ переменная Metro EXPO_PUBLIC_APP_VARIANT важнее значения из prebuild (extra.appVariant),
 * иначе после prebuild:client:ios + start:owner в Xcode всё равно откроется клиент.
 * В release — только то, что зашито при prebuild / EAS.
 */
export function getAppVariant() {
    const fromEnv =
        typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_APP_VARIANT
            ? String(process.env.EXPO_PUBLIC_APP_VARIANT).trim()
            : '';
    const fromConfig = Constants.expoConfig?.extra?.appVariant;

    if (typeof __DEV__ !== 'undefined' && __DEV__ && fromEnv) {
        return fromEnv;
    }
    return fromConfig || fromEnv || 'client';
}

export function isOwnerApp() {
    return getAppVariant() === 'owner';
}
