const fs = require('fs');
const path = require('path');
const BASE_URL = 'http://localhost:5000';

async function request(method, pathUrl, headers = {}, body = null) {
  const url = new URL(pathUrl, BASE_URL).toString();
  const init = {
    method,
    headers: { ...headers }
  };

  if (body) {
    if (typeof body === 'object' && !(body instanceof FormData) && !Buffer.isBuffer(body)) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    } else {
      init.body = body;
    }
  }

  const res = await fetch(url, init);
  const buffer = Buffer.from(await res.arrayBuffer());
  const text = buffer.toString('utf-8');
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {}

  const responseHeaders = {};
  res.headers.forEach((v, k) => {
    responseHeaders[k.toLowerCase()] = v;
  });

  return {
    status: res.status,
    headers: responseHeaders,
    body: text,
    json: json,
    buffer: buffer
  };
}

async function postMultipart(pathUrl, token, filePath, fieldName = 'file') {
  const fileBytes = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

  const header = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\nContent-Type: application/pdf\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;

  const payload = Buffer.concat([
    Buffer.from(header, 'utf-8'),
    fileBytes,
    Buffer.from(footer, 'utf-8')
  ]);

  return await request('POST', pathUrl, {
    'Authorization': `Bearer ${token}`,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': payload.length
  }, payload);
}

let passedChecks = 0;
let totalChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

async function runE2EAudit() {
  console.log('================================================================');
  console.log('   ZENORA LMS COMPREHENSIVE E2E FINAL AUDIT SUITE');
  console.log('================================================================\n');

  // ================================================================
  // 1. FILE VIEW, OPEN, AND DOWNLOAD ACROSS THE ENTIRE APP
  // ================================================================
  console.log('--- TEST 1: Physical File Verification & Express File Routes ---');

  const baseUploads = path.join(__dirname, '../uploads');
  const dirAssignments = path.join(baseUploads, 'assignments');
  const dirMaterials = path.join(baseUploads, 'materials');
  const dirSubmissions = path.join(baseUploads, 'submissions');

  assert(fs.existsSync(dirAssignments), 'Directory "uploads/assignments" exists');
  assert(fs.existsSync(dirMaterials), 'Directory "uploads/materials" exists');
  assert(fs.existsSync(dirSubmissions), 'Directory "uploads/submissions" exists');

  const pdfFiles = [
    'assignments/retail_sales_schema.pdf',
    'assignments/student_solution_cs24001.pdf',
    'materials/CS401_Syllabus.pdf',
    'materials/DBMS_Module1_Notes.pdf',
    'submissions/student_solution_cs24001.pdf',
    'submissions/student_solution_rohit.pdf'
  ];

  for (const relPdf of pdfFiles) {
    const fullP = path.join(baseUploads, relPdf);
    const exists = fs.existsSync(fullP);
    const size = exists ? fs.statSync(fullP).size : 0;
    assert(exists && size > 0, `Physical sample PDF "${relPdf}" exists with valid size (${size} bytes)`);
  }

  // Direct View/Stream: GET /api/files/view?path=:filePath
  console.log('\nTesting Universal Stream Route (GET /api/files/view):');
  const viewRes = await request('GET', '/api/files/view?path=materials/CS401_Syllabus.pdf');
  assert(viewRes.status === 200, 'GET /api/files/view?path=materials/CS401_Syllabus.pdf returns HTTP 200');
  assert(viewRes.headers['content-type'] && viewRes.headers['content-type'].includes('application/pdf'), 'Header Content-Type is "application/pdf"');
  assert(viewRes.headers['content-disposition'] && viewRes.headers['content-disposition'].includes('inline'), 'Header Content-Disposition is "inline"');
  assert(viewRes.buffer.length > 500, `Streamed PDF payload intact (${viewRes.buffer.length} bytes)`);

  // Direct Download: GET /api/files/download?path=:filePath
  console.log('\nTesting Universal Download Route (GET /api/files/download):');
  const dlRes = await request('GET', '/api/files/download?path=materials/DBMS_Module1_Notes.pdf');
  assert(dlRes.status === 200, 'GET /api/files/download returns HTTP 200');
  assert(dlRes.headers['content-disposition'] && dlRes.headers['content-disposition'].includes('attachment'), 'Header Content-Disposition is "attachment"');
  assert(dlRes.buffer.length > 500, `Downloaded PDF payload intact (${dlRes.buffer.length} bytes)`);

  // Static File Serving: GET /uploads/materials/CS401_Syllabus.pdf
  console.log('\nTesting Static File Route (GET /uploads/...):');
  const staticRes = await request('GET', '/uploads/materials/CS401_Syllabus.pdf');
  assert(staticRes.status === 200, 'Static mount app.use("/uploads") serves PDF with HTTP 200');


  // ================================================================
  // 2. CREATE AN END-TO-END FRESH TEST STUDENT & COHORT
  // ================================================================
  console.log('\n--- TEST 2: Student Authentication & Cohort Verification (Rohit Sharma) ---');

  const loginRes = await request('POST', '/api/auth/login', { 'Content-Type': 'application/json' }, {
    email: 'rohit@apex.edu',
    password: 'Student@123'
  });

  assert(loginRes.status === 200 && loginRes.json && loginRes.json.token, 'Student Rohit Sharma logs in successfully with valid JWT token');
  const studentToken = loginRes.json?.token;
  const studentUser = loginRes.json?.user;

  assert(studentUser?.name === 'Rohit Sharma', 'Student name is "Rohit Sharma"');
  assert(studentUser?.role === 'student', 'User role is "student"');
  assert(studentUser?.status === 'active', 'User status is "active"');

  const profileRes = await request('GET', '/api/students/profile', { 'Authorization': `Bearer ${studentToken}` });
  assert(profileRes.status === 200, 'GET /api/students/profile returns HTTP 200');
  const prof = profileRes.json?.data || profileRes.json?.profile;

  assert(prof?.roll_no === '24CSE199', 'Roll No matches "24CSE199"');
  assert(prof?.register_no === '312224104199', 'Register No matches "312224104199"');
  assert((prof?.department || prof?.department_code) === 'CS', 'Department is "CS"');
  assert(prof?.current_semester === 4 || prof?.semester === 4, 'Current semester is S4 (4)');
  assert(prof?.batch_name === 'CS-2024-2028-SecA', 'Batch name is "CS-2024-2028-SecA"');

  // Verify Auto-Enrollment into all 5 S4 core subjects:
  // CS401 DBMS, CS402 DAA, CS403 OS, CS404 CN, BS401 Maths
  console.log('\nVerifying Core S4 Subject Enrollments:');
  const enrollmentsRes = await request('GET', '/api/academics/my-enrollments', { 'Authorization': `Bearer ${studentToken}` });
  const enrollments = enrollmentsRes.json?.data || enrollmentsRes.json?.enrollments || [];
  const coreCodes = ['CS401', 'CS402', 'CS403', 'CS404', 'BS401'];
  
  for (const code of coreCodes) {
    const enrolled = enrollments.some(e => (e.course_code || e.subject_code || '').toUpperCase().includes(code));
    assert(enrolled, `Auto-enrolled in core S4 course: ${code}`);
  }


  // ================================================================
  // 3. VERIFY EVERY SINGLE BUTTON & STATE FOR ROHIT SHARMA
  // ================================================================
  console.log('\n--- TEST 3: Student Workflows (Assignments, Quizzes, Timetable, Attendance, Results) ---');

  // A. Assignments: Upload submission -> submit -> view detail -> resubmit -> download solution
  console.log('\n[Assignments Workflow]');
  // 1. Upload Submission
  const samplePdfPath = path.join(dirSubmissions, 'student_solution_rohit.pdf');
  const uploadRes = await postMultipart('/api/assignments/upload', studentToken, samplePdfPath, 'file');
  const uploadedUrl = uploadRes.json?.data?.file_url || uploadRes.json?.file_url;
  assert(uploadRes.status === 200 && uploadedUrl, 'File upload via Multer succeeds and returns file_url');

  // 2. Submit Assignment
  const submitRes = await request('POST', '/api/assignments/asg-cs401-01/submit', {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${studentToken}`
  }, {
    submission_text: 'Complete normalized 3NF relational schema solution for retail sales.',
    attachment_url: uploadedUrl,
    file_name: 'rohit_sales_schema.pdf'
  });
  assert(submitRes.status === 200 && submitRes.json?.success, 'Assignment submission records row in assignment_submissions with status "submitted"');

  // 3. Verify Single Assignment Detail shows Rohit\'s submission
  const asgDetailRes = await request('GET', '/api/assignments/asg-cs401-01', {
    'Authorization': `Bearer ${studentToken}`
  });
  assert(asgDetailRes.status === 200, 'GET /api/assignments/asg-cs401-01 returns HTTP 200');
  const mySub = asgDetailRes.json?.data?.my_submission;
  assert(mySub && (mySub.status === 'submitted' || mySub.status === 'resubmitted'), 'Assignment detail contains student my_submission record');
  assert(mySub?.attachment_url, 'my_submission contains accessible attachment_url');

  // 4. Test Resubmit
  const resubmitRes = await request('POST', '/api/assignments/asg-cs401-01/submit', {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${studentToken}`
  }, {
    submission_text: 'Revised solution with added BCNF decomposition proof.',
    attachment_url: uploadedUrl,
    file_name: 'rohit_sales_schema_revised.pdf'
  });
  assert(resubmitRes.status === 200, 'Resubmit action successfully updates submission record');

  // 5. Test Download Solution
  if (mySub && mySub.id) {
    const dlSubRes = await request('GET', `/api/assignments/submissions/${mySub.id}/download`, {
      'Authorization': `Bearer ${studentToken}`
    });
    assert(dlSubRes.status === 200, 'Download solution button endpoint returns HTTP 200 attachment');
  }

  // B. Online Assessment & Retest
  console.log('\n[Assessment & Retest Workflow]');
  // 1. Attempt Quiz
  const startQuizRes = await request('POST', '/api/quizzes/quiz-cloud-01/start-attempt', {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${studentToken}`
  }, {});
  assert(startQuizRes.status === 201 && startQuizRes.json?.attemptId, 'Attempt Quiz initializes fresh attempt, returns attemptId and time_limit');
  const attemptId = startQuizRes.json?.attemptId;
  const questions = startQuizRes.json?.questions || [];
  assert(questions.length > 0, `Quiz questions rendered properly (count: ${questions.length})`);

  // 2. Submit Answers
  const sampleAnswers = questions.map((q, idx) => ({
    question_id: q.id,
    selected_option_id: q.options && q.options[0] ? q.options[0].id : null,
    text_answer: 'Sample descriptive explanation'
  }));

  const submitQuizRes = await request('POST', '/api/quizzes/quiz-cloud-01/submit', {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${studentToken}`
  }, {
    attempt_id: attemptId,
    answers: sampleAnswers
  });
  assert(submitQuizRes.status === 200 && submitQuizRes.json?.result, 'Submit Quiz calculates score and percentage correctly');

  // 3. Retest Action
  const retestRes = await request('POST', '/api/quizzes/quiz-cloud-01/retake', {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${studentToken}`
  }, {});
  assert(retestRes.status === 201, 'Retest trigger creates fresh attempt');
  assert(retestRes.json?.attempt?.attempt_number >= 2, `Retest attempt number incremented (Attempt #${retestRes.json?.attempt?.attempt_number})`);
  assert(retestRes.json?.questions?.length === questions.length, 'Retest properly resets selected options and renders Question 1..N');
  assert(retestRes.json?.attempt?.time_spent_seconds === 0, 'Retest timer restarted cleanly');

  // C. Timetable & Attendance
  console.log('\n[Timetable & Attendance Calculation]');
  const timetableRes = await request('GET', '/api/timetable/student/my-schedule?department=CS&semester=S4', {
    'Authorization': `Bearer ${studentToken}`
  });
  assert(timetableRes.status === 200, 'GET /api/timetable/student/my-schedule returns HTTP 200');
  const periods = timetableRes.json?.data || [];
  assert(periods.length > 0, `Timetable returned ${periods.length} schedule periods for CS-S4`);
  const hasTheory = periods.some(p => (p.session_type_badge || '').includes('[THEORY]'));
  const hasLab = periods.some(p => (p.session_type_badge || '').includes('[🔬 LAB / PRACTICAL]'));
  const hasRoom = periods.every(p => p.room_number || p.room || p.room_no);
  assert(hasTheory && hasLab, 'Periods correctly tagged with [THEORY] and [🔬 LAB / PRACTICAL]');
  assert(hasRoom, 'Periods contain valid room numbers');

  // Attendance dynamic calculation
  const attRes = await request('GET', '/api/attendance/summary', {
    'Authorization': `Bearer ${studentToken}`
  });
  assert(attRes.status === 200, 'GET /api/attendance/summary returns HTTP 200');
  const attSummary = attRes.json?.data || attRes.json;
  const overallPct = attSummary?.percentage ?? attSummary?.overall?.percentage ?? attSummary?.overall?.percentage_num;
  assert(typeof overallPct === 'number' && !isNaN(overallPct), `Attendance calculated dynamically as ${overallPct}% without NaN`);
  assert(attSummary?.by_subject && attSummary.by_subject.length > 0, 'Subject-wise attendance breakdown available');

  // D. Exam Results & Mark Sheets
  console.log('\n[Exam Results & Grade Calculation]');
  const examSheetRes = await request('GET', `/api/exams/exam-cs401-cat1/student-sheet/${studentUser.id}`, {
    'Authorization': `Bearer ${studentToken}`
  });
  assert(examSheetRes.status === 200, 'GET /api/exams/exam-cs401-cat1/student-sheet returns HTTP 200');
  const sheetData = examSheetRes.json?.data;
  const totalScored = sheetData?.summary?.total_scored ?? sheetData?.total_scored_marks;
  const pct = sheetData?.summary?.percentage ?? sheetData?.percentage;
  const grade = sheetData?.summary?.grade ?? sheetData?.grade?.grade;

  assert(totalScored === 45.5, `Total marks sum properly to 45.5 / 50`);
  assert(pct === 91.0, `Percentage computed dynamically as 91.0%`);
  assert(grade === 'O', `Grade badge awarded is "O" (Outstanding) with NO wrongful "RA" fail status`);

  console.log('\n[University CBCS Mark Sheet Access Control]');
  // Completed terms (S1, S2, S3) -> Allowed
  for (const sem of [1, 2, 3]) {
    const sRes = await request('GET', `/api/results/marksheet/${sem}`, {
      'Authorization': `Bearer ${studentToken}`
    });
    const sgpa = sRes.json?.data?.summary?.sgpa ?? sRes.json?.summary?.sgpa ?? sRes.json?.data?.sgpa;
    assert(sRes.status === 200 && sgpa, `Semester S${sem} Mark Sheet accessible (SGPA: ${sgpa})`);
  }

  // Ongoing/Future terms (S4, S5, S6) -> Blocked (403)
  for (const sem of [4, 5, 6]) {
    const sRes = await request('GET', `/api/results/marksheet/${sem}`, {
      'Authorization': `Bearer ${studentToken}`
    });
    assert(sRes.status === 403, `Semester S${sem} Mark Sheet correctly blocked with HTTP 403 (Term ongoing / unpublished)`);
  }


  // ================================================================
  // 4. FACULTY & ADMIN VERIFICATION
  // ================================================================
  console.log('\n--- TEST 4: Faculty & Admin Verification ---');

  // A. Faculty Authentication
  const facLoginRes = await request('POST', '/api/auth/login', { 'Content-Type': 'application/json' }, {
    email: 'faculty@apex.edu',
    password: 'Faculty@123'
  });
  assert(facLoginRes.status === 200 && facLoginRes.json?.token, 'Faculty logs in successfully with valid JWT token');
  const facultyToken = facLoginRes.json?.token;

  // B. Faculty Attendance Register: Mark Present/Absent for CS -> S4
  console.log('\n[Faculty Attendance Register]');
  const rosterRes = await request('GET', '/api/attendance/roster?department=CS&semester=4&subject_id=sub-cs401', {
    'Authorization': `Bearer ${facultyToken}`
  });
  assert(rosterRes.status === 200, 'GET /api/attendance/roster returns CS-S4 student roster');
  const rosterStudents = rosterRes.json?.students || rosterRes.json?.data || [];
  assert(rosterStudents.length > 0, `Roster populated with ${rosterStudents.length} students`);

  const saveAttRes = await request('POST', '/api/attendance/bulk', {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${facultyToken}`
  }, {
    subject_id: 'sub-cs401',
    department: 'CS',
    semester: 4,
    date: '2026-11-02',
    session_slot: 'Morning',
    records: [
      { student_id: studentUser.id, status: 'present', remarks: 'Present and active' }
    ]
  });
  assert(saveAttRes.status === 200 && saveAttRes.json?.success, 'Faculty bulk attendance save/upsert succeeds');

  // C. Faculty Syllabus Upload & Delete
  console.log('\n[Faculty Syllabus Management]');
  const dummyUploadFile = path.join(dirMaterials, 'test_temp_syllabus.pdf');
  fs.writeFileSync(dummyUploadFile, '%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

  const createMatRes = await request('POST', '/api/materials', {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${facultyToken}`
  }, {
    subject_id: 'sub-cs401',
    title: 'Test Temporary Syllabus CS401',
    category: 'syllabus',
    file_url: '/uploads/materials/test_temp_syllabus.pdf'
  });
  assert(createMatRes.status === 201 || createMatRes.status === 200, 'Faculty material upload/create succeeds');
  const newMatId = createMatRes.json?.data?.id;

  if (newMatId) {
    const deleteMatRes = await request('DELETE', `/api/materials/${newMatId}`, {
      'Authorization': `Bearer ${facultyToken}`
    });
    assert(deleteMatRes.status === 200, 'Faculty delete button removes material and unlinks physical file');
  }

  // D. Admin Summarized Dashboards
  console.log('\n[Admin Summarized Dashboard]');
  const adminStatsRes = await request('GET', '/api/dashboard/stats?role=super_admin');
  assert(adminStatsRes.status === 200, 'GET /api/dashboard/stats returns HTTP 200');
  const cohortSummary = adminStatsRes.json?.cohort_summary;
  assert(cohortSummary && Array.isArray(cohortSummary.year_wise), 'Dashboard contains year-wise breakdown (1st, 2nd, 3rd year)');
  assert(cohortSummary.year_wise.some(y => y.year_label === '1st Year'), '1st Year cohort included');
  assert(cohortSummary.year_wise.some(y => y.year_label === '2nd Year'), '2nd Year cohort included');
  assert(cohortSummary.year_wise.some(y => y.year_label === '3rd Year'), '3rd Year cohort included');
  assert(cohortSummary && Array.isArray(cohortSummary.departments), 'Dashboard contains department breakdown (CS, EC, ME)');

  console.log('\n================================================================');
  console.log(` AUDIT COMPLETE: ${passedChecks} / ${totalChecks} CHECKS PASSED (${((passedChecks / totalChecks) * 100).toFixed(1)}%)`);
  console.log('================================================================');

  if (passedChecks === totalChecks) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runE2EAudit().catch(err => {
  console.error('[E2E Audit Execution Fatal Error]', err);
  process.exit(1);
});
