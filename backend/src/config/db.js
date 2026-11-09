const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config();

let pool = null;
let useFallbackStore = false;
let fallbackData = null;
const FALLBACK_DIR = path.join(__dirname, '../../data');
const FALLBACK_FILE = path.join(FALLBACK_DIR, 'zenora_lms.json');

// Ensure fallback data directory exists
if (!fs.existsSync(FALLBACK_DIR)) {
  fs.mkdirSync(FALLBACK_DIR, { recursive: true });
}

function loadFallbackData() {
  if (fs.existsSync(FALLBACK_FILE)) {
    try {
      const content = fs.readFileSync(FALLBACK_FILE, 'utf8');
      fallbackData = JSON.parse(content);
      ensureCollections();
      return;
    } catch (err) {
      console.warn('[DB Engine] Could not read fallback file, re-initializing.', err.message);
    }
  }
  fallbackData = {};
  ensureCollections();
  saveFallbackData();
}

function ensureCollections() {
  if (!fallbackData) fallbackData = {};
  const required = [
    'departments',
    'academic_years',
    'batches',
    'users',
    'faculty_profiles',
    'student_profiles',
    'subjects',
    'faculty_subject_assignments',
    'student_subject_enrollments',
    'exams',
    'exam_questions',
    'exam_marks',
    'subject_materials',
    'assignments',
    'assignment_submissions',
    'academic_announcements',
    'academic_schedules',
    'notifications',
    'organizations',
    'subscription_plans',
    'organization_subscriptions',
    'course_categories',
    'courses',
    'course_sections',
    'lessons',
    'learning_materials',
    'subject_materials',
    'syllabus_notes',
    'lesson_notes',
    'lesson_progress',
    'enrolments',
    'quizzes',
    'quiz_questions',
    'quiz_options',
    'quiz_attempts',
    'quiz_answers',
    'certificates',
    'audit_logs',
    'password_resets',
    'academic_events',
    'attendance',
    'timetable_periods'
  ];
  required.forEach(key => {
    if (!fallbackData[key]) {
      fallbackData[key] = [];
    }
  });

  // Seed default academic events if empty
  if (fallbackData.academic_events.length === 0) {
    fallbackData.academic_events = [
      {
        id: 'evt-01',
        title: 'Continuous Assessment Test (CAT-1)',
        description: 'Internal assessment test covering Units 1 & 2 across all semester core subjects. Detailed schedule available on department notice board.',
        event_type: 'internal_exam',
        start_date: '2026-10-12T09:30:00.000Z',
        end_date: '2026-10-17T16:30:00.000Z',
        target_department: 'ALL',
        target_batch: 'ALL',
        created_by: 'user-admin-01',
        created_at: '2026-10-01T09:00:00.000Z',
        updated_at: '2026-10-01T09:00:00.000Z'
      },
      {
        id: 'evt-02',
        title: 'Continuous Assessment Test (CAT-2)',
        description: 'Second internal assessment test covering Units 3 & 4. Mandatory attendance for internal mark consolidation and lab assessments.',
        event_type: 'internal_exam',
        start_date: '2026-11-09T09:30:00.000Z',
        end_date: '2026-11-14T16:30:00.000Z',
        target_department: 'ALL',
        target_batch: 'ALL',
        created_by: 'user-admin-01',
        created_at: '2026-10-05T10:00:00.000Z',
        updated_at: '2026-10-05T10:00:00.000Z'
      },
      {
        id: 'evt-03',
        title: 'Anna University End-Semester Theory Examinations',
        description: 'Autonomous & University Board End-Semester written examinations for Regulation 2021. Hall tickets mandatory.',
        event_type: 'semester_exam',
        start_date: '2026-11-23T10:00:00.000Z',
        end_date: '2026-12-08T17:00:00.000Z',
        target_department: 'ALL',
        target_batch: 'ALL',
        created_by: 'user-admin-01',
        created_at: '2026-10-05T10:30:00.000Z',
        updated_at: '2026-10-05T10:30:00.000Z'
      },
      {
        id: 'evt-04',
        title: 'Zenith 2026 - Inter-Collegiate Technical Symposium',
        description: 'Flagship technical symposium organized by the CSE & IT departments featuring Paper Presentations, Hackathons, Code Debugging, and Project Displays.',
        event_type: 'college_program',
        start_date: '2026-10-24T09:00:00.000Z',
        end_date: '2026-10-25T18:00:00.000Z',
        target_department: 'dept-cse-01',
        target_batch: 'ALL',
        created_by: 'user-faculty-01',
        created_at: '2026-10-08T11:00:00.000Z',
        updated_at: '2026-10-08T11:00:00.000Z'
      },
      {
        id: 'evt-05',
        title: 'Deepavali / Diwali Festival Break',
        description: 'College holiday on account of the Deepavali festival celebration.',
        event_type: 'holiday',
        start_date: '2026-11-01T00:00:00.000Z',
        end_date: '2026-11-02T23:59:59.000Z',
        target_department: 'ALL',
        target_batch: 'ALL',
        created_by: 'user-admin-01',
        created_at: '2026-10-01T08:00:00.000Z',
        updated_at: '2026-10-01T08:00:00.000Z'
      },
      {
        id: 'evt-06',
        title: 'Database Systems Lab Mini-Project Submission Deadline',
        description: 'Final deadline for submitting SQL scripts, ER diagrams, and normalization documentation for the DBMS Mini-Project.',
        event_type: 'assignment_deadline',
        start_date: '2026-10-30T17:00:00.000Z',
        end_date: '2026-10-30T23:59:00.000Z',
        target_department: 'dept-cse-01',
        target_batch: 'batch-cse-4a',
        created_by: 'user-faculty-01',
        created_at: '2026-10-15T14:20:00.000Z',
        updated_at: '2026-10-15T14:20:00.000Z'
      },
      {
        id: 'evt-07',
        title: 'National Education Day & Guest Lecture Series',
        description: 'Distinguished lecture on Next-Generation Generative AI in Engineering by Dr. R. Sundararajan, IIT Madras.',
        event_type: 'college_program',
        start_date: '2026-11-11T14:00:00.000Z',
        end_date: '2026-11-11T17:00:00.000Z',
        target_department: 'ALL',
        target_batch: 'ALL',
        created_by: 'user-faculty-01',
        created_at: '2026-10-18T16:00:00.000Z',
        updated_at: '2026-10-18T16:00:00.000Z'
      },
      {
        id: 'evt-08',
        title: 'End-Semester Practical Laboratory Examinations',
        description: 'External lab examinations and viva voce evaluation conducted with Anna University external examiners.',
        event_type: 'semester_exam',
        start_date: '2026-11-16T08:30:00.000Z',
        end_date: '2026-11-20T17:30:00.000Z',
        target_department: 'ALL',
        target_batch: 'ALL',
        created_by: 'user-admin-01',
        created_at: '2026-10-10T09:00:00.000Z',
        updated_at: '2026-10-10T09:00:00.000Z'
      }
    ];
  }

  // Seed default faculty profiles if empty
  if (fallbackData.faculty_profiles.length === 0) {
    fallbackData.faculty_profiles = [
      {
        id: 'prof-fac-01',
        user_id: 'user-faculty-01',
        staff_id: 'FAC-CSE-001',
        department_id: 'dept-cse-01',
        designation: 'Associate Professor & Class Advisor',
        qualification: 'M.E., Ph.D.',
        specialization: 'Database Systems & Cloud Architecture',
        status: 'active'
      },
      {
        id: 'prof-fac-02',
        user_id: 'user-faculty-02',
        staff_id: 'FAC-CSE-002',
        department_id: 'dept-cse-01',
        designation: 'Professor & Head of Department',
        qualification: 'Ph.D., Post-Doc',
        specialization: 'Design & Analysis of Algorithms',
        status: 'active'
      },
      {
        id: 'prof-fac-03',
        user_id: 'user-faculty-03',
        staff_id: 'FAC-CSE-003',
        department_id: 'dept-cse-01',
        designation: 'Assistant Professor (Mathematics)',
        qualification: 'M.Sc., M.Phil., Ph.D.',
        specialization: 'Probability, Graph Theory & Queuing Models',
        status: 'active'
      }
    ];
  }

  // Seed default academic attendance sessions if empty
  if (!fallbackData.attendance || fallbackData.attendance.length === 0) {
    fallbackData.attendance = [];
    const sessions = [
      { date: '2026-10-05', subject_id: 'sub-cs8491', faculty_id: 'user-faculty-02', session_slot: 'Period 1 (08:45 AM - 09:40 AM)' },
      { date: '2026-10-05', subject_id: 'sub-cs8492', faculty_id: 'user-faculty-01', session_slot: 'Period 2 (09:40 AM - 10:35 AM)' },
      { date: '2026-10-06', subject_id: 'sub-cs8493', faculty_id: 'user-faculty-01', session_slot: 'Period 1 (08:45 AM - 09:40 AM)' },
      { date: '2026-10-06', subject_id: 'sub-ma8402', faculty_id: 'user-faculty-03', session_slot: 'Period 2 (09:40 AM - 10:35 AM)' },
      { date: '2026-10-07', subject_id: 'sub-cs8481', faculty_id: 'user-faculty-01', session_slot: 'Lab Practical (01:30 PM - 04:30 PM)' },
      { date: '2026-10-07', subject_id: 'sub-cs8491', faculty_id: 'user-faculty-02', session_slot: 'Period 3 (10:50 AM - 11:45 AM)' },
      { date: '2026-10-08', subject_id: 'sub-cs8492', faculty_id: 'user-faculty-01', session_slot: 'Period 1 (08:45 AM - 09:40 AM)' },
      { date: '2026-10-08', subject_id: 'sub-cs8493', faculty_id: 'user-faculty-01', session_slot: 'Period 4 (11:45 AM - 12:40 PM)' },
      { date: '2026-10-09', subject_id: 'sub-ma8402', faculty_id: 'user-faculty-03', session_slot: 'Period 1 (08:45 AM - 09:40 AM)' },
      { date: '2026-10-09', subject_id: 'sub-cs8481', faculty_id: 'user-faculty-01', session_slot: 'Lab Session (01:30 PM - 03:30 PM)' },
      { date: '2026-10-12', subject_id: 'sub-cs8491', faculty_id: 'user-faculty-02', session_slot: 'Period 1 (08:45 AM - 09:40 AM)' },
      { date: '2026-10-12', subject_id: 'sub-cs8492', faculty_id: 'user-faculty-01', session_slot: 'Period 2 (09:40 AM - 10:35 AM)' },
      { date: '2026-10-13', subject_id: 'sub-cs8493', faculty_id: 'user-faculty-01', session_slot: 'Period 1 (08:45 AM - 09:40 AM)' },
      { date: '2026-10-13', subject_id: 'sub-ma8402', faculty_id: 'user-faculty-03', session_slot: 'Period 2 (09:40 AM - 10:35 AM)' },
      { date: '2026-10-14', subject_id: 'sub-cs8481', faculty_id: 'user-faculty-01', session_slot: 'Lab Practical (01:30 PM - 04:30 PM)' },
      { date: '2026-10-14', subject_id: 'sub-cs8491', faculty_id: 'user-faculty-02', session_slot: 'Period 4 (11:45 AM - 12:40 PM)' },
      { date: '2026-10-15', subject_id: 'sub-cs8492', faculty_id: 'user-faculty-01', session_slot: 'Period 1 (08:45 AM - 09:40 AM)' },
      { date: '2026-10-15', subject_id: 'sub-cs8493', faculty_id: 'user-faculty-01', session_slot: 'Period 3 (10:50 AM - 11:45 AM)' },
      { date: '2026-10-16', subject_id: 'sub-ma8402', faculty_id: 'user-faculty-03', session_slot: 'Period 1 (08:45 AM - 09:40 AM)' },
      { date: '2026-10-16', subject_id: 'sub-cs8481', faculty_id: 'user-faculty-01', session_slot: 'Lab Practical (01:30 PM - 04:30 PM)' },
      { date: '2026-10-19', subject_id: 'sub-cs8491', faculty_id: 'user-faculty-02', session_slot: 'Period 1 (08:45 AM - 09:40 AM)' },
      { date: '2026-10-19', subject_id: 'sub-cs8492', faculty_id: 'user-faculty-01', session_slot: 'Period 2 (09:40 AM - 10:35 AM)' },
      { date: '2026-10-20', subject_id: 'sub-cs8493', faculty_id: 'user-faculty-01', session_slot: 'Period 1 (08:45 AM - 09:40 AM)' },
      { date: '2026-10-21', subject_id: 'sub-ma8402', faculty_id: 'user-faculty-03', session_slot: 'Period 2 (09:40 AM - 10:35 AM)' },
      { date: '2026-10-22', subject_id: 'sub-cs8481', faculty_id: 'user-faculty-01', session_slot: 'Lab Practical (01:30 PM - 04:30 PM)' }
    ];

    // Seed for primary student user-student-01 (Alex Rivera: 24 present, 1 absent = 96.0%)
    sessions.forEach((s, idx) => {
      const isAbsent = (s.date === '2026-10-15' && s.subject_id === 'sub-cs8493');
      fallbackData.attendance.push({
        id: `att-seed-${idx + 1}`,
        student_id: 'user-student-01',
        subject_id: s.subject_id,
        batch_id: 'batch-cse-4a',
        faculty_id: s.faculty_id,
        date: s.date,
        session_slot: s.session_slot,
        status: isAbsent ? 'absent' : 'present',
        remarks: isAbsent ? 'Medical Leave application submitted' : 'Attended',
        created_at: `${s.date}T10:00:00.000Z`,
        updated_at: `${s.date}T10:00:00.000Z`
      });
    });
  }
}

function saveFallbackData() {
  if (fallbackData) {
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(fallbackData, null, 2), 'utf8');
  }
}

async function seedMySQLFromFallback(dbPool, data) {
  try {
    const conn = await dbPool.getConnection();
    try {
      // 1. Departments
      for (const d of (data.departments || [])) {
        await conn.query(
          `INSERT IGNORE INTO departments (id, name, code, hod_name, contact_email, description) VALUES (?, ?, ?, ?, ?, ?)`,
          [d.id, d.name, d.code, d.hod_name || null, d.contact_email || null, d.description || null]
        );
      }

      // 2. Academic Years
      for (const ay of (data.academic_years || [])) {
        await conn.query(
          `INSERT IGNORE INTO academic_years (id, year_name, start_date, end_date, is_current) VALUES (?, ?, ?, ?, ?)`,
          [ay.id, ay.year_name, ay.start_date, ay.end_date, ay.is_current ? 1 : 0]
        );
      }

      // 3. Batches
      for (const b of (data.batches || [])) {
        await conn.query(
          `INSERT IGNORE INTO batches (id, department_id, academic_year_id, name, semester, section, shift, faculty_advisor_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [b.id, b.department_id, b.academic_year_id, b.name, b.semester, b.section, b.shift || 'Regular', b.faculty_advisor_id || null]
        );
      }

      // 4. Users
      for (const u of (data.users || [])) {
        await conn.query(
          `INSERT IGNORE INTO users (id, role, name, email, password_hash, phone, department_id, designation, avatar_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [u.id, u.role === 'instructor' ? 'faculty' : u.role, u.name, u.email, u.password_hash, u.phone || null, u.department_id || null, u.designation || null, u.avatar_url || null, u.status || 'active']
        );
      }

      // 5. Student Profiles
      for (const sp of (data.student_profiles || [])) {
        await conn.query(
          `INSERT IGNORE INTO student_profiles (id, user_id, roll_no, register_no, batch_id, admission_year, admission_date, date_of_birth, guardian_name, guardian_phone, parent_name, parent_contact, phone_number, blood_group, address, current_semester, academic_year, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sp.id,
            sp.user_id,
            sp.roll_no,
            sp.register_no,
            sp.batch_id,
            sp.admission_year || 2024,
            sp.admission_date || null,
            sp.date_of_birth || null,
            sp.guardian_name || null,
            sp.guardian_phone || null,
            sp.parent_name || sp.guardian_name || null,
            sp.parent_contact || sp.guardian_phone || null,
            sp.phone_number || null,
            sp.blood_group || 'O+',
            sp.address || null,
            sp.current_semester || 4,
            sp.academic_year || '2025 - 2026',
            sp.notes || null,
            sp.status || 'active'
          ]
        );
      }

      // 6. Subjects
      for (const s of (data.subjects || [])) {
        await conn.query(
          `INSERT INTO subjects (id, department_id, code, name, semester, credits, type, syllabus_url, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE syllabus_url = VALUES(syllabus_url)`,
          [s.id, s.department_id, s.code, s.name, s.semester, s.credits || 3, s.type || 'theory', s.syllabus_url || null, s.description || null]
        );
      }

      // 7. Student Subject Enrollments
      for (const sse of (data.student_subject_enrollments || [])) {
        await conn.query(
          `INSERT IGNORE INTO student_subject_enrollments (id, student_id, subject_id, batch_id, status) VALUES (?, ?, ?, ?, ?)`,
          [sse.id, sse.student_id, sse.subject_id, sse.batch_id, sse.status || 'enrolled']
        );
      }

      // 8. Organizations & Subscriptions
      for (const org of (data.organizations || [])) {
        await conn.query(
          `INSERT IGNORE INTO organizations (id, name, slug, logo_url, custom_domain, address, contact_email, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [org.id, org.name, org.slug, org.logo_url || null, org.custom_domain || null, org.address || null, org.contact_email, org.status || 'active']
        );
      }
      for (const plan of (data.subscription_plans || [])) {
        await conn.query(
          `INSERT IGNORE INTO subscription_plans (id, name, code, max_students, max_courses, price, billing_cycle, features, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [plan.id, plan.name, plan.code, plan.max_students || 500, plan.max_courses || 50, plan.price || 0, plan.billing_cycle || 'monthly', typeof plan.features === 'string' ? plan.features : JSON.stringify(plan.features || []), plan.status || 'active']
        );
      }
      for (const sub of (data.organization_subscriptions || [])) {
        await conn.query(
          `INSERT IGNORE INTO organization_subscriptions (id, organization_id, plan_id, status, start_date, end_date, auto_renew) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [sub.id, sub.organization_id, sub.plan_id, sub.status || 'active', sub.start_date || '2026-01-01', sub.end_date || '2026-12-31', sub.auto_renew ? 1 : 0]
        );
      }

      // 9. Course Categories & Courses
      for (const cat of (data.course_categories || [])) {
        await conn.query(
          `INSERT IGNORE INTO course_categories (id, name, slug, icon, description, status) VALUES (?, ?, ?, ?, ?, ?)`,
          [cat.id, cat.name, cat.slug, cat.icon || null, cat.description || null, cat.status || 'active']
        );
      }
      for (const c of (data.courses || [])) {
        await conn.query(
          `INSERT IGNORE INTO courses (id, organization_id, instructor_id, category_id, title, slug, subtitle, description, thumbnail_url, difficulty_level, estimated_duration_hours, language, status, visibility, price, is_free, enrolment_mode, prerequisites, learning_objectives, start_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            c.id, c.organization_id || 'org-apex-01', c.instructor_id || 'user-faculty-01', c.category_id || null,
            c.title, c.slug, c.subtitle || null, c.description || null, c.thumbnail_url || null,
            c.difficulty_level || 'all_levels', c.estimated_duration_hours || 10, c.language || 'English',
            c.status || 'published', c.visibility || 'public', c.price || 0, c.is_free ? 1 : 0,
            c.enrolment_mode || 'open', c.prerequisites || null, typeof c.learning_objectives === 'string' ? c.learning_objectives : JSON.stringify(c.learning_objectives || []),
            c.start_date || '2026-01-01'
          ]
        );
      }

      // 10. Course Sections & Lessons
      for (const sec of (data.course_sections || [])) {
        await conn.query(
          `INSERT IGNORE INTO course_sections (id, course_id, title, description, sort_order, is_mandatory) VALUES (?, ?, ?, ?, ?, ?)`,
          [sec.id, sec.course_id, sec.title, sec.description || null, sec.sort_order || 1, sec.is_mandatory !== false ? 1 : 0]
        );
      }
      for (const l of (data.lessons || [])) {
        await conn.query(
          `INSERT INTO lessons (id, section_id, course_id, title, description, content_type, content_url, content_body, duration_minutes, is_preview, is_mandatory, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE content_url = VALUES(content_url)`,
          [
            l.id, l.section_id, l.course_id, l.title, l.description || null, l.content_type || 'video',
            l.content_url || null, l.content_body || null, l.duration_minutes || 15,
            l.is_preview ? 1 : 0, l.is_mandatory !== false ? 1 : 0, l.sort_order || 1
          ]
        );
      }
      for (const mat of (data.learning_materials || [])) {
        await conn.query(
          `INSERT INTO learning_materials (id, lesson_id, title, file_url, file_path, file_type, file_size_bytes) VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE file_url = VALUES(file_url), file_path = VALUES(file_path), title = VALUES(title)`,
          [mat.id, mat.lesson_id, mat.title, mat.file_url, mat.file_path || mat.file_url, mat.file_type || 'pdf', mat.file_size_bytes || 0]
        );
      }
      for (const sm of (data.subject_materials || [])) {
        await conn.query(
          `INSERT INTO subject_materials (id, subject_id, batch_id, title, description, category, file_url, file_path, file_type, file_size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE file_url = VALUES(file_url), file_path = VALUES(file_path), title = VALUES(title)`,
          [sm.id, sm.subject_id, sm.batch_id || null, sm.title, sm.description || null, sm.category || 'lecture_notes', sm.file_url, sm.file_path || sm.file_url, sm.file_type || 'pdf', sm.file_size || null, sm.uploaded_by || 'user-faculty-01']
        );
      }
      for (const sn of (data.syllabus_notes || data.subject_materials || [])) {
        await conn.query(
          `INSERT INTO syllabus_notes (id, subject_id, batch_id, title, description, category, file_url, file_path, file_type, file_size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE file_url = VALUES(file_url), file_path = VALUES(file_path), title = VALUES(title)`,
          [sn.id, sn.subject_id || null, sn.batch_id || null, sn.title, sn.description || null, sn.category || 'lecture_notes', sn.file_url, sn.file_path || sn.file_url, sn.file_type || 'pdf', sn.file_size || null, sn.uploaded_by || 'user-faculty-01']
        );
      }

      // 11. Quizzes, Questions & Options
      for (const q of (data.quizzes || [])) {
        await conn.query(
          `INSERT IGNORE INTO quizzes (id, course_id, lesson_id, title, instructions, time_limit_minutes, passing_percentage, randomize_questions, randomize_options, max_attempts, is_published, available_from, available_until) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            q.id, q.course_id, q.lesson_id || null, q.title, q.instructions || '',
            q.time_limit_minutes || 30, q.passing_percentage || 60,
            q.randomize_questions ? 1 : 0, q.randomize_options ? 1 : 0,
            q.max_attempts || 3, q.is_published !== false ? 1 : 0,
            q.available_from || '2026-01-01T00:00:00Z', q.available_until || null
          ]
        );
      }
      for (const qq of (data.quiz_questions || [])) {
        await conn.query(
          `INSERT IGNORE INTO quiz_questions (id, quiz_id, question_text, question_type, points, explanation, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [qq.id, qq.quiz_id, qq.question_text, qq.question_type || 'mcq', qq.points || 10, qq.explanation || null, qq.sort_order || 1]
        );
      }
      for (const qo of (data.quiz_options || [])) {
        await conn.query(
          `INSERT IGNORE INTO quiz_options (id, question_id, option_text, is_correct, sort_order) VALUES (?, ?, ?, ?, ?)`,
          [qo.id, qo.question_id, qo.option_text, qo.is_correct ? 1 : 0, qo.sort_order || 1]
        );
      }

      // 12. Certificates & Enrolments
      for (const cert of (data.certificates || [])) {
        await conn.query(
          `INSERT IGNORE INTO certificates (id, user_id, course_id, organization_id, certificate_number, verification_code, issue_date, expiry_date, status, template_data, crypto_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cert.id, cert.user_id, cert.course_id, cert.organization_id || 'org-apex-01',
            cert.certificate_number, cert.verification_code, cert.issue_date || '2026-03-01',
            cert.expiry_date || null, cert.status || 'active',
            typeof cert.template_data === 'string' ? cert.template_data : JSON.stringify(cert.template_data || {}),
            cert.crypto_hash || null
          ]
        );
      }
      for (const e of (data.enrolments || [])) {
        await conn.query(
          `INSERT IGNORE INTO enrolments (id, user_id, course_id, organization_id, status, access_start_date, access_expiry_date, progress_percentage, last_accessed_at, completed_at, certificate_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            e.id, e.user_id, e.course_id, e.organization_id || 'org-apex-01', e.status || 'active',
            e.access_start_date || '2026-01-01', e.access_expiry_date || null, e.progress_percentage || 0,
            e.last_accessed_at || null, e.completed_at || null, e.certificate_id || null
          ]
        );
      }

      // 13. Attendance Records
      for (const att of (data.attendance || [])) {
        await conn.query(
          `INSERT IGNORE INTO attendance (id, student_id, subject_id, batch_id, faculty_id, date, session_slot, status, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [att.id, att.student_id, att.subject_id, att.batch_id, att.faculty_id, att.date, att.session_slot || 'Morning', att.status, att.remarks || null]
        );
      }

      // 14. Synchronized Timetable Periods
      for (const tp of (data.timetable_periods || [])) {
        await conn.query(
          `INSERT IGNORE INTO timetable_periods (id, day_of_week, start_time, end_time, department, semester, academic_year, subject_code, subject_name, session_type, room_no, faculty_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [tp.id, tp.day_of_week, tp.start_time, tp.end_time, tp.department, tp.semester, tp.academic_year, tp.subject_code, tp.subject_name, tp.session_type, tp.room_no, tp.faculty_id]
        );
      }

      console.log('[Database] MySQL initial academic seed completed successfully.');
    } finally {
      conn.release();
    }
  } catch (err) {
    console.warn('[Database] MySQL seeding warning:', err.message);
  }
}

async function initDatabase() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '3306', 10);
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'zenora_lms';

  try {
    console.log(`[Database] Attempting connection to MySQL at ${dbHost}:${dbPort}...`);
    const connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      connectTimeout: 2000
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.end();

    pool = mysql.createPool({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 15,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });

    // Run schema migrations
    const schemaPath = path.join(__dirname, '../migrations/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      const statements = schemaSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      const conn = await pool.getConnection();
      try {
        for (const statement of statements) {
          await conn.query(statement);
        }
        console.log('[Database] MySQL tables and schema verified successfully.');
      } finally {
        conn.release();
      }
    }

    // Check if MySQL users table is populated
    try {
      const [userRows] = await pool.query('SELECT COUNT(*) AS cnt FROM users');
      if (userRows[0].cnt === 0) {
        console.log('[Database] MySQL users table is empty. Populating with initial academic data...');
        loadFallbackData();
        await seedMySQLFromFallback(pool, fallbackData);
      }
    } catch (seedErr) {
      console.warn('[Database] Could not verify/seed initial MySQL data:', seedErr.message);
    }

    useFallbackStore = false;
    console.log(`[Database] Connected to MySQL database "${dbName}" successfully.`);
    return true;
  } catch (err) {
    console.warn(`[Database] MySQL not reachable (${err.message}).`);
    console.log('[Database] Activating integrated relational fallback engine with full College LMS schema.');
    useFallbackStore = true;
    loadFallbackData();
    return false;
  }
}

// Universal Query Interface supporting both MySQL and Local Relational Engine
async function query(sql, params = []) {
  if (!useFallbackStore && pool) {
    try {
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch (err) {
      console.error('[MySQL Error]', err.message, 'SQL:', sql);
      throw err;
    }
  }

  loadFallbackData();
  const lowerSql = sql.trim().toLowerCase();

  // Basic SELECT handling
  if (lowerSql.startsWith('select')) {
    const tableMatch = sql.match(/from\s+([a-zA-Z_]+)/i);
    if (!tableMatch) return [];
    const table = tableMatch[1].toLowerCase();
    let records = [...(fallbackData[table] || [])];

    if (sql.includes('WHERE') || sql.includes('where')) {
      const wherePart = sql.split(/WHERE/i)[1].split(/ORDER|LIMIT|GROUP/i)[0].trim();
      records = records.filter(item => {
        let match = true;
        let pIdx = 0;
        if (wherePart.includes('email =') && params[pIdx] !== undefined) {
          match = match && (item.email === params[pIdx++]);
        }
        if (wherePart.includes('id =') && params[pIdx] !== undefined) {
          match = match && (item.id === params[pIdx++]);
        }
        if (wherePart.includes('user_id =') && params[pIdx] !== undefined) {
          match = match && (item.user_id === params[pIdx++]);
        }
        if (wherePart.includes('department_id =') && params[pIdx] !== undefined) {
          match = match && (item.department_id === params[pIdx++]);
        }
        if (wherePart.includes('batch_id =') && params[pIdx] !== undefined) {
          match = match && (item.batch_id === params[pIdx++]);
        }
        if (wherePart.includes('subject_id =') && params[pIdx] !== undefined) {
          match = match && (item.subject_id === params[pIdx++]);
        }
        if (wherePart.includes('exam_id =') && params[pIdx] !== undefined) {
          match = match && (item.exam_id === params[pIdx++]);
        }
        if (wherePart.includes('role =') && params[pIdx] !== undefined) {
          match = match && (item.role === params[pIdx++]);
        }
        if (wherePart.includes('status =') && params[pIdx] !== undefined) {
          match = match && (item.status === params[pIdx++]);
        }
        return match;
      });
    }

    if (lowerSql.includes('order by')) {
      if (lowerSql.includes('created_at desc')) {
        records.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      } else if (lowerSql.includes('sort_order asc') || lowerSql.includes('question_number asc')) {
        records.sort((a, b) => (a.question_number || a.sort_order || 0) - (b.question_number || b.sort_order || 0));
      }
    }

    return records;
  }

  // INSERT handling
  if (lowerSql.startsWith('insert into')) {
    const match = sql.match(/insert into\s+([a-zA-Z_]+)\s*\(([^)]+)\)\s*values/i);
    if (match) {
      const table = match[1].toLowerCase();
      const columns = match[2].split(',').map(c => c.trim());
      const newObj = {};
      columns.forEach((col, idx) => {
        newObj[col] = params[idx] !== undefined ? params[idx] : null;
      });
      if (!newObj.created_at) newObj.created_at = new Date().toISOString();
      if (!newObj.updated_at) newObj.updated_at = new Date().toISOString();

      if (!fallbackData[table]) fallbackData[table] = [];
      fallbackData[table].push(newObj);
      saveFallbackData();
      return { insertId: newObj.id, affectedRows: 1 };
    }
  }

  // UPDATE handling
  if (lowerSql.startsWith('update')) {
    const match = sql.match(/update\s+([a-zA-Z_]+)\s+set/i);
    if (match) {
      const table = match[1].toLowerCase();
      const id = params[params.length - 1];
      const items = fallbackData[table] || [];
      const item = items.find(i => i.id === id);
      if (item) {
        item.updated_at = new Date().toISOString();
        saveFallbackData();
        return { affectedRows: 1 };
      }
    }
  }

  // DELETE handling
  if (lowerSql.startsWith('delete from')) {
    const match = sql.match(/delete from\s+([a-zA-Z_]+)\s+where\s+id\s*=\s*\?/i);
    if (match) {
      const table = match[1].toLowerCase();
      const id = params[0];
      if (fallbackData[table]) {
        const initialLen = fallbackData[table].length;
        fallbackData[table] = fallbackData[table].filter(i => i.id !== id);
        saveFallbackData();
        return { affectedRows: initialLen - fallbackData[table].length };
      }
    }
  }

  return [];
}

/**
 * Universal User Finder for Login: Validates email, student roll number, university register number, or faculty staff ID
 * Directly queries MySQL users table joined with student_profiles & faculty_profiles, or falls back to integrated store.
 */
async function findUserForLogin(identifier) {
  const target = (identifier || '').trim();
  if (!target) return null;

  if (!useFallbackStore && pool) {
    try {
      const sql = `
        SELECT u.id, u.role, u.name, u.email, u.password_hash, u.phone, u.department_id,
               u.designation, u.avatar_url, u.status, u.created_at,
               sp.id AS profile_id, sp.roll_no, sp.register_no, sp.batch_id,
               sp.admission_year, sp.guardian_name, sp.guardian_phone, sp.blood_group,
               fp.id AS faculty_profile_id, fp.staff_id, fp.qualification, fp.specialization,
               d.name AS department_name, d.code AS department_code,
               b.name AS batch_name, b.semester, b.section
        FROM users u
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        LEFT JOIN faculty_profiles fp ON fp.user_id = u.id
        LEFT JOIN departments d ON d.id = u.department_id
        LEFT JOIN batches b ON b.id = sp.batch_id
        WHERE LOWER(TRIM(u.email)) = LOWER(?)
           OR LOWER(TRIM(sp.roll_no)) = LOWER(?)
           OR LOWER(TRIM(sp.register_no)) = LOWER(?)
           OR LOWER(TRIM(fp.staff_id)) = LOWER(?)
        LIMIT 1;
      `;
      const [rows] = await pool.query(sql, [target, target, target, target]);
      if (rows && rows.length > 0) {
        return rows[0];
      }
    } catch (err) {
      console.error('[MySQL findUserForLogin Error]', err.message);
    }
  }

  // Fallback engine lookup
  loadFallbackData();
  const lower = target.toLowerCase();
  let user = (fallbackData.users || []).find(u => u.email && u.email.trim().toLowerCase() === lower);
  let profile = null;
  let facProfile = null;

  if (!user) {
    profile = (fallbackData.student_profiles || []).find(
      p => (p.roll_no && p.roll_no.trim().toLowerCase() === lower) ||
           (p.register_no && p.register_no.trim().toLowerCase() === lower)
    );
    if (profile) {
      user = (fallbackData.users || []).find(u => u.id === profile.user_id);
    }
  }

  if (!user) {
    facProfile = (fallbackData.faculty_profiles || []).find(
      fp => fp.staff_id && fp.staff_id.trim().toLowerCase() === lower
    );
    if (facProfile) {
      user = (fallbackData.users || []).find(u => u.id === facProfile.user_id);
    }
  }

  if (!user) return null;

  if (!profile && user.role === 'student') {
    profile = (fallbackData.student_profiles || []).find(p => p.user_id === user.id);
  }
  if (!facProfile && (user.role === 'faculty' || user.role === 'instructor')) {
    facProfile = (fallbackData.faculty_profiles || []).find(fp => fp.user_id === user.id);
  }

  const dept = (fallbackData.departments || []).find(d => d.id === user.department_id);
  const batch = profile ? (fallbackData.batches || []).find(b => b.id === profile.batch_id) : null;

  return {
    ...user,
    profile_id: profile ? profile.id : null,
    roll_no: profile ? profile.roll_no : null,
    register_no: profile ? profile.register_no : null,
    batch_id: profile ? profile.batch_id : null,
    admission_year: profile ? profile.admission_year : null,
    guardian_name: profile ? profile.guardian_name : null,
    guardian_phone: profile ? profile.guardian_phone : null,
    blood_group: profile ? profile.blood_group : null,
    faculty_profile_id: facProfile ? facProfile.id : null,
    staff_id: facProfile ? facProfile.staff_id : null,
    qualification: facProfile ? facProfile.qualification : null,
    specialization: facProfile ? facProfile.specialization : null,
    department_name: dept ? dept.name : 'Engineering & Technology',
    department_code: dept ? dept.code : 'ENG',
    batch_name: batch ? batch.name : 'Class 2024-2028',
    semester: batch ? batch.semester : 4,
    section: batch ? batch.section : 'A'
  };
}

/**
 * Universal User & Profile Lookup by User ID
 */
async function getUserWithProfileById(userId) {
  if (!userId) return null;

  if (!useFallbackStore && pool) {
    try {
      const sql = `
        SELECT u.id, u.role, u.name, u.email, u.password_hash, u.phone, u.department_id,
               u.designation, u.avatar_url, u.status, u.created_at,
               sp.id AS profile_id, sp.roll_no, sp.register_no, sp.batch_id,
               sp.admission_year, sp.admission_date, sp.date_of_birth,
               sp.guardian_name, sp.guardian_phone, sp.parent_name, sp.parent_contact,
               sp.phone_number, sp.blood_group, sp.address, sp.current_semester,
               sp.academic_year, sp.notes,
               fp.id AS faculty_profile_id, fp.staff_id, fp.qualification, fp.specialization,
               d.name AS department_name, d.code AS department_code,
               b.name AS batch_name, b.semester, b.section
        FROM users u
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        LEFT JOIN faculty_profiles fp ON fp.user_id = u.id
        LEFT JOIN departments d ON d.id = u.department_id
        LEFT JOIN batches b ON b.id = sp.batch_id
        WHERE u.id = ?
        LIMIT 1;
      `;
      const [rows] = await pool.query(sql, [userId]);
      if (rows && rows.length > 0) {
        return rows[0];
      }
    } catch (err) {
      console.error('[MySQL getUserWithProfileById Error]', err.message);
    }
  }

  loadFallbackData();
  const user = (fallbackData.users || []).find(u => u.id === userId);
  if (!user) return null;

  const profile = (fallbackData.student_profiles || []).find(p => p.user_id === user.id);
  const facProfile = (fallbackData.faculty_profiles || []).find(fp => fp.user_id === user.id);
  const dept = (fallbackData.departments || []).find(d => d.id === user.department_id);
  const batch = profile ? (fallbackData.batches || []).find(b => b.id === profile.batch_id) : null;

  return {
    ...user,
    profile_id: profile ? profile.id : null,
    roll_no: profile ? profile.roll_no : null,
    register_no: profile ? profile.register_no : null,
    batch_id: profile ? profile.batch_id : null,
    admission_year: profile ? (profile.admission_year || 2024) : null,
    admission_date: profile ? profile.admission_date : null,
    date_of_birth: profile ? profile.date_of_birth : null,
    guardian_name: profile ? (profile.parent_name || profile.guardian_name) : null,
    parent_name: profile ? (profile.parent_name || profile.guardian_name) : null,
    guardian_phone: profile ? (profile.parent_contact || profile.guardian_phone) : null,
    parent_contact: profile ? (profile.parent_contact || profile.guardian_phone) : null,
    phone_number: user.phone || (profile ? profile.phone_number : null),
    blood_group: profile ? profile.blood_group : null,
    address: profile ? profile.address : null,
    current_semester: profile ? (profile.current_semester || (batch ? batch.semester : 4)) : 4,
    academic_year: profile ? (profile.academic_year || '2025 - 2026') : '2025 - 2026',
    notes: profile ? (profile.notes || profile.remarks) : null,
    remarks: profile ? (profile.notes || profile.remarks) : null,
    faculty_profile_id: facProfile ? facProfile.id : null,
    staff_id: facProfile ? facProfile.staff_id : null,
    qualification: facProfile ? facProfile.qualification : null,
    specialization: facProfile ? facProfile.specialization : null,
    department_name: dept ? dept.name : 'Engineering & Technology',
    department_code: dept ? dept.code : 'ENG',
    batch_name: batch ? batch.name : 'Class 2024-2028',
    semester: batch ? batch.semester : 4,
    section: batch ? batch.section : 'A'
  };
}

/**
 * Check unique constraints
 */
async function checkEmailExists(email) {
  const target = (email || '').toLowerCase().trim();
  if (!useFallbackStore && pool) {
    try {
      const [rows] = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [target]);
      if (rows && rows.length > 0) return true;
    } catch (e) {}
  }
  loadFallbackData();
  return (fallbackData.users || []).some(u => u.email && u.email.toLowerCase() === target);
}

async function checkRollNoExists(rollNo) {
  const target = (rollNo || '').toLowerCase().trim();
  if (!useFallbackStore && pool) {
    try {
      const [rows] = await pool.query('SELECT id FROM student_profiles WHERE LOWER(roll_no) = LOWER(?) LIMIT 1', [target]);
      if (rows && rows.length > 0) return true;
    } catch (e) {}
  }
  loadFallbackData();
  return (fallbackData.student_profiles || []).some(p => p.roll_no && p.roll_no.toLowerCase() === target);
}

async function checkRegNoExists(regNo) {
  const target = (regNo || '').toLowerCase().trim();
  if (!useFallbackStore && pool) {
    try {
      const [rows] = await pool.query('SELECT id FROM student_profiles WHERE LOWER(register_no) = LOWER(?) LIMIT 1', [target]);
      if (rows && rows.length > 0) return true;
    } catch (e) {}
  }
  loadFallbackData();
  return (fallbackData.student_profiles || []).some(p => p.register_no && p.register_no.toLowerCase() === target);
}

/**
 * Insert new Student into MySQL and keep fallback synced
 */
async function insertStudentUser({ user, profile, enrollments = [] }) {
  if (!useFallbackStore && pool) {
    try {
      // 1. Insert into users
      await pool.query(
        `INSERT INTO users (id, role, name, email, password_hash, phone, department_id, designation, avatar_url, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          user.role || 'student',
          user.name,
          user.email,
          user.password_hash,
          user.phone || null,
          user.department_id || null,
          user.designation || 'Student',
          user.avatar_url || null,
          user.status || 'active'
        ]
      );

      // 2. Insert into student_profiles
      if (profile) {
        await pool.query(
          `INSERT INTO student_profiles (id, user_id, roll_no, register_no, batch_id, admission_year, guardian_name, guardian_phone, blood_group, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            profile.id,
            profile.user_id,
            profile.roll_no,
            profile.register_no,
            profile.batch_id,
            profile.admission_year || 2024,
            profile.guardian_name || null,
            profile.guardian_phone || null,
            profile.blood_group || 'O+',
            profile.status || 'active'
          ]
        );
      }

      // 3. Insert subject enrollments
      if (enrollments && enrollments.length > 0) {
        for (const e of enrollments) {
          await pool.query(
            `INSERT IGNORE INTO student_subject_enrollments (id, student_id, subject_id, batch_id, status)
             VALUES (?, ?, ?, ?, ?)`,
            [e.id, e.student_id, e.subject_id, e.batch_id, e.status || 'enrolled']
          );
        }
      }
    } catch (err) {
      console.error('[MySQL insertStudentUser Error]', err.message);
      throw err;
    }
  }

  // Always keep fallback data updated
  loadFallbackData();
  if (!fallbackData.users) fallbackData.users = [];
  if (!fallbackData.student_profiles) fallbackData.student_profiles = [];
  if (!fallbackData.student_subject_enrollments) fallbackData.student_subject_enrollments = [];

  // Deduplicate before pushing
  fallbackData.users = fallbackData.users.filter(u => u.id !== user.id && u.email !== user.email);
  fallbackData.users.push(user);

  if (profile) {
    fallbackData.student_profiles = fallbackData.student_profiles.filter(p => p.id !== profile.id && p.user_id !== profile.user_id);
    fallbackData.student_profiles.push(profile);
  }

  if (enrollments && enrollments.length > 0) {
    enrollments.forEach(e => {
      if (!fallbackData.student_subject_enrollments.some(s => s.student_id === e.student_id && s.subject_id === e.subject_id)) {
        fallbackData.student_subject_enrollments.push(e);
      }
    });
  }

  saveFallbackData();
  return true;
}

/**
 * Check if Staff ID exists
 */
async function checkStaffIdExists(staffId) {
  const target = (staffId || '').toLowerCase().trim();
  if (!useFallbackStore && pool) {
    try {
      const [rows] = await pool.query('SELECT id FROM faculty_profiles WHERE LOWER(staff_id) = LOWER(?) LIMIT 1', [target]);
      if (rows && rows.length > 0) return true;
    } catch (e) {}
  }
  loadFallbackData();
  return (fallbackData.faculty_profiles || []).some(fp => fp.staff_id && fp.staff_id.toLowerCase() === target);
}

/**
 * Insert new Faculty member into MySQL and keep fallback synced
 */
async function insertFacultyUser({ user, profile }) {
  if (!useFallbackStore && pool) {
    try {
      await pool.query(
        `INSERT INTO users (id, role, name, email, password_hash, phone, department_id, designation, avatar_url, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          'faculty',
          user.name,
          user.email,
          user.password_hash,
          user.phone || null,
          user.department_id || null,
          user.designation || profile?.designation || 'Assistant Professor',
          user.avatar_url || null,
          user.status || 'active'
        ]
      );

      if (profile) {
        await pool.query(
          `INSERT INTO faculty_profiles (id, user_id, staff_id, department_id, designation, qualification, specialization, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            profile.id,
            profile.user_id,
            profile.staff_id,
            profile.department_id,
            profile.designation,
            profile.qualification || 'M.Tech, Ph.D.',
            profile.specialization || '',
            profile.status || 'active'
          ]
        );
      }
    } catch (err) {
      console.error('[MySQL insertFacultyUser Error]', err.message);
      throw err;
    }
  }

  loadFallbackData();
  if (!fallbackData.users) fallbackData.users = [];
  if (!fallbackData.faculty_profiles) fallbackData.faculty_profiles = [];

  fallbackData.users = fallbackData.users.filter(u => u.id !== user.id && u.email !== user.email);
  fallbackData.users.push(user);

  if (profile) {
    fallbackData.faculty_profiles = fallbackData.faculty_profiles.filter(p => p.id !== profile.id && p.user_id !== profile.user_id);
    fallbackData.faculty_profiles.push(profile);
  }

  saveFallbackData();
  return true;
}

/**
 * Update user password hash
 */
async function updateUserPassword(userId, passwordHash) {
  if (!useFallbackStore && pool) {
    try {
      await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
    } catch (err) {
      console.error('[MySQL updateUserPassword Error]', err.message);
    }
  }

  loadFallbackData();
  const u = (fallbackData.users || []).find(user => user.id === userId);
  if (u) {
    u.password_hash = passwordHash;
    saveFallbackData();
    return true;
  }
  return false;
}

/**
 * Create a password reset verification code with expiry and password_reset_token
 */
async function createPasswordReset(identifier, resetCode, resetToken = null) {
  const token = resetToken || crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const expiresIso = expiresAt.toISOString();
  const lower = (identifier || '').toLowerCase().trim();

  // If MySQL pool is active:
  if (!useFallbackStore && pool) {
    try {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS password_resets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          identifier VARCHAR(255) NOT NULL,
          code VARCHAR(10) NOT NULL,
          token VARCHAR(64),
          expires_at DATETIME NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX(identifier)
        )`
      );
      await pool.query('DELETE FROM password_resets WHERE identifier = ?', [lower]);
      await pool.query(
        'INSERT INTO password_resets (identifier, code, token, expires_at) VALUES (?, ?, ?, ?)',
        [lower, String(resetCode).trim(), token, expiresAt]
      );
    } catch (err) {
      console.warn('[MySQL createPasswordReset Warning]', err.message);
    }
  }

  loadFallbackData();
  if (!fallbackData.password_resets) fallbackData.password_resets = [];

  // Filter out any expired or previous resets for this identifier
  fallbackData.password_resets = fallbackData.password_resets.filter(r => r.identifier !== lower);

  fallbackData.password_resets.push({
    identifier: lower,
    code: String(resetCode).trim(),
    password_reset_token: token,
    expires_at: expiresIso,
    created_at: new Date().toISOString()
  });

  // Also update user record with password_reset_token
  const user = (fallbackData.users || []).find(u => (u.email && u.email.toLowerCase() === lower));
  if (user) {
    user.password_reset_token = token;
    user.password_reset_code = String(resetCode).trim();
    user.password_reset_expires = expiresIso;
  }

  saveFallbackData();
  return { token, expires_at: expiresIso };
}

/**
 * Verify and consume a password reset code
 */
async function verifyResetCode(identifier, resetCode) {
  const lower = (identifier || '').toLowerCase().trim();
  const inputCode = String(resetCode).trim();
  const now = new Date();

  // Check MySQL if active
  if (!useFallbackStore && pool) {
    try {
      const [rows] = await pool.query(
        'SELECT id, token, expires_at FROM password_resets WHERE identifier = ? AND code = ? AND expires_at > NOW() LIMIT 1',
        [lower, inputCode]
      );
      if (rows && rows.length > 0) {
        await pool.query('DELETE FROM password_resets WHERE identifier = ?', [lower]);
        return true;
      }
    } catch (err) {
      console.warn('[MySQL verifyResetCode Warning]', err.message);
    }
  }

  loadFallbackData();
  const matchIdx = (fallbackData.password_resets || []).findIndex(
    r => (r.identifier === lower || (r.email && r.email.toLowerCase() === lower)) &&
         String(r.code).trim() === inputCode &&
         new Date(r.expires_at) > now
  );

  if (matchIdx !== -1) {
    // Invalidate code upon successful verification
    fallbackData.password_resets.splice(matchIdx, 1);

    // Clear password_reset_token from user
    const user = (fallbackData.users || []).find(u => (u.email && u.email.toLowerCase() === lower));
    if (user) {
      delete user.password_reset_token;
      delete user.password_reset_code;
      delete user.password_reset_expires;
    }

    saveFallbackData();
    return true;
  }
  return false;
}

/**
 * Update user status (active, pending_approval, suspended)
 */
async function updateUserStatus(userId, status) {
  if (!useFallbackStore && pool) {
    try {
      await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, userId]);
      await pool.query('UPDATE student_profiles SET status = ? WHERE user_id = ?', [status, userId]);
      await pool.query('UPDATE faculty_profiles SET status = ? WHERE user_id = ?', [status, userId]);
    } catch (e) {
      console.error('[MySQL updateUserStatus Error]', e.message);
    }
  }

  loadFallbackData();
  const u = (fallbackData.users || []).find(user => user.id === userId);
  if (u) {
    u.status = status;
    const sp = (fallbackData.student_profiles || []).find(p => p.user_id === userId);
    if (sp) sp.status = status;
    const fp = (fallbackData.faculty_profiles || []).find(p => p.user_id === userId);
    if (fp) fp.status = status;
    saveFallbackData();
    return true;
  }
  return false;
}

/**
 * Universal Payload Enrichment for Auth & Session
 */
function enrichUserObject(rawUser) {
  if (!rawUser) return null;

  const hasStudentProfile = rawUser.profile_id || rawUser.roll_no || rawUser.register_no;
  const studentProfile = rawUser.student_profile || (hasStudentProfile ? {
    id: rawUser.profile_id || ('prof-' + rawUser.id),
    roll_no: rawUser.roll_no || 'N/A',
    register_no: rawUser.register_no || 'N/A',
    batch_id: rawUser.batch_id || null,
    batch_name: rawUser.batch_name || 'Class 2024-2028',
    semester: rawUser.semester !== undefined ? rawUser.semester : 4,
    section: rawUser.section || 'A',
    admission_year: rawUser.admission_year || 2024,
    guardian_name: rawUser.guardian_name || '',
    guardian_phone: rawUser.guardian_phone || '',
    blood_group: rawUser.blood_group || 'O+'
  } : null);

  const isFacultyRole = ['faculty', 'instructor'].includes(rawUser.role);
  const facultyProfile = rawUser.faculty_profile || (isFacultyRole ? {
    id: rawUser.faculty_profile_id || ('prof-fac-' + rawUser.id),
    staff_id: rawUser.staff_id || 'FAC-CSE-001',
    department_id: rawUser.department_id || null,
    designation: rawUser.designation || 'Assistant Professor',
    qualification: rawUser.qualification || 'M.Tech, Ph.D.',
    specialization: rawUser.specialization || 'Computer Science & Engineering',
    status: rawUser.status || 'active'
  } : null);

  return {
    id: rawUser.id,
    name: rawUser.name,
    email: rawUser.email,
    role: rawUser.role,
    avatar_url: rawUser.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop',
    phone: rawUser.phone || '',
    designation: rawUser.designation || (rawUser.role === 'student' ? 'Student' : 'Faculty'),
    department_id: rawUser.department_id || null,
    department_name: rawUser.department_name || 'Computer Science & Engineering',
    department_code: rawUser.department_code || 'CSE',
    status: rawUser.status || 'active',
    student_profile: studentProfile,
    faculty_profile: facultyProfile
  };
}

module.exports = {
  initDatabase,
  query,
  getPool: () => pool,
  isUsingFallback: () => useFallbackStore,
  getFallbackData: () => {
    loadFallbackData();
    return fallbackData;
  },
  saveFallbackData,
  findUserForLogin,
  getUserWithProfileById,
  checkEmailExists,
  checkRollNoExists,
  checkRegNoExists,
  checkStaffIdExists,
  insertStudentUser,
  insertFacultyUser,
  updateUserPassword,
  createPasswordReset,
  verifyResetCode,
  updateUserStatus,
  enrichUserObject
};
