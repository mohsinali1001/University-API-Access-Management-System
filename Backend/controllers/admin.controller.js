import studentService from '../services/student.service.js';
import teacherService from '../services/teacher.service.js';
import apiKeyService from '../services/apiKey.service.js';
import { sendSuccess } from '../utils/response.js';

const adminController = {
    async listStudents(req, res) {
        sendSuccess(res, await studentService.listForAdmin());
    },

    async listTeachers(req, res) {
        sendSuccess(res, await teacherService.listForAdmin());
    },

    async listKeys(req, res) {
        sendSuccess(res, await apiKeyService.list(req.query));
    },

    async generateKey(req, res) {
        const key = await apiKeyService.generate(req.body);
        sendSuccess(res, key, 201, 'API key generated');
    },

    async updateKeyLimit(req, res) {
        const key = await apiKeyService.updateLimit(req.params.id, req.body);
        sendSuccess(res, key, 200, 'Request limit updated');
    },

    async revokeKey(req, res) {
        const key = await apiKeyService.revoke(req.params.id);
        sendSuccess(res, key, 200, 'API key revoked');
    },

    async resetKeyUsage(req, res) {
        const key = await apiKeyService.resetUsage(req.params.id);
        sendSuccess(res, key, 200, 'Usage counter reset');
    },

    async getKeyUsage(req, res) {
        sendSuccess(res, await apiKeyService.getUsageReport(req.params.id, req.query));
    }
};

export default adminController;
