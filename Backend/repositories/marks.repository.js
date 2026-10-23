import db from '../db.js';

const MARK_SELECT = `
    SELECT m.id,
           m.student_id    AS studentId,
           s.roll_no       AS rollNo,
           s.name          AS studentName,
           sb.id           AS subjectId,
           sb.code         AS subjectCode,
           sb.name         AS subjectName,
           sb.credit_hours AS creditHours,
           m.assignment, m.midterm, m.final_exam AS finalExam, m.total
      FROM marks m
      JOIN students s  ON s.id  = m.student_id
      JOIN subjects sb ON sb.id = m.subject_id`;

// mysql2 returns DECIMAL columns as strings: convert to real numbers
const toNumbers = (row) => ({
    ...row,
    assignment: Number(row.assignment),
    midterm: Number(row.midterm),
    finalExam: Number(row.finalExam),
    total: Number(row.total)
});

const marksRepository = {
    async findByStudentId(studentId) {
        const [rows] = await db.query(
            `${MARK_SELECT} WHERE m.student_id = ? ORDER BY sb.code`,
            [studentId]
        );
        return rows.map(toNumbers);
    },

    async findAll({ subjectId } = {}) {
        const [rows] = await db.query(
            `${MARK_SELECT}
             ${subjectId ? 'WHERE sb.id = ?' : ''}
             ORDER BY s.id, sb.code`,
            subjectId ? [subjectId] : []
        );
        return rows.map(toNumbers);
    }
};

export default marksRepository;
