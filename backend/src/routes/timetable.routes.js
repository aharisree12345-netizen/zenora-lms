const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const match = String(timeStr).trim().match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3] ? match[3].toUpperCase() : null;
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

const dayOrder = {
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6,
  'Sunday': 7
};

function enrichPeriod(period, allUsers, currentDayName, currentMinutes) {
  const fac = (allUsers || []).find(u => u.id === period.faculty_id);
  const sMin = parseTimeToMinutes(period.start_time);
  const eMin = parseTimeToMinutes(period.end_time);

  const isToday = period.day_of_week === currentDayName;
  const is_ongoing = isToday && sMin !== null && eMin !== null && (currentMinutes >= sMin && currentMinutes < eMin);
  const remaining_minutes = is_ongoing && eMin ? (eMin - currentMinutes) : 0;
  const elapsed_minutes = is_ongoing && sMin ? (currentMinutes - sMin) : 0;
  const total_duration = (sMin !== null && eMin !== null && eMin > sMin) ? (eMin - sMin) : 60;
  const progress_percentage = is_ongoing && total_duration > 0 ? Math.min(100, Math.round((elapsed_minutes / total_duration) * 100)) : 0;

  // Visual Cohort Badge: '1st Year (S1/S2)', '2nd Year (S3/S4)', or '3rd Year (S5/S6)'
  let cohortLabel = '1st Year (S1/S2)';
  if (period.semester === 'S3' || period.semester === 'S4') {
    cohortLabel = '2nd Year (S3/S4)';
  } else if (period.semester === 'S5' || period.semester === 'S6') {
    cohortLabel = '3rd Year (S5/S6)';
  }

  const session_type_badge = (period.session_type || '').toLowerCase() === 'lab' 
    ? '[🔬 LAB / PRACTICAL]' 
    : '[THEORY]';

  return {
    ...period,
    faculty_name: fac ? fac.name : 'Department Faculty',
    faculty_email: fac ? fac.email : '',
    cohort_badge: `${cohortLabel} • ${period.department} (${period.semester})`,
    year_cohort_label: cohortLabel,
    session_type_badge,
    room_number: period.room_no || period.room_number || period.room || 'Room 301',
    room: period.room_no || period.room_number || period.room || 'Room 301',
    room_no: period.room_no || period.room_number || period.room || 'Room 301',
    is_ongoing,
    remaining_minutes,
    elapsed_minutes,
    total_duration,
    progress_percentage
  };
}

// ==========================================
// 1. GET /api/timetable/faculty/my-schedule
// ==========================================
router.get('/faculty/my-schedule', optionalAuth, async (req, res) => {
  try {
    const data = db.getFallbackData();
    const allUsers = data.users || [];

    // Resolve target faculty ID
    let targetFacultyId = req.query.faculty_id;
    if (!targetFacultyId) {
      if (req.user && (req.user.role === 'faculty' || req.user.role === 'instructor')) {
        targetFacultyId = req.user.id;
      } else {
        targetFacultyId = 'user-faculty-01'; // Default: Prof. Sarah Jenkins
      }
    }

    const { day_of_week, semester, department, session_type } = req.query;

    let periods = [...(data.timetable_periods || [])].filter(p => p.faculty_id === targetFacultyId);

    if (day_of_week) {
      periods = periods.filter(p => p.day_of_week.toLowerCase() === day_of_week.toLowerCase());
    }
    if (semester) {
      const semNorm = semester.toUpperCase().startsWith('S') ? semester.toUpperCase() : `S${semester}`;
      periods = periods.filter(p => p.semester === semNorm);
    }
    if (department) {
      const deptNorm = department.toUpperCase().replace('DEPT-', '');
      periods = periods.filter(p => p.department === deptNorm);
    }
    if (session_type) {
      periods = periods.filter(p => p.session_type.toLowerCase() === session_type.toLowerCase());
    }

    // Chronological sorting: day_of_week then start_time
    periods.sort((a, b) => {
      const dDiff = (dayOrder[a.day_of_week] || 99) - (dayOrder[b.day_of_week] || 99);
      if (dDiff !== 0) return dDiff;
      const aMin = parseTimeToMinutes(a.start_time) || 0;
      const bMin = parseTimeToMinutes(b.start_time) || 0;
      return aMin - bMin;
    });

    const now = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const enriched = periods.map(p => enrichPeriod(p, allUsers, currentDayName, currentMinutes));
    const active_period = enriched.find(p => p.is_ongoing) || null;

    const facUser = allUsers.find(u => u.id === targetFacultyId);

    return res.json({
      success: true,
      faculty: {
        id: targetFacultyId,
        name: facUser?.name || 'Prof. Sarah Jenkins',
        email: facUser?.email || 'faculty@apex.edu',
        department: facUser?.department_id || 'dept-cs'
      },
      current_day: currentDayName,
      active_period,
      count: enriched.length,
      data: enriched
    });
  } catch (err) {
    console.error('[Faculty Schedule Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch faculty timetable.' });
  }
});

// ==========================================
// 2. GET /api/timetable/student/my-schedule
// ==========================================
router.get('/student/my-schedule', optionalAuth, async (req, res) => {
  try {
    const data = db.getFallbackData();
    const allUsers = data.users || [];

    let dept = req.query.department;
    let sem = req.query.semester;

    // If logged in student, resolve from profile
    if ((!dept || !sem) && req.user) {
      const sp = (data.student_profiles || []).find(p => p.user_id === req.user.id);
      if (sp) {
        if (!dept && sp.batch_id) {
          const b = (data.batches || []).find(batch => batch.id === sp.batch_id);
          dept = b ? b.name.slice(0, 2) : 'CS';
        }
        if (!sem && sp.current_semester) {
          sem = `S${sp.current_semester}`;
        }
      }
    }

    // Default student cohort: CS-S4 (Alex Rivera)
    if (!dept) dept = 'CS';
    if (!sem) sem = 'S4';

    dept = dept.toUpperCase().replace('DEPT-', '');
    sem = sem.toUpperCase().startsWith('S') ? sem.toUpperCase() : `S${sem}`;

    const { day_of_week } = req.query;

    let periods = [...(data.timetable_periods || [])].filter(p => p.department === dept && p.semester === sem);

    if (day_of_week) {
      periods = periods.filter(p => p.day_of_week.toLowerCase() === day_of_week.toLowerCase());
    }

    // Chronological sorting
    periods.sort((a, b) => {
      const dDiff = (dayOrder[a.day_of_week] || 99) - (dayOrder[b.day_of_week] || 99);
      if (dDiff !== 0) return dDiff;
      const aMin = parseTimeToMinutes(a.start_time) || 0;
      const bMin = parseTimeToMinutes(b.start_time) || 0;
      return aMin - bMin;
    });

    const now = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const enriched = periods.map(p => enrichPeriod(p, allUsers, currentDayName, currentMinutes));
    const active_period = enriched.find(p => p.is_ongoing) || null;

    return res.json({
      success: true,
      cohort: {
        department: dept,
        semester: sem,
        cohort_key: `${dept}-${sem}`,
        academic_year: sem === 'S1' || sem === 'S2' ? '1st Year' : sem === 'S3' || sem === 'S4' ? '2nd Year' : '3rd Year'
      },
      current_day: currentDayName,
      active_period,
      count: enriched.length,
      data: enriched
    });
  } catch (err) {
    console.error('[Student Schedule Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch student timetable.' });
  }
});

// ==========================================
// 3. GET /api/timetable/periods (Universal)
// ==========================================
router.get('/periods', optionalAuth, async (req, res) => {
  try {
    const data = db.getFallbackData();
    const allUsers = data.users || [];

    let periods = [...(data.timetable_periods || [])];
    const { department, semester, faculty_id, day_of_week, academic_year, session_type } = req.query;

    if (department) {
      const deptNorm = department.toUpperCase().replace('DEPT-', '');
      periods = periods.filter(p => p.department === deptNorm);
    }
    if (semester) {
      const semNorm = semester.toUpperCase().startsWith('S') ? semester.toUpperCase() : `S${semester}`;
      periods = periods.filter(p => p.semester === semNorm);
    }
    if (faculty_id) {
      periods = periods.filter(p => p.faculty_id === faculty_id);
    }
    if (day_of_week) {
      periods = periods.filter(p => p.day_of_week.toLowerCase() === day_of_week.toLowerCase());
    }
    if (academic_year) {
      periods = periods.filter(p => p.academic_year.toLowerCase() === academic_year.toLowerCase());
    }
    if (session_type) {
      periods = periods.filter(p => p.session_type.toLowerCase() === session_type.toLowerCase());
    }

    periods.sort((a, b) => {
      const dDiff = (dayOrder[a.day_of_week] || 99) - (dayOrder[b.day_of_week] || 99);
      if (dDiff !== 0) return dDiff;
      const aMin = parseTimeToMinutes(a.start_time) || 0;
      const bMin = parseTimeToMinutes(b.start_time) || 0;
      return aMin - bMin;
    });

    const now = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const enriched = periods.map(p => enrichPeriod(p, allUsers, currentDayName, currentMinutes));

    return res.json({
      success: true,
      count: enriched.length,
      data: enriched
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch timetable periods.' });
  }
});

// ==========================================
// 4. GET /api/timetable/live-status
// ==========================================
router.get('/live-status', optionalAuth, async (req, res) => {
  try {
    const data = db.getFallbackData();
    const allUsers = data.users || [];

    const now = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const { role, faculty_id, department, semester } = req.query;
    let pool = [...(data.timetable_periods || [])];

    if (role === 'faculty' || faculty_id) {
      const facId = faculty_id || (req.user?.role === 'faculty' ? req.user.id : 'user-faculty-01');
      pool = pool.filter(p => p.faculty_id === facId);
    } else {
      const dept = (department || 'CS').toUpperCase().replace('DEPT-', '');
      const sem = (semester || 'S4').toUpperCase().startsWith('S') ? (semester || 'S4').toUpperCase() : `S${semester || '4'}`;
      pool = pool.filter(p => p.department === dept && p.semester === sem);
    }

    const todayPeriods = pool.filter(p => p.day_of_week === currentDayName);
    const enriched = todayPeriods.map(p => enrichPeriod(p, allUsers, currentDayName, currentMinutes));
    const active = enriched.find(p => p.is_ongoing) || null;

    return res.json({
      success: true,
      is_live: !!active,
      current_day: currentDayName,
      server_time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      active_period: active
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to check live status.' });
  }
});

module.exports = router;
