import { NativeModules, TurboModuleRegistry } from 'react-native';

/** react-native-yamap-plus регистрирует TurboModule RTNYamapModule (не NativeModules.yamap). */
export const isYamapNativeAvailable =
  NativeModules.RTNYamapModule != null ||
  (typeof TurboModuleRegistry !== 'undefined' && TurboModuleRegistry.get('RTNYamapModule') != null);
