#!/usr/bin/env node
/**
 * Проверка отправки писем подтверждения email.
 * Использует те же настройки SMTP, что и при регистрации.
 *
 * Запуск (подставь свой email):
 *   cd backend && node scripts/test-email.js your@email.com
 *
 * В .env должны быть заданы: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (и при необходимости SMTP_SECURE, MAIL_FROM, APP_URL).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sendVerificationEmail, verifyConnection } = require('../src/services/email');

const to = process.argv[2] || process.env.SMTP_USER;
if (!to) {
    console.error('Укажите email: node scripts/test-email.js your@email.com');
    process.exit(1);
}

async function run() {
    console.log('SMTP:', process.env.SMTP_HOST || 'smtp.gmail.com', ':', process.env.SMTP_PORT || 587);
    console.log('Подключение к SMTP...');
    try {
        await verifyConnection();
        console.log('Подключение к SMTP успешно.');
    } catch (e) {
        console.error('Ошибка подключения к SMTP:', e.message);
        if (e.code) console.error('Код:', e.code);
        if (e.response) console.error('Ответ:', e.response);
        process.exit(1);
    }
    console.log('Отправка тестового письма на', to, '...');
    const token = 'test-token-' + Date.now();
    const sent = await sendVerificationEmail(to, 'Тестовый пользователь', token);
    if (sent) {
        console.log('Письмо отправлено. Проверьте почту (и папку «Спам»).');
        console.log('Ссылка в письме будет с токеном', token, '— в БД его нет, это только проверка доставки.');
    } else {
        console.error('Ошибка отправки. Проверьте логи выше и настройки SMTP в .env (SMTP_HOST, SMTP_USER, SMTP_PASS).');
        process.exit(1);
    }
}

run();
