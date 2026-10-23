import AppError from '../utils/AppError.js';

// Usage: requireRole('student')  or  requireRole('student', 'teacher')
export default function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.auth || !allowedRoles.includes(req.auth.role)) {
            return next(AppError.forbidden(
                `Access denied. This endpoint is only for: ${allowedRoles.join(', ')}`
            ));
        }
        next();
    };
}
