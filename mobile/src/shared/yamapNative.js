import { NativeModules, TurboModuleRegistry } from 'react-native';
import Constants from 'expo-constants';

/**
 * В Expo Go нет нативного RTNYamapModule; импорт react-native-yamap-plus вызывает
 * TurboModuleRegistry.getEnforcing и синхронно падает — нельзя даже пробовать require.
 */
const inExpoGo = Constants.appOwnership === 'expo';

/** react-native-yamap-plus регистрирует TurboModule RTNYamapModule (не NativeModules.yamap). */
export const isYamapNativeAvailable =
  !inExpoGo &&
  (NativeModules.RTNYamapModule != null ||
    (typeof TurboModuleRegistry !== 'undefined' && TurboModuleRegistry.get('RTNYamapModule') != null));
