const { verifyToken } = require('../utils/jwt');

const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Необходимо авторизоваться. Токен отсутствует.' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        req.user = decoded; // Ожидаем { id, role }
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

module.exports = {
    authenticate,
    requireRole,
};
