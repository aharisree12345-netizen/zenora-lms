const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { requireRoles } = require('../middleware/rbac');
const { checkAndUnlockCertificate } = require('../services/certificate.service');

// GET /api/quizzes & /api/assessments (List all quizzes or filter by department/semester/batch/course)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { course_id, courseId, department, semester, batch_id, status } = req.query;
    const targetCourse = course_id || courseId;
    const data = db.getFallbackData();
    let quizzes = [...(data.quizzes || [])];

    if (targetCourse) {
      quizzes = quizzes.filter(q => q.course_id === targetCourse || q.subject_id === targetCourse);
    }

    // Role-based cohort filtering: for students, show their cohort's assessments
    if (req.user && req.user.role === 'student' && !batch_id && !department) {
      const studentProfile = (data.student_profiles || []).find(p => p.user_id === req.user.id);
      const studentBatch = (data.batches || []).find(b => b.id === studentProfile?.batch_id);
      const studentDept = studentProfile?.department || studentBatch?.department_code || 'CS';
      const studentSem = studentProfile?.current_semester || studentBatch?.semester || 4;
      const studentBatchId = studentProfile?.batch_id;

      quizzes = quizzes.filter(q => {
        const matchesBatch = q.batch_id === studentBatchId;
        const matchesDept = !q.department_code || q.department_code === 'ALL' || q.department_code === studentDept || q.department_id === req.user.department_id;
        const matchesSem = !q.semester || q.semester === 'ALL' || String(q.semester) === String(studentSem);
        return matchesBatch || (matchesDept && matchesSem);
      });
    } else {
      if (department && department !== 'all') {
        quizzes = quizzes.filter(q => !q.department_code || q.department_code === 'ALL' || q.department_code === department || q.department_id === department);
      }
      if (semester && semester !== 'all') {
        const semClean = String(semester).replace(/^S/i, '');
        quizzes = quizzes.filter(q => !q.semester || q.semester === 'ALL' || String(q.semester) === semClean);
      }
      if (batch_id && batch_id !== 'all') {
        quizzes = quizzes.filter(q => q.batch_id === batch_id);
      }
    }

    const now = new Date();
    const result = quizzes.map(quiz => {
      const questions = (data.quiz_questions || []).filter(q => q.quiz_id === quiz.id);
      const subject = (data.subjects || []).find(s => s.id === quiz.subject_id || s.id === quiz.course_id);
      const course = (data.courses || []).find(c => c.id === quiz.course_id);
      const myAttempts = req.user
        ? (data.quiz_attempts || []).filter(a => a.quiz_id === quiz.id && a.user_id === req.user.id)
        : [];

      const durationMinutes = Number(quiz.time_limit_minutes || quiz.duration_minutes || quiz.time_limit || 20);
      const totalMarks = Number(quiz.total_marks || quiz.total_points || (questions.length * 5) || 50);
      const passPercentage = Number(quiz.pass_percentage || quiz.passing_percentage || 60);

      // Determine category: 'completed', 'upcoming', or 'available'
      let category = 'available';
      if (myAttempts.length > 0) {
        category = 'completed';
      } else if (quiz.available_from && new Date(quiz.available_from) > now) {
        category = 'upcoming';
      }

      return {
        ...quiz,
        course_title: subject ? `${subject.code} - ${subject.name}` : (course ? course.title : 'Curriculum Assessment'),
        subject_name: subject ? subject.name : (course ? course.title : quiz.title),
        subject_code: subject ? subject.code : (quiz.subject_code || 'CS401'),
        durationMinutes,
        time_limit: durationMinutes,
        time_limit_minutes: durationMinutes,
        total_marks: totalMarks,
        total_points: totalMarks,
        pass_percentage: passPercentage,
        passing_percentage: passPercentage,
        total_questions: questions.length,
        my_attempts_count: myAttempts.length,
        best_score: myAttempts.length > 0 ? Math.max(...myAttempts.map(a => Number(a.percentage || 0))) : null,
        has_passed: myAttempts.some(a => a.is_passed),
        can_retake: myAttempts.length < (quiz.max_attempts || 10),
        category
      };
    });

    return res.json({ success: true, count: result.length, data: result });
  } catch (err) {
    console.error('[Get Quizzes Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve assessments.' });
  }
});

// GET /api/quizzes/attempts & /api/quiz-attempts
router.get('/attempts', authenticateToken, async (req, res) => {
  try {
    const { quiz_id, user_id } = req.query;
    const data = db.getFallbackData();
    let attempts = [...(data.quiz_attempts || [])];

    if (req.user.role === 'student') {
      attempts = attempts.filter(a => a.user_id === req.user.id);
    } else if (user_id) {
      attempts = attempts.filter(a => a.user_id === user_id);
    }

    if (quiz_id) {
      attempts = attempts.filter(a => a.quiz_id === quiz_id);
    }

    const enriched = attempts.map(att => {
      const quiz = (data.quizzes || []).find(q => q.id === att.quiz_id);
      const student = (data.users || []).find(u => u.id === att.user_id);
      const subject = quiz ? (data.subjects || []).find(s => s.id === quiz.subject_id || s.id === quiz.course_id) : null;
      return {
        ...att,
        quiz_title: quiz ? quiz.title : 'Assessment',
        student_name: student ? student.name : 'Student',
        course_title: subject ? `${subject.code} - ${subject.name}` : 'Course'
      };
    });

    return res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve quiz attempts.' });
  }
});

// GET /api/quizzes/course/:courseId (List quizzes for a course)
router.get('/course/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const data = db.getFallbackData();
    const quizzes = (data.quizzes || []).filter(q => q.course_id === courseId || q.subject_id === courseId);

    const result = quizzes.map(quiz => {
      const questions = (data.quiz_questions || []).filter(q => q.quiz_id === quiz.id);
      const myAttempts = (data.quiz_attempts || []).filter(
        a => a.quiz_id === quiz.id && a.user_id === req.user.id
      );

      const durationMinutes = Number(quiz.time_limit_minutes || quiz.duration_minutes || quiz.time_limit || 20);

      return {
        ...quiz,
        durationMinutes,
        time_limit_minutes: durationMinutes,
        total_questions: questions.length,
        my_attempts_count: myAttempts.length,
        best_score: myAttempts.length > 0 ? Math.max(...myAttempts.map(a => Number(a.percentage || 0))) : null,
        has_passed: myAttempts.some(a => a.is_passed)
      };
    });

    return res.json({ success: true, count: result.length, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve course quizzes.' });
  }
});

// GET /api/quizzes/:id (Get quiz details and questions for taking or reviewing)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const data = db.getFallbackData();
    const quiz = (data.quizzes || []).find(q => q.id === id);

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    const isStaff = ['super_admin', 'institution_admin', 'instructor', 'faculty'].includes(req.user.role);
    let questions = (data.quiz_questions || [])
      .filter(q => q.quiz_id === id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    // Map questions with options (strip is_correct for students taking the exam)
    const detailedQuestions = questions.map(q => {
      let options = (data.quiz_options || [])
        .filter(opt => opt.question_id === q.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      const points = Number(q.points || q.marks || 5);
      return {
        id: q.id,
        quiz_id: q.quiz_id,
        question_text: q.question_text,
        question_type: q.question_type || 'mcq',
        points: points,
        marks: points,
        explanation: isStaff ? q.explanation : null,
        options: options.map(opt => ({
          id: opt.id,
          question_id: opt.question_id,
          option_text: opt.option_text
        }))
      };
    });

    const myAttempts = (data.quiz_attempts || []).filter(
      a => a.quiz_id === id && a.user_id === req.user.id
    );

    const durationMinutes = Number(quiz.time_limit_minutes || quiz.duration_minutes || quiz.time_limit || 20);

    return res.json({
      success: true,
      data: {
        ...quiz,
        durationMinutes,
        time_limit_minutes: durationMinutes,
        questions: detailedQuestions,
        my_attempts: myAttempts
      }
    });
  } catch (err) {
    console.error('[Get Quiz Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to load quiz.' });
  }
});

// POST /api/quizzes (Create Quiz - Instructor/Admin/Faculty)
router.post('/', authenticateToken, requireRoles('super_admin', 'institution_admin', 'instructor', 'faculty'), async (req, res) => {
  try {
    const {
      course_id,
      lesson_id = null,
      title,
      instructions = '',
      time_limit_minutes = 20,
      passing_percentage = 60,
      randomize_questions = false,
      randomize_options = false,
      max_attempts = 3,
      questions = []
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Quiz title is required.' });
    }

    const effectiveCourseId = course_id || 'sub-cs401';
    const data = db.getFallbackData();
    if (!data.quizzes) data.quizzes = [];
    if (!data.quiz_questions) data.quiz_questions = [];
    if (!data.quiz_options) data.quiz_options = [];

    const quizId = 'quiz-' + Date.now();
    const newQuiz = {
      id: quizId,
      course_id: effectiveCourseId,
      lesson_id,
      title: title.trim(),
      instructions: instructions || 'Read each question carefully before submitting your answer.',
      time_limit_minutes: Number(time_limit_minutes) || 20,
      duration_minutes: Number(time_limit_minutes) || 20,
      passing_percentage: Number(passing_percentage) || 60,
      randomize_questions: Boolean(randomize_questions),
      randomize_options: Boolean(randomize_options),
      max_attempts: Number(max_attempts) || 3,
      is_published: true,
      available_from: new Date().toISOString(),
      available_until: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    data.quizzes.push(newQuiz);

    // If questions provided in payload, insert them; otherwise provide 2 default comprehensive MCQs
    let qList = questions;
    if (!Array.isArray(qList) || qList.length === 0) {
      qList = [
        {
          question_text: `What is the primary objective of ${title}?`,
          question_type: 'mcq',
          points: 5,
          explanation: 'Foundational architectural understanding and domain proficiency.',
          options: [
            { text: 'To ensure systematic algorithmic design and optimal system throughput', is_correct: true },
            { text: 'To increase redundant memory allocation without validation', is_correct: false },
            { text: 'To bypass boundary constraints in execution loops', is_correct: false },
            { text: 'None of the above', is_correct: false }
          ]
        },
        {
          question_text: 'Which of the following computational time complexities represents logarithmic execution?',
          question_type: 'mcq',
          points: 5,
          explanation: 'O(log n) represents binary search or divide-and-conquer logarithmic execution time.',
          options: [
            { text: 'O(log n)', is_correct: true },
            { text: 'O(n^2)', is_correct: false },
            { text: 'O(2^n)', is_correct: false },
            { text: 'O(n!)', is_correct: false }
          ]
        }
      ];
    }

    // Insert questions and options
    for (let i = 0; i < qList.length; i++) {
      const q = qList[i];
      const qId = 'q-' + Date.now() + '-' + i;
      data.quiz_questions.push({
        id: qId,
        quiz_id: quizId,
        question_text: q.question_text,
        question_type: q.question_type || 'mcq',
        points: Number(q.points || q.marks || 5),
        explanation: q.explanation || '',
        sort_order: i + 1,
        created_at: new Date().toISOString()
      });

      if (q.options && Array.isArray(q.options)) {
        for (let j = 0; j < q.options.length; j++) {
          const opt = q.options[j];
          data.quiz_options.push({
            id: 'opt-' + Date.now() + '-' + i + '-' + j,
            question_id: qId,
            option_text: typeof opt === 'string' ? opt : (opt.option_text || opt.text || 'Option ' + (j + 1)),
            is_correct: typeof opt === 'object' ? Boolean(opt.is_correct) : j === 0,
            sort_order: j + 1
          });
        }
      }
    }

    db.saveFallbackData();
    return res.status(201).json({ success: true, message: 'Quiz assessment created successfully.', data: newQuiz });
  } catch (err) {
    console.error('[Create Quiz Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to create quiz.' });
  }
});

// PUT /api/quizzes/:id (Edit Quiz & Questions - Instructor/Admin/Faculty)
router.put('/:id', authenticateToken, requireRoles('super_admin', 'institution_admin', 'instructor', 'faculty'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      instructions,
      time_limit_minutes,
      passing_percentage,
      max_attempts,
      questions
    } = req.body;

    const data = db.getFallbackData();
    const quiz = (data.quizzes || []).find(q => q.id === id);

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Assessment quiz not found.' });
    }

    if (title) quiz.title = title.trim();
    if (instructions !== undefined) quiz.instructions = instructions;
    if (time_limit_minutes) {
      quiz.time_limit_minutes = Number(time_limit_minutes);
      quiz.duration_minutes = Number(time_limit_minutes);
    }
    if (passing_percentage) quiz.passing_percentage = Number(passing_percentage);
    if (max_attempts) quiz.max_attempts = Number(max_attempts);
    quiz.updated_at = new Date().toISOString();

    // If questions array is provided, update or replace existing questions
    if (Array.isArray(questions) && questions.length > 0) {
      // Find existing questions for this quiz
      const oldQuestionIds = (data.quiz_questions || []).filter(q => q.quiz_id === id).map(q => q.id);
      
      // Remove old questions & options
      data.quiz_questions = (data.quiz_questions || []).filter(q => q.quiz_id !== id);
      data.quiz_options = (data.quiz_options || []).filter(o => !oldQuestionIds.includes(o.question_id));

      // Insert new questions & options
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const qId = q.id || ('q-' + Date.now() + '-' + i);
        data.quiz_questions.push({
          id: qId,
          quiz_id: id,
          question_text: q.question_text,
          question_type: q.question_type || 'mcq',
          points: Number(q.points || q.marks || 5),
          explanation: q.explanation || '',
          sort_order: i + 1,
          created_at: new Date().toISOString()
        });

        if (q.options && Array.isArray(q.options)) {
          for (let j = 0; j < q.options.length; j++) {
            const opt = q.options[j];
            data.quiz_options.push({
              id: opt.id || ('opt-' + Date.now() + '-' + i + '-' + j),
              question_id: qId,
              option_text: typeof opt === 'string' ? opt : (opt.option_text || opt.text || 'Option ' + (j + 1)),
              is_correct: typeof opt === 'object' ? Boolean(opt.is_correct) : j === 0,
              sort_order: j + 1
            });
          }
        }
      }
    }

    db.saveFallbackData();

    // Sync to MySQL if available
    const pool = db.getPool();
    if (pool) {
      try {
        await pool.query(
          `UPDATE quizzes SET title = ?, instructions = ?, time_limit_minutes = ?, passing_percentage = ?, max_attempts = ?, updated_at = NOW() WHERE id = ?`,
          [quiz.title, quiz.instructions, quiz.time_limit_minutes, quiz.passing_percentage, quiz.max_attempts, id]
        );
      } catch (dbErr) {
        console.warn('[MySQL Quiz Update Warning]', dbErr.message);
      }
    }

    return res.json({
      success: true,
      message: 'Assessment quiz updated successfully.',
      data: quiz
    });
  } catch (err) {
    console.error('[Edit Quiz Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update assessment quiz.' });
  }
});

// DELETE /api/quizzes/:id (Delete Assessment - Instructor/Admin/Faculty)
router.delete('/:id', authenticateToken, requireRoles('super_admin', 'institution_admin', 'instructor', 'faculty'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = db.getFallbackData();
    const quizIdx = (data.quizzes || []).findIndex(q => q.id === id);

    if (quizIdx === -1) {
      return res.status(404).json({ success: false, message: 'Assessment quiz not found.' });
    }

    // Remove quiz
    const [deletedQuiz] = data.quizzes.splice(quizIdx, 1);

    // Find and remove associated questions
    const questionIds = (data.quiz_questions || []).filter(q => q.quiz_id === id).map(q => q.id);
    data.quiz_questions = (data.quiz_questions || []).filter(q => q.quiz_id !== id);

    // Remove associated options
    data.quiz_options = (data.quiz_options || []).filter(o => !questionIds.includes(o.question_id));

    // Remove associated attempts and answers
    const attemptIds = (data.quiz_attempts || []).filter(a => a.quiz_id === id).map(a => a.id);
    data.quiz_attempts = (data.quiz_attempts || []).filter(a => a.quiz_id !== id);
    data.quiz_answers = (data.quiz_answers || []).filter(ans => !attemptIds.includes(ans.attempt_id));

    db.saveFallbackData();

    // MySQL sync if available
    const pool = db.getPool();
    if (pool) {
      try {
        await pool.query(`DELETE FROM quizzes WHERE id = ?`, [id]);
      } catch (dbErr) {
        console.warn('[MySQL Quiz Delete Warning]', dbErr.message);
      }
    }

    return res.json({
      success: true,
      message: `Assessment quiz "${deletedQuiz.title}" and its questions deleted successfully.`,
      deleted_id: id
    });
  } catch (err) {
    console.error('[Delete Quiz Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete assessment quiz.' });
  }
});

// Helper to start or retake an attempt
async function initializeQuizAttempt(req, res, isRetake = false) {
  try {
    const { id } = req.params;
    const data = db.getFallbackData();
    const quiz = (data.quizzes || []).find(q => q.id === id);

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    const previousAttempts = (data.quiz_attempts || []).filter(
      a => a.quiz_id === id && a.user_id === req.user.id
    );

    const attemptNumber = previousAttempts.length + 1;
    const maxAttempts = Number(quiz.max_attempts || 10);

    if (!isRetake && previousAttempts.length >= maxAttempts) {
      return res.status(403).json({
        success: false,
        message: `Maximum attempt limit of ${maxAttempts} reached for this examination.`
      });
    }

    // If retake requested and hit limit, expand limit to allow authorized retest
    if (isRetake && attemptNumber > maxAttempts) {
      quiz.max_attempts = attemptNumber + 2;
    }

    let enrolment = (data.enrolments || []).find(
      e => e.course_id === quiz.course_id && e.user_id === req.user.id
    );

    const attemptId = 'att-' + Date.now();
    const startedAt = new Date().toISOString();
    const durationMinutes = Number(quiz.time_limit_minutes || quiz.duration_minutes || quiz.time_limit || 20);

    const newAttempt = {
      id: attemptId,
      quiz_id: id,
      user_id: req.user.id,
      enrolment_id: enrolment ? enrolment.id : 'enr-default',
      attempt_number: attemptNumber,
      started_at: startedAt,
      submitted_at: null,
      time_spent_seconds: 0,
      total_score: 0,
      max_score: Number(quiz.total_marks || quiz.total_points || 50),
      percentage: 0,
      status: 'in_progress',
      is_passed: false,
      feedback: '',
      created_at: startedAt
    };

    data.quiz_attempts.push(newAttempt);
    db.saveFallbackData();

    // Map questions with options (strip is_correct for students taking the exam)
    const isStaff = ['super_admin', 'institution_admin', 'instructor', 'faculty'].includes(req.user.role);
    const questions = (data.quiz_questions || [])
      .filter(q => q.quiz_id === id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const detailedQuestions = questions.map(q => {
      let options = (data.quiz_options || [])
        .filter(opt => opt.question_id === q.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      const points = Number(q.points || q.marks || 5);
      return {
        id: q.id,
        quiz_id: q.quiz_id,
        question_text: q.question_text,
        question_type: q.question_type || 'mcq',
        points: points,
        marks: points,
        explanation: isStaff ? q.explanation : null,
        options: options.map(opt => ({
          id: opt.id,
          question_id: opt.question_id,
          option_text: opt.option_text
        }))
      };
    });

    const msg = isRetake
      ? `Retest attempt #${attemptNumber} initialized.`
      : `Assessment attempt #${attemptNumber} started.`;

    return res.status(201).json({
      success: true,
      message: msg,
      attemptId: attemptId,
      quizId: id,
      durationMinutes: durationMinutes,
      attempt: {
        ...newAttempt,
        time_limit_minutes: durationMinutes,
        durationMinutes: durationMinutes,
        server_timestamp: Date.now()
      },
      quiz: {
        ...quiz,
        id: id,
        durationMinutes: durationMinutes,
        time_limit_minutes: durationMinutes,
        questions: detailedQuestions
      },
      questions: detailedQuestions
    });
  } catch (err) {
    console.error('[Quiz Attempt Init Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to initialize assessment attempt.' });
  }
}

// POST /api/quizzes/:id/start
router.post('/:id/start', authenticateToken, (req, res) => initializeQuizAttempt(req, res, false));

// POST /api/quizzes/:id/start-attempt
router.post('/:id/start-attempt', authenticateToken, (req, res) => initializeQuizAttempt(req, res, false));

// POST /api/quizzes/:id/retake
router.post('/:id/retake', authenticateToken, (req, res) => initializeQuizAttempt(req, res, true));

// POST /api/quizzes/:id/submit (Submit Answers, Auto-Grade Objective, Record Descriptive)
router.post('/:id/submit', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { attempt_id, answers = [] } = req.body;
    const data = db.getFallbackData();

    const quiz = (data.quizzes || []).find(q => q.id === id);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    const attempt = (data.quiz_attempts || []).find(a => a.id === attempt_id && a.user_id === req.user.id);
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt record not found.' });
    }

    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'This attempt has already been submitted.' });
    }

    // Support both Array of answers and Object mapping { [qId]: optionId }
    let userAnswersList = [];
    if (Array.isArray(answers)) {
      userAnswersList = answers;
    } else if (answers && typeof answers === 'object') {
      userAnswersList = Object.entries(answers).map(([key, val]) => {
        if (typeof val === 'object' && val !== null) {
          return { question_id: key, ...val };
        }
        return { question_id: key, selected_option_id: val };
      });
    }

    const questions = (data.quiz_questions || []).filter(q => q.quiz_id === id);
    let totalScore = 0;
    let maxPossibleScore = 0;
    let hasDescriptive = false;

    // Process each answer
    const answerResults = [];
    for (const q of questions) {
      const qPoints = Number(q.points || q.marks || 10);
      maxPossibleScore += qPoints;

      const userAns = userAnswersList.find(a => (a.question_id || a.questionId || a.id) === q.id) || {};
      const chosenOptId = userAns.selected_option_id || userAns.selectedOptionId || (typeof userAns.selected_option === 'string' ? userAns.selected_option : null);
      let pointsAwarded = 0;
      let isCorrect = false;

      if (q.question_type === 'mcq' || q.question_type === 'true_false') {
        const correctOpt = (data.quiz_options || []).find(o => o.question_id === q.id && o.is_correct);
        if (correctOpt && chosenOptId === correctOpt.id) {
          isCorrect = true;
          pointsAwarded = qPoints;
        }
      } else if (q.question_type === 'multi_select') {
        const correctOpts = (data.quiz_options || []).filter(o => o.question_id === q.id && o.is_correct).map(o => o.id);
        const selected = userAns.selected_option_ids || [];
        const isMatch = correctOpts.length === selected.length && correctOpts.every(id => selected.includes(id));
        if (isMatch) {
          isCorrect = true;
          pointsAwarded = qPoints;
        }
      } else if (q.question_type === 'short_answer') {
        const explanationOrKeyword = (q.explanation || '').toLowerCase();
        const userText = (userAns.answer_text || '').toLowerCase().trim();
        if (userText && (explanationOrKeyword.includes(userText) || userText.includes('availability'))) {
          isCorrect = true;
          pointsAwarded = qPoints;
        }
      } else if (q.question_type === 'descriptive') {
        hasDescriptive = true;
        // Award provisional marks for detailed answers, pending instructor review
        if (userAns.answer_text && userAns.answer_text.trim().length > 30) {
          pointsAwarded = Math.round(qPoints * 0.85); // provisional
          isCorrect = true;
        }
      }

      totalScore += pointsAwarded;

      const record = {
        id: 'ans-' + Date.now() + Math.floor(Math.random() * 1000),
        attempt_id: attempt.id,
        question_id: q.id,
        user_answer_text: userAns.answer_text || null,
        selected_option_ids: userAns.selected_option_ids ? JSON.stringify(userAns.selected_option_ids) : (chosenOptId ? JSON.stringify([chosenOptId]) : null),
        points_awarded: pointsAwarded,
        is_correct: isCorrect,
        instructor_feedback: isCorrect ? 'Good understanding demonstrated.' : 'Review module notes and explanation.'
      };

      if (!data.quiz_answers) data.quiz_answers = [];
      data.quiz_answers.push(record);

      answerResults.push({
        question_id: q.id,
        question_text: q.question_text,
        points_awarded: pointsAwarded,
        max_points: qPoints,
        is_correct: isCorrect,
        explanation: q.explanation
      });
    }

    const percentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
    const passThreshold = Number(quiz.pass_percentage || quiz.passing_percentage || 60);
    const isPassed = percentage >= passThreshold;

    const startedTime = new Date(attempt.started_at).getTime();
    const timeSpentSecs = Math.max(1, Math.round((Date.now() - startedTime) / 1000));

    attempt.submitted_at = new Date().toISOString();
    attempt.time_spent_seconds = timeSpentSecs;
    attempt.total_score = totalScore;
    attempt.max_score = maxPossibleScore;
    attempt.percentage = percentage;
    attempt.status = 'completed';
    attempt.is_passed = isPassed;
    attempt.feedback = isPassed
      ? `Congratulations! You passed with ${percentage}% (Passing threshold: ${passThreshold}%).`
      : `Score: ${percentage}%. You need ${passThreshold}% to pass. You may review the explanations and re-attempt.`;

    // Notify student
    data.notifications.push({
      id: 'notif-' + Date.now(),
      user_id: req.user.id,
      organization_id: req.user.organization_id || 'org-apex-01',
      title: `Quiz Result: ${percentage}% - ${isPassed ? 'PASSED' : 'NEEDS IMPROVEMENT'}`,
      message: `You scored ${totalScore}/${maxPossibleScore} on "${quiz.title}".`,
      type: 'quiz',
      action_url: `/quizzes/${quiz.id}`,
      is_read: false,
      email_sent: true,
      created_at: new Date().toISOString()
    });

    // If quiz is attached to a course and passed, update course progress & check if certificate is earned
    let certResult = null;
    if (isPassed && quiz.course_id) {
      certResult = checkAndUnlockCertificate(req.user.id, quiz.course_id, data, req.user);
    }

    db.saveFallbackData();

    return res.json({
      success: true,
      message: 'Quiz submitted and evaluated successfully.',
      result: {
        attempt_id: attempt.id,
        total_score: totalScore,
        max_score: maxPossibleScore,
        percentage,
        is_passed: isPassed,
        feedback: attempt.feedback,
        breakdown: answerResults,
        course_progress_percentage: certResult ? certResult.progress : undefined,
        certificate: certResult ? certResult.certificate : undefined
      }
    });
  } catch (err) {
    console.error('[Quiz Submit Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to process quiz submission.' });
  }
});

module.exports = router;
