const express = require('express');
const { pool } = require('../db');

const router = express.Router();

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
        } else if (event === 'payment.canceled') {
            await pool.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [bookingId]);
        }

        res.status(200).send('OK');
    } catch (err) {
        console.error('Ошибка Webhook:', err);
        res.status(500).send('Internal Error');
    }
});

module.exports = router;
