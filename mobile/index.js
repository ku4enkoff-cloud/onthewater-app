// Точка входа: загружаем приложение клиента или владельца и регистрируем в Expo
import { registerRootComponent } from 'expo';

const variant = process.env.EXPO_PUBLIC_APP_VARIANT || 'client';
const App = variant === 'owner' ? require('./App.owner').default : require('./App.client').default;
registerRootComponent(App);
