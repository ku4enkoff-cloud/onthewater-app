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
 * @returns {Promise<{ok: boolean, error?: string, details?: object}>}
 */
async function sendPush(pushToken, title, body, data = {}) {
    if (!pushToken || typeof pushToken !== 'string' || !pushToken.includes('ExponentPushToken')) {
        return { ok: false, error: 'Invalid push token' };
    }

    const payload = {
        to: pushToken,
        title: title || '',
        body: body || '',
        sound: 'default',
        data: { ...data },
        priority: 'high',
        channelId: 'default',
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
        const ticket = Array.isArray(json.data) ? json.data[0] : json.data;
        if (ticket && ticket.status === 'error') {
            const msg = ticket.message || ticket.details?.error || 'unknown';
            console.warn('[push] Expo ticket error:', msg, ticket.details);
            return { ok: false, error: msg, details: ticket.details };
        }
        if (json.errors && json.errors.length) {
            const err = json.errors[0];
            const msg = err.message || err.code || 'request failed';
            console.warn('[push] Expo request error:', msg, json.errors);
            return { ok: false, error: msg };
        }
        if (!res.ok) {
            console.warn('[push] HTTP', res.status, json);
            return { ok: false, error: `HTTP ${res.status}` };
        }
        return { ok: true };
    } catch (err) {
        console.error('[push]', err.message);
        return { ok: false, error: err.message };
    }
}

module.exports = { sendPush };
