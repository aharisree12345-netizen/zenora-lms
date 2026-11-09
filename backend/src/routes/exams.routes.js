const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, verifyRole, optionalAuth } = require('../middleware/auth');

const FACULTY_ADMIN_ROLES = ['faculty', 'instructor', 'super_admin', 'institution_admin', 'admin'];

// Helper to calculate academic letter grade from percentage
function calculateGrade(percentage) {
  const p = Number(percentage);
  if (isNaN(p) || p < 50) return { grade: 'RA', label: 'Re-Appear' };
  if (p >= 90) return { grade: 'O', label: 'Outstanding' };
  if (p >= 80) return { grade: 'A+', label: 'Excellent' };
  if (p >= 70) return { grade: 'A', label: 'Very Good' };
  if (p >= 60) return { grade: 'B+', label: 'Good' };
  return { grade: 'B', label: 'Average / Pass' };
}

// ==========================================
// 1. LIST EXAMS
// ==========================================
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { subject_id, batch_id, department, semester, status } = req.query;
    const data = db.getFallbackData();
    let exams = data.exams || [];

    // Filter by student cohort if logged in as student
    if (req.user && req.user.role === 'student' && !batch_id && !subject_id) {
      const studentProfile = (data.student_profiles || []).find(p => p.user_id === req.user.id);
      const studentDept = studentProfile?.department || 'CS';
      const studentSem = studentProfile?.current_semester || 4;
      const studentBatchId = studentProfile?.batch_id;

      exams = exams.filter(e => {
        const matchesBatch = e.batch_id === studentBatchId;
        const matchesDept = !e.department_code || e.department_code === 'ALL' || e.department_code === studentDept || e.department_id === req.user.department_id;
        const matchesSem = !e.semester || e.semester === 'ALL' || String(e.semester) === String(studentSem);
        return matchesBatch || (matchesDept && matchesSem);
      });
    } else {
      if (department && department !== 'all') {
        exams = exams.filter(e => !e.department_code || e.department_code === 'ALL' || e.department_code === department || e.department_id === department);
      }
      if (semester && semester !== 'all') {
        const semClean = String(semester).replace(/^S/i, '');
        exams = exams.filter(e => !e.semester || e.semester === 'ALL' || String(e.semester) === semClean);
      }
      if (subject_id) exams = exams.filter(e => e.subject_id === subject_id);
      if (batch_id) exams = exams.filter(e => e.batch_id === batch_id);
    }

    if (status && status !== 'all') exams = exams.filter(e => e.status === status);

    const enriched = exams.map(exam => {
      const subject = (data.subjects || []).find(s => s.id === exam.subject_id);
      const batch = (data.batches || []).find(b => b.id === exam.batch_id);
      const questions = (data.exam_questions || []).filter(q => q.exam_id === exam.id);
      const enrolledStudents = (data.student_profiles || []).filter(p => p.batch_id === exam.batch_id);

      // Calculate class average if marks exist
      const examMarks = (data.exam_marks || []).filter(m => m.exam_id === exam.id);
      const studentTotalMap = {};
      examMarks.forEach(m => {
        studentTotalMap[m.student_id] = (studentTotalMap[m.student_id] || 0) + parseFloat(m.marks_obtained || 0);
      });

      const totalsArray = Object.values(studentTotalMap);
      const averageMarks = totalsArray.length > 0
        ? (totalsArray.reduce((acc, v) => acc + v, 0) / totalsArray.length).toFixed(1)
        : null;

      return {
        ...exam,
        subject_name: subject ? subject.name : 'Unknown Subject',
        subject_code: subject ? subject.code : '',
        batch_name: batch ? batch.name : 'Unknown Batch',
        questions_count: questions.length,
        total_enrolled: enrolledStudents.length,
        evaluated_count: Object.keys(studentTotalMap).length,
        class_average: averageMarks
      };
    });

    return res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('[Exams List Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve exams.' });
  }
});

// ==========================================
// 2. GET SINGLE EXAM DETAILS
// ==========================================
router.get('/:id', async (req, res) => {
  try {
    const data = db.getFallbackData();
    const exam = (data.exams || []).find(e => e.id === req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found.' });
    }

    const subject = (data.subjects || []).find(s => s.id === exam.subject_id);
    const batch = (data.batches || []).find(b => b.id === exam.batch_id);
    const questions = (data.exam_questions || [])
      .filter(q => q.exam_id === exam.id)
      .sort((a, b) => (a.question_number || 0) - (b.question_number || 0));

    return res.json({
      success: true,
      data: {
        ...exam,
        subject_name: subject ? subject.name : '',
        subject_code: subject ? subject.code : '',
        batch_name: batch ? batch.name : '',
        questions
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve exam.' });
  }
});

// ==========================================
// 3. CREATE EXAM
// ==========================================
router.post('/', authenticateToken, verifyRole(FACULTY_ADMIN_ROLES), async (req, res) => {
  try {
    const {
      title,
      subject_id,
      batch_id,
      exam_type = 'Internal 1',
      max_total_marks = 50.0,
      exam_date,
      duration_minutes = 90
    } = req.body;

    if (!title || !subject_id || !batch_id || !exam_date) {
      return res.status(400).json({
        success: false,
        message: 'Exam title, subject, batch, and exam date are required.'
      });
    }

    const data = db.getFallbackData();
    const examId = 'exam-' + Date.now();

    const newExam = {
      id: examId,
      title,
      exam_type,
      subject_id,
      batch_id,
      academic_year_id: 'ay-2025-2026',
      max_total_marks: parseFloat(max_total_marks),
      exam_date,
      duration_minutes: parseInt(duration_minutes, 10),
      status: 'draft',
      created_by: req.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    data.exams.push(newExam);
    db.saveFallbackData();

    return res.status(201).json({
      success: true,
      message: 'Exam created successfully in draft mode.',
      data: newExam
    });
  } catch (err) {
    console.error('[Create Exam Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to create exam.' });
  }
});

// ==========================================
// 4. CONFIGURE QUESTION PATTERN & SPLIT MARKS
// ==========================================
router.put('/:id/questions', authenticateToken, verifyRole(FACULTY_ADMIN_ROLES), async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'An array of questions is required.' });
    }

    const data = db.getFallbackData();
    const exam = (data.exams || []).find(e => e.id === req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found.' });
    }

    // Remove existing questions for this exam
    data.exam_questions = (data.exam_questions || []).filter(q => q.exam_id !== exam.id);

    // Add new questions
    const createdQuestions = questions.map((q, idx) => {
      const qNum = q.question_number || (idx + 1);
      return {
        id: q.id || `q-${exam.id}-${qNum}-${Date.now()}`,
        exam_id: exam.id,
        question_number: qNum,
        question_label: q.question_label || `Q${qNum}`,
        section_part: q.section_part || (qNum <= 5 ? 'Part A' : 'Part B'),
        max_marks: parseFloat(q.max_marks || 2),
        topic_coverage: q.topic_coverage || '',
        sort_order: qNum
      };
    });

    data.exam_questions.push(...createdQuestions);
    exam.updated_at = new Date().toISOString();
    db.saveFallbackData();

    return res.json({
      success: true,
      message: `Configured ${createdQuestions.length} questions split for exam.`,
      data: createdQuestions
    });
  } catch (err) {
    console.error('[Config Questions Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to configure exam question pattern.' });
  }
});

// ==========================================
// 5. MASTER MARK ENTRY GRID (Spreadsheet Matrix)
// ==========================================
router.get('/:id/mark-grid', optionalAuth, async (req, res) => {
  if (req.user && !FACULTY_ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied: insufficient permissions.' });
  }
  try {
    const data = db.getFallbackData();
    const exam = (data.exams || []).find(e => e.id === req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found.' });
    }

    const subject = (data.subjects || []).find(s => s.id === exam.subject_id);
    const batch = (data.batches || []).find(b => b.id === exam.batch_id);
    const questions = (data.exam_questions || [])
      .filter(q => q.exam_id === exam.id)
      .sort((a, b) => (a.question_number || 0) - (b.question_number || 0));

    // Get enrolled students for this batch
    const profiles = (data.student_profiles || []).filter(p => p.batch_id === exam.batch_id);
    const students = profiles.map(p => {
      const u = (data.users || []).find(user => user.id === p.user_id);
      return {
        student_id: p.user_id,
        roll_no: p.roll_no,
        register_no: p.register_no,
        name: u ? u.name : 'Student',
        email: u ? u.email : '',
        status: p.status
      };
    }).sort((a, b) => a.roll_no.localeCompare(b.roll_no));

    // Build mark matrix: { [student_id]: { [question_id]: marks_obtained } }
    const examMarks = (data.exam_marks || []).filter(m => m.exam_id === exam.id);
    const marksMatrix = {};
    const studentTotals = {};

    students.forEach(s => {
      marksMatrix[s.student_id] = {};
      let totalScored = 0;
      let hasMarks = false;

      questions.forEach(q => {
        const markRecord = examMarks.find(m => m.student_id === s.student_id && m.question_id === q.id);
        const score = markRecord !== undefined && markRecord.marks_obtained !== null
          ? parseFloat(markRecord.marks_obtained)
          : null;
        marksMatrix[s.student_id][q.id] = score;

        if (score !== null) {
          totalScored += score;
          hasMarks = true;
        }
      });

      studentTotals[s.student_id] = {
        total_scored: hasMarks ? parseFloat(totalScored.toFixed(2)) : null,
        max_total: exam.max_total_marks,
        percentage: hasMarks ? parseFloat(((totalScored / exam.max_total_marks) * 100).toFixed(1)) : null,
        grade: hasMarks ? calculateGrade((totalScored / exam.max_total_marks) * 100).grade : '-'
      };
    });

    return res.json({
      success: true,
      data: {
        exam: {
          id: exam.id,
          title: exam.title,
          exam_type: exam.exam_type,
          subject_name: subject ? subject.name : '',
          subject_code: subject ? subject.code : '',
          batch_name: batch ? batch.name : '',
          max_total_marks: exam.max_total_marks,
          exam_date: exam.exam_date,
          status: exam.status
        },
        questions,
        students,
        marks_matrix: marksMatrix,
        student_totals: studentTotals
      }
    });
  } catch (err) {
    console.error('[Mark Grid Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to load mark entry grid.' });
  }
});

// ==========================================
// 6. SAVE STUDENT MARKS (Batch/Single with Strict Server-Side Validation)
// ==========================================
router.post('/:id/marks', authenticateToken, verifyRole(FACULTY_ADMIN_ROLES), async (req, res) => {
  try {
    const { marks } = req.body;
    if (!Array.isArray(marks) || marks.length === 0) {
      return res.status(400).json({ success: false, message: 'Marks array is required.' });
    }

    const data = db.getFallbackData();
    const exam = (data.exams || []).find(e => e.id === req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found.' });
    }

    const questions = (data.exam_questions || []).filter(q => q.exam_id === exam.id);
    const questionsMap = {};
    questions.forEach(q => { questionsMap[q.id] = q; });

    // Validate marks strictly against max_marks for each question
    for (const entry of marks) {
      const q = questionsMap[entry.question_id];
      if (!q) {
        return res.status(400).json({
          success: false,
          message: `Invalid question ID "${entry.question_id}" for this exam.`
        });
      }

      const score = parseFloat(entry.marks_obtained);
      if (isNaN(score) || score < 0) {
        return res.status(400).json({
          success: false,
          message: `Score for ${q.question_label} cannot be negative.`
        });
      }

      if (score > q.max_marks) {
        const studentUser = (data.users || []).find(u => u.id === entry.student_id);
        const studentName = studentUser ? studentUser.name : entry.student_id;
        return res.status(400).json({
          success: false,
          message: `Validation Error: Score of ${score} for ${studentName} on ${q.question_label} exceeds maximum allowed marks of ${q.max_marks}.`
        });
      }
    }

    // Upsert into data.exam_marks
    if (!data.exam_marks) data.exam_marks = [];

    for (const entry of marks) {
      const existingIdx = data.exam_marks.findIndex(
        m => m.exam_id === exam.id && m.question_id === entry.question_id && m.student_id === entry.student_id
      );

      const score = parseFloat(entry.marks_obtained);

      if (existingIdx >= 0) {
        data.exam_marks[existingIdx].marks_obtained = score;
        data.exam_marks[existingIdx].updated_at = new Date().toISOString();
      } else {
        data.exam_marks.push({
          id: `em-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          exam_id: exam.id,
          question_id: entry.question_id,
          student_id: entry.student_id,
          marks_obtained: score,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }

    exam.updated_at = new Date().toISOString();
    db.saveFallbackData();

    return res.json({
      success: true,
      message: `Successfully saved ${marks.length} mark scores.`
    });
  } catch (err) {
    console.error('[Save Marks Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to save marks.' });
  }
});

// ==========================================
// 7. PUBLISH EXAM TO STUDENTS
// ==========================================
router.post('/:id/publish', authenticateToken, verifyRole(FACULTY_ADMIN_ROLES), async (req, res) => {
  try {
    const data = db.getFallbackData();
    const exam = (data.exams || []).find(e => e.id === req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found.' });
    }

    exam.status = 'published';
    exam.updated_at = new Date().toISOString();

    // Create notifications for enrolled students
    const enrolledProfiles = (data.student_profiles || []).filter(p => p.batch_id === exam.batch_id);
    const subject = (data.subjects || []).find(s => s.id === exam.subject_id);

    enrolledProfiles.forEach(p => {
      data.notifications.push({
        id: `notif-pub-${Date.now()}-${p.user_id}`,
        user_id: p.user_id,
        title: `${exam.title} Results Published`,
        message: `Your results and split question marks for ${subject ? subject.name : 'Exam'} have been published.`,
        type: 'exam',
        action_url: `/exams`,
        is_read: false,
        created_at: new Date().toISOString()
      });
    });

    db.saveFallbackData();

    return res.json({
      success: true,
      message: `Exam published successfully! Results are now visible to ${enrolledProfiles.length} students.`,
      exam
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to publish exam.' });
  }
});

// ==========================================
// 8. STUDENT MARKSHEET ITEMIZATION VIEW
// ==========================================
router.get('/:id/student-sheet/:student_id', optionalAuth, async (req, res) => {
  try {
    const { id: exam_id, student_id } = req.params;
    const data = db.getFallbackData();
    const exam = (data.exams || []).find(e => e.id === exam_id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found.' });
    }

    const isStaff = !req.user || FACULTY_ADMIN_ROLES.includes(req.user.role);
    const isSelf = req.user ? req.user.id === student_id : true;
    if (!isStaff && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own student marksheet.'
      });
    }

    if (!isStaff && exam.status !== 'published') {
      return res.status(403).json({
        success: false,
        message: 'Exam marks have not been officially published yet by the academic controller.'
      });
    }

    const studentUser = (data.users || []).find(u => u.id === student_id);
    const profile = (data.student_profiles || []).find(p => p.user_id === student_id);
    const subject = (data.subjects || []).find(s => s.id === exam.subject_id);
    const batch = (data.batches || []).find(b => b.id === exam.batch_id);
    const dept = subject ? (data.departments || []).find(d => d.id === subject.department_id) : null;

    const questions = (data.exam_questions || [])
      .filter(q => q.exam_id === exam.id)
      .sort((a, b) => (a.question_number || 0) - (b.question_number || 0));

    const examMarks = (data.exam_marks || []).filter(m => m.exam_id === exam.id && m.student_id === student_id);

    let totalScored = 0;
    const itemizedBreakdown = questions.map(q => {
      const markRecord = examMarks.find(m => m.question_id === q.id);
      const score = markRecord ? parseFloat(markRecord.marks_obtained) : 0;
      totalScored += score;
      return {
        question_id: q.id,
        question_number: q.question_number,
        question_label: q.question_label,
        section_part: q.section_part,
        topic_coverage: q.topic_coverage,
        max_marks: Number(q.max_marks) || 0,
        scored: score,
        marks_obtained: score,
        percentage: q.max_marks > 0 ? parseFloat(((score / q.max_marks) * 100).toFixed(1)) : 0
      };
    });

    // 1. Aggregate Total Max Marks: Compute total_max_marks by summing individual question max_marks
    const totalMaxMarks = questions.reduce((sum, q) => sum + (Number(q.max_marks) || 0), 0) || Number(exam.max_total_marks) || Number(exam.max_marks) || 50;
    const totalScoredMarks = questions.reduce((sum, q) => {
      const m = examMarks.find(em => em.question_id === q.id);
      return sum + (m ? (Number(m.marks_obtained) || 0) : 0);
    }, 0);

    // 2. Fix Percentage Computation: Dynamically calculate from totalScoredMarks / totalMaxMarks
    const calculatedPercentage = totalMaxMarks > 0 
      ? parseFloat(((totalScoredMarks / totalMaxMarks) * 100).toFixed(1)) 
      : 0.0;

    // 3. Fix Grade Logic: Accurate letter grade based on percentage
    const gradeInfo = calculateGrade(calculatedPercentage);

    // Compute Class Rank & Average
    const allExamMarks = (data.exam_marks || []).filter(m => m.exam_id === exam.id);
    const studentScoreTotals = {};
    allExamMarks.forEach(m => {
      studentScoreTotals[m.student_id] = (studentScoreTotals[m.student_id] || 0) + parseFloat(m.marks_obtained || 0);
    });

    const rankedScores = Object.values(studentScoreTotals).sort((a, b) => b - a);
    const studentRank = rankedScores.indexOf(totalScoredMarks) + 1;
    const classAvg = rankedScores.length > 0
      ? (rankedScores.reduce((a, b) => a + b, 0) / rankedScores.length).toFixed(1)
      : totalScoredMarks;

    return res.json({
      success: true,
      data: {
        exam: {
          id: exam.id,
          title: exam.title,
          exam_type: exam.exam_type,
          exam_date: exam.exam_date,
          status: exam.status,
          max_total_marks: totalMaxMarks,
          max_marks: totalMaxMarks,
          duration_minutes: exam.duration_minutes
        },
        subject: {
          id: subject ? subject.id : '',
          name: subject ? subject.name : '',
          code: subject ? subject.code : '',
          credits: subject ? subject.credits : 3,
          department_name: dept ? dept.name : ''
        },
        student: {
          id: studentUser ? studentUser.id : student_id,
          name: studentUser ? studentUser.name : 'Student',
          roll_no: profile ? profile.roll_no : 'N/A',
          register_no: profile ? profile.register_no : 'N/A',
          batch_name: batch ? batch.name : '',
          semester: batch ? batch.semester : 4
        },
        summary: {
          total_marks_obtained: parseFloat(totalScoredMarks.toFixed(2)),
          total_scored: parseFloat(totalScoredMarks.toFixed(2)),
          max_total_marks: totalMaxMarks,
          total_max_marks: totalMaxMarks,
          percentage: calculatedPercentage,
          grade: gradeInfo.grade,
          grade_label: gradeInfo.label,
          rank: studentRank || 1,
          total_students_ranked: rankedScores.length,
          class_average: parseFloat(classAvg)
        },
        itemized_breakdown: itemizedBreakdown
      }
    });
  } catch (err) {
    console.error('[Student Sheet Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve student marksheet.' });
  }
});

// ==========================================
// 9. STUDENT'S PERSONAL RESULTS SUMMARY
// ==========================================
router.get('/student/my-results', authenticateToken, async (req, res) => {
  try {
    const studentId = req.user.id;
    const data = db.getFallbackData();
    const publishedExams = (data.exams || []).filter(e => e.status === 'published');

    const results = [];
    publishedExams.forEach(exam => {
      const subject = (data.subjects || []).find(s => s.id === exam.subject_id);
      const questions = (data.exam_questions || []).filter(q => q.exam_id === exam.id);
      const studentMarks = (data.exam_marks || []).filter(m => m.exam_id === exam.id && m.student_id === studentId);

      if (studentMarks.length > 0) {
        let total = 0;
        studentMarks.forEach(m => { total += parseFloat(m.marks_obtained || 0); });
        const maxTotal = questions.reduce((sum, q) => sum + (Number(q.max_marks) || 0), 0) || Number(exam.max_total_marks) || Number(exam.max_marks) || 50;
        const pct = maxTotal > 0 ? parseFloat(((total / maxTotal) * 100).toFixed(1)) : 0.0;
        const gradeInfo = calculateGrade(pct);

        results.push({
          exam_id: exam.id,
          exam_title: exam.title,
          exam_type: exam.exam_type,
          exam_date: exam.exam_date,
          subject_name: subject ? subject.name : '',
          subject_code: subject ? subject.code : '',
          max_total_marks: maxTotal,
          total_marks_obtained: parseFloat(total.toFixed(2)),
          percentage: pct,
          grade: gradeInfo.grade,
          grade_label: gradeInfo.label,
          questions_count: questions.length
        });
      }
    });

    return res.json({ success: true, data: results });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load personal exam results.' });
  }
});

module.exports = router;
