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

function formatBookingDateTime(dt) {
    if (!dt) return 'Не указано';
    const date = new Date(dt);
    if (Number.isNaN(date.getTime())) return String(dt);
    return date.toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function statusLabel(status) {
    const map = {
        pending: 'Ожидает подтверждения',
        confirmed: 'Подтверждено',
        cancelled: 'Отменено',
        completed: 'Завершено',
    };
    return map[String(status || '').toLowerCase()] || String(status || 'Обновлено');
}

/**
 * Уведомление клиенту об изменении статуса бронирования.
 * @param {string} to
 * @param {string} userName
 * @param {{id?: number|string, boat_title?: string, status?: string, start_at?: string|Date, hours?: number|string, total_price?: number|string}} booking
 * @param {string} reason
 */
async function sendBookingStatusEmail(to, userName, booking, reason) {
    if (!to) return false;
    const b = booking || {};
    const subject = `Статус бронирования обновлен — ONTHEWATER`;
    const boatTitle = b.boat_title || 'Катер';
    const bookingId = b.id || '—';
    const dateLabel = formatBookingDateTime(b.start_at);
    const hoursRaw = Number(b.hours);
    const durationMinutes = Number.isFinite(hoursRaw) ? (hoursRaw >= 1 && hoursRaw <= 24 && Number.isInteger(hoursRaw) ? hoursRaw * 60 : hoursRaw) : null;
    const durationText = durationMinutes == null ? '—' : `${durationMinutes} мин`;
    const priceText = b.total_price != null && b.total_price !== '' ? `${Number(b.total_price).toLocaleString('ru-RU')} ₽` : '—';
    const statusText = statusLabel(b.status);
    const addressText = [
        b.location_country,
        b.location_region,
        b.location_city,
        b.location_address,
        b.location_yacht_club,
    ].filter(Boolean).join(', ') || '—';
    const extraReason = reason ? `<p style="margin-top: 0; color: #374151;">${reason}</p>` : '';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Статус бронирования</title></head>
<body style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1B365D;">Обновление статуса бронирования</h2>
  <p>Здравствуйте${userName ? ', ' + userName : ''}!</p>
  <p>Статус вашего бронирования изменился: <strong>${statusText}</strong>.</p>
  ${extraReason}
  <table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px;">
    <tr><td style="padding: 8px 0; color: #6B7280;">Номер брони</td><td style="padding: 8px 0; text-align: right;">${bookingId}</td></tr>
    <tr><td style="padding: 8px 0; color: #6B7280;">Судно</td><td style="padding: 8px 0; text-align: right;">${boatTitle}</td></tr>
    <tr><td style="padding: 8px 0; color: #6B7280;">Дата и время</td><td style="padding: 8px 0; text-align: right;">${dateLabel} (МСК)</td></tr>
    <tr><td style="padding: 8px 0; color: #6B7280;">Адрес стоянки</td><td style="padding: 8px 0; text-align: right;">${addressText}</td></tr>
    <tr><td style="padding: 8px 0; color: #6B7280;">Длительность</td><td style="padding: 8px 0; text-align: right;">${durationText}</td></tr>
    <tr><td style="padding: 8px 0; color: #6B7280;">Стоимость</td><td style="padding: 8px 0; text-align: right;">${priceText}</td></tr>
  </table>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="color: #888; font-size: 12px;">ONTHEWATER</p>
</body>
</html>`;

    const text = `Статус вашего бронирования изменился: ${statusText}.
${reason ? `${reason}\n` : ''}Номер брони: ${bookingId}
Судно: ${boatTitle}
Дата и время (МСК): ${dateLabel}
Адрес стоянки: ${addressText}
Длительность: ${durationText}
Стоимость: ${priceText}`;

    try {
        await transporter.sendMail({
            from: FROM,
            to,
            subject,
            text,
            html,
        });
        console.log('[email] Письмо о статусе бронирования отправлено на', to);
        return true;
    } catch (err) {
        console.error('[email] Ошибка отправки письма о статусе бронирования:', err.message);
        return false;
    }
}

/** Проверить подключение к SMTP (для отладки). Возвращает true или бросает ошибку. */
async function verifyConnection() {
    await transporter.verify();
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendBookingStatusEmail, verifyConnection };
