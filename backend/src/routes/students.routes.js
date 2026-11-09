const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { requireRoles } = require('../middleware/rbac');
const { checkStudentQuota } = require('../middleware/subscriptionQuota');

// Helper to assemble full student details
function buildStudentDetail(user, profile, data) {
  const dept = (data.departments || []).find(d => d.id === user.department_id);
  const batch = profile ? (data.batches || []).find(b => b.id === profile.batch_id) : null;
  const enrollments = (data.student_subject_enrollments || []).filter(e => e.student_id === user.id);
  const enrolledSubjects = enrollments.map(e => {
    const sub = (data.subjects || []).find(s => s.id === e.subject_id);
    return {
      enrollment_id: e.id,
      subject_id: e.subject_id,
      subject_name: sub ? sub.name : 'Unknown Subject',
      subject_code: sub ? sub.code : '',
      credits: sub ? sub.credits : 3,
      type: sub ? sub.type : 'theory',
      status: e.status
    };
  });

  const guardianName = (profile && (profile.parent_name || profile.guardian_name)) || '';
  const guardianPhone = (profile && (profile.parent_contact || profile.guardian_phone)) || '';
  const phoneNumber = user.phone || (profile && profile.phone_number) || '';
  const currentSem = (profile && profile.current_semester) || (batch ? batch.semester : 1);
  const notesText = (profile && (profile.notes || profile.remarks)) || '';

  return {
    id: user.id,
    profile_id: profile ? profile.id : null,
    name: user.name,
    email: user.email,
    phone: phoneNumber,
    phone_number: phoneNumber,
    avatar_url: user.avatar_url || '',
    department_id: user.department_id,
    department_name: dept ? dept.name : 'Unassigned',
    department_code: dept ? dept.code : '',
    roll_no: profile ? profile.roll_no : 'N/A',
    register_no: profile ? profile.register_no : 'N/A',
    batch_id: profile ? profile.batch_id : null,
    batch_name: batch ? batch.name : 'Unassigned',
    semester: currentSem,
    current_semester: currentSem,
    section: batch ? batch.section : 'A',
    shift: batch ? batch.shift : 'Regular',
    admission_year: (profile && profile.admission_year) || 2024,
    admission_date: (profile && profile.admission_date) || '',
    date_of_birth: (profile && profile.date_of_birth) || '',
    academic_year: (profile && profile.academic_year) || '2025 - 2026',
    guardian_name: guardianName,
    parent_name: guardianName,
    guardian_phone: guardianPhone,
    parent_contact: guardianPhone,
    blood_group: (profile && profile.blood_group) || 'O+',
    address: (profile && profile.address) || '',
    notes: notesText,
    remarks: notesText,
    status: (profile && profile.status) || user.status || 'active',
    enrolled_subjects: enrolledSubjects,
    created_at: user.created_at
  };
}

// GET /api/students - Master Student Directory with search & filters
router.get('/', async (req, res) => {
  try {
    const { search, department_id, batch_id, semester, section, status } = req.query;
    const data = db.getFallbackData();
    const studentUsers = (data.users || []).filter(u => u.role === 'student');

    let list = studentUsers.map(user => {
      const profile = (data.student_profiles || []).find(p => p.user_id === user.id);
      return buildStudentDetail(user, profile, data);
    });

    // Apply Filters
    if (search) {
      const q = search.toLowerCase().trim();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.roll_no.toLowerCase().includes(q) ||
        s.register_no.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
      );
    }

    if (department_id) {
      list = list.filter(s => s.department_id === department_id);
    }

    if (batch_id) {
      list = list.filter(s => s.batch_id === batch_id);
    }

    if (semester) {
      list = list.filter(s => s.semester === parseInt(semester, 10));
    }

    if (section) {
      list = list.filter(s => s.section.toUpperCase() === section.toUpperCase());
    }

    if (status && status !== 'all') {
      list = list.filter(s => s.status.toLowerCase() === status.toLowerCase());
    }

    // Sort by Roll Number
    list.sort((a, b) => (a.roll_no || '').localeCompare(b.roll_no || ''));

    return res.json({
      success: true,
      total: list.length,
      data: list
    });
  } catch (err) {
    console.error('[Students API Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve students directory.' });
  }
});

// GET /api/students/profile or /me - Authenticated student's own profile
router.get(['/profile', '/me'], authenticateToken, async (req, res) => {
  try {
    const data = db.getFallbackData();
    const user = (data.users || []).find(u => u.id === req.user.id && u.role === 'student');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    const profile = (data.student_profiles || []).find(p => p.user_id === user.id);
    const detail = buildStudentDetail(user, profile, data);

    return res.json({ success: true, data: detail, profile: detail });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve student profile.' });
  }
});

// GET /api/students/:id - Detailed student record
router.get('/:id', async (req, res) => {
  try {
    const data = db.getFallbackData();
    const user = (data.users || []).find(u => u.id === req.params.id && u.role === 'student');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    const profile = (data.student_profiles || []).find(p => p.user_id === user.id);
    const detail = buildStudentDetail(user, profile, data);

    return res.json({ success: true, data: detail });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve student details.' });
  }
});

// GET /api/students/:id/profile - Alias to detailed student profile
router.get('/:id/profile', authenticateToken, async (req, res) => {
  try {
    const data = db.getFallbackData();
    const user = (data.users || []).find(u => u.id === req.params.id && u.role === 'student');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    const profile = (data.student_profiles || []).find(p => p.user_id === user.id);
    const detail = buildStudentDetail(user, profile, data);

    return res.json({ success: true, data: detail });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve student profile.' });
  }
});

// POST /api/students - Register single student with auto-generated default password or custom password
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      department_id,
      batch_id,
      roll_no,
      register_no,
      admission_year = 2024,
      guardian_name = '',
      guardian_phone = '',
      blood_group = 'O+',
      password
    } = req.body;

    if (!name || !email || !roll_no || !register_no || !batch_id) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, roll number, register number, and batch are required.'
      });
    }

    const orgId = req.user.organization_id || 'org-apex-01';
    const quota = await checkStudentQuota(orgId, 1);
    if (!quota.allowed) {
      return res.status(403).json({ success: false, message: quota.message });
    }

    // Check unique email across MySQL & memory store
    const emailExists = await db.checkEmailExists(email);
    if (emailExists) {
      return res.status(409).json({ success: false, message: `Email "${email}" is already registered.` });
    }

    // Check unique roll_no or register_no
    const rollExists = await db.checkRollNoExists(roll_no);
    if (rollExists) {
      return res.status(409).json({ success: false, message: `Roll Number "${roll_no}" is already allocated.` });
    }

    const regExists = await db.checkRegNoExists(register_no);
    if (regExists) {
      return res.status(409).json({ success: false, message: `University Register Number "${register_no}" is already allocated.` });
    }

    // Determine effective password:
    // If admin explicitly provided a password, use that;
    // Otherwise, automatically generate and save their University Register Number (or 'Student@123') as default password in the MySQL database!
    const effectivePassword = (password && String(password).trim().length > 0)
      ? String(password).trim()
      : (register_no ? String(register_no).trim() : 'Student@123');

    const passwordHash = bcrypt.hashSync(effectivePassword, 10);
    const userId = 'user-std-' + Date.now();

    const data = db.getFallbackData();
    const batch = (data.batches || []).find(b => b.id === batch_id);
    const deptId = department_id || (batch ? batch.department_id : 'dept-cse-01');

    const newUser = {
      id: userId,
      role: 'student',
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      phone: phone || '',
      department_id: deptId,
      designation: 'Student',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop',
      status: 'active',
      created_at: new Date().toISOString()
    };

    const newProfile = {
      id: 'prof-' + Date.now(),
      user_id: userId,
      roll_no: roll_no.toUpperCase().trim(),
      register_no: String(register_no).trim(),
      batch_id,
      admission_year: parseInt(admission_year, 10) || 2024,
      guardian_name: guardian_name || '',
      guardian_phone: guardian_phone || '',
      blood_group: blood_group || 'O+',
      status: 'active',
      created_at: new Date().toISOString()
    };

    // Auto-enroll in subjects for that batch/semester
    const enrollments = [];
    if (batch) {
      const batchSubjects = (data.subjects || []).filter(s => s.department_id === batch.department_id && s.semester === batch.semester);
      batchSubjects.forEach(sub => {
        enrollments.push({
          id: `sse-${Date.now()}-${sub.id}`,
          student_id: userId,
          subject_id: sub.id,
          batch_id,
          status: 'enrolled',
          enrolled_at: new Date().toISOString()
        });
      });
    }

    // Persist into MySQL users, student_profiles, and student_subject_enrollments
    await db.insertStudentUser({ user: newUser, profile: newProfile, enrollments });

    const freshData = db.getFallbackData();
    const detail = buildStudentDetail(newUser, newProfile, freshData);

    return res.status(201).json({
      success: true,
      message: `Student registered successfully! Default login password is "${effectivePassword}".`,
      default_password: effectivePassword,
      data: detail
    });
  } catch (err) {
    console.error('[Create Student Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to create student record: ' + err.message });
  }
});

// ==============================================================
// PUT /api/students/:id/profile & PUT /api/students/:id
// Extended student details update with RBAC enforcement
// ==============================================================
const FACULTY_ADMIN_ROLES = ['super_admin', 'institution_admin', 'faculty', 'instructor', 'admin'];

async function handleUpdateStudentProfile(req, res) {
  try {
    const studentId = req.params.id;
    const data = db.getFallbackData();
    const user = (data.users || []).find(u => u.id === studentId && u.role === 'student');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    const isStaff = req.user && FACULTY_ADMIN_ROLES.includes(req.user.role);
    const isSelf = req.user && req.user.role === 'student' && req.user.id === studentId;

    if (!isStaff && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to edit this student profile.'
      });
    }

    let profile = (data.student_profiles || []).find(p => p.user_id === user.id);
    if (!profile) {
      profile = {
        id: 'prof-' + Date.now(),
        user_id: user.id,
        roll_no: 'N/A',
        register_no: 'N/A',
        batch_id: 'batch-cse-4a',
        status: 'active'
      };
      if (!data.student_profiles) data.student_profiles = [];
      data.student_profiles.push(profile);
    }

    const {
      name,
      email,
      phone,
      phone_number,
      address,
      avatar_url,
      date_of_birth,
      blood_group,
      parent_name,
      guardian_name,
      parent_contact,
      guardian_phone,
      department_id,
      batch_id,
      roll_no,
      register_no,
      current_semester,
      semester,
      academic_year,
      admission_year,
      admission_date,
      notes,
      remarks,
      status
    } = req.body;

    // Fields editable by both Student (self) and Staff
    const effectivePhone = phone !== undefined ? phone : phone_number;
    if (effectivePhone !== undefined) {
      user.phone = String(effectivePhone).trim();
      profile.phone_number = String(effectivePhone).trim();
    }
    if (address !== undefined) profile.address = String(address).trim();
    if (avatar_url !== undefined) user.avatar_url = String(avatar_url).trim();
    if (blood_group !== undefined) profile.blood_group = String(blood_group).trim();
    if (date_of_birth !== undefined) profile.date_of_birth = date_of_birth;

    const effectiveParentContact = parent_contact !== undefined ? parent_contact : guardian_phone;
    if (effectiveParentContact !== undefined) {
      profile.parent_contact = String(effectiveParentContact).trim();
      profile.guardian_phone = String(effectiveParentContact).trim();
    }

    // Academic & Administrative fields (Staff ONLY: super_admin, institution_admin, faculty, instructor)
    if (isStaff) {
      if (name && String(name).trim().length > 0) {
        user.name = String(name).trim();
      }

      if (email && email.trim().toLowerCase() !== user.email.toLowerCase()) {
        const emailExists = await db.checkEmailExists(email);
        if (emailExists) {
          return res.status(409).json({ success: false, message: `Email "${email}" is already in use.` });
        }
        user.email = email.trim().toLowerCase();
      }

      if (department_id) user.department_id = department_id;
      if (batch_id) profile.batch_id = batch_id;

      if (roll_no && roll_no.toUpperCase().trim() !== profile.roll_no) {
        const rollUpper = roll_no.toUpperCase().trim();
        const rollConflict = (data.student_profiles || []).some(p => p.user_id !== user.id && p.roll_no === rollUpper);
        if (rollConflict) {
          return res.status(409).json({ success: false, message: `Roll Number "${rollUpper}" is already allocated.` });
        }
        profile.roll_no = rollUpper;
      }

      if (register_no && String(register_no).trim() !== profile.register_no) {
        const regTrim = String(register_no).trim();
        const regConflict = (data.student_profiles || []).some(p => p.user_id !== user.id && p.register_no === regTrim);
        if (regConflict) {
          return res.status(409).json({ success: false, message: `Register Number "${regTrim}" is already allocated.` });
        }
        profile.register_no = regTrim;
      }

      const effectiveParentName = parent_name !== undefined ? parent_name : guardian_name;
      if (effectiveParentName !== undefined) {
        profile.parent_name = String(effectiveParentName).trim();
        profile.guardian_name = String(effectiveParentName).trim();
      }

      const effectiveSem = current_semester !== undefined ? current_semester : semester;
      if (effectiveSem !== undefined) {
        profile.current_semester = parseInt(effectiveSem, 10) || 1;
      }

      if (academic_year !== undefined) profile.academic_year = String(academic_year).trim();
      if (admission_year !== undefined) profile.admission_year = parseInt(admission_year, 10) || 2024;
      if (admission_date !== undefined) profile.admission_date = admission_date;

      const effectiveNotes = notes !== undefined ? notes : remarks;
      if (effectiveNotes !== undefined) {
        profile.notes = String(effectiveNotes).trim();
        profile.remarks = String(effectiveNotes).trim();
      }

      if (status && ['active', 'suspended', 'graduated'].includes(status)) {
        user.status = status;
        profile.status = status;
      }
    }

    db.saveFallbackData();

    // If MySQL connected, sync updates
    if (!db.isUsingFallback() && db.getPool()) {
      try {
        await db.query(
          `UPDATE users SET name = ?, email = ?, phone = ?, avatar_url = ?, department_id = ?, status = ?, updated_at = NOW() WHERE id = ?`,
          [user.name, user.email, user.phone, user.avatar_url, user.department_id, user.status, user.id]
        );
        await db.query(
          `UPDATE student_profiles SET roll_no = ?, register_no = ?, batch_id = ?, guardian_name = ?, guardian_phone = ?, parent_name = ?, parent_contact = ?, phone_number = ?, blood_group = ?, address = ?, date_of_birth = ?, current_semester = ?, academic_year = ?, admission_date = ?, notes = ?, status = ? WHERE user_id = ?`,
          [
            profile.roll_no,
            profile.register_no,
            profile.batch_id,
            profile.guardian_name,
            profile.guardian_phone,
            profile.parent_name || profile.guardian_name,
            profile.parent_contact || profile.guardian_phone,
            profile.phone_number || user.phone,
            profile.blood_group,
            profile.address || null,
            profile.date_of_birth || null,
            profile.current_semester || 4,
            profile.academic_year || '2025 - 2026',
            profile.admission_date || null,
            profile.notes || null,
            profile.status,
            user.id
          ]
        );
      } catch (sqlErr) {
        console.warn('[MySQL student profile update warning]', sqlErr.message);
      }
    }

    const freshData = db.getFallbackData();
    const detail = buildStudentDetail(user, profile, freshData);
    return res.json({
      success: true,
      message: 'Student profile updated successfully.',
      data: detail
    });
  } catch (err) {
    console.error('[Update Student Profile Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update student profile: ' + err.message });
  }
}

router.put('/:id/profile', authenticateToken, handleUpdateStudentProfile);
router.put('/:id', authenticateToken, handleUpdateStudentProfile);

// PATCH /api/students/:id/status - Toggle Active / Suspended / Graduated
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended', 'graduated'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be active, suspended, or graduated.' });
    }

    const data = db.getFallbackData();
    const user = (data.users || []).find(u => u.id === req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    user.status = status;
    const profile = (data.student_profiles || []).find(p => p.user_id === user.id);
    if (profile) {
      profile.status = status;
    }

    db.saveFallbackData();

    if (!db.isUsingFallback() && db.getPool()) {
      try {
        await db.query(`UPDATE users SET status = ? WHERE id = ?`, [status, user.id]);
        if (profile) {
          await db.query(`UPDATE student_profiles SET status = ? WHERE user_id = ?`, [status, user.id]);
        }
      } catch (sqlErr) {
        console.warn('[MySQL update student status warning]', sqlErr.message);
      }
    }

    return res.json({ success: true, message: `Student status set to "${status}".`, status });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update student status.' });
  }
});

// POST /api/students/bulk-import - CSV / JSON bulk registration & batch allocation with default passwords
router.post('/bulk-import', authenticateToken, async (req, res) => {
  try {
    const rawCsv = req.body.csv_data || req.body.csv_text || req.body.csv;
    const default_batch_id = req.body.default_batch_id || req.body.batch_id || 'batch-cse-4a';
    const default_department_id = req.body.default_department_id || req.body.department_id || 'dept-cse-01';

    if (!rawCsv || typeof rawCsv !== 'string') {
      return res.status(400).json({ success: false, message: 'CSV text content is required in csv_data or csv_text.' });
    }

    const lines = rawCsv.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      return res.status(400).json({ success: false, message: 'CSV must contain at least one student data row.' });
    }

    // Check organization subscription quota
    const orgId = req.user.organization_id || 'org-apex-01';
    const quota = await checkStudentQuota(orgId, lines.length);
    if (!quota.allowed) {
      return res.status(403).json({ success: false, message: quota.message });
    }

    const line0Lower = lines[0].toLowerCase();
    const hasHeader = (line0Lower.includes('name') || line0Lower.includes('email')) && !lines[0].includes('@');

    let nameIdx = 0;
    let emailIdx = 1;
    let rollIdx = 2;
    let regIdx = 3;
    let phoneIdx = 4;
    let startIdx = 0;

    if (hasHeader) {
      const header = lines[0].toLowerCase().split(',').map(h => h.trim());
      nameIdx = header.findIndex(h => h.includes('name'));
      emailIdx = header.findIndex(h => h.includes('email'));
      rollIdx = header.findIndex(h => h.includes('roll'));
      regIdx = header.findIndex(h => h.includes('reg') || h.includes('register'));
      phoneIdx = header.findIndex(h => h.includes('phone') || h.includes('contact'));
      startIdx = 1;

      if (nameIdx === -1 || emailIdx === -1) {
        return res.status(400).json({ success: false, message: 'CSV header must include at least Name and Email columns.' });
      }
    }

    const data = db.getFallbackData();
    let importedCount = 0;
    let skippedCount = 0;
    const errors = [];
    const importedList = [];
    const duplicatesList = [];

    // In-memory sets to catch duplicate entries within the uploaded CSV itself
    const seenEmails = new Set();
    const seenRollNumbers = new Set();
    const seenRegNumbers = new Set();

    for (let i = startIdx; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      const name = parts[nameIdx] || '';
      const rawEmail = parts[emailIdx] || '';
      const email = rawEmail ? rawEmail.toLowerCase().trim() : '';
      const roll_no = rollIdx !== -1 && parts[rollIdx] ? parts[rollIdx].toUpperCase().trim() : `24CSE${Math.floor(200 + i)}`;
      const register_no = regIdx !== -1 && parts[regIdx] ? parts[regIdx].trim() : roll_no;
      const phone = phoneIdx !== -1 && parts[phoneIdx] ? parts[phoneIdx].trim() : '';

      if (!name || !email || !email.includes('@')) {
        const reason = `Row ${i + 1}: Valid name and email are required.`;
        errors.push(reason);
        duplicatesList.push({ name: name || `Row ${i + 1}`, email, roll_no, reason });
        skippedCount++;
        continue;
      }

      // Check within-file duplicate email
      if (seenEmails.has(email)) {
        const reason = `Row ${i + 1}: Duplicate email "${email}" found within the CSV file.`;
        errors.push(reason);
        duplicatesList.push({ name, email, roll_no, reason });
        skippedCount++;
        continue;
      }
      seenEmails.add(email);

      // Check within-file duplicate roll number
      if (seenRollNumbers.has(roll_no)) {
        const reason = `Row ${i + 1}: Duplicate Roll Number "${roll_no}" found within the CSV file.`;
        errors.push(reason);
        duplicatesList.push({ name, email, roll_no, reason });
        skippedCount++;
        continue;
      }
      seenRollNumbers.add(roll_no);

      // Check database duplicate email
      const emailExists = await db.checkEmailExists(email);
      if (emailExists) {
        const reason = `Row ${i + 1}: Email "${email}" is already registered in the system.`;
        errors.push(reason);
        duplicatesList.push({ name, email, roll_no, reason });
        skippedCount++;
        continue;
      }

      // Check database duplicate roll number
      const rollExists = await db.checkRollNoExists(roll_no);
      if (rollExists) {
        const reason = `Row ${i + 1}: Roll Number "${roll_no}" is already allocated to another student.`;
        errors.push(reason);
        duplicatesList.push({ name, email, roll_no, reason });
        skippedCount++;
        continue;
      }

      // Check database duplicate register number
      if (register_no && register_no !== roll_no) {
        const regExists = await db.checkRegNoExists(register_no);
        if (regExists) {
          const reason = `Row ${i + 1}: Register Number "${register_no}" is already allocated.`;
          errors.push(reason);
          duplicatesList.push({ name, email, roll_no, reason });
          skippedCount++;
          continue;
        }
      }

      // Default password is roll_no or register number or Student@123
      const effectivePassword = roll_no || (register_no ? String(register_no).trim() : 'Student@123');
      const userId = 'user-std-bulk-' + Date.now() + '-' + i;

      const newUser = {
        id: userId,
        organization_id: orgId,
        role: 'student',
        name,
        email,
        password_hash: bcrypt.hashSync(effectivePassword, 10),
        phone,
        department_id: default_department_id,
        designation: 'Student',
        avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop',
        status: 'active',
        created_at: new Date().toISOString()
      };

      const newProfile = {
        id: 'prof-bulk-' + Date.now() + '-' + i,
        user_id: userId,
        roll_no,
        register_no,
        batch_id: default_batch_id,
        admission_year: 2024,
        guardian_name: '',
        guardian_phone: '',
        blood_group: 'O+',
        status: 'active',
        created_at: new Date().toISOString()
      };

      const enrollments = [];
      const batch = (data.batches || []).find(b => b.id === default_batch_id);
      if (batch) {
        const batchSubjects = (data.subjects || []).filter(s => s.department_id === batch.department_id && s.semester === batch.semester);
        batchSubjects.forEach(sub => {
          enrollments.push({
            id: `sse-b-${Date.now()}-${i}-${sub.id}`,
            student_id: userId,
            subject_id: sub.id,
            batch_id: default_batch_id,
            status: 'enrolled',
            enrolled_at: new Date().toISOString()
          });
        });
      }

      await db.insertStudentUser({ user: newUser, profile: newProfile, enrollments });
      importedCount++;
      importedList.push({
        id: userId,
        name,
        email,
        roll_no,
        register_no,
        default_password: effectivePassword
      });
    }

    return res.json({
      success: true,
      message: `Bulk import completed: Successfully imported ${importedCount} student(s) (${skippedCount} duplicates/invalid rows skipped).`,
      importedCount,
      skippedCount,
      imported: importedList,
      duplicates: duplicatesList,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error('[Bulk Import Error]', err);
    return res.status(500).json({ success: false, message: 'Bulk student import failed: ' + err.message });
  }
});

// GET /api/students/export/csv - Export CSV of master directory
router.get('/export/csv', async (req, res) => {
  try {
    const { department_id, batch_id, status } = req.query;
    const data = db.getFallbackData();
    let studentUsers = (data.users || []).filter(u => u.role === 'student');

    let list = studentUsers.map(user => {
      const profile = (data.student_profiles || []).find(p => p.user_id === user.id);
      return buildStudentDetail(user, profile, data);
    });

    if (department_id) list = list.filter(s => s.department_id === department_id);
    if (batch_id) list = list.filter(s => s.batch_id === batch_id);
    if (status && status !== 'all') list = list.filter(s => s.status.toLowerCase() === status.toLowerCase());

    const headers = ['Roll Number', 'Register Number', 'Full Name', 'Email', 'Department', 'Batch', 'Semester', 'Section', 'Phone', 'Status'];
    const rows = list.map(s => [
      `"${s.roll_no}"`,
      `"${s.register_no}"`,
      `"${s.name}"`,
      `"${s.email}"`,
      `"${s.department_name}"`,
      `"${s.batch_name}"`,
      s.semester,
      `"${s.section}"`,
      `"${s.phone}"`,
      `"${s.status}"`
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="Zenora_Student_Directory.csv"');
    return res.send(csvContent);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to export CSV.' });
  }
});

// DELETE /api/students/:id (Archive or Remove Student Record - Staff only)
router.delete('/:id', authenticateToken, requireRoles('super_admin', 'institution_admin', 'faculty', 'instructor', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { hard_delete = false } = req.query;
    const data = db.getFallbackData();

    const userIdx = (data.users || []).findIndex(u => u.id === id && u.role === 'student');
    if (userIdx === -1) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    const studentUser = data.users[userIdx];
    const profile = (data.student_profiles || []).find(p => p.user_id === id);

    if (hard_delete === 'true' || hard_delete === true) {
      // Remove completely
      data.users.splice(userIdx, 1);
      data.student_profiles = (data.student_profiles || []).filter(p => p.user_id !== id);
      data.student_subject_enrollments = (data.student_subject_enrollments || []).filter(e => e.student_id !== id);
      data.attendance = (data.attendance || []).filter(a => a.student_id !== id);

      const pool = db.getPool();
      if (pool) {
        try {
          await pool.query(`DELETE FROM student_profiles WHERE user_id = ?`, [id]);
          await pool.query(`DELETE FROM users WHERE id = ?`, [id]);
        } catch (dbErr) {
          console.warn('[MySQL Student Hard Delete Warning]', dbErr.message);
        }
      }

      db.saveFallbackData();
      return res.json({
        success: true,
        message: `Student record "${studentUser.name}" (${profile?.roll_no || 'N/A'}) permanently removed.`,
        deleted_id: id
      });
    } else {
      // Soft Archive / Deactivate
      studentUser.status = 'suspended';
      if (profile) profile.status = 'suspended';

      const pool = db.getPool();
      if (pool) {
        try {
          await pool.query(`UPDATE users SET status = 'suspended', updated_at = NOW() WHERE id = ?`, [id]);
          await pool.query(`UPDATE student_profiles SET status = 'suspended' WHERE user_id = ?`, [id]);
        } catch (dbErr) {
          console.warn('[MySQL Student Archive Warning]', dbErr.message);
        }
      }

      db.saveFallbackData();
      return res.json({
        success: true,
        message: `Student "${studentUser.name}" successfully archived/deactivated.`,
        student_id: id,
        status: 'suspended'
      });
    }
  } catch (err) {
    console.error('[Student Delete/Archive Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete/archive student record.' });
  }
});

module.exports = router;
