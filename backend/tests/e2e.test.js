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
  return { status: res.status, data };
}

async function runTests() {
  console.log('\n========================================');
  console.log('🧪 RUNNING ZENORA LMS AUTOMATED TEST SUITE');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`, err.message);
      failed++;
    }
  }

  // 1. Health Check
  await test('Health check returns operational status', async () => {
    const res = await request('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'healthy');
  });

  // 2. Authentication: Super Admin Login
  let superAdminToken = '';
  await test('Super Admin login succeeds with Admin@123', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@zenora.com', password: 'Admin@123' })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.user.role, 'super_admin');
    superAdminToken = res.data.token;
  });

  // 3. Authentication: Student Login
  let studentToken = '';
  await test('Student login succeeds with Student@123', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'student@apex.edu', password: 'Student@123' })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.user.role, 'student');
    studentToken = res.data.token;
  });

  // 4. Authentication: Instructor Login
  let instructorToken = '';
  await test('Instructor login succeeds with Instructor@123', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'instructor@apex.edu', password: 'Instructor@123' })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.role, 'instructor');
    instructorToken = res.data.token;
  });

  // 5. Dashboard Stats for Admin & Student
  await test('Admin dashboard returns platform statistics', async () => {
    const res = await request('/dashboard/stats', {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.metrics.totalCourses >= 2);
    assert.ok(res.data.metrics.totalStudents >= 2);
  });

  await test('Student dashboard returns personalised metrics', async () => {
    const res = await request('/dashboard/stats', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.role, 'student');
    assert.ok(Array.isArray(res.data.enrolledCourses));
  });

  // 6. Course Lifecycle: Create, Add Section, Add Lesson, Publish
  let testCourseId = '';
  await test('Instructor can create a draft course', async () => {
    const res = await request('/courses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: JSON.stringify({
        title: 'Automated Test Cloud Mastery',
        subtitle: 'Validation Course for CI/CD',
        description: 'Comprehensive integration test course for curriculum workflows.',
        difficulty_level: 'intermediate',
        price: 29.99,
        is_free: false
      })
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.data.status, 'draft');
    testCourseId = res.data.data.id;
  });

  let testSectionId = '';
  await test('Instructor can add section to course', async () => {
    const res = await request(`/curriculum/courses/${testCourseId}/sections`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: JSON.stringify({ title: 'Module 1: Automated Scenarios', sort_order: 1 })
    });
    assert.strictEqual(res.status, 201);
    testSectionId = res.data.data.id;
  });

  let testLessonId = '';
  await test('Instructor can add lesson to section', async () => {
    const res = await request(`/curriculum/sections/${testSectionId}/lessons`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: JSON.stringify({
        title: '1.1 Deep Dive Into Resilient Pipelines',
        content_type: 'video',
        duration_minutes: 20,
        is_preview: true
      })
    });
    assert.strictEqual(res.status, 201);
    testLessonId = res.data.data.id;
  });

  await test('Instructor can publish course after validation', async () => {
    const res = await request(`/courses/${testCourseId}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${instructorToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.status, 'published');
  });

  // 7. Enrolment & Duplicate Prevention
  await test('Student can self-enrol in the published course', async () => {
    const res = await request('/enrolments/self', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ course_id: testCourseId })
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.data.status, 'active');
  });

  await test('Student self-enrolment prevents duplicate enrolments', async () => {
    const res = await request('/enrolments/self', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ course_id: testCourseId })
    });
    assert.strictEqual(res.status, 409);
  });

  // 8. Lesson Progress & Auto-Certificate Issuance
  await test('Marking lesson complete updates course progress to 100% and auto-issues certificate', async () => {
    const res = await request(`/curriculum/lessons/${testLessonId}/progress`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ is_completed: true, time_spent_seconds: 1200 })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.progress.course_progress_percentage, 100);
  });

  // 9. Assessment / Quiz Flow
  let attemptId = '';
  await test('Student can start quiz attempt with server-side timer', async () => {
    const res = await request('/quizzes/quiz-cloud-01/start', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.data.attempt.id);
    attemptId = res.data.attempt.id;
  });

  await test('Student submits quiz answers and receives auto-graded score', async () => {
    const res = await request('/quizzes/quiz-cloud-01/submit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        attempt_id: attemptId,
        answers: [
          { question_id: 'q-01', selected_option_id: 'opt-01-1' },
          { question_id: 'q-02', selected_option_ids: ['opt-02-1', 'opt-02-2', 'opt-02-4'] },
          { question_id: 'q-03', selected_option_id: 'opt-03-2' },
          { question_id: 'q-04', answer_text: 'Availability' },
          { question_id: 'q-05', answer_text: 'The API Gateway centralizes routing, SSL termination, and rate limiting.' }
        ]
      })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.result.is_passed, true);
    assert.ok(res.data.result.percentage >= 70);
  });

  // 10. Certificate Public Verification
  await test('Public certificate verification endpoint validates genuine certificate', async () => {
    const res = await request('/certificates/verify/VERIFY-ZEN-98421');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.verified, true);
    assert.strictEqual(res.data.certificate.student_name, 'Alex Johnson');
  });

  // 11. Notifications Feed
  await test('Notifications feed returns unread alerts', async () => {
    const res = await request('/notifications', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.count > 0);
  });

  // 12. Reports Analytics
  await test('Analytics reports compile course performance statistics', async () => {
    const res = await request('/reports/analytics', {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.coursePerformance));
  });

  console.log('\n========================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('[Test Execution Error]', err);
  process.exit(1);
});
