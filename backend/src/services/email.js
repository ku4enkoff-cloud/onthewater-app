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
  <p style="margin-top: 8px; color: #4B5563; font-size: 13px; word-break: break-all;">
    Если кнопка не открывается, скопируйте ссылку в браузер:<br>
    <a href="${verifyUrl}" style="color: #1B365D;">${verifyUrl}</a>
  </p>
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

/**
 * Отправить письмо с токеном восстановления пароля.
 * @param {string} to
 * @param {string} userName
 * @param {string} token
 */
async function sendPasswordResetEmail(to, userName, token) {
    const subject = 'Восстановление пароля — ONTHEWATER';
    // Для приложения токен будет вводиться вручную. Ссылка может быть опциональной.
    const resetHintUrl = `${APP_URL}/auth/reset-password?token=${encodeURIComponent(token)}`;
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Восстановление пароля</title></head>
<body style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1B365D;">Восстановление пароля</h2>
  <p>Здравствуйте${userName ? ', ' + userName : ''}!</p>
  <p>Мы получили запрос на восстановление пароля для аккаунта ONTHEWATER.</p>
  <p style="margin-top: 12px; color: #111827; font-size: 14px;">
    Токен восстановления (введите его в приложении):
  </p>
  <p style="font-family: monospace; background: #F3F4F6; padding: 12px; border-radius: 10px; word-break: break-all; color: #0D5C5C; margin: 8px 0;">
    ${token}
  </p>
  <p style="margin-top: 10px; color: #4B5563; font-size: 13px;">
    Если кнопка/ссылка не открывается, всё равно используйте токен выше.
  </p>
  <p style="margin-top: 8px; font-size: 13px;">
    ${resetHintUrl
        ? '<a href="' + resetHintUrl + '" style="color: #1B365D; font-weight: bold;">' + resetHintUrl + '</a>'
        : ''}
  </p>
  <p style="margin-top: 14px; color: #888; font-size: 12px;">Ссылка/токен действительны ограниченное время.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="color: #888; font-size: 12px;">ONTHEWATER</p>
</body>
</html>`;
    const text = `Восстановление пароля — ONTHEWATER\n\nТокен восстановления:\n${token}\n\n${
        resetHintUrl ? 'Ссылка подсказки: ' + resetHintUrl + '\n\n' : ''
    }Токен действителен ограниченное время.`;

    try {
        await transporter.sendMail({
            from: FROM,
            to,
            subject,
            text,
            html,
        });
        console.log('[email] Письмо восстановления отправлено на', to);
        return true;
    } catch (err) {
        console.error('[email] Ошибка отправки письма восстановления:', err.message);
        return false;
    }
}

/** Проверить подключение к SMTP (для отладки). Возвращает true или бросает ошибку. */
async function verifyConnection() {
    await transporter.verify();
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, verifyConnection };
