const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

let storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + ext);
    },
});

if (process.env.YANDEX_S3_BUCKET && process.env.YANDEX_S3_ACCESS_KEY) {
    try {
        const multerS3 = require('multer-s3');
        const { S3Client } = require('@aws-sdk/client-s3');
        const { v4: uuidv4 } = require('uuid');
        const s3 = new S3Client({
            region: process.env.YANDEX_S3_REGION || 'ru-central1',
            endpoint: process.env.YANDEX_S3_ENDPOINT || 'https://storage.yandexcloud.net',
            credentials: {
                accessKeyId: process.env.YANDEX_S3_ACCESS_KEY,
                secretAccessKey: process.env.YANDEX_S3_SECRET_KEY,
            },
        });
        storage = multerS3({
            s3,
            bucket: process.env.YANDEX_S3_BUCKET,
            acl: 'public-read',
            contentType: multerS3.AUTO_CONTENT_TYPE,
            metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
            key: (req, file, cb) => {
                const ext = path.extname(file.originalname);
                cb(null, `boats/${uuidv4()}${ext}`);
            },
        });
    } catch (_) {}
}

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Разрешены только изображения'), false);
    },
});

module.exports = { upload, uploadsDir };
