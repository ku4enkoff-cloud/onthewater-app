const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 10, // ограничение: 10 запросов с одного IP
    message: { error: 'Слишком много попыток входа, пожалуйста, попробуйте позже' },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { authLimiter };
