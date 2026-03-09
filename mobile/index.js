// Точка входа: загружаем приложение клиента или владельца и регистрируем в Expo
import { registerRootComponent } from 'expo';
import Constants from 'expo-constants';

// В release-сборке вариант берём из конфига (задан при prebuild), иначе из env (Metro)
const variant = Constants.expoConfig?.extra?.appVariant
    || process.env.EXPO_PUBLIC_APP_VARIANT
    || 'client';
const App = variant === 'owner' ? require('./App.owner').default : require('./App.client').default;
registerRootComponent(App);
