/** Общий доступ к Socket.IO из роутов и сервисов (io создаётся в index.js). */
let ioInstance = null;

function setIO(io) {
    ioInstance = io;
}

function emitToUser(userId, event, payload) {
    if (!ioInstance || userId == null) return;
    try {
        ioInstance.to(`user_${userId}`).emit(event, payload);
    } catch (_) {}
}

module.exports = { setIO, emitToUser };
