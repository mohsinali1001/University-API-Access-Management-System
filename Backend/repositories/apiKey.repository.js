import db from '../db.js';

// One SELECT used everywhere an admin sees a key (camelCase for the JSON API)
const KEY_SELECT = `
    SELECT k.id,
           k.key_value                                  AS keyValue,
           k.owner_type                                 AS ownerType,
           COALESCE(k.student_id, k.teacher_id)         AS ownerId,
           COALESCE(s.name, t.name)                     AS ownerName,
           k.request_limit                              AS requestLimit,
           k.request_count                              AS requestCount,
           GREATEST(CAST(k.request_limit AS SIGNED) - CAST(k.request_count AS SIGNED), 0) AS remaining,
           k.status,
           k.created_at                                 AS createdAt,
           k.revoked_at                                 AS revokedAt,
           k.last_used_at                               AS lastUsedAt
      FROM api_keys k
      LEFT JOIN students s ON s.id = k.student_id
      LEFT JOIN teachers t ON t.id = k.teacher_id`;

const apiKeyRepository = {
    // ---------------- used by authentication / limiter (Phase 3) ----------------
    async findByKeyValue(keyValue) {
        const [rows] = await db.query(
            `SELECT k.id, k.key_value, k.owner_type, k.student_id, k.teacher_id,
                    k.request_limit, k.request_count, k.status,
                    COALESCE(s.name, t.name) AS owner_name
               FROM api_keys k
               LEFT JOIN students s ON s.id = k.student_id
               LEFT JOIN teachers t ON t.id = k.teacher_id
              WHERE k.key_value = ?
              LIMIT 1`,
            [keyValue]
        );
        return rows[0] || null;
    },

    // ATOMIC: only increments if the key is active and still under its limit.
    async tryConsumeRequest(keyId) {
        const [result] = await db.query(
            `UPDATE api_keys
                SET request_count = request_count + 1, last_used_at = NOW()
              WHERE id = ? AND status = 'active' AND request_count < request_limit`,
            [keyId]
        );
        return result.affectedRows === 1;
    },

    async getUsage(keyId) {
        const [rows] = await db.query(
            'SELECT request_limit, request_count, status FROM api_keys WHERE id = ?',
            [keyId]
        );
        return rows[0] || null;
    },

    // ---------------- admin operations (Phase 4) ----------------
    async findAll({ status, ownerType } = {}) {
        const where = [];
        const params = [];
        if (status)    { where.push('k.status = ?');     params.push(status); }
        if (ownerType) { where.push('k.owner_type = ?'); params.push(ownerType); }
        const [rows] = await db.query(
            `${KEY_SELECT}
             ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
             ORDER BY k.id`,
            params
        );
        return rows;
    },

    async findById(id) {
        const [rows] = await db.query(`${KEY_SELECT} WHERE k.id = ?`, [id]);
        return rows[0] || null;
    },

    async hasActiveKey(ownerType, ownerId) {
        const column = ownerType === 'student' ? 'student_id' : 'teacher_id';
        const [rows] = await db.query(
            `SELECT 1 FROM api_keys WHERE ${column} = ? AND status = 'active' LIMIT 1`,
            [ownerId]
        );
        return rows.length > 0;
    },

    async create({ keyValue, ownerType, ownerId, requestLimit }) {
        const studentId = ownerType === 'student' ? ownerId : null;
        const teacherId = ownerType === 'teacher' ? ownerId : null;
        const [result] = await db.query(
            `INSERT INTO api_keys (key_value, owner_type, student_id, teacher_id, request_limit)
             VALUES (?, ?, ?, ?, ?)`,
            [keyValue, ownerType, studentId, teacherId, requestLimit]
        );
        return result.insertId;
    },

    async updateLimit(id, requestLimit) {
        await db.query('UPDATE api_keys SET request_limit = ? WHERE id = ?', [requestLimit, id]);
    },

    async revoke(id) {
        await db.query(
            "UPDATE api_keys SET status = 'revoked', revoked_at = NOW() WHERE id = ?",
            [id]
        );
    },

    async resetUsage(id) {
        await db.query('UPDATE api_keys SET request_count = 0 WHERE id = ?', [id]);
    }
};

export default apiKeyRepository;
