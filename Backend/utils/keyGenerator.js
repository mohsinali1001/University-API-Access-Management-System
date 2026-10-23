import crypto from 'crypto';

const PREFIX = { student: 'stu_', teacher: 'tch_' };

// e.g. stu_9f2c1a... (4 + 32 hex chars = 36 chars, cryptographically random)
export function generateApiKey(ownerType) {
    return PREFIX[ownerType] + crypto.randomBytes(16).toString('hex');
}
