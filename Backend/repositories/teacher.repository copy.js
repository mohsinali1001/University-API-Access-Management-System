import db from '../db.js';

const teacherRepository = {
    async findAllWithKeyInfo() {
        const [rows] = await db.query(
            `SELECT t.id, t.name, t.email, t.department,
                    (SELECT k.id FROM api_keys k
                      WHERE k.teacher_id = t.id AND k.status = 'active'
                      LIMIT 1) AS activeKeyId
               FROM teachers t
              ORDER BY t.id`
        );
        return rows;
    },

    async exists(id) {
        const [rows] = await db.query('SELECT 1 FROM teachers WHERE id = ?', [id]);
        return rows.length > 0;
    },

    async findById(id) {
        const [rows] = await db.query(
            'SELECT id, name, email, department FROM teachers WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    }
};

export default teacherRepository;
