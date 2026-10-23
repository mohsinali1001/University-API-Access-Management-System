import healthService from '../services/health.service.js';
import { sendSuccess } from '../utils/response.js';

const healthController = {
    async check(req, res) {
        const status = await healthService.getStatus();
        sendSuccess(res, status);
    }
};

export default healthController;
