const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { requireRoles } = require('../middleware/rbac');
const { checkAndUnlockCertificate } = require('../services/certificate.service');

// POST /api/curriculum/courses/:courseId/sections (Create Section)
router.post('/courses/:courseId/sections', authenticateToken, requireRoles('super_admin', 'institution_admin', 'instructor'), async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description = '', sort_order = 1 } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Section title is required.' });
    }

    const data = db.getFallbackData();
    const course = (data.courses || []).find(c => c.id === courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const newSection = {
      id: 'sec-' + Date.now(),
      course_id: courseId,
      title,
      description,
      sort_order: Number(sort_order),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    data.course_sections.push(newSection);
    db.saveFallbackData();

    return res.status(201).json({ success: true, message: 'Section created.', data: newSection });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create section.' });
  }
});

// PUT /api/curriculum/sections/:id (Update Section)
router.put('/sections/:id', authenticateToken, requireRoles('super_admin', 'institution_admin', 'instructor'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = db.getFallbackData();
    const section = (data.course_sections || []).find(s => s.id === id);
    if (!section) {
      return res.status(404).json({ success: false, message: 'Section not found.' });
    }

    Object.assign(section, req.body, { updated_at: new Date().toISOString() });
    db.saveFallbackData();

    return res.json({ success: true, message: 'Section updated.', data: section });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update section.' });
  }
});

// DELETE /api/curriculum/sections/:id
router.delete('/sections/:id', authenticateToken, requireRoles('super_admin', 'institution_admin', 'instructor'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = db.getFallbackData();
    data.course_sections = (data.course_sections || []).filter(s => s.id !== id);
    data.lessons = (data.lessons || []).filter(l => l.section_id !== id);
    db.saveFallbackData();

    return res.json({ success: true, message: 'Section deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete section.' });
  }
});

// POST /api/curriculum/sections/:sectionId/lessons (Create Lesson)
router.post('/sections/:sectionId/lessons', authenticateToken, requireRoles('super_admin', 'institution_admin', 'instructor'), async (req, res) => {
  try {
    const { sectionId } = req.params;
    const {
      title,
      description = '',
      content_type = 'video',
      content_url = '',
      content_body = '',
      duration_minutes = 15,
      is_preview = false,
      is_mandatory = true,
      sort_order = 1
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Lesson title is required.' });
    }

    const data = db.getFallbackData();
    const section = (data.course_sections || []).find(s => s.id === sectionId);
    if (!section) {
      return res.status(404).json({ success: false, message: 'Section not found.' });
    }

    const newLesson = {
      id: 'les-' + Date.now(),
      section_id: sectionId,
      course_id: section.course_id,
      title,
      description,
      content_type,
      content_url,
      content_body,
      duration_minutes: Number(duration_minutes),
      is_preview: Boolean(is_preview),
      is_mandatory: Boolean(is_mandatory),
      sort_order: Number(sort_order),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    data.lessons.push(newLesson);
    db.saveFallbackData();

    return res.status(201).json({ success: true, message: 'Lesson created successfully.', data: newLesson });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create lesson.' });
  }
});

// GET /api/curriculum/lessons/:id (Full Lesson for Player)
router.get('/lessons/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const isStudentPreview = req.query.preview === 'student';
    const data = db.getFallbackData();
    const lesson = (data.lessons || []).find(l => l.id === id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found.' });
    }

    const isStaff = ['super_admin', 'institution_admin', 'instructor'].includes(req.user.role);
    const enrolment = (data.enrolments || []).find(
      e => e.course_id === lesson.course_id && e.user_id === req.user.id
    );

    // 1. Check access revocation
    if (enrolment && enrolment.status === 'revoked' && (!isStaff || isStudentPreview)) {
      return res.status(403).json({
        success: false,
        revoked: true,
        message: 'Access Revoked: Your course enrolment has been revoked by an administrator.'
      });
    }

    // 2. Check enrolment expiry
    if (enrolment && enrolment.access_expiry_date) {
      const expiry = new Date(enrolment.access_expiry_date);
      if (expiry < new Date()) {
        enrolment.status = 'expired';
        db.saveFallbackData();
        if (!isStaff || isStudentPreview) {
          return res.status(403).json({
            success: false,
            expired: true,
            message: `Access Expired: Your course enrolment expired on ${enrolment.access_expiry_date}. Please contact your administrator.`
          });
        }
      }
    }

    // Academic College LMS: If student is not yet enrolled, auto-enrol them in the course
    if (!enrolment && req.user.role === 'student') {
      const course = (data.courses || []).find(c => c.id === lesson.course_id);
      if (course && course.status === 'published') {
        enrolment = {
          id: 'enr-' + Date.now(),
          organization_id: course.organization_id || req.user.organization_id || 'org-apex-01',
          user_id: req.user.id,
          course_id: lesson.course_id,
          enrolment_type: 'institutional',
          status: 'active',
          access_start_date: new Date().toISOString().split('T')[0],
          access_expiry_date: null,
          completed_at: null,
          progress_percentage: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        if (!data.enrolments) data.enrolments = [];
        data.enrolments.push(enrolment);
        db.saveFallbackData();
      }
    }

    const isEnrolled = (enrolment && (enrolment.status === 'active' || enrolment.status === 'completed')) || isStudentPreview;

    // Find all lessons for course in sequential curriculum order
    const courseSections = (data.course_sections || [])
      .filter(s => s.course_id === lesson.course_id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const allSequentialLessons = [];
    courseSections.forEach(sec => {
      const secLessons = (data.lessons || [])
        .filter(l => l.section_id === sec.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      secLessons.forEach(l => allSequentialLessons.push(l));
    });

    const currentIndex = allSequentialLessons.findIndex(l => l.id === id);
    const prevLesson = currentIndex > 0 ? allSequentialLessons[currentIndex - 1] : null;
    const nextLesson = currentIndex < allSequentialLessons.length - 1 ? allSequentialLessons[currentIndex + 1] : null;

    // Prerequisite enforcement: Previous lesson must be completed
    if (currentIndex > 0 && prevLesson && !lesson.is_preview && (!isStaff || isStudentPreview)) {
      const prevProg = (data.lesson_progress || []).find(
        p => p.lesson_id === prevLesson.id && p.user_id === req.user.id
      );
      if (!prevProg || !prevProg.is_completed) {
        return res.status(403).json({
          success: false,
          locked: true,
          prerequisite_lesson: { id: prevLesson.id, title: prevLesson.title },
          message: `Prerequisite Required: You must complete the prior lesson "${prevLesson.title}" before this module can be unlocked.`
        });
      }
    }

    // Check completion progress
    const progress = (data.lesson_progress || []).find(
      p => p.lesson_id === id && p.user_id === req.user.id
    );

    // Learning materials
    const materials = (data.learning_materials || []).filter(m => m.lesson_id === id);

    // Fetch personal notes for this lesson
    const notes = (data.lesson_notes || [])
      .filter(n => n.lesson_id === id && n.user_id === req.user.id && !n.is_bookmark)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Check bookmark status
    const isBookmarked = (data.lesson_notes || []).some(
      n => n.lesson_id === id && n.user_id === req.user.id && n.is_bookmark
    );

    return res.json({
      success: true,
      data: {
        ...lesson,
        is_completed: progress ? Boolean(progress.is_completed) : false,
        time_spent_seconds: progress ? progress.time_spent_seconds : 0,
        materials,
        notes,
        is_bookmarked: isBookmarked,
        navigation: {
          previous: prevLesson ? { id: prevLesson.id, title: prevLesson.title } : null,
          next: nextLesson ? { id: nextLesson.id, title: nextLesson.title } : null
        }
      }
    });
  } catch (err) {
    console.error('[Get Lesson Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve lesson details.' });
  }
});

// POST /api/curriculum/lessons/:id/progress & /complete (Toggle / Mark Lesson Complete & Calculate Course Progress)
const handleLessonProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_completed = true, time_spent_seconds = 60 } = req.body;
    const data = db.getFallbackData();

    const lesson = (data.lessons || []).find(l => l.id === id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found.' });
    }

    const sec = (data.course_sections || []).find(s => s.id === lesson.section_id);
    const targetCourseId = lesson.course_id || (sec ? sec.course_id : null);

    let enrolment = (data.enrolments || []).find(
      e => e.course_id === targetCourseId && e.user_id === req.user.id
    );

    if (!enrolment) {
      // Auto-enrol if free/demo
      enrolment = {
        id: 'enr-' + Date.now(),
        organization_id: req.user.organization_id || 'org-apex-01',
        user_id: req.user.id,
        course_id: targetCourseId,
        enrolment_type: 'self',
        status: 'active',
        access_start_date: new Date().toISOString().split('T')[0],
        access_expiry_date: null,
        progress_percentage: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      data.enrolments.push(enrolment);
    }

    let progress = (data.lesson_progress || []).find(
      p => p.lesson_id === id && p.user_id === req.user.id
    );

    if (progress) {
      progress.is_completed = Boolean(is_completed);
      progress.time_spent_seconds = (progress.time_spent_seconds || 0) + Number(time_spent_seconds);
      progress.completed_at = is_completed ? new Date().toISOString() : null;
    } else {
      progress = {
        id: 'prog-' + Date.now(),
        enrolment_id: enrolment.id,
        user_id: req.user.id,
        lesson_id: id,
        is_completed: Boolean(is_completed),
        time_spent_seconds: Number(time_spent_seconds),
        completed_at: is_completed ? new Date().toISOString() : null
      };
      data.lesson_progress.push(progress);
    }

    // Calculate total course completion % (across lessons and quizzes) & auto-unlock certificate
    const certResult = checkAndUnlockCertificate(req.user.id, targetCourseId, data, req.user);
    const calculatedProgress = certResult.progress;

    db.saveFallbackData();

    const issuedCert = certResult.certificate;

    return res.json({
      success: true,
      message: 'Lesson progress recorded.',
      progress: {
        is_completed: progress.is_completed,
        course_progress_percentage: calculatedProgress,
        course_status: enrolment.status
      },
      certificate: calculatedProgress >= 100 ? (issuedCert || null) : null
    });
  } catch (err) {
    console.error('[Lesson Progress Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to record lesson progress.' });
  }
};

router.post('/lessons/:id/progress', authenticateToken, handleLessonProgress);
router.post('/lessons/:id/complete', authenticateToken, handleLessonProgress);

// ==========================================
// PERSONAL NOTES & BOOKMARKS DRAWER ENDPOINTS
// ==========================================

// GET /api/curriculum/lessons/:id/notes
router.get('/lessons/:id/notes', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const data = db.getFallbackData();
    const notes = (data.lesson_notes || [])
      .filter(n => n.lesson_id === id && n.user_id === req.user.id && !n.is_bookmark)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.json({ success: true, count: notes.length, data: notes });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve notes.' });
  }
});

// POST /api/curriculum/lessons/:id/notes (Add Note)
router.post('/lessons/:id/notes', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, timestamp_seconds = 0 } = req.body;
    if (!content || !String(content).trim()) {
      return res.status(400).json({ success: false, message: 'Note content is required.' });
    }

    const data = db.getFallbackData();
    const lesson = (data.lessons || []).find(l => l.id === id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found.' });
    }

    if (!data.lesson_notes) data.lesson_notes = [];

    const newNote = {
      id: 'note-' + Date.now(),
      user_id: req.user.id,
      lesson_id: id,
      course_id: lesson.course_id,
      content: String(content).trim(),
      timestamp_seconds: Number(timestamp_seconds) || 0,
      is_bookmark: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    data.lesson_notes.push(newNote);
    db.saveFallbackData();

    return res.status(201).json({ success: true, message: 'Personal note saved.', data: newNote });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to save note.' });
  }
});

// DELETE /api/curriculum/lessons/:id/notes/:noteId
router.delete('/lessons/:id/notes/:noteId', authenticateToken, async (req, res) => {
  try {
    const { noteId } = req.params;
    const data = db.getFallbackData();
    if (!data.lesson_notes) data.lesson_notes = [];

    const existingIdx = data.lesson_notes.findIndex(n => n.id === noteId && n.user_id === req.user.id);
    if (existingIdx === -1) {
      return res.status(404).json({ success: false, message: 'Note not found or permission denied.' });
    }

    data.lesson_notes.splice(existingIdx, 1);
    db.saveFallbackData();

    return res.json({ success: true, message: 'Note deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete note.' });
  }
});

// POST /api/curriculum/lessons/:id/bookmark (Toggle Bookmark)
router.post('/lessons/:id/bookmark', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const data = db.getFallbackData();
    const lesson = (data.lessons || []).find(l => l.id === id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found.' });
    }

    if (!data.lesson_notes) data.lesson_notes = [];

    const existingIdx = data.lesson_notes.findIndex(
      n => n.lesson_id === id && n.user_id === req.user.id && n.is_bookmark
    );

    let isBookmarked = false;
    if (existingIdx >= 0) {
      // Remove bookmark
      data.lesson_notes.splice(existingIdx, 1);
      isBookmarked = false;
    } else {
      // Add bookmark
      data.lesson_notes.push({
        id: 'bm-' + Date.now(),
        user_id: req.user.id,
        lesson_id: id,
        course_id: lesson.course_id,
        content: `Bookmark: ${lesson.title}`,
        timestamp_seconds: 0,
        is_bookmark: true,
        created_at: new Date().toISOString()
      });
      isBookmarked = true;
    }

    db.saveFallbackData();
    return res.json({
      success: true,
      is_bookmarked: isBookmarked,
      message: isBookmarked ? 'Lesson bookmarked.' : 'Bookmark removed.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to toggle bookmark.' });
  }
});

// GET /api/curriculum/user/bookmarks (All bookmarks for user)
router.get('/user/bookmarks', authenticateToken, async (req, res) => {
  try {
    const data = db.getFallbackData();
    const bookmarks = (data.lesson_notes || [])
      .filter(n => n.user_id === req.user.id && n.is_bookmark)
      .map(bm => {
        const lesson = (data.lessons || []).find(l => l.id === bm.lesson_id);
        const course = (data.courses || []).find(c => c.id === bm.course_id);
        return {
          ...bm,
          lesson_title: lesson ? lesson.title : 'Lesson',
          lesson_type: lesson ? lesson.content_type : 'video',
          course_title: course ? course.title : 'Course'
        };
      });

    return res.json({ success: true, count: bookmarks.length, data: bookmarks });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve bookmarks.' });
  }
});

// DELETE /api/curriculum/lessons/:id
router.delete('/lessons/:id', authenticateToken, requireRoles('super_admin', 'institution_admin', 'instructor'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = db.getFallbackData();
    data.lessons = (data.lessons || []).filter(l => l.id !== id);
    data.learning_materials = (data.learning_materials || []).filter(m => m.lesson_id !== id);
    db.saveFallbackData();

    return res.json({ success: true, message: 'Lesson deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete lesson.' });
  }
});

// GET /api/curriculum/materials/:id/download & /api/curriculum/materials/:id/view
const materialsRoutes = require('./materials.routes');
router.use('/materials', materialsRoutes);

module.exports = router;
