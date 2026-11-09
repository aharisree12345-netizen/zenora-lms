const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { requireRoles } = require('../middleware/rbac');
const { checkCourseQuota } = require('../middleware/subscriptionQuota');

// GET /api/courses (Public / Authenticated catalog)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, search, difficulty, status } = req.query;
    const data = db.getFallbackData();
    let courses = [...(data.courses || [])];

    // Filter by status: If unauthenticated or student, only show published courses
    if (!req.user || req.user.role === 'student') {
      courses = courses.filter(c => c.status === 'published' && (!c.visibility || c.visibility === 'public'));
    } else if (req.user.role === 'instructor' || req.user.role === 'faculty') {
      // Instructors and faculty see their own courses (any status) plus all published courses
      courses = courses.filter(c => c.instructor_id === req.user.id || (c.status === 'published' && (!c.visibility || c.visibility === 'public')));
    } else if (req.user.role === 'institution_admin' || req.user.role === 'super_admin') {
      if (req.user.role === 'institution_admin' && req.user.organization_id) {
        courses = courses.filter(c => c.organization_id === req.user.organization_id || c.status === 'published');
      }
    }

    if (category) {
      courses = courses.filter(c => c.category_id === category);
    }

    if (difficulty) {
      courses = courses.filter(c => c.difficulty_level === difficulty);
    }

    if (status && (req.user && ['super_admin', 'institution_admin', 'instructor'].includes(req.user.role))) {
      courses = courses.filter(c => c.status === status);
    }

    if (search) {
      const q = search.toLowerCase().trim();
      courses = courses.filter(c => 
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.subtitle && c.subtitle.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q))
      );
    }

    // Attach instructor information, category, and enrolment status
    const result = courses.map(course => {
      const instructor = (data.users || []).find(u => u.id === course.instructor_id);
      const cat = (data.course_categories || []).find(c => c.id === course.category_id);
      const sections = (data.course_sections || []).filter(s => s.course_id === course.id);
      const lessons = (data.lessons || []).filter(l => l.course_id === course.id);
      
      let isEnrolled = false;
      let userProgress = 0;
      if (req.user) {
        const enrolment = (data.enrolments || []).find(e => e.course_id === course.id && e.user_id === req.user.id);
        if (enrolment) {
          isEnrolled = true;
          userProgress = enrolment.progress_percentage || 0;
        }
      }

      return {
        ...course,
        price: 0,
        is_free: 1,
        institutional_access: true,
        instructor_name: instructor ? instructor.name : 'Zenora Faculty',
        instructor_avatar: instructor ? instructor.avatar_url : null,
        category_name: cat ? cat.name : 'General',
        total_sections: sections.length,
        total_lessons: lessons.length,
        is_enrolled: isEnrolled,
        user_progress: userProgress
      };
    });

    return res.json({ success: true, count: result.length, data: result });
  } catch (err) {
    console.error('[Get Courses Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve courses.' });
  }
});

// GET /api/courses/meta/categories & /api/courses/categories
const handleGetCategories = async (req, res) => {
  try {
    const data = db.getFallbackData();
    return res.json({ success: true, data: data.course_categories || [] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load categories.' });
  }
};

router.get('/meta/categories', handleGetCategories);
router.get('/categories', handleGetCategories);

// GET /api/courses/:id (Course Detail with curriculum & enrolment status)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const isStudentPreview = req.query.preview === 'student';
    const data = db.getFallbackData();
    const course = (data.courses || []).find(c => c.id === id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const isStaff = req.user && ['super_admin', 'institution_admin', 'instructor', 'faculty'].includes(req.user.role);

    // If draft course: only accessible by staff or staff in preview mode
    if (course.status === 'draft' && !isStaff) {
      return res.status(403).json({ success: false, message: 'This course is currently in draft status and not yet published.' });
    }

    const instructor = (data.users || []).find(u => u.id === course.instructor_id);
    const cat = (data.course_categories || []).find(c => c.id === course.category_id);
    const sections = (data.course_sections || [])
      .filter(s => s.course_id === id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    let enrolment = null;
    if (req.user) {
      enrolment = (data.enrolments || []).find(e => e.course_id === id && e.user_id === req.user.id);
      // Academic LMS: Auto-enrol student if accessing published course
      if (!enrolment && req.user.role === 'student' && course.status === 'published') {
        enrolment = {
          id: 'enr-' + Date.now(),
          organization_id: course.organization_id || req.user.organization_id || 'org-apex-01',
          user_id: req.user.id,
          course_id: id,
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

    // In student preview mode or active enrollment, allow progression
    const isEnrolled = isStudentPreview ? true : !!enrolment;

    // Collect all lessons across sections in sequential curriculum order
    const allSequentialLessons = [];
    sections.forEach(sec => {
      const secLessons = (data.lessons || [])
        .filter(l => l.section_id === sec.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      secLessons.forEach(l => allSequentialLessons.push(l));
    });

    // Determine completion status for each lesson
    const completionMap = {};
    allSequentialLessons.forEach(l => {
      let isCompleted = false;
      if (enrolment) {
        const prog = (data.lesson_progress || []).find(p => p.enrolment_id === enrolment.id && p.lesson_id === l.id);
        isCompleted = prog ? Boolean(prog.is_completed) : false;
      }
      completionMap[l.id] = isCompleted;
    });

    // Populate lessons within sections with materials and access
    let lastMandatoryCompleted = true; // First lesson is never blocked by prerequisite
    const detailedSections = sections.map(sec => {
      const secLessons = (data.lessons || [])
        .filter(l => l.section_id === sec.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map(lesson => {
          const isCompleted = completionMap[lesson.id] || false;
          const lessonIndex = allSequentialLessons.findIndex(l => l.id === lesson.id);
          const prevLesson = lessonIndex > 0 ? allSequentialLessons[lessonIndex - 1] : null;

          // Prerequisite rule: Sequential lessons are locked if prior lesson is not complete
          let isLocked = false;
          let lockReason = null;

          if (lessonIndex > 0 && prevLesson && !completionMap[prevLesson.id] && !lesson.is_preview) {
            isLocked = true;
            lockReason = `Prerequisite Required: Complete previous lesson "${prevLesson.title}" to unlock.`;
          }

          const effectiveLocked = (isStaff && !isStudentPreview) ? false : isLocked;
          const canAccess = (isStaff && !isStudentPreview) || ((isEnrolled || lesson.is_preview) && !effectiveLocked);

          // Find attached learning materials for this lesson
          const lessonMaterials = (data.learning_materials || [])
            .filter(m => m.lesson_id === lesson.id)
            .map(m => ({
              ...m,
              download_url: `/api/materials/${m.id}/download`,
              view_url: `/api/materials/${m.id}/view`
            }));

          return {
            id: lesson.id,
            section_id: lesson.section_id,
            title: lesson.title,
            description: lesson.description,
            content_type: lesson.content_type,
            duration_minutes: lesson.duration_minutes,
            is_preview: lesson.is_preview,
            is_mandatory: lesson.is_mandatory !== false,
            sort_order: lesson.sort_order,
            is_completed: isCompleted,
            is_locked: effectiveLocked,
            lock_reason: effectiveLocked ? lockReason : null,
            can_access: canAccess,
            content_url: canAccess ? lesson.content_url : null,
            content_body: canAccess ? lesson.content_body : null,
            materials: lessonMaterials
          };
        });

      return {
        ...sec,
        lessons: secLessons
      };
    });

    const quizzes = (data.quizzes || []).filter(q => q.course_id === id);
    const assignments = (data.assignments || []).filter(a => a.course_id === id);

    let certificate = null;
    if (req.user) {
      certificate = (data.certificates || []).find(c => c.course_id === id && c.user_id === req.user.id) || null;
    }

    return res.json({
      success: true,
      data: {
        ...course,
        price: 0,
        is_free: 1,
        institutional_access: true,
        instructor: {
          id: instructor ? instructor.id : null,
          name: instructor ? instructor.name : 'Instructor',
          avatar_url: instructor ? instructor.avatar_url : null,
          bio: instructor ? instructor.bio : null
        },
        category_name: cat ? cat.name : 'General',
        sections: detailedSections,
        quizzes_count: quizzes.length,
        assignments_count: assignments.length,
        is_enrolled: isEnrolled,
        enrolment_details: enrolment,
        certificate: certificate,
        student_preview_mode: isStudentPreview
      }
    });
  } catch (err) {
    console.error('[Get Course Detail Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to load course details.' });
  }
});

// GET /api/courses/:id/curriculum (Full section & lesson hierarchy)
router.get('/:id/curriculum', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const data = db.getFallbackData();
    const course = (data.courses || []).find(c => c.id === id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const sections = (data.course_sections || [])
      .filter(s => s.course_id === id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(sec => {
        const lessons = (data.lessons || [])
          .filter(l => l.section_id === sec.id)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        return {
          ...sec,
          lessons
        };
      });

    return res.json({
      success: true,
      course_id: id,
      course_title: course.title,
      data: sections
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve curriculum.' });
  }
});

// POST /api/courses (Create Course)
router.post('/', authenticateToken, requireRoles('super_admin', 'institution_admin', 'instructor'), async (req, res) => {
  try {
    const {
      title,
      subtitle,
      description,
      category_id,
      difficulty_level = 'all_levels',
      estimated_duration_hours = 10,
      language = 'English',
      price = 0,
      is_free = true,
      thumbnail_url,
      enrolment_mode = 'open',
      prerequisites = '',
      learning_objectives = []
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Course title is required.' });
    }

    const orgId = req.user.organization_id || 'org-apex-01';
    const quota = await checkCourseQuota(orgId);
    if (!quota.allowed) {
      return res.status(403).json({ success: false, message: quota.message });
    }

    const data = db.getFallbackData();
    const newCourse = {
      id: 'course-' + Date.now(),
      organization_id: orgId,
      instructor_id: req.user.id,
      category_id: category_id || (data.course_categories[0] ? data.course_categories[0].id : null),
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      subtitle: subtitle || '',
      description: description || '',
      thumbnail_url: thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=350&fit=crop',
      difficulty_level,
      estimated_duration_hours: Number(estimated_duration_hours),
      language,
      status: 'draft',
      visibility: 'public',
      price: Number(price),
      is_free: Boolean(is_free),
      enrolment_mode,
      prerequisites,
      learning_objectives: JSON.stringify(learning_objectives),
      start_date: new Date().toISOString().split('T')[0],
      end_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    data.courses.push(newCourse);
    db.saveFallbackData();

    return res.status(201).json({
      success: true,
      message: 'Course draft created successfully.',
      data: newCourse
    });
  } catch (err) {
    console.error('[Create Course Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to create course.' });
  }
});

// PUT /api/courses/:id (Update Course)
router.put('/:id', authenticateToken, requireRoles('super_admin', 'institution_admin', 'instructor'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = db.getFallbackData();
    const courseIndex = (data.courses || []).findIndex(c => c.id === id);

    if (courseIndex === -1) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const existing = data.courses[courseIndex];
    if (req.user.role === 'instructor' && existing.instructor_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only edit courses you authored.' });
    }

    const updated = {
      ...existing,
      ...req.body,
      updated_at: new Date().toISOString()
    };

    data.courses[courseIndex] = updated;
    db.saveFallbackData();

    return res.json({ success: true, message: 'Course updated successfully.', data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update course.' });
  }
});

// POST /api/courses/:id/publish (Publish Course after validation)
router.post('/:id/publish', authenticateToken, requireRoles('super_admin', 'institution_admin', 'instructor'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = db.getFallbackData();
    const course = (data.courses || []).find(c => c.id === id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // Validation rule: Must have at least one section and one lesson to publish
    const sections = (data.course_sections || []).filter(s => s.course_id === id);
    const lessons = (data.lessons || []).filter(l => l.course_id === id);

    if (sections.length === 0 || lessons.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish course without curriculum. Please add at least one section and one lesson.'
      });
    }

    course.status = 'published';
    course.updated_at = new Date().toISOString();
    db.saveFallbackData();

    return res.json({ success: true, message: 'Course published successfully and is now active.', data: course });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to publish course.' });
  }
});

// POST /api/courses/:id/archive
router.post('/:id/archive', authenticateToken, requireRoles('super_admin', 'institution_admin', 'instructor'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = db.getFallbackData();
    const course = (data.courses || []).find(c => c.id === id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    course.status = 'archived';
    course.updated_at = new Date().toISOString();
    db.saveFallbackData();

    return res.json({ success: true, message: 'Course archived successfully.', data: course });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to archive course.' });
  }
});

// POST /api/courses/:id/duplicate (Duplicate Course)
router.post('/:id/duplicate', authenticateToken, requireRoles('super_admin', 'institution_admin', 'instructor'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = db.getFallbackData();
    const source = (data.courses || []).find(c => c.id === id);

    if (!source) {
      return res.status(404).json({ success: false, message: 'Source course not found.' });
    }

    const orgId = source.organization_id || req.user.organization_id || 'org-apex-01';
    const quota = await checkCourseQuota(orgId);
    if (!quota.allowed) {
      return res.status(403).json({ success: false, message: quota.message });
    }

    const newCourseId = 'course-' + Date.now();
    const clonedCourse = {
      ...source,
      id: newCourseId,
      title: `${source.title} (Copy)`,
      slug: `${source.slug}-copy-${Date.now()}`,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    data.courses.push(clonedCourse);

    // Deep duplicate sections, lessons, and learning materials
    const sourceSections = (data.course_sections || []).filter(s => s.course_id === id);
    for (const sec of sourceSections) {
      const newSecId = 'sec-' + Date.now() + Math.floor(Math.random() * 1000);
      data.course_sections.push({
        ...sec,
        id: newSecId,
        course_id: newCourseId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      const sourceLessons = (data.lessons || []).filter(l => l.section_id === sec.id);
      for (const les of sourceLessons) {
        const newLesId = 'les-' + Date.now() + Math.floor(Math.random() * 1000);
        data.lessons.push({
          ...les,
          id: newLesId,
          course_id: newCourseId,
          section_id: newSecId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        // Clone learning materials for each lesson
        const sourceMaterials = (data.learning_materials || []).filter(m => m.lesson_id === les.id);
        for (const mat of sourceMaterials) {
          data.learning_materials.push({
            ...mat,
            id: 'mat-' + Date.now() + Math.floor(Math.random() * 1000),
            lesson_id: newLesId,
            created_at: new Date().toISOString()
          });
        }
      }
    }

    db.saveFallbackData();
    return res.status(201).json({
      success: true,
      message: `Course "${source.title}" duplicated successfully into a draft copy with all modules and materials.`,
      data: clonedCourse
    });
  } catch (err) {
    console.error('[Duplicate Course Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to duplicate course.' });
  }
});

// DELETE /api/courses/:id
router.delete('/:id', authenticateToken, requireRoles('super_admin', 'institution_admin', 'instructor'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = db.getFallbackData();
    const course = (data.courses || []).find(c => c.id === id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    data.courses = data.courses.filter(c => c.id !== id);
    data.course_sections = (data.course_sections || []).filter(s => s.course_id !== id);
    data.lessons = (data.lessons || []).filter(l => l.course_id !== id);
    db.saveFallbackData();

    return res.json({ success: true, message: 'Course deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete course.' });
  }
});

module.exports = router;
