const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { requireRoles } = require('../middleware/rbac');
const { checkStudentQuota } = require('../middleware/subscriptionQuota');

// GET /api/enrolments (List enrolments for user or institution)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const data = db.getFallbackData();
    let enrolments = [...(data.enrolments || [])];

    if (req.user.role === 'student') {
      enrolments = enrolments.filter(e => e.user_id === req.user.id);
    } else if (req.user.role === 'instructor') {
      const myCourseIds = (data.courses || []).filter(c => c.instructor_id === req.user.id).map(c => c.id);
      enrolments = enrolments.filter(e => myCourseIds.includes(e.course_id));
    } else if (req.user.role === 'institution_admin') {
      enrolments = enrolments.filter(e => e.organization_id === req.user.organization_id);
    }

    const detailed = enrolments.map(e => {
      const course = (data.courses || []).find(c => c.id === e.course_id);
      const student = (data.users || []).find(u => u.id === e.user_id);
      const isExpired = Boolean(e.access_expiry_date && new Date(e.access_expiry_date) < new Date());
      return {
        ...e,
        is_expired: isExpired,
        status: isExpired && e.status === 'active' ? 'expired' : e.status,
        course_title: course ? course.title : 'Course',
        course_thumbnail: course ? course.thumbnail_url : null,
        student_name: student ? student.name : 'Student',
        student_email: student ? student.email : ''
      };
    });

    return res.json({ success: true, count: detailed.length, data: detailed });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve enrolments.' });
  }
});

// POST /api/enrolments/self (Student self-enrolment)
router.post('/self', authenticateToken, async (req, res) => {
  try {
    const { course_id } = req.body;
    if (!course_id) {
      return res.status(400).json({ success: false, message: 'Course ID is required.' });
    }

    const data = db.getFallbackData();
    const course = (data.courses || []).find(c => c.id === course_id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    if (course.status !== 'published') {
      return res.status(400).json({ success: false, message: 'Cannot enrol in an unpublished or draft course.' });
    }

    if (course.visibility === 'restricted' && req.user.role === 'student') {
      return res.status(403).json({ success: false, message: 'This course is restricted to invitation-only access.' });
    }

    // Duplicate check
    const existing = (data.enrolments || []).find(
      e => e.course_id === course_id && e.user_id === req.user.id
    );
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'You are already enrolled in this course.',
        data: existing
      });
    }

    const newEnrolment = {
      id: 'enr-' + Date.now(),
      organization_id: course.organization_id || req.user.organization_id || 'org-apex-01',
      user_id: req.user.id,
      course_id,
      enrolment_type: 'self',
      status: 'active',
      access_start_date: new Date().toISOString().split('T')[0],
      access_expiry_date: null,
      completed_at: null,
      progress_percentage: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    data.enrolments.push(newEnrolment);

    // Send enrolment notification
    data.notifications.push({
      id: 'notif-' + Date.now(),
      user_id: req.user.id,
      organization_id: newEnrolment.organization_id,
      title: 'Enrolment Confirmed',
      message: `You have successfully enrolled in ${course.title}. Start your first lesson now!`,
      type: 'enrolment',
      action_url: `/courses/${course.id}`,
      is_read: false,
      email_sent: true,
      created_at: new Date().toISOString()
    });

    db.saveFallbackData();

    return res.status(201).json({
      success: true,
      message: 'Successfully enrolled in course!',
      data: newEnrolment
    });
  } catch (err) {
    console.error('[Self Enrol Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to process enrolment.' });
  }
});

// POST /api/enrolments/manual (Admin manual enrolment)
router.post('/manual', authenticateToken, requireRoles('super_admin', 'institution_admin', 'instructor'), async (req, res) => {
  try {
    const { student_id, course_id, expiry_date = null } = req.body;
    if (!student_id || !course_id) {
      return res.status(400).json({ success: false, message: 'Student ID and Course ID are required.' });
    }

    const data = db.getFallbackData();
    const existing = (data.enrolments || []).find(e => e.course_id === course_id && e.user_id === student_id);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Student is already enrolled.' });
    }

    const course = (data.courses || []).find(c => c.id === course_id);
    const newEnrolment = {
      id: 'enr-' + Date.now(),
      organization_id: course ? course.organization_id : (req.user.organization_id || 'org-apex-01'),
      user_id: student_id,
      course_id,
      enrolment_type: 'manual',
      status: 'active',
      access_start_date: new Date().toISOString().split('T')[0],
      access_expiry_date: expiry_date,
      completed_at: null,
      progress_percentage: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    data.enrolments.push(newEnrolment);
    db.saveFallbackData();

    return res.status(201).json({ success: true, message: 'Student enrolled successfully.', data: newEnrolment });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to manually enrol student.' });
  }
});

// POST /api/enrolments/bulk-import (CSV Bulk student import and enrolment)
router.post('/bulk-import', authenticateToken, requireRoles('super_admin', 'institution_admin', 'faculty', 'instructor', 'admin'), async (req, res) => {
  try {
    const rawCsv = req.body.csv_data || req.body.csv_text || req.body.csv;
    const courseId = req.body.course_id || 'course-cloud-01';

    if (!rawCsv) {
      return res.status(400).json({ success: false, message: 'CSV data text is required.' });
    }

    const data = db.getFallbackData();
    const course = (data.courses || []).find(c => c.id === courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // Parse CSV rows: expected format "name,email,roll_number" or "name,email"
    const lines = rawCsv.replace(/\r/g, '').trim().split('\n');
    let importedCount = 0;
    let skippedCount = 0;
    const importedList = [];
    const skippedList = [];

    const bcrypt = require('bcryptjs');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // Skip header
      if (line.toLowerCase().startsWith('name,') || line.toLowerCase().startsWith('student name')) continue;

      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const name = parts[0];
        const email = parts[1].toLowerCase();
        const rollNo = (parts[2] || `24CS${100 + i}`).toUpperCase();

        if (!email.includes('@')) continue;

        // Check if user exists, else create student account
        let user = (data.users || []).find(u => u.email.toLowerCase() === email);
        if (!user) {
          const defaultPassword = rollNo || 'Student@123';
          user = {
            id: 'user-' + Date.now() + Math.floor(Math.random() * 1000),
            organization_id: req.user.organization_id || course.organization_id || 'org-apex-01',
            department_id: 'dept-cse-01',
            role: 'student',
            name,
            email,
            password_hash: bcrypt.hashSync(defaultPassword, 10),
            avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop',
            status: 'active',
            email_verified: true,
            created_at: new Date().toISOString()
          };
          data.users.push(user);

          // Add student profile
          if (!data.student_profiles) data.student_profiles = [];
          data.student_profiles.push({
            id: 'prof-' + Date.now() + Math.floor(Math.random() * 1000),
            user_id: user.id,
            roll_no: rollNo,
            register_no: rollNo,
            batch_id: 'batch-cse-4a',
            admission_year: new Date().getFullYear(),
            status: 'active',
            created_at: new Date().toISOString()
          });
        }

        // Check duplicate enrolment
        const isEnrolled = (data.enrolments || []).some(e => e.course_id === courseId && e.user_id === user.id);
        if (!isEnrolled) {
          data.enrolments.push({
            id: 'enr-' + Date.now() + Math.floor(Math.random() * 1000),
            organization_id: course.organization_id,
            user_id: user.id,
            course_id: courseId,
            enrolment_type: 'bulk',
            status: 'active',
            access_start_date: new Date().toISOString().split('T')[0],
            access_expiry_date: null,
            completed_at: null,
            progress_percentage: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          importedCount++;
          importedList.push({ name, email, roll_no: rollNo });
        } else {
          skippedCount++;
          skippedList.push({ name, email, roll_no: rollNo, reason: 'Already enrolled' });
        }
      }
    }

    db.saveFallbackData();
    return res.json({
      success: true,
      message: `Bulk import completed. Successfully enrolled ${importedCount} student(s) (${skippedCount} duplicates skipped).`,
      importedCount,
      skippedCount,
      imported: importedList,
      duplicates: skippedList
    });
  } catch (err) {
    console.error('[Bulk Import Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to process bulk import.' });
  }
});

// PUT /api/enrolments/:id/status (Revoke / Expire / Activate access)
router.put('/:id/status', authenticateToken, requireRoles('super_admin', 'institution_admin', 'instructor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['active', 'revoked', 'expired', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid enrolment status.' });
    }

    const data = db.getFallbackData();
    const enrolment = (data.enrolments || []).find(e => e.id === id);
    if (!enrolment) {
      return res.status(404).json({ success: false, message: 'Enrolment not found.' });
    }

    enrolment.status = status;
    enrolment.updated_at = new Date().toISOString();
    db.saveFallbackData();

    return res.json({ success: true, message: `Enrolment marked as ${status}.`, data: enrolment });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update enrolment status.' });
  }
});

// PUT /api/enrolments/:id/expiry (Set or extend access expiry date)
router.put('/:id/expiry', authenticateToken, requireRoles('super_admin', 'institution_admin', 'instructor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { access_expiry_date } = req.body;
    const data = db.getFallbackData();
    const enrolment = (data.enrolments || []).find(e => e.id === id);

    if (!enrolment) {
      return res.status(404).json({ success: false, message: 'Enrolment not found.' });
    }

    enrolment.access_expiry_date = access_expiry_date || null;
    if (access_expiry_date && new Date(access_expiry_date) < new Date()) {
      enrolment.status = 'expired';
    } else if (enrolment.status === 'expired') {
      enrolment.status = 'active';
    }
    enrolment.updated_at = new Date().toISOString();
    db.saveFallbackData();

    return res.json({
      success: true,
      message: `Enrolment expiry date set to ${access_expiry_date || 'No Expiry (Perpetual)'}.`,
      data: enrolment
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update expiry date.' });
  }
});

// PUT /api/enrolments/:id/revoke (Revoke course access immediately)
router.put('/:id/revoke', authenticateToken, requireRoles('super_admin', 'institution_admin', 'instructor'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = db.getFallbackData();
    const enrolment = (data.enrolments || []).find(e => e.id === id);

    if (!enrolment) {
      return res.status(404).json({ success: false, message: 'Enrolment not found.' });
    }

    enrolment.status = 'revoked';
    enrolment.updated_at = new Date().toISOString();
    db.saveFallbackData();

    return res.json({ success: true, message: 'Course access revoked.', data: enrolment });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to revoke enrolment.' });
  }
});

// PUT /api/enrolments/:id/restore (Restore active course access)
router.put('/:id/restore', authenticateToken, requireRoles('super_admin', 'institution_admin', 'instructor'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = db.getFallbackData();
    const enrolment = (data.enrolments || []).find(e => e.id === id);

    if (!enrolment) {
      return res.status(404).json({ success: false, message: 'Enrolment not found.' });
    }

    enrolment.status = 'active';
    enrolment.updated_at = new Date().toISOString();
    db.saveFallbackData();

    return res.json({ success: true, message: 'Course access restored to active.', data: enrolment });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to restore enrolment.' });
  }
});

module.exports = router;
