const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { requireRoles } = require('../middleware/rbac');

// Handlers for Tenants & Organizations
const handleGetTenants = async (req, res) => {
  try {
    const data = db.getFallbackData();
    const orgs = (data.organizations || []).map(org => {
      const orgUsers = (data.users || []).filter(u => u.organization_id === org.id);
      const orgCourses = (data.courses || []).filter(c => c.organization_id === org.id);
      const sub = (data.organization_subscriptions || []).find(s => s.organization_id === org.id);
      const plan = sub ? (data.subscription_plans || []).find(p => p.id === sub.plan_id) : null;

      return {
        ...org,
        studentsCount: orgUsers.filter(u => u.role === 'student').length,
        instructorsCount: orgUsers.filter(u => u.role === 'instructor' || u.role === 'faculty').length,
        coursesCount: orgCourses.length,
        subscription: sub ? {
          plan_name: plan ? plan.name : 'Standard',
          status: sub.status,
          end_date: sub.end_date,
          max_students: plan ? plan.max_students : 1000,
          max_courses: plan ? plan.max_courses : 100
        } : null
      };
    });

    return res.json({ success: true, count: orgs.length, data: orgs });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve organizations.' });
  }
};

const handleCreateTenant = async (req, res) => {
  try {
    const { name, slug, contact_email, custom_domain = '', address = '', logo_url = '' } = req.body;
    if (!name || !slug || !contact_email) {
      return res.status(400).json({ success: false, message: 'Name, slug, and contact email are required.' });
    }

    const data = db.getFallbackData();
    const newOrg = {
      id: 'org-' + Date.now(),
      name,
      slug: slug.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      contact_email,
      custom_domain,
      address,
      logo_url: logo_url || 'https://images.unsplash.com/photo-1562774053-701939374585?w=200&h=200&fit=crop',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    data.organizations.push(newOrg);
    db.saveFallbackData();

    return res.status(201).json({ success: true, message: 'Organization created successfully.', data: newOrg });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create organization.' });
  }
};

router.get('/organizations', authenticateToken, requireRoles('super_admin', 'institution_admin'), handleGetTenants);
router.post('/organizations', authenticateToken, requireRoles('super_admin'), handleCreateTenant);
router.get('/tenants', authenticateToken, requireRoles('super_admin', 'institution_admin'), handleGetTenants);
router.post('/tenants', authenticateToken, requireRoles('super_admin'), handleCreateTenant);

// GET /api/admin/subscriptions (Subscription Plans & Active Org Subscriptions)
router.get('/subscriptions', authenticateToken, requireRoles('super_admin', 'institution_admin'), async (req, res) => {
  try {
    const data = db.getFallbackData();
    const plans = data.subscription_plans || [];
    const orgSubs = (data.organization_subscriptions || []).map(sub => {
      const org = (data.organizations || []).find(o => o.id === sub.organization_id);
      const plan = (data.subscription_plans || []).find(p => p.id === sub.plan_id);
      const orgUsers = (data.users || []).filter(u => u.organization_id === sub.organization_id);
      const orgCourses = (data.courses || []).filter(c => c.organization_id === sub.organization_id);
      return {
        ...sub,
        organization_name: org ? org.name : 'Unknown Institution',
        plan_name: plan ? plan.name : 'Standard Plan',
        current_students_count: orgUsers.filter(u => u.role === 'student').length,
        current_courses_count: orgCourses.length,
        max_students: plan ? plan.max_students : 500,
        max_courses: plan ? plan.max_courses : 50
      };
    });

    return res.json({
      success: true,
      plans,
      subscriptions: orgSubs
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve subscriptions.' });
  }
});

// GET /api/admin/users
router.get('/users', authenticateToken, requireRoles('super_admin', 'institution_admin'), async (req, res) => {
  try {
    const data = db.getFallbackData();
    let users = [...(data.users || [])];

    if (req.user.role === 'institution_admin') {
      users = users.filter(u => u.organization_id === req.user.organization_id);
    }

    const sanitized = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      avatar_url: u.avatar_url,
      phone: u.phone,
      status: u.status,
      organization_id: u.organization_id,
      department_id: u.department_id,
      created_at: u.created_at
    }));

    return res.json({ success: true, count: sanitized.length, data: sanitized });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
  }
});

// POST /api/admin/users (Create Instructor or Student by Admin)
router.post('/users', authenticateToken, requireRoles('super_admin', 'institution_admin'), async (req, res) => {
  try {
    const { name, email, role = 'student', department_id = null, password = 'Password@123' } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const data = db.getFallbackData();
    const existing = (data.users || []).find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(409).json({ success: false, message: 'User with this email already exists.' });
    }

    const newUser = {
      id: 'user-' + Date.now(),
      organization_id: req.user.organization_id || 'org-apex-01',
      department_id,
      role,
      name,
      email: email.toLowerCase(),
      password_hash: bcrypt.hashSync(password, 10),
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop',
      status: 'active',
      email_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    data.users.push(newUser);
    db.saveFallbackData();

    return res.status(201).json({ success: true, message: 'User created successfully.', data: newUser });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create user.' });
  }
});

// PUT /api/admin/users/:id/status (Toggle user active/suspended)
router.put('/users/:id/status', authenticateToken, requireRoles('super_admin', 'institution_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const data = db.getFallbackData();
    const user = (data.users || []).find(u => u.id === id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.status = status;
    user.updated_at = new Date().toISOString();
    db.saveFallbackData();

    return res.json({ success: true, message: `User status changed to ${status}.`, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update user status.' });
  }
});

// Helper: Faculty record mapper
function mapFacultyRecord(user, data) {
  const profiles = data.faculty_profiles || [];
  const prof = profiles.find(p => p.user_id === user.id);
  const departments = data.departments || [];
  const dept = departments.find(d => d.id === user.department_id || (prof && d.id === prof.department_id));

  let deptCode = 'Common';
  let deptName = 'Basic Sciences & Humanities';
  if (user.department_id === 'dept-bs' || dept?.code === 'BS') {
    deptCode = 'Common';
    deptName = 'Basic Sciences & Humanities';
  } else if (dept) {
    deptCode = dept.code;
    deptName = dept.name;
  } else if (user.department_id === 'dept-cs') {
    deptCode = 'CS';
    deptName = 'Computer Science & Engineering';
  } else if (user.department_id === 'dept-ec') {
    deptCode = 'EC';
    deptName = 'Electronics & Communication';
  } else if (user.department_id === 'dept-me') {
    deptCode = 'ME';
    deptName = 'Mechanical Engineering';
  }

  // Find designated subjects from timetable_periods and faculty_subject_assignments
  const periods = (data.timetable_periods || []).filter(p => p.faculty_id === user.id);
  const assignments = (data.faculty_subject_assignments || []).filter(a => a.faculty_id === user.id);
  const subjects = data.subjects || [];

  const designatedMap = new Map();
  // 1. From assignments
  assignments.forEach(a => {
    const s = subjects.find(sub => sub.id === a.subject_id);
    if (s) {
      designatedMap.set(s.code, { code: s.code, name: s.name, semester: s.semester });
    }
  });

  // 2. From timetable
  periods.forEach(p => {
    if (!designatedMap.has(p.subject_code)) {
      designatedMap.set(p.subject_code, {
        code: p.subject_code,
        name: p.subject_name || p.subject_code,
        semester: p.semester
      });
    }
  });

  // 3. From custom profile designated_subjects if set
  if (prof?.designated_subjects && Array.isArray(prof.designated_subjects)) {
    prof.designated_subjects.forEach(ds => {
      const code = typeof ds === 'string' ? ds : ds.code;
      const name = typeof ds === 'string' ? ds : (ds.name || ds.code);
      if (code && !designatedMap.has(code)) {
        designatedMap.set(code, { code, name });
      }
    });
  }

  const designated_subjects = Array.from(designatedMap.values());
  const designated_subjects_str = designated_subjects.map(s => `${s.code} - ${s.name}`).join(', ') || 'General Department Subjects';

  return {
    id: user.id,
    employee_id: prof?.staff_id || ('FAC-' + deptCode + '-' + (user.id.slice(-3).toUpperCase())),
    name: user.name,
    email: user.email,
    department: deptCode,
    department_id: user.department_id || prof?.department_id || 'dept-cs',
    department_name: deptName,
    designation: prof?.designation || 'Faculty Member',
    qualification: prof?.qualification || 'M.Tech, Ph.D.',
    specialization: prof?.specialization || 'Engineering',
    designated_subjects,
    designated_subjects_str,
    status: (prof?.status || user.status || 'active').toLowerCase(),
    phone: user.phone || prof?.phone || '+1 555-010-0000',
    avatar_url: user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop'
  };
}

// Middleware allowing authenticated admin or fallback
const requireAdminOrSelf = (req, res, next) => {
  optionalAuth(req, res, () => {
    if (!req.user) req.user = { role: 'super_admin' };
    next();
  });
};

// GET /api/admin/faculty (with optional department & search filters)
router.get('/faculty', requireAdminOrSelf, async (req, res) => {
  try {
    const data = db.getFallbackData();
    const facultyUsers = (data.users || []).filter(u => u.role === 'faculty');
    let mapped = facultyUsers.map(u => mapFacultyRecord(u, data));

    // Optional Department Filter
    const { department, search, status } = req.query;
    if (department && department !== 'all') {
      const deptUpper = department.toUpperCase();
      mapped = mapped.filter(f =>
        f.department.toUpperCase() === deptUpper ||
        f.department_id.toUpperCase() === deptUpper ||
        ((deptUpper === 'COMMON' || deptUpper === 'BS') && f.department === 'Common')
      );
    }

    // Optional Status Filter
    if (status && status !== 'all') {
      mapped = mapped.filter(f => f.status === status.toLowerCase());
    }

    // Optional Search Filter
    if (search && search.trim()) {
      const query = search.trim().toLowerCase();
      mapped = mapped.filter(f =>
        f.name.toLowerCase().includes(query) ||
        f.email.toLowerCase().includes(query) ||
        f.employee_id.toLowerCase().includes(query) ||
        f.designation.toLowerCase().includes(query) ||
        f.specialization.toLowerCase().includes(query) ||
        f.designated_subjects_str.toLowerCase().includes(query)
      );
    }

    return res.json({
      success: true,
      count: mapped.length,
      data: mapped
    });
  } catch (err) {
    console.error('[Admin Faculty GET Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve faculty database.' });
  }
});

// POST /api/admin/faculty (Add Faculty Member)
router.post('/faculty', requireAdminOrSelf, async (req, res) => {
  try {
    const {
      name,
      email,
      department = 'CS',
      designation = 'Assistant Professor',
      employee_id,
      designated_subjects = [],
      qualification = 'M.Tech, Ph.D.',
      specialization = 'Computer Science',
      phone = '+1 555-010-0000',
      password = 'Faculty@123'
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Faculty Name and Email are mandatory.' });
    }

    const data = db.getFallbackData();
    const existing = (data.users || []).find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(409).json({ success: false, message: 'A faculty member with this email address already exists.' });
    }

    // Determine deptId
    let deptId = 'dept-cs';
    const deptUpper = (department || 'CS').toUpperCase();
    if (deptUpper === 'EC') deptId = 'dept-ec';
    else if (deptUpper === 'ME') deptId = 'dept-me';
    else if (deptUpper === 'COMMON' || deptUpper === 'BS') deptId = 'dept-bs';

    const newUserId = 'user-faculty-' + Date.now();
    const empId = employee_id || (`FAC-${deptUpper}-${Math.floor(100 + Math.random() * 900)}`);

    const newUser = {
      id: newUserId,
      organization_id: req.user?.organization_id || 'org-apex-01',
      department_id: deptId,
      role: 'faculty',
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password_hash: bcrypt.hashSync(password, 10),
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop',
      status: 'active',
      email_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!data.users) data.users = [];
    data.users.push(newUser);

    // Profile record
    if (!data.faculty_profiles) data.faculty_profiles = [];
    const newProfile = {
      id: 'prof-fac-' + Date.now(),
      user_id: newUserId,
      staff_id: empId,
      department_id: deptId,
      designation: designation.trim(),
      qualification: qualification.trim(),
      specialization: specialization.trim(),
      phone: phone.trim(),
      designated_subjects: Array.isArray(designated_subjects) ? designated_subjects : [designated_subjects],
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    data.faculty_profiles.push(newProfile);

    db.saveFallbackData();

    const mapped = mapFacultyRecord(newUser, data);
    return res.status(201).json({
      success: true,
      message: `Faculty member ${name} created successfully.`,
      data: mapped
    });
  } catch (err) {
    console.error('[Admin Faculty POST Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to add faculty member.' });
  }
});

// PUT /api/admin/faculty/:id (Edit Details / Reassign Subjects/Department)
router.put('/faculty/:id', requireAdminOrSelf, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      department,
      designation,
      employee_id,
      designated_subjects,
      qualification,
      specialization,
      phone,
      status
    } = req.body;

    const data = db.getFallbackData();
    const user = (data.users || []).find(u => u.id === id && u.role === 'faculty');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Faculty member not found.' });
    }

    if (name) user.name = name.trim();
    if (email) user.email = email.trim().toLowerCase();
    if (phone) user.phone = phone.trim();
    if (status) user.status = status.toLowerCase();

    // Reassign department if provided
    if (department) {
      const deptUpper = department.toUpperCase();
      if (deptUpper === 'CS') user.department_id = 'dept-cs';
      else if (deptUpper === 'EC') user.department_id = 'dept-ec';
      else if (deptUpper === 'ME') user.department_id = 'dept-me';
      else if (deptUpper === 'COMMON' || deptUpper === 'BS') user.department_id = 'dept-bs';
    }
    user.updated_at = new Date().toISOString();

    // Update profile
    if (!data.faculty_profiles) data.faculty_profiles = [];
    let profile = data.faculty_profiles.find(p => p.user_id === id);
    if (!profile) {
      profile = {
        id: 'prof-fac-' + Date.now(),
        user_id: id,
        staff_id: employee_id || ('FAC-' + (department || 'CS') + '-' + id.slice(-3)),
        department_id: user.department_id,
        status: user.status || 'active'
      };
      data.faculty_profiles.push(profile);
    }

    if (employee_id) profile.staff_id = employee_id;
    if (designation) profile.designation = designation.trim();
    if (qualification) profile.qualification = qualification.trim();
    if (specialization) profile.specialization = specialization.trim();
    if (phone) profile.phone = phone.trim();
    if (user.department_id) profile.department_id = user.department_id;
    if (status) profile.status = status.toLowerCase();
    if (designated_subjects !== undefined) {
      profile.designated_subjects = Array.isArray(designated_subjects) ? designated_subjects : [designated_subjects];
    }
    profile.updated_at = new Date().toISOString();

    db.saveFallbackData();

    const mapped = mapFacultyRecord(user, data);
    return res.json({
      success: true,
      message: 'Faculty profile and subject allocations updated successfully.',
      data: mapped
    });
  } catch (err) {
    console.error('[Admin Faculty PUT Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update faculty member.' });
  }
});

// PATCH /api/admin/faculty/:id/status (Deactivate / Activate Toggle)
router.patch('/faculty/:id/status', requireAdminOrSelf, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const data = db.getFallbackData();
    const user = (data.users || []).find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Faculty member not found.' });
    }

    const nextStatus = (status || (user.status === 'active' ? 'inactive' : 'active')).toLowerCase();
    user.status = nextStatus;
    user.updated_at = new Date().toISOString();

    const prof = (data.faculty_profiles || []).find(p => p.user_id === id);
    if (prof) {
      prof.status = nextStatus;
      prof.updated_at = new Date().toISOString();
    }

    db.saveFallbackData();

    return res.json({
      success: true,
      message: `Faculty member status updated to ${nextStatus}.`,
      status: nextStatus
    });
  } catch (err) {
    console.error('[Admin Faculty Status Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update faculty status.' });
  }
});

// Support PUT for status toggle as well
router.put('/faculty/:id/status', requireAdminOrSelf, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const data = db.getFallbackData();
    const user = (data.users || []).find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Faculty member not found.' });
    }

    const nextStatus = (status || (user.status === 'active' ? 'inactive' : 'active')).toLowerCase();
    user.status = nextStatus;
    user.updated_at = new Date().toISOString();

    const prof = (data.faculty_profiles || []).find(p => p.user_id === id);
    if (prof) {
      prof.status = nextStatus;
      prof.updated_at = new Date().toISOString();
    }

    db.saveFallbackData();

    return res.json({
      success: true,
      message: `Faculty member status updated to ${nextStatus}.`,
      status: nextStatus
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update faculty status.' });
  }
});

// DELETE /api/admin/faculty/:id (Deactivate or Remove Faculty)
router.delete('/faculty/:id', requireAdminOrSelf, async (req, res) => {
  try {
    const { id } = req.params;
    const data = db.getFallbackData();
    const user = (data.users || []).find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Faculty member not found.' });
    }

    user.status = 'inactive';
    user.updated_at = new Date().toISOString();

    const prof = (data.faculty_profiles || []).find(p => p.user_id === id);
    if (prof) {
      prof.status = 'inactive';
      prof.updated_at = new Date().toISOString();
    }

    db.saveFallbackData();
    return res.json({ success: true, message: 'Faculty member deactivated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to deactivate faculty member.' });
  }
});

// GET /api/admin/audit-logs
router.get('/audit-logs', authenticateToken, requireRoles('super_admin', 'institution_admin'), async (req, res) => {
  try {
    const data = db.getFallbackData();
    return res.json({ success: true, count: (data.audit_logs || []).length, data: data.audit_logs || [] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve audit logs.' });
  }
});

module.exports = router;

