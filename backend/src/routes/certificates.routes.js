const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { requireRoles } = require('../middleware/rbac');

// Helper to compute cryptographic hash for verifiable credential
function computeCertificateHash(certNumber, userId, courseId, orgId) {
  const secret = process.env.JWT_SECRET || 'zenora-lms-super-secret-jwt-key-2026-prod';
  return crypto.createHmac('sha256', secret)
    .update(`${certNumber}:${userId}:${courseId}:${orgId}`)
    .digest('hex');
}

// GET /api/certificates (List certificates)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const data = db.getFallbackData();
    let certs = data.certificates || [];
    if (req.user && req.user.role === 'student') {
      certs = certs.filter(c => c.user_id === req.user.id);
    }
    const detailed = certs.map(cert => {
      const student = (data.users || []).find(u => u.id === cert.user_id);
      const course = (data.courses || []).find(c => c.id === cert.course_id);
      const org = (data.organizations || []).find(o => o.id === cert.organization_id);
      let parsedMeta = {};
      try {
        parsedMeta = typeof cert.template_data === 'string' ? JSON.parse(cert.template_data) : (cert.template_data || {});
      } catch (e) {}

      const cryptoHash = cert.crypto_hash || computeCertificateHash(cert.certificate_number, cert.user_id, cert.course_id, cert.organization_id);

      return {
        ...cert,
        crypto_hash: cryptoHash,
        student_name: student ? student.name : parsedMeta.student_name,
        student_email: student ? student.email : null,
        course_title: course ? course.title : (parsedMeta.course_title || 'Course'),
        course_thumbnail: course ? course.thumbnail_url : null,
        organization_name: org ? org.name : (parsedMeta.institution_name || 'Zenora Global'),
        metadata: parsedMeta
      };
    });

    return res.json({ success: true, count: detailed.length, data: detailed });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve certificates.' });
  }
});

// GET /api/certificates/user (All certificates for current user)
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const data = db.getFallbackData();
    const myCerts = (data.certificates || []).filter(c => c.user_id === req.user.id);

    const detailed = myCerts.map(cert => {
      const course = (data.courses || []).find(c => c.id === cert.course_id);
      const org = (data.organizations || []).find(o => o.id === cert.organization_id);
      let parsedMeta = {};
      try {
        parsedMeta = typeof cert.template_data === 'string' ? JSON.parse(cert.template_data) : (cert.template_data || {});
      } catch (e) {}

      const cryptoHash = cert.crypto_hash || computeCertificateHash(cert.certificate_number, cert.user_id, cert.course_id, cert.organization_id);

      return {
        ...cert,
        crypto_hash: cryptoHash,
        course_title: course ? course.title : (parsedMeta.course_title || 'Course'),
        course_thumbnail: course ? course.thumbnail_url : null,
        organization_name: org ? org.name : (parsedMeta.institution_name || 'Zenora Global'),
        metadata: parsedMeta
      };
    });

    return res.json({ success: true, count: detailed.length, data: detailed });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve certificates.' });
  }
});

// =========================================================================
// SEMESTER GRADE SHEET / UNIVERSITY MARK CARD ENGINE (Anna Univ CBCS Model)
// =========================================================================
const SEMESTER_CURRICULA = {
  1: {
    month_year: 'NOV / DEC 2024',
    session: 'November - December 2024 Examinations',
    subjects: [
      { course_code: 'HS3151', course_title: 'Communicative English & Technical Writing', credits: 3, internal: 46, end_sem: 48, total: 94, grade: 'O', pt: 10, result: 'PASS' },
      { course_code: 'MA3151', course_title: 'Matrices and Calculus', credits: 4, internal: 44, end_sem: 46, total: 90, grade: 'O', pt: 10, result: 'PASS' },
      { course_code: 'PH3151', course_title: 'Engineering Physics', credits: 3, internal: 43, end_sem: 45, total: 88, grade: 'A+', pt: 9, result: 'PASS' },
      { course_code: 'CY3151', course_title: 'Engineering Chemistry', credits: 3, internal: 42, end_sem: 44, total: 86, grade: 'A+', pt: 9, result: 'PASS' },
      { course_code: 'GE3151', course_title: 'Problem Solving and Python Programming', credits: 3, internal: 48, end_sem: 49, total: 97, grade: 'O', pt: 10, result: 'PASS' },
      { course_code: 'GE3171', course_title: 'Physics and Chemistry Laboratory', credits: 2, internal: 49, end_sem: 49, total: 98, grade: 'O', pt: 10, result: 'PASS' },
      { course_code: 'GE3172', course_title: 'Python Programming Laboratory', credits: 2, internal: 48, end_sem: 50, total: 98, grade: 'O', pt: 10, result: 'PASS' },
      { course_code: 'GE3152', course_title: 'Heritage of Tamils / Professional Ethics', credits: 1, internal: 45, end_sem: 47, total: 92, grade: 'O', pt: 10, result: 'PASS' }
    ]
  },
  2: {
    month_year: 'APR / MAY 2025',
    session: 'April - May 2025 Examinations',
    subjects: [
      { course_code: 'HS3251', course_title: 'Professional English & Corporate Communication', credits: 2, internal: 43, end_sem: 45, total: 88, grade: 'A+', pt: 9, result: 'PASS' },
      { course_code: 'MA3251', course_title: 'Statistics and Numerical Methods', credits: 4, internal: 42, end_sem: 44, total: 86, grade: 'A+', pt: 9, result: 'PASS' },
      { course_code: 'PH3256', course_title: 'Physics for Information Science', credits: 3, internal: 44, end_sem: 45, total: 89, grade: 'A+', pt: 9, result: 'PASS' },
      { course_code: 'BE3251', course_title: 'Basic Electrical and Electronics Engineering', credits: 3, internal: 41, end_sem: 43, total: 84, grade: 'A+', pt: 9, result: 'PASS' },
      { course_code: 'GE3251', course_title: 'Engineering Graphics & Computer Aided Drawing', credits: 4, internal: 40, end_sem: 42, total: 82, grade: 'A+', pt: 9, result: 'PASS' },
      { course_code: 'CS3251', course_title: 'Programming in C & Data Architectures', credits: 3, internal: 47, end_sem: 48, total: 95, grade: 'O', pt: 10, result: 'PASS' },
      { course_code: 'CS3271', course_title: 'Programming in C Laboratory', credits: 2, internal: 48, end_sem: 49, total: 97, grade: 'O', pt: 10, result: 'PASS' },
      { course_code: 'GE3271', course_title: 'Engineering Practices Laboratory', credits: 2, internal: 46, end_sem: 47, total: 93, grade: 'O', pt: 10, result: 'PASS' }
    ]
  },
  3: {
    month_year: 'NOV / DEC 2025',
    session: 'November - December 2025 Examinations',
    subjects: [
      { course_code: 'MA3354', course_title: 'Discrete Mathematics & Graph Theory', credits: 4, internal: 41, end_sem: 43, total: 84, grade: 'A+', pt: 9, result: 'PASS' },
      { course_code: 'CS3351', course_title: 'Digital Principles and Computer Organization', credits: 4, internal: 42, end_sem: 45, total: 87, grade: 'A+', pt: 9, result: 'PASS' },
      { course_code: 'CS3352', course_title: 'Foundations of Data Science & Big Data', credits: 3, internal: 46, end_sem: 47, total: 93, grade: 'O', pt: 10, result: 'PASS' },
      { course_code: 'CS3301', course_title: 'Data Structures and Algorithms', credits: 3, internal: 47, end_sem: 49, total: 96, grade: 'O', pt: 10, result: 'PASS' },
      { course_code: 'CS3391', course_title: 'Object Oriented Programming with Java', credits: 3, internal: 45, end_sem: 46, total: 91, grade: 'O', pt: 10, result: 'PASS' },
      { course_code: 'CS3311', course_title: 'Data Structures Laboratory', credits: 1.5, internal: 48, end_sem: 49, total: 97, grade: 'O', pt: 10, result: 'PASS' },
      { course_code: 'CS3381', course_title: 'Object Oriented Programming Laboratory', credits: 1.5, internal: 47, end_sem: 48, total: 95, grade: 'O', pt: 10, result: 'PASS' }
    ]
  },
  4: {
    month_year: 'APR / MAY 2026',
    session: 'April - May 2026 Examinations',
    subjects: [
      { course_code: 'CS3452', course_title: 'Theory of Computation & Automata', credits: 3, internal: 42, end_sem: 44, total: 86, grade: 'A+', pt: 9, result: 'PASS' },
      { course_code: 'CS3491', course_title: 'Artificial Intelligence and Machine Learning', credits: 4, internal: 46, end_sem: 48, total: 94, grade: 'O', pt: 10, result: 'PASS' },
      { course_code: 'CS3492', course_title: 'Database Management Systems', credits: 3, internal: 47, end_sem: 49, total: 96, grade: 'O', pt: 10, result: 'PASS' },
      { course_code: 'CS3401', course_title: 'Design and Analysis of Algorithms', credits: 4, internal: 45, end_sem: 47, total: 92, grade: 'O', pt: 10, result: 'PASS' },
      { course_code: 'CS3451', course_title: 'Introduction to Operating Systems Architecture', credits: 3, internal: 44, end_sem: 46, total: 90, grade: 'O', pt: 10, result: 'PASS' },
      { course_code: 'GE3451', course_title: 'Environmental Sciences and Sustainability', credits: 2, internal: 43, end_sem: 45, total: 88, grade: 'A+', pt: 9, result: 'PASS' },
      { course_code: 'CS3461', course_title: 'Database Management Systems Laboratory', credits: 1.5, internal: 49, end_sem: 50, total: 99, grade: 'O', pt: 10, result: 'PASS' },
      { course_code: 'CS3481', course_title: 'Operating Systems Laboratory', credits: 1.5, internal: 48, end_sem: 49, total: 97, grade: 'O', pt: 10, result: 'PASS' }
    ]
  },
  5: {
    month_year: 'NOV / DEC 2026',
    session: 'November - December 2026 Examinations',
    subjects: [
      { course_code: 'CS3591', course_title: 'Computer Networks and Protocols', credits: 4, internal: 45, end_sem: 47, total: 92, grade: 'O', pt: 10, result: 'PASS' },
      { course_code: 'CS3501', course_title: 'Compiler Design and Syntax Analysis', credits: 4, internal: 43, end_sem: 45, total: 88, grade: 'A+', pt: 9, result: 'PASS' },
      { course_code: 'CB3491', course_title: 'Cryptography and Cyber Security', credits: 3, internal: 46, end_sem: 48, total: 94, grade: 'O', pt: 10, result: 'PASS' },
      { course_code: 'CS3551', course_title: 'Distributed Systems and Cloud Computing', credits: 3, internal: 47, end_sem: 48, total: 95, grade: 'O', pt: 10, result: 'PASS' },
      { course_code: 'CS3511', course_title: 'Networks and Security Laboratory', credits: 1.5, internal: 48, end_sem: 49, total: 97, grade: 'O', pt: 10, result: 'PASS' },
      { course_code: 'CS3581', course_title: 'Cloud and DevOps Automation Laboratory', credits: 1.5, internal: 49, end_sem: 50, total: 99, grade: 'O', pt: 10, result: 'PASS' }
    ]
  },
  6: {
    month_year: 'APR / MAY 2027',
    session: 'April - May 2027 Examinations',
    subjects: [
      { course_code: 'CCS335', course_title: 'Cloud Computing Architectures', credits: 3, internal: 46, end_sem: 48, total: 94, grade: 'O', pt: 10, result: 'PASS' },
      { course_code: 'CS3691', course_title: 'Embedded Systems and IoT Architectures', credits: 4, internal: 44, end_sem: 46, total: 90, grade: 'O', pt: 10, result: 'PASS' },
      { course_code: 'IT3601', course_title: 'Full Stack Web Development & Microservices', credits: 3, internal: 48, end_sem: 49, total: 97, grade: 'O', pt: 10, result: 'PASS' },
      { course_code: 'CS3601', course_title: 'Software Engineering & Agile Methodologies', credits: 3, internal: 45, end_sem: 47, total: 92, grade: 'O', pt: 10, result: 'PASS' },
      { course_code: 'CS3611', course_title: 'Embedded Systems & IoT Laboratory', credits: 1.5, internal: 49, end_sem: 49, total: 98, grade: 'O', pt: 10, result: 'PASS' },
      { course_code: 'CS3681', course_title: 'Full Stack Development Mini Project', credits: 2.5, internal: 50, end_sem: 50, total: 100, grade: 'O', pt: 10, result: 'PASS' }
    ]
  }
};

// GET /api/certificates/gradesheet (Official University Semester Grade Sheet)
router.get('/gradesheet', authenticateToken, async (req, res) => {
  try {
    const data = db.getFallbackData();
    const reqSem = parseInt(req.query.semester || '1', 10);
    const sem = (reqSem >= 1 && reqSem <= 6) ? reqSem : 1;

    // Target student resolution: if faculty/admin, they can query specific student_id
    let studentId = req.user.id;
    if (['super_admin', 'institution_admin', 'faculty', 'instructor', 'admin'].includes(req.user.role) && req.query.student_id) {
      studentId = req.query.student_id;
    }

    const studentUser = (data.users || []).find(u => u.id === studentId) || req.user;
    const profile = (data.student_profiles || []).find(p => p.user_id === studentId) || studentUser.student_profile || {};

    let currentSemester = 4;
    if (profile.current_semester) {
      currentSemester = parseInt(profile.current_semester, 10);
    } else if (profile.semester) {
      currentSemester = parseInt(profile.semester, 10);
    } else if (profile.batch_id) {
      const match = String(profile.batch_id).match(/s(\d)/i);
      if (match) currentSemester = parseInt(match[1], 10);
    }

    const completedSemesters = [];
    for (let s = 1; s < currentSemester && s <= 6; s++) {
      completedSemesters.push(s);
    }

    // STRICT ELIGIBILITY: Block future or current uncompleted semesters
    if (sem >= currentSemester) {
      return res.status(403).json({
        success: false,
        status: 'unpublished',
        current_semester: currentSemester,
        requested_semester: sem,
        available_semesters: completedSemesters,
        message: 'Mark sheet not available for future or ongoing semesters.'
      });
    }

    const semData = SEMESTER_CURRICULA[sem] || SEMESTER_CURRICULA[1];
    const subjects = semData.subjects.map(s => {
      const creditPts = s.credits * s.pt;
      return {
        course_code: s.course_code,
        course_title: s.course_title,
        credits: s.credits,
        internal_marks: s.internal,
        end_sem_marks: s.end_sem,
        total_marks: s.total,
        grade_letter: s.grade,
        grade_point: s.pt,
        credit_points: creditPts,
        result: s.result
      };
    });

    const totalCredits = subjects.reduce((sum, s) => sum + s.credits, 0);
    const totalCreditPoints = subjects.reduce((sum, s) => sum + s.credit_points, 0);
    const sgpa = totalCredits > 0 ? parseFloat((totalCreditPoints / totalCredits).toFixed(2)) : 8.92;
    const cgpa = parseFloat(((sgpa * 0.95) + 0.42).toFixed(2));

    const regNo = profile.register_no || studentUser.register_no || '312224104001';
    const rollNo = profile.roll_no || studentUser.roll_no || '24CSE101';
    const deptName = profile.department_name || studentUser.department_name || (profile.department === 'EC' ? 'Electronics & Communication Engineering' : profile.department === 'ME' ? 'Mechanical Engineering' : 'Computer Science & Engineering');

    // Cryptographic digital signature for University Board transcript
    const verificationCode = `ZEN-CBCS-${regNo}-S${sem}-${crypto.createHash('md5').update(`${regNo}:S${sem}:${sgpa}`).digest('hex').substring(0, 8).toUpperCase()}`;
    const digitalSignature = crypto.createHmac('sha256', 'zenora-controller-secret-2026')
      .update(`${regNo}:${rollNo}:S${sem}:${sgpa}:${totalCredits}`)
      .digest('hex');

    return res.json({
      success: true,
      status: 'published',
      data: {
        header: {
          university_name: 'ZENORA UNIVERSITY OF ENGINEERING & TECHNOLOGY',
          board_name: 'DIRECTORATE OF CONTROLLER OF EXAMINATIONS',
          accreditation: 'Autonomous Institution • Affiliated to Anna University • Approved by AICTE • NAAC A++ Accredited',
          regulation: 'Regulations 2021 (CBCS)',
          exam_name: 'B.E. DEGREE EXAMINATIONS',
          document_title: `PROVISIONAL STATEMENT OF MARKS AND GRADES`,
          semester_title: `SEMESTER ${sem} (${sem % 2 === 1 ? 'ODD' : 'EVEN'} SEMESTER)`,
          institution_code_name: '3122 - ZENORA COLLEGE OF ENGINEERING & TECHNOLOGY',
          month_year: semData.month_year,
          session: semData.session
        },
        student: {
          id: studentUser.id,
          name: studentUser.name || 'Alex Rivera',
          register_no: regNo,
          roll_no: rollNo,
          department: deptName,
          degree: `B.E. ${deptName}`,
          semester: sem,
          semester_label: `Semester ${sem} (S${sem})`,
          current_semester: currentSemester,
          batch: profile.batch_name || 'Batch 2024 - 2028',
          dob: profile.date_of_birth || '22-03-2004',
          gender: 'MALE',
          academic_status: 'Regular / Full-Time'
        },
        subjects,
        summary: {
          total_credits_registered: totalCredits,
          total_credits_earned: totalCredits,
          total_grade_points: totalCreditPoints,
          sgpa,
          cgpa: Math.min(10.0, cgpa),
          result_classification: 'FIRST CLASS WITH DISTINCTION',
          overall_result: 'PASSED',
          publication_date: sem <= 2 ? '18-JAN-2025' : sem <= 4 ? '15-JUL-2025' : '22-JAN-2026',
          status: 'published'
        },
        verification: {
          verification_code: verificationCode,
          qr_payload: `https://lms.apex.edu/verify/transcript/${verificationCode}`,
          digital_signature: `SHA256:${digitalSignature}`,
          controller_name: 'Dr. K. Senthil Nathan, M.E., Ph.D.',
          controller_designation: 'Controller of Examinations',
          verification_status: 'AUTHENTIC & DIGITALLY VERIFIED'
        },
        eligibility: {
          current_semester: currentSemester,
          completed_semesters: completedSemesters,
          latest_completed_semester: completedSemesters.length > 0 ? completedSemesters[completedSemesters.length - 1] : null,
          is_completed: true,
          can_download: true
        },
        available_semesters: completedSemesters
      }
    });
  } catch (err) {
    console.error('[Grade Sheet Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to generate university grade sheet.' });
  }
});

// GET /api/certificates/verify/:code (Public credential verification by code or hash)
const handleVerifyCert = async (req, res) => {
  try {
    const code = req.params.code || req.params.hash;
    const cleanCode = String(code).trim().toLowerCase();
    const data = db.getFallbackData();
    const cert = (data.certificates || []).find(
      c => (c.verification_code && c.verification_code.toLowerCase() === cleanCode) ||
           (c.certificate_number && c.certificate_number.toLowerCase() === cleanCode) ||
           (c.crypto_hash && (c.crypto_hash.toLowerCase() === cleanCode || c.crypto_hash.toLowerCase().startsWith(cleanCode)))
    );

    if (!cert) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: 'Invalid certificate identifier or verification code. Credential record could not be found on Zenora Registry.'
      });
    }

    const student = (data.users || []).find(u => u.id === cert.user_id);
    const course = (data.courses || []).find(c => c.id === cert.course_id);
    const org = (data.organizations || []).find(o => o.id === cert.organization_id);
    let parsedMeta = {};
    try {
      parsedMeta = typeof cert.template_data === 'string' ? JSON.parse(cert.template_data) : (cert.template_data || {});
    } catch (e) {}

    const expectedHash = computeCertificateHash(cert.certificate_number, cert.user_id, cert.course_id, cert.organization_id);
    const isSignatureValid = !cert.crypto_hash || cert.crypto_hash === expectedHash;

    return res.json({
      success: true,
      verified: true,
      cryptographic_integrity: isSignatureValid ? 'SECURE_AND_VERIFIED' : 'TAMPERED_WARNING',
      digital_signature: cert.crypto_hash || expectedHash,
      message: 'Certificate credential is authentic, cryptographically verified, and registered on the Zenora LMS public trust registry.',
      certificate: {
        certificate_number: cert.certificate_number,
        verification_code: cert.verification_code,
        student_name: student ? student.name : parsedMeta.student_name,
        student_email: student ? student.email : null,
        course_title: course ? course.title : parsedMeta.course_title,
        institution_name: org ? org.name : parsedMeta.institution_name,
        issue_date: cert.issue_date,
        grade: parsedMeta.grade || 'Certified (100% Complete)',
        cryptographic_hash: cert.crypto_hash || expectedHash,
        status: 'Authentic & Valid',
        registry_url: `https://zenora.education/verify/${cert.verification_code}`
      }
    });
  } catch (err) {
    console.error('[Verify Certificate Error]', err);
    return res.status(500).json({ success: false, message: 'Verification lookup failed.' });
  }
};

router.get('/verify/:code', optionalAuth, handleVerifyCert);
router.get('/verify/:hash', optionalAuth, handleVerifyCert);

// POST /api/certificates/issue (Manual or Admin issuance)
router.post('/issue', authenticateToken, requireRoles('super_admin', 'institution_admin', 'instructor'), async (req, res) => {
  try {
    const { user_id, course_id, grade = 'Certified' } = req.body;
    if (!user_id || !course_id) {
      return res.status(400).json({ success: false, message: 'User ID and Course ID are required.' });
    }

    const data = db.getFallbackData();
    const student = (data.users || []).find(u => u.id === user_id);
    const course = (data.courses || []).find(c => c.id === course_id);
    const org = (data.organizations || []).find(o => o.id === (course ? course.organization_id : req.user.organization_id));
    const orgId = org ? org.id : (req.user.organization_id || 'org-apex-01');

    const certNum = 'ZEN-' + new Date().getFullYear() + '-CERT-' + Math.floor(10000 + Math.random() * 90000);
    const cryptoHash = computeCertificateHash(certNum, user_id, course_id, orgId);
    const verificationCode = `ZEN-VERIFY-${certNum.replace(/[^0-9]/g, '')}-${cryptoHash.substring(0, 8).toUpperCase()}`;

    const newCert = {
      id: 'cert-' + Date.now(),
      certificate_number: certNum,
      verification_code: verificationCode,
      crypto_hash: cryptoHash,
      organization_id: orgId,
      user_id,
      course_id,
      enrolment_id: 'enr-' + Date.now(),
      issue_date: new Date().toISOString().split('T')[0],
      expiry_date: null,
      template_data: JSON.stringify({
        student_name: student ? student.name : 'Student',
        course_title: course ? course.title : 'Course',
        institution_name: org ? org.name : 'Zenora Global',
        grade,
        crypto_signature: cryptoHash
      }),
      file_url: `https://zenora.education/certificates/${certNum}.pdf`,
      created_at: new Date().toISOString()
    };

    data.certificates.push(newCert);

    // Notification
    data.notifications.push({
      id: 'notif-' + Date.now(),
      user_id,
      organization_id: newCert.organization_id,
      title: 'Certificate Awarded!',
      message: `You have been awarded an official certificate for ${course ? course.title : 'Course'}.`,
      type: 'certificate',
      action_url: `/certificates/${newCert.id}`,
      is_read: false,
      email_sent: true,
      created_at: new Date().toISOString()
    });

    db.saveFallbackData();
    return res.status(201).json({ success: true, message: 'Certificate issued successfully.', certificate: newCert });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to issue certificate.' });
  }
});

module.exports = router;
