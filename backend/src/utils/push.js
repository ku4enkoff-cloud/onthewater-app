/**
 * Expo Push Notifications — отправка уведомлений через Expo Push API.
 * https://docs.expo.dev/push-notifications/sending-notifications/
 */
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Отправить push-уведомление клиенту.
 * @param {string} pushToken - Expo Push Token (ExponentPushToken[...])
 * @param {string} title - заголовок
 * @param {string} body - текст
 * @param {object} [data] - произвольные данные (bookingId, type и т.д.)
 * @returns {Promise<boolean>} - true если отправлено успешно
 */
async function sendPush(pushToken, title, body, data = {}) {
    if (!pushToken || typeof pushToken !== 'string' || !pushToken.includes('ExponentPushToken')) {
        return false;
    }

    const payload = {
        to: pushToken,
        title: title || '',
        body: body || '',
        sound: 'default',
        data: { ...data },
    };

    try {
        const res = await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const json = await res.json().catch(() => ({}));
        if (json.data && json.data.status === 'error') {
            console.warn('[push] Expo error:', json.data.message);
            return false;
        }
        if (!res.ok) {
            console.warn('[push] HTTP', res.status, json);
            return false;
        }
        return true;
    } catch (err) {
        console.error('[push]', err.message);
        return false;
    }
}

module.exports = { sendPush };
