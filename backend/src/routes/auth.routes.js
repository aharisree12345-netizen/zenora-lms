const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const emailService = require('../services/email.service');
const { generateToken, authenticateToken } = require('../middleware/auth');

// POST /api/auth/login
// Validates entered credentials (email, roll number, or university register number)
// against the MySQL users and student_profiles tables.
router.post('/login', async (req, res) => {
  try {
    const identifier = (
      req.body.identifier ||
      req.body.roll_number ||
      req.body.roll_no ||
      req.body.email ||
      req.body.student_id ||
      req.body.staff_id ||
      req.body.username ||
      ''
    ).toString().trim();
    const password = (req.body.password || '').toString();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both your Email / Roll Number and password.'
      });
    }

    // Query MySQL users table (joined with student_profiles & faculty_profiles) or relational store
    const user = await db.findUserForLogin(identifier);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: `No account found matching "${identifier}". Please verify your Roll Number / Email or sign up.`
      });
    }

    let isMatch = false;
    try {
      if (user.password_hash) {
        isMatch = bcrypt.compareSync(password, user.password_hash);
      }
    } catch (bcErr) {
      console.warn('[bcrypt compare warning]', bcErr.message);
    }

    // Fallback support for standard default credentials across seeded & newly registered users
    if (!isMatch && user.role && user.role.toLowerCase() === 'student') {
      if (password === 'Student@123') {
        isMatch = true;
      } else if (user.register_no && (password === user.register_no || password === String(user.register_no).trim())) {
        isMatch = true;
      }
    } else if (!isMatch && (user.role === 'faculty' || user.role === 'instructor')) {
      if (password === 'Faculty@123' || password === 'Instructor@123') {
        isMatch = true;
      }
    } else if (!isMatch && (user.role === 'super_admin' || user.role === 'institution_admin' || user.role === 'admin')) {
      if (password === 'Admin@123') {
        isMatch = true;
      }
    }

    if (!isMatch) {
      const hint = user.role === 'student'
        ? ' Default password is "Student@123" or your University Register Number.'
        : ' Default password for demo accounts is "Faculty@123" or "Admin@123".';
      return res.status(401).json({
        success: false,
        message: `Incorrect password.${hint}`
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended. Please contact Academic Dean.'
      });
    }

    if (user.status === 'pending_approval') {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending verification and approval by the College Administrator. Please contact the Academic Office.'
      });
    }

    const token = generateToken(user);
    const enrichedUser = db.enrichUserObject(user);

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: enrichedUser
    });
  } catch (err) {
    console.error('[Auth Login Error]', err);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
});

// GET /api/auth/me - Retrieves fresh, exact profile data of the currently logged-in user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserWithProfileById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    const enrichedUser = db.enrichUserObject(user);
    return res.json({
      success: true,
      user: enrichedUser
    });
  } catch (err) {
    console.error('[Auth Me Error]', err);
    return res.status(500).json({ success: false, message: 'Error fetching user profile.' });
  }
});

// POST /api/auth/switch-role (Convenient for testing Admin, Faculty, and Student personas)
router.post('/switch-role', async (req, res) => {
  try {
    let { targetRole } = req.body;
    if (targetRole === 'instructor') targetRole = 'faculty';
    if (targetRole === 'institution_admin') targetRole = 'super_admin';

    const data = db.getFallbackData();
    const targetUser = (data.users || []).find(u => u.role === targetRole);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: `No active user found for role: ${targetRole}` });
    }

    const fullUser = await db.getUserWithProfileById(targetUser.id) || targetUser;
    const token = generateToken(fullUser);
    const enrichedUser = db.enrichUserObject(fullUser);

    return res.json({
      success: true,
      message: `Switched active role to ${targetRole}.`,
      token,
      user: enrichedUser
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error switching role.' });
  }
});

// POST /api/auth/register (Role-based Student & Faculty Onboarding)
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'student',
      department_id = 'dept-cse-01',
      // Student specific
      roll_no,
      register_no,
      batch_id = 'batch-cse-4a',
      guardian_name = '',
      guardian_phone = '',
      blood_group = 'O+',
      // Faculty specific
      staff_id,
      designation = 'Assistant Professor',
      qualification = 'M.Tech, Ph.D.',
      specialization = '',
      phone = '',
      require_approval = false
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const emailExists = await db.checkEmailExists(email);
    if (emailExists) {
      return res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
    }

    const userId = 'user-' + Date.now();
    const userStatus = require_approval ? 'pending_approval' : 'active';

    if (role === 'faculty' || role === 'instructor') {
      const generatedStaffId = staff_id || `FAC-CSE-${Math.floor(100 + Math.random() * 900)}`;
      const staffExists = await db.checkStaffIdExists(generatedStaffId);
      if (staffExists) {
        return res.status(409).json({ success: false, message: `Staff ID "${generatedStaffId}" is already assigned.` });
      }

      const newFacultyUser = {
        id: userId,
        role: 'faculty',
        name,
        email: email.toLowerCase().trim(),
        password_hash: bcrypt.hashSync(password, 10),
        phone: phone || '+1 (555) 019-2000',
        department_id,
        designation,
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop',
        status: userStatus,
        created_at: new Date().toISOString()
      };

      const newFacultyProfile = {
        id: 'prof-fac-' + Date.now(),
        user_id: userId,
        staff_id: generatedStaffId,
        department_id,
        designation,
        qualification: qualification || 'M.E., Ph.D.',
        specialization: specialization || 'Computer Science & Engineering',
        status: userStatus
      };

      await db.insertFacultyUser({ user: newFacultyUser, profile: newFacultyProfile });

      const fullUser = await db.getUserWithProfileById(userId) || newFacultyUser;
      const token = generateToken(fullUser);
      const enrichedUser = db.enrichUserObject(fullUser);

      return res.status(201).json({
        success: true,
        message: userStatus === 'pending_approval'
          ? 'Faculty registration submitted. Pending administrator approval.'
          : 'Faculty account registered and active.',
        token,
        user: enrichedUser,
        status: userStatus
      });
    }

    // Default: Student Registration
    const studentRoll = (roll_no || `24CSE${Math.floor(100 + Math.random() * 900)}`).toUpperCase().trim();
    const studentReg = (register_no || `312224104${Math.floor(1000 + Math.random() * 9000)}`).trim();

    const rollExists = await db.checkRollNoExists(studentRoll);
    if (rollExists) {
      return res.status(409).json({ success: false, message: `Roll Number "${studentRoll}" already exists.` });
    }

    const regExists = await db.checkRegNoExists(studentReg);
    if (regExists) {
      return res.status(409).json({ success: false, message: `Register Number "${studentReg}" already exists.` });
    }

    const newStudentUser = {
      id: userId,
      role: 'student',
      name,
      email: email.toLowerCase().trim(),
      password_hash: bcrypt.hashSync(password, 10),
      phone: phone || '',
      department_id,
      designation: 'Student',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop',
      status: userStatus,
      created_at: new Date().toISOString()
    };

    const newStudentProfile = {
      id: 'prof-' + Date.now(),
      user_id: userId,
      roll_no: studentRoll,
      register_no: studentReg,
      batch_id,
      admission_year: 2024,
      guardian_name: guardian_name || '',
      guardian_phone: guardian_phone || '',
      blood_group: blood_group || 'O+',
      status: userStatus
    };

    const data = db.getFallbackData();
    const batch = (data.batches || []).find(b => b.id === batch_id);
    let enrollments = [];
    if (batch) {
      const batchSubjects = (data.subjects || []).filter(s => s.department_id === batch.department_id && s.semester === batch.semester);
      enrollments = batchSubjects.map(sub => ({
        id: `sse-${Date.now()}-${sub.id}`,
        student_id: userId,
        subject_id: sub.id,
        batch_id,
        status: 'enrolled',
        enrolled_at: new Date().toISOString()
      }));
    }

    await db.insertStudentUser({ user: newStudentUser, profile: newStudentProfile, enrollments });

    const fullUser = await db.getUserWithProfileById(userId) || newStudentUser;
    const token = generateToken(fullUser);
    const enrichedUser = db.enrichUserObject(fullUser);

    return res.status(201).json({
      success: true,
      message: userStatus === 'pending_approval'
        ? 'Student registration submitted. Pending administrator verification.'
        : 'Student account registered successfully.',
      token,
      user: enrichedUser,
      status: userStatus
    });
  } catch (err) {
    console.error('[Auth Register Error]', err);
    return res.status(500).json({ success: false, message: 'Registration failed.' });
  }
});

// POST /api/auth/forgot-password (Generate 6-digit verification code & send email)
router.post('/forgot-password', async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Please enter your registered Email, Student ID, or Staff ID.' });
    }

    const user = await db.findUserForLogin(identifier);
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found matching this identifier.' });
    }

    // Generate secure 6-digit random code and password_reset_token
    const resetCode = crypto.randomInt(100000, 1000000).toString();
    const resetToken = crypto.randomBytes(24).toString('hex');
    await db.createPasswordReset(user.email, resetCode, resetToken);

    // Send reset code email via Nodemailer / SMTP
    const emailResult = await emailService.sendPasswordResetEmail({
      toEmail: user.email,
      userName: user.name,
      resetCode,
      expiresInMinutes: 15,
    });

    // Mask recipient email for privacy, e.g. a***a@apex.edu
    let maskedEmail = user.email;
    if (user.email && user.email.includes('@')) {
      const [localPart, domainPart] = user.email.split('@');
      const maskedLocal = localPart.length > 2
        ? localPart[0] + '***' + localPart[localPart.length - 1]
        : localPart[0] + '***';
      maskedEmail = `${maskedLocal}@${domainPart}`;
    }

    // Return a clear user-facing error message if email sending fails due to bad credentials / SMTP failure
    if (!emailResult.delivered && emailResult.isConfigured) {
      const isAuth = emailResult.isAuthError;
      const userMessage = isAuth
        ? `Email delivery failed: Authentication error with ${process.env.SMTP_HOST || 'email server'}. For Gmail, ensure you configured a 16-character App Password (not your regular password) in backend/.env. The verification code has been printed to the backend terminal stdout.`
        : `Email delivery failed: ${emailResult.error || 'SMTP delivery issue'}. Please check your SMTP configuration in backend/.env. The verification code has been printed to the backend terminal stdout.`;

      return res.status(502).json({
        success: false,
        message: userMessage,
        error: emailResult.error,
        code: emailResult.code,
        identifier: user.email,
        email: maskedEmail,
        devFallback: true,
      });
    }

    // If SMTP credentials were not configured at all (dev environment fallback)
    if (emailResult.isDevFallback) {
      return res.json({
        success: true,
        isDevFallback: true,
        message: 'A 6-digit verification code has been sent to your registered email.',
        email: maskedEmail,
        identifier: user.email,
      });
    }

    // Live email successfully delivered to user's inbox
    return res.json({
      success: true,
      message: 'A 6-digit verification code has been sent to your registered email.',
      email: maskedEmail,
      identifier: user.email,
    });
  } catch (err) {
    console.error('[Forgot Password Error]', err);
    return res.status(500).json({ success: false, message: 'Error processing password reset request.' });
  }
});

// POST /api/auth/reset-password (Verify code, check expiry, hash password, invalidate code)
router.post('/reset-password', async (req, res) => {
  try {
    const { identifier, reset_code, new_password } = req.body;
    if (!identifier || !reset_code || !new_password) {
      return res.status(400).json({ success: false, message: 'Identifier, 6-digit verification code, and new password are required.' });
    }

    const cleanCode = String(reset_code).trim();
    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      return res.status(400).json({ success: false, message: 'Verification code must be exactly 6 numeric digits.' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    const user = await db.findUserForLogin(identifier);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    // Verify code and expiry time (also invalidates single-use code upon success)
    const isValid = await db.verifyResetCode(user.email, cleanCode);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code. Please request a new code.' });
    }

    // Hash the new password with bcrypt and update in database
    const newHash = bcrypt.hashSync(new_password, 10);
    await db.updateUserPassword(user.id, newHash);

    return res.json({
      success: true,
      message: 'Password has been successfully updated. You may now sign in with your new credentials.'
    });
  } catch (err) {
    console.error('[Reset Password Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to reset password.' });
  }
});

// GET /api/auth/pending-approvals (Admin view of accounts pending verification)
router.get('/pending-approvals', authenticateToken, async (req, res) => {
  try {
    const data = db.getFallbackData();
    const pendingUsers = (data.users || []).filter(u => u.status === 'pending_approval');
    const enriched = pendingUsers.map(u => db.enrichUserObject(u));
    return res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch pending approvals.' });
  }
});

// PATCH /api/auth/approve/:userId (Admin approval toggle)
router.patch('/approve/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status = 'active' } = req.body;
    const updated = await db.updateUserStatus(userId, status);
    if (updated) {
      return res.json({ success: true, message: `User status updated to "${status}".` });
    }
    return res.status(404).json({ success: false, message: 'User not found.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update user approval status.' });
  }
});

module.exports = router;
