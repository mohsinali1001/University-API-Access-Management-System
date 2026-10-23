import studentRepository from '../repositories/student.repository.js';
import marksService from './marks.service.js';
import AppError from '../utils/AppError.js';

const studentService = {
    // ---- admin ----
    listForAdmin() {
        return studentRepository.findAllWithKeyInfo();
    },

    // ---- student self-service ----
    // SECURITY: the student id is taken ONLY from the authenticated key (auth),
    // never from the URL, query string, body or any other header.
    async getOwnProfile(auth) {
        const student = await studentRepository.findById(requireStudentId(auth));
        if (!student) throw AppError.notFound('Student record not found');
        return student;
    },

    async getOwnMarks(auth) {
        const studentId = requireStudentId(auth);
        const student = await studentRepository.findById(studentId);
        if (!student) throw AppError.notFound('Student record not found');
        const report = await marksService.getReportForStudent(studentId);
        return { student, ...report };
    }
};

// Defence in depth: even if a route were mis-wired, a non-student key can't get here
function requireStudentId(auth) {
    if (auth?.role !== 'student' || !auth.studentId) {
        throw AppError.forbidden('This key does not belong to a student');
    }
    return auth.studentId;
}

export default studentService;
