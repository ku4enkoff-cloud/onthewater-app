import { useEffect, useRef, useCallback } from 'react';
import Constants from 'expo-constants';

function getNotificationsModule() {
    /* В Expo Go (SDK 53+) require('expo-notifications') всё равно инициализирует нативный слой и пишет ERROR в консоль. */
    if (Constants.appOwnership === 'expo') return null;
    try {
        // eslint-disable-next-line global-require
        return require('expo-notifications');
    } catch {
        return null;
    }
}

/**
 * Навигация по нажатию на push: сообщения (type: message) и бронирования (type: booking).
 * Данные с бэкенда: sendPush(..., { type, chatId? }) или { type, bookingId }.
 */
export function usePushNotificationNavigation(navigationRef, { user, navReady }) {
    const handledIdsRef = useRef(new Set());

    const openMessageFromData = useCallback(
        (data) => {
            if (!navigationRef?.isReady?.()) return;
            const raw = data.chatId ?? data.chat_id;
            const chatId = raw != null && raw !== '' ? Number(raw) : NaN;
            if (Number.isFinite(chatId) && chatId > 0) {
                navigationRef.navigate('ChatDetail', { chatId });
            } else {
                navigationRef.navigate('MainTabs', { screen: 'Chat' });
            }
        },
        [navigationRef]
    );

    const openBookingFromData = useCallback(
        (data) => {
            if (!navigationRef?.isReady?.()) return;
            const raw = data.bookingId ?? data.booking_id ?? data.id;
            const bookingId = raw != null && raw !== '' ? Number(raw) : NaN;
            if (Number.isFinite(bookingId) && bookingId > 0) {
                navigationRef.navigate('BookingDetail', { bookingId });
            } else {
                navigationRef.navigate('MainTabs', { screen: 'Bookings' });
            }
        },
        [navigationRef]
    );

    const dispatchFromData = useCallback(
        (data) => {
            if (data.type === 'message') {
                openMessageFromData(data);
            } else if (data.type === 'booking') {
                openBookingFromData(data);
            }
        },
        [openMessageFromData, openBookingFromData]
    );

    const handleResponse = useCallback(
        (response) => {
            if (!user?.id) return;
            if (!navigationRef?.isReady?.()) return;
            const data = response?.notification?.request?.content?.data || {};
            if (data.type !== 'message' && data.type !== 'booking') return;
            const nid = response?.notification?.request?.identifier;
            if (nid && handledIdsRef.current.has(nid)) return;
            if (nid) handledIdsRef.current.add(nid);
            dispatchFromData(data);
        },
        [user?.id, navigationRef, dispatchFromData]
    );

    useEffect(() => {
        const Notifications = getNotificationsModule();
        if (!Notifications) return undefined;
        let subscription;
        try {
            subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
        } catch {
            return undefined;
        }
        return () => subscription?.remove?.();
    }, [handleResponse]);

    useEffect(() => {
        const Notifications = getNotificationsModule();
        if (!Notifications || !user?.id || !navReady) return undefined;

        let cancelled = false;
        (async () => {
            try {
                const initial = await Notifications.getLastNotificationResponseAsync();
                if (cancelled || !initial) return;
                if (!navigationRef.isReady()) return;
                const data = initial.notification?.request?.content?.data || {};
                if (data.type !== 'message' && data.type !== 'booking') return;
                const nid = initial.notification?.request?.identifier;
                if (nid && handledIdsRef.current.has(nid)) return;
                if (nid) handledIdsRef.current.add(nid);
                dispatchFromData(data);
            } catch {
                // ignore
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user?.id, navReady, navigationRef, dispatchFromData]);
}

/** @deprecated используйте usePushNotificationNavigation */
export const useMessagePushNavigation = usePushNotificationNavigation;
