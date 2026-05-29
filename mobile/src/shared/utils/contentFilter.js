/** Клиентская проверка текста сообщения (дублирует сервер для мгновенного feedback). */

const BLOCKED_PATTERNS = [
    /\b(сука|бля|бляд|хуй|пизд|ебан|ёбан|ебать|пидор|пидар|мудак|дебил)\w*/iu,
    /\b(fuck|shit|bitch|asshole)\w*/iu,
];

function normalize(text) {
    return String(text || '').trim();
}

export function filterMessageText(text) {
    const t = normalize(text);
    if (!t) return { ok: false, error: 'Сообщение не может быть пустым' };
    if (t.length > 4000) return { ok: false, error: 'Сообщение слишком длинное' };
    if (BLOCKED_PATTERNS.some((re) => re.test(t))) {
        return { ok: false, error: 'Сообщение содержит недопустимые выражения' };
    }
    const urls = t.match(/(?:https?:\/\/|www\.)[^\s]+/gi);
    if (urls && urls.length >= 3) {
        return { ok: false, error: 'Сообщение похоже на спам' };
    }
    return { ok: true };
}
