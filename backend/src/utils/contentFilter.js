/** Простая фильтрация UGC в сообщениях (RU/EN). Не заменяет модерацию человеком. */

const BLOCKED_PATTERNS = [
    /\b(сука|бля|бляд|хуй|пизд|ебан|ёбан|ебать|пидор|пидар|мудак|дебил)\w*/iu,
    /\b(fuck|shit|bitch|asshole)\w*/iu,
];

const SPAM_PATTERNS = [
    /(?:https?:\/\/|www\.)[^\s]+/gi,
    /\b(?:t\.me|telegram\.me)\b/i,
];

function normalize(text) {
    return String(text || '').trim();
}

function containsBlockedWord(text) {
    const t = normalize(text);
    if (!t) return false;
    return BLOCKED_PATTERNS.some((re) => re.test(t));
}

function looksLikeSpam(text) {
    const t = normalize(text);
    if (!t) return false;
    const urls = t.match(SPAM_PATTERNS[0]);
    if (urls && urls.length >= 3) return true;
    if (SPAM_PATTERNS[1].test(t) && urls && urls.length >= 1) return true;
    return false;
}

/**
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
function validateMessageText(text) {
    const t = normalize(text);
    if (!t) return { ok: false, error: 'Сообщение не может быть пустым' };
    if (t.length > 4000) return { ok: false, error: 'Сообщение слишком длинное' };
    if (containsBlockedWord(t)) {
        return { ok: false, error: 'Сообщение содержит недопустимые выражения' };
    }
    if (looksLikeSpam(t)) {
        return { ok: false, error: 'Сообщение похоже на спам' };
    }
    return { ok: true };
}

module.exports = {
    validateMessageText,
    containsBlockedWord,
};
