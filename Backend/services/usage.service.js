import apiKeyRepository from '../repositories/apiKey.repository.js';
import usageLogRepository from '../repositories/usageLog.repository.js';
import { KEY_STATUS } from '../config/constants.js';
import AppError from '../utils/AppError.js';

const usageService = {
    /**
     * Consumes one request from the key's quota.
     * Returns { limit, used, remaining } or throws 429 / 403.
     */
    async consume(keyId) {
        const consumed = await apiKeyRepository.tryConsumeRequest(keyId);
        const usage = await apiKeyRepository.getUsage(keyId);

        const summary = {
            limit: usage.request_limit,
            used: usage.request_count,
            remaining: Math.max(usage.request_limit - usage.request_count, 0)
        };

        if (!consumed) {
            // Either revoked in the meantime, or the limit has been reached
            if (usage.status === KEY_STATUS.REVOKED) {
                throw new AppError('This API key has been revoked', 403, 'KEY_REVOKED');
            }
            const err = AppError.tooManyRequests(
                `Request limit reached (${summary.used}/${summary.limit}). Ask the administrator to increase your limit`
            );
            err.usage = summary;
            throw err;
        }
        return summary;
    },

    async log(entry) {
        await usageLogRepository.insert(entry);
    }
};

export default usageService;
