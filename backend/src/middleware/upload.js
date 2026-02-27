const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Инициализация S3 клиента для Yandex Cloud
const s3 = new S3Client({
    region: process.env.YANDEX_S3_REGION || 'ru-central1',
    endpoint: process.env.YANDEX_S3_ENDPOINT || 'https://storage.yandexcloud.net',
    credentials: {
        accessKeyId: process.env.YANDEX_S3_ACCESS_KEY,
        secretAccessKey: process.env.YANDEX_S3_SECRET_KEY,
    },
});

const upload = multer({
    storage: multerS3({
        s3,
        bucket: process.env.YANDEX_S3_BUCKET,
        // Настраиваем права доступа к файлу
        acl: 'public-read',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            const ext = path.extname(file.originalname);
            const uniqueName = `boats/${uuidv4()}${ext}`;
            cb(null, uniqueName);
        }
    }),
    limits: {
        fileSize: 5 * 1024 * 1024, // Ограничение на размер 5 MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Разрешены только изображения'), false);
        }
    }
});

module.exports = { upload, s3 };
