import db from '../db.js';

const healthRepository = {
    async pingDatabase() {
        const [rows] = await db.query('SELECT 1 AS ok');
        return rows[0].ok === 1;
    },

    async getTableCounts() {
        const [rows] = await db.query(
            `SELECT
                (SELECT COUNT(*) FROM students) AS students,
                (SELECT COUNT(*) FROM teachers) AS teachers,
                (SELECT COUNT(*) FROM subjects) AS subjects,
                (SELECT COUNT(*) FROM marks)    AS marks,
                (SELECT COUNT(*) FROM api_keys) AS api_keys`
        );
        return rows[0];
    }
};

export default healthRepository;
