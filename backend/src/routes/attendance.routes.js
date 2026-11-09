const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const { authenticateToken, verifyRole } = require('../middleware/auth');

const FACULTY_ADMIN_ROLES = ['faculty', 'instructor', 'super_admin', 'institution_admin', 'admin'];

router.use(authenticateToken);

/**
 * Helper: compute attendance stats using official formula:
 * (Total Present Sessions / Total Held Sessions) * 100
 */
function calculateAttendanceStats(records) {
  const conducted = records.length;
  const present = records.filter(r => r.status === 'present' || r.status === 'on_duty').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const percentage = conducted > 0 ? Number(((present / conducted) * 100).toFixed(1)) : 100.0;
  return {
    conducted,
    present,
    absent,
    percentage,
    percentage_str: `${percentage}%`
  };
}

/**
 * GET /api/attendance/summary
 * Returns overall aggregate attendance and subject-wise breakdown for a student
 * Formula: (Total Present Sessions / Total Held Sessions) * 100
 */
router.get('/summary', async (req, res) => {
  try {
    const data = db.getFallbackData();
    let targetStudentId = req.query.student_id;

    if (req.user.role === 'student' || !targetStudentId) {
      targetStudentId = req.user.id;
    }

    const studentRecords = (data.attendance || []).filter(a => a.student_id === targetStudentId);
    const overall = calculateAttendanceStats(studentRecords);

    // Group by subject
    const subjectsMap = {};
    (data.subjects || []).forEach(sub => {
      subjectsMap[sub.id] = {
        subject_id: sub.id,
        subject_code: sub.code,
        subject_name: sub.name,
        semester: sub.semester,
        credits: sub.credits || 3,
        faculty_name: 'Academic Faculty',
        records: []
      };
    });

    // Populate faculty names from assignments
    (data.faculty_subject_assignments || []).forEach(fsa => {
      if (subjectsMap[fsa.subject_id]) {
        const facUser = (data.users || []).find(u => u.id === fsa.faculty_id);
        if (facUser) {
          subjectsMap[fsa.subject_id].faculty_name = facUser.name;
        }
      }
    });

    studentRecords.forEach(r => {
      if (!subjectsMap[r.subject_id]) {
        subjectsMap[r.subject_id] = {
          subject_id: r.subject_id,
          subject_code: 'CORE',
          subject_name: 'Curriculum Course',
          records: []
        };
      }
      subjectsMap[r.subject_id].records.push(r);
    });

    const bySubject = Object.values(subjectsMap)
      .map(sub => {
        const stats = calculateAttendanceStats(sub.records);
        return {
          subject_id: sub.subject_id,
          subject_code: sub.subject_code,
          subject_name: sub.subject_name,
          semester: sub.semester,
          credits: sub.credits,
          faculty_name: sub.faculty_name,
          total_held: stats.conducted,
          conducted: stats.conducted,
          total_present: stats.present,
          present: stats.present,
          total_absent: stats.absent,
          absent: stats.absent,
          percentage: stats.percentage,
          percentage_str: stats.percentage_str,
          is_eligible: stats.percentage >= 75.0,
          eligibility_status: stats.percentage >= 75.0 ? 'Eligible' : 'Shortage (<75%)'
        };
      })
      .filter(s => s.total_held > 0);

    // Recent logs
    const recentLogs = [...studentRecords]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 15)
      .map(r => {
        const sub = (data.subjects || []).find(s => s.id === r.subject_id);
        return {
          ...r,
          subject_code: sub ? sub.code : 'CORE',
          subject_name: sub ? sub.name : 'Curriculum Subject'
        };
      });

    return res.json({
      success: true,
      student_id: targetStudentId,
      formula: '(Total Present Sessions / Total Held Sessions) * 100',
      percentage: overall.percentage,
      percentage_num: overall.percentage,
      percentage_str: overall.percentage_str,
      overall: {
        total_held: overall.conducted,
        total_conducted: overall.conducted,
        total_present: overall.present,
        total_absent: overall.absent,
        percentage: overall.percentage,
        attendance_percentage: overall.percentage_str,
        percentage_num: overall.percentage,
        eligible_for_exams: overall.percentage >= 75.0,
        status: overall.percentage >= 75.0 ? 'Eligible for End-Sem Examinations' : 'Condonation Required (<75%)'
      },
      by_subject: bySubject,
      recent_logs: recentLogs
    });
  } catch (err) {
    console.error('[Attendance Summary Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to compute dynamic attendance summary.' });
  }
});

/**
 * GET /api/attendance/roster
 * Renders cohort roster table for Faculty Daily Attendance Register:
 * Query params: department (CS, EC, ME), semester (1-6), subject_id, date (YYYY-MM-DD)
 */
router.get('/roster', verifyRole(FACULTY_ADMIN_ROLES), async (req, res) => {
  try {
    const data = db.getFallbackData();
    const {
      department = 'CS',
      semester = '4',
      subject_id,
      date = new Date().toISOString().split('T')[0]
    } = req.query;

    const semNum = parseInt(String(semester).replace(/^S/i, ''), 10) || 4;
    const deptUpper = String(department).toUpperCase();

    // Find batch for this department & semester
    const targetBatch = (data.batches || []).find(
      b => {
        const bDept = (data.departments || []).find(d => d.id === b.department_id);
        const matchesDept = b.name.includes(deptUpper) || (bDept && bDept.code === deptUpper);
        return matchesDept && b.semester === semNum;
      }
    ) || (data.batches || [])[0];

    // Find all student profiles for this department & semester
    let profiles = (data.student_profiles || []).filter(p => {
      const pDept = p.department || ((data.departments || []).find(d => d.id === p.department_id)?.code);
      const matchesDept = pDept === deptUpper || (targetBatch && p.batch_id === targetBatch.id);
      const matchesSem = p.current_semester === semNum;
      return matchesDept && matchesSem;
    });

    if (profiles.length === 0 && targetBatch) {
      profiles = (data.student_profiles || []).filter(p => p.batch_id === targetBatch.id);
    }

    // Existing attendance entries on this date for this subject
    const existingRecords = (data.attendance || []).filter(
      a => a.date === date && (!subject_id || a.subject_id === subject_id)
    );

    const existingMap = {};
    existingRecords.forEach(e => {
      existingMap[e.student_id] = e;
    });

    const students = profiles.map(p => {
      const u = (data.users || []).find(user => user.id === p.user_id) || {};
      const record = existingMap[p.user_id];
      return {
        student_id: p.user_id,
        roll_no: p.roll_no || 'N/A',
        register_no: p.register_no || 'N/A',
        name: u.name || p.name || 'Student',
        email: u.email || '',
        status: record ? record.status : 'present',
        remarks: record ? (record.remarks || '') : ''
      };
    });

    // Sort alphabetically by roll number
    students.sort((a, b) => a.roll_no.localeCompare(b.roll_no, undefined, { numeric: true }));

    return res.json({
      success: true,
      department: deptUpper,
      semester: semNum,
      batch_id: targetBatch ? targetBatch.id : null,
      subject_id: subject_id || null,
      date,
      count: students.length,
      data: students,
      students
    });
  } catch (err) {
    console.error('[Attendance Roster Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to load attendance roster.' });
  }
});

/**
 * POST /api/attendance/bulk
 * Faculty & Admin endpoint to save/update daily session attendance in bulk.
 * Guarantees duplicate attendance for the same subject on the same date updates rather than duplicating!
 */
router.post('/bulk', verifyRole(FACULTY_ADMIN_ROLES), async (req, res) => {
  try {
    const data = db.getFallbackData();
    if (!data.attendance) data.attendance = [];

    const facultyId = req.user.id;
    const {
      subject_id,
      department = 'CS',
      semester = 4,
      date = new Date().toISOString().split('T')[0],
      session_slot = 'Morning',
      records = []
    } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'No student attendance records provided in bulk request.' });
    }

    if (!subject_id) {
      return res.status(400).json({ success: false, message: 'Subject ID is required for marking attendance.' });
    }

    const now = new Date().toISOString();
    let updatedCount = 0;
    let insertedCount = 0;

    for (const item of records) {
      if (!item.student_id) continue;

      const studentId = item.student_id;
      const status = ['present', 'absent', 'on_duty', 'late'].includes(item.status) ? item.status : 'present';
      const remarks = item.remarks || '';

      // Check if duplicate attendance for this student, subject, and date already exists
      const existingIdx = data.attendance.findIndex(
        a => a.student_id === studentId &&
             a.subject_id === subject_id &&
             a.date === date
      );

      let recordId;
      if (existingIdx !== -1) {
        // UPDATE existing record to avoid duplicate
        data.attendance[existingIdx].status = status;
        data.attendance[existingIdx].remarks = remarks;
        data.attendance[existingIdx].session_slot = session_slot || data.attendance[existingIdx].session_slot;
        data.attendance[existingIdx].updated_at = now;
        data.attendance[existingIdx].faculty_id = facultyId;
        recordId = data.attendance[existingIdx].id;
        updatedCount++;
      } else {
        // INSERT new attendance record
        recordId = `att-${crypto.randomUUID()}`;
        data.attendance.push({
          id: recordId,
          student_id: studentId,
          subject_id: subject_id,
          department: String(department).toUpperCase(),
          semester: parseInt(semester, 10) || 4,
          faculty_id: facultyId,
          date: date,
          session_slot: session_slot,
          status: status,
          remarks: remarks,
          created_at: now,
          updated_at: now
        });
        insertedCount++;
      }

      // Sync to MySQL if pool available
      const pool = db.getPool();
      if (pool) {
        try {
          await pool.query(
            `INSERT INTO attendance (id, student_id, subject_id, department, semester, faculty_id, date, session_slot, status, remarks, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE status = VALUES(status), remarks = VALUES(remarks), updated_at = VALUES(updated_at)`,
            [
              recordId, studentId, subject_id, String(department).toUpperCase(), parseInt(semester, 10) || 4, facultyId,
              date, session_slot, status, remarks, now, now
            ]
          );
        } catch (dbErr) {
          console.warn('[MySQL Bulk Attendance Sync Warning]', dbErr.message);
        }
      }
    }

    db.saveFallbackData();

    return res.json({
      success: true,
      message: `Daily attendance successfully recorded for ${records.length} student(s) (${insertedCount} new, ${updatedCount} updated).`,
      details: {
        total_processed: records.length,
        inserted: insertedCount,
        updated: updatedCount,
        subject_id,
        department,
        semester,
        date
      }
    });
  } catch (err) {
    console.error('[Bulk Attendance Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to record bulk attendance.' });
  }
});

// Alias POST /api/attendance/mark to call bulk handler logic
router.post('/mark', verifyRole(FACULTY_ADMIN_ROLES), async (req, res, next) => {
  if (Array.isArray(req.body.records) && req.body.records.length > 0) {
    req.url = '/bulk';
    return router.handle(req, res, next);
  } else if (req.body.student_id) {
    req.body.records = [{
      student_id: req.body.student_id,
      status: req.body.status || 'present',
      remarks: req.body.remarks || ''
    }];
    req.url = '/bulk';
    return router.handle(req, res, next);
  }
  return res.status(400).json({ success: false, message: 'Invalid attendance payload.' });
});

/**
 * GET /api/attendance
 * List attendance records with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const data = db.getFallbackData();
    const { student_id, subject_id, department, semester, date } = req.query;

    let targetStudent = student_id;
    if (req.user.role === 'student') {
      targetStudent = req.user.id;
    }

    let records = [...(data.attendance || [])];
    if (targetStudent) records = records.filter(r => r.student_id === targetStudent);
    if (subject_id) records = records.filter(r => r.subject_id === subject_id);
    if (department) records = records.filter(r => r.department === department);
    if (semester) records = records.filter(r => String(r.semester) === String(semester));
    if (date) records = records.filter(r => r.date === date);

    records.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    const enriched = records.map(r => {
      const sub = (data.subjects || []).find(s => s.id === r.subject_id);
      const student = (data.users || []).find(u => u.id === r.student_id);
      const prof = (data.student_profiles || []).find(p => p.user_id === r.student_id);
      return {
        ...r,
        subject_name: sub ? sub.name : 'Subject',
        subject_code: sub ? sub.code : 'SUB',
        student_name: student ? student.name : 'Student',
        roll_no: prof ? prof.roll_no : 'N/A'
      };
    });

    return res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    console.error('[Attendance List Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve attendance records.' });
  }
});

module.exports = router;
