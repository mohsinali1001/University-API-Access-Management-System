import marksRepository from '../repositories/marks.repository.js';
import { gradeFor, round2 } from '../utils/grading.js';

const withGrade = (mark) => ({ ...mark, grade: gradeFor(mark.total) });

const marksService = {
    // marks + overall summary for ONE student
    async getReportForStudent(studentId) {
        const marks = (await marksRepository.findByStudentId(studentId)).map(withGrade);

        const totalObtained = round2(marks.reduce((sum, m) => sum + m.total, 0));
        const totalMax = marks.length * 100;
        const percentage = totalMax === 0 ? 0 : round2((totalObtained / totalMax) * 100);

        return {
            marks,
            summary: {
                subjects: marks.length,
                totalObtained,
                totalMax,
                percentage,
                grade: marks.length === 0 ? null : gradeFor(percentage)
            }
        };
    },

    // marks of ALL students (teacher view), optional subject filter
    async listAll(filters) {
        const marks = (await marksRepository.findAll(filters)).map(withGrade);
        return { count: marks.length, marks };
    }
};

export default marksService;
