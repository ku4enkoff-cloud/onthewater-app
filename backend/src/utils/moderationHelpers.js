const { pool } = require('../db');

async function getBlockedUserIdsFor(userId) {
    const { rows } = await pool.query(
        `SELECT blocked_user_id AS id FROM user_blocks WHERE blocker_id = $1
         UNION
         SELECT blocker_id AS id FROM user_blocks WHERE blocked_user_id = $1`,
        [userId]
    );
    return rows.map((r) => r.id);
}

async function isBlockedBetween(userIdA, userIdB) {
    if (!userIdA || !userIdB || userIdA === userIdB) return false;
    const { rows } = await pool.query(
        `SELECT 1 FROM user_blocks
         WHERE (blocker_id = $1 AND blocked_user_id = $2)
            OR (blocker_id = $2 AND blocked_user_id = $1)
         LIMIT 1`,
        [userIdA, userIdB]
    );
    return rows.length > 0;
}

async function createReport({
    reporterId,
    reportedUserId,
    contentType,
    contentId,
    reason,
    details,
}) {
    const { rows } = await pool.query(
        `INSERT INTO content_reports
            (reporter_id, reported_user_id, content_type, content_id, reason, details, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'open')
         RETURNING *`,
        [
            reporterId,
            reportedUserId,
            contentType,
            contentId ?? null,
            reason,
            details ? String(details).trim().slice(0, 2000) : null,
        ]
    );
    return rows[0];
}

module.exports = {
    getBlockedUserIdsFor,
    isBlockedBetween,
    createReport,
};
