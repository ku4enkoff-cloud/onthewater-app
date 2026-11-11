const { verifyToken } = require('./utils/jwt');

/**
 * Realtime-канал: каждый авторизованный клиент сидит в комнате user_<id>.
 * Сообщения отправляются через REST (routes/chats.js), который эмитит событие chat:message в комнаты участников.
 */
module.exports = function (io) {
    io.use((socket, next) => {
        const token = socket.handshake.auth && socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication Error'));
        try {
            socket.user = verifyToken(token);
            next();
        } catch (err) {
            next(new Error('Authentication Error'));
        }
    });

    io.on('connection', (socket) => {
        socket.join(`user_${socket.user.id}`);
    });
};
