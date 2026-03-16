const express = require('express');
const { pool } = require('../db');
const { sendPush } = require('../utils/push');

const router = express.Router();

async function sendBookingStatusPushToClient(bookingId, title, body) {
    try {
        const { rows: bookingRows } = await pool.query('SELECT user_id FROM bookings WHERE id = $1', [bookingId]);
        const userId = bookingRows[0]?.user_id;
        if (!userId) return;
        const { rows } = await pool.query('SELECT push_token FROM users WHERE id = $1', [userId]);
        const token = rows[0]?.push_token;
        if (token) {
            await sendPush(token, title, body, { bookingId, type: 'booking' });
        }
    } catch (_) {}
}

// Webhook от ЮKassa
router.post('/webhook', express.json(), async (req, res, next) => {
    try {
        const event = req.body.event;
        const paymentObj = req.body.object;

        if (!paymentObj || !paymentObj.id) return res.status(400).send('Bad Request');

        // В реальном приложении ТУТ ДОЛЖНА БЫТЬ ПРОВЕРКА ПОДПИСИ ИЛИ IP-АДРЕСА ЮKassa

        // Находим бронирование по idempotency_key или metadata (зависит от того как передали при создании платежа)
        // Допустим, мы положили bookingId в metadata при вызове API ЮKassa.
        const bookingId = paymentObj.metadata?.booking_id;
        if (!bookingId) return res.status(200).send('OK'); // Игнорируем платежи не из нашей системы

        if (event === 'payment.succeeded') {
            await pool.query("UPDATE bookings SET status = 'confirmed' WHERE id = $1", [bookingId]);
            console.log(`Бронь ${bookingId} успешно оплачена.`);
            await sendBookingStatusPushToClient(
                bookingId,
                'Бронирование подтверждено',
                'Ваше бронирование успешно оплачено и подтверждено.'
            );
        } else if (event === 'payment.canceled') {
            await pool.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [bookingId]);
            await sendBookingStatusPushToClient(
                bookingId,
                'Бронирование отменено',
                'Оплата не прошла, бронирование отменено.'
            );
        }

        res.status(200).send('OK');
    } catch (err) {
        console.error('Ошибка Webhook:', err);
        res.status(500).send('Internal Error');
    }
});

module.exports = router;
