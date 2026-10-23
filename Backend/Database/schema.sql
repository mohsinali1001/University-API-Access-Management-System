-- ============================================================
--  University API Access Management System
--  Phase 1: Database schema + sample data
--  Engine: MySQL / MariaDB (XAMPP)   Charset: utf8mb4
--  Import: phpMyAdmin -> Import -> choose this file
-- ============================================================

DROP DATABASE IF EXISTS university_api_db;
CREATE DATABASE university_api_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE university_api_db;

-- ------------------------------------------------------------
-- 1. students
-- ------------------------------------------------------------
CREATE TABLE students (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    roll_no     VARCHAR(20)  NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(120) NOT NULL UNIQUE,
    department  VARCHAR(80)  NOT NULL,
    semester    TINYINT UNSIGNED NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_students_semester CHECK (semester BETWEEN 1 AND 8)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 2. teachers
-- ------------------------------------------------------------
CREATE TABLE teachers (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(120) NOT NULL UNIQUE,
    department  VARCHAR(80)  NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 3. subjects
-- ------------------------------------------------------------
CREATE TABLE subjects (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code         VARCHAR(15)  NOT NULL UNIQUE,
    name         VARCHAR(100) NOT NULL,
    credit_hours TINYINT UNSIGNED NOT NULL DEFAULT 3
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 4. marks  (one row per student per subject)
--    assignment /20 , midterm /30 , final /50  => total /100
-- ------------------------------------------------------------
CREATE TABLE marks (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id  INT UNSIGNED NOT NULL,
    subject_id  INT UNSIGNED NOT NULL,
    assignment  DECIMAL(5,2) NOT NULL DEFAULT 0,
    midterm     DECIMAL(5,2) NOT NULL DEFAULT 0,
    final_exam  DECIMAL(5,2) NOT NULL DEFAULT 0,
    total       DECIMAL(6,2) GENERATED ALWAYS AS (assignment + midterm + final_exam) STORED,
    UNIQUE KEY uq_student_subject (student_id, subject_id),
    CONSTRAINT fk_marks_student FOREIGN KEY (student_id)
        REFERENCES students(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_marks_subject FOREIGN KEY (subject_id)
        REFERENCES subjects(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_marks_assignment CHECK (assignment BETWEEN 0 AND 20),
    CONSTRAINT chk_marks_midterm    CHECK (midterm    BETWEEN 0 AND 30),
    CONSTRAINT chk_marks_final      CHECK (final_exam BETWEEN 0 AND 50)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 5. api_keys
--    A key belongs to exactly ONE student OR ONE teacher.
--    request_limit = total requests allowed, request_count = used so far.
--    (The admin key is NOT stored here; it lives in .env)
-- ------------------------------------------------------------
CREATE TABLE api_keys (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    key_value      VARCHAR(64)  NOT NULL UNIQUE,
    owner_type     ENUM('student','teacher') NOT NULL,
    student_id     INT UNSIGNED NULL,
    teacher_id     INT UNSIGNED NULL,
    request_limit  INT UNSIGNED NOT NULL DEFAULT 100,
    request_count  INT UNSIGNED NOT NULL DEFAULT 0,
    status         ENUM('active','revoked') NOT NULL DEFAULT 'active',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at     TIMESTAMP NULL DEFAULT NULL,
    last_used_at   TIMESTAMP NULL DEFAULT NULL,
    -- NOTE: no CASCADE actions here on purpose: MySQL/MariaDB do not allow a
    -- CHECK constraint on columns that use referential actions.
    CONSTRAINT fk_keys_student FOREIGN KEY (student_id) REFERENCES students(id),
    CONSTRAINT fk_keys_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    -- owner_type must match which FK is filled, and only one may be filled
    CONSTRAINT chk_keys_owner CHECK (
        (owner_type = 'student' AND student_id IS NOT NULL AND teacher_id IS NULL) OR
        (owner_type = 'teacher' AND teacher_id IS NOT NULL AND student_id IS NULL)
    ),
    INDEX idx_keys_status (status)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 6. api_usage_logs  (one row per authenticated request)
-- ------------------------------------------------------------
CREATE TABLE api_usage_logs (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    api_key_id    INT UNSIGNED NOT NULL,
    endpoint      VARCHAR(255) NOT NULL,
    method        VARCHAR(10)  NOT NULL,
    status_code   SMALLINT UNSIGNED NULL,
    requested_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_logs_key FOREIGN KEY (api_key_id)
        REFERENCES api_keys(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_logs_key_time (api_key_id, requested_at)
) ENGINE=InnoDB;


-- ============================================================
--  SAMPLE DATA
-- ============================================================

INSERT INTO students (roll_no, name, email, department, semester) VALUES
('231001', 'Ali Raza',       'ali.raza@student.au.edu.pk',      'Computer Science', 5),
('231002', 'Sara Khan',      'sara.khan@student.au.edu.pk',     'Computer Science', 5),
('231003', 'Ahmed Hassan',   'ahmed.hassan@student.au.edu.pk',  'Computer Science', 5),
('231004', 'Fatima Noor',    'fatima.noor@student.au.edu.pk',   'Software Engineering', 3),
('231005', 'Usman Tariq',    'usman.tariq@student.au.edu.pk',   'Software Engineering', 3),
('231006', 'Ayesha Malik',   'ayesha.malik@student.au.edu.pk',  'Computer Science', 5);

INSERT INTO teachers (name, email, department) VALUES
('M. Fahad Qasim',  'fahad.qasim@au.edu.pk',  'Computer Science'),
('Dr. Nadia Rauf',  'nadia.rauf@au.edu.pk',   'Computer Science'),
('Engr. Bilal Aziz','bilal.aziz@au.edu.pk',   'Software Engineering');

INSERT INTO subjects (code, name, credit_hours) VALUES
('CS-301',  'Full Stack Development',   3),
('CS-302',  'Database Systems',         3),
('CS-303',  'Operating Systems',        3),
('CS-304',  'Computer Networks',        3),
('SE-201',  'Software Requirements',    2);

-- marks: (student_id, subject_id, assignment/20, midterm/30, final/50)
INSERT INTO marks (student_id, subject_id, assignment, midterm, final_exam) VALUES
(1, 1, 18.00, 25.50, 42.00),
(1, 2, 16.50, 22.00, 38.00),
(1, 3, 17.00, 24.00, 40.50),
(2, 1, 19.50, 28.00, 46.00),
(2, 2, 18.00, 26.50, 44.00),
(2, 4, 17.50, 25.00, 41.00),
(3, 1, 14.00, 18.50, 30.00),
(3, 3, 15.00, 20.00, 33.50),
(3, 4, 13.50, 17.00, 29.00),
(4, 2, 17.00, 23.00, 39.00),
(4, 5, 18.50, 27.00, 43.50),
(5, 2, 12.00, 15.50, 27.00),
(5, 5, 14.50, 19.00, 31.00),
(6, 1, 20.00, 29.00, 48.00),
(6, 2, 19.00, 27.50, 45.00),
(6, 4, 18.00, 26.00, 42.50);

-- api keys (sample / demo keys)
--   student keys  -> prefix stu_
--   teacher keys  -> prefix tch_
-- Ali:     normal key
-- Sara:    key that is ALREADY AT its limit  (demo of HTTP 429)
-- Ahmed:   REVOKED key                       (demo of HTTP 401/403)
-- Fatima:  normal key
-- Fahad:   teacher key, normal
-- Nadia:   teacher key, low limit
INSERT INTO api_keys (key_value, owner_type, student_id, teacher_id, request_limit, request_count, status, revoked_at) VALUES
('stu_a1f4c9e27b3d4e8f9a6b1c2d3e4f5a60', 'student', 1, NULL, 100, 0, 'active',  NULL),
('stu_b2e5d0f38c4e5f90ab7c2d3e4f5a6b71', 'student', 2, NULL,   5, 5, 'active',  NULL),
('stu_c3f6e1049d5f6a01bc8d3e4f5a6b7c82', 'student', 3, NULL, 100, 12,'revoked', NOW()),
('stu_d40712f5ae60b712cd9e4f5a6b7c8d93', 'student', 4, NULL,  50, 0, 'active',  NULL),
('tch_e51823a6bf71c823dea0f5a6b7c8d9a4', 'teacher', NULL, 1, 200, 0, 'active',  NULL),
('tch_f62934b7c082d934efb1a6b7c8d9eab5', 'teacher', NULL, 2,  10, 0, 'active',  NULL);

-- ============================================================
--  QUICK VERIFICATION QUERIES (optional, run after import)
-- ============================================================
-- SELECT COUNT(*) FROM students;        -- 6
-- SELECT COUNT(*) FROM teachers;        -- 3
-- SELECT COUNT(*) FROM subjects;        -- 5
-- SELECT COUNT(*) FROM marks;           -- 16
-- SELECT COUNT(*) FROM api_keys;        -- 6
-- SELECT s.name, sb.name, m.total FROM marks m
--   JOIN students s ON s.id = m.student_id
--   JOIN subjects sb ON sb.id = m.subject_id;