const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../config/db');
const { authenticateToken, verifyRole, optionalAuth } = require('../middleware/auth');

const FACULTY_ADMIN_ROLES = ['faculty', 'instructor', 'super_admin', 'institution_admin', 'admin'];

// ==========================================
// MULTER STORAGE CONFIGURATION
// ==========================================
const uploadDir = path.join(__dirname, '../../uploads/assignments');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${base}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max file size
  fileFilter: (req, file, cb) => {
    const allowedExts = /pdf|doc|docx|png|jpg|jpeg|txt|zip|sql|py|java|cpp|c/i;
    const ext = path.extname(file.originalname).slice(1).toLowerCase();
    if (allowedExts.test(ext) || file.mimetype.includes('pdf') || file.mimetype.includes('image')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, PNG, JPG, JPEG, TXT, ZIP, SQL, PY, JAVA'));
    }
  }
});

// Helper: sync submission to MySQL if active pool exists
async function syncSubmissionToMySQL(submission) {
  try {
    const pool = db.getPool();
    if (pool && !db.isUsingFallback()) {
      await pool.query(
        `INSERT INTO assignment_submissions (id, assignment_id, student_id, submission_text, attachment_url, status, marks_awarded, feedback, submitted_at, graded_by, graded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           submission_text = VALUES(submission_text),
           attachment_url = VALUES(attachment_url),
           status = VALUES(status),
           marks_awarded = VALUES(marks_awarded),
           feedback = VALUES(feedback),
           submitted_at = VALUES(submitted_at),
           graded_by = VALUES(graded_by),
           graded_at = VALUES(graded_at)`,
        [
          submission.id,
          submission.assignment_id,
          submission.student_id,
          submission.submission_text || '',
          submission.attachment_url || '',
          submission.status || 'submitted',
          submission.marks_awarded !== undefined ? submission.marks_awarded : null,
          submission.feedback || null,
          submission.submitted_at || new Date().toISOString(),
          submission.graded_by || null,
          submission.graded_at || null
        ]
      );
    }
  } catch (err) {
    console.warn('[MySQL Sync Warning] Failed to sync submission to MySQL:', err.message);
  }
}

// Helper: Construct full accessible URL for frontend
function toFullUrl(req, relativeOrFullUrl) {
  if (!relativeOrFullUrl) return '';
  const str = String(relativeOrFullUrl).trim();
  if (str.startsWith('http://') || str.startsWith('https://') || str.startsWith('blob:') || str.startsWith('data:')) {
    return str;
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host') || `localhost:${process.env.PORT || 5000}`;
  let cleanPath = str.replace(/\\/g, '/');
  const uploadsIdx = cleanPath.indexOf('/uploads/');
  if (uploadsIdx !== -1) {
    cleanPath = cleanPath.substring(uploadsIdx);
  } else if (cleanPath.startsWith('uploads/')) {
    cleanPath = '/' + cleanPath;
  } else if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
  }
  return `${protocol}://${host}${cleanPath}`;
}

// ==========================================
// 1. UPLOAD ASSIGNMENT DOCUMENT (Student / Faculty)
// ==========================================
router.post('/upload', authenticateToken, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file was uploaded.' });
    }

    const relativePath = `/uploads/assignments/${req.file.filename}`;
    const fullUrl = toFullUrl(req, relativePath);
    const fileSizeMb = (req.file.size / (1024 * 1024)).toFixed(2) + ' MB';

    return res.json({
      success: true,
      message: 'Assignment document uploaded successfully.',
      data: {
        file_url: fullUrl,
        relative_url: relativePath,
        filename: req.file.filename,
        original_name: req.file.originalname,
        file_size: fileSizeMb,
        mimetype: req.file.mimetype
      }
    });
  });
});

// ==========================================
// 2. LIST ASSIGNMENTS (Role-Aware Enriched)
// ==========================================
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { subject_id, batch_id } = req.query;
    const data = db.getFallbackData();
    let assignments = data.assignments || [];

    if (subject_id) assignments = assignments.filter(a => a.subject_id === subject_id);
    if (batch_id) assignments = assignments.filter(a => a.batch_id === batch_id);

    const userId = req.user ? req.user.id : null;
    const isStudent = req.user && req.user.role === 'student';

    const enriched = assignments.map(a => {
      const subject = (data.subjects || []).find(s => s.id === a.subject_id);
      const batch = (data.batches || []).find(b => b.id === a.batch_id);
      const creator = (data.users || []).find(u => u.id === a.created_by);
      const submissions = (data.assignment_submissions || []).filter(sub => sub.assignment_id === a.id);
      const gradedCount = submissions.filter(sub => sub.status === 'graded').length;

      // Check if student has submitted
      let mySubmission = null;
      if (userId) {
        const found = submissions.find(sub => sub.student_id === userId);
        if (found) {
          const grader = found.graded_by ? (data.users || []).find(u => u.id === found.graded_by) : null;
          mySubmission = {
            id: found.id,
            status: found.status,
            marks_awarded: found.marks_awarded,
            split_marks: found.split_marks || null,
            remarks: found.remarks || null,
            feedback: found.feedback,
            submitted_at: found.submitted_at,
            submission_text: found.submission_text,
            attachment_url: toFullUrl(req, found.attachment_url),
            graded_by_name: grader ? grader.name : 'Faculty Evaluator',
            graded_at: found.graded_at
          };
        }
      }

      return {
        ...a,
        attachment_url: toFullUrl(req, a.attachment_url),
        subject_name: subject ? subject.name : 'General Academic',
        subject_code: subject ? subject.code : '',
        batch_name: batch ? batch.name : 'All Batches',
        created_by_name: creator ? creator.name : 'Faculty Instructor',
        submissions_count: submissions.length,
        graded_count: gradedCount,
        my_submission: mySubmission
      };
    });

    return res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('[Assignments List Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch assignments.' });
  }
});

// ==========================================
// 3. SINGLE ASSIGNMENT DETAIL & SUBMISSIONS (Privacy Guarded)
// ==========================================
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const data = db.getFallbackData();
    const assignment = (data.assignments || []).find(a => a.id === req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const subject = (data.subjects || []).find(s => s.id === assignment.subject_id);
    const batch = (data.batches || []).find(b => b.id === assignment.batch_id);

    const isStudent = req.user && req.user.role === 'student';
    const userId = req.user ? req.user.id : null;

    let submissions = (data.assignment_submissions || []).filter(s => s.assignment_id === assignment.id);

    // If authenticated as student, ONLY expose their own submission! Never leak other students' submissions or marks.
    if (isStudent && userId) {
      submissions = submissions.filter(s => s.student_id === userId);
    }

    const enrichedSubmissions = submissions.map(sub => {
      const studentUser = (data.users || []).find(u => u.id === sub.student_id);
      const profile = (data.student_profiles || []).find(p => p.user_id === sub.student_id);
      const grader = sub.graded_by ? (data.users || []).find(u => u.id === sub.graded_by) : null;
      return {
        ...sub,
        attachment_url: toFullUrl(req, sub.attachment_url),
        student_name: studentUser ? studentUser.name : 'Student',
        student_email: studentUser ? studentUser.email : '',
        roll_no: profile ? profile.roll_no : 'N/A',
        register_no: profile ? profile.register_no : 'N/A',
        graded_by_name: grader ? grader.name : null
      };
    });

    const mySubmission = enrichedSubmissions.find(s => s.student_id === userId) || null;

    return res.json({
      success: true,
      data: {
        ...assignment,
        attachment_url: toFullUrl(req, assignment.attachment_url),
        subject_name: subject ? subject.name : '',
        subject_code: subject ? subject.code : '',
        batch_name: batch ? batch.name : '',
        submissions: enrichedSubmissions,
        my_submission: mySubmission
      }
    });
  } catch (err) {
    console.error('[Assignment Detail Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve assignment.' });
  }
});

// ==========================================
// 4. TEACHER / INSTRUCTOR: GET ALL SUBMISSIONS FOR ASSIGNMENT
// ==========================================
router.get('/:id/submissions', authenticateToken, verifyRole(FACULTY_ADMIN_ROLES), async (req, res) => {
  try {
    const data = db.getFallbackData();
    const assignment = (data.assignments || []).find(a => a.id === req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const submissions = (data.assignment_submissions || [])
      .filter(s => s.assignment_id === assignment.id)
      .map(sub => {
        const studentUser = (data.users || []).find(u => u.id === sub.student_id);
        const profile = (data.student_profiles || []).find(p => p.user_id === sub.student_id);
        const grader = sub.graded_by ? (data.users || []).find(u => u.id === sub.graded_by) : null;
        return {
          ...sub,
          attachment_url: toFullUrl(req, sub.attachment_url),
          student_name: studentUser ? studentUser.name : 'Student',
          student_email: studentUser ? studentUser.email : '',
          roll_no: profile ? profile.roll_no : 'N/A',
          register_no: profile ? profile.register_no : 'N/A',
          graded_by_name: grader ? grader.name : null
        };
      })
      .sort((a, b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0));

    return res.json({
      success: true,
      data: {
        assignment_id: assignment.id,
        assignment_title: assignment.title,
        max_marks: assignment.max_marks,
        due_date: assignment.due_date,
        total_submissions: submissions.length,
        graded_count: submissions.filter(s => s.status === 'graded').length,
        submissions
      }
    });
  } catch (err) {
    console.error('[Get Submissions Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve assignment submissions.' });
  }
});

// GET /api/assignments/submissions/:submission_id/download - Direct file download for student work
router.get('/submissions/:submission_id/download', authenticateToken, (req, res) => {
  try {
    const { submission_id } = req.params;
    const data = db.getFallbackData();
    const submission = (data.assignment_submissions || []).find(s => s.id === submission_id);
    if (!submission || !submission.attachment_url) {
      return res.status(404).json({ success: false, message: 'Submission or document attachment not found.' });
    }

    const assignment = (data.assignments || []).find(a => a.id === submission.assignment_id);
    const studentUser = (data.users || []).find(u => u.id === submission.student_id);
    const profile = (data.student_profiles || []).find(p => p.user_id === submission.student_id);

    let filename = '';
    try {
      const parsed = new URL(submission.attachment_url, 'http://localhost:5000');
      filename = path.basename(parsed.pathname);
    } catch (e) {
      filename = path.basename(submission.attachment_url);
    }

    const possibleDirs = [
      uploadDir,
      path.join(__dirname, '../../uploads'),
      path.join(__dirname, '../../uploads/materials')
    ];

    let foundPath = null;
    for (const d of possibleDirs) {
      const full = path.join(d, filename);
      if (fs.existsSync(full) && fs.statSync(full).isFile()) {
        foundPath = full;
        break;
      }
    }

    const rollNo = profile ? profile.roll_no : (studentUser ? studentUser.name : 'student');
    const cleanAsg = assignment ? assignment.title.replace(/[^a-zA-Z0-9_-]/g, '_') : 'assignment';
    const ext = path.extname(filename) || '.pdf';
    const downloadFilename = `${rollNo}_${cleanAsg}${ext}`;

    if (foundPath) {
      res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
      return res.download(foundPath, downloadFilename);
    }

    if (submission.attachment_url.startsWith('http://') || submission.attachment_url.startsWith('https://')) {
      return res.redirect(submission.attachment_url);
    }

    return res.status(404).json({ success: false, message: 'Physical file not found on server.' });
  } catch (err) {
    console.error('[Download Submission Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to download submission.' });
  }
});

// ==========================================
// 5. FACULTY / ADMIN: CREATE & RELEASE ASSIGNMENT
// ==========================================
router.post('/', authenticateToken, verifyRole(FACULTY_ADMIN_ROLES), async (req, res) => {
  try {
    const { subject_id, course_id, batch_id, title, description, instructions, due_date, max_marks = 20.0, passing_marks, attachment_url, file_url } = req.body;
    const finalSubjectId = subject_id || course_id || 'course-cloud-01';
    const finalBatchId = batch_id || 'batch-all';
    const finalDesc = description || instructions || 'Course Assignment';
    const finalAttachment = attachment_url || file_url || '';

    if (!title || !due_date) {
      return res.status(400).json({
        success: false,
        message: 'Title and Due Date are required.'
      });
    }

    const data = db.getFallbackData();
    const newAssignment = {
      id: 'asg-' + Date.now(),
      subject_id: finalSubjectId,
      course_id: course_id || finalSubjectId,
      batch_id: finalBatchId,
      title,
      description: finalDesc,
      instructions: finalDesc,
      due_date,
      max_marks: parseFloat(max_marks) || 20.0,
      passing_marks: passing_marks !== undefined ? parseFloat(passing_marks) : (parseFloat(max_marks) * 0.5 || 10.0),
      attachment_url: finalAttachment,
      created_by: req.user.id,
      created_at: new Date().toISOString()
    };

    if (!data.assignments) data.assignments = [];
    data.assignments.push(newAssignment);

    // Sync to MySQL if pool available
    try {
      const pool = db.getPool();
      if (pool && !db.isUsingFallback()) {
        await pool.query(
          `INSERT INTO assignments (id, subject_id, batch_id, title, description, due_date, max_marks, attachment_url, created_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            newAssignment.id,
            newAssignment.subject_id,
            newAssignment.batch_id,
            newAssignment.title,
            newAssignment.description,
            new Date(newAssignment.due_date),
            newAssignment.max_marks,
            newAssignment.attachment_url,
            newAssignment.created_by
          ]
        );
      }
    } catch (mysqlErr) {
      console.warn('[MySQL Insert Assignment Warning]', mysqlErr.message);
    }

    // Notify enrolled students in batch
    const enrolledProfiles = (data.student_profiles || []).filter(p => p.batch_id === batch_id);
    const subject = (data.subjects || []).find(s => s.id === subject_id);
    enrolledProfiles.forEach(p => {
      data.notifications.push({
        id: `notif-asg-${Date.now()}-${p.user_id}`,
        user_id: p.user_id,
        title: `New Assignment Released: ${title}`,
        message: `New problem set published for ${subject ? subject.name : 'Course'}. Due: ${new Date(due_date).toLocaleDateString()}.`,
        type: 'assignment',
        action_url: '/assignments',
        is_read: false,
        created_at: new Date().toISOString()
      });
    });

    db.saveFallbackData();

    return res.status(201).json({
      success: true,
      message: 'Assignment published successfully.',
      data: newAssignment
    });
  } catch (err) {
    console.error('[Create Assignment Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to create assignment.' });
  }
});

// ==========================================
// 6. STUDENT: SUBMIT COMPLETED ASSIGNMENT WORK (File or Text)
// ==========================================
router.post('/:id/submit', authenticateToken, async (req, res) => {
  try {
    const { submission_text, attachment_url, file_name, file_size } = req.body;
    const data = db.getFallbackData();
    const assignment = (data.assignments || []).find(a => a.id === req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const rawAttachment = req.body.attachment_url || req.body.file_url || '';
    const rawFileName = req.body.file_name || '';

    if (!submission_text && !rawAttachment) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either a solution explanation text or attach your completed assignment document.'
      });
    }

    const studentId = req.user.id;
    const isLate = new Date() > new Date(assignment.due_date);

    if (!data.assignment_submissions) data.assignment_submissions = [];

    const existingIdx = data.assignment_submissions.findIndex(
      s => s.assignment_id === assignment.id && s.student_id === studentId
    );

    let submissionRecord;

    if (existingIdx >= 0) {
      // Archive previous version if revising
      const prev = data.assignment_submissions[existingIdx];
      if (!prev.history) prev.history = [];
      prev.history.push({
        submission_text: prev.submission_text,
        attachment_url: prev.attachment_url,
        file_name: prev.file_name,
        submitted_at: prev.submitted_at,
        marks_awarded: prev.marks_awarded,
        feedback: prev.feedback,
        status: prev.status
      });

      // Update submission with revised work
      prev.submission_text = submission_text !== undefined ? submission_text : prev.submission_text;
      prev.attachment_url = rawAttachment !== undefined ? rawAttachment : prev.attachment_url;
      prev.file_name = rawFileName || prev.file_name || '';
      const wasResubmissionRequested = prev.status === 'resubmission_requested';
      prev.status = wasResubmissionRequested ? 'resubmitted' : (isLate ? 'late' : 'submitted');
      prev.marks_awarded = null; // reset marks for new grading
      prev.resubmitted = true;
      submissionRecord = prev;

      if (wasResubmissionRequested && assignment.created_by) {
        data.notifications.push({
          id: `notif-resub-done-${Date.now()}-${assignment.created_by}`,
          user_id: assignment.created_by,
          title: `Revised Assignment Submitted: ${assignment.title}`,
          message: `Student ${req.user.name} has submitted an updated solution following your revision request.`,
          type: 'assignment',
          action_url: '/assignments',
          is_read: false,
          created_at: new Date().toISOString()
        });
      }
    } else {
      submissionRecord = {
        id: 'subm-' + Date.now(),
        assignment_id: assignment.id,
        student_id: studentId,
        submission_text: submission_text || '',
        attachment_url: rawAttachment,
        file_name: rawFileName,
        status: isLate ? 'late' : 'submitted',
        marks_awarded: null,
        feedback: null,
        submitted_at: new Date().toISOString(),
        graded_by: null,
        graded_at: null
      };
      data.assignment_submissions.push(submissionRecord);
    }

    // Save locally
    db.saveFallbackData();

    // Sync to MySQL
    await syncSubmissionToMySQL(submissionRecord);

    return res.json({
      success: true,
      message: isLate ? 'Assignment submitted (Marked Late submission).' : 'Assignment solution submitted successfully.',
      data: {
        ...submissionRecord,
        attachment_url: toFullUrl(req, submissionRecord.attachment_url)
      }
    });
  } catch (err) {
    console.error('[Submit Assignment Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to submit assignment.' });
  }
});

// ==========================================
// 7. TEACHER / INSTRUCTOR / ADMIN: EVALUATE & ENTER MARKS
// ==========================================
const handleGradeSubmission = async (req, res) => {
  try {
    const { marks_awarded, feedback, split_marks, remarks } = req.body;
    const data = db.getFallbackData();
    const submissionId = req.params.submission_id || req.params.id;

    const submission = (data.assignment_submissions || []).find(s => s.id === submissionId);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found.' });
    }

    const assignment = (data.assignments || []).find(a => a.id === submission.assignment_id || a.id === req.params.id);
    const maxMarks = assignment ? (assignment.max_marks || 100) : 100;

    const score = parseFloat(marks_awarded);
    if (isNaN(score) || score < 0 || score > maxMarks) {
      return res.status(400).json({
        success: false,
        message: `Evaluation marks must be a valid number between 0 and maximum marks (${maxMarks}).`
      });
    }

    const finalFeedback = String(feedback || remarks || '').trim();

    submission.marks_awarded = score;
    submission.split_marks = split_marks || submission.split_marks || null;
    submission.feedback = finalFeedback;
    submission.status = 'graded';
    submission.graded_by = req.user.id;
    submission.graded_at = new Date().toISOString();

    // Create notification for student
    data.notifications.push({
      id: `notif-grade-${Date.now()}-${submission.student_id}`,
      user_id: submission.student_id,
      title: `Assignment Graded: ${assignment ? assignment.title : 'Assignment'}`,
      message: `Your instructor has graded your submission: ${score} / ${maxMarks}. Feedback: "${submission.feedback || 'Reviewed'}"`,
      type: 'grade',
      action_url: '/assignments',
      is_read: false,
      created_at: new Date().toISOString()
    });

    db.saveFallbackData();

    // Sync to MySQL
    await syncSubmissionToMySQL(submission);

    return res.json({
      success: true,
      message: 'Submission graded successfully. Student score and feedback recorded.',
      data: submission
    });
  } catch (err) {
    console.error('[Grade Submission Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to grade submission.' });
  }
};

router.post('/:id/grade/:submission_id', authenticateToken, verifyRole(FACULTY_ADMIN_ROLES), handleGradeSubmission);
router.post('/submissions/:submission_id/grade', authenticateToken, verifyRole(FACULTY_ADMIN_ROLES), handleGradeSubmission);
router.post('/:submission_id/grade', authenticateToken, verifyRole(FACULTY_ADMIN_ROLES), handleGradeSubmission);

// ==========================================
// 8. INSTRUCTOR / ADMIN: REQUEST RESUBMISSION
// ==========================================
const handleRequestResubmission = async (req, res) => {
  try {
    const { feedback = '', reason = '' } = req.body;
    const data = db.getFallbackData();
    const assignment = (data.assignments || []).find(a => a.id === req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const submission = (data.assignment_submissions || []).find(s => s.id === req.params.submission_id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found.' });
    }

    const note = String(feedback || reason || 'Please revise your solution based on instructor guidelines and resubmit.').trim();

    submission.status = 'resubmission_requested';
    submission.feedback = note;
    submission.resubmission_requested_at = new Date().toISOString();
    submission.resubmission_requested_by = req.user.id;
    submission.marks_awarded = null; // Reset mark so revised work can be graded

    // Send high priority notification to student
    data.notifications.push({
      id: `notif-resub-${Date.now()}-${submission.student_id}`,
      user_id: submission.student_id,
      title: `Revision Requested: ${assignment.title}`,
      message: `Your instructor has requested revisions on your assignment submission. Note: "${note}". Please review and upload your updated work.`,
      type: 'assignment',
      action_url: '/assignments',
      is_read: false,
      created_at: new Date().toISOString()
    });

    db.saveFallbackData();

    // Sync to MySQL
    await syncSubmissionToMySQL(submission);

    return res.json({
      success: true,
      message: 'Resubmission requested successfully. The student has been notified to revise and resubmit.',
      data: submission
    });
  } catch (err) {
    console.error('[Request Resubmission Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to request resubmission: ' + err.message });
  }
};

router.post('/:id/resubmission-request/:submission_id', authenticateToken, verifyRole(FACULTY_ADMIN_ROLES), handleRequestResubmission);
router.post('/:id/request-resubmission/:submission_id', authenticateToken, verifyRole(FACULTY_ADMIN_ROLES), handleRequestResubmission);
router.post('/submissions/:submission_id/resubmission-request', authenticateToken, verifyRole(FACULTY_ADMIN_ROLES), handleRequestResubmission);
router.post('/submissions/:submission_id/request-resubmission', authenticateToken, verifyRole(FACULTY_ADMIN_ROLES), handleRequestResubmission);

module.exports = router;
