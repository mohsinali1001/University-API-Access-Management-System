import crypto from 'crypto';
import config from '../config/env.js';
import { ROLES, KEY_STATUS } from '../config/constants.js';
import apiKeyRepository from '../repositories/apiKey.repository.js';
import AppError from '../utils/AppError.js';

// Constant-time comparison so the admin key can't be guessed via timing differences
function safeEqual(a, b) {
    const hashA = crypto.createHash('sha256').update(a).digest();
    const hashB = crypto.createHash('sha256').update(b).digest();
    return crypto.timingSafeEqual(hashA, hashB);
}

const authService = {
    /**
     * Turns a raw header value into an "auth context" or throws.
     *   admin key           -> { role: 'admin' }
     *   valid student key   -> { role: 'student', keyId, studentId, ... }
     *   valid teacher key   -> { role: 'teacher', keyId, teacherId, ... }
     */
    async authenticate(rawKey) {
        if (typeof rawKey !== 'string' || rawKey.trim() === '') {
            throw AppError.unauthorized('API key is missing. Send it in the x-api-key header');
        }
        const key = rawKey.trim();

        if (key.length > 64) {
            throw AppError.unauthorized('Invalid API key');
        }

        // 1) predefined admin key (from .env, not in the database)
        if (safeEqual(key, config.adminApiKey)) {
            return { role: ROLES.ADMIN, keyId: null, ownerName: 'Administrator' };
        }

        // 2) student / teacher key (from the database)
        const record = await apiKeyRepository.findByKeyValue(key);
        if (!record) {
            throw AppError.unauthorized('Invalid API key');
        }
        if (record.status === KEY_STATUS.REVOKED) {
            throw new AppError('This API key has been revoked', 403, 'KEY_REVOKED');
        }

        return {
            role: record.owner_type,            // 'student' | 'teacher'
            keyId: record.id,
            studentId: record.student_id,       // null for teachers
            teacherId: record.teacher_id,       // null for students
            ownerName: record.owner_name
        };
    }
};

export default authService;
