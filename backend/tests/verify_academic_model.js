const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function login(email, password) {
  const res = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email, password });
  const token = res.data?.token || res.data?.data?.token;
  if (!token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
  }
  return token;
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 VERIFYING 3-YEAR / 6-SEMESTER ACADEMIC COLLEGE MODEL');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Academic Hierarchy & Seeding
    // ----------------------------------------------------
    console.log('--- 1. Testing Academic Hierarchy & Seeding ---');
    const adminToken = await login('admin@apex.edu', 'Admin@123');
    const adminHeaders = { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

    const deptRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/departments',
      method: 'GET',
      headers: adminHeaders
    });
    const depts = deptRes.data?.data || [];
    const deptCodes = depts.map(d => d.code);
    assert(deptCodes.includes('CS'), 'CS (Computer Science) department exists');
    assert(deptCodes.includes('EC'), 'EC (Electronics) department exists');
    assert(deptCodes.includes('ME'), 'ME (Mechanical) department exists');
    assert(deptCodes.includes('BS'), 'BS (Basic Sciences & Humanities) department exists');

    const batchRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/batches',
      method: 'GET',
      headers: adminHeaders
    });
    const batches = batchRes.data?.data || [];
    const semesters = [...new Set(batches.map(b => b.semester))].sort((a,b) => a - b);
    assert(JSON.stringify(semesters) === JSON.stringify([1, 2, 3, 4, 5, 6]), `Semesters S1 to S6 are seeded across 3 academic years: [${semesters.join(', ')}]`);

    // Check Faculty seeding count per department
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.join(__dirname, '..', 'data', 'zenora_lms.json');
    const rawData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    const facultyUsers = (rawData.users || []).filter(u => u.role === 'faculty' || u.role === 'instructor');
    const csFaculty = facultyUsers.filter(u => u.department_id === 'dept-cs' || (rawData.faculty_profiles || []).find(f => f.user_id === u.id && f.department_id === 'dept-cs'));
    const ecFaculty = facultyUsers.filter(u => u.department_id === 'dept-ec' || (rawData.faculty_profiles || []).find(f => f.user_id === u.id && f.department_id === 'dept-ec'));
    const meFaculty = facultyUsers.filter(u => u.department_id === 'dept-me' || (rawData.faculty_profiles || []).find(f => f.user_id === u.id && f.department_id === 'dept-me'));
    const bsFaculty = facultyUsers.filter(u => u.department_id === 'dept-bs' || (rawData.faculty_profiles || []).find(f => f.user_id === u.id && f.department_id === 'dept-bs'));

    assert(csFaculty.length === 3, `CS Department has 3 faculty members (found ${csFaculty.length})`);
    assert(ecFaculty.length === 3, `EC Department has 3 faculty members (found ${ecFaculty.length})`);
    assert(meFaculty.length === 3, `ME Department has 3 faculty members (found ${meFaculty.length})`);
    assert(bsFaculty.length === 2, `Basic Sciences Department has 2 faculty members (found ${bsFaculty.length})`);

    // Verify test students
    const student1 = (rawData.users || []).find(u => u.email === 'student@apex.edu');
    const student2 = (rawData.users || []).find(u => u.email === 'jessica@apex.edu');
    const student3 = (rawData.users || []).find(u => u.email === 'david@apex.edu');
    const prof1 = (rawData.student_profiles || []).find(p => p.user_id === student1?.id);
    const prof2 = (rawData.student_profiles || []).find(p => p.user_id === student2?.id);
    const prof3 = (rawData.student_profiles || []).find(p => p.user_id === student3?.id);
    assert(student1 && student1.department_id === 'dept-cs' && prof1 && prof1.current_semester === 4, 'Test Student 1 (Alex Rivera) assigned to CS-S4');
    assert(student2 && student2.department_id === 'dept-ec' && prof2 && prof2.current_semester === 2, 'Test Student 2 (Jessica Chen) assigned to EC-S2');
    assert(student3 && student3.department_id === 'dept-me' && prof3 && prof3.current_semester === 6, 'Test Student 3 (David Kumar) assigned to ME-S6');

    // ----------------------------------------------------
    // TEST 2: Department & Semester-Specific Notifications / Exams
    // ----------------------------------------------------
    console.log('\n--- 2. Testing Department & Semester-Specific Filtering ---');
    const csToken = await login('student@apex.edu', 'Student@123');
    const csHeaders = { 'Authorization': `Bearer ${csToken}` };

    const csAnnRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/announcements',
      method: 'GET',
      headers: csHeaders
    });
    const csNotices = csAnnRes.data?.data || [];
    assert(csNotices.length > 0, `CS-S4 student received ${csNotices.length} targeted notices`);
    const csNoticesValid = csNotices.every(n => {
      const deptOk = !n.target_department || n.target_department === 'ALL' || n.target_department === 'CS';
      const semOk = !n.target_semester || n.target_semester === 'ALL' || String(n.target_semester) === '4';
      return deptOk && semOk;
    });
    assert(csNoticesValid, 'All notices for CS-S4 student match target department CS/ALL and target semester S4/ALL');

    const csExamsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/exams',
      method: 'GET',
      headers: csHeaders
    });
    const csExams = csExamsRes.data?.data || [];
    assert(csExams.length > 0, `CS-S4 student received ${csExams.length} targeted exams`);
    const csExamsValid = csExams.every(e => {
      const deptOk = !e.department_code || e.department_code === 'ALL' || e.department_code === 'CS';
      const semOk = !e.semester || e.semester === 'ALL' || String(e.semester) === '4';
      return deptOk && semOk;
    });
    assert(csExamsValid, 'All exams for CS-S4 student match department CS and semester S4');

    // Compare with EC-S2 Student
    const ecToken = await login('jessica@apex.edu', 'Student@123');
    const ecHeaders = { 'Authorization': `Bearer ${ecToken}` };

    const ecAnnRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/announcements',
      method: 'GET',
      headers: ecHeaders
    });
    const ecNotices = ecAnnRes.data?.data || [];
    const ecNoticesValid = ecNotices.every(n => {
      const deptOk = !n.target_department || n.target_department === 'ALL' || n.target_department === 'EC';
      const semOk = !n.target_semester || n.target_semester === 'ALL' || String(n.target_semester) === '2';
      return deptOk && semOk;
    });
    assert(ecNoticesValid, 'All notices for EC-S2 student strictly match EC/ALL and S2/ALL');

    // ----------------------------------------------------
    // TEST 3: Faculty Daily Attendance Register & Bulk Upsert
    // ----------------------------------------------------
    console.log('\n--- 3. Testing Faculty Daily Attendance Register ---');
    const facultyToken = await login('faculty@apex.edu', 'Faculty@123');
    const facultyHeaders = { 'Authorization': `Bearer ${facultyToken}`, 'Content-Type': 'application/json' };

    // Get Roster for CS Semester 4, Subject CS401
    const testDate = '2026-10-27';
    const rosterRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/attendance/roster?department=CS&semester=4&subject_id=sub-cs401&date=${testDate}`,
      method: 'GET',
      headers: facultyHeaders
    });
    const roster = rosterRes.data?.data || rosterRes.data?.students || [];
    assert(roster.length > 0, `Roster returned ${roster.length} enrolled students for CS-S4`);
    assert(roster.some(s => s.student_id === 'user-student-01'), 'Alex Rivera (user-student-01) is in the CS-S4 roster');

    // Initial Bulk Mark Attendance
    const bulkPayload = {
      subject_id: 'sub-cs401',
      date: testDate,
      session_slot: 'Period 1 (08:45 AM - 09:40 AM)',
      records: roster.map((s, idx) => ({
        student_id: s.student_id,
        status: idx === 0 ? 'present' : 'absent',
        remarks: 'Test Attendance Verification 1'
      }))
    };

    const markRes1 = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/attendance/bulk',
      method: 'POST',
      headers: facultyHeaders
    }, bulkPayload);
    assert(markRes1.status === 200 && markRes1.data?.success, 'POST /api/attendance/bulk saved initial attendance');

    // Check count in raw database
    const dbState1 = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const initialMatchCount = (dbState1.attendance || []).filter(a => a.subject_id === 'sub-cs401' && a.date === testDate).length;
    assert(initialMatchCount === roster.length, `Attendance table has exactly ${initialMatchCount} entries for date ${testDate}`);

    // Update Attendance (Toggle all to Present) - Ensure NO DUPLICATES created!
    const updatePayload = {
      subject_id: 'sub-cs401',
      date: testDate,
      session_slot: 'Period 1 (08:45 AM - 09:40 AM)',
      records: roster.map(s => ({
        student_id: s.student_id,
        status: 'present',
        remarks: 'Updated to All Present'
      }))
    };

    const markRes2 = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/attendance/bulk',
      method: 'POST',
      headers: facultyHeaders
    }, updatePayload);
    assert(markRes2.status === 200 && markRes2.data?.success, 'POST /api/attendance/bulk executed update for same date');

    const dbState2 = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const updatedMatches = (dbState2.attendance || []).filter(a => a.subject_id === 'sub-cs401' && a.date === testDate);
    assert(updatedMatches.length === roster.length, `No duplicate records: count remains exactly ${updatedMatches.length}`);
    assert(updatedMatches.every(a => a.status === 'present'), 'All records updated properly to status "present"');

    // ----------------------------------------------------
    // TEST 4: Dynamic Student Attendance Engine
    // ----------------------------------------------------
    console.log('\n--- 4. Testing Dynamic Student Attendance Engine ---');
    const dashRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/dashboard/stats',
      method: 'GET',
      headers: csHeaders
    });

    const dashData = dashRes.data || {};
    const attSum = dashData.attendance_summary;
    assert(attSum !== undefined, 'Dashboard returns attendance_summary object');
    assert(attSum.formula === '(Total Present Sessions / Total Held Sessions) * 100', `Formula verified: ${attSum.formula}`);
    
    const expectedPct = ((attSum.total_present / attSum.total_held) * 100).toFixed(1) + '%';
    assert(attSum.percentage === expectedPct, `Calculated percentage (${attSum.percentage}) matches expected formula (${expectedPct})`);
    
    assert(Array.isArray(attSum.by_subject) && attSum.by_subject.length > 0, `Subject-wise breakdown returned ${attSum.by_subject.length} subjects`);
    const sampleSub = attSum.by_subject[0];
    assert(sampleSub.code && sampleSub.name && sampleSub.total_held !== undefined && sampleSub.total_present !== undefined, `Subject breakdown fields intact: ${sampleSub.code} - ${sampleSub.name} (${sampleSub.total_present}/${sampleSub.total_held})`);

    console.log('\n====================================================');
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
