const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';

function request(method, pathUrl, body = null, token = null, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathUrl, BASE_URL);
    const headers = { ...customHeaders };
    let postData = null;

    if (body) {
      if (typeof body === 'string' || Buffer.isBuffer(body)) {
        postData = body;
      } else {
        postData = JSON.stringify(body);
        headers['Content-Type'] = 'application/json';
      }
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(url, { method, headers }, (res) => {
      let rawData = '';
      res.on('data', chunk => { rawData += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(rawData);
        } catch (e) {
          json = rawData;
        }
        resolve({ status: res.statusCode, data: json, headers: res.headers });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function uploadMultipartFile(pathUrl, filename, fileBuffer, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathUrl, BASE_URL);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

    const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/pdf\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;

    const bodyBuffer = Buffer.concat([
      Buffer.from(header, 'utf8'),
      fileBuffer,
      Buffer.from(footer, 'utf8')
    ]);

    const headers = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': bodyBuffer.length
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(url, { method: 'POST', headers }, (res) => {
      let rawData = '';
      res.on('data', chunk => { rawData += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(rawData);
        } catch (e) {
          json = rawData;
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', reject);
    req.write(bodyBuffer);
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🔒 VERIFYING RBAC & ASSIGNMENT WORKFLOW END-TO-END');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extraInfo = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName} ${extraInfo}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${extraInfo}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate Student
    console.log('--- Step 1: Authentication ---');
    const studentLogin = await request('POST', '/api/auth/login', {
      identifier: 'student@apex.edu',
      password: 'Student@123'
    });
    assert(studentLogin.status === 200 && studentLogin.data.token, 'Student login succeeds');
    const studentToken = studentLogin.data.token;
    const studentId = studentLogin.data.user.id;

    // 2. Authenticate Faculty
    const facultyLogin = await request('POST', '/api/auth/login', {
      identifier: 'faculty@apex.edu',
      password: 'Faculty@123'
    });
    assert(facultyLogin.status === 200 && facultyLogin.data.token, 'Faculty login succeeds');
    const facultyToken = facultyLogin.data.token;

    console.log('\n--- Step 2: Role-Based Access Control (RBAC) Enforcement ---');

    // Test 2a: Student calling POST /api/exams -> MUST BE 403 Forbidden
    const studentCreateExam = await request('POST', '/api/exams', {
      title: 'Hacked Exam',
      subject_id: 'sub-01',
      batch_id: 'batch-01',
      exam_date: '2026-05-01'
    }, studentToken);
    assert(studentCreateExam.status === 403, 'Student cannot create exams (403 Forbidden)');

    // Test 2b: Student calling GET /api/exams/exam-01/mark-grid -> MUST BE 403 Forbidden
    const studentMarkGrid = await request('GET', '/api/exams/exam-01/mark-grid', null, studentToken);
    assert(studentMarkGrid.status === 403, 'Student cannot view full class mark grid (403 Forbidden)');

    // Test 2c: Student calling POST /api/exams/exam-01/marks -> MUST BE 403 Forbidden
    const studentSaveMarks = await request('POST', '/api/exams/exam-01/marks', {
      marks: [{ question_id: 'q1', student_id: studentId, marks_obtained: 100 }]
    }, studentToken);
    assert(studentSaveMarks.status === 403, 'Student cannot edit or enter exam marks (403 Forbidden)');

    // Test 2d: Student calling PUT /api/exams/exam-01/questions -> MUST BE 403 Forbidden
    const studentSplitMarks = await request('PUT', '/api/exams/exam-01/questions', {
      questions: [{ question_number: 1, max_marks: 50 }]
    }, studentToken);
    assert(studentSplitMarks.status === 403, 'Student cannot configure question split marks (403 Forbidden)');

    // Test 2e: Student calling POST /api/assignments -> MUST BE 403 Forbidden
    const studentCreateAsg = await request('POST', '/api/assignments', {
      title: 'Fake Assignment',
      subject_id: 'sub-01',
      batch_id: 'batch-01',
      description: 'Test',
      due_date: '2026-05-01'
    }, studentToken);
    assert(studentCreateAsg.status === 403, 'Student cannot create assignments (403 Forbidden)');

    // Test 2f: Student calling POST /api/assignments/asg-01/grade/subm-01 -> MUST BE 403 Forbidden
    const studentGradeAsg = await request('POST', '/api/assignments/asg-01/grade/subm-01', {
      marks_awarded: 20
    }, studentToken);
    assert(studentGradeAsg.status === 403, 'Student cannot grade assignments (403 Forbidden)');

    // Test 2g: Student calling POST /api/materials -> MUST BE 403 Forbidden
    const studentUploadMat = await request('POST', '/api/materials', {
      title: 'Fake Material',
      subject_id: 'sub-01',
      file_url: 'http://example.com'
    }, studentToken);
    assert(studentUploadMat.status === 403, 'Student cannot upload course materials (403 Forbidden)');

    // Test 2h: Student trying to view another student's marksheet -> MUST BE 403 Forbidden
    const otherSheet = await request('GET', '/api/exams/exam-dbms-ia1/student-sheet/user-student-02', null, studentToken);
    assert(otherSheet.status === 403, 'Student cannot view another student\'s exam marksheet (403 Forbidden)');

    console.log('\n--- Step 3: Faculty Create Assignment ---');
    // Fetch subjects and batches
    const asgListBefore = await request('GET', '/api/assignments', null, facultyToken);
    let targetAssignment = (asgListBefore.data && asgListBefore.data.data && asgListBefore.data.data[0]) || null;

    if (!targetAssignment) {
      const createRes = await request('POST', '/api/assignments', {
        title: 'DBMS Normalization & Relational Algebra Problem Set',
        subject_id: 'sub-cse-01',
        batch_id: 'batch-cse-4a',
        description: 'Design BCNF tables and implement trigger constraints for the university database.',
        due_date: '2026-05-15',
        max_marks: 20
      }, facultyToken);
      assert(createRes.status === 201, 'Faculty successfully created assignment');
      targetAssignment = createRes.data.data;
    } else {
      console.log(`Using existing assignment: "${targetAssignment.title}" (${targetAssignment.id})`);
    }

    console.log('\n--- Step 4: Student File Upload & Submission Workflow ---');
    // 4a. Upload document to /api/assignments/upload
    const sampleFileContent = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Student Database Assignment Submission) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF', 'utf8');
    const uploadRes = await uploadMultipartFile('/api/assignments/upload', 'student_24cse101_assignment1.pdf', sampleFileContent, studentToken);

    assert(uploadRes.status === 200 && uploadRes.data.success, 'Student document upload succeeds');
    assert(uploadRes.data.data && uploadRes.data.data.file_url, `Document stored with URL: ${uploadRes.data?.data?.file_url}`);

    const uploadedFileUrl = uploadRes.data.data.file_url;

    // Verify file actually exists on disk
    const localDiskPath = path.join(__dirname, '../backend', uploadedFileUrl);
    const fileExistsOnDisk = fs.existsSync(localDiskPath);
    assert(fileExistsOnDisk, 'Uploaded file exists in local storage directory (backend/uploads/assignments)');

    // 4b. Submit assignment
    const submitRes = await request('POST', `/api/assignments/${targetAssignment.id}/submit`, {
      submission_text: 'Decomposed relation into 3NF and BCNF with functional dependencies preserved. Attached full proof document.',
      attachment_url: uploadedFileUrl
    }, studentToken);

    assert(submitRes.status === 200 && submitRes.data.success, 'Student submission recorded successfully');
    const submissionId = submitRes.data.data.id;

    // 4c. Verify student's own view has the submission
    const studentAsgView = await request('GET', `/api/assignments/${targetAssignment.id}`, null, studentToken);
    assert(studentAsgView.status === 200, 'Student can view assignment detail');
    assert(studentAsgView.data.data.my_submission !== null, 'Assignment detail reflects student\'s submission');
    assert(studentAsgView.data.data.submissions.length === 1, 'Student view only contains 1 submission (privacy protected)');

    console.log('\n--- Step 5: Teacher Review & Direct Document Preview ---');
    // 5a. Faculty fetches all submissions for the assignment
    const facultySubmissionsRes = await request('GET', `/api/assignments/${targetAssignment.id}/submissions`, null, facultyToken);
    assert(facultySubmissionsRes.status === 200, 'Faculty can fetch all student submissions');
    const facultySubmissionsList = facultySubmissionsRes.data.data.submissions;
    const studentSub = facultySubmissionsList.find(s => s.id === submissionId || s.student_id === studentId);
    assert(studentSub !== undefined, 'Faculty submissions list contains student\'s submission');

    // 5b. Direct document access / download check
    console.log(`Checking direct document preview access: ${uploadedFileUrl}`);
    const fileDownloadRes = await request('GET', uploadedFileUrl);
    assert(fileDownloadRes.status === 200, 'Uploaded document is directly accessible via HTTP GET (preview/download works)');

    console.log('\n--- Step 6: Teacher Grading & Feedback ---');
    const gradeRes = await request('POST', `/api/assignments/${targetAssignment.id}/grade/${studentSub.id}`, {
      marks_awarded: 19.5,
      feedback: 'Outstanding normalization proof and lossless join verification! Full marks on functional dependencies.'
    }, facultyToken);

    assert(gradeRes.status === 200 && gradeRes.data.success, 'Faculty successfully grades submission and adds feedback');
    assert(gradeRes.data.data.status === 'graded', 'Submission status changed to "graded"');
    assert(gradeRes.data.data.marks_awarded === 19.5, 'Marks awarded correctly saved (19.5)');

    console.log('\n--- Step 7: Dynamic Student Dashboard & Assignment Update ---');
    // 7a. Verify student assignment list reflects grade and feedback
    const studentAsgAfter = await request('GET', '/api/assignments', null, studentToken);
    const updatedTargetAsg = studentAsgAfter.data.data.find(a => a.id === targetAssignment.id);
    assert(updatedTargetAsg && updatedTargetAsg.my_submission, 'Student assignment has updated my_submission');
    assert(updatedTargetAsg.my_submission.status === 'graded', 'Student submission status is "graded"');
    assert(updatedTargetAsg.my_submission.marks_awarded === 19.5, 'Student sees awarded marks: 19.5');
    assert(updatedTargetAsg.my_submission.feedback.includes('Outstanding normalization'), 'Student sees instructor feedback comments');

    // 7b. Verify student dashboard stats updated
    const studentDashRes = await request('GET', '/api/dashboard/stats', null, studentToken);
    assert(studentDashRes.status === 200, 'Student dashboard stats retrieved');
    assert(studentDashRes.data.stats && studentDashRes.data.stats.graded_assignments >= 1, `Student dashboard reflects graded assignments: ${studentDashRes.data.stats?.graded_assignments}`);

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal error during test execution:', err);
    process.exit(1);
  }
}

runTests();
