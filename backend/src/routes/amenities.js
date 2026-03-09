const express = require('express');
const { pool } = require('../db');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const { rows } = await pool.query('SELECT id, name, sort_order FROM amenities ORDER BY sort_order ASC, id ASC');
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
