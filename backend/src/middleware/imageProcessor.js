const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { thumbFilenameFromFull } = require('../utils/photoUrls');

/** Макс. ширина полного изображения, качество WebP */
const MAX_WIDTH = 1920;
const WEBP_QUALITY = 82;

/** Превью для списков и карточек */
const THUMB_WIDTH = 400;
const THUMB_QUALITY = 75;

function getAbsoluteInputPath(file) {
    if (file.path && path.isAbsolute(file.path) && fs.existsSync(file.path)) return file.path;
    if (file.path && fs.existsSync(file.path)) return path.resolve(file.path);
    if (file.destination != null && file.filename) {
        const joined = path.join(file.destination, file.filename);
        const absolute = path.isAbsolute(joined) ? joined : path.join(process.cwd(), joined);
        if (fs.existsSync(absolute)) return absolute;
    }
    return null;
}

async function writeThumb(sourcePath, thumbPath) {
    await sharp(sourcePath)
        .resize(THUMB_WIDTH, null, { withoutEnlargement: true })
        .webp({ quality: THUMB_QUALITY })
        .toFile(thumbPath);
}

/**
 * Сжимает все загруженные фото, конвертирует в WebP, создаёт превью.
 * Удаляет оригиналы и обновляет file.path / file.filename.
 */
function processUploadedImages(req, res, next) {
    const filesRaw = req.files || [];
    const files = Array.isArray(filesRaw)
        ? filesRaw
        : Object.values(filesRaw).flat().filter(Boolean);
    if (files.length === 0) return next();

    (async () => {
        for (const file of files) {
            if (file.location) continue;
            if (!String(file.mimetype || '').startsWith('image/')) continue;

            const inputPath = getAbsoluteInputPath(file);
            if (!inputPath) continue;

            const dir = path.dirname(inputPath);
            const uniqueName = `${uuidv4()}.webp`;
            const outputPath = path.join(dir, uniqueName);
            const thumbName = thumbFilenameFromFull(uniqueName);
            const thumbPath = thumbName ? path.join(dir, thumbName) : null;

            let sourceForThumb = inputPath;

            try {
                await sharp(inputPath)
                    .resize(MAX_WIDTH, null, { withoutEnlargement: true })
                    .webp({ quality: WEBP_QUALITY })
                    .toFile(outputPath);
                try { fs.unlinkSync(inputPath); } catch (_) {}
                file.path = outputPath;
                file.filename = uniqueName;
                sourceForThumb = outputPath;
            } catch (err) {
                try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (_) {}
                console.warn('[imageProcessor] WebP пропущен, сохраняем оригинал:', file.originalname, err.message);
            }

            if (thumbPath) {
                try {
                    await writeThumb(sourceForThumb, thumbPath);
                } catch (err) {
                    try { if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath); } catch (_) {}
                    console.warn('[imageProcessor] Превью пропущено:', file.originalname, err.message);
                }
            }
        }
        next();
    })().catch(next);
}

module.exports = { processUploadedImages, writeThumb, THUMB_WIDTH, THUMB_QUALITY };
