import { sendSuccess } from '../utils/response.js';

const authController = {
    // GET /api/auth/me  -> who does this key belong to, and how much quota is left
    me(req, res) {
        const { role, ownerName, studentId, teacherId, usage } = req.auth;
        sendSuccess(res, {
            role,
            name: ownerName,
            studentId: studentId ?? null,
            teacherId: teacherId ?? null,
            usage: usage ?? null    // null for admin (unlimited)
        });
    }
};

export default authController;
