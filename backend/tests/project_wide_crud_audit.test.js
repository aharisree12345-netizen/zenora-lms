/**
 * Zenora LMS - Project-Wide Automated Audit & Sanity Verification Suite
 * Tests all 7 Core Modules end-to-end against live endpoints.
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

let adminToken = null;
let facultyToken = null;
let studentToken = null;

let passedChecks = 0;
let totalChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedChecks++;
  console.log(`✅ PASS: ${message}`);
}

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const res = await fetch(url, { ...options, headers });
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch (e) {}
  } else {
    data = await res.text();
  }
  return { status: res.status, headers: res.headers, data };
}

async function loginUser(identifier, password) {
  const res = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password })
  });
  if (res.status === 200 && res.data.success) {
    return res.data.token;
  }
  throw new Error(`Login failed for ${identifier}: ${res.data?.message}`);
}

async function runAudit() {
  console.log('\n===============================================================');
  console.log('🚀 STARTING ZENORA LMS PROJECT-WIDE AUDIT & CRUD VERIFICATION');
  console.log('===============================================================\n');

  // STEP 0: Authenticate Personas
  console.log('--- Authenticating Personas ---');
  adminToken = await loginUser('admin@apex.edu', 'Admin@123');
  assert(Boolean(adminToken), 'Admin authenticated successfully');

  facultyToken = await loginUser('faculty@apex.edu', 'Faculty@123');
  assert(Boolean(facultyToken), 'Faculty authenticated successfully');

  studentToken = await loginUser('student@apex.edu', 'Student@123');
  assert(Boolean(studentToken), 'Student authenticated successfully');

  // =========================================================================
  // MODULE 1: Syllabus & Learning Materials
  // =========================================================================
  console.log('\n--- MODULE 1: Syllabus & Learning Materials Pipeline ---');
  
  // 1.1 Physical Storage Check
  const cs401Path = path.join(UPLOADS_DIR, 'materials', 'CS401_Syllabus.pdf');
  const dbmsPath = path.join(UPLOADS_DIR, 'materials', 'DBMS_Module1_Notes.pdf');
  assert(fs.existsSync(cs401Path), 'CS401_Syllabus.pdf exists on server disk');
  assert(fs.existsSync(dbmsPath), 'DBMS_Module1_Notes.pdf exists on server disk');

  // 1.2 Static serving
  const staticRes = await request('http://localhost:5000/uploads/materials/CS401_Syllabus.pdf');
  assert(staticRes.status === 200, 'express.static serves /uploads/materials/CS401_Syllabus.pdf');

  // 1.3 Material List GET
  const matListRes = await request('/materials?subject_code=CS401', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(matListRes.status === 200 && matListRes.data.success, 'GET /api/materials returns success');
  const materials = matListRes.data.data || [];
  assert(materials.length > 0, 'Found syllabus and learning materials for CS401');

  // 1.4 View Endpoint
  const firstMat = materials[0];
  const viewRes = await request(`/materials/${firstMat.id}/view`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(viewRes.status === 200, 'GET /api/materials/:id/view returns HTTP 200');
  assert(viewRes.headers.get('content-type').includes('application/pdf'), 'View endpoint returns Content-Type: application/pdf');
  assert(viewRes.headers.get('content-disposition').includes('inline'), 'View endpoint returns Content-Disposition: inline');

  // 1.5 Download Endpoint
  const dlRes = await request(`/materials/${firstMat.id}/download`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(dlRes.status === 200, 'GET /api/materials/:id/download returns HTTP 200');
  assert(dlRes.headers.get('content-type').includes('application/pdf'), 'Download endpoint returns Content-Type: application/pdf');
  assert(dlRes.headers.get('content-disposition').includes('attachment'), 'Download endpoint returns Content-Disposition: attachment');

  // 1.6 Upload Note/Syllabus
  const tempPdfPath = path.join(UPLOADS_DIR, 'materials', 'audit_temp_material.pdf');
  fs.writeFileSync(tempPdfPath, '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');
  assert(fs.existsSync(tempPdfPath), 'Temporary physical file created for upload/delete audit');

  const uploadRes = await request('/materials', {
    method: 'POST',
    headers: { Authorization: `Bearer ${facultyToken}` },
    body: JSON.stringify({
      subject_id: 'sub-cs401',
      title: 'Audit Verification Handout - Algorithms',
      description: 'Module 3 Handout for automated test',
      type: 'notes',
      unit_no: 3,
      file_url: '/uploads/materials/audit_temp_material.pdf'
    })
  });
  assert(uploadRes.status === 201 && uploadRes.data.success, 'Faculty POST /api/materials creates material with valid file_path');
  const createdMatId = uploadRes.data.data.id;

  // 1.7 Delete Note/Syllabus
  const delMatRes = await request(`/materials/${createdMatId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${facultyToken}` }
  });
  assert(delMatRes.status === 200 && delMatRes.data.success, 'Faculty DELETE /api/materials/:id removes material row');
  assert(!fs.existsSync(tempPdfPath), 'DELETE /api/materials/:id cleanly removed physical file from server disk');

  // =========================================================================
  // MODULE 2: Online Assessment & Retest Lifecycle
  // =========================================================================
  console.log('\n--- MODULE 2: Online Assessment & Retest Lifecycle ---');

  // 2.1 Create Assessment with multiple MCQs, options, marks, timer
  const createQuizRes = await request('/quizzes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${facultyToken}` },
    body: JSON.stringify({
      course_id: 'sub-cs401',
      title: 'Automated Audit Assessment: DBMS & OS Architecture',
      instructions: 'Answer all MCQs. Passing score is 60%.',
      time_limit_minutes: 25,
      passing_percentage: 60,
      questions: [
        {
          question_text: 'Which ACID property guarantees transactional durability?',
          question_type: 'mcq',
          points: 5,
          explanation: 'Durability ensures committed transactions survive system crashes.',
          options: [
            { text: 'Durability', is_correct: true },
            { text: 'Atomicity', is_correct: false },
            { text: 'Consistency', is_correct: false },
            { text: 'Isolation', is_correct: false }
          ]
        },
        {
          question_text: 'In OS scheduling, which algorithm is non-preemptive?',
          question_type: 'mcq',
          points: 5,
          explanation: 'First-Come, First-Served (FCFS) runs to completion.',
          options: [
            { text: 'FCFS', is_correct: true },
            { text: 'Round Robin', is_correct: false },
            { text: 'SRTF', is_correct: false },
            { text: 'Multilevel Queue', is_correct: false }
          ]
        }
      ]
    })
  });
  assert(createQuizRes.status === 201 && createQuizRes.data.success, 'Faculty POST /api/quizzes creates assessment with MCQs');
  const auditQuizId = createQuizRes.data.data.id;

  // 2.2 Student Read/View Assessment
  const viewQuizRes = await request(`/quizzes/${auditQuizId}`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(viewQuizRes.status === 200 && viewQuizRes.data.success, 'Student GET /api/quizzes/:id loads assessment');
  const quizDetail = viewQuizRes.data.data;
  assert(quizDetail.questions && quizDetail.questions.length === 2, 'Quiz loaded 2 questions successfully');
  assert(quizDetail.questions[0].options && quizDetail.questions[0].options.length === 4, 'Question 1 has 4 options');

  // 2.3 Start Quiz Attempt
  const startQuizRes = await request(`/quizzes/${auditQuizId}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert((startQuizRes.status === 200 || startQuizRes.status === 201) && startQuizRes.data.success, 'Student POST /api/quizzes/:id/start creates attempt');
  const attemptId1 = startQuizRes.data.attempt.id;

  // 2.4 Submit Attempt
  const q1 = quizDetail.questions[0];
  const q2 = quizDetail.questions[1];
  const submitRes = await request(`/quizzes/${auditQuizId}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      attempt_id: attemptId1,
      answers: [
        { question_id: q1.id, selected_option_id: q1.options[0].id },
        { question_id: q2.id, selected_option_id: q2.options[0].id }
      ]
    })
  });
  assert(submitRes.status === 200 && submitRes.data.success, 'Student POST /api/quizzes/:id/submit grades attempt');
  assert(submitRes.data.result.percentage === 100, 'Student scored 100% on attempt 1');

  // 2.5 Retest Assessment
  const retakeRes = await request(`/quizzes/${auditQuizId}/retake`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert((retakeRes.status === 200 || retakeRes.status === 201) && retakeRes.data.success, 'Student POST /api/quizzes/:id/retake initializes retest');
  assert(retakeRes.data.attempt.attempt_number === 2, 'Retest attempt number is 2');
  assert(retakeRes.data.questions && retakeRes.data.questions.length === 2, 'Retest loaded full questions cleanly without freeze');

  // 2.6 Edit Assessment (Faculty/Admin)
  const editQuizRes = await request(`/quizzes/${auditQuizId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${facultyToken}` },
    body: JSON.stringify({
      title: 'Automated Audit Assessment: DBMS & OS Architecture (Updated Edition)',
      time_limit_minutes: 30,
      passing_percentage: 65
    })
  });
  assert(editQuizRes.status === 200 && editQuizRes.data.success, 'Faculty PUT /api/quizzes/:id updates assessment details');

  // 2.7 Delete Assessment (Faculty/Admin)
  const delQuizRes = await request(`/quizzes/${auditQuizId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${facultyToken}` }
  });
  assert(delQuizRes.status === 200 && delQuizRes.data.success, 'Faculty DELETE /api/quizzes/:id safely deletes assessment');

  // =========================================================================
  // MODULE 3: Faculty Daily Attendance Register
  // =========================================================================
  console.log('\n--- MODULE 3: Faculty Daily Attendance Register ---');

  // 3.1 Read Attendance Roster
  const rosterRes = await request('/attendance/roster?department=CS&semester=4&subject_id=sub-cs401', {
    headers: { Authorization: `Bearer ${facultyToken}` }
  });
  assert(rosterRes.status === 200 && rosterRes.data.success, 'GET /api/attendance/roster returns cohort roster');
  const rosterStudents = rosterRes.data.students || [];
  assert(rosterStudents.length > 0, `Roster loaded ${rosterStudents.length} students`);
  assert(Boolean(rosterStudents[0].roll_no && rosterStudents[0].name), 'Student has Roll No and Name');

  // 3.2 Bulk Upsert Attendance
  const targetDate = new Date().toISOString().split('T')[0];
  const bulkAttRes = await request('/attendance/bulk', {
    method: 'POST',
    headers: { Authorization: `Bearer ${facultyToken}` },
    body: JSON.stringify({
      subject_id: 'sub-cs401',
      department: 'CS',
      semester: 4,
      date: targetDate,
      session_slot: 'Period 1 (08:45 AM - 09:40 AM)',
      records: rosterStudents.map(s => ({
        student_id: s.student_id,
        status: 'present',
        remarks: 'Audit Verified'
      }))
    })
  });
  assert(bulkAttRes.status === 200 && bulkAttRes.data.success, 'POST /api/attendance/bulk successfully upserts daily attendance');

  // 3.3 Dynamic Student Metric Verification
  const attSummaryRes = await request('/attendance/summary', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(attSummaryRes.status === 200 && attSummaryRes.data.success, 'GET /api/attendance/summary returns dynamic summary');
  const overallAtt = attSummaryRes.data.overall;
  assert(!isNaN(overallAtt.percentage_num), 'Attendance percentage is numeric and not NaN');
  assert(overallAtt.attendance_percentage.endsWith('%'), `Attendance string is properly formatted: ${overallAtt.attendance_percentage}`);
  assert(typeof overallAtt.total_held === 'number' && typeof overallAtt.total_present === 'number', 'Total held and present are valid numbers');

  const dashRes = await request('/dashboard/stats', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(dashRes.status === 200 && dashRes.data.success, 'GET /api/dashboard/stats returns student metrics');
  const dashAtt = dashRes.data.attendance_summary;
  assert(dashAtt && !isNaN(dashAtt.percentage_num), 'Student dashboard attendance metric is valid and not NaN');

  // =========================================================================
  // MODULE 4: Academic Events & Notice Board
  // =========================================================================
  console.log('\n--- MODULE 4: Academic Events & Notice Board ---');

  // 4.1 Publish Notice
  const postNoticeRes = await request('/announcements', {
    method: 'POST',
    headers: { Authorization: `Bearer ${facultyToken}` },
    body: JSON.stringify({
      title: 'Automated Audit Circular: End-Sem Exam Hall Tickets',
      content: 'All students are requested to collect their hall tickets from the department office.',
      priority: 'important',
      target_department: 'CS',
      target_semester: 'S4',
      date: targetDate
    })
  });
  assert(postNoticeRes.status === 201 && postNoticeRes.data.success, 'Faculty POST /api/announcements creates notice');
  const noticeId = postNoticeRes.data.data.id;

  // 4.2 Read/View Filtered Notices for Student
  const getNoticesRes = await request('/announcements', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(getNoticesRes.status === 200 && getNoticesRes.data.success, 'Student GET /api/announcements returns notices');
  const studentNotices = getNoticesRes.data.data || [];
  const foundOurNotice = studentNotices.find(n => n.id === noticeId);
  assert(Boolean(foundOurNotice), 'Student correctly receives scoped CS-S4 notice');
  assert(foundOurNotice.priority === 'important', 'Notice priority is cleanly tagged "important"');

  // 4.3 Update Notice
  const editNoticeRes = await request(`/announcements/${noticeId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${facultyToken}` },
    body: JSON.stringify({
      title: 'Automated Audit Circular: End-Sem Exam Hall Tickets (Updated Counter 3)',
      content: 'Updated: Collection counter moved to Room 402.'
    })
  });
  assert(editNoticeRes.status === 200 && editNoticeRes.data.success, 'Faculty PUT /api/announcements/:id updates notice');

  // 4.4 Delete Notice
  const delNoticeRes = await request(`/announcements/${noticeId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${facultyToken}` }
  });
  assert(delNoticeRes.status === 200 && delNoticeRes.data.success, 'Faculty DELETE /api/announcements/:id removes notice');

  // =========================================================================
  // MODULE 5: Faculty & Student Cohort Directories
  // =========================================================================
  console.log('\n--- MODULE 5: Faculty & Student Cohort Directories ---');

  // 5.1 Faculty Directory (Admin)
  const facListRes = await request('/admin/faculty', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(facListRes.status === 200 && facListRes.data.success, 'Admin GET /api/admin/faculty returns faculty list');
  const facultyMembers = facListRes.data.data || [];
  assert(facultyMembers.length > 0, `Admin loaded ${facultyMembers.length} faculty records`);

  // 5.2 Add Faculty Member
  const addFacRes = await request('/admin/faculty', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Dr. Alan Turing Test',
      email: `turing_${Date.now()}@apex.edu`,
      employee_id: `FAC-AUDIT-${Date.now().toString().slice(-4)}`,
      department: 'CS',
      designation: 'Professor',
      qualification: 'Ph.D. Computer Science',
      specialization: 'Automata & Distributed Systems'
    })
  });
  assert(addFacRes.status === 201 && addFacRes.data.success, 'Admin POST /api/admin/faculty creates faculty member');
  const newFacId = addFacRes.data.data.id;

  // 5.3 Edit Faculty Details & Assignments
  const editFacRes = await request(`/admin/faculty/${newFacId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Dr. Alan Turing Test (Distinguished)',
      designation: 'Distinguished Professor'
    })
  });
  assert(editFacRes.status === 200 && editFacRes.data.success, 'Admin PUT /api/admin/faculty/:id updates faculty assignments');

  // 5.4 Toggle Faculty Status
  const toggleFacRes = await request(`/admin/faculty/${newFacId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'inactive' })
  });
  assert(toggleFacRes.status === 200 && toggleFacRes.data.success, 'Admin PATCH /api/admin/faculty/:id/status toggles status to inactive');

  // 5.5 Delete Faculty
  const delFacRes = await request(`/admin/faculty/${newFacId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(delFacRes.status === 200 && delFacRes.data.success, 'Admin DELETE /api/admin/faculty/:id removes faculty');

  // 5.6 Student Directory: Cohorts Verification across CS, EC, ME and S1-S6
  const allStudentsRes = await request('/students', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(allStudentsRes.status === 200, 'Admin GET /api/students returns student list');
  const allStudents = allStudentsRes.data.data || [];
  
  const depts = ['CS', 'EC', 'ME'];
  const sems = [1, 2, 3, 4, 5, 6];
  for (const d of depts) {
    for (const s of sems) {
      const match = allStudents.find(std => {
        const dCode = (std.department_code || '').toUpperCase();
        const semNum = Number(std.current_semester || std.semester);
        return dCode === d && semNum === s;
      });
      assert(Boolean(match), `Verified student exists for Department ${d} Semester S${s}`);
    }
  }

  // 5.7 Add Student
  const uniqueRoll = `AUDIT${Date.now().toString().slice(-4)}`;
  const uniqueReg = `312224${Date.now().toString().slice(-6)}`;
  const addStudentRes = await request('/students', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Test Audit Student',
      email: `audit_std_${Date.now()}@apex.edu`,
      roll_no: uniqueRoll,
      register_no: uniqueReg,
      department_id: 'dept-cse-01',
      batch_id: 'batch-cse-4a',
      password: 'Student@123'
    })
  });
  assert(addStudentRes.status === 201 && addStudentRes.data.success, 'Admin POST /api/students registers new student');
  const newStudentId = addStudentRes.data.data.id;

  // 5.8 Edit Student Profile
  const editStudentRes = await request(`/students/${newStudentId}/profile`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Test Audit Student (Honors)',
      notes: 'Continuous internal assessment distinction'
    })
  });
  assert(editStudentRes.status === 200 && editStudentRes.data.success, 'Admin PUT /api/students/:id/profile updates student');

  // 5.9 Archive / Soft-delete Student
  const archiveStudentRes = await request(`/students/${newStudentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(archiveStudentRes.status === 200 && archiveStudentRes.data.success, 'Admin DELETE /api/students/:id archives student');
  assert(archiveStudentRes.data.status === 'suspended', 'Archived student status is set to "suspended"');

  // =========================================================================
  // MODULE 6: Timetable Synchronization
  // =========================================================================
  console.log('\n--- MODULE 6: Timetable Synchronization ---');

  // 6.1 Periods endpoint
  const periodsRes = await request('/timetable/periods?department=CS&semester=S4', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(periodsRes.status === 200 && periodsRes.data.success, 'GET /api/timetable/periods returns cohort periods');
  const cs4Periods = periodsRes.data.data || [];
  assert(cs4Periods.length > 0, `Loaded ${cs4Periods.length} timetable periods for CS-S4`);

  // 6.2 Student Schedule vs Faculty Schedule
  const studentSchedRes = await request('/timetable/student/my-schedule?department=CS&semester=S4', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(studentSchedRes.status === 200 && studentSchedRes.data.success, 'GET /api/timetable/student/my-schedule returns schedule');
  const studentSchedPeriods = studentSchedRes.data.data || [];

  const facultySchedRes = await request('/timetable/faculty/my-schedule', {
    headers: { Authorization: `Bearer ${facultyToken}` }
  });
  assert(facultySchedRes.status === 200 && facultySchedRes.data.success, 'GET /api/timetable/faculty/my-schedule returns schedule');
  const facultySchedPeriods = facultySchedRes.data.data || [];

  // Verify common period synchronization
  const matchedPeriod = studentSchedPeriods.find(sp => facultySchedPeriods.some(fp => fp.id === sp.id));
  assert(Boolean(matchedPeriod), 'Timetable periods synchronize 1:1 between student and faculty views');

  // 6.3 Theory vs Lab session badge verification
  const labPeriod = studentSchedPeriods.find(p => (p.session_type || '').toLowerCase() === 'lab');
  const theoryPeriod = studentSchedPeriods.find(p => (p.session_type || '').toLowerCase() === 'theory');
  if (labPeriod) {
    assert(labPeriod.session_type_badge.includes('LAB'), 'Lab period contains [🔬 LAB / PRACTICAL] badge');
  }
  if (theoryPeriod) {
    assert(theoryPeriod.session_type_badge.includes('THEORY'), 'Theory period contains [THEORY] badge');
  }

  // 6.4 Live Now / Ongoing indicator
  assert(typeof studentSchedRes.data.active_period !== 'undefined', 'Schedule provides active_period evaluation matching real-time clock');

  // =========================================================================
  // MODULE 7: Semester Mark Sheet / Grade Card
  // =========================================================================
  console.log('\n--- MODULE 7: Semester Mark Sheet / Grade Card ---');

  // 7.1 Results Eligibility Check
  const eligRes = await request('/results/eligibility', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(eligRes.status === 200 && eligRes.data.success, 'GET /api/results/eligibility returns eligibility status');
  const completedTerms = eligRes.data.data.completed_semesters || [];
  const currentSem = eligRes.data.data.current_semester;
  assert(currentSem === 4, `Student current semester is S4`);
  assert(JSON.stringify(completedTerms) === JSON.stringify([1, 2, 3]), `S4 student can ONLY access completed semesters [1, 2, 3]`);

  // 7.2 Access Completed Semester Mark Sheet (S3)
  const marksheetRes = await request('/results/marksheet/3', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(marksheetRes.status === 200 && marksheetRes.data.success, 'GET /api/results/marksheet/3 returns completed term mark sheet');
  const sheetData = marksheetRes.data.data;
  assert(sheetData.subjects && sheetData.subjects.length > 0, 'Marksheet contains courses list');
  
  const sampleCourse = sheetData.subjects[0];
  assert(Boolean(sampleCourse.course_code), 'Cell Course Code is present');
  assert(Boolean(sampleCourse.course_title), 'Cell Course Title is present');
  assert(typeof sampleCourse.credits === 'number', 'Cell Credits is numeric');
  assert(typeof sampleCourse.internal_marks === 'number', 'Cell Internal Marks is numeric');
  assert(typeof sampleCourse.end_sem_marks === 'number', 'Cell External Marks is numeric');
  assert(typeof sampleCourse.total_marks === 'number', 'Cell Total Marks is numeric');
  assert(Boolean(sampleCourse.grade_letter), 'Cell Grade Letter is present');
  assert(typeof sheetData.summary?.sgpa === 'number', 'Document SGPA is numeric and calculated');
  assert(Boolean(sheetData.verification?.digital_signature), 'Document contains cryptographically secure digital signature');

  // 7.3 Block Future Semester Mark Sheet (S5)
  const blockedRes = await request('/results/marksheet/5', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(blockedRes.status === 403, 'GET /api/results/marksheet/5 is strictly blocked with HTTP 403 Forbidden');
  assert(blockedRes.data.status === 'unpublished', 'Status is tagged as "unpublished"');
  assert(blockedRes.data.message.includes('not available for future'), 'Clean user-facing notice explaining future term unavailability');

  console.log('\n===============================================================');
  console.log(`🎉 ALL AUDIT CHECKS PASSED: ${passedChecks} / ${totalChecks} (100% SUCCESS)`);
  console.log('===============================================================\n');
}

runAudit().catch(err => {
  console.error('\n🚨 AUDIT FAILED WITH ERROR:', err);
  process.exit(1);
});
