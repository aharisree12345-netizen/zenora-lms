/**
 * Comprehensive Seed & Audit Script for Rohit Sharma & S4 Cohort
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../src/config/db');
const { ensurePhysicalSamplePdfs } = require('../src/utils/ensureUploads');

async function seedRohitAndAudit() {
  console.log('[Seed Rohit] Starting physical documents & student cohort seed...');

  // 1. Ensure physical sample PDFs exist in assignments, materials, submissions
  const pdfResult = ensurePhysicalSamplePdfs();
  console.log('[Seed Rohit] Sample PDF documents verified.');

  // 2. Load Fallback Store
  await db.initDatabase();
  const data = db.getFallbackData();

  const passwordHashStudent = bcrypt.hashSync('Student@123', 10);

  // 3. Ensure Batch CS-2024-2028-SecA exists
  if (!data.batches) data.batches = [];
  let s4Batch = data.batches.find(b => b.id === 'batch-cs-s4');
  if (!s4Batch) {
    s4Batch = {
      id: 'batch-cs-s4',
      department_id: 'dept-cs',
      academic_year_id: 'ay-2025-2028',
      name: 'CS-2024-2028-SecA',
      semester: 4,
      section: 'A',
      shift: 'Regular',
      faculty_advisor_id: 'user-faculty-01',
      created_at: '2025-06-01T00:00:00Z'
    };
    data.batches.push(s4Batch);
  } else {
    s4Batch.name = 'CS-2024-2028-SecA';
  }

  // 4. Ensure S4 core subjects exist
  if (!data.subjects) data.subjects = [];
  const s4CoreSubjects = [
    { id: 'sub-cs401', department_id: 'dept-cs', code: 'CS401', name: 'Database Management Systems (DBMS)', semester: 4, credits: 4, type: 'theory' },
    { id: 'sub-cs402', department_id: 'dept-cs', code: 'CS402', name: 'Design and Analysis of Algorithms (DAA)', semester: 4, credits: 4, type: 'theory' },
    { id: 'sub-cs403', department_id: 'dept-cs', code: 'CS403', name: 'Operating Systems Principles (OS)', semester: 4, credits: 4, type: 'theory' },
    { id: 'sub-cs404', department_id: 'dept-cs', code: 'CS404', name: 'Computer Networks (CN)', semester: 4, credits: 4, type: 'theory' },
    { id: 'sub-bs401', department_id: 'dept-bs', code: 'BS401', name: 'Probability and Queueing Theory (Maths)', semester: 4, credits: 4, type: 'theory' }
  ];

  s4CoreSubjects.forEach(targetSub => {
    const existing = data.subjects.find(s => s.id === targetSub.id || s.code === targetSub.code);
    if (!existing) {
      data.subjects.push(targetSub);
    } else {
      existing.name = targetSub.name;
      existing.code = targetSub.code;
      existing.semester = targetSub.semester;
      existing.credits = targetSub.credits;
    }
  });

  // 5. Ensure Rohit Sharma User exists
  if (!data.users) data.users = [];
  let rohitUser = data.users.find(u => u.email === 'rohit@apex.edu' || u.id === 'user-student-rohit');
  if (!rohitUser) {
    rohitUser = {
      id: 'user-student-rohit',
      role: 'student',
      name: 'Rohit Sharma',
      email: 'rohit@apex.edu',
      password_hash: passwordHashStudent,
      phone: '+1 (555) 987-6199',
      department_id: 'dept-cs',
      designation: 'Student',
      avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop',
      status: 'active',
      created_at: '2026-01-10T00:00:00Z'
    };
    data.users.push(rohitUser);
  } else {
    rohitUser.name = 'Rohit Sharma';
    rohitUser.password_hash = passwordHashStudent;
    rohitUser.status = 'active';
  }

  // 6. Ensure Rohit Sharma Profile exists in student_profiles
  if (!data.student_profiles) data.student_profiles = [];
  let rohitProfile = data.student_profiles.find(p => p.user_id === rohitUser.id || p.roll_no === '24CSE199');
  if (!rohitProfile) {
    rohitProfile = {
      id: 'prof-std-rohit',
      user_id: rohitUser.id,
      roll_no: '24CSE199',
      register_no: '312224104199',
      batch_id: 'batch-cs-s4',
      department: 'CS',
      current_semester: 4,
      admission_year: 2024,
      admission_date: '2024-06-15',
      date_of_birth: '2005-04-30',
      guardian_name: 'Girish Sharma',
      parent_name: 'Girish Sharma',
      phone_number: '+1 (555) 987-6199',
      blood_group: 'B+',
      status: 'active',
      notes: 'Test Student - CS 2024-2028 Cohort'
    };
    data.student_profiles.push(rohitProfile);
  } else {
    rohitProfile.roll_no = '24CSE199';
    rohitProfile.register_no = '312224104199';
    rohitProfile.department = 'CS';
    rohitProfile.current_semester = 4;
    rohitProfile.batch_id = 'batch-cs-s4';
    rohitProfile.status = 'active';
  }

  // 7. Auto-enroll Rohit into all S4 core subjects
  if (!data.student_subject_enrollments) data.student_subject_enrollments = [];
  const s4SubIds = ['sub-cs401', 'sub-cs402', 'sub-cs403', 'sub-cs404', 'sub-bs401'];
  s4SubIds.forEach(subId => {
    const existing = data.student_subject_enrollments.find(e => e.student_id === rohitUser.id && e.subject_id === subId);
    if (!existing) {
      data.student_subject_enrollments.push({
        id: `enr-${rohitUser.id}-${subId}`,
        student_id: rohitUser.id,
        subject_id: subId,
        status: 'enrolled',
        enrolled_at: '2025-06-15T00:00:00Z'
      });
    }
  });

  // 8. Seed attendance records for Rohit Sharma (28 conducted, 26 present, 2 absent = 92.9%)
  if (!data.attendance) data.attendance = [];
  // Clear any existing partial attendance for rohit to avoid duplicates
  data.attendance = data.attendance.filter(a => a.student_id !== rohitUser.id);
  const s4AttendanceDates = [
    { date: '2026-10-05', slot: 'Period 1 (08:45 AM - 09:40 AM)', sub: 'sub-cs401', fac: 'user-faculty-01' },
    { date: '2026-10-05', slot: 'Period 2 (09:40 AM - 10:35 AM)', sub: 'sub-cs402', fac: 'user-faculty-03' },
    { date: '2026-10-06', slot: 'Period 1 (08:45 AM - 09:40 AM)', sub: 'sub-cs403', fac: 'user-faculty-02' },
    { date: '2026-10-06', slot: 'Period 2 (09:40 AM - 10:35 AM)', sub: 'sub-bs401', fac: 'user-faculty-bs-01' },
    { date: '2026-10-07', slot: 'Practical Lab (01:30 PM - 04:30 PM)', sub: 'sub-cs404', fac: 'user-faculty-01' },
    { date: '2026-10-07', slot: 'Period 3 (10:50 AM - 11:45 AM)', sub: 'sub-cs401', fac: 'user-faculty-01' },
    { date: '2026-10-08', slot: 'Period 1 (08:45 AM - 09:40 AM)', sub: 'sub-cs402', fac: 'user-faculty-03' },
    { date: '2026-10-08', slot: 'Period 4 (11:45 AM - 12:40 PM)', sub: 'sub-cs403', fac: 'user-faculty-02' },
    { date: '2026-10-09', slot: 'Period 1 (08:45 AM - 09:40 AM)', sub: 'sub-bs401', fac: 'user-faculty-bs-01' },
    { date: '2026-10-09', slot: 'Practical Lab (01:30 PM - 04:30 PM)', sub: 'sub-cs404', fac: 'user-faculty-01' },
    { date: '2026-10-12', slot: 'Period 1 (08:45 AM - 09:40 AM)', sub: 'sub-cs401', fac: 'user-faculty-01' },
    { date: '2026-10-12', slot: 'Period 2 (09:40 AM - 10:35 AM)', sub: 'sub-cs402', fac: 'user-faculty-03' },
    { date: '2026-10-13', slot: 'Period 1 (08:45 AM - 09:40 AM)', sub: 'sub-cs403', fac: 'user-faculty-02' },
    { date: '2026-10-13', slot: 'Period 2 (09:40 AM - 10:35 AM)', sub: 'sub-bs401', fac: 'user-faculty-bs-01' },
    { date: '2026-10-14', slot: 'Practical Lab (01:30 PM - 04:30 PM)', sub: 'sub-cs404', fac: 'user-faculty-01' },
    { date: '2026-10-14', slot: 'Period 3 (10:50 AM - 11:45 AM)', sub: 'sub-cs401', fac: 'user-faculty-01' },
    { date: '2026-10-15', slot: 'Period 1 (08:45 AM - 09:40 AM)', sub: 'sub-cs401', fac: 'user-faculty-01' },
    { date: '2026-10-15', slot: 'Period 3 (10:50 AM - 11:45 AM)', sub: 'sub-cs402', fac: 'user-faculty-03' },
    { date: '2026-10-16', slot: 'Period 1 (08:45 AM - 09:40 AM)', sub: 'sub-bs401', fac: 'user-faculty-bs-01' },
    { date: '2026-10-16', slot: 'Practical Lab (01:30 PM - 04:30 PM)', sub: 'sub-cs404', fac: 'user-faculty-01' },
    { date: '2026-10-19', slot: 'Period 1 (08:45 AM - 09:40 AM)', sub: 'sub-cs401', fac: 'user-faculty-01' },
    { date: '2026-10-19', slot: 'Period 2 (09:40 AM - 10:35 AM)', sub: 'sub-cs402', fac: 'user-faculty-03' },
    { date: '2026-10-20', slot: 'Period 1 (08:45 AM - 09:40 AM)', sub: 'sub-cs403', fac: 'user-faculty-02' },
    { date: '2026-10-20', slot: 'Period 2 (09:40 AM - 10:35 AM)', sub: 'sub-bs401', fac: 'user-faculty-bs-01' },
    { date: '2026-10-21', slot: 'Period 1 (08:45 AM - 09:40 AM)', sub: 'sub-cs402', fac: 'user-faculty-03' },
    { date: '2026-10-21', slot: 'Period 3 (10:50 AM - 11:45 AM)', sub: 'sub-cs403', fac: 'user-faculty-02' },
    { date: '2026-10-22', slot: 'Practical Lab (01:30 PM - 04:30 PM)', sub: 'sub-cs404', fac: 'user-faculty-01' },
    { date: '2026-10-22', slot: 'Period 4 (11:45 AM - 12:40 PM)', sub: 'sub-cs403', fac: 'user-faculty-02' }
  ];

  s4AttendanceDates.forEach((s, idx) => {
    const isAbsent = (idx === 17 || idx === 24); // 2 leaves
    data.attendance.push({
      id: `att-seed-rohit-${idx + 1}`,
      student_id: rohitUser.id,
      subject_id: s.sub,
      batch_id: 'batch-cs-s4',
      department: 'CS',
      semester: 4,
      faculty_id: s.fac,
      date: s.date,
      session_slot: s.slot,
      status: isAbsent ? 'absent' : 'present',
      remarks: isAbsent ? 'Official leave permitted' : 'Attended',
      created_at: `${s.date}T10:00:00.000Z`,
      updated_at: `${s.date}T10:00:00.000Z`
    });
  });

  // 9. Seed Exam Marks for Rohit Sharma (45.5 / 50 -> 91.0% -> Grade 'O')
  if (!data.exam_marks) data.exam_marks = [];
  data.exam_marks = data.exam_marks.filter(m => m.student_id !== rohitUser.id);
  const rohitMarks = [
    { id: 'em-rohit-1', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-01', student_id: rohitUser.id, marks_obtained: 2.0 },
    { id: 'em-rohit-2', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-02', student_id: rohitUser.id, marks_obtained: 2.0 },
    { id: 'em-rohit-3', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-03', student_id: rohitUser.id, marks_obtained: 2.0 },
    { id: 'em-rohit-4', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-04', student_id: rohitUser.id, marks_obtained: 1.5 },
    { id: 'em-rohit-5', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-05', student_id: rohitUser.id, marks_obtained: 2.0 },
    { id: 'em-rohit-6', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-06', student_id: rohitUser.id, marks_obtained: 9.0 },
    { id: 'em-rohit-7', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-07', student_id: rohitUser.id, marks_obtained: 9.5 },
    { id: 'em-rohit-8', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-08', student_id: rohitUser.id, marks_obtained: 8.5 },
    { id: 'em-rohit-9', exam_id: 'exam-cs401-cat1', question_id: 'q-cs401-09', student_id: rohitUser.id, marks_obtained: 9.0 }
  ];
  rohitMarks.forEach(m => data.exam_marks.push(m));

  // 10. Ensure Assignment asg-cs401-01 is available
  if (!data.assignments) data.assignments = [];
  let cs401Asg = data.assignments.find(a => a.id === 'asg-cs401-01');
  if (!cs401Asg) {
    cs401Asg = {
      id: 'asg-cs401-01',
      subject_id: 'sub-cs401',
      batch_id: 'batch-cs-s4',
      title: 'Relational Schema Normalization & Complex SQL Queries',
      description: 'Decompose dataset into 3NF and BCNF. Write SQL queries to identify top performance.',
      due_date: '2026-11-30T23:59:59Z',
      max_marks: 20.00,
      attachment_url: '/uploads/assignments/retail_sales_schema.pdf',
      created_by: 'user-faculty-01',
      created_at: '2026-10-10T10:00:00Z'
    };
    data.assignments.push(cs401Asg);
  } else {
    cs401Asg.due_date = '2026-11-30T23:59:59Z';
    cs401Asg.attachment_url = '/uploads/assignments/retail_sales_schema.pdf';
  }

  // 11. Ensure Rohit has a preliminary submission ready for testing preview & resubmit
  if (!data.assignment_submissions) data.assignment_submissions = [];
  let rohitSubm = data.assignment_submissions.find(s => s.assignment_id === 'asg-cs401-01' && s.student_id === rohitUser.id);
  if (!rohitSubm) {
    rohitSubm = {
      id: 'subm-rohit-01',
      assignment_id: 'asg-cs401-01',
      student_id: rohitUser.id,
      submission_text: 'Solved BCNF schema decomposition for retail transactions with lossless join verification and candidate key proofs.',
      attachment_url: '/uploads/assignments/student_solution_cs24001.pdf',
      file_name: 'student_solution_rohit.pdf',
      status: 'submitted',
      marks_awarded: null,
      feedback: 'Provisional submission recorded.',
      submitted_at: new Date().toISOString()
    };
    data.assignment_submissions.push(rohitSubm);
  }

  // 12. Ensure Quiz quiz-cloud-01 exists for testing Assessment & Retest
  if (!data.quizzes) data.quizzes = [];
  let cloudQuiz = data.quizzes.find(q => q.id === 'quiz-cloud-01');
  if (!cloudQuiz) {
    cloudQuiz = {
      id: 'quiz-cloud-01',
      title: 'Distributed Systems & Cloud Architecture Midterm Exam',
      subject_id: 'sub-cs401',
      course_id: 'sub-cs401',
      batch_id: 'batch-cs-s4',
      duration_minutes: 45,
      time_limit_minutes: 45,
      total_marks: 50,
      total_points: 50,
      passing_percentage: 60,
      max_attempts: 10,
      instructions: 'Please answer all questions carefully. Each question carries equal points.',
      created_by: 'user-faculty-01',
      created_at: '2026-03-01T09:00:00Z'
    };
    data.quizzes.push(cloudQuiz);
  } else {
    cloudQuiz.max_attempts = 10;
  }

  if (!data.quiz_questions) data.quiz_questions = [];
  const qqs = [
    { id: 'qq-01', quiz_id: 'quiz-cloud-01', question_text: 'Which architectural design pattern prevents an application from executing an operation that is guaranteed to fail in an overloaded downstream service?', question_type: 'multiple_choice', points: 10, marks: 10, sort_order: 1 },
    { id: 'qq-02', quiz_id: 'quiz-cloud-01', question_text: 'In relational database theory, which Normal Form guarantees the absence of transitive functional dependencies on candidate keys?', question_type: 'multiple_choice', points: 10, marks: 10, sort_order: 2 },
    { id: 'qq-03', quiz_id: 'quiz-cloud-01', question_text: 'What is the primary objective of a Write-Ahead Log (WAL) in transaction management?', question_type: 'multiple_choice', points: 10, marks: 10, sort_order: 3 },
    { id: 'qq-04', quiz_id: 'quiz-cloud-01', question_text: 'Which disk indexing tree structure is guaranteed to be completely height-balanced with leaves stored at equal depth?', question_type: 'multiple_choice', points: 10, marks: 10, sort_order: 4 },
    { id: 'qq-05', quiz_id: 'quiz-cloud-01', question_text: 'In distributed CAP theorem, which property guarantees that every read receives the most recent write or an error?', question_type: 'multiple_choice', points: 10, marks: 10, sort_order: 5 }
  ];
  qqs.forEach(q => {
    if (!data.quiz_questions.some(item => item.id === q.id)) {
      data.quiz_questions.push(q);
    }
  });

  if (!data.quiz_options) data.quiz_options = [];
  const qos = [
    { id: 'qo-01-1', question_id: 'qq-01', option_text: 'Circuit Breaker Pattern', is_correct: true, sort_order: 1 },
    { id: 'qo-01-2', question_id: 'qq-01', option_text: 'Singleton Factory Pattern', is_correct: false, sort_order: 2 },
    { id: 'qo-02-1', question_id: 'qq-02', option_text: 'Third Normal Form (3NF)', is_correct: true, sort_order: 1 },
    { id: 'qo-02-2', question_id: 'qq-02', option_text: 'First Normal Form (1NF)', is_correct: false, sort_order: 2 },
    { id: 'qo-03-1', question_id: 'qq-03', option_text: 'Guarantee Atomicity and Durability across system crashes', is_correct: true, sort_order: 1 },
    { id: 'qo-03-2', question_id: 'qq-03', option_text: 'Optimize CSS stylesheets', is_correct: false, sort_order: 2 },
    { id: 'qo-04-1', question_id: 'qq-04', option_text: 'B+ Tree Index', is_correct: true, sort_order: 1 },
    { id: 'qo-04-2', question_id: 'qq-04', option_text: 'Linked List', is_correct: false, sort_order: 2 },
    { id: 'qo-05-1', question_id: 'qq-05', option_text: 'Consistency', is_correct: true, sort_order: 1 },
    { id: 'qo-05-2', question_id: 'qq-05', option_text: 'Eventual Latency', is_correct: false, sort_order: 2 }
  ];
  qos.forEach(opt => {
    if (!data.quiz_options.some(item => item.id === opt.id)) {
      data.quiz_options.push(opt);
    }
  });

  // Reset any old attempts for Rohit so fresh tests can run
  if (data.quiz_attempts) {
    data.quiz_attempts = data.quiz_attempts.filter(a => !(a.quiz_id === 'quiz-cloud-01' && a.user_id === rohitUser.id));
  }

  // 13. Save Fallback Store
  db.saveFallbackData();
  console.log('✅ [Seed Rohit] Successfully seeded Rohit Sharma, S4 cohort, attendance, exams, and assignments into JSON store.');

  // 13. Sync to MySQL if pool available
  const pool = db.getPool();
  if (pool && !db.isUsingFallback()) {
    try {
      await pool.query(
        `INSERT INTO users (id, role, name, email, password_hash, phone, department_id, designation, avatar_url, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), status = VALUES(status)`,
        [
          rohitUser.id, rohitUser.role, rohitUser.name, rohitUser.email, rohitUser.password_hash,
          rohitUser.phone, rohitUser.department_id, rohitUser.designation, rohitUser.avatar_url, rohitUser.status
        ]
      );

      await pool.query(
        `INSERT INTO student_profiles (id, user_id, roll_no, register_no, batch_id, admission_year, admission_date, date_of_birth, guardian_name, phone_number, blood_group, status, current_semester)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE roll_no = VALUES(roll_no), register_no = VALUES(register_no), current_semester = VALUES(current_semester)`,
        [
          rohitProfile.id, rohitProfile.user_id, rohitProfile.roll_no, rohitProfile.register_no,
          rohitProfile.batch_id, rohitProfile.admission_year, rohitProfile.admission_date,
          rohitProfile.date_of_birth, rohitProfile.guardian_name, rohitProfile.phone_number,
          rohitProfile.blood_group, rohitProfile.status, rohitProfile.current_semester
        ]
      );
      console.log('✅ [Seed Rohit] MySQL synchronized for Rohit Sharma.');
    } catch (mysqlErr) {
      console.warn('⚠️ [Seed Rohit] MySQL sync notice:', mysqlErr.message);
    }
  }

  console.log('🎉 [Seed Rohit] Rohit Sharma credentials:');
  console.log('    Email:       rohit@apex.edu');
  console.log('    Password:    Student@123');
  console.log('    Roll No:     24CSE199');
  console.log('    Register No: 312224104199');
  console.log('    Cohort:      CS - Semester S4 - Batch CS-2024-2028-SecA');
}

if (require.main === module) {
  seedRohitAndAudit()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[Seed Rohit Error]', err);
      process.exit(1);
    });
}

module.exports = { seedRohitAndAudit };
