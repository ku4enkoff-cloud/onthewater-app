const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    connectionTimeout: parseInt(process.env.SMTP_CONNECTION_TIMEOUT, 10) || 20000,
    greetingTimeout: 10000,
});

const FROM = process.env.MAIL_FROM || process.env.SMTP_USER || 'noreply@onthewater.ru';
const APP_URL = process.env.APP_URL || process.env.API_URL || 'https://api.onthewater.ru';

/**
 * Отправить письмо с ссылкой для подтверждения email.
 * @param {string} to - email получателя
 * @param {string} userName - имя пользователя
 * @param {string} token - токен подтверждения
 */
async function sendVerificationEmail(to, userName, token) {
    const verifyUrl = `${APP_URL}/auth/verify-email?token=${encodeURIComponent(token)}`;
    const subject = 'Подтвердите ваш email — ONTHEWATER';
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Подтверждение email</title></head>
<body style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1B365D;">Подтверждение регистрации</h2>
  <p>Здравствуйте${userName ? ', ' + userName : ''}!</p>
  <p>Вы зарегистрировались в приложении ONTHEWATER. Для активации аккаунта перейдите по ссылке:</p>
  <p><a href="${verifyUrl}" style="color: #1B365D; font-weight: bold;">Подтвердить email</a></p>
  <p>Ссылка действительна 24 часа.</p>
  <p>Если вы не регистрировались — проигнорируйте это письмо.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="color: #888; font-size: 12px;">ONTHEWATER</p>
</body>
</html>`;
    const text = `Подтвердите регистрацию: ${verifyUrl}\n\nСсылка действительна 24 часа.`;

    try {
        await transporter.sendMail({
            from: FROM,
            to,
            subject,
            text,
            html,
        });
        console.log('[email] Письмо подтверждения отправлено на', to);
        return true;
    } catch (err) {
        const detail = err.response || err.responseCode || err.code || '';
        console.error('[email] Ошибка отправки письма:', err.message, detail ? String(detail) : '');
        if (err.response) console.error('[email] Ответ сервера:', err.response);
        return false;
    }
}

/** Проверить подключение к SMTP (для отладки). Возвращает true или бросает ошибку. */
async function verifyConnection() {
    await transporter.verify();
}

module.exports = { sendVerificationEmail, verifyConnection };
