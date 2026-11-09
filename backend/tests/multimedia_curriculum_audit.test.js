const assert = require('assert');

const BASE_URL = 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function runMultimediaCurriculumAudit() {
  console.log('\n===============================================================');
  console.log('🎬 ZENORA LMS: MULTIMEDIA & CURRICULUM PLAYBACK AUDIT SUITE');
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

  // 1. Audit Published Courses Across Diverse Departments & Categories
  console.log('--- 1. Course Catalog & Diversity Audit ---');
  let coursesList = [];
  await test('Public catalog returns at least 4 published courses across diverse domains', async () => {
    const res = await request('/courses');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.data));
    coursesList = res.data.data;

    const publishedCourses = coursesList.filter(c => c.status === 'published');
    assert.ok(publishedCourses.length >= 4, `Expected at least 4 published courses, found ${publishedCourses.length}`);

    // Verify presence of our seeded courses
    const cloudCourse = publishedCourses.find(c => c.id === 'course-cloud-01');
    const webCourse = publishedCourses.find(c => c.id === 'course-react-02');
    const dbCourse = publishedCourses.find(c => c.id === 'course-db-03');
    const dsaCourse = publishedCourses.find(c => c.id === 'course-dsa-04');

    assert.ok(cloudCourse, 'Missing published course: Cloud Computing (course-cloud-01)');
    assert.ok(webCourse, 'Missing published course: Full-Stack Web Architecture (course-react-02)');
    assert.ok(dbCourse, 'Missing published course: Database Systems (course-db-03)');
    assert.ok(dsaCourse, 'Missing published course: Data Structures & Algorithms (course-dsa-04)');

    assert.strictEqual(cloudCourse.category_id, 'cat-cloud-01');
    assert.strictEqual(webCourse.category_id, 'cat-web-02');
    assert.strictEqual(dbCourse.category_id, 'cat-db-03');
    assert.strictEqual(dsaCourse.category_id, 'cat-dsa-04');
  });

  // 2. Sections & Lessons Hierarchical Integrity
  console.log('\n--- 2. Curriculum Hierarchy & Section Structure Audit ---');
  const targetCourseIds = ['course-cloud-01', 'course-react-02', 'course-db-03', 'course-dsa-04'];
  for (const cId of targetCourseIds) {
    await test(`Course ${cId} contains multiple sections and lessons`, async () => {
      const res = await request(`/courses/${cId}/curriculum`);
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.success);
      assert.ok(Array.isArray(res.data.data), 'Expected curriculum data array');
      assert.ok(res.data.data.length >= 2, `Expected at least 2 sections in course ${cId}`);

      for (const section of res.data.data) {
        assert.ok(section.id, 'Missing section id');
        assert.ok(section.title, 'Missing section title');
        assert.ok(Array.isArray(section.lessons), `Missing lessons array in section ${section.id}`);
        assert.ok(section.lessons.length >= 1, `Section ${section.title} must have at least 1 lesson`);
      }
    });
  }

  // 3. Static Media Asset & Video Streaming Verification
  console.log('\n--- 3. Static Video Streaming Endpoint Audit ---');
  await test('Demo MP4 video streams via /uploads/media route with video/mp4 & byte ranges', async () => {
    const videoUrl = `${BASE_URL}/uploads/media/demo_lesson.mp4`;
    const res = await fetch(videoUrl);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'video/mp4');
    assert.strictEqual(res.headers.get('accept-ranges'), 'bytes');
    assert.strictEqual(res.headers.get('access-control-allow-origin'), '*');

    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 100000, `Video file too small: ${buffer.byteLength} bytes`);
  });

  // 4. Static PDF Materials Verification
  console.log('\n--- 4. Static PDF Documents & Inline Headers Audit ---');
  const samplePdfs = [
    'cloud_architecture_blueprints_2026.pdf',
    'fullstack_react_native_cheatsheet.pdf',
    'database_systems_schema_guide.pdf',
    'data_structures_algorithms_handbook.pdf'
  ];

  for (const pdfName of samplePdfs) {
    await test(`PDF document ${pdfName} serves inline with application/pdf header`, async () => {
      const pdfUrl = `${BASE_URL}/uploads/materials/${pdfName}`;
      const res = await fetch(pdfUrl);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
      assert.strictEqual(res.headers.get('content-disposition'), 'inline');
      assert.strictEqual(res.headers.get('access-control-allow-origin'), '*');

      const text = await res.text();
      assert.ok(text.startsWith('%PDF-1.'), `File ${pdfName} is not a valid PDF-1.x stream`);
    });
  }

  // 5. Student Authentication & Lesson Player API
  console.log('\n--- 5. Student Lesson Playback & Media URL Resolution ---');
  let studentToken = '';
  await test('Student authenticates and retrieves JWT token', async () => {
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'student@apex.edu', password: 'Student@123' })
    });
    assert.strictEqual(loginRes.status, 200);
    studentToken = loginRes.data.token;
  });

  await test('Student accesses video lesson (les-cloud-101) with valid video content_url', async () => {
    const res = await request('/curriculum/lessons/les-cloud-101', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.content_type, 'video');
    assert.ok(res.data.data.content_url.includes('/uploads/media/demo_lesson.mp4'));
    assert.ok(Array.isArray(res.data.data.materials));
    assert.ok(res.data.data.materials.length >= 1, 'Expected lesson to have attached materials');
    assert.strictEqual(res.data.data.materials[0].file_type, 'pdf');
  });

  await test('Student accesses PDF document lesson (les-cloud-103) with valid PDF content_url', async () => {
    const res = await request('/curriculum/lessons/les-cloud-103', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.content_type, 'pdf');
    assert.ok(res.data.data.content_url.endsWith('.pdf'));
  });

  await test('Student accesses Database Systems lesson (les-db-101 & les-db-102)', async () => {
    const resVideo = await request('/curriculum/lessons/les-db-101', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(resVideo.status, 200);
    assert.strictEqual(resVideo.data.data.content_type, 'video');
    assert.ok(resVideo.data.data.materials.length >= 1);

    const resPdf = await request('/curriculum/lessons/les-db-102', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(resPdf.status, 200);
    assert.strictEqual(resPdf.data.data.content_type, 'pdf');
  });

  await test('Student accesses Data Structures lesson (les-dsa-101 & les-dsa-102)', async () => {
    const resVideo = await request('/curriculum/lessons/les-dsa-101', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(resVideo.status, 200);
    assert.strictEqual(resVideo.data.data.content_type, 'video');
    assert.ok(resVideo.data.data.materials.length >= 1);

    const resPdf = await request('/curriculum/lessons/les-dsa-102', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(resPdf.status, 200);
    assert.strictEqual(resPdf.data.data.content_type, 'pdf');
  });

  console.log('\n---------------------------------------------------------------');
  console.log(`AUDIT RESULTS: ${passed + failed} TOTAL | ${passed} PASSED | ${failed} FAILED`);
  console.log('---------------------------------------------------------------\n');

  if (failed > 0) process.exit(1);
}

runMultimediaCurriculumAudit().catch(err => {
  console.error('[Fatal Audit Error]', err);
  process.exit(1);
});
