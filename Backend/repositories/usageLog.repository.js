import db from '../db.js';

const usageLogRepository = {
    async insert({ apiKeyId, endpoint, method, statusCode }) {
        await db.query(
            `INSERT INTO api_usage_logs (api_key_id, endpoint, method, status_code)
             VALUES (?, ?, ?, ?)`,
            [apiKeyId, endpoint.slice(0, 255), method, statusCode]
        );
    },

    async findRecentByKey(apiKeyId, limit) {
        const [rows] = await db.query(
            `SELECT id, endpoint, method, status_code AS statusCode, requested_at AS requestedAt
               FROM api_usage_logs
              WHERE api_key_id = ?
              ORDER BY id DESC
              LIMIT ?`,
            [apiKeyId, limit]
        );
        return rows;
    },

    async countByStatus(apiKeyId) {
        const [rows] = await db.query(
            `SELECT status_code AS statusCode, COUNT(*) AS count
               FROM api_usage_logs
              WHERE api_key_id = ?
              GROUP BY status_code
              ORDER BY status_code`,
            [apiKeyId]
        );
        return rows;
    }
};

export default usageLogRepository;
