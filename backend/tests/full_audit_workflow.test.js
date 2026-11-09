const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function runComprehensiveAudit() {
  console.log('\n===============================================================');
  console.log('🏛️  ZENORA LMS: COMPREHENSIVE END-TO-END WORKFLOW AUDIT SUITE');
  console.log('===============================================================\n');

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

  let superAdminToken = '';
  let instAdminToken = '';
  let instructorToken = '';
  let studentToken = '';

  // -------------------------------------------------------------
  // 1. AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC)
  // -------------------------------------------------------------
  console.log('--- 1. Authentication & Role Switcher Verification ---');
  await test('Super Admin Authentication', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@zenora.com', password: 'Admin@123' })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.role, 'super_admin');
    superAdminToken = res.data.token;
  });

  await test('Institution Admin Authentication', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@apex.edu', password: 'Admin@123' })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.role, 'institution_admin');
    instAdminToken = res.data.token;
  });

  await test('Instructor Authentication', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'instructor@apex.edu', password: 'Instructor@123' })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.role, 'instructor');
    instructorToken = res.data.token;
  });

  await test('Student Authentication', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'student@apex.edu', password: 'Student@123' })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.role, 'student');
    studentToken = res.data.token;
  });

  await test('Server-side RBAC: Student cannot create courses', async () => {
    const res = await request('/courses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ title: 'Unauthorized Course' })
    });
    assert.strictEqual(res.status, 403);
  });

  await test('Server-side RBAC: Instructor cannot manage tenant organizations', async () => {
    const res = await request('/admin/organizations', {
      headers: { Authorization: `Bearer ${instructorToken}` }
    });
    assert.strictEqual(res.status, 403);
  });

  // -------------------------------------------------------------
  // 2. COURSE & CURRICULUM MANAGEMENT WORKFLOW
  // -------------------------------------------------------------
  console.log('\n--- 2. Course & Curriculum Management Workflow ---');
  let testCourseId = '';
  let testSectionId = '';
  let testLessonId = '';

  await test('Instructor creates new draft course', async () => {
    const res = await request('/courses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: JSON.stringify({
        title: 'Microservice Reliability Engineering 2026',
        subtitle: 'Enterprise Fault Tolerance Patterns',
        description: 'End-to-end resilient architecture with circuit breakers and event streaming.',
        difficulty_level: 'advanced',
        estimated_duration_hours: 24,
        price: 89.99,
        is_free: false
      })
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.data.data.id);
    assert.strictEqual(res.data.data.status, 'draft');
    testCourseId = res.data.data.id;
  });

  await test('Unpublished course is hidden from students but visible to instructor', async () => {
    const studentRes = await request('/courses', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.ok(!studentRes.data.data.some(c => c.id === testCourseId));

    const instructorRes = await request('/courses', {
      headers: { Authorization: `Bearer ${instructorToken}` }
    });
    assert.ok(instructorRes.data.data.some(c => c.id === testCourseId));
  });

  await test('Instructor cannot publish course without curriculum', async () => {
    const res = await request(`/courses/${testCourseId}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${instructorToken}` }
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.success, false);
  });

  await test('Instructor adds section to course curriculum', async () => {
    const res = await request(`/curriculum/courses/${testCourseId}/sections`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: JSON.stringify({
        title: 'Section 1: Distributed Failure Modes & Resilience Patterns',
        description: 'Understanding circuit breakers, fallbacks, and dead-letter queues',
        sort_order: 1
      })
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.data.data.id);
    testSectionId = res.data.data.id;
  });

  await test('Instructor adds lesson to section', async () => {
    const res = await request(`/curriculum/sections/${testSectionId}/lessons`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: JSON.stringify({
        title: 'Lesson 1.1: Implementing Circuit Breakers with Node.js',
        description: 'Hands-on practice using Opossum library and resilient HTTP clients',
        content_type: 'video',
        content_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        duration_minutes: 20,
        is_preview: true
      })
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.data.data.id);
    testLessonId = res.data.data.id;
  });

  await test('Instructor publishes course with validated curriculum', async () => {
    const res = await request(`/courses/${testCourseId}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${instructorToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.status, 'published');
  });

  await test('Published course is now discoverable in Student Academic Catalog', async () => {
    const res = await request('/courses', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(res.status, 200);
    const found = res.data.data.find(c => c.id === testCourseId);
    assert.ok(found, 'Course should now appear in student catalog');
    assert.strictEqual(found.status, 'published');
  });

  // -------------------------------------------------------------
  // 3. ENROLMENT & DUPLICATE PREVENTION WORKFLOW
  // -------------------------------------------------------------
  console.log('\n--- 3. Enrolment & Duplicate Prevention Workflow ---');
  await test('Student self-enrols in published course', async () => {
    const res = await request('/enrolments/self', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ course_id: testCourseId })
    });
    assert.ok(res.status === 201 || res.status === 200, `Expected 201 or 200 but got ${res.status}`);
    assert.strictEqual(res.data.success, true);
  });

  await test('Duplicate enrolment is rejected with HTTP 409', async () => {
    const res = await request('/enrolments/self', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ course_id: testCourseId })
    });
    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.data.success, false);
  });

  // -------------------------------------------------------------
  // 4. LEARNING PLAYER & COMPLETION PROGRESS WORKFLOW
  // -------------------------------------------------------------
  console.log('\n--- 4. Learning Player & Completion Progress Workflow ---');
  await test('Enrolled student accesses full lesson player', async () => {
    const res = await request(`/curriculum/lessons/${testLessonId}`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.id, testLessonId);
    assert.ok(res.data.data.content_url);
  });

  await test('Student marks lesson complete -> auto-calculates 100% progress & issues certificate', async () => {
    const res = await request(`/curriculum/lessons/${testLessonId}/progress`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ is_completed: true, time_spent_seconds: 1200 })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.progress.course_progress_percentage, 100);
    assert.ok(res.data.certificate, 'Certificate should be issued upon 100% completion');
  });

  // -------------------------------------------------------------
  // 5. EXAMINATIONS & AUTO-GRADING WORKFLOW
  // -------------------------------------------------------------
  console.log('\n--- 5. Examinations & Auto-Grading Workflow ---');
  let testQuizId = '';
  await test('Instructor creates assessment quiz', async () => {
    const res = await request('/quizzes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: JSON.stringify({
        course_id: testCourseId,
        title: 'Microservice Resilience Assessment',
        instructions: 'Answer all technical scenario questions within 15 minutes.',
        time_limit_minutes: 15,
        passing_percentage: 75
      })
    });
    assert.strictEqual(res.status, 201);
    testQuizId = res.data.data.id;
  });

  await test('Student starts quiz attempt with server-side timer initialization', async () => {
    const res = await request(`/quizzes/${testQuizId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.data.attempt.id);
    assert.strictEqual(res.data.attempt.time_limit_minutes, 15);
  });

  // -------------------------------------------------------------
  // 6. ASSIGNMENTS & GRADING WORKFLOW
  // -------------------------------------------------------------
  console.log('\n--- 6. Assignments & Grading Workflow ---');
  let testAsgId = '';
  await test('Instructor creates assignment', async () => {
    const res = await request('/assignments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: JSON.stringify({
        course_id: testCourseId,
        title: 'Architectural Blueprint: Circuit Breaker Matrix',
        instructions: 'Submit a detailed system architecture document covering failure injection tests.',
        max_marks: 100,
        passing_marks: 60,
        due_date: '2026-11-30'
      })
    });
    assert.strictEqual(res.status, 201);
    testAsgId = res.data.data.id;
  });

  let testSubmissionId = '';
  await test('Student submits assignment solution', async () => {
    const res = await request(`/assignments/${testAsgId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        submission_text: 'Completed architectural diagram and failover test results attached.',
        file_name: 'Resilience_Architecture_Blueprint_Alex_Johnson.pdf',
        file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
      })
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.data.id);
    testSubmissionId = res.data.data.id;
  });

  await test('Instructor grades student submission with feedback', async () => {
    const res = await request(`/assignments/submissions/${testSubmissionId}/grade`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: JSON.stringify({
        marks_awarded: 94,
        feedback: 'Outstanding failure domain isolation and comprehensive retry strategy.'
      })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.marks_awarded, 94);
    assert.strictEqual(res.data.data.status, 'graded');
  });

  // -------------------------------------------------------------
  // 7. VERIFIABLE CERTIFICATE REGISTRY WORKFLOW
  // -------------------------------------------------------------
  console.log('\n--- 7. Verifiable Certificate Registry Workflow ---');
  let certVerifyCode = '';
  await test('Student views earned certificates', async () => {
    const res = await request('/certificates/user', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.data.length > 0);
    certVerifyCode = res.data.data[0].verification_code;
    assert.ok(certVerifyCode, 'Missing verification code');
  });

  await test('Public certificate verification endpoint authenticates genuine credential', async () => {
    const res = await request(`/certificates/verify/${certVerifyCode}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.verified, true);
    assert.ok(res.data.certificate.student_name);
    assert.ok(res.data.certificate.certificate_number);
  });

  await test('Public verification rejects invalid/forged certificate code', async () => {
    const res = await request('/certificates/verify/FORGED-INVALID-CODE-999');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.data.verified, false);
  });

  // -------------------------------------------------------------
  // 8. NOTIFICATIONS & ANNOUNCEMENTS WORKFLOW
  // -------------------------------------------------------------
  console.log('\n--- 8. Notifications & Announcements Workflow ---');
  let firstNotifId = '';
  await test('Student retrieves notification feed and unread alerts', async () => {
    const res = await request('/notifications', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.data));
    if (res.data.data.length > 0) {
      firstNotifId = res.data.data[0].id;
    }
  });

  if (firstNotifId) {
    await test('Student marks individual notification as read', async () => {
      const res = await request(`/notifications/${firstNotifId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
    });
  }

  await test('Student marks all notifications as read', async () => {
    const res = await request('/notifications/read-all', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
  });

  // -------------------------------------------------------------
  // 9. REPORTS & ANALYTICS WORKFLOW
  // -------------------------------------------------------------
  console.log('\n--- 9. Reports & Analytics Workflow ---');
  await test('Admin retrieves comprehensive platform analytics', async () => {
    const res = await request('/reports/analytics', {
      headers: { Authorization: `Bearer ${instAdminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.summary);
    assert.ok(Array.isArray(res.data.coursePerformance));
    assert.ok(Array.isArray(res.data.students));
  });

  await test('Admin exports enrolment report to CSV format', async () => {
    const res = await fetch(`${BASE_URL}/reports/export-csv?type=enrolments`, {
      headers: { Authorization: `Bearer ${instAdminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const csv = await res.text();
    assert.ok(csv.startsWith('Enrolment ID,Student Name,Student Email'));
    assert.ok(csv.includes('Alex Johnson'));
  });

  // -------------------------------------------------------------
  // 10. TENANT & USER MANAGEMENT WORKFLOW
  // -------------------------------------------------------------
  console.log('\n--- 10. Tenant & User Management Workflow ---');
  await test('Super Admin views tenant institutions with student/instructor tallies', async () => {
    const res = await request('/admin/organizations', {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.data.length >= 2);
    assert.ok(typeof res.data.data[0].studentsCount === 'number');
  });

  await test('Super Admin views all users across organizations', async () => {
    const res = await request('/admin/users', {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.data.length >= 4);
  });

  console.log('\n---------------------------------------------------------------');
  console.log(`AUDIT RESULTS: ${passed + failed} TOTAL | ${passed} PASSED | ${failed} FAILED`);
  console.log('---------------------------------------------------------------\n');

  if (failed > 0) process.exit(1);
}

runComprehensiveAudit();
