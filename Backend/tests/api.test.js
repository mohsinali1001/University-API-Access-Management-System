import http from 'node:http';
import assert from 'node:assert/strict';
import app from '../app.js';
import config from '../config/env.js';

let server;
let baseUrl;

async function request(path, options = {}) {
    const url = `${baseUrl}${path}`;
    const headers = { ...(options.headers || {}) };
    if (options.body && typeof options.body === 'object' && !(typeof options.body === 'string')) {
        options.body = JSON.stringify(options.body);
        headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(url, { ...options, headers });
    let data = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        data = await res.json();
    } else {
        data = await res.text();
    }
    return { status: res.status, headers: res.headers, data };
}

async function runTests() {
    console.log('🚀 Starting University API Access Management System Test Suite...\n');
    let passed = 0;
    let failed = 0;

    async function test(name, fn) {
        try {
            await fn();
            console.log(`  ✓ ${name}`);
            passed++;
        } catch (err) {
            console.error(`  ✗ ${name}`);
            console.error(`    Error: ${err.message}`);
            failed++;
        }
    }

    // Start ephemeral server
    await new Promise((resolve) => {
        server = http.createServer(app);
        server.listen(0, '127.0.0.1', () => {
            const addr = server.address();
            baseUrl = `http://127.0.0.1:${addr.port}`;
            resolve();
        });
    });

    try {
        const ADMIN_KEY = config.adminApiKey;
        const SAMPLE_STUDENT_KEY = 'stu_a1f4c9e27b3d4e8f9a6b1c2d3e4f5a60'; // Ali Raza (id 1)
        const EXHAUSTED_KEY = 'stu_b2e5d0f38c4e5f90ab7c2d3e4f5a6b71';      // Sara Khan (limit 5, used 5)
        const REVOKED_KEY = 'stu_c3f6e1049d5f6a01bc8d3e4f5a6b7c82';        // Ahmed Hassan (revoked)
        const SAMPLE_TEACHER_KEY = 'tch_e51823a6bf71c823dea0f5a6b7c8d9a4'; // M. Fahad Qasim (id 1)

        // 1. Health check
        await test('1. GET /api/health returns API status and database health safely', async () => {
            const res = await request('/api/health');
            assert.equal(res.status, 200);
            assert.equal(res.data.success, true);
            assert.equal(res.data.data.status, 'ok');
            assert.equal(res.data.data.database, 'connected');
        });

        // 2. Missing API key
        await test('2. Protected endpoints reject missing x-api-key with HTTP 401', async () => {
            const res = await request('/api/student/me');
            assert.equal(res.status, 401);
            assert.equal(res.data.success, false);
            assert.equal(res.data.error.code, 'UNAUTHORIZED');
        });

        // 3. Invalid API key
        await test('3. Protected endpoints reject invalid x-api-key with HTTP 401', async () => {
            const res = await request('/api/student/me', {
                headers: { 'x-api-key': 'stu_invalid_bogus_key_12345' }
            });
            assert.equal(res.status, 401);
            assert.equal(res.data.success, false);
            assert.equal(res.data.error.code, 'UNAUTHORIZED');
        });

        // 4. Revoked key
        await test('4. Revoked key is rejected with HTTP 403 KEY_REVOKED', async () => {
            const res = await request('/api/student/me', {
                headers: { 'x-api-key': REVOKED_KEY }
            });
            assert.equal(res.status, 403);
            assert.equal(res.data.success, false);
            assert.equal(res.data.error.code, 'KEY_REVOKED');
        });

        // 5. Admin authentication
        await test('5. Admin key can access admin endpoints (GET /api/admin/keys)', async () => {
            const res = await request('/api/admin/keys', {
                headers: { 'x-api-key': ADMIN_KEY }
            });
            assert.equal(res.status, 200);
            assert.equal(res.data.success, true);
            assert.ok(Array.isArray(res.data.data));
            // Verify existing keys never expose full secret in list
            for (const k of res.data.data) {
                assert.equal(k.keyValue, undefined);
                assert.ok(k.maskedKey);
            }
        });

        // 6. Role protection: Student cannot access admin
        await test('6. Student key cannot access admin endpoints (HTTP 403)', async () => {
            const res = await request('/api/admin/keys', {
                headers: { 'x-api-key': SAMPLE_STUDENT_KEY }
            });
            assert.equal(res.status, 403);
            assert.equal(res.data.success, false);
            assert.equal(res.data.error.code, 'FORBIDDEN');
        });

        // 7. Role protection: Teacher cannot access admin
        await test('7. Teacher key cannot access admin endpoints (HTTP 403)', async () => {
            const res = await request('/api/admin/keys', {
                headers: { 'x-api-key': SAMPLE_TEACHER_KEY }
            });
            assert.equal(res.status, 403);
            assert.equal(res.data.success, false);
            assert.equal(res.data.error.code, 'FORBIDDEN');
        });

        // 8. Role protection: Teacher cannot access student/me
        await test('8. Teacher key cannot access /api/student/me (HTTP 403)', async () => {
            const res = await request('/api/student/me', {
                headers: { 'x-api-key': SAMPLE_TEACHER_KEY }
            });
            assert.equal(res.status, 403);
            assert.equal(res.data.success, false);
            assert.equal(res.data.error.code, 'FORBIDDEN');
        });

        // 9. Student access to own data
        await test('9. Student key can access only own profile and marks', async () => {
            const resMe = await request('/api/student/me', {
                headers: { 'x-api-key': SAMPLE_STUDENT_KEY }
            });
            assert.equal(resMe.status, 200);
            assert.equal(resMe.data.success, true);
            assert.equal(resMe.data.data.rollNo, '231001');

            const resMarks = await request('/api/student/me/marks', {
                headers: { 'x-api-key': SAMPLE_STUDENT_KEY }
            });
            assert.equal(resMarks.status, 200);
            assert.equal(resMarks.data.success, true);
            assert.ok(Array.isArray(resMarks.data.data.marks));
            assert.ok(resMarks.data.data.marks.length > 0);
            for (const m of resMarks.data.data.marks) {
                assert.ok(m.subjectCode);
                assert.ok(m.grade);
            }
        });

        // 10. Teacher can view all students and marks
        await test('10. Teacher key can view students and class marks', async () => {
            const resStudents = await request('/api/teacher/students', {
                headers: { 'x-api-key': SAMPLE_TEACHER_KEY }
            });
            assert.equal(resStudents.status, 200);
            assert.equal(resStudents.data.success, true);
            assert.ok(Array.isArray(resStudents.data.data));
            assert.ok(resStudents.data.data.length >= 6);

            const resMarks = await request('/api/teacher/marks', {
                headers: { 'x-api-key': SAMPLE_TEACHER_KEY }
            });
            assert.equal(resMarks.status, 200);
            assert.equal(resMarks.data.success, true);
            assert.ok(Array.isArray(resMarks.data.data.marks));
            assert.ok(resMarks.data.data.marks.length >= 10);
        });

        // 11. Rate limiting on exhausted key
        await test('11. Key at or exceeding request limit returns HTTP 429 RATE_LIMIT_EXCEEDED', async () => {
            const res = await request('/api/student/me', {
                headers: { 'x-api-key': EXHAUSTED_KEY }
            });
            assert.equal(res.status, 429);
            assert.equal(res.data.success, false);
            assert.equal(res.data.error.code, 'RATE_LIMIT_EXCEEDED');
        });

        // 12. Key lifecycle: Generate, Use, Exceed Limit, Update Limit, View Logs, Revoke
        let newKeyId;
        let newKeyValue;
        await test('12. Admin can generate a new API key with a configured request limit', async () => {
            const res = await request('/api/admin/keys', {
                method: 'POST',
                headers: { 'x-api-key': ADMIN_KEY },
                body: {
                    ownerType: 'student',
                    ownerId: 5, // Usman Tariq
                    requestLimit: 2
                }
            });
            assert.equal(res.status, 201);
            assert.equal(res.data.success, true);
            assert.ok(res.data.data.id);
            assert.ok(res.data.data.keyValue.startsWith('stu_'));
            newKeyId = res.data.data.id;
            newKeyValue = res.data.data.keyValue;
        });

        await test('13. Newly generated key works, counts usage, and hits limit accurately', async () => {
            // Request 1
            const res1 = await request('/api/student/me', {
                headers: { 'x-api-key': newKeyValue }
            });
            assert.equal(res1.status, 200);
            assert.equal(res1.data.data.rollNo, '231005');

            // Request 2
            const res2 = await request('/api/student/me', {
                headers: { 'x-api-key': newKeyValue }
            });
            assert.equal(res2.status, 200);

            // Request 3 (limit was 2 -> should be 429)
            const res3 = await request('/api/student/me', {
                headers: { 'x-api-key': newKeyValue }
            });
            assert.equal(res3.status, 429);
            assert.equal(res3.data.error.code, 'RATE_LIMIT_EXCEEDED');
        });

        await test('14. Admin can update request limit and unblock key while preserving usage', async () => {
            const resUpdate = await request(`/api/admin/keys/${newKeyId}/limit`, {
                method: 'PATCH',
                headers: { 'x-api-key': ADMIN_KEY },
                body: { requestLimit: 5 }
            });
            assert.equal(resUpdate.status, 200);
            assert.equal(resUpdate.data.data.requestLimit, 5);
            assert.equal(resUpdate.data.data.requestCount, 2);

            // Now next request should succeed
            const res4 = await request('/api/student/me', {
                headers: { 'x-api-key': newKeyValue }
            });
            assert.equal(res4.status, 200);
        });

        await test('15. Admin can inspect usage logs recorded for the API key', async () => {
            const resLogs = await request(`/api/admin/keys/${newKeyId}/usage`, {
                headers: { 'x-api-key': ADMIN_KEY }
            });
            assert.equal(resLogs.status, 200);
            assert.ok(Array.isArray(resLogs.data.data.recent));
            assert.ok(resLogs.data.data.recent.length >= 3);
            for (const log of resLogs.data.data.recent) {
                assert.ok(log.endpoint);
                assert.ok(log.method);
                assert.ok(log.statusCode);
                assert.ok(log.requestedAt);
            }
        });

        await test('16. Admin can revoke key; key stops working immediately', async () => {
            const resRevoke = await request(`/api/admin/keys/${newKeyId}/revoke`, {
                method: 'PATCH',
                headers: { 'x-api-key': ADMIN_KEY }
            });
            assert.equal(resRevoke.status, 200);
            assert.equal(resRevoke.data.data.status, 'revoked');

            // Trying with the revoked key must immediately fail
            const resReq = await request('/api/student/me', {
                headers: { 'x-api-key': newKeyValue }
            });
            assert.equal(resReq.status, 403);
            assert.equal(resReq.data.error.code, 'KEY_REVOKED');
        });

        // 17. Validation and edge cases
        await test('17. Validation rejects negative/zero limits and invalid inputs with HTTP 400', async () => {
            const resBad = await request('/api/admin/keys', {
                method: 'POST',
                headers: { 'x-api-key': ADMIN_KEY },
                body: {
                    ownerType: 'student',
                    ownerId: 1,
                    requestLimit: -5
                }
            });
            assert.equal(resBad.status, 400);
            assert.equal(resBad.data.error.code, 'BAD_REQUEST');
        });

        // 18. Route not found
        await test('18. Unknown endpoint returns JSON HTTP 404', async () => {
            const res404 = await request('/api/nonexistent/endpoint');
            assert.equal(res404.status, 404);
            assert.equal(res404.data.error.code, 'NOT_FOUND');
        });

    } finally {
        if (server) {
            server.close();
        }
    }

    console.log(`\n================================`);
    console.log(`Test Summary: ${passed} passed, ${failed} failed.`);
    console.log(`================================\n`);

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
