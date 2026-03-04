const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

/** Макс. ширина изображения, качество WebP */
const MAX_WIDTH = 1920;
const WEBP_QUALITY = 82;

/**
 * Сжимает все загруженные фото, конвертирует в WebP и присваивает уникальное имя.
 * Удаляет оригиналы и обновляет file.path / file.filename.
 */
function processUploadedImages(req, res, next) {
    const files = req.files || [];
    if (files.length === 0) return next();

    (async () => {
        for (const file of files) {
            // S3: file.location есть, локального path нет — пропускаем
            if (file.location) continue;

            const inputPath = file.path || (file.destination && file.filename
                ? path.join(file.destination, file.filename)
                : null);
            if (!inputPath || !fs.existsSync(inputPath)) continue;

            const dir = path.dirname(inputPath);
            const uniqueName = `${uuidv4()}.webp`;
            const outputPath = path.join(dir, uniqueName);

            try {
                await sharp(inputPath)
                    .resize(MAX_WIDTH, null, { withoutEnlargement: true })
                    .webp({ quality: WEBP_QUALITY })
                    .toFile(outputPath);
                fs.unlinkSync(inputPath);
                file.path = outputPath;
                file.filename = uniqueName;
            } catch (err) {
                console.error('[imageProcessor] Ошибка WebP:', file.originalname, err.message, err.stack);
            }
        }
        next();
    })().catch(next);
}

module.exports = { processUploadedImages };
