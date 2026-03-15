require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
// За Nginx: доверять X-Forwarded-For (иначе express-rate-limit падает с ERR_ERL_UNEXPECTED_X_FORWARDED_FOR)
app.set('trust proxy', 1);
const httpServer = createServer(app);

if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined in .env');
    process.exit(1);
}

const io = new Server(httpServer, { cors: { origin: '*' } });

try {
    const { createAdapter } = require('@socket.io/redis-adapter');
    const redis = require('./redis');
    const pubClient = redis;
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Redis adapter for Socket.IO подключен');
} catch (err) {
    console.warn('Redis недоступен. Socket.IO работает в режиме одного экземпляра.');
}

try {
    require('./chat')(io);
} catch (_) {}

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(helmet());
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : null;
app.use(cors(allowedOrigins ? { origin: allowedOrigins } : {}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

const { apiLimiter } = require('./middleware/rateLimiter');
app.use(apiLimiter);

app.get('/', (req, res) => res.json({
    name: 'BoatRent API',
    status: 'ok',
    version: '1.0',
    docs: 'See /health, /auth, /boats, /bookings, /chats, /owner',
}));
app.get('/health', (req, res) => res.json({ ok: true }));

// Прокси подсказок городов Yandex Geosuggest (обход 403 при ограничении по Referer в мобильном приложении)
const YANDEX_SUGGEST_API_KEY = (process.env.YANDEX_GEO_SUGGEST_API_KEY || '').trim();
app.get('/suggest', async (req, res) => {
    const text = (req.query.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Missing text' });
    if (!YANDEX_SUGGEST_API_KEY) return res.status(503).json({ error: 'Geosuggest not configured' });
    try {
        const params = new URLSearchParams({
            apikey: YANDEX_SUGGEST_API_KEY,
            text,
            types: 'country,province,locality',
            lang: 'ru',
            results: '10',
        });
        const r = await fetch(`https://suggest-maps.yandex.ru/v1/suggest?${params.toString()}`);
        const data = await r.json().catch(() => ({}));
        if (!r.ok) return res.status(r.status).json(data || { error: 'Yandex error' });
        res.json(data);
    } catch (e) {
        console.warn('[suggest]', e?.message || e);
        res.status(502).json({ error: 'Suggest unavailable' });
    }
});

const authRoutes = require('./routes/auth');
const boatRoutes = require('./routes/boats');
const chatRoutes = require('./routes/chats');
const bookingRoutes = require('./routes/bookings');
const ownerRoutes = require('./routes/owner');
const adminRoutes = require('./routes/admin');
const boatTypesRoutes = require('./routes/boatTypes');
const destinationsRoutes = require('./routes/destinations');
const amenitiesRoutes = require('./routes/amenities');

app.use('/auth', authRoutes);
app.use('/boats', boatRoutes);
app.use('/chats', chatRoutes);
app.use('/bookings', bookingRoutes);
app.use('/owner', ownerRoutes);
app.use('/admin', adminRoutes);
app.use('/boat-types', boatTypesRoutes);
app.use('/destinations', destinationsRoutes);
app.use('/amenities', amenitiesRoutes);

app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', path: req.path, hint: 'Use / or /health, /auth, /boats, etc.' });
});

app.use((err, req, res, next) => {
    console.error('[Global Error]', err.stack);
    const showDetail = process.env.NODE_ENV !== 'production' || process.env.EXPOSE_ERROR_DETAIL === '1';
    const detail = showDetail && err.message ? err.message : null;
    res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        ...(detail && { detail }),
    });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

function tryListen(port, maxAttempts = 3) {
    if (port - PORT >= maxAttempts) {
        console.error(`Не удалось запустить сервер. Порты ${PORT}-${port - 1} заняты.`);
        process.exit(1);
    }
    const server = httpServer.listen(port, HOST, () => {
        console.log(`BoatRent API: http://localhost:${port}`);
        if (HOST === '0.0.0.0') {
            console.log('Доступен в сети. Для телефона используйте в .env адрес: http://IP_ЭТОГО_ПК:' + port);
        }
        if (port !== PORT) {
            console.warn(`Порт ${PORT} занят, использован порт ${port}.`);
        }
    });
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            tryListen(port + 1, maxAttempts);
        } else {
            throw err;
        }
    });
}

tryListen(PORT);
