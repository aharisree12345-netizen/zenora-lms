const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { optionalAuth, authenticateToken } = require('../middleware/auth');

// GET /api/announcements
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { department_id, department, semester, batch_id, priority } = req.query;
    const user = req.user;
    const data = db.getFallbackData();
    let announcements = data.academic_announcements || [];

    // When a student logs in, filter notice board items strictly based on the student's department and semester
    if (user && user.role === 'student' && !department && !semester) {
      const studentProfile = (data.student_profiles || []).find(p => p.user_id === user.id);
      const studentDeptCode = studentProfile?.department || ((data.departments || []).find(d => d.id === user.department_id)?.code) || 'CS';
      const studentSem = studentProfile?.current_semester || 4;

      announcements = announcements.filter(a => {
        const aDept = a.target_department || (a.department_id ? (data.departments || []).find(d => d.id === a.department_id)?.code : 'ALL');
        const aSem = a.target_semester || (a.batch_id ? (data.batches || []).find(b => b.id === a.batch_id)?.semester : 'ALL');

        const matchesDept = !aDept || aDept === 'ALL' || aDept === studentDeptCode || a.department_id === user.department_id;
        const matchesSem = !aSem || aSem === 'ALL' || String(aSem).replace(/^S/i, '') === String(studentSem) || a.batch_id === studentProfile?.batch_id;
        return matchesDept && matchesSem;
      });
    } else {
      if (department && department !== 'all' && department !== 'ALL') {
        const deptUpper = String(department).toUpperCase();
        announcements = announcements.filter(a => {
          const aDept = a.target_department || (a.department_id ? (data.departments || []).find(d => d.id === a.department_id)?.code : 'ALL');
          return aDept === 'ALL' || aDept === deptUpper || a.department_id === department;
        });
      }
      if (semester && semester !== 'all' && semester !== 'ALL') {
        const semClean = String(semester).replace(/^S/i, '');
        announcements = announcements.filter(a => {
          const aSem = a.target_semester || (a.batch_id ? (data.batches || []).find(b => b.id === a.batch_id)?.semester : 'ALL');
          return aSem === 'ALL' || String(aSem).replace(/^S/i, '') === semClean;
        });
      }
      if (batch_id && batch_id !== 'all') {
        announcements = announcements.filter(a => !a.batch_id || a.batch_id === batch_id);
      }
    }

    if (priority && priority !== 'all') {
      const targetPrio = priority.toLowerCase().includes('imp') ? 'important' : 'normal';
      announcements = announcements.filter(a => {
        const itemPrio = (a.priority || 'normal').toLowerCase();
        if (targetPrio === 'important') {
          return itemPrio === 'important' || itemPrio === 'high' || itemPrio === 'urgent';
        }
        return itemPrio === 'normal';
      });
    }

    const enriched = announcements.map(a => {
      const author = (data.users || []).find(u => u.id === a.posted_by);
      const dept = (data.departments || []).find(d => d.id === a.department_id || d.code === a.target_department);
      const batch = (data.batches || []).find(b => b.id === a.batch_id);
      const sub = (data.subjects || []).find(s => s.id === a.subject_id);

      const rawPrio = (a.priority || 'normal').toLowerCase();
      const normalizedPriority = rawPrio.includes('imp') || rawPrio === 'high' || rawPrio === 'urgent' ? 'important' : 'normal';

      return {
        ...a,
        priority: normalizedPriority,
        target_department: a.target_department || (dept ? dept.code : 'ALL'),
        target_semester: a.target_semester || (batch ? String(batch.semester) : 'ALL'),
        date: a.date || (a.created_at ? a.created_at.split('T')[0] : '2026-10-20'),
        author_name: author ? author.name : 'College Administration',
        author_designation: author ? author.designation : 'Staff',
        department_name: dept ? dept.name : (a.target_department === 'ALL' ? 'All Departments' : a.target_department),
        department_code: dept ? dept.code : (a.target_department || 'ALL'),
        batch_name: batch ? batch.name : null,
        subject_name: sub ? sub.name : null
      };
    });

    enriched.sort((a, b) => {
      if (a.priority === 'important' && b.priority !== 'important') return -1;
      if (b.priority === 'important' && a.priority !== 'important') return 1;
      return new Date(b.created_at || b.date) - new Date(a.created_at || a.date);
    });

    return res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    console.error('[Announcements GET Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch announcements.' });
  }
});

// POST /api/announcements
router.post('/', authenticateToken, async (req, res) => {
  try {
    const isStaff = ['super_admin', 'institution_admin', 'faculty', 'instructor'].includes(req.user.role);
    if (!isStaff) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only faculty members and college administrators can issue notices.'
      });
    }

    const {
      title,
      content,
      priority = 'normal',
      target_department = 'ALL',
      target_semester = 'ALL',
      target_type = 'college',
      department_id,
      batch_id,
      subject_id,
      date
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Notice Title and Announcement Content are required.' });
    }

    const data = db.getFallbackData();
    if (!data.academic_announcements) data.academic_announcements = [];

    const rawPrio = String(priority || 'normal').toLowerCase();
    const normalizedPriority = rawPrio.includes('imp') || rawPrio === 'high' || rawPrio === 'urgent' ? 'important' : 'normal';

    const newAnc = {
      id: 'anc-' + Date.now(),
      title: title.trim(),
      content: content.trim(),
      priority: normalizedPriority,
      target_department: target_department || 'ALL',
      target_semester: target_semester || 'ALL',
      date: date || new Date().toISOString().split('T')[0],
      target_type: target_department !== 'ALL' ? 'department' : (target_type || 'college'),
      department_id: department_id || (target_department !== 'ALL' ? `dept-${String(target_department).toLowerCase()}` : null),
      batch_id: batch_id || null,
      subject_id: subject_id || null,
      posted_by: req.user.id,
      created_at: new Date().toISOString()
    };

    data.academic_announcements.unshift(newAnc);
    db.saveFallbackData();

    return res.status(201).json({
      success: true,
      message: 'Official academic circular published successfully to the Notice Board.',
      data: newAnc
    });
  } catch (err) {
    console.error('[Announcements POST Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to post announcement.' });
  }
});

// PUT /api/announcements/:id (Edit Notice - Faculty & Admin)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const isStaff = ['super_admin', 'institution_admin', 'faculty', 'instructor', 'admin'].includes(req.user.role);
    if (!isStaff) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only faculty members and administrators can modify notices.'
      });
    }

    const { id } = req.params;
    const {
      title,
      content,
      priority,
      target_department,
      target_semester,
      department_id,
      date
    } = req.body;

    const data = db.getFallbackData();
    const notice = (data.academic_announcements || []).find(a => a.id === id);

    if (!notice) {
      return res.status(404).json({ success: false, message: 'Academic notice not found.' });
    }

    if (title) notice.title = title.trim();
    if (content) notice.content = content.trim();
    if (priority) {
      const rawPrio = String(priority).toLowerCase();
      notice.priority = rawPrio.includes('imp') || rawPrio === 'high' || rawPrio === 'urgent' ? 'important' : 'normal';
    }
    if (target_department !== undefined) notice.target_department = target_department || 'ALL';
    if (target_semester !== undefined) notice.target_semester = target_semester || 'ALL';
    if (department_id !== undefined) notice.department_id = department_id;
    if (date) notice.date = date;
    notice.updated_at = new Date().toISOString();

    db.saveFallbackData();

    // MySQL sync if available
    const pool = db.getPool();
    if (pool) {
      try {
        await pool.query(
          `UPDATE announcements SET title = ?, content = ?, priority = ?, updated_at = NOW() WHERE id = ?`,
          [notice.title, notice.content, notice.priority, id]
        );
      } catch (dbErr) {
        console.warn('[MySQL Announcement Update Warning]', dbErr.message);
      }
    }

    return res.json({
      success: true,
      message: 'Official academic notice updated successfully.',
      data: notice
    });
  } catch (err) {
    console.error('[Announcements PUT Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update academic notice.' });
  }
});

// DELETE /api/announcements/:id (Delete Notice - Faculty & Admin)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const isStaff = ['super_admin', 'institution_admin', 'faculty', 'instructor', 'admin'].includes(req.user.role);
    if (!isStaff) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only faculty members and administrators can remove notices.'
      });
    }

    const { id } = req.params;
    const data = db.getFallbackData();
    const idx = (data.academic_announcements || []).findIndex(a => a.id === id);

    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Academic notice not found.' });
    }

    const [deleted] = data.academic_announcements.splice(idx, 1);
    db.saveFallbackData();

    // MySQL sync if available
    const pool = db.getPool();
    if (pool) {
      try {
        await pool.query(`DELETE FROM announcements WHERE id = ?`, [id]);
      } catch (dbErr) {
        console.warn('[MySQL Announcement Delete Warning]', dbErr.message);
      }
    }

    return res.json({
      success: true,
      message: `Notice "${deleted.title}" removed successfully from the Notice Board.`,
      deleted_id: id
    });
  } catch (err) {
    console.error('[Announcements DELETE Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to remove academic notice.' });
  }
});

module.exports = router;
