require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

app.get('/', (req, res) => res.json({
    name: 'BoatRent API',
    status: 'ok',
    version: '1.0',
    docs: 'See /health, /auth, /boats, /bookings, /chats, /owner',
}));
app.get('/health', (req, res) => res.json({ ok: true }));

const authRoutes = require('./routes/auth');
const boatRoutes = require('./routes/boats');
const chatRoutes = require('./routes/chats');
const bookingRoutes = require('./routes/bookings');
const ownerRoutes = require('./routes/owner');
const adminRoutes = require('./routes/admin');
const boatTypesRoutes = require('./routes/boatTypes');
const destinationsRoutes = require('./routes/destinations');

app.use('/auth', authRoutes);
app.use('/boats', boatRoutes);
app.use('/chats', chatRoutes);
app.use('/bookings', bookingRoutes);
app.use('/owner', ownerRoutes);
app.use('/admin', adminRoutes);
app.use('/boat-types', boatTypesRoutes);
app.use('/destinations', destinationsRoutes);

app.use((err, req, res, next) => {
    console.error('[Global Error]', err.stack);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

const PORT = process.env.PORT || 3000;

function tryListen(port, maxAttempts = 3) {
    if (port - PORT >= maxAttempts) {
        console.error(`Не удалось запустить сервер. Порты ${PORT}-${port - 1} заняты.`);
        process.exit(1);
    }
    const server = httpServer.listen(port, () => {
        console.log(`BoatRent API запущено на http://localhost:${port}`);
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
