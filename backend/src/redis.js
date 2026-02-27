const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null
});

redis.on('error', (err) => {
    console.error('Redis client error:', err);
});

redis.on('connect', () => {
    console.log('Connected to Redis');
});

module.exports = redis;
