import teacherRepository from '../repositories/teacher.repository.js';
import studentRepository from '../repositories/student.repository.js';
import marksService from './marks.service.js';
import AppError from '../utils/AppError.js';
import { parseId } from '../utils/validators.js';

// ?search=ali  (must be a single short string, not ?search=a&search=b)
function optionalText(value, label, maxLength = 80) {
    if (value === undefined || value === '') return undefined;
    if (typeof value !== 'string' || value.length > maxLength) {
        throw AppError.badRequest(`${label} must be text of at most ${maxLength} characters`);
    }
    return value.trim();
}

async function getStudentOrThrow(rawId) {
    const id = parseId(rawId, 'student id');
    const student = await studentRepository.findById(id);
    if (!student) throw AppError.notFound(`Student ${id} not found`);
    return student;
}

const teacherService = {
    // ---- admin ----
    listForAdmin() {
        return teacherRepository.findAllWithKeyInfo();
    },

    // ---- teacher ----
    async getOwnProfile(auth) {
        if (auth?.role !== 'teacher' || !auth.teacherId) {
            throw AppError.forbidden('This key does not belong to a teacher');
        }
        const teacher = await teacherRepository.findById(auth.teacherId);
        if (!teacher) throw AppError.notFound('Teacher record not found');
        return teacher;
    },

    listStudents(query) {
        return studentRepository.findAllForTeacher({
            search: optionalText(query.search, 'search', 50),
            department: optionalText(query.department, 'department'),
            semester: query.semester === undefined ? undefined : parseId(query.semester, 'semester')
        });
    },

    getStudent(rawId) {
        return getStudentOrThrow(rawId);
    },

    async getStudentMarks(rawId) {
        const student = await getStudentOrThrow(rawId);
        const report = await marksService.getReportForStudent(student.id);
        return { student, ...report };
    },

    listAllMarks(query) {
        return marksService.listAll({
            subjectId: query.subjectId === undefined ? undefined : parseId(query.subjectId, 'subjectId')
        });
    }
};

export default teacherService;
