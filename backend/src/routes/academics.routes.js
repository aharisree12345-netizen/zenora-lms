const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// ==========================================
// 1. DEPARTMENTS
// ==========================================

// GET /api/academics/departments
router.get('/departments', async (req, res) => {
  try {
    const data = db.getFallbackData();
    const depts = (data.departments || []).map(dept => {
      const facultyCount = (data.users || []).filter(u => u.department_id === dept.id && u.role === 'faculty').length;
      const studentCount = (data.users || []).filter(u => u.department_id === dept.id && u.role === 'student').length;
      const batchCount = (data.batches || []).filter(b => b.department_id === dept.id).length;
      return {
        ...dept,
        facultyCount,
        studentCount,
        batchCount
      };
    });
    return res.json({ success: true, data: depts });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch departments.' });
  }
});

// POST /api/academics/departments
router.post('/departments', authenticateToken, async (req, res) => {
  try {
    const { name, code, hod_name, contact_email, description } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Department name and code are required.' });
    }

    const data = db.getFallbackData();
    const existing = (data.departments || []).find(d => d.code.toLowerCase() === code.toLowerCase());
    if (existing) {
      return res.status(409).json({ success: false, message: `Department code "${code}" already exists.` });
    }

    const newDept = {
      id: 'dept-' + code.toLowerCase() + '-' + Date.now().toString().slice(-4),
      name,
      code: code.toUpperCase(),
      hod_name: hod_name || '',
      contact_email: contact_email || '',
      description: description || '',
      created_at: new Date().toISOString()
    };

    data.departments.push(newDept);
    db.saveFallbackData();

    return res.status(201).json({ success: true, message: 'Department created successfully.', data: newDept });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create department.' });
  }
});

// ==========================================
// 2. ACADEMIC YEARS
// ==========================================

// GET /api/academics/academic-years
router.get('/academic-years', async (req, res) => {
  try {
    const data = db.getFallbackData();
    return res.json({ success: true, data: data.academic_years || [] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch academic years.' });
  }
});

// POST /api/academics/academic-years
router.post('/academic-years', authenticateToken, async (req, res) => {
  try {
    const { year_name, start_date, end_date, is_current = false } = req.body;
    if (!year_name) {
      return res.status(400).json({ success: false, message: 'Academic year name is required.' });
    }

    const data = db.getFallbackData();
    if (is_current) {
      data.academic_years.forEach(ay => { ay.is_current = false; });
    }

    const newYear = {
      id: 'ay-' + Date.now(),
      year_name,
      start_date: start_date || '2026-06-01',
      end_date: end_date || '2027-05-31',
      is_current: !!is_current,
      created_at: new Date().toISOString()
    };

    data.academic_years.push(newYear);
    db.saveFallbackData();

    return res.status(201).json({ success: true, message: 'Academic year created.', data: newYear });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create academic year.' });
  }
});

// ==========================================
// 3. BATCHES / CLASSES
// ==========================================

// GET /api/academics/batches
router.get('/batches', async (req, res) => {
  try {
    const { department_id, semester } = req.query;
    const data = db.getFallbackData();
    let batches = data.batches || [];

    if (department_id) {
      batches = batches.filter(b => b.department_id === department_id);
    }
    if (semester) {
      batches = batches.filter(b => b.semester === parseInt(semester, 10));
    }

    // Enrich with dept name, advisor name, student count
    const enriched = batches.map(b => {
      const dept = (data.departments || []).find(d => d.id === b.department_id);
      const advisor = (data.users || []).find(u => u.id === b.faculty_advisor_id);
      const studentCount = (data.student_profiles || []).filter(p => p.batch_id === b.id).length;
      return {
        ...b,
        department_name: dept ? dept.name : 'Unknown Department',
        department_code: dept ? dept.code : '',
        faculty_advisor_name: advisor ? advisor.name : 'Unassigned',
        studentCount
      };
    });

    return res.json({ success: true, data: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch batches.' });
  }
});

// POST /api/academics/batches
router.post('/batches', authenticateToken, async (req, res) => {
  try {
    const { department_id, academic_year_id, name, semester, section, shift = 'Regular', faculty_advisor_id } = req.body;
    if (!department_id || !name || !semester || !section) {
      return res.status(400).json({ success: false, message: 'Department, name, semester, and section are required.' });
    }

    const data = db.getFallbackData();
    const newBatch = {
      id: 'batch-' + Date.now(),
      department_id,
      academic_year_id: academic_year_id || 'ay-2025-2026',
      name,
      semester: parseInt(semester, 10),
      section: section.toUpperCase(),
      shift,
      faculty_advisor_id: faculty_advisor_id || null,
      created_at: new Date().toISOString()
    };

    data.batches.push(newBatch);
    db.saveFallbackData();

    return res.status(201).json({ success: true, message: 'Batch / Class created.', data: newBatch });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create batch.' });
  }
});

// ==========================================
// 4. SUBJECTS (CURRICULUM)
// ==========================================

// GET /api/academics/subjects
router.get('/subjects', async (req, res) => {
  try {
    const { department_id, semester } = req.query;
    const data = db.getFallbackData();
    let subjects = data.subjects || [];

    if (department_id) {
      subjects = subjects.filter(s => s.department_id === department_id);
    }
    if (semester) {
      subjects = subjects.filter(s => s.semester === parseInt(semester, 10));
    }

    // Enrich with department name and assigned faculty
    const enriched = subjects.map(s => {
      const dept = (data.departments || []).find(d => d.id === s.department_id);
      const assignments = (data.faculty_subject_assignments || []).filter(fsa => fsa.subject_id === s.id);
      const facultyList = assignments.map(a => {
        const fac = (data.users || []).find(u => u.id === a.faculty_id);
        const batch = (data.batches || []).find(b => b.id === a.batch_id);
        return {
          faculty_id: a.faculty_id,
          faculty_name: fac ? fac.name : 'Unknown',
          batch_id: a.batch_id,
          batch_name: batch ? batch.name : 'All Batches'
        };
      });

      return {
        ...s,
        department_name: dept ? dept.name : '',
        department_code: dept ? dept.code : '',
        faculty_assignments: facultyList
      };
    });

    return res.json({ success: true, data: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch subjects.' });
  }
});

// POST /api/academics/subjects
router.post('/subjects', authenticateToken, async (req, res) => {
  try {
    const { department_id, code, name, semester, credits = 3, type = 'theory', syllabus_url, description } = req.body;
    if (!department_id || !code || !name || !semester) {
      return res.status(400).json({ success: false, message: 'Department, subject code, name, and semester are required.' });
    }

    const data = db.getFallbackData();
    const existing = (data.subjects || []).find(s => s.code.toLowerCase() === code.toLowerCase());
    if (existing) {
      return res.status(409).json({ success: false, message: `Subject with code "${code}" already exists.` });
    }

    const newSub = {
      id: 'sub-' + code.toLowerCase().replace(/[^a-z0-9]/g, ''),
      department_id,
      code: code.toUpperCase(),
      name,
      semester: parseInt(semester, 10),
      credits: parseInt(credits, 10),
      type,
      syllabus_url: syllabus_url || '',
      description: description || '',
      created_at: new Date().toISOString()
    };

    data.subjects.push(newSub);
    db.saveFallbackData();

    return res.status(201).json({ success: true, message: 'Subject added to curriculum.', data: newSub });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create subject.' });
  }
});

// ==========================================
// 5. FACULTY SUBJECT ASSIGNMENTS
// ==========================================

// GET /api/academics/faculty-assignments
router.get('/faculty-assignments', async (req, res) => {
  try {
    const data = db.getFallbackData();
    const assignments = (data.faculty_subject_assignments || []).map(fsa => {
      const fac = (data.users || []).find(u => u.id === fsa.faculty_id);
      const sub = (data.subjects || []).find(s => s.id === fsa.subject_id);
      const batch = (data.batches || []).find(b => b.id === fsa.batch_id);
      return {
        ...fsa,
        faculty_name: fac ? fac.name : 'Unknown Faculty',
        faculty_email: fac ? fac.email : '',
        subject_name: sub ? sub.name : 'Unknown Subject',
        subject_code: sub ? sub.code : '',
        batch_name: batch ? batch.name : 'Unknown Batch'
      };
    });
    return res.json({ success: true, data: assignments });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch assignments.' });
  }
});

// POST /api/academics/faculty-assignments
router.post('/faculty-assignments', authenticateToken, async (req, res) => {
  try {
    const { faculty_id, subject_id, batch_id, academic_year_id = 'ay-2025-2026' } = req.body;
    if (!faculty_id || !subject_id || !batch_id) {
      return res.status(400).json({ success: false, message: 'Faculty, Subject, and Batch are required.' });
    }

    const data = db.getFallbackData();
    const newFsa = {
      id: 'fsa-' + Date.now(),
      faculty_id,
      subject_id,
      batch_id,
      academic_year_id,
      assigned_at: new Date().toISOString()
    };

    data.faculty_subject_assignments.push(newFsa);
    db.saveFallbackData();

    return res.status(201).json({ success: true, message: 'Faculty assigned to subject successfully.', data: newFsa });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to assign faculty.' });
  }
});

// ==========================================
// 6. ACADEMIC SCHEDULES / TIMETABLE
// ==========================================

// GET /api/academics/schedules
router.get('/schedules', optionalAuth, async (req, res) => {
  try {
    let { batch_id } = req.query;
    const data = db.getFallbackData();
    if (!batch_id && req.user?.role === 'student') {
      const studentProfile = (data.student_profiles || []).find(p => p.user_id === req.user.id);
      batch_id = studentProfile?.batch_id || req.user.batch_id || 'batch-cs-s4';
    }
    let schedules = data.academic_schedules || [];

    if (batch_id) {
      schedules = schedules.filter(s => s.batch_id === batch_id);
    }

    const enriched = schedules.map(s => {
      const sub = (data.subjects || []).find(sub => sub.id === s.subject_id);
      const fac = (data.users || []).find(u => u.id === s.faculty_id);
      const batch = (data.batches || []).find(b => b.id === s.batch_id);
      return {
        ...s,
        subject_name: sub ? sub.name : 'Unknown Subject',
        subject_code: sub ? sub.code : '',
        faculty_name: fac ? fac.name : 'Unknown Faculty',
        batch_name: batch ? batch.name : ''
      };
    });

    return res.json({ success: true, data: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch schedules.' });
  }
});

// ==========================================
// 7. FACULTY & STAFF DIRECTORY
// ==========================================

// GET /api/academics/faculty
router.get('/faculty', async (req, res) => {
  try {
    const data = db.getFallbackData();
    const facultyUsers = (data.users || []).filter(u => u.role === 'faculty' || u.role === 'instructor');

    const enriched = facultyUsers.map(u => {
      const facProfile = (data.faculty_profiles || []).find(fp => fp.user_id === u.id);
      const dept = (data.departments || []).find(d => d.id === u.department_id);
      const assignments = (data.faculty_subject_assignments || []).filter(fsa => fsa.faculty_id === u.id);
      const assignedSubjects = assignments.map(a => {
        const sub = (data.subjects || []).find(s => s.id === a.subject_id);
        const batch = (data.batches || []).find(b => b.id === a.batch_id);
        return {
          subject_name: sub?.name || 'Subject',
          subject_code: sub?.code || '',
          batch_name: batch?.name || ''
        };
      });

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || '+1 (555) 019-2000',
        designation: u.designation || facProfile?.designation || 'Assistant Professor',
        department_id: u.department_id,
        department_name: dept?.name || 'Computer Science & Engineering',
        department_code: dept?.code || 'CSE',
        staff_id: facProfile?.staff_id || ('FAC-CSE-' + u.id.slice(-3)),
        qualification: facProfile?.qualification || 'M.Tech, Ph.D.',
        specialization: facProfile?.specialization || 'Academic Systems',
        status: u.status || 'active',
        assigned_subjects_count: assignments.length,
        assigned_subjects: assignedSubjects,
        created_at: u.created_at
      };
    });

    return res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    console.error('[Faculty Directory Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch faculty directory.' });
  }
});

// POST /api/academics/faculty
router.post('/faculty', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      staff_id,
      department_id = 'dept-cse-01',
      designation = 'Assistant Professor',
      qualification = 'M.E., Ph.D.',
      specialization = '',
      phone = ''
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const emailExists = await db.checkEmailExists(email);
    if (emailExists) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const targetStaffId = (staff_id || `FAC-CSE-${Math.floor(100 + Math.random() * 900)}`).toUpperCase().trim();
    const staffExists = await db.checkStaffIdExists(targetStaffId);
    if (staffExists) {
      return res.status(409).json({ success: false, message: `Staff ID "${targetStaffId}" already exists.` });
    }

    const defaultPassword = password || 'Faculty@123';
    const bcrypt = require('bcryptjs');
    const userId = 'user-faculty-' + Date.now().toString().slice(-4);

    const newUser = {
      id: userId,
      role: 'faculty',
      name,
      email: email.toLowerCase().trim(),
      password_hash: bcrypt.hashSync(defaultPassword, 10),
      phone: phone || '+1 (555) 019-2000',
      department_id,
      designation,
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop',
      status: 'active',
      created_at: new Date().toISOString()
    };

    const newProfile = {
      id: 'prof-fac-' + Date.now(),
      user_id: userId,
      staff_id: targetStaffId,
      department_id,
      designation,
      qualification: qualification || 'M.E., Ph.D.',
      specialization: specialization || 'Computer Science & Engineering',
      status: 'active'
    };

    await db.insertFacultyUser({ user: newUser, profile: newProfile });

    return res.status(201).json({
      success: true,
      message: 'Faculty member added successfully.',
      default_password: defaultPassword,
      data: {
        id: userId,
        name,
        email,
        staff_id: targetStaffId,
        designation,
        default_password: defaultPassword
      }
    });
  } catch (err) {
    console.error('[Add Faculty Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to create faculty member.' });
  }
});

// PATCH /api/academics/faculty/:id/status
router.patch('/faculty/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status = 'active' } = req.body;
    const updated = await db.updateUserStatus(id, status);
    if (updated) {
      return res.json({ success: true, message: `Faculty status updated to "${status}".` });
    }
    return res.status(404).json({ success: false, message: 'Faculty member not found.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update faculty status.' });
  }
});

// GET /api/academics/my-enrollments - Authenticated student's enrolled courses
router.get('/my-enrollments', authenticateToken, async (req, res) => {
  try {
    const data = db.getFallbackData();
    const userId = req.user.id;
    const enrollments = (data.student_subject_enrollments || []).filter(e => e.student_id === userId);
    const enriched = enrollments.map(e => {
      const sub = (data.subjects || []).find(s => s.id === e.subject_id);
      return {
        id: e.id,
        enrollment_id: e.id,
        student_id: e.student_id,
        subject_id: e.subject_id,
        subject_code: sub ? sub.code : '',
        course_code: sub ? sub.code : '',
        subject_name: sub ? sub.name : '',
        course_name: sub ? sub.name : '',
        credits: sub ? sub.credits : 4,
        semester: sub ? sub.semester : 4,
        status: e.status || 'enrolled'
      };
    });
    return res.json({ success: true, count: enriched.length, data: enriched, enrollments: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch enrollments.' });
  }
});

module.exports = router;
