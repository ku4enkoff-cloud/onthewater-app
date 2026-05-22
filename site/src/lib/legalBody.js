export function escapeHtml(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function looksLikeHtml(s) {
  const t = (s || '').trim()
  return t.startsWith('<') && />/.test(t)
}

const EMPTY_MESSAGE =
  '<p>Текст документа пока не заполнен. Его можно добавить в админ-панели (раздел «Документы»).</p>'

/** HTML для вставки в страницу сайта (dangerouslySetInnerHTML). */
export function legalBodyToHtml(body) {
  const raw = (body || '').trim()
  if (!raw) return EMPTY_MESSAGE
  if (looksLikeHtml(raw)) return raw
  return `<div class="legal-page__pre">${escapeHtml(raw)}</div>`
}
