/**
 * Пути превью для фото из /uploads/.
 * Полное: /uploads/{uuid}.webp → превью: /uploads/{uuid}-thumb.webp
 */

const UPLOADS_WEBP_RE = /(\/uploads\/[^?#]+?)(\.webp)$/i;

function isThumbPath(pathOrUrl) {
    const m = String(pathOrUrl || '').match(/\/uploads\/([^?#/]+)\.webp/i);
    return Boolean(m && m[1].endsWith('-thumb'));
}

/**
 * @param {string} pathOrUrl — относительный путь или полный URL
 * @returns {string|null} путь/URL превью или null для внешних/неподдерживаемых
 */
function toThumbStoragePath(pathOrUrl) {
    if (!pathOrUrl || typeof pathOrUrl !== 'string') return null;
    const s = pathOrUrl.trim();
    if (!s || isThumbPath(s)) return null;
    const m = s.match(UPLOADS_WEBP_RE);
    if (!m) return null;
    return `${m[1]}-thumb${m[2]}`;
}

/**
 * Имя файла превью для уже обработанного WebP в uploads/.
 * @param {string} filename — например abc.webp
 * @returns {string|null} abc-thumb.webp
 */
function thumbFilenameFromFull(filename) {
    if (!filename || typeof filename !== 'string') return null;
    const base = filename.trim();
    if (!base.endsWith('.webp') || base.endsWith('-thumb.webp')) return null;
    return base.replace(/\.webp$/i, '-thumb.webp');
}

module.exports = {
    toThumbStoragePath,
    thumbFilenameFromFull,
    isThumbPath,
};
