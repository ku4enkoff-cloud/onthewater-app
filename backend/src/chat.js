const { pool } = require('./db');
const { verifyToken } = require('./utils/jwt');

module.exports = function (io) {
    // Мидлвар аутентификации сокетов
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication Error'));
        try {
            const decoded = verifyToken(token);
            socket.user = decoded; // { id, role }
            next();
        } catch (err) {
            next(new Error('Authentication Error'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`Пользователь ${socket.user.id} подключен к сокету ${socket.id}`);

        // Присоединяемся к персональной "комнате" (channel) на уровне Redis
        socket.join(`user_${socket.user.id}`);

        // Отправка нового сообщения
        socket.on('send_message', async (data, callback) => {
            const { receiver_id, booking_id, text } = data;
            if (!receiver_id || !text) return;

            try {
                const client = await pool.connect();
                try {
                    const result = await client.query(`
            INSERT INTO messages (sender_id, receiver_id, booking_id, text)
            VALUES ($1, $2, $3, $4)
            RETURNING id, sender_id, text, created_at
          `, [socket.user.id, receiver_id, booking_id || null, text]);

                    const msg = result.rows[0];

                    // Отправка получателю через Redis Pub/Sub (Socket.IO автоматически роутит на нужный сервер)
                    io.to(`user_${receiver_id}`).emit('new_message', msg);

                    if (callback) callback({ status: 'ok', data: msg });
                } finally {
                    client.release();
                }
            } catch (err) {
                console.error('Ошибка отправки сообщения:', err);
                if (callback) callback({ status: 'error', message: 'Ошибка БД' });
            }
        });

        socket.on('disconnect', () => {
            console.log(`Пользователь ${socket.user.id} отключен`);
        });
    });
};
