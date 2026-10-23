import db from '../db.js';

const PROFILE_COLUMNS = `s.id, s.roll_no AS rollNo, s.name, s.email, s.department, s.semester`;

const studentRepository = {
    // For the admin panel: each student plus the id of their active key (if any)
    async findAllWithKeyInfo() {
        const [rows] = await db.query(
            `SELECT ${PROFILE_COLUMNS},
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
    },

    async findById(id) {
        const [rows] = await db.query(
            `SELECT ${PROFILE_COLUMNS} FROM students s WHERE s.id = ?`,
            [id]
        );
        return rows[0] || null;
    },

    // For teachers: all students, optional filters, with a small marks summary each
    async findAllForTeacher({ search, department, semester } = {}) {
        const where = [];
        const params = [];
        if (search) {
            where.push('(s.name LIKE ? OR s.roll_no LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }
        if (department) { where.push('s.department LIKE ?'); params.push(`%${department}%`); }
        if (semester)   { where.push('s.semester = ?');      params.push(semester); }

        const [rows] = await db.query(
            `SELECT ${PROFILE_COLUMNS},
                    (SELECT COUNT(*) FROM marks m WHERE m.student_id = s.id) AS subjectsCount,
                    (SELECT ROUND(AVG(m.total), 2) FROM marks m WHERE m.student_id = s.id) AS averageTotal
               FROM students s
               ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
              ORDER BY s.id`,
            params
        );
        return rows.map((r) => ({
            ...r,
            averageTotal: r.averageTotal === null ? null : Number(r.averageTotal)
        }));
    }
};

export default studentRepository;
