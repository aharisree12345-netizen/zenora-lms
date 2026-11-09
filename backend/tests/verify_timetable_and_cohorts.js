const BASE_URL = 'http://localhost:5000/api';

async function runVerification() {
  console.log('================================================================');
  console.log('🧪 VERIFYING COLLEGE ACADEMIC STRUCTURE & TIMETABLE IN ZENORA LMS');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  async function getJson(url, headers = {}) {
    const res = await fetch(url, { headers });
    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
  }

  async function postJson(url, body, headers = {}) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
  }

  try {
    // 1. HEALTH CHECK
    console.log('--- 1. API Health Check ---');
    const health = await getJson(`${BASE_URL}/health`);
    assert(health.status === 200 && (health.data?.status === 'healthy' || health.data?.success), 'Backend is healthy and responsive');

    // 2. AUDIT 18 COHORTS (CS-S1..S6, EC-S1..S6, ME-S1..ME-S6)
    console.log('\n--- 2. Auditing Students Across All 18 Cohorts ---');
    const studentsRes = await getJson(`${BASE_URL}/students`);
    assert(studentsRes.status === 200 && studentsRes.data?.success, 'GET /api/students returns successfully');
    const students = studentsRes.data.data || [];
    console.log(`  Total student records returned: ${students.length}`);

    const depts = ['CS', 'EC', 'ME'];
    const sems = [1, 2, 3, 4, 5, 6];

    for (const dept of depts) {
      for (const sem of sems) {
        const cohortCode = `${dept}-S${sem}`;
        const cohortStudents = students.filter(s => {
          const deptMatch = s.department_code === dept || (s.department_name && s.department_name.toUpperCase().includes(dept === 'CS' ? 'COMPUTER' : dept === 'EC' ? 'ELECTRONICS' : 'MECHANICAL'));
          const semMatch = s.current_semester === sem || s.semester === sem;
          return deptMatch && semMatch && s.status === 'active';
        });

        assert(cohortStudents.length > 0, `Cohort ${cohortCode} has ${cohortStudents.length} enrolled active students`);
        
        // Check student details format
        if (cohortStudents.length > 0) {
          const s = cohortStudents[0];
          const hasFields = Boolean(s.roll_no && s.register_no && s.name && s.email && s.status === 'active');
          assert(hasFields, `Cohort ${cohortCode} student sample has valid roll_no (${s.roll_no}), reg_no (${s.register_no}), name (${s.name})`);
        }
      }
    }

    // 3. AUDIT TIMETABLE PERIODS FOR ALL 18 BATCHES (ODD & EVEN SEMESTERS)
    console.log('\n--- 3. Auditing Timetable Schedules Across All 18 Batches (Odd & Even Semesters) ---');
    const batchesRes = await getJson(`${BASE_URL}/batches`);
    assert(batchesRes.status === 200 && batchesRes.data?.success, 'GET /api/batches returns batches successfully');
    const batches = batchesRes.data.data || [];
    assert(batches.length >= 18, `Found ${batches.length} batches (expected >= 18)`);

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    let allBatchesHaveFullTimetable = true;

    for (const batch of batches) {
      const scheduleRes = await getJson(`${BASE_URL}/academics/schedules?batch_id=${batch.id}`);
      const periods = scheduleRes.data?.data || [];
      const has25Periods = periods.length === 25;
      if (!has25Periods) {
        allBatchesHaveFullTimetable = false;
        console.error(`  ❌ Batch ${batch.name} (${batch.id}) has ${periods.length} periods (expected 25)`);
      }

      // Check fields for each period
      const firstPeriod = periods[0];
      if (firstPeriod) {
        const hasRequiredSlotDetails = Boolean(
          firstPeriod.subject_code &&
          firstPeriod.subject_name &&
          firstPeriod.room_number &&
          firstPeriod.faculty_name
        );
        if (!hasRequiredSlotDetails) {
          console.error(`  ❌ Batch ${batch.name} missing period slot details`);
        }
      }
    }
    assert(allBatchesHaveFullTimetable, 'All 18 Batches have full 25 scheduled periods (5 periods/day Mon-Fri)');

    // 4. TEST REAL-TIME "LIVE NOW / ONGOING CLASS" ENGINE LOGIC
    console.log('\n--- 4. Real-Time "Live Now / Ongoing" Engine Logic Test ---');
    // Simulate Tuesday at 13:35 (01:35 PM)
    const testCurrentMinutes = 13 * 60 + 35; // 815 minutes into day
    const testDay = 'Tuesday';

    function parseTimeToMinutes(timeStr) {
      if (!timeStr) return null;
      const clean = timeStr.trim().toUpperCase();
      const is12Hour = clean.includes('AM') || clean.includes('PM');
      if (is12Hour) {
        const isPM = clean.includes('PM');
        const isAM = clean.includes('AM');
        const timePart = clean.replace(/(AM|PM)/g, '').trim();
        const [hStr, mStr] = timePart.split(':');
        let hours = parseInt(hStr, 10);
        const mins = parseInt(mStr || '0', 10);
        if (isPM && hours < 12) hours += 12;
        if (isAM && hours === 12) hours = 0;
        return hours * 60 + mins;
      }
      const [hStr, mStr] = clean.split(':');
      return parseInt(hStr, 10) * 60 + parseInt(mStr || '0', 10);
    }

    const csS4Batch = batches.find(b => b.id === 'batch-cs-s4' || b.name.includes('CS-S4') || b.code === 'CS-S4');
    assert(Boolean(csS4Batch), 'Found target test batch CS-S4');

    const csS4Schedule = await getJson(`${BASE_URL}/academics/schedules?batch_id=${csS4Batch.id}`);
    const tuesdayPeriods = (csS4Schedule.data?.data || []).filter(p => p.day_of_week === testDay);

    assert(tuesdayPeriods.length === 5, `CS-S4 Tuesday has 5 scheduled periods`);

    const liveMatch = tuesdayPeriods.find(p => {
      const sMin = parseTimeToMinutes(p.start_time);
      const eMin = parseTimeToMinutes(p.end_time);
      return sMin !== null && eMin !== null && testCurrentMinutes >= sMin && testCurrentMinutes < eMin;
    });

    assert(Boolean(liveMatch), `Real-time engine matches live period at 01:35 PM: ${liveMatch?.subject_code} - ${liveMatch?.subject_name}`);
    if (liveMatch) {
      const eMin = parseTimeToMinutes(liveMatch.end_time);
      const remaining = eMin - testCurrentMinutes;
      assert(remaining === 40, `Remaining minutes accurately computed as ${remaining} mins (Period ends at ${liveMatch.end_time})`);
      assert(Boolean(liveMatch.faculty_name && liveMatch.room_number), `Period includes Faculty (${liveMatch.faculty_name}) and Hall/Room (${liveMatch.room_number})`);
    }

    // 5. STUDENT AUTH & DIRECT ACADEMIC LANDING
    console.log('\n--- 5. Student Authentication & Academic Timetable Access ---');
    const loginRes = await postJson(`${BASE_URL}/auth/login`, {
      email: 'student@apex.edu',
      password: 'Student@123'
    });
    assert(loginRes.status === 200 && loginRes.data?.success, 'Student Alex Rivera (CS-S4) logs in successfully');
    const studentUser = loginRes.data.user;
    const token = loginRes.data.token;
    assert(studentUser.role === 'student', 'User role is student');
    assert(studentUser.student_profile?.batch_id === 'batch-cs-s4', 'Student profile batch_id is batch-cs-s4');

    // Fetch timetable using student token without batch_id param (must auto-resolve student's cohort)
    const myScheduleRes = await getJson(`${BASE_URL}/academics/schedules`, {
      Authorization: `Bearer ${token}`
    });
    assert(myScheduleRes.status === 200 && myScheduleRes.data?.success, 'GET /api/academics/schedules automatically resolves student batch');
    assert(myScheduleRes.data?.data?.length === 25, `Student receives full 25 scheduled periods for their cohort CS-S4`);

  } catch (err) {
    console.error('Fatal verification error:', err);
    assert(false, `Verification threw exception: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(`📊 FINAL RESULT: ${passedTests} / ${totalTests} ASSERTIONS PASSED`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runVerification();
