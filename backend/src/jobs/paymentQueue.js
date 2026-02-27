const { Queue, Worker } = require('bullmq');
const redis = require('../redis');
const { pool } = require('../db');

// Инициализация очереди
const paymentQueue = new Queue('PaymentQueue', { connection: redis });

// Воркер, который обрабатывает задачи из очереди
const paymentWorker = new Worker('PaymentQueue', async job => {
    if (job.name === 'cancelUnpaidBooking') {
        const { bookingId } = job.data;
        console.log(`Проверка статуса оплаты для брони ${bookingId}...`);

        const client = await pool.connect();
        try {
            const res = await client.query('SELECT status FROM bookings WHERE id = $1', [bookingId]);
            if (res.rows.length > 0 && res.rows[0].status === 'pending_payment') {
                // Оплата не поступила вовремя, отменяем
                await client.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [bookingId]);
                console.log(`Бронь ${bookingId} отменена по таймауту неоплаты.`);
            }
        } finally {
            client.release();
        }
    }
}, { connection: redis });

paymentWorker.on('failed', (job, err) => {
    console.error(`Ошибка в задаче ${job.id}:`, err);
});

module.exports = paymentQueue;
