import Constants from 'expo-constants';
import * as Application from 'expo-application';

const OWNER_NATIVE_IDS = new Set([
    'ru.onthewater.owner',
    'com.anonymous.onthewater.owner',
]);

const CLIENT_NATIVE_IDS = new Set([
    'ru.onthewater.client',
    'com.anonymous.onthewater',
]);

/**
 * По реальному Bundle ID / package (то, что собрал Xcode), не по устаревшему extra из prebuild.
 */
function variantFromNativeApplicationId() {
    const id = Application.applicationId;
    if (!id) return null;
    if (OWNER_NATIVE_IDS.has(id)) return 'owner';
    if (CLIENT_NATIVE_IDS.has(id)) return 'client';
    if (id.includes('.owner') || id.endsWith('.owner')) return 'owner';
    return null;
}

/**
 * client | owner — какое приложение открыть (App.client / App.owner).
 */
export function getAppVariant() {
    const fromNative = variantFromNativeApplicationId();
    if (fromNative) return fromNative;

    const fromEnv =
        typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_APP_VARIANT
            ? String(process.env.EXPO_PUBLIC_APP_VARIANT).trim()
            : '';
    if (fromEnv === 'owner' || fromEnv === 'client') return fromEnv;

    const fromConfig = Constants.expoConfig?.extra?.appVariant;
    if (fromConfig === 'owner' || fromConfig === 'client') return fromConfig;

    return 'client';
}

export function isOwnerApp() {
    return getAppVariant() === 'owner';
}

/** Для отладки сборки в Xcode / TestFlight */
export function getAppVariantDebugInfo() {
    return {
        variant: getAppVariant(),
        applicationId: Application.applicationId,
        applicationName: Application.applicationName,
        configAppVariant: Constants.expoConfig?.extra?.appVariant,
        configBundleId: Constants.expoConfig?.ios?.bundleIdentifier,
        configAndroidPackage: Constants.expoConfig?.android?.package,
        metroEnv: typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_APP_VARIANT : undefined,
    };
}
