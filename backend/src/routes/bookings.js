const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const paymentQueue = require('../jobs/paymentQueue');

const router = express.Router();

// Создание бронирования (клиент)
router.post('/', authenticate, requireRole(['client']), async (req, res, next) => {
    try {
        const { boat_id, date_start, date_end, hours, guests_count, captain_requested, message } = req.body;
        const client_id = req.user.id;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Получаем информацию о катере
            const boatRes = await client.query('SELECT owner_id, price_per_hour, price_per_day FROM boats WHERE id = $1', [boat_id]);
            if (boatRes.rows.length === 0) return res.status(404).json({ error: 'Катер не найден' });
            const boat = boatRes.rows[0];

            // Простейший расчет цены (в реальности сложнее, с учетом дней/часов)
            const total_price = boat.price_per_hour * hours;
            const deposit_amount = total_price * 0.2; // Залог 20%

            // Идемпотентный ключ для ЮKassa
            const idempotencyKey = uuidv4();

            const result = await client.query(`
        INSERT INTO bookings (
          boat_id, client_id, owner_id, date_start, date_end, hours,
          total_price, deposit_amount, status, payment_idempotency_key,
          captain_requested, guests_count, message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending_payment', $9, $10, $11, $12)
        RETURNING *
      `, [boat_id, client_id, boat.owner_id, date_start, date_end, hours, total_price, deposit_amount, idempotencyKey, captain_requested, guests_count, message]);

            const booking = result.rows[0];

            // Добавляем фоновую задачу (через 15 минут отменить, если не оплачено)
            await paymentQueue.add('cancelUnpaidBooking', { bookingId: booking.id }, { delay: 15 * 60 * 1000 });

            await client.query('COMMIT');

            // Здесь мы должны были бы вызвать API ЮKassa для получения URL оплаты, 
            // но для MVP возвращаем фейковый URL.
            res.status(201).json({
                booking,
                payment_url: `https://yoomoney.ru/checkout/payments/v2/contract?orderId=${idempotencyKey}`
            });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (err) {
        next(err);
    }
});

// Получение моих бронирований
router.get('/', authenticate, async (req, res, next) => {
    try {
        const { role, id } = req.user;
        const roleCol = role === 'owner' ? 'owner_id' : 'client_id';

        const result = await pool.query(`
      SELECT b.*, t.title as boat_title, u.name as other_party_name
      FROM bookings b
      JOIN boats t ON b.boat_id = t.id
      JOIN users u ON (CASE WHEN $1 = 'owner' THEN b.client_id ELSE b.owner_id END) = u.id
      WHERE b.${roleCol} = $2
      ORDER BY b.created_at DESC
    `, [role, id]);

        res.json(result.rows);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
