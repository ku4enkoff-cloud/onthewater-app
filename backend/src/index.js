require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const redis = require('./redis');

// Проверка критических переменных
if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined in .env');
    process.exit(1);
}

const app = express();
const httpServer = createServer(app);

// Настройка Socket.IO с Redis адаптером
const io = new Server(httpServer, {
    cors: { origin: '*' } // Для MVP разрешаем всё, в проде нужно ограничить
});
const pubClient = redis;
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));

// Инициализация событий чата
require('./chat')(io);

// Базовые мидлвары
app.use(helmet());
app.use(cors());
app.use(express.json());

// Роуты
app.get('/', (req, res) => res.json({
    name: 'BoatRent API',
    status: 'ok',
    version: '1.0',
    docs: 'See /health, /auth, /boats, /bookings, /chat, /payments',
}));
app.get('/health', (req, res) => res.json({ ok: true }));

// Подключение роутов
const authRoutes = require('./routes/auth');
const boatRoutes = require('./routes/boats');
const chatRoutes = require('./routes/chat');
const bookingRoutes = require('./routes/bookings');
const paymentRoutes = require('./routes/payments');

app.use('/auth', authRoutes);
app.use('/boats', boatRoutes);
app.use('/chat', chatRoutes);
app.use('/bookings', bookingRoutes);
app.use('/payments', paymentRoutes);

// Глобальный Error Handler
app.use((err, req, res, next) => {
    console.error('[Global Error]', err.stack);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

const PORT = process.env.PORT || 3000;

function tryListen(port, maxAttempts = 3) {
    if (port - PORT >= maxAttempts) {
        console.error(`Не удалось запустить сервер. Порты ${PORT}-${port - 1} заняты.`);
        console.error('Освободите порт: на Windows выполните netstat -ano | findstr :3000 затем taskkill /PID <номер> /F');
        process.exit(1);
    }
    const server = httpServer.listen(port, () => {
        console.log(`BoatRent API запущено на http://localhost:${port}`);
        if (port !== PORT) {
            console.warn(`Порт ${PORT} был занят, использован порт ${port}. В .env задайте PORT=${port} или освободите ${PORT}.`);
        }
    });
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`Порт ${port} занят, пробуем ${port + 1}...`);
            tryListen(port + 1, maxAttempts);
        } else {
            throw err;
        }
    });
}

tryListen(PORT);
