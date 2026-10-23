import studentService from '../services/student.service.js';
import { sendSuccess } from '../utils/response.js';

// NOTE: no handler reads req.params / req.query / req.body to decide WHOSE data to return.
// Identity comes from req.auth (set by apiKeyAuth from the x-api-key header).
const studentController = {
    async getProfile(req, res) {
        sendSuccess(res, await studentService.getOwnProfile(req.auth));
    },

    async getMarks(req, res) {
        sendSuccess(res, await studentService.getOwnMarks(req.auth));
    }
};

export default studentController;
