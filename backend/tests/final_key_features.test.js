const http = require('http');

const BASE_URL = 'http://localhost:5000';

function request(path, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING FINAL KEY FEATURES AUDIT ===\n');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ✕ [FAIL] ${message}`);
    }
  }

  // 1. Authenticate users
  console.log('1. Authenticating test users (Admin, Faculty, Student)...');
  const adminLogin = await request('/api/auth/login', { method: 'POST' }, { identifier: 'admin@apex.edu', password: 'Admin@123' });
  assert(adminLogin.status === 200 && adminLogin.data.token, 'Institution Admin logged in successfully');
  const adminToken = adminLogin.data.token;

  const facultyLogin = await request('/api/auth/login', { method: 'POST' }, { identifier: 'instructor@apex.edu', password: 'Instructor@123' });
  assert(facultyLogin.status === 200 && facultyLogin.data.token, 'Instructor / Faculty logged in successfully');
  const facultyToken = facultyLogin.data.token;

  const studentLogin = await request('/api/auth/login', { method: 'POST' }, { identifier: 'student@apex.edu', password: 'Student@123' });
  assert(studentLogin.status === 200 && studentLogin.data.token, 'Student logged in successfully');
  const studentToken = studentLogin.data.token;
  const studentUser = studentLogin.data.user;

  // 2. Test Feature 2: CSV Bulk Student Import with Deduplication & Default Credentials
  console.log('\n2. Testing Feature 2: CSV Bulk Student Import...');
  const testRoll1 = 'TEST-ROLL-' + Date.now().toString().slice(-4);
  const testRoll2 = 'TEST-ROLL-' + (Date.now() + 1).toString().slice(-4);
  const csvContent = `Name, Email, Roll Number
Bulk Student Alpha, alpha_${Date.now()}@apex.edu, ${testRoll1}
Bulk Student Beta, beta_${Date.now()}@apex.edu, ${testRoll2}
Duplicate Alpha, alpha_${Date.now()}@apex.edu, ${testRoll1}`;

  const bulkImportRes = await request('/api/students/bulk-import', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  }, { csv_text: csvContent });

  assert((bulkImportRes.status === 200 || bulkImportRes.status === 201) && bulkImportRes.data.success, 'POST /api/students/bulk-import returns 200/201 Success');
  assert(bulkImportRes.data.importedCount === 2, `Imported 2 unique student records (got: ${bulkImportRes.data.importedCount})`);
  assert(bulkImportRes.data.skippedCount >= 1, `Detected and skipped duplicate record (skipped: ${bulkImportRes.data.skippedCount})`);

  // Verify that newly imported student can log in using default password
  const testStudentLogin = await request('/api/auth/login', { method: 'POST' }, {
    identifier: testRoll1,
    password: testRoll1
  });
  assert(testStudentLogin.status === 200 && testStudentLogin.data.token, `Imported student successfully authenticated with default password (${testRoll1})`);

  // 3. Test Feature 1: Certificate Generation & Public Verification
  console.log('\n3. Testing Feature 1: Certificate Generation & Public Verification...');
  // Complete all lessons in a demo course for student
  const courseId = 'course-cloud-01';
  const courseDetail = await request(`/api/courses/${courseId}`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(courseDetail.status === 200 && courseDetail.data.success, 'Course details fetched successfully');

  // Complete lessons in course
  const sections = courseDetail.data.data.sections || [];
  let lastLessonId = null;
  for (const sec of sections) {
    for (const les of (sec.lessons || [])) {
      lastLessonId = les.id;
      await request(`/api/curriculum/lessons/${les.id}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` }
      }, {});
    }
  }

  // Also pass the course quiz to reach 100%
  const quizzesRes = await request(`/api/quizzes?course_id=${courseId}`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  if (quizzesRes.data?.data?.length > 0) {
    const targetQuiz = quizzesRes.data.data[0];
    const startRes = await request(`/api/quizzes/${targetQuiz.id}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` }
    }, {});
    if (startRes.data?.attempt) {
      // Fetch quiz questions
      const qDetail = await request(`/api/quizzes/${targetQuiz.id}`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      const questions = qDetail.data.data.questions || [];
      const answers = questions.map(q => {
        const correctOpt = (q.options || []).find(o => o.is_correct) || q.options[0];
        return {
          question_id: q.id,
          selected_option_id: correctOpt ? correctOpt.id : null,
          answer_text: 'Cloud computing high availability'
        };
      });

      const submitQuizRes = await request(`/api/quizzes/${targetQuiz.id}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` }
      }, {
        attempt_id: startRes.data.attempt.id,
        answers
      });
      assert(submitQuizRes.status === 200 && submitQuizRes.data.result.is_passed, 'Quiz completed and passed');
    }
  }

  // Check updated course details for unlocked certificate
  const updatedCourse = await request(`/api/courses/${courseId}`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(updatedCourse.status === 200, 'Updated course details retrieved');
  const cert = updatedCourse.data.data.certificate;
  assert(cert && cert.verification_code, `Automated certificate unlocked with Verification ID: ${cert ? cert.verification_code : 'N/A'}`);

  // Test Public Verification endpoint
  if (cert && cert.verification_code) {
    const verifyRes = await request(`/api/certificates/verify/${encodeURIComponent(cert.verification_code)}`);
    assert(verifyRes.status === 200 && verifyRes.data.verified, `Public registry verified certificate: ${cert.verification_code}`);
    assert(verifyRes.data.cryptographic_integrity === 'SECURE_AND_VERIFIED', 'Cryptographic HMAC-SHA256 integrity verified');
    assert(verifyRes.data.certificate.status === 'Authentic & Valid', 'Certificate marked Authentic & Valid on Zenora Registry');
  }

  // 4. Test Feature 3: Quiz Attempts and Timed Submissions
  console.log('\n4. Testing Feature 3: Quiz Assessment & Timer Engine...');
  const anyQuiz = (quizzesRes.data?.data && quizzesRes.data.data[0]) || { id: 'quiz-01' };
  const quizDetailRes = await request(`/api/quizzes/${anyQuiz.id}`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(quizDetailRes.status === 200 && quizDetailRes.data.data.time_limit_minutes > 0, `Quiz enforces ${quizDetailRes.data.data?.time_limit_minutes} minute exam timer`);

  // 5. Test Feature 4: Assignment Resubmission Flow
  console.log('\n5. Testing Feature 4: Assignment Resubmission Flow...');
  // Find or create assignment
  const assignmentsRes = await request('/api/assignments', {
    headers: { Authorization: `Bearer ${facultyToken}` }
  });
  assert(assignmentsRes.status === 200 && assignmentsRes.data.data.length > 0, 'Assignments listed successfully');
  const targetAsg = assignmentsRes.data.data[0];

  // Student submits assignment
  const initialSubmitRes = await request(`/api/assignments/${targetAsg.id}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` }
  }, {
    submission_text: 'Initial assignment solution document draft.',
    attachment_url: 'https://zenora.edu/uploads/assignments/initial_draft.pdf'
  });
  assert(initialSubmitRes.status === 200 && initialSubmitRes.data.success, 'Student initial assignment submission successful');
  const subId = initialSubmitRes.data.data.id;

  // Faculty requests resubmission with feedback note
  const resubNote = 'Please correct Question 3 Boyce-Codd Normal Form decomposition and attach schema proofs.';
  const reqResubRes = await request(`/api/assignments/${targetAsg.id}/resubmission-request/${subId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${facultyToken}` }
  }, {
    feedback: resubNote
  });
  assert(reqResubRes.status === 200 && reqResubRes.data.success, 'Faculty successfully requested resubmission with feedback note');
  assert(reqResubRes.data.data.status === 'resubmission_requested', 'Submission status updated to "resubmission_requested"');

  // Verify student sees the resubmission request and feedback note
  const studentAsgList = await request('/api/assignments', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const myAsg = studentAsgList.data.data.find(a => a.id === targetAsg.id);
  assert(myAsg.my_submission.status === 'resubmission_requested', 'Student views status "resubmission_requested"');
  assert(myAsg.my_submission.feedback === resubNote, `Student received exact instructor revision note: "${resubNote}"`);

  // Student resubmits revised solution
  const resubmitWorkRes = await request(`/api/assignments/${targetAsg.id}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` }
  }, {
    submission_text: 'Revised solution addressing normal form decomposition.',
    attachment_url: 'https://zenora.edu/uploads/assignments/revised_final.pdf'
  });
  assert(resubmitWorkRes.status === 200 && resubmitWorkRes.data.success, 'Student successfully uploaded revised assignment solution');
  assert(resubmitWorkRes.data.data.status === 'resubmitted', 'Submission status transitioned to "resubmitted"');

  // Faculty evaluates the resubmitted work
  const gradeRes = await request(`/api/assignments/${targetAsg.id}/grade/${subId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${facultyToken}` }
  }, {
    marks_awarded: 19,
    feedback: 'Excellent revised decomposition and comprehensive proof.'
  });
  assert(gradeRes.status === 200 && gradeRes.data.success, 'Faculty evaluated resubmitted work (Marks: 19)');
  assert(gradeRes.data.data.status === 'graded', 'Submission status transitioned to "graded"');

  console.log(`\n=== FINAL KEY FEATURES AUDIT SUMMARY: ${passed}/${total} TESTS PASSED ===\n`);
  if (passed === total) {
    console.log('🎉 ALL 4 KEY FEATURES IMPLEMENTED AND VERIFIED WITH 100% SUCCESS!');
    process.exit(0);
  } else {
    console.error('Some tests failed.');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
