const BASE_URL = 'http://localhost:5000/api';

async function runVerification() {
  console.log('================================================================');
  console.log('🧪 VERIFYING ONLINE ASSESSMENTS & RETEST ENGINE IN ZENORA LMS');
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
    assert(health.status === 200 && (health.data?.status === 'healthy' || health.data?.success), 'Backend is healthy');

    // 2. VERIFY COMPREHENSIVE SEEDED ASSESSMENTS ACROSS ALL DEPARTMENTS & SEMESTERS
    console.log('\n--- 2. Checking Seeded Assessments Across CS, EC, and ME (S1-S6) ---');
    // Login as admin to view all assessments across departments
    const adminLogin = await postJson(`${BASE_URL}/auth/login`, {
      email: 'admin@apex.edu',
      password: 'Admin@123'
    });
    assert(adminLogin.status === 200 && adminLogin.data?.success, 'Admin authenticated successfully');
    const adminToken = adminLogin.data.token;

    const allQuizzesRes = await getJson(`${BASE_URL}/quizzes`, {
      Authorization: `Bearer ${adminToken}`
    });
    assert(allQuizzesRes.status === 200 && allQuizzesRes.data?.success, 'GET /api/quizzes returns all assessments');
    const allQuizzes = allQuizzesRes.data.data || [];
    console.log(`  Total assessments in system: ${allQuizzes.length}`);

    const targetAssessments = [
      { code: 'CS-S1', quizId: 'quiz-cs-s1-01', expectedTitle: 'Problem Solving with C & Computational Logic' },
      { code: 'CS-S2', quizId: 'quiz-cs-s2-01', expectedTitle: 'Python Programming & Object-Oriented Structures' },
      { code: 'CS-S4', quizId: 'quiz-cs-s4-01', expectedTitle: 'Database Management Systems Midterm Quiz' },
      { code: 'EC-S2', quizId: 'quiz-ec-s2-01', expectedTitle: 'Digital Electronics & Logic Design' },
      { code: 'EC-S4', quizId: 'quiz-ec-s4-01', expectedTitle: 'Microprocessors and Microcontrollers Assessment' },
      { code: 'ME-S1', quizId: 'quiz-me-s1-01', expectedTitle: 'Engineering Mechanics Fundamentals' },
      { code: 'ME-S4', quizId: 'quiz-me-s4-01', expectedTitle: 'Thermodynamics & Fluid Mechanics Assessment' }
    ];

    for (const target of targetAssessments) {
      const found = allQuizzes.find(q => q.id === target.quizId || (q.title && q.title.includes(target.expectedTitle)));
      assert(Boolean(found), `Found required assessment for ${target.code}: "${target.expectedTitle}"`);
      if (found) {
        assert(found.status === 'published' && found.is_published, `Assessment ${target.code} is published`);
        assert(found.total_questions === 10, `Assessment ${target.code} has 10 questions`);
        assert(found.time_limit >= 15 && found.total_marks >= 50, `Assessment ${target.code} has time_limit (${found.time_limit}m) & total_marks (${found.total_marks})`);
      }
    }

    // 3. STUDENT COHORT FILTERING & 3 CATEGORIES
    console.log('\n--- 3. Student Assessment Listing & Categories (Alex Rivera, CS-S4) ---');
    const studentLogin = await postJson(`${BASE_URL}/auth/login`, {
      email: 'student@apex.edu',
      password: 'Student@123'
    });
    assert(studentLogin.status === 200 && studentLogin.data?.success, 'Student (Alex Rivera, CS-S4) logs in');
    const studentToken = studentLogin.data.token;

    const studentQuizzesRes = await getJson(`${BASE_URL}/quizzes`, {
      Authorization: `Bearer ${studentToken}`
    });
    assert(studentQuizzesRes.status === 200 && studentQuizzesRes.data?.success, 'GET /api/quizzes returns cohort assessments for student');
    const studentQuizzes = studentQuizzesRes.data.data || [];
    console.log(`  Student cohort assessments count: ${studentQuizzes.length}`);

    // Verify all returned assessments belong to CS-S4 or CS/ALL
    const allMatchCohort = studentQuizzes.every(q => 
      q.batch_id === 'batch-cs-s4' || 
      ((q.department_code === 'CS' || q.department_code === 'ALL') && (q.semester === 4 || q.semester === 'ALL'))
    );
    assert(allMatchCohort, 'All listed assessments strictly match student department (CS) and semester (4)');

    const available = studentQuizzes.filter(q => q.category === 'available');
    const upcoming = studentQuizzes.filter(q => q.category === 'upcoming');
    const completed = studentQuizzes.filter(q => q.category === 'completed');

    assert(available.length > 0, `Contains ${available.length} Active / Available assessment(s)`);
    assert(upcoming.length > 0, `Contains ${upcoming.length} Upcoming assessment(s)`);
    assert(completed.length > 0, `Contains ${completed.length} Completed assessment(s) with Retest allowed`);

    const completedQuiz = completed[0];
    console.log(`  Completed Assessment Sample: "${completedQuiz.title}" (Attempts: ${completedQuiz.my_attempts_count}, Best: ${completedQuiz.best_score}%)`);

    // 4. RETEST FLOW BUG FIX VERIFICATION
    console.log('\n--- 4. Retest / Retake API Flow Verification (No Empty Questions, Fresh Attempt) ---');
    // Initiate Retake on the completed assessment
    const retakeRes = await postJson(`${BASE_URL}/quizzes/${completedQuiz.id}/retake`, {}, {
      Authorization: `Bearer ${studentToken}`
    });
    assert(retakeRes.status === 201 && retakeRes.data?.success, 'POST /api/quizzes/:id/retake succeeded with 201 Created');
    
    // Check Payload format requested by user:
    // { attemptId, quizId, durationMinutes, questions: [ { id, question_text, marks, options: [ { id, option_text } ] } ] }
    const resData = retakeRes.data;
    assert(Boolean(resData.attemptId), `Response contains attemptId: ${resData.attemptId}`);
    assert(Boolean(resData.quizId), `Response contains quizId: ${resData.quizId}`);
    assert(Number(resData.durationMinutes) > 0, `Response contains durationMinutes: ${resData.durationMinutes}`);
    assert(Array.isArray(resData.questions) && resData.questions.length === 10, `Response returns full questions array (Length: ${resData.questions?.length})`);

    // Verify each question has required fields: id, question_text, marks, options
    const firstQ = resData.questions[0];
    assert(Boolean(firstQ.id && firstQ.question_text), `Question 1 has id (${firstQ.id}) and text: "${firstQ.question_text.slice(0, 50)}..."`);
    assert(Number(firstQ.marks || firstQ.points) > 0, `Question 1 has marks: ${firstQ.marks || firstQ.points}`);
    assert(Array.isArray(firstQ.options) && firstQ.options.length === 4, `Question 1 has exactly 4 options`);
    assert(Boolean(firstQ.options[0].id && firstQ.options[0].option_text), `Option 1 has id and text: "${firstQ.options[0].option_text}"`);

    // Verify Attempt record is fresh and NOT marked submitted
    const newAttempt = resData.attempt;
    assert(newAttempt.attempt_number > 1, `Fresh attempt record has incremented attempt_number: ${newAttempt.attempt_number}`);
    assert(newAttempt.status === 'in_progress', `Fresh attempt status is 'in_progress'`);
    assert(newAttempt.submitted_at === null, `Fresh attempt submitted_at is null (not finished)`);

    // 5. TEST QUESTION ANSWER SUBMISSION & SCORE CALCULATION
    console.log('\n--- 5. Submitting Answers & Verification ---');
    // Pick the first option for all 10 questions
    const answersPayload = resData.questions.map(q => ({
      question_id: q.id,
      selected_option_id: q.options[0].id
    }));

    const submitRes = await postJson(`${BASE_URL}/quizzes/${completedQuiz.id}/submit`, {
      attempt_id: resData.attemptId,
      answers: answersPayload
    }, {
      Authorization: `Bearer ${studentToken}`
    });

    assert(submitRes.status === 200 && submitRes.data?.success, 'POST /api/quizzes/:id/submit graded attempt successfully');
    assert(submitRes.data?.result?.total_score !== undefined, `Calculated score: ${submitRes.data?.result?.total_score} Marks (${submitRes.data?.result?.percentage}%)`);
    assert(Array.isArray(submitRes.data?.result?.breakdown), `Result returns breakdown of all ${submitRes.data?.result?.breakdown?.length} questions`);

    // 6. VERIFY IMMEDIATE SECOND RETEST AFTER SUBMIT
    console.log('\n--- 6. Verifying Instant Next Retest ---');
    const retake2Res = await postJson(`${BASE_URL}/quizzes/${completedQuiz.id}/retake`, {}, {
      Authorization: `Bearer ${studentToken}`
    });
    assert(retake2Res.status === 201 && retake2Res.data?.success, 'Immediate subsequent retest initializes cleanly');
    assert(retake2Res.data?.attempt?.attempt_number > newAttempt.attempt_number, `Attempt number again incremented to #${retake2Res.data?.attempt?.attempt_number}`);
    assert(retake2Res.data?.questions?.length === 10, `All 10 questions loaded properly for subsequent retest`);

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
