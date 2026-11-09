/**
 * Exam Marksheet & Grade Evaluation Test Suite
 * Validates:
 * 1. Dynamic aggregation of total max marks from individual questions
 * 2. Dynamic percentage computation
 * 3. Grade evaluation (O, A+, A, B+, B, RA)
 * 4. Verification that student scoring 45.5 / 50 receives 'O' (Outstanding)
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
          text: data
        });
      });
    });

    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function evaluateGrade(percentage) {
  const p = Number(percentage);
  if (isNaN(p) || p < 50) return { grade: 'RA', label: 'Re-Appear', isPass: false };
  if (p >= 90) return { grade: 'O', label: 'Outstanding', isPass: true };
  if (p >= 80) return { grade: 'A+', label: 'Excellent', isPass: true };
  if (p >= 70) return { grade: 'A', label: 'Very Good', isPass: true };
  if (p >= 60) return { grade: 'B+', label: 'Good', isPass: true };
  return { grade: 'B', label: 'Average / Pass', isPass: true };
}

async function run() {
  console.log('===============================================================');
  console.log('🧪 OFFICIAL STUDENT EXAM MARK SHEET - EVALUATION & GRADE AUDIT');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${name} ${details ? `(${details})` : ''}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  // 1. Grade scale unit assertions
  console.log('📊 1. Grade Scale Matrix Verification:');
  assert(evaluateGrade(95).grade === 'O', 'Score 95% evaluates to O');
  assert(evaluateGrade(90).grade === 'O', 'Score 90% evaluates to O');
  assert(evaluateGrade(85).grade === 'A+', 'Score 85% evaluates to A+');
  assert(evaluateGrade(80).grade === 'A+', 'Score 80% evaluates to A+');
  assert(evaluateGrade(75).grade === 'A', 'Score 75% evaluates to A');
  assert(evaluateGrade(70).grade === 'A', 'Score 70% evaluates to A');
  assert(evaluateGrade(65).grade === 'B+', 'Score 65% evaluates to B+');
  assert(evaluateGrade(60).grade === 'B+', 'Score 60% evaluates to B+');
  assert(evaluateGrade(55).grade === 'B', 'Score 55% evaluates to B');
  assert(evaluateGrade(50).grade === 'B', 'Score 50% evaluates to B');
  assert(evaluateGrade(49.9).grade === 'RA', 'Score 49.9% evaluates to RA (Re-Appear)');
  assert(evaluateGrade(0).grade === 'RA', 'Score 0% evaluates to RA');

  // 2. Fetch live Mark Sheet API
  console.log('\n📄 2. Live Student Mark Sheet API Verification:');
  const sheetRes = await makeRequest(`${BASE_URL}/api/exams/exam-cs401-cat1/student-sheet/user-student-01`);
  assert(sheetRes.status === 200, 'GET student-sheet returns HTTP 200');

  const sheetData = sheetRes.data?.data;
  assert(Boolean(sheetData), 'Marksheet response contains valid data payload');

  const questions = sheetData?.itemized_breakdown || [];
  assert(questions.length === 9, 'Questions itemized breakdown has 9 questions', `${questions.length} questions`);

  // Aggregate questions
  const totalMaxMarks = questions.reduce((sum, q) => sum + (Number(q.max_marks) || 0), 0);
  const totalScoredMarks = questions.reduce((sum, q) => sum + (Number(q.scored !== undefined ? q.scored : q.marks_obtained) || 0), 0);
  const calculatedPercentage = totalMaxMarks > 0 
    ? ((totalScoredMarks / totalMaxMarks) * 100).toFixed(1) 
    : '0.0';

  assert(totalMaxMarks === 50, 'Total Max Marks aggregated from questions equals 50', `totalMaxMarks: ${totalMaxMarks}`);
  assert(totalScoredMarks === 45.5, 'Total Scored Marks aggregated from questions equals 45.5', `totalScoredMarks: ${totalScoredMarks}`);
  assert(calculatedPercentage === '91.0', 'Dynamically calculated percentage is 91.0%', `calculatedPercentage: ${calculatedPercentage}%`);

  // Verify Summary Payload
  console.log('\n📋 3. Summary Payload Verification:');
  const summary = sheetData?.summary || {};
  assert(summary.max_total_marks === 50, 'summary.max_total_marks is 50 (Not undefined/NaN)', `Value: ${summary.max_total_marks}`);
  assert(summary.total_marks_obtained === 45.5, 'summary.total_marks_obtained is 45.5', `Value: ${summary.total_marks_obtained}`);
  assert(Number(summary.percentage) === 91, 'summary.percentage is 91% (Not null/blank)', `Value: ${summary.percentage}`);
  assert(summary.grade === 'O', 'summary.grade is "O" (NOT "RA")', `Grade: ${summary.grade}`);
  assert(summary.grade_label === 'Outstanding', 'summary.grade_label is "Outstanding"', `Label: ${summary.grade_label}`);

  console.log('\n===============================================================');
  console.log(`SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('[Test Error]', err);
  process.exit(1);
});
