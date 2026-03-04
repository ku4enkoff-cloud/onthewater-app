const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

/** Макс. ширина изображения, качество WebP */
const MAX_WIDTH = 1920;
const WEBP_QUALITY = 82;

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

/**
 * Сжимает все загруженные фото, конвертирует в WebP и присваивает уникальное имя.
 * Удаляет оригиналы и обновляет file.path / file.filename.
 */
function processUploadedImages(req, res, next) {
    const files = req.files || [];
    if (files.length === 0) return next();

    (async () => {
        for (const file of files) {
            if (file.location) continue;

            const inputPath = getAbsoluteInputPath(file);
            if (!inputPath) continue;

            const dir = path.dirname(inputPath);
            const uniqueName = `${uuidv4()}.webp`;
            const outputPath = path.join(dir, uniqueName);

            try {
                await sharp(inputPath)
                    .resize(MAX_WIDTH, null, { withoutEnlargement: true })
                    .webp({ quality: WEBP_QUALITY })
                    .toFile(outputPath);
                try { fs.unlinkSync(inputPath); } catch (_) {}
                file.path = outputPath;
                file.filename = uniqueName;
            } catch (err) {
                console.error('[imageProcessor] Ошибка WebP:', file.originalname, err.message);
                return next(Object.assign(err, { message: `Ошибка конвертации фото в WebP: ${err.message}` }));
            }
        }
        next();
    })().catch(next);
}

module.exports = { processUploadedImages };
