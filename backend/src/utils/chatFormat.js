/** Форматирование времени последнего сообщения для списков чатов (мобильные клиенты). */
function formatLastMessageAt(at) {
    if (at == null) return { last_message_time: null, last_message_date: null };
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) return { last_message_time: null, last_message_date: null };
    const time = new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(d);
    const date = new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'short',
    }).format(d);
    return { last_message_time: time, last_message_date: date };
}

function attachLastMessageMeta(row) {
    if (!row || typeof row !== 'object') return row;
    const { last_message_at, ...rest } = row;
    const meta = formatLastMessageAt(last_message_at);
    return { ...rest, ...meta, last_message_at };
}

module.exports = { formatLastMessageAt, attachLastMessageMeta };
