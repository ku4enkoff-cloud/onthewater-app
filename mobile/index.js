// Точка входа: загружаем приложение клиента или владельца и регистрируем в Expo
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { getAppVariant, getAppVariantDebugInfo } from './src/shared/appVariant';

const variant = getAppVariant();
if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log('[ONTHEWATER] startup', getAppVariantDebugInfo());
}
const App = variant === 'owner' ? require('./App.owner').default : require('./App.client').default;
registerRootComponent(App);
