import { Platform } from 'react-native';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

/** Обработчик push и Android-канал. Вызывать из App.client / App.owner (не из App.js). */
export function initPushNotifications() {
    if (Platform.OS === 'web' || isExpoGo) return;
    try {
        const Notifications = require('expo-notifications');
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });
        if (Platform.OS === 'android' && Notifications.setNotificationChannelAsync) {
            Notifications.setNotificationChannelAsync('default', {
                name: 'Уведомления',
                importance: Notifications.AndroidImportance?.MAX ?? 5,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#1B365D',
            }).catch(() => {});
        }
    } catch (_) {}
}
