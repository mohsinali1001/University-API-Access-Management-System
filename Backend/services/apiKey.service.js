import apiKeyRepository from '../repositories/apiKey.repository.js';
import studentRepository from '../repositories/student.repository.js';
import teacherRepository from '../repositories/teacher.repository.js';
import usageLogRepository from '../repositories/usageLog.repository.js';
import { DEFAULT_REQUEST_LIMIT, KEY_STATUS, ROLES } from '../config/constants.js';
import { generateApiKey } from '../utils/keyGenerator.js';
import { parseId, parseRequestLimit, parseEnum, parseOptionalInt } from '../utils/validators.js';
import AppError from '../utils/AppError.js';

const OWNER_TYPES = [ROLES.STUDENT, ROLES.TEACHER];

// Loads a key or throws 404
async function getKeyOrThrow(id) {
    const key = await apiKeyRepository.findById(id);
    if (!key) throw AppError.notFound(`API key ${id} not found`);
    return key;
}

// Revoked keys are history: they cannot be edited any more
function assertActive(key) {
    if (key.status === KEY_STATUS.REVOKED) {
        throw AppError.conflict('This API key is revoked and can no longer be modified');
    }
}

const apiKeyService = {
    async list(query) {
        const filters = {};
        if (query.status !== undefined)    filters.status = parseEnum(query.status, Object.values(KEY_STATUS), 'status');
        if (query.ownerType !== undefined) filters.ownerType = parseEnum(query.ownerType, OWNER_TYPES, 'ownerType');
        const rows = await apiKeyRepository.findAll(filters);
        return rows.map((k) => {
            const masked = k.keyValue ? `${k.keyValue.slice(0, 8)}…${k.keyValue.slice(-4)}` : null;
            const item = { ...k, maskedKey: masked };
            delete item.keyValue; // Never expose raw full keys in list endpoints
            return item;
        });
    },

    async generate(body = {}) {
        const ownerType = parseEnum(body.ownerType, OWNER_TYPES, 'ownerType');
        const ownerId = parseId(body.ownerId, 'ownerId');
        const requestLimit = body.requestLimit === undefined
            ? DEFAULT_REQUEST_LIMIT
            : parseRequestLimit(body.requestLimit);

        const ownerRepo = ownerType === ROLES.STUDENT ? studentRepository : teacherRepository;
        if (!(await ownerRepo.exists(ownerId))) {
            throw AppError.notFound(`${ownerType} ${ownerId} not found`);
        }
        if (await apiKeyRepository.hasActiveKey(ownerType, ownerId)) {
            throw AppError.conflict(`This ${ownerType} already has an active key. Revoke it first`);
        }

        const rawKey = generateApiKey(ownerType);
        const id = await apiKeyRepository.create({
            keyValue: rawKey,
            ownerType,
            ownerId,
            requestLimit
        });
        const created = await apiKeyRepository.findById(id);
        return {
            ...created,
            keyValue: rawKey,
            rawKey,
            maskedKey: `${rawKey.slice(0, 8)}…${rawKey.slice(-4)}`
        };
    },

    async updateLimit(rawId, body = {}) {
        const id = parseId(rawId, 'key id');
        const requestLimit = parseRequestLimit(body.requestLimit);
        assertActive(await getKeyOrThrow(id));
        await apiKeyRepository.updateLimit(id, requestLimit);
        return apiKeyRepository.findById(id);
    },

    async revoke(rawId) {
        const id = parseId(rawId, 'key id');
        assertActive(await getKeyOrThrow(id));
        await apiKeyRepository.revoke(id);
        return apiKeyRepository.findById(id);
    },

    async resetUsage(rawId) {
        const id = parseId(rawId, 'key id');
        assertActive(await getKeyOrThrow(id));
        await apiKeyRepository.resetUsage(id);
        return apiKeyRepository.findById(id);
    },

    // Key summary + status breakdown + most recent requests
    async getUsageReport(rawId, query) {
        const id = parseId(rawId, 'key id');
        const recentLimit = parseOptionalInt(query.limit, { min: 1, max: 200, fallback: 20 });
        const key = await getKeyOrThrow(id);

        const [byStatus, recent] = await Promise.all([
            usageLogRepository.countByStatus(id),
            usageLogRepository.findRecentByKey(id, recentLimit)
        ]);

        return {
            key,
            usage: {
                limit: key.requestLimit,
                used: key.requestCount,
                remaining: key.remaining,
                percentUsed: key.requestLimit === 0
                    ? 0
                    : Math.min(100, Math.round((key.requestCount / key.requestLimit) * 100))
            },
            byStatus,
            recent
        };
    }
};

export default apiKeyService;
