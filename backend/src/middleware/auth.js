const { verifyToken } = require('../utils/jwt');
const { pool } = require('../db');

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Необходимо авторизоваться. Токен отсутствует.' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        const { rows } = await pool.query(
            'SELECT id, email, name, first_name, last_name, phone, role, birthdate, about, address_line, address_city, address_zip, address_country, avatar, created_at FROM users WHERE id = $1',
            [decoded.id]
        );
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Пользователь не найден.' });
        }

        req.user = rows[0];
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Недействительный или истекший токен.' });
    }
};

const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Доступ запрещен. Недостаточно прав.' });
        }
        next();
    };
};

const adminMiddleware = (req, res, next) => {
    if (req.user && req.user.role === 'admin') return next();
    return res.status(403).json({ error: 'Доступ только для администратора' });
};

const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        const { rows } = await pool.query(
            'SELECT id, email, name, role FROM users WHERE id = $1',
            [decoded.id]
        );
        if (rows.length > 0) req.user = rows[0];
    } catch (_) {}
    next();
};

module.exports = {
    authenticate,
    requireRole,
    adminMiddleware,
    optionalAuth,
};
