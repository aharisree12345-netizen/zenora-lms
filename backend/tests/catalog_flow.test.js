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

async function runCatalogTests() {
  console.log('\n======================================================');
  console.log('🧪 ZENORA LMS: ACADEMIC COURSE CATALOG FLOW TEST SUITE');
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

  // 1. Unauthenticated Course Catalog
  await test('Public catalog endpoint returns published courses', async () => {
    const res = await request('/courses');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(Array.isArray(res.data.data), 'Expected data to be an array');
    assert.ok(res.data.data.length > 0, 'Expected at least 1 course in catalog');
    const firstCourse = res.data.data[0];
    assert.ok(firstCourse.id, 'Missing course id');
    assert.ok(firstCourse.title, 'Missing course title');
    assert.ok(firstCourse.category_name, 'Missing category_name');
    assert.ok(firstCourse.instructor_name, 'Missing instructor_name');
    assert.strictEqual(firstCourse.status, 'published');
  });

  // 2. Categories Endpoints (Both meta/categories and categories)
  await test('Category endpoints return active topic categories', async () => {
    const metaRes = await request('/courses/meta/categories');
    assert.strictEqual(metaRes.status, 200);
    assert.strictEqual(metaRes.data.success, true);
    assert.ok(Array.isArray(metaRes.data.data));
    assert.ok(metaRes.data.data.length >= 4);

    const aliasRes = await request('/courses/categories');
    assert.strictEqual(aliasRes.status, 200);
    assert.strictEqual(aliasRes.data.success, true);
    assert.deepStrictEqual(metaRes.data.data.length, aliasRes.data.data.length);
  });

  // 3. Student Role Catalog with Enrolment State
  let studentToken = '';
  await test('Student login and catalog with enrolment details', async () => {
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'student@apex.edu', password: 'Student@123' })
    });
    assert.strictEqual(loginRes.status, 200);
    studentToken = loginRes.data.token;

    const res = await request('/courses', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.data.length > 0);
    // alex johnson has an enrolment in course-cloud-01
    const enrolledCourse = res.data.data.find(c => c.is_enrolled === true);
    assert.ok(enrolledCourse, 'Expected student to have at least one enrolled course');
    assert.ok(typeof enrolledCourse.user_progress === 'number');
  });

  // 4. Instructor Role Catalog (sees own courses including drafts)
  await test('Instructor login and catalog includes authored courses', async () => {
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'instructor@apex.edu', password: 'Instructor@123' })
    });
    assert.strictEqual(loginRes.status, 200);
    const instructorToken = loginRes.data.token;

    const res = await request('/courses', {
      headers: { Authorization: `Bearer ${instructorToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    // instructor authored course-ml-03 which is draft
    const draftCourse = res.data.data.find(c => c.status === 'draft');
    assert.ok(draftCourse, 'Instructor should be able to view their authored draft course');
  });

  // 5. Institution Admin Role Catalog
  await test('Institution Admin login and catalog access', async () => {
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@apex.edu', password: 'Admin@123' })
    });
    assert.strictEqual(loginRes.status, 200);
    const instToken = loginRes.data.token;

    const res = await request('/courses', {
      headers: { Authorization: `Bearer ${instToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.data.length > 0);
  });

  // 6. Category Filtering
  await test('Topic filter returns only courses matching category', async () => {
    const res = await request('/courses?category=cat-cloud-01');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    for (const c of res.data.data) {
      assert.strictEqual(c.category_id, 'cat-cloud-01');
    }
  });

  // 7. Difficulty Filtering
  await test('Difficulty filter returns matching courses', async () => {
    const res = await request('/courses?difficulty=intermediate');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    for (const c of res.data.data) {
      assert.strictEqual(c.difficulty_level, 'intermediate');
    }
  });

  // 8. Keyword Search
  await test('Keyword search returns courses matching title/subtitle', async () => {
    const res = await request('/courses?search=React');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.data.length >= 1);
    assert.ok(res.data.data.some(c => c.title.toLowerCase().includes('react')));
  });

  // 9. Empty Result State (0 courses found)
  await test('Query with no matches returns 0 courses (triggers empty state)', async () => {
    const res = await request('/courses?search=XYZ_NON_EXISTENT_SEARCH_STRING_12345');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.count, 0);
    assert.deepStrictEqual(res.data.data, []);
  });

  console.log('\n------------------------------------------------------');
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('------------------------------------------------------\n');

  if (failed > 0) process.exit(1);
}

runCatalogTests();
