#!/usr/bin/env node
/**
 * Генерация превью для уже загруженных фото в uploads/.
 * Запуск: cd backend && node scripts/generate-thumbnails.js
 * Опции: --force — пересоздать существующие превью
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { thumbFilenameFromFull } = require('../src/utils/photoUrls');
const { THUMB_WIDTH, THUMB_QUALITY } = require('../src/middleware/imageProcessor');

const uploadsDir = path.join(__dirname, '../uploads');
const force = process.argv.includes('--force');

async function generateThumb(fullPath, thumbPath) {
    await sharp(fullPath)
        .resize(THUMB_WIDTH, null, { withoutEnlargement: true })
        .webp({ quality: THUMB_QUALITY })
        .toFile(thumbPath);
}

async function run() {
    if (!fs.existsSync(uploadsDir)) {
        console.log('Папка uploads не найдена:', uploadsDir);
        return;
    }

    const entries = fs.readdirSync(uploadsDir);
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const name of entries) {
        const thumbName = thumbFilenameFromFull(name);
        if (!thumbName) continue;

        const fullPath = path.join(uploadsDir, name);
        const thumbPath = path.join(uploadsDir, thumbName);

        if (!fs.statSync(fullPath).isFile()) continue;
        if (fs.existsSync(thumbPath) && !force) {
            skipped += 1;
            continue;
        }

        try {
            await generateThumb(fullPath, thumbPath);
            created += 1;
            console.log('OK', thumbName);
        } catch (err) {
            failed += 1;
            console.warn('FAIL', name, err.message);
        }
    }

    console.log(`Готово: создано ${created}, пропущено ${skipped}, ошибок ${failed}`);
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
