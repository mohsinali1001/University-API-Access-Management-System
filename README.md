# University API Access Management System

**Course:** Full Stack Development (Lab Task 07)  
**Institution:** Air University Islamabad, Kamra Campus  
**Architecture:** XAMPP (MySQL/MariaDB) → Node.js + Express REST API → HTML/CSS/JavaScript (AJAX & Local jQuery)

---

## 1. Overview & System Objectives

The **University API Access Management System** is a full-stack academic web application designed to demonstrate API key generation, role-based access control (RBAC), lifetime request rate limiting, usage audit logging, and responsive client-side portal consumption.

### Authoritative Lab Requirements Met
1. **Relational Database Design:** Complete MySQL schema storing students, teachers, subjects, academic marks, API keys, and request usage logs with foreign keys, checks, and constraints.
2. **Administrator Panel (`/admin`):** Allows administrators to view students and teachers, generate scoped API keys, assign lifetime request quotas, monitor real-time usage and audit logs, adjust limits, and immediately revoke keys.
3. **Settings Page:** Lets students and teachers paste, test against live endpoints, and persist their assigned API keys locally in browser storage.
4. **Access Control & Scoping:**
   - **Students** can only access their own profile and academic marks derived strictly from the authenticated key on the server (never trusting URL or body parameters).
   - **Teachers** can view all students and comprehensive class marks across subjects.
5. **Security & Header Authentication:** All protected endpoints require API keys transmitted via the `x-api-key` HTTP header. The administrator key is configured securely server-side in `Backend/.env` and is never bundled in frontend code.
6. **Rate Limiting & Atomic Counting:** Requests decrement lifetime quota atomically; exhausted keys immediately receive `429 Too Many Requests`.
7. **Audit Logging:** Every authenticated request is recorded in `api_usage_logs` with endpoint, HTTP method, response status code, and timestamp.
8. **Responsive UI:** Modern, accessible interface styled with pure CSS (no remote CDN dependencies), utilizing local jQuery 3.7.1 for reliable offline execution.

---

## 2. Project Directory Structure

```text
University-API-Access-Management-System/
├── .gitignore
├── README.md
├── docs/
│   ├── TESTING_CHECKLIST.md       # Acceptance testing checklist & scenarios
│   ├── DEMO_SCRIPT.md             # 3-5 minute demonstration walkthrough
│   └── REPORT_SCREENSHOTS.md      # Lab report screenshots and code excerpts guide
├── Backend/
│   ├── .env.example               # Environment template (DB credentials, ADMIN_API_KEY)
│   ├── .gitignore
│   ├── package.json               # Backend dependencies and test scripts
│   ├── server.js                  # HTTP server listener & DB startup verification
│   ├── app.js                     # Express app setup, CORS, route mounting, error handling
│   ├── db.js                      # MySQL2 connection pool
│   ├── config/
│   │   ├── constants.js           # Roles, key status, limits
│   │   └── env.js                 # Validated environment configuration
│   ├── controllers/
│   │   ├── admin.controller.js    # Keys, students, teachers, usage inspection
│   │   ├── auth.controller.js     # Key verification endpoint
│   │   ├── health.controller.js   # Health check & table counts
│   │   ├── student.controller.js  # Own profile and marks
│   │   └── teacher.controller.js  # Class students and marks
│   ├── middleware/
│   │   ├── apiKeyAuth.js          # Authentication header validator
│   │   ├── guards.js              # Composed pipeline guards (auth, role, logger, limiter)
│   │   ├── requireRole.js         # Role authorization
│   │   ├── usageLimiter.js        # Atomic request limit enforcement (HTTP 429)
│   │   ├── usageLogger.js         # Request audit logger
│   │   ├── requestLogger.js       # Console request logger
│   │   ├── errorHandler.js        # Global JSON error handler
│   │   └── notFound.js            # 404 handler
│   ├── repositories/
│   │   ├── apiKey.repository.js   # API key queries & atomic consumption
│   │   ├── student.repository.js  # Student queries
│   │   ├── teacher.repository.js  # Teacher queries
│   │   ├── marks.repository.js    # Marks queries & calculations
│   │   ├── usageLog.repository.js # Audit log queries
│   │   └── health.repository.js   # DB ping & counts
│   ├── routes/
│   │   ├── admin.routes.js        # /api/admin/*
│   │   ├── auth.routes.js         # /api/auth/*
│   │   ├── health.routes.js       # /api/health
│   │   ├── student.routes.js      # /api/student/*
│   │   ├── teacher.routes.js      # /api/teacher/*
│   │   └── index.js               # Central route aggregator
│   ├── services/
│   │   ├── apiKey.service.js      # Key creation, masking, and limits
│   │   ├── auth.service.js        # Constant-time comparison & key verification
│   │   ├── health.service.js      # DB health check logic
│   │   ├── marks.service.js       # Academic grading & summaries
│   │   ├── student.service.js     # Student profile & marks logic
│   │   ├── teacher.service.js     # Teacher multi-student marks logic
│   │   └── usage.service.js       # Usage counting & logging
│   ├── utils/
│   │   ├── AppError.js            # Operational error classes
│   │   ├── grading.js             # Grade boundaries and percent rounding
│   │   ├── keyGenerator.js        # Cryptographic key generation
│   │   ├── response.js            # Consistent JSON response helper
│   │   └── validators.js          # Input parsing & sanitization
│   ├── tests/
│   │   └── api.test.js            # Automated integration test suite (18 scenarios)
│   └── Database/
│       └── schema.sql             # MySQL schema & sample seed data
└── Frontend/
    ├── index.html                 # System landing page & live server health
    ├── admin.html                 # Redirect to admin panel
    ├── admin/
    │   └── index.html             # Admin portal (keys, limits, logs, users)
    ├── settings.html              # API key entry, verification & storage
    ├── student.html               # Student academic record dashboard
    ├── teacher.html               # Teacher class & marks dashboard
    ├── config.js                  # Frontend API base URL configuration
    ├── script.js                  # Landing page logic
    ├── styles.css                 # Polished, responsive university design system
    └── js/
        ├── admin.js               # Admin panel state & modals
        ├── api.js                 # Central AJAX wrapper with x-api-key injection
        ├── settings.js            # Key storage & validation
        ├── storage.js             # LocalStorage & SessionStorage wrapper
        ├── student.js             # Student dashboard rendering
        ├── teacher.js             # Teacher dashboard rendering & filters
        ├── ui.js                  # UI helpers (tables, modals, toasts, spinners)
        └── lib/
            └── jquery-3.7.1.min.js# Offline local jQuery
```

---

## 3. Prerequisites & Environment Setup

- **Node.js:** v18.0.0 or later (Tested on Node v24.14.0)
- **Database:** XAMPP with Apache & MySQL / MariaDB (Default: `localhost:3306`)
- **Web Browser:** Chrome, Edge, or Firefox
- **Optional Static Server:** VS Code Live Server extension or Python `http.server`

---

## 4. Step-by-Step Installation & Startup

### Step 1: Start MySQL in XAMPP
1. Open the **XAMPP Control Panel**.
2. Click **Start** next to **MySQL**.

### Step 2: Import Database Schema & Seed Data
1. Open **phpMyAdmin** in your browser (`http://localhost/phpmyadmin`).
2. Go to the **Import** tab.
3. Choose the file `Backend/Database/schema.sql`.
4. Click **Import** (or **Go**).
5. Verify that `university_api_db` was created with tables:
   - `students` (6 sample records)
   - `teachers` (3 sample records)
   - `subjects` (5 sample records)
   - `marks` (16 sample records)
   - `api_keys` (6 demo keys with various states)
   - `api_usage_logs`

### Step 3: Configure Backend Environment
1. In the `Backend` directory, ensure `.env` exists (copy from `.env.example` if needed):
   ```bash
   cp .env.example .env
   ```
2. Verify or update the database credentials in `Backend/.env`:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=university_api_db
   ADMIN_API_KEY=admin_university_2026_secret
   CORS_ORIGIN=*
   ```

### Step 4: Install Dependencies & Run Tests
Open a terminal in the `Backend` folder:
```bash
cd Backend
npm install
npm test
```
*Expected result:* All 18 automated integration tests pass with 100% success.

### Step 5: Start the API Server
In the `Backend` folder, start the backend:
```bash
npm start
```
*The server will start listening at `http://localhost:5000` and confirm database connectivity.*

### Step 6: Launch the Frontend
You can serve the `Frontend` directory using any local web server:
- **Option A (VS Code Live Server):** Right-click `Frontend/index.html` → **Open with Live Server** (serves at `http://127.0.0.1:5500/Frontend/index.html` or `http://127.0.0.1:5500/index.html`).
- **Option B (Python HTTP server):**
  ```bash
  cd Frontend
  python -m http.server 5500
  ```
  Then open `http://localhost:5500` in your browser.
- **Option C (Direct File Open):** Open `Frontend/index.html` directly in your browser. (The app supports relative paths and CORS is configured to `*`).

---

## 5. Pre-seeded Demo Credentials & Keys

The database comes pre-seeded with realistic fictional records to immediately test all scenarios:

| Role | Name | Identifier | Key Value | Quota / State | Test Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin** | Administrator | Defined in `.env` | `admin_university_2026_secret` | Unlimited | Admin Panel access |
| **Student** | Ali Raza | Roll: `231001` | `stu_a1f4c9e27b3d4e8f9a6b1c2d3e4f5a60` | 100 / Active | Normal student profile & marks |
| **Student** | Sara Khan | Roll: `231002` | `stu_b2e5d0f38c4e5f90ab7c2d3e4f5a6b71` | 5 of 5 used / Active | Demonstrates **HTTP 429 Quota Exceeded** |
| **Student** | Ahmed Hassan | Roll: `231003` | `stu_c3f6e1049d5f6a01bc8d3e4f5a6b7c82` | Revoked | Demonstrates **HTTP 403 Revoked Key** |
| **Student** | Fatima Noor | Roll: `231004` | `stu_d40712f5ae60b712cd9e4f5a6b7c8d93` | 50 / Active | SE Department marks |
| **Teacher** | M. Fahad Qasim | ID: `1` | `tch_e51823a6bf71c823dea0f5a6b7c8d9a4` | 200 / Active | Browse all students & marks |
| **Teacher** | Dr. Nadia Rauf | ID: `2` | `tch_f62934b7c082d934efb1a6b7c8d9eab5` | 10 / Active | Teacher subject filtering |

---

## 6. API Route Specification

All protected routes require the API key in the `x-api-key` header.

| Method | Endpoint | Allowed Role | Description | Success Code |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | System status & database table counts | `200 OK` |
| `GET` | `/api/auth/me` | Student / Teacher | Validate key and check assigned role & quota | `200 OK` |
| `GET` | `/api/admin/students` | Admin | List all students with active key indicators | `200 OK` |
| `GET` | `/api/admin/teachers` | Admin | List all teachers with active key indicators | `200 OK` |
| `GET` | `/api/admin/keys` | Admin | List all keys (masked keys, limits, usage) | `200 OK` |
| `POST` | `/api/admin/keys` | Admin | Generate a new key for student/teacher | `201 Created` |
| `PATCH`| `/api/admin/keys/:id/limit` | Admin | Update request limit (preserves current count) | `200 OK` |
| `PATCH`| `/api/admin/keys/:id/revoke`| Admin | Revoke an active API key | `200 OK` |
| `POST` | `/api/admin/keys/:id/reset` | Admin | Reset request usage counter to 0 | `200 OK` |
| `GET` | `/api/admin/keys/:id/usage` | Admin | Retrieve recent usage audit logs for a key | `200 OK` |
| `GET` | `/api/student/me` | Student | Retrieve own student profile | `200 OK` |
| `GET` | `/api/student/me/marks` | Student | Retrieve own academic marks and total GPA | `200 OK` |
| `GET` | `/api/teacher/students`| Teacher | Browse all students with optional filters | `200 OK` |
| `GET` | `/api/teacher/students/:id`| Teacher | Get single student details | `200 OK` |
| `GET` | `/api/teacher/students/:id/marks`| Teacher | Get single student marks report | `200 OK` |
| `GET` | `/api/teacher/marks` | Teacher | Get all students' marks across subjects | `200 OK` |

---

## 7. Request Limit & Quota Semantics

- **Total Lifetime Requests:** The request limit configured by the administrator represents the total number of counted requests the key can make.
- **Atomic Decrement:** Every request processed through `usageLimiter` uses an atomic SQL query:
  ```sql
  UPDATE api_keys
     SET request_count = request_count + 1, last_used_at = NOW()
   WHERE id = ? AND status = 'active' AND request_count < request_limit
  ```
  If `affectedRows === 0`, quota is exhausted or revoked, preventing race conditions.
- **HTTP 429 Response:** When `request_count >= request_limit`, the server returns `429 Too Many Requests` with response headers:
  - `X-RateLimit-Limit: <total_limit>`
  - `X-RateLimit-Remaining: 0`
- **Increasing Limits:** Updating a limit via `PATCH /api/admin/keys/:id/limit` updates `request_limit` while preserving `request_count`. If a key with limit 5 (used 5) is raised to 15, it immediately gains 10 remaining requests.

---

## 8. Common Troubleshooting

| Issue | Cause | Resolution |
| :--- | :--- | :--- |
| **`DB_UNAVAILABLE` or Connection Refused** | MySQL is not started in XAMPP | Open XAMPP Control Panel and start MySQL. Check port 3306. |
| **`ROUTE_NOT_FOUND` on `/admin`** | Static server path differences | Access `/admin/index.html` or `admin.html`. The repository includes both clean directory resolution and fallback redirect. |
| **CORS Errors** | Frontend domain differs from backend | Ensure `CORS_ORIGIN=*` in `Backend/.env` (default). |
| **HTTP 401 `UNAUTHORIZED`** | Missing or malformed key | Check key in `Settings` page. Ensure no extraneous whitespace. |
| **HTTP 403 `KEY_REVOKED`** | Admin revoked the key | Admin must generate a new key or re-activate access. |
| **HTTP 429 `RATE_LIMIT_EXCEEDED`** | Key reached request quota | Admin can raise limit from Admin Panel under "Limit" action. |

---

## 9. Testing & Quality Assurance

Run the automated test suite directly:
```bash
cd Backend
npm test
```
The suite executes 18 scenarios covering:
- Safe health endpoint inspection
- Rejection of missing, invalid, and revoked API keys
- Role enforcement (Student cannot call Admin, Teacher cannot call Student self-service)
- Identity scoping (Student only gets own marks derived from DB token)
- Teacher multi-student queries
- Key generation, rate limit exhaustion, quota unblocking, audit log verification, and revocation.

For complete acceptance checklists, refer to [`docs/TESTING_CHECKLIST.md`](docs/TESTING_CHECKLIST.md).
