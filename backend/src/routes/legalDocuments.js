const express = require('express');
const { pool } = require('../db');

const router = express.Router();

const LEGAL_DOC_SLUGS = ['privacy_policy', 'terms_of_service', 'personal_data_processing'];

async function ensureLegalDocsExist() {
    await pool.query(`
        INSERT INTO legal_documents (slug, title, body) VALUES
        ('privacy_policy', 'Политика конфиденциальности', ''),
        ('terms_of_service', 'Условия обслуживания', ''),
        ('personal_data_processing', 'Условия обработки персональных данных', '')
        ON CONFLICT (slug) DO NOTHING
    `).catch(() => {});
}

/** Публичные тексты для приложения (без авторизации) */
router.get('/', async (req, res, next) => {
    try {
        await ensureLegalDocsExist();
        const { rows } = await pool.query(
            'SELECT slug, title, body, updated_at FROM legal_documents WHERE slug = ANY($1::varchar[])',
            [LEGAL_DOC_SLUGS]
        );
        const bySlug = Object.fromEntries(rows.map((r) => [r.slug, r]));
        const ordered = LEGAL_DOC_SLUGS.map((s) => bySlug[s]).filter(Boolean);
        res.json(ordered);
    } catch (err) {
        if (err.code === '42P01') {
            return res.json([]);
        }
        next(err);
    }
});

router.get('/:slug', async (req, res, next) => {
    try {
        const slug = String(req.params.slug || '');
        if (!LEGAL_DOC_SLUGS.includes(slug)) {
            return res.status(404).json({ error: 'Документ не найден' });
        }
        await ensureLegalDocsExist();
        const { rows } = await pool.query(
            'SELECT slug, title, body, updated_at FROM legal_documents WHERE slug = $1',
            [slug]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Документ не найден' });
        res.json(rows[0]);
    } catch (err) {
        if (err.code === '42P01') {
            return res.status(404).json({ error: 'Документ не найден' });
        }
        next(err);
    }
});

module.exports = router;
