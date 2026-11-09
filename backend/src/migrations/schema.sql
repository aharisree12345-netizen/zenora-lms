-- ============================================================================
-- ZENORA COLLEGE LMS – ACADEMIC MANAGEMENT SYSTEM
-- Relational MySQL Schema with Normalized Tables, Keys & Constraints
-- ============================================================================

-- 1. Departments
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    hod_name VARCHAR(150),
    contact_email VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Academic Years
CREATE TABLE IF NOT EXISTS academic_years (
    id VARCHAR(36) PRIMARY KEY,
    year_name VARCHAR(50) NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Batches / Classes
CREATE TABLE IF NOT EXISTS batches (
    id VARCHAR(36) PRIMARY KEY,
    department_id VARCHAR(36) NOT NULL,
    academic_year_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    semester INT NOT NULL,
    section VARCHAR(10) NOT NULL,
    shift VARCHAR(20) DEFAULT 'Regular',
    faculty_advisor_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

-- 4. Users (Admin, Faculty, Student)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    role ENUM('super_admin', 'institution_admin', 'faculty', 'student') NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    department_id VARCHAR(36),
    designation VARCHAR(100),
    avatar_url VARCHAR(500),
    status ENUM('active', 'suspended', 'graduated') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- 5. Student Profiles
CREATE TABLE IF NOT EXISTS student_profiles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    roll_no VARCHAR(50) NOT NULL UNIQUE,
    register_no VARCHAR(100) NOT NULL UNIQUE,
    batch_id VARCHAR(36) NOT NULL,
    admission_year INT DEFAULT 2024,
    admission_date DATE,
    date_of_birth DATE,
    guardian_name VARCHAR(150),
    guardian_phone VARCHAR(50),
    parent_name VARCHAR(150),
    parent_contact VARCHAR(50),
    phone_number VARCHAR(50),
    blood_group VARCHAR(10),
    address TEXT,
    current_semester INT DEFAULT 4,
    academic_year VARCHAR(50) DEFAULT '2025 - 2026',
    notes TEXT,
    status ENUM('active', 'suspended', 'graduated') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
);

-- 6. Subjects (Curriculum)
CREATE TABLE IF NOT EXISTS subjects (
    id VARCHAR(36) PRIMARY KEY,
    department_id VARCHAR(36) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    semester INT NOT NULL,
    credits INT DEFAULT 3,
    type ENUM('theory', 'practical', 'elective') DEFAULT 'theory',
    syllabus_url VARCHAR(500),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- 7. Faculty Subject Assignments
CREATE TABLE IF NOT EXISTS faculty_subject_assignments (
    id VARCHAR(36) PRIMARY KEY,
    faculty_id VARCHAR(36) NOT NULL,
    subject_id VARCHAR(36) NOT NULL,
    batch_id VARCHAR(36) NOT NULL,
    academic_year_id VARCHAR(36) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

-- 8. Student Subject Enrollments
CREATE TABLE IF NOT EXISTS student_subject_enrollments (
    id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    subject_id VARCHAR(36) NOT NULL,
    batch_id VARCHAR(36) NOT NULL,
    status ENUM('enrolled', 'completed', 'dropped') DEFAULT 'enrolled',
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_student_subject (student_id, subject_id),
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
);

-- 9. Exams (Core Academic Module)
CREATE TABLE IF NOT EXISTS exams (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    exam_type ENUM('Internal 1', 'Internal 2', 'Model Exam', 'Lab Practical', 'Semester Exam') DEFAULT 'Internal 1',
    subject_id VARCHAR(36) NOT NULL,
    batch_id VARCHAR(36) NOT NULL,
    academic_year_id VARCHAR(36),
    max_total_marks DECIMAL(6, 2) NOT NULL DEFAULT 50.00,
    exam_date DATE NOT NULL,
    duration_minutes INT DEFAULT 90,
    status ENUM('draft', 'published') DEFAULT 'draft',
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 10. Exam Questions & Split Pattern
CREATE TABLE IF NOT EXISTS exam_questions (
    id VARCHAR(36) PRIMARY KEY,
    exam_id VARCHAR(36) NOT NULL,
    question_number INT NOT NULL,
    question_label VARCHAR(50) NOT NULL,
    section_part VARCHAR(50) DEFAULT 'Part A',
    max_marks DECIMAL(5, 2) NOT NULL,
    topic_coverage VARCHAR(150),
    sort_order INT DEFAULT 1,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

-- 11. Exam Marks (Student Question Scores)
CREATE TABLE IF NOT EXISTS exam_marks (
    id VARCHAR(36) PRIMARY KEY,
    exam_id VARCHAR(36) NOT NULL,
    question_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    marks_obtained DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_exam_question_student (exam_id, question_id, student_id),
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES exam_questions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 12. Subject Materials (Syllabus, Notes, Resources)
CREATE TABLE IF NOT EXISTS subject_materials (
    id VARCHAR(36) PRIMARY KEY,
    subject_id VARCHAR(36) NOT NULL,
    batch_id VARCHAR(36),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category ENUM('syllabus', 'lecture_notes', 'reference_book', 'lab_manual', 'question_bank') DEFAULT 'lecture_notes',
    file_url VARCHAR(1000) NOT NULL,
    file_path VARCHAR(500),
    file_type VARCHAR(50) DEFAULT 'pdf',
    file_size VARCHAR(50),
    uploaded_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 12b. Syllabus & Notes Registry Table
CREATE TABLE IF NOT EXISTS syllabus_notes (
    id VARCHAR(36) PRIMARY KEY,
    subject_id VARCHAR(36),
    batch_id VARCHAR(36),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'lecture_notes',
    file_url VARCHAR(1000) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) DEFAULT 'pdf',
    file_size VARCHAR(50),
    uploaded_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 13. Assignments
CREATE TABLE IF NOT EXISTS assignments (
    id VARCHAR(36) PRIMARY KEY,
    subject_id VARCHAR(36) NOT NULL,
    batch_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description LONGTEXT NOT NULL,
    due_date TIMESTAMP NOT NULL,
    max_marks DECIMAL(5, 2) DEFAULT 20.00,
    attachment_url VARCHAR(1000),
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 14. Assignment Submissions & Evaluations
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id VARCHAR(36) PRIMARY KEY,
    assignment_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    submission_text LONGTEXT,
    attachment_url VARCHAR(1000),
    status ENUM('submitted', 'graded', 'late', 'resubmission_requested') DEFAULT 'submitted',
    marks_awarded DECIMAL(5, 2) DEFAULT NULL,
    feedback TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    graded_by VARCHAR(36),
    graded_at TIMESTAMP NULL,
    UNIQUE KEY uq_assignment_student (assignment_id, student_id),
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 15. Academic Announcements
CREATE TABLE IF NOT EXISTS academic_announcements (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content LONGTEXT NOT NULL,
    priority ENUM('normal', 'urgent', 'high') DEFAULT 'normal',
    target_type ENUM('college', 'department', 'batch', 'subject') DEFAULT 'college',
    department_id VARCHAR(36),
    batch_id VARCHAR(36),
    subject_id VARCHAR(36),
    posted_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 16. Academic Schedules / Timetable
CREATE TABLE IF NOT EXISTS academic_schedules (
    id VARCHAR(36) PRIMARY KEY,
    batch_id VARCHAR(36) NOT NULL,
    subject_id VARCHAR(36) NOT NULL,
    faculty_id VARCHAR(36) NOT NULL,
    day_of_week VARCHAR(20) NOT NULL,
    start_time VARCHAR(20) NOT NULL,
    end_time VARCHAR(20) NOT NULL,
    room_number VARCHAR(50) NOT NULL,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 16b. Synchronized Timetable Periods (Single Source of Truth)
CREATE TABLE IF NOT EXISTS timetable_periods (
    id VARCHAR(64) PRIMARY KEY,
    day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday') NOT NULL,
    start_time VARCHAR(20) NOT NULL,
    end_time VARCHAR(20) NOT NULL,
    department ENUM('CS', 'EC', 'ME') NOT NULL,
    semester ENUM('S1', 'S2', 'S3', 'S4', 'S5', 'S6') NOT NULL,
    academic_year ENUM('1st Year', '2nd Year', '3rd Year') NOT NULL,
    subject_code VARCHAR(30) NOT NULL,
    subject_name VARCHAR(255) NOT NULL,
    session_type ENUM('theory', 'lab') NOT NULL DEFAULT 'theory',
    room_no VARCHAR(100) NOT NULL,
    faculty_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 17. System Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('exam', 'assignment', 'grade', 'announcement', 'system') DEFAULT 'system',
    action_url VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 18. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(36),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ENTERPRISE SAAS & COURSE LIFECYCLE EXTENSIONS
-- ============================================================================

-- 19. Organizations (Multi-Tenancy)
CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    contact_email VARCHAR(255) NOT NULL,
    custom_domain VARCHAR(255),
    address TEXT,
    logo_url VARCHAR(500),
    status ENUM('active', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 20. Subscription Plans & Tiers
CREATE TABLE IF NOT EXISTS subscription_plans (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    max_students INT NOT NULL DEFAULT 150,
    max_courses INT NOT NULL DEFAULT 25,
    price DECIMAL(10, 2) DEFAULT 0.00,
    billing_cycle ENUM('monthly', 'yearly') DEFAULT 'monthly',
    features JSON,
    status ENUM('active', 'archived') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 21. Organization Subscriptions
CREATE TABLE IF NOT EXISTS organization_subscriptions (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    plan_id VARCHAR(36) NOT NULL,
    status ENUM('active', 'past_due', 'cancelled') DEFAULT 'active',
    start_date DATE NOT NULL,
    end_date DATE,
    auto_renew BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT
);

-- 22. Course Categories
CREATE TABLE IF NOT EXISTS course_categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 23. Courses (Enterprise LMS)
CREATE TABLE IF NOT EXISTS courses (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    instructor_id VARCHAR(36) NOT NULL,
    category_id VARCHAR(36),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    subtitle VARCHAR(500),
    description LONGTEXT,
    thumbnail_url VARCHAR(500),
    difficulty_level ENUM('beginner', 'intermediate', 'advanced', 'all_levels') DEFAULT 'all_levels',
    estimated_duration_hours DECIMAL(5, 2) DEFAULT 10.0,
    language VARCHAR(50) DEFAULT 'English',
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    visibility ENUM('public', 'restricted') DEFAULT 'public',
    price DECIMAL(10, 2) DEFAULT 0.00,
    is_free BOOLEAN DEFAULT TRUE,
    enrolment_mode ENUM('open', 'approval', 'invite') DEFAULT 'open',
    prerequisites TEXT,
    learning_objectives JSON,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES course_categories(id) ON DELETE SET NULL
);

-- 24. Course Curriculum Sections
CREATE TABLE IF NOT EXISTS course_sections (
    id VARCHAR(36) PRIMARY KEY,
    course_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 25. Lessons
CREATE TABLE IF NOT EXISTS lessons (
    id VARCHAR(36) PRIMARY KEY,
    section_id VARCHAR(36) NOT NULL,
    course_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content_type ENUM('video', 'audio', 'text', 'pdf') DEFAULT 'video',
    content_url VARCHAR(1000),
    content_body LONGTEXT,
    duration_minutes INT DEFAULT 15,
    is_preview BOOLEAN DEFAULT FALSE,
    is_mandatory BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES course_sections(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 26. Learning Materials
CREATE TABLE IF NOT EXISTS learning_materials (
    id VARCHAR(36) PRIMARY KEY,
    lesson_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    file_url VARCHAR(1000) NOT NULL,
    file_path VARCHAR(500),
    file_type VARCHAR(50) DEFAULT 'pdf',
    file_size_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

-- 27. Personal Notes & Bookmarks
CREATE TABLE IF NOT EXISTS lesson_notes (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    lesson_id VARCHAR(36) NOT NULL,
    course_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    timestamp_seconds INT DEFAULT 0,
    is_bookmark BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

-- 28. Lesson Progress
CREATE TABLE IF NOT EXISTS lesson_progress (
    id VARCHAR(36) PRIMARY KEY,
    enrolment_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    lesson_id VARCHAR(36) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    time_spent_seconds INT DEFAULT 0,
    completed_at TIMESTAMP NULL,
    UNIQUE KEY uq_user_lesson_progress (user_id, lesson_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

-- 29. Course Enrolments
CREATE TABLE IF NOT EXISTS enrolments (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    course_id VARCHAR(36) NOT NULL,
    enrolment_type ENUM('self', 'manual', 'bulk') DEFAULT 'self',
    status ENUM('active', 'completed', 'revoked', 'expired') DEFAULT 'active',
    access_start_date DATE NOT NULL,
    access_expiry_date DATE,
    completed_at TIMESTAMP NULL,
    progress_percentage INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_enrolment (user_id, course_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 30. Quizzes / Examinations
CREATE TABLE IF NOT EXISTS quizzes (
    id VARCHAR(36) PRIMARY KEY,
    course_id VARCHAR(36) NOT NULL,
    lesson_id VARCHAR(36),
    title VARCHAR(255) NOT NULL,
    instructions TEXT,
    time_limit_minutes INT DEFAULT 20,
    passing_percentage DECIMAL(5, 2) DEFAULT 70.00,
    max_attempts INT DEFAULT 3,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 31. Quiz Questions
CREATE TABLE IF NOT EXISTS quiz_questions (
    id VARCHAR(36) PRIMARY KEY,
    quiz_id VARCHAR(36) NOT NULL,
    question_text TEXT NOT NULL,
    question_type ENUM('mcq', 'multiple_select', 'true_false', 'short_answer', 'descriptive') DEFAULT 'mcq',
    points DECIMAL(5, 2) DEFAULT 10.00,
    explanation TEXT,
    sort_order INT DEFAULT 1,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- 32. Quiz Question Options
CREATE TABLE IF NOT EXISTS quiz_options (
    id VARCHAR(36) PRIMARY KEY,
    question_id VARCHAR(36) NOT NULL,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 1,
    FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
);

-- 33. Quiz Attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id VARCHAR(36) PRIMARY KEY,
    quiz_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    enrolment_id VARCHAR(36),
    attempt_number INT DEFAULT 1,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP NULL,
    time_spent_seconds INT DEFAULT 0,
    total_score DECIMAL(6, 2) DEFAULT 0.00,
    max_score DECIMAL(6, 2) DEFAULT 100.00,
    percentage DECIMAL(5, 2) DEFAULT 0.00,
    status ENUM('in_progress', 'completed', 'timed_out') DEFAULT 'in_progress',
    is_passed BOOLEAN DEFAULT FALSE,
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 34. Quiz Answers
CREATE TABLE IF NOT EXISTS quiz_answers (
    id VARCHAR(36) PRIMARY KEY,
    attempt_id VARCHAR(36) NOT NULL,
    question_id VARCHAR(36) NOT NULL,
    selected_option_id VARCHAR(36),
    answer_text TEXT,
    is_correct BOOLEAN DEFAULT FALSE,
    marks_awarded DECIMAL(5, 2) DEFAULT 0.00,
    FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
);

-- 35. Verifiable Digital Certificates
CREATE TABLE IF NOT EXISTS certificates (
    id VARCHAR(36) PRIMARY KEY,
    certificate_number VARCHAR(100) NOT NULL UNIQUE,
    verification_code VARCHAR(100) NOT NULL UNIQUE,
    crypto_hash VARCHAR(128) NOT NULL,
    organization_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    course_id VARCHAR(36) NOT NULL,
    enrolment_id VARCHAR(36),
    issue_date DATE NOT NULL,
    template_data JSON,
    file_url VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 36. Academic Events Calendar (Institutional Schedule & RBAC Events)
CREATE TABLE IF NOT EXISTS academic_events (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type ENUM('semester_exam', 'internal_exam', 'college_program', 'holiday', 'assignment_deadline') NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    target_department VARCHAR(100) DEFAULT 'ALL',
    target_semester VARCHAR(50) DEFAULT 'ALL',
    target_batch VARCHAR(100) DEFAULT 'ALL',
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 37. Academic Attendance Engine (Subject-wise & Daily Session Attendance)
CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    subject_id VARCHAR(36) NOT NULL,
    batch_id VARCHAR(36),
    department VARCHAR(50) DEFAULT 'CS',
    semester INT DEFAULT 4,
    faculty_id VARCHAR(36),
    date DATE NOT NULL,
    session_slot VARCHAR(50) DEFAULT 'Morning',
    status ENUM('present', 'absent', 'on_duty', 'late') NOT NULL DEFAULT 'present',
    remarks VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_student_subject_date (student_id, subject_id, date, session_slot),
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL,
    FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE SET NULL
);



