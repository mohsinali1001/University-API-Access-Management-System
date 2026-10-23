import apiKeyAuth from './apiKeyAuth.js';
import usageLogger from './usageLogger.js';
import requireRole from './requireRole.js';
import usageLimiter from './usageLimiter.js';
import { ROLES } from '../config/constants.js';

// Order matters:
//   1. apiKeyAuth   who are you?               (401 / 403 revoked)
//   2. usageLogger  record the request         (skipped for admin)
//   3. requireRole  are you allowed here?      (403)
//   4. usageLimiter have you got quota left?   (429)

export const adminGuard   = [apiKeyAuth, requireRole(ROLES.ADMIN)];
export const studentGuard = [apiKeyAuth, usageLogger, requireRole(ROLES.STUDENT), usageLimiter];
export const teacherGuard = [apiKeyAuth, usageLogger, requireRole(ROLES.TEACHER), usageLimiter];
// any valid key (admin, student or teacher), used by /api/auth/me
export const anyKeyGuard  = [apiKeyAuth, usageLogger, usageLimiter];
