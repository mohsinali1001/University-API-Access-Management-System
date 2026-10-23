import teacherService from '../services/teacher.service.js';
import { sendSuccess } from '../utils/response.js';

const teacherController = {
    async getProfile(req, res) {
        sendSuccess(res, await teacherService.getOwnProfile(req.auth));
    },

    async listStudents(req, res) {
        sendSuccess(res, await teacherService.listStudents(req.query));
    },

    async getStudent(req, res) {
        sendSuccess(res, await teacherService.getStudent(req.params.id));
    },

    async getStudentMarks(req, res) {
        sendSuccess(res, await teacherService.getStudentMarks(req.params.id));
    },

    async listAllMarks(req, res) {
        sendSuccess(res, await teacherService.listAllMarks(req.query));
    }
};

export default teacherController;
