import db from '../db.js';

const studentRepository = {
    // For the admin panel: each student plus the id of their active key (if any)
    async findAllWithKeyInfo() {
        const [rows] = await db.query(
            `SELECT s.id, s.roll_no AS rollNo, s.name, s.email, s.department, s.semester,
                    (SELECT k.id FROM api_keys k
                      WHERE k.student_id = s.id AND k.status = 'active'
                      LIMIT 1) AS activeKeyId
               FROM students s
              ORDER BY s.id`
        );
        return rows;
    },

    async exists(id) {
        const [rows] = await db.query('SELECT 1 FROM students WHERE id = ?', [id]);
        return rows.length > 0;
    }
};

export default studentRepository;
