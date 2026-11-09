const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const res = await fetch(url, { ...options, headers });
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = { error: 'Failed to parse JSON' };
  }
  return { status: res.status, data };
}

async function runAcademicTests() {
  console.log('\n======================================================');
  console.log('🧪 ZENORA COLLEGE LMS – ACADEMIC SYSTEM AUTOMATED TESTS');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name} ->`, err.message);
      failed++;
    }
  }

  // 1. Health Check
  await test('Backend Health Check returns College LMS Status', async () => {
    const res = await request('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'healthy');
    assert.ok(res.data.system.includes('ZENORA COLLEGE LMS'));
  });

  // 2. Authentication: Super Admin
  let adminToken = '';
  await test('Super Admin login succeeds', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@zenora.com', password: 'Admin@123' })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.user.role, 'super_admin');
    adminToken = res.data.token;
  });

  // 3. Authentication: Faculty Login
  let facultyToken = '';
  await test('Faculty login succeeds (Prof. Sarah Jenkins)', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'faculty@apex.edu', password: 'Faculty@123' })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.user.role, 'faculty');
    facultyToken = res.data.token;
  });

  // 4. Authentication: Student Login & Enriched Profile
  let studentToken = '';
  await test('Student login succeeds and returns Roll & Register numbers', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'student@apex.edu', password: 'Student@123' })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.user.role, 'student');
    assert.ok(res.data.user.student_profile);
    assert.strictEqual(res.data.user.student_profile.roll_no, '24CSE101');
    assert.strictEqual(res.data.user.student_profile.register_no, '312224104001');
    studentToken = res.data.token;
  });

  await test('Student login succeeds with Roll Number identifier (24CSE101)', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: '24CSE101', password: 'Student@123' })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.user.name, 'Alex Rivera');
    assert.strictEqual(res.data.user.student_profile.roll_no, '24CSE101');
  });

  await test('Student login succeeds with University Register Number (312224104001)', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: '312224104001', password: 'Student@123' })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.user.name, 'Alex Rivera');
  });

  await test('Student login fails with invalid password', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: '24CSE101', password: 'WrongPassword999' })
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data.success, false);
  });

  const uniqueNum = Date.now().toString().slice(-4) + Math.floor(Math.random() * 90 + 10);
  let newStudentRoll = `24CSE${uniqueNum}`;
  let newStudentReg = `312224${uniqueNum}`;
  let newStudentEmail = `rachel.${uniqueNum}@apex.edu`;
  let newStudentToken = '';

  await test('Admin registers a new student with auto-generated default password (their Register Number)', async () => {
    const res = await request('/students', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Rachel Adams',
        email: newStudentEmail,
        roll_no: newStudentRoll,
        register_no: newStudentReg,
        batch_id: 'batch-cse-4a',
        department_id: 'dept-cse-01'
      })
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.default_password, newStudentReg);
    assert.strictEqual(res.data.data.roll_no, newStudentRoll);
    assert.strictEqual(res.data.data.register_no, newStudentReg);
  });

  await test('Newly registered student successfully authenticates using their Register Number as default password', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: newStudentRoll, password: newStudentReg })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.user.name, 'Rachel Adams');
    assert.strictEqual(res.data.user.student_profile.roll_no, newStudentRoll);
    assert.strictEqual(res.data.user.student_profile.register_no, newStudentReg);
    newStudentToken = res.data.token;
  });

  await test('Newly logged-in student /auth/me loads exact personal profile data (not demo student)', async () => {
    const res = await request('/auth/me', {
      headers: { Authorization: `Bearer ${newStudentToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.name, 'Rachel Adams');
    assert.strictEqual(res.data.user.email, newStudentEmail);
    assert.strictEqual(res.data.user.student_profile.roll_no, newStudentRoll);
    assert.strictEqual(res.data.user.student_profile.register_no, newStudentReg);
  });

  await test('Newly logged-in student dashboard stats loads exact personal student info (not demo student)', async () => {
    const res = await request('/dashboard/stats', {
      headers: { Authorization: `Bearer ${newStudentToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.student_info.name, 'Rachel Adams');
    assert.strictEqual(res.data.student_info.roll_no, newStudentRoll);
    assert.strictEqual(res.data.student_info.register_no, newStudentReg);
  });

  // 5. Academic Structure: Departments & Batches
  await test('Academics: Lists departments with batch and student counts', async () => {
    const res = await request('/academics/departments');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(Array.isArray(res.data.data));
    assert.ok(res.data.data.length >= 4);
    const cse = res.data.data.find(d => d.code === 'CSE');
    assert.ok(cse);
    assert.strictEqual(cse.name, 'Computer Science & Engineering');
  });

  await test('Academics: Lists curriculum subjects with credits and types', async () => {
    const res = await request('/academics/subjects');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.data.length >= 5);
    const dbms = res.data.data.find(s => s.code === 'CS8492');
    assert.ok(dbms);
    assert.strictEqual(dbms.name, 'Database Management Systems');
    assert.strictEqual(dbms.credits, 3);
  });

  // 6. Master Student Directory: Search, Filters & Status Toggle
  let testStudentId = '';
  await test('Students Directory: Search filter finds Alex Rivera by roll no 24CSE101', async () => {
    const res = await request('/students?search=24CSE101');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.length, 1);
    assert.strictEqual(res.data.data[0].name, 'Alex Rivera');
    testStudentId = res.data.data[0].id;
  });

  await test('Students Directory: Status toggle updates to suspended and reverts to active', async () => {
    const res1 = await request(`/students/${testStudentId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'suspended' })
    });
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.data.status, 'suspended');

    const res2 = await request(`/students/${testStudentId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'active' })
    });
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.data.status, 'active');
  });

  // 7. Bulk Student Import via CSV
  await test('Students Directory: Bulk CSV import allocates students to batch', async () => {
    const runId = Date.now().toString().slice(-4);
    const r1 = Math.floor(Math.random() * 89 + 10);
    const r2 = Math.floor(Math.random() * 89 + 10);
    const csvContent =
`Name,Email,Roll Number,Register Number,Phone
Tara Raman,tara.${runId}_${r1}@apex.edu,24CSE9${r1},3122241049${r1},+1 555-401-9901
Kiran Rao,kiran.${runId}_${r2}@apex.edu,24CSE8${r2},3122241048${r2},+1 555-401-9902`;

    const res = await request('/students/bulk-import', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        csv_data: csvContent,
        default_batch_id: 'batch-cse-4a',
        default_department_id: 'dept-cse-01'
      })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.importedCount, 2);
  });

  // 8. Core Academic Module: Examination & Split-Wise Marks
  let createdExamId = '';
  await test('Exams: Create new examination in draft status', async () => {
    const res = await request('/exams', {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: JSON.stringify({
        title: 'Model Practical Examination - Algorithms Lab',
        subject_id: 'sub-cs8491',
        batch_id: 'batch-cse-4a',
        exam_type: 'Lab Practical',
        max_total_marks: 50.0,
        exam_date: '2026-04-15',
        duration_minutes: 120
      })
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.status, 'draft');
    createdExamId = res.data.data.id;
  });

  await test('Exams: Configure Question-wise Split Marks (Part A & Part B)', async () => {
    const questions = [
      { question_number: 1, question_label: 'Q1', section_part: 'Part A', max_marks: 5, topic_coverage: 'Heap Sort Code' },
      { question_number: 2, question_label: 'Q2', section_part: 'Part A', max_marks: 5, topic_coverage: 'BFS Traversal' },
      { question_number: 3, question_label: 'Q3', section_part: 'Part B', max_marks: 20, topic_coverage: 'Dijkstra Implementation' },
      { question_number: 4, question_label: 'Q4', section_part: 'Part B', max_marks: 20, topic_coverage: 'Knapsack DP Program' }
    ];

    const res = await request(`/exams/${createdExamId}/questions`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: JSON.stringify({ questions })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.length, 4);
  });

  let markGridQuestions = [];
  let markGridStudents = [];
  await test('Exams: Mark Grid spreadsheet matrix returns questions and enrolled students', async () => {
    const res = await request(`/exams/${createdExamId}/mark-grid`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.data.exam);
    assert.strictEqual(res.data.data.questions.length, 4);
    assert.ok(res.data.data.students.length >= 6);
    markGridQuestions = res.data.data.questions;
    markGridStudents = res.data.data.students;
  });

  await test('Exams: Strict Validation blocks marks exceeding question maximum allowed', async () => {
    // Q1 max marks is 5. Sending 9 must be rejected with 400!
    const res = await request(`/exams/${createdExamId}/marks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: JSON.stringify({
        marks: [
          {
            student_id: markGridStudents[0].student_id,
            question_id: markGridQuestions[0].id,
            marks_obtained: 9.0 // Invalid! Exceeds 5
          }
        ]
      })
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.success, false);
    assert.ok(res.data.message.includes('exceeds maximum allowed marks'));
  });

  await test('Exams: Valid question split mark entry saves and auto-calculates total', async () => {
    const student1 = markGridStudents[0].student_id;
    const res = await request(`/exams/${createdExamId}/marks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: JSON.stringify({
        marks: [
          { student_id: student1, question_id: markGridQuestions[0].id, marks_obtained: 5.0 },
          { student_id: student1, question_id: markGridQuestions[1].id, marks_obtained: 4.5 },
          { student_id: student1, question_id: markGridQuestions[2].id, marks_obtained: 18.0 },
          { student_id: student1, question_id: markGridQuestions[3].id, marks_obtained: 19.5 }
        ]
      })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);

    // Verify auto total in grid
    const gridRes = await request(`/exams/${createdExamId}/mark-grid`);
    assert.strictEqual(gridRes.status, 200);
    const totals = gridRes.data.data.student_totals[student1];
    assert.strictEqual(totals.total_scored, 47.0);
    assert.strictEqual(totals.percentage, 94.0);
    assert.strictEqual(totals.grade, 'O');
  });

  await test('Exams: Publish exam makes results official', async () => {
    const res = await request(`/exams/${createdExamId}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.exam.status, 'published');
  });

  await test('Exams: Student itemized marksheet view returns complete score card with class rank', async () => {
    const res = await request(`/exams/exam-dbms-ia1/student-sheet/user-student-01`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.student.name, 'Alex Rivera');
    assert.strictEqual(res.data.data.summary.total_marks_obtained, 45.5);
    assert.strictEqual(res.data.data.summary.percentage, 91.0);
    assert.strictEqual(res.data.data.summary.grade, 'O');
    assert.ok(res.data.data.itemized_breakdown.length >= 9);
  });

  // 9. Assignments & Academic Content
  await test('Assignments: Student submits assignment and faculty evaluates with feedback', async () => {
    const submitRes = await request('/assignments/asg-algo-02/submit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        submission_text: 'Dynamic programming table for Matrix Chain Multiplication implemented in C++.',
        attachment_url: 'https://zenora.edu/submissions/24CSE101_MatrixChain.cpp'
      })
    });
    assert.strictEqual(submitRes.status, 200);
    assert.strictEqual(submitRes.data.success, true);

    // Retrieve submission ID
    const asgDetail = await request('/assignments/asg-algo-02');
    const mySub = asgDetail.data.data.submissions.find(s => s.student_id === 'user-student-01');
    assert.ok(mySub);

    // Faculty grades submission
    const gradeRes = await request(`/assignments/asg-algo-02/grade/${mySub.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: JSON.stringify({
        marks_awarded: 24.0,
        feedback: 'Clean dynamic programming bottom-up table construction. Optimal parenthesization is verified.'
      })
    });
    assert.strictEqual(gradeRes.status, 200);
    assert.strictEqual(gradeRes.data.success, true);
    assert.strictEqual(gradeRes.data.data.marks_awarded, 24.0);
  });

  // 10. Study Materials
  await test('Materials: Retrieves syllabus and notes for curriculum subjects', async () => {
    const res = await request('/materials?subject_id=sub-cs8492');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.data.length >= 2);
    assert.ok(res.data.data.some(m => m.category === 'syllabus'));
  });

  // 11. Timetable Schedule
  await test('Timetable: Retrieves schedule for batch CSE-2024-2028-SecA', async () => {
    const res = await request('/academics/schedules?batch_id=batch-cse-4a');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.data.length >= 6);
  });

  console.log('\n======================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAcademicTests().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
