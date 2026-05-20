// Точка входа: загружаем приложение клиента или владельца и регистрируем в Expo
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { getAppVariant } from './src/shared/appVariant';

const variant = getAppVariant();
const App = variant === 'owner' ? require('./App.owner').default : require('./App.client').default;
registerRootComponent(App);
