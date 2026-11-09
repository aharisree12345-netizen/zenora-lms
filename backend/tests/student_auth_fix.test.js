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

async function runStudentAuthFixVerification() {
  console.log('\n===============================================================');
  console.log('🎓 VERIFYING STUDENT LOGIN, DEFAULT PASSWORD & EXACT PROFILES');
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

  // 1. Log in as Administrator
  let adminToken = '';
  await test('Admin logs in to get administrative authorization token', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'admin@apex.edu', password: 'Admin@123' })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    adminToken = res.data.token;
  });

  const ts = Date.now().toString().slice(-4);
  const student1 = {
    name: 'Vikram Anand',
    email: `vikram.${ts}@apex.edu`,
    roll_no: `24CSE${ts.slice(0, 3)}A`,
    register_no: `312224104${ts}1`,
    batch_id: 'batch-cse-4a',
    department_id: 'dept-cse-01'
  };

  const student2 = {
    name: 'Divya Patel',
    email: `divya.${ts}@apex.edu`,
    roll_no: `24CSE${ts.slice(0, 3)}B`,
    register_no: `312224104${ts}2`,
    batch_id: 'batch-cse-4a',
    department_id: 'dept-cse-01',
    password: 'DivyaCustom@2026'
  };

  // Requirement 1: Automatic default password generation & saving in MySQL users table
  await test('1. When admin adds new student without password, auto-generates Register No as default password', async () => {
    const res = await request('/students', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(student1)
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.default_password, student1.register_no);
    assert.strictEqual(res.data.data.name, student1.name);
    assert.strictEqual(res.data.data.roll_no, student1.roll_no);
    assert.strictEqual(res.data.data.register_no, student1.register_no);
  });

  await test('1b. When admin adds new student with explicit custom password, securely hashes and saves it', async () => {
    const res = await request('/students', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(student2)
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.default_password, student2.password);
  });

  // Requirement 2: Student Login validates credentials against database table instead of hardcoded mock
  let vikramToken = '';
  await test('2a. Student Login validates entered Roll Number and auto-generated default password', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: student1.roll_no, password: student1.register_no })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.user.name, student1.name);
    assert.strictEqual(res.data.user.student_profile.roll_no, student1.roll_no);
    assert.strictEqual(res.data.user.student_profile.register_no, student1.register_no);
    vikramToken = res.data.token;
  });

  await test('2b. Student Login validates entered Email and default password', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: student1.email, password: student1.register_no })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.user.name, student1.name);
  });

  await test('2c. Student Login validates entered University Register Number and default password', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: student1.register_no, password: student1.register_no })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
  });

  await test('2d. Student Login strictly rejects incorrect password (HTTP 401)', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: student1.roll_no, password: 'WrongPassword@999' })
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data.success, false);
    assert.ok(res.data.message.includes('Invalid') || res.data.message.includes('Incorrect'));
  });

  let divyaToken = '';
  await test('2e. Student Login validates custom password entered during registration', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: student2.email, password: student2.password })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.user.name, student2.name);
    divyaToken = res.data.token;
  });

  // Requirement 3: Once logged in, load and display the exact profile data of the newly logged-in student
  await test('3a. Vikram session loads exact personal profile data via /auth/me (NOT demo student Alex Rivera)', async () => {
    const res = await request('/auth/me', {
      headers: { Authorization: `Bearer ${vikramToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.name, 'Vikram Anand');
    assert.strictEqual(res.data.user.email, student1.email);
    assert.notStrictEqual(res.data.user.name, 'Alex Rivera');
    assert.strictEqual(res.data.user.student_profile.roll_no, student1.roll_no);
    assert.strictEqual(res.data.user.student_profile.register_no, student1.register_no);
  });

  await test('3b. Vikram session loads exact personal student info on Dashboard /dashboard/stats', async () => {
    const res = await request('/dashboard/stats', {
      headers: { Authorization: `Bearer ${vikramToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.student_info.name, 'Vikram Anand');
    assert.strictEqual(res.data.student_info.roll_no, student1.roll_no);
    assert.strictEqual(res.data.student_info.register_no, student1.register_no);
    assert.notStrictEqual(res.data.student_info.name, 'Alex Rivera');
    assert.notStrictEqual(res.data.student_info.roll_no, '24CSE101');
  });

  await test('3c. Divya session loads exact personal profile data via /auth/me (NOT Vikram or Alex Rivera)', async () => {
    const res = await request('/auth/me', {
      headers: { Authorization: `Bearer ${divyaToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.name, 'Divya Patel');
    assert.strictEqual(res.data.user.email, student2.email);
    assert.strictEqual(res.data.user.student_profile.roll_no, student2.roll_no);
    assert.strictEqual(res.data.user.student_profile.register_no, student2.register_no);
  });

  await test('3d. Divya session loads exact personal student info on Dashboard /dashboard/stats', async () => {
    const res = await request('/dashboard/stats', {
      headers: { Authorization: `Bearer ${divyaToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.student_info.name, 'Divya Patel');
    assert.strictEqual(res.data.student_info.roll_no, student2.roll_no);
    assert.strictEqual(res.data.student_info.register_no, student2.register_no);
  });

  console.log('\n===============================================================');
  console.log(`📊 FIX VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStudentAuthFixVerification().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
