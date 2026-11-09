import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { colors, typography } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { GlassCard } from '../components/GlassCard';
import { Badge } from '../components/Badge';

function parseStanding(stats) {
  if (stats?.exam_score_pts && stats?.exam_count_label) {
    const badgeText = stats.exam_count_label.startsWith('(') ? stats.exam_count_label : `(${stats.exam_count_label})`;
    return {
      value: stats.exam_score_pts,
      badge: badgeText
    };
  }
  const raw = stats?.overall_academic_standing;
  if (!raw) return { value: '92.5 pts', badge: '(13 Exams)' };
  const str = String(raw).trim();
  const match = str.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) {
    const val = match[1].trim();
    let badgeText = match[2].trim();
    if (/^\d+\s*exams?$/i.test(badgeText)) {
      badgeText = badgeText.replace(/exams?/i, 'Exams');
    }
    return { value: val, badge: `(${badgeText})` };
  }
  return { value: str, badge: null };
}

function MetricCard({ icon, iconBg, value, badge, badgeType = 'default', label, tooltip }) {
  const [hovered, setHovered] = useState(false);

  return (
    <View
      style={[
        styles.metricCard,
        hovered && styles.metricCardHovered
      ]}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      accessibilityLabel={tooltip || `${value} ${label}`}
      title={tooltip || `${value} ${label}`}
    >
      <View style={[styles.metricIconWrap, { backgroundColor: iconBg }]}>
        <Text style={styles.metricIcon}>{icon}</Text>
      </View>
      <View style={styles.metricContentCol}>
        <Text style={styles.metricValue}>{value}</Text>
        {badge ? (
          <View style={styles.subBadgeRow}>
            <View style={
              badgeType === 'emerald' ? styles.metricSubBadgeEmerald :
              badgeType === 'amber' ? styles.metricSubBadgeAmber :
              badgeType === 'violet' ? styles.metricSubBadgeViolet :
              badgeType === 'blue' ? styles.metricSubBadgeBlue :
              styles.metricSubBadge
            }>
              <Text style={
                badgeType === 'emerald' ? styles.metricSubBadgeEmeraldText :
                badgeType === 'amber' ? styles.metricSubBadgeAmberText :
                badgeType === 'violet' ? styles.metricSubBadgeVioletText :
                badgeType === 'blue' ? styles.metricSubBadgeBlueText :
                styles.metricSubBadgeText
              }>{badge}</Text>
            </View>
          </View>
        ) : null}
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
    </View>
  );
}

export function DashboardScreen({ onNavigate }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Academic Cohort Filter State (For Faculty & Admin)
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time clock tick every 10 seconds to update Live Now indicator
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedBatchOrSem, setSelectedBatchOrSem] = useState('all');
  const [cohortTab, setCohortTab] = useState('students'); // 'students' | 'courses' | 'assignments'

  useEffect(() => {
    loadDashboard();
  }, [user?.id, user?.role]);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const schedulePromise = (user?.role === 'faculty' || user?.role === 'instructor')
        ? (api.getFacultySchedule ? api.getFacultySchedule({ faculty_id: user.id }) : Promise.resolve({ ok: false }))
        : (api.getStudentSchedule ? api.getStudentSchedule({
            department: user?.student_profile?.department || 'CS',
            semester: user?.student_profile?.current_semester ? `S${user.student_profile.current_semester}` : 'S4'
          }) : Promise.resolve({ ok: false }));

      const [statsRes, deptRes, batchRes, studRes, subjRes, asgRes, annRes, schRes] = await Promise.all([
        api.getDashboardStats().catch(() => ({ ok: false })),
        api.getDepartments().catch(() => ({ ok: false })),
        api.getBatches().catch(() => ({ ok: false })),
        api.getStudents().catch(() => ({ ok: false })),
        api.getSubjects().catch(() => ({ ok: false })),
        api.getAssignments().catch(() => ({ ok: false })),
        api.getAnnouncements().catch(() => ({ ok: false })),
        schedulePromise.catch(() => ({ ok: false }))
      ]);

      if (statsRes.ok && statsRes.data?.success) {
        setData(statsRes.data);
      } else {
        setError(statsRes.data?.message || 'Failed to load college analytics.');
      }

      if (deptRes.ok && deptRes.data?.success) setDepartments(deptRes.data.data || []);
      if (batchRes.ok && batchRes.data?.success) setBatches(batchRes.data.data || []);
      if (studRes.ok && studRes.data?.success) setStudents(studRes.data.data || []);
      if (subjRes.ok && subjRes.data?.success) setSubjects(subjRes.data.data || []);
      if (asgRes.ok && asgRes.data?.success) setAssignments(asgRes.data.data || []);
      if (annRes.ok && annRes.data?.success) setAnnouncements(annRes.data.data || []);
      if (schRes && schRes.ok && schRes.data?.success) setSchedules(schRes.data.data || []);
    } catch (err) {
      console.error('[Dashboard Error]', err);
      setError('Unable to reach backend service.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading College LMS Academic Dashboard...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ fontSize: 36, marginBottom: 12 }}>⚠️</Text>
        <Text style={[styles.loadingText, { color: colors.accentRose, marginBottom: 16 }]}>
          {error || 'Unable to load dashboard data.'}
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadDashboard}>
          <Text style={styles.retryBtnText}>🔄 Retry Connection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const role = user?.role === 'instructor' ? 'faculty' : (user?.role || 'student');
  const isFacultyOrAdmin = ['super_admin', 'institution_admin', 'faculty', 'instructor'].includes(user?.role);
  const stats = data.stats || {};
  const studentInfo = data.student_info || user?.student_profile;

  // Active notices for student dashboard
  const activeNotices = announcements.length > 0 ? announcements : (data.recent_announcements || []);
  const importantNotices = activeNotices.filter(n => {
    const p = (n.priority || '').toLowerCase();
    return p === 'important' || p === 'urgent' || p === 'high';
  });

  // Filtered Cohort Data for Faculty & Admin
  const filteredStudents = students.filter(s => {
    if (selectedDept !== 'all' && s.department_id !== selectedDept) return false;
    if (selectedBatchOrSem !== 'all') {
      if (selectedBatchOrSem.startsWith('sem-')) {
        const semNum = parseInt(selectedBatchOrSem.replace('sem-', ''), 10);
        if (s.semester !== semNum && s.current_semester !== semNum) return false;
      } else if (s.batch_id !== selectedBatchOrSem) {
        return false;
      }
    }
    return true;
  });

  const filteredSubjects = subjects.filter(sub => {
    if (selectedDept !== 'all' && sub.department_id !== selectedDept) return false;
    if (selectedBatchOrSem !== 'all') {
      if (selectedBatchOrSem.startsWith('sem-')) {
        const semNum = parseInt(selectedBatchOrSem.replace('sem-', ''), 10);
        if (sub.semester !== semNum) return false;
      } else {
        const matchBatch = batches.find(b => b.id === selectedBatchOrSem);
        if (matchBatch && sub.semester !== matchBatch.semester) return false;
      }
    }
    return true;
  });

  const filteredAssignments = assignments.filter(a => {
    if (selectedDept !== 'all') {
      const matchSub = subjects.find(s => s.id === a.subject_id);
      if (matchSub && matchSub.department_id !== selectedDept) return false;
    }
    if (selectedBatchOrSem !== 'all') {
      if (selectedBatchOrSem.startsWith('sem-')) {
        const semNum = parseInt(selectedBatchOrSem.replace('sem-', ''), 10);
        const matchSub = subjects.find(s => s.id === a.subject_id);
        if (matchSub && matchSub.semester !== semNum) return false;
      } else if (a.batch_id && a.batch_id !== selectedBatchOrSem) {
        return false;
      }
    }
    return true;
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayName = dayNames[new Date().getDay()];
  const activeDay = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(todayDayName) ? todayDayName : 'Monday';

  const todaysClasses = schedules.filter(s => s.day_of_week === activeDay);
  const displayClasses = todaysClasses.length > 0 ? todaysClasses : [
    {
      id: 'sch-cs-s4-mon-p1',
      session_slot: 'Period 1 (08:45 AM - 09:40 AM)',
      start_time: '08:45 AM',
      end_time: '09:40 AM',
      subject_code: 'CS401',
      subject_name: 'Database Management Systems',
      faculty_name: 'Prof. Sarah Jenkins',
      room_number: 'Tech Block CS-401'
    },
    {
      id: 'sch-cs-s4-mon-p2',
      session_slot: 'Period 2 (09:40 AM - 10:35 AM)',
      start_time: '09:40 AM',
      end_time: '10:35 AM',
      subject_code: 'CS402',
      subject_name: 'Operating Systems',
      faculty_name: 'Dr. Marcus Sterling',
      room_number: 'Tech Block CS-401'
    },
    {
      id: 'sch-cs-s4-mon-p3',
      session_slot: 'Period 3 (10:50 AM - 11:45 AM)',
      start_time: '10:50 AM',
      end_time: '11:45 AM',
      subject_code: 'CS403',
      subject_name: 'Design & Analysis of Algorithms',
      faculty_name: 'Dr. Priya Sharma',
      room_number: 'Tech Block CS-401'
    },
    {
      id: 'sch-cs-s4-mon-p4',
      session_slot: 'Period 4 (01:30 PM - 04:30 PM)',
      start_time: '01:30 PM',
      end_time: '04:30 PM',
      subject_code: 'CS404',
      subject_name: 'DBMS Laboratory Practical',
      faculty_name: 'Prof. Sarah Jenkins',
      room_number: 'Database Lab 104'
    }
  ];

  function parseTimeToMinutes(timeStr) {
    if (!timeStr) return null;
    const str = String(timeStr).trim();
    const match = str.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridiem = match[3] ? match[3].toUpperCase() : null;
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  function getSlotStatus(item) {
    const sMin = parseTimeToMinutes(item.start_time);
    const eMin = parseTimeToMinutes(item.end_time);
    const isToday = activeDay === todayDayName;

    if (!isToday || sMin === null || eMin === null) {
      return { label: 'Upcoming', isOngoing: false, badgeStyle: styles.slotBadgeUpcoming, textStyle: styles.slotBadgeTextUpcoming };
    }

    if (currentMinutes >= sMin && currentMinutes < eMin) {
      const remaining = eMin - currentMinutes;
      return {
        label: `LIVE NOW (${remaining}m left)`,
        isOngoing: true,
        badgeStyle: styles.slotBadgeOngoing,
        textStyle: styles.slotBadgeTextOngoing
      };
    } else if (currentMinutes >= eMin) {
      return {
        label: 'Completed ✓',
        isOngoing: false,
        badgeStyle: styles.slotBadgeCompleted,
        textStyle: styles.slotBadgeTextCompleted
      };
    } else {
      return {
        label: 'Upcoming',
        isOngoing: false,
        badgeStyle: styles.slotBadgeUpcoming,
        textStyle: styles.slotBadgeTextUpcoming
      };
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* College Welcome Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerHeader}>
          <View>
            <View style={styles.collegeBadgeRow}>
              <Text style={styles.collegeEmblem}>🏛️</Text>
              <Text style={styles.collegeName}>ZENORA COLLEGE OF ENGINEERING & TECHNOLOGY</Text>
              <View style={styles.accreditPill}>
                <Text style={styles.accreditText}>NAAC A++</Text>
              </View>
            </View>
            <Text style={styles.welcomeGreeting}>
              Welcome, {user?.name || studentInfo?.name || 'Academic User'}
            </Text>
            <Text style={styles.welcomeSub}>
              {role === 'super_admin' && 'College Administrator & Academic Audit Control Center'}
              {role === 'faculty' && `Department of ${user?.department_name || 'Computer Science & Engineering'} • Faculty Teaching & Assessment Portal`}
              {role === 'student' && `Batch: ${studentInfo?.batch_name || user?.student_profile?.batch_name || 'Class 2024-2028'} • Roll: ${studentInfo?.roll_no || user?.student_profile?.roll_no || 'CS-2024-001'} • Reg: ${studentInfo?.register_no || user?.student_profile?.register_no || '312424104001'}`}
            </Text>
          </View>
        </View>

        {/* Quick Persona Tips */}
        <View style={styles.bannerFooter}>
          <Text style={styles.bannerFooterText}>
            💡 Tip: Switch portals instantly in the top bar as <Text style={{ color: colors.primaryLight, fontWeight: 'bold' }}>Admin</Text>, <Text style={{ color: colors.accentEmerald, fontWeight: 'bold' }}>Faculty</Text>, or <Text style={{ color: colors.accentAmber, fontWeight: 'bold' }}>Student</Text> to test all cohort features.
          </Text>
        </View>
      </View>



      {role === 'student' ? (
        <View style={styles.studentDashboardWrap}>
          {/* ========================================================= */}
          {/* BLOCK 1 (TOP ROW): COMPACT KPI SUMMARY CARDS (4 CARDS)   */}
          {/* ========================================================= */}
          {(() => {
            const standing = parseStanding(stats);
            const attPct = data.attendance_summary?.percentage || stats.attendance_percentage || '96.4%';
            const attSessions = data.attendance_summary 
              ? `(${data.attendance_summary.total_present}/${data.attendance_summary.total_held} Sessions)` 
              : '(27/28 Sessions)';

            return (
              <View style={styles.metricsGrid}>
                {/* 1. Current SGPA / Academic Standing */}
                <MetricCard
                  icon="🏆"
                  iconBg="rgba(16, 185, 129, 0.15)"
                  value={standing.value}
                  badge={standing.badge || 'Distinction'}
                  badgeType="emerald"
                  label="Current SGPA / Standing"
                  tooltip="Semester 4 Cumulative SGPA: 8.92 (CBCS Autonomous Regulations)"
                  onPress={() => onNavigate('certificates')}
                />

                {/* 2. Overall Attendance Rate */}
                <MetricCard
                  icon="📊"
                  iconBg="rgba(59, 130, 246, 0.15)"
                  value={attPct}
                  badge={attSessions}
                  badgeType="emerald"
                  label="Overall Attendance"
                  tooltip="Institutional Requirement: Minimum 75.0% for Examination Hall Ticket"
                  onPress={() => onNavigate('attendance')}
                />

                {/* 3. Pending Assignments */}
                <MetricCard
                  icon="📑"
                  iconBg="rgba(139, 92, 246, 0.15)"
                  value={`${stats.pending_assignments ?? 0} Due`}
                  badge={`(${stats.graded_assignments ?? 1} Graded)`}
                  badgeType="violet"
                  label="Pending Assignments"
                  tooltip="Continuous Internal Assessments (CIA) and Lab Reports"
                  onPress={() => onNavigate('assignments')}
                />

                {/* 4. Active Exams */}
                <MetricCard
                  icon="📝"
                  iconBg="rgba(245, 158, 11, 0.15)"
                  value={`${stats.upcoming_exams ?? 3} Active`}
                  badge="CAT 1 & CAT 2"
                  badgeType="amber"
                  label="Active Exams"
                  tooltip="Internal Assessments and Semester End Examinations"
                  onPress={() => onNavigate('exams')}
                />
              </View>
            );
          })()}

          {/* ========================================================= */}
          {/* BLOCK 2 (MIDDLE ROW): TODAY'S ONGOING CLASS & TIMETABLE  */}
          {/* ========================================================= */}
          <View style={styles.studentCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.iconCircle}>
                  <Text style={{ fontSize: 18 }}>📅</Text>
                </View>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.cardHeaderTitle}>Today's Ongoing Class & Live Timetable</Text>
                    <View style={styles.livePulsePill}>
                      <View style={styles.livePulseDot} />
                      <Text style={styles.livePulseText}>LIVE</Text>
                    </View>
                  </View>
                  <Text style={styles.cardHeaderSub}>
                    {activeDay} Schedule • {displayClasses.length} Academic Periods • Batch {studentInfo?.batch_name || user?.student_profile?.batch_name || 'CS-S4'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.cardHeaderAction}
                onPress={() => onNavigate('schedule')}
                activeOpacity={0.8}
              >
                <Text style={styles.cardHeaderActionText}>Full Timetable →</Text>
              </TouchableOpacity>
            </View>

            {/* Timetable Period Grid */}
            <View style={styles.timetableSlotsContainer}>
              {displayClasses.map((item, idx) => {
                const status = getSlotStatus(item);
                const isLab = (item.session_type || '').toLowerCase() === 'lab';
                return (
                  <View
                    key={item.id || idx}
                    style={[
                      styles.slotCard,
                      status.isOngoing && styles.slotCardOngoing
                    ]}
                  >
                    <View style={styles.slotTopRow}>
                      <View style={[styles.slotBadge, status.badgeStyle]}>
                        <Text style={[styles.slotBadgeText, status.textStyle]}>{status.label}</Text>
                      </View>
                      <Text style={styles.slotTimeText}>{item.start_time} - {item.end_time}</Text>
                    </View>

                    <View style={styles.slotBody}>
                      <View style={styles.slotSubjectHeader}>
                        <View style={styles.slotCodePill}>
                          <Text style={styles.slotCodeText}>{item.subject_code || `CS${401 + idx}`}</Text>
                        </View>
                        <Text style={styles.slotRoomText}>
                          {isLab ? '🔬 ' : '📍 '}
                          {item.room_no || item.room_number || 'Tech Block CS-401'}
                        </Text>
                      </View>
                      <Text style={styles.slotSubjectName} numberOfLines={1}>{item.subject_name}</Text>
                      <Text style={styles.slotFacultyText}>👨‍🏫 {item.faculty_name || 'Department Faculty'}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ========================================================= */}
          {/* BLOCK 3 (BOTTOM ROW): SINGLE COMPACT ACADEMIC NOTICES    */}
          {/* ========================================================= */}
          <View style={styles.studentCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                  <Text style={{ fontSize: 18 }}>📢</Text>
                </View>
                <View>
                  <Text style={styles.cardHeaderTitle}>Academic Notices</Text>
                  <Text style={styles.cardHeaderSub}>
                    Official institutional circulars for {studentInfo?.department_name || 'Computer Science & Engineering'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.cardHeaderAction}
                onPress={() => onNavigate('announcements')}
                activeOpacity={0.8}
              >
                <Text style={styles.cardHeaderActionText}>All Notices ({activeNotices.length}) →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.noticeListCompact}>
              {activeNotices.slice(0, 4).map((notice, idx) => {
                const isHighPriority = ['important', 'urgent', 'high'].includes((notice.priority || '').toLowerCase());
                const deptTag = notice.target_department || notice.department_code || 'ALL';
                const semTag = notice.target_semester ? ` • Sem ${notice.target_semester}` : '';
                const formattedDate = notice.date || (notice.created_at ? new Date(notice.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent');

                return (
                  <TouchableOpacity
                    key={notice.id || idx}
                    style={[styles.noticeRowCompact, idx === 0 && { borderTopWidth: 0 }]}
                    onPress={() => onNavigate('announcements')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.noticeRowLeft}>
                      <View style={styles.noticeMetaRow}>
                        <View style={styles.deptBadge}>
                          <Text style={styles.deptBadgeText}>[{deptTag}{semTag}]</Text>
                        </View>
                        <View style={[styles.cleanPriorityPill, isHighPriority ? styles.cleanPriorityHigh : styles.cleanPriorityNormal]}>
                          <Text style={[styles.cleanPriorityText, isHighPriority ? styles.cleanPriorityHighText : styles.cleanPriorityNormalText]}>
                            {isHighPriority ? 'HIGH PRIORITY' : 'CIRCULAR'}
                          </Text>
                        </View>
                        <Text style={styles.noticeDateCompact}>📅 {formattedDate}</Text>
                      </View>
                      <Text style={styles.noticeTitleCompact}>{notice.title}</Text>
                      <Text style={styles.noticeSnippetCompact} numberOfLines={1}>{notice.content}</Text>
                    </View>
                    <Text style={styles.noticeChevron}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      ) : (
        <>
          {/* KPI Metrics Cards for Faculty & Super Admin */}
          <View style={styles.metricsGrid}>
            {role === 'super_admin' && (
              <>
                <MetricCard
                  icon="👨‍🎓"
                  iconBg="rgba(99, 102, 241, 0.15)"
                  value={stats.total_students || students.length || 6}
                  badge="Enrolled Cohort"
                  label="Total Students"
                  tooltip="Total Enrolled Students Across All Departments"
                />
                <MetricCard
                  icon="👨‍🏫"
                  iconBg="rgba(16, 185, 129, 0.15)"
                  value={stats.total_faculty || 3}
                  badge="Active Faculty"
                  badgeType="emerald"
                  label="Teaching Faculty"
                  tooltip="Active Teaching Faculty"
                />
                <MetricCard
                  icon="🏛️"
                  iconBg="rgba(245, 158, 11, 0.15)"
                  value={stats.total_departments || departments.length || 4}
                  badge="Accredited"
                  badgeType="amber"
                  label="Departments"
                  tooltip="Accredited Academic Departments"
                />
                <MetricCard
                  icon="📝"
                  iconBg="rgba(236, 72, 153, 0.15)"
                  value={stats.total_exams || 3}
                  badge="Scheduled"
                  badgeType="violet"
                  label="Active Exams"
                  tooltip="Current Semester Examinations Scheduled"
                />
              </>
            )}

            {role === 'faculty' && (
              <>
                <MetricCard
                  icon="📚"
                  iconBg="rgba(99, 102, 241, 0.15)"
                  value={stats.assigned_subjects || 2}
                  badge="Current Term"
                  label="Assigned Subjects"
                  tooltip="Assigned Subjects For This Semester"
                />
                <MetricCard
                  icon="👨‍🎓"
                  iconBg="rgba(16, 185, 129, 0.15)"
                  value={stats.total_students_enrolled || students.length || 6}
                  badge="CSE Cohort"
                  badgeType="emerald"
                  label="Class Strength"
                  tooltip="Total Students in Enrolled Batches"
                />
                <MetricCard
                  icon="📝"
                  iconBg="rgba(245, 158, 11, 0.15)"
                  value={stats.active_exams || 2}
                  badge="CAT 1 & 2"
                  badgeType="amber"
                  label="Examinations"
                  tooltip="Internal Assessments & CAT Exams"
                />
                <MetricCard
                  icon="⏳"
                  iconBg="rgba(239, 68, 68, 0.15)"
                  value={stats.pending_grading_queue || 1}
                  badge="Action Required"
                  badgeType="violet"
                  label="Pending Grades"
                  tooltip="Submissions Awaiting Faculty Evaluation"
                />
              </>
            )}
          </View>

      {/* Quick Action Buttons */}
      <View style={styles.quickActionsRow}>
        {role === 'faculty' && (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
              onPress={() => onNavigate('attendance')}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnIcon}>📋</Text>
              <Text style={styles.actionBtnText}>Attendance Register</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#4F46E5' }]}
              onPress={() => onNavigate('reports')}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnIcon}>📊</Text>
              <Text style={styles.actionBtnText}>Internal Marks Calculation Sheet</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={() => onNavigate('exams')}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnIcon}>📝</Text>
          <Text style={styles.actionBtnText}>
            {role === 'student' ? 'View Exam Marksheets' : 'Enter Split Exam Marks'}
          </Text>
        </TouchableOpacity>

        {role !== 'student' && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#1E293B', borderWidth: 1, borderColor: colors.borderLight }]}
            onPress={() => onNavigate('students')}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnIcon}>👨‍🎓</Text>
            <Text style={styles.actionBtnText}>Master Student Directory</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#1E293B', borderWidth: 1, borderColor: colors.borderLight }]}
          onPress={() => onNavigate('assignments')}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnIcon}>📑</Text>
          <Text style={styles.actionBtnText}>
            {role === 'student' ? 'Submit Assignments' : 'Grade Assignments'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#1E293B', borderWidth: 1, borderColor: colors.borderLight }]}
          onPress={() => onNavigate('materials')}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnIcon}>📚</Text>
          <Text style={styles.actionBtnText}>Syllabus & Lecture Notes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#1E293B', borderWidth: 1, borderColor: colors.borderLight }]}
          onPress={() => onNavigate('announcements')}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnIcon}>📢</Text>
          <Text style={styles.actionBtnText}>Notice Board</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#1E293B', borderWidth: 1, borderColor: colors.borderLight }]}
          onPress={() => onNavigate('calendar')}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnIcon}>🗓️</Text>
          <Text style={styles.actionBtnText}>Academic Calendar</Text>
        </TouchableOpacity>
      </View>

      {/* FACULTY: TODAY'S ASSIGNED TEACHING SCHEDULE & SYNCHRONIZED LIVE CLASS */}
      {role === 'faculty' && (
        <View style={styles.facultyScheduleCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                <Text style={{ fontSize: 18 }}>📅</Text>
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.cardHeaderTitle}>Today's Assigned Teaching Schedule</Text>
                  <View style={styles.livePulsePill}>
                    <View style={styles.livePulseDot} />
                    <Text style={styles.livePulseText}>LIVE SYNC</Text>
                  </View>
                </View>
                <Text style={styles.cardHeaderSub}>
                  {activeDay} Schedule • {displayClasses.length} Teaching Allocations • {user?.name || 'Prof. Sarah Jenkins'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.cardHeaderAction}
              onPress={() => onNavigate('schedule')}
              activeOpacity={0.8}
            >
              <Text style={styles.cardHeaderActionText}>Full Teaching Timetable →</Text>
            </TouchableOpacity>
          </View>

          {displayClasses.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>No teaching sessions scheduled for today ({activeDay}).</Text>
            </View>
          ) : (
            <View style={styles.timetableSlotsContainer}>
              {displayClasses.map((item, idx) => {
                const status = getSlotStatus(item);
                const isLab = (item.session_type || '').toLowerCase() === 'lab';
                return (
                  <View
                    key={item.id || idx}
                    style={[
                      styles.slotCard,
                      status.isOngoing && styles.slotCardOngoing
                    ]}
                  >
                    <View style={styles.slotTopRow}>
                      <View style={[styles.slotBadge, status.badgeStyle]}>
                        <Text style={[styles.slotBadgeText, status.textStyle]}>{status.label}</Text>
                      </View>
                      <Text style={styles.slotTimeText}>{item.start_time} - {item.end_time}</Text>
                    </View>

                    <View style={styles.slotBody}>
                      <View style={styles.slotSubjectHeader}>
                        <View style={styles.slotCodePill}>
                          <Text style={styles.slotCodeText}>{item.subject_code}</Text>
                        </View>
                        <Text style={styles.slotRoomText}>
                          {isLab ? '🔬 ' : '📍 '}
                          {item.room_no || item.room_number || 'Room 302'}
                        </Text>
                      </View>
                      <Text style={styles.slotSubjectName} numberOfLines={1}>{item.subject_name}</Text>
                      <Text style={styles.slotFacultyText}>
                        🎓 {item.year_cohort_label || item.academic_year || '2nd Year'} • {item.department} ({item.semester}) • {isLab ? '[🔬 LAB]' : '[THEORY]'}
                      </Text>
                    </View>

                    {/* Quick Action Button: 'Take Attendance' */}
                    <TouchableOpacity
                      style={[
                        styles.dashAttendanceBtn,
                        status.isOngoing && styles.dashAttendanceBtnLive
                      ]}
                      onPress={() => onNavigate('attendance', {
                        department: item.department,
                        semester: item.semester,
                        subject_code: item.subject_code,
                        subject_name: item.subject_name,
                        date: new Date().toISOString().split('T')[0],
                        slot: `${item.start_time} - ${item.end_time}`
                      })}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.dashAttendanceBtnText}>📋 Take Attendance</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* ADMIN: SUMMARIZED INSTITUTIONAL DISTRIBUTION WIDGETS (NO RAW LIST DUMPS) */}
      {(role === 'super_admin' || role === 'institution_admin') && (
        <View style={styles.adminSummaryContainer}>
          {/* Card 1: Student Cohort Summary */}
          <View style={styles.adminSummaryCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                  <Text style={{ fontSize: 18 }}>👨‍🎓</Text>
                </View>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.cardHeaderTitle}>Student Cohort Summary</Text>
                    <View style={styles.summaryCountPill}>
                      <Text style={styles.summaryCountPillText}>
                        {data.cohort_summary?.total_students || stats.total_students || 39} Enrolled Students
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.cardHeaderSub}>
                    Year-wise Student Distribution & Department Cohort Breakdown
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.cardHeaderAction}
                onPress={() => onNavigate('students')}
                activeOpacity={0.8}
              >
                <Text style={styles.cardHeaderActionText}>Open Student Directory →</Text>
              </TouchableOpacity>
            </View>

            {/* Year-Wise Breakdown: 1st Year (S1/S2 count), 2nd Year (S3/S4 count), 3rd Year (S5/S6 count) */}
            <View style={styles.yearGrid}>
              {(data.cohort_summary?.year_wise || [
                { year_label: '1st Year', semesters: 'S1 / S2', count: 12 },
                { year_label: '2nd Year', semesters: 'S3 / S4', count: 15 },
                { year_label: '3rd Year', semesters: 'S5 / S6', count: 12 }
              ]).map((yr, idx) => (
                <View key={idx} style={styles.yearCard}>
                  <Text style={styles.yearCardLabel}>{yr.year_label}</Text>
                  <Text style={styles.yearCardSem}>Semesters {yr.semesters}</Text>
                  <Text style={styles.yearCardCount}>{yr.count} Students</Text>
                </View>
              ))}
            </View>

            {/* Department Split Chips: CS, EC, and ME totals */}
            <View style={styles.deptSplitSection}>
              <Text style={styles.deptSplitLabel}>DEPARTMENT SPLIT TOTALS</Text>
              <View style={styles.deptSplitChipsWrap}>
                <View style={[styles.deptSplitChip, { backgroundColor: 'rgba(99, 102, 241, 0.12)', borderColor: 'rgba(99, 102, 241, 0.35)' }]}>
                  <Text style={[styles.deptSplitCode, { color: colors.primaryLight }]}>CS</Text>
                  <Text style={styles.deptSplitName}>Computer Science & Engg</Text>
                  <View style={[styles.deptSplitBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.deptSplitBadgeText}>15 Students</Text>
                  </View>
                </View>

                <View style={[styles.deptSplitChip, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.35)' }]}>
                  <Text style={[styles.deptSplitCode, { color: colors.accentEmerald }]}>EC</Text>
                  <Text style={styles.deptSplitName}>Electronics & Comm Engg</Text>
                  <View style={[styles.deptSplitBadge, { backgroundColor: colors.accentEmerald }]}>
                    <Text style={styles.deptSplitBadgeText}>12 Students</Text>
                  </View>
                </View>

                <View style={[styles.deptSplitChip, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.35)' }]}>
                  <Text style={[styles.deptSplitCode, { color: colors.accentAmber }]}>ME</Text>
                  <Text style={styles.deptSplitName}>Mechanical Engineering</Text>
                  <View style={[styles.deptSplitBadge, { backgroundColor: colors.accentAmber }]}>
                    <Text style={styles.deptSplitBadgeText}>12 Students</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Row with 2 Summary Widgets: Faculty Summary & Institutional Health */}
          <View style={styles.adminSplitRow}>
            {/* Card 2: Faculty Summary (11 Total: 3 CS, 3 EC, 3 ME, 2 Common) */}
            <View style={[styles.adminSummaryCard, { flex: 1, minWidth: 320 }]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <Text style={{ fontSize: 18 }}>👨‍🏫</Text>
                  </View>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.cardHeaderTitle}>Faculty Summary</Text>
                      <View style={[styles.summaryCountPill, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                        <Text style={[styles.summaryCountPillText, { color: colors.accentEmerald }]}>
                          11 Total
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.cardHeaderSub}>
                      11 Total Faculty: 3 CS, 3 EC, 3 ME, 2 Common
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.cardHeaderAction}
                  onPress={() => onNavigate('faculty-directory')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cardHeaderActionText}>Manage Faculty Directory →</Text>
                </TouchableOpacity>
              </View>

              {/* Department allocations displayed cleanly in a compact card */}
              <View style={styles.facultyAllocGrid}>
                <View style={styles.facultyAllocCard}>
                  <View style={styles.facultyAllocTop}>
                    <Text style={[styles.facultyAllocCode, { color: colors.primaryLight }]}>Computer Science (CS)</Text>
                    <Text style={styles.facultyAllocVal}>3 Faculty</Text>
                  </View>
                  <Text style={styles.facultyAllocSub}>Prof. Sarah Jenkins, Dr. Marcus Sterling, Prof. Alan Turing</Text>
                </View>

                <View style={styles.facultyAllocCard}>
                  <View style={styles.facultyAllocTop}>
                    <Text style={[styles.facultyAllocCode, { color: colors.accentEmerald }]}>Electronics & Comm (EC)</Text>
                    <Text style={styles.facultyAllocVal}>3 Faculty</Text>
                  </View>
                  <Text style={styles.facultyAllocSub}>Dr. Robert Taylor, Dr. Meera Nambiar, Prof. Vikram Malhotra</Text>
                </View>

                <View style={styles.facultyAllocCard}>
                  <View style={styles.facultyAllocTop}>
                    <Text style={[styles.facultyAllocCode, { color: colors.accentAmber }]}>Mechanical Engg (ME)</Text>
                    <Text style={styles.facultyAllocVal}>3 Faculty</Text>
                  </View>
                  <Text style={styles.facultyAllocSub}>Dr. James Anderson, Prof. Rajesh Kulkarni, Prof. David Miller</Text>
                </View>

                <View style={styles.facultyAllocCard}>
                  <View style={styles.facultyAllocTop}>
                    <Text style={[styles.facultyAllocCode, { color: '#C084FC' }]}>Common (Basic Sciences)</Text>
                    <Text style={styles.facultyAllocVal}>2 Faculty</Text>
                  </View>
                  <Text style={styles.facultyAllocSub}>Dr. Priya Sharma, Prof. Catherine Vance</Text>
                </View>
              </View>
            </View>

            {/* Card 3: Institutional Health */}
            <View style={[styles.adminSummaryCard, { flex: 1, minWidth: 320 }]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                    <Text style={{ fontSize: 18 }}>🏥</Text>
                  </View>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.cardHeaderTitle}>Institutional Health</Text>
                      <View style={[styles.summaryCountPill, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
                        <Text style={[styles.summaryCountPillText, { color: colors.accentAmber }]}>
                          Autonomous
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.cardHeaderSub}>
                      Core Academic Performance & Operations
                    </Text>
                  </View>
                </View>

                <View style={styles.accreditPill}>
                  <Text style={styles.accreditText}>NAAC A++</Text>
                </View>
              </View>

              <View style={styles.healthKpiGrid}>
                <View style={styles.healthKpiItem}>
                  <Text style={styles.healthKpiLabel}>AVERAGE ATTENDANCE</Text>
                  <Text style={[styles.healthKpiValue, { color: colors.accentEmerald }]}>
                    {data.institutional_health?.average_attendance || '96.4%'}
                  </Text>
                  <Text style={styles.healthKpiSub}>Classroom & Lab Sessions</Text>
                </View>

                <View style={styles.healthKpiItem}>
                  <Text style={styles.healthKpiLabel}>ACTIVE ASSESSMENTS</Text>
                  <Text style={[styles.healthKpiValue, { color: colors.primaryLight }]}>
                    {data.institutional_health?.active_assessments || 5}
                  </Text>
                  <Text style={styles.healthKpiSub}>Exams & Assignment Tasks</Text>
                </View>

                <View style={styles.healthKpiItem}>
                  <Text style={styles.healthKpiLabel}>TODAY'S SCHEDULED CLASSES</Text>
                  <Text style={[styles.healthKpiValue, { color: colors.accentAmber }]}>
                    {data.institutional_health?.today_scheduled_classes || 72}
                  </Text>
                  <Text style={styles.healthKpiSub}>Periods Across CS, EC, ME</Text>
                </View>
              </View>

              <View style={styles.healthMetaNotice}>
                <Text style={styles.healthMetaNoticeText}>
                  🏛️ NBA Tier-1 Autonomous • Affiliated to Anna University • Academic Year 2025 - 2026
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Two Column Layout: Today's Timetable & Notices */}
      <View style={styles.gridTwoCol}>
        {/* Today's Academic Timetable */}
        <View style={styles.colCard}>
          <View style={styles.colHeader}>
            <View style={styles.colHeaderLeft}>
              <Text style={styles.colIcon}>📅</Text>
              <Text style={styles.colTitle}>Today's Class Schedule</Text>
            </View>
            <TouchableOpacity onPress={() => onNavigate('schedule')}>
              <Text style={styles.viewAllText}>Full Timetable →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.scheduleList}>
            {[
              { time: '09:00 AM - 10:00 AM', subject: 'CS8492 Database Management Systems', room: 'Room 302', faculty: 'Prof. Sarah Jenkins' },
              { time: '10:00 AM - 11:00 AM', subject: 'CS8491 Design & Analysis of Algorithms', room: 'Room 302', faculty: 'Dr. Marcus Sterling' },
              { time: '11:15 AM - 12:15 PM', subject: 'MA8402 Probability & Queueing Theory', room: 'Room 302', faculty: 'Dr. Priya Sharma' },
              { time: '01:30 PM - 04:30 PM', subject: 'CS8481 DBMS Laboratory Practical', room: 'Lab 104', faculty: 'Prof. Sarah Jenkins' }
            ].map((period, idx) => (
              <View key={idx} style={styles.periodRow}>
                <View style={styles.periodTimeBox}>
                  <Text style={styles.periodTimeText}>{period.time}</Text>
                  <Text style={styles.periodRoomText}>{period.room}</Text>
                </View>
                <View style={styles.periodInfo}>
                  <Text style={styles.periodSubjectText}>{period.subject}</Text>
                  <Text style={styles.periodFacultyText}>Faculty: {period.faculty}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Academic Circulars & Bulletins (Summary view) */}
        <View style={styles.colCard}>
          <View style={styles.colHeader}>
            <View style={styles.colHeaderLeft}>
              <Text style={styles.colIcon}>📢</Text>
              <Text style={styles.colTitle}>College Circulars & Notices</Text>
            </View>
            <TouchableOpacity onPress={() => onNavigate('announcements')}>
              <Text style={styles.viewAllText}>All Notices →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.noticeList}>
            {activeNotices.slice(0, 3).map((notice, idx) => {
              const isImportant = ['important', 'urgent', 'high'].includes((notice.priority || '').toLowerCase());
              return (
                <View key={idx} style={[styles.noticeItem, isImportant && styles.noticeItemImportant]}>
                  <View style={styles.noticeHeaderRow}>
                    <View style={[
                      styles.priorityPill,
                      isImportant && styles.priorityUrgent
                    ]}>
                      <Text style={styles.priorityText}>
                        {isImportant ? 'HIGH PRIORITY' : 'CIRCULAR'}
                      </Text>
                    </View>
                    <Text style={styles.noticeDate}>
                      {notice.date || (notice.created_at ? new Date(notice.created_at).toLocaleDateString() : 'Recent')}
                    </Text>
                  </View>
                  <Text style={styles.noticeTitle}>{notice.title}</Text>
                  <Text style={styles.noticeContent} numberOfLines={2}>{notice.content}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
        </>
      )}
    </ScrollView>
  );
}

const filterSelectStyle = {
  backgroundColor: colors.bgDark,
  color: colors.textPrimary,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '12px',
  outline: 'none',
  minWidth: '200px'
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark
  },
  content: {
    padding: 24,
    maxWidth: 1300,
    width: '100%',
    alignSelf: 'center'
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    marginTop: 12
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: typography.weight.bold
  },
  banner: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 20,
    ...Platform.select({
      web: { boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)' }
    })
  },
  bannerHeader: {
    marginBottom: 12
  },
  collegeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  collegeEmblem: {
    fontSize: 18,
    marginRight: 8
  },
  collegeName: {
    fontSize: 12,
    fontWeight: typography.weight.bold,
    color: colors.primaryLight,
    letterSpacing: 0.8
  },
  accreditPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  accreditText: {
    color: colors.accentEmerald,
    fontSize: 10,
    fontWeight: typography.weight.bold
  },
  welcomeGreeting: {
    fontSize: 22,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary
  },
  welcomeSub: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: 4
  },
  bannerFooter: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)'
  },
  bannerFooterText: {
    color: colors.textSecondary,
    fontSize: 12
  },

  /* Student Notice Section */
  studentNoticeSection: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    marginBottom: 24,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 10
  },
  sectionHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap'
  },
  sectionIcon: { fontSize: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary
  },
  sectionAlertBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  sectionAlertBadgeText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: typography.weight.bold
  },
  viewAllNoticesLink: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: typography.weight.bold
  },
  studentNoticesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14
  },
  studentNoticeCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: colors.bgDark,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  studentNoticeCardImportant: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.04)'
  },
  studentNoticeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6
  },
  studentNoticeBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noticePillImportant: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  noticePillImportantText: { color: '#EF4444', fontSize: 9, fontWeight: typography.weight.bold },
  noticePillNormal: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  noticePillNormalText: { color: '#60A5FA', fontSize: 9, fontWeight: typography.weight.bold },
  noticeDeptPill: { color: colors.textSecondary, fontSize: 10 },
  studentNoticeDate: { color: colors.textMuted, fontSize: 10 },
  studentNoticeTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: typography.weight.bold,
    marginBottom: 6
  },
  studentNoticeBody: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8
  },
  studentNoticeAuthor: { color: colors.textMuted, fontSize: 11, fontStyle: 'italic' },

  /* Metrics Grid */
  metricsGrid: {
    marginBottom: 24,
    ...Platform.select({
      web: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16,
        width: '100%'
      },
      default: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16
      }
    })
  },
  metricCard: {
    backgroundColor: '#131b2e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: 144,
    width: '100%',
    boxSizing: 'border-box',
    ...Platform.select({
      web: {
        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s ease, box-shadow 0.2s ease',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
        cursor: 'default'
      },
      default: {
        flex: 1,
        minWidth: 160
      }
    })
  },
  metricCardHovered: {
    borderColor: 'rgba(99, 102, 241, 0.45)',
    ...Platform.select({
      web: {
        transform: 'translateY(-2px)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)'
      }
    })
  },
  metricIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  metricIcon: {
    fontSize: 20
  },
  metricContentCol: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%'
  },
  metricValue: {
    fontSize: 22,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 4,
    ...Platform.select({
      web: {
        wordBreak: 'break-word',
        overflowWrap: 'break-word'
      }
    })
  },
  subBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4
  },
  metricSubBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    alignSelf: 'flex-start'
  },
  metricSubBadgeText: {
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: typography.weight.bold
  },
  metricSubBadgeEmerald: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    alignSelf: 'flex-start'
  },
  metricSubBadgeEmeraldText: {
    color: colors.accentEmerald,
    fontSize: 10,
    fontWeight: typography.weight.bold
  },
  metricSubBadgeAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    alignSelf: 'flex-start'
  },
  metricSubBadgeAmberText: {
    color: colors.accentAmber,
    fontSize: 10,
    fontWeight: typography.weight.bold
  },
  metricSubBadgeViolet: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    alignSelf: 'flex-start'
  },
  metricSubBadgeVioletText: {
    color: colors.accentViolet,
    fontSize: 10,
    fontWeight: typography.weight.bold
  },
  metricSubBadgeBlue: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    alignSelf: 'flex-start'
  },
  metricSubBadgeBlueText: {
    color: '#60A5FA',
    fontSize: 10,
    fontWeight: typography.weight.bold
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
    lineHeight: 16,
    ...Platform.select({
      web: {
        wordBreak: 'break-word',
        overflowWrap: 'break-word'
      }
    })
  },

  /* Quick Actions */
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10
  },
  actionBtnIcon: {
    fontSize: 16,
    marginRight: 8
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: typography.weight.semibold
  },

  /* 2. Academic Cohort Filter Component */
  cohortFilterCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 24,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
  },
  cohortHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 18
  },
  cohortTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  cohortTitleIcon: { fontSize: 22 },
  cohortTitle: { fontSize: 18, fontWeight: typography.weight.bold, color: colors.textPrimary },
  cohortSummaryBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)'
  },
  cohortSummaryBadgeText: { color: colors.primaryLight, fontSize: 11, fontWeight: typography.weight.bold },
  cohortSub: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  dropdownControlsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    flexWrap: 'wrap'
  },
  dropdownWrap: { gap: 4 },
  dropdownLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: typography.weight.medium },
  clearFilterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.bgDark,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
    height: 34,
    justifyContent: 'center'
  },
  clearFilterBtnText: { color: colors.textSecondary, fontSize: 11, fontWeight: typography.weight.bold },

  cohortTabsBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: 16,
    gap: 10
  },
  cohortTabBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  cohortTabBtnActive: {
    borderBottomColor: colors.primary
  },
  cohortTabText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: typography.weight.semibold
  },
  cohortTabTextActive: {
    color: colors.primaryLight,
    fontWeight: typography.weight.bold
  },
  cohortTabContent: {},
  emptyCohortBox: {
    padding: 36,
    alignItems: 'center',
    backgroundColor: colors.bgDark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  emptyCohortIcon: { fontSize: 32, marginBottom: 8 },
  emptyCohortTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: typography.weight.bold },
  emptyCohortSub: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },

  /* Cohort Students Table */
  tableResponsive: {
    backgroundColor: colors.bgDark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden'
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  thCell: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  rollNoText: { color: colors.primaryLight, fontSize: 12, fontWeight: typography.weight.bold },
  regNoText: { color: colors.textMuted, fontSize: 10 },
  studentNameText: { color: colors.textPrimary, fontSize: 13, fontWeight: typography.weight.semibold },
  studentEmailText: { color: colors.textSecondary, fontSize: 11 },
  deptCodeText: { color: colors.textPrimary, fontSize: 12, fontWeight: typography.weight.medium },
  batchNameText: { color: colors.textMuted, fontSize: 10 },
  semPill: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  semPillText: { color: colors.primaryLight, fontSize: 11, fontWeight: typography.weight.bold },
  attendanceText: { color: colors.accentEmerald, fontSize: 12, fontWeight: typography.weight.bold },
  actionPillBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)'
  },
  actionPillBtnText: { color: colors.primaryLight, fontSize: 11, fontWeight: typography.weight.semibold },

  /* Cohort Courses Grid */
  courseCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14
  },
  cohortCourseCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: colors.bgDark,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  courseCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  courseCodeBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5
  },
  courseCodeText: { color: colors.primaryLight, fontSize: 11, fontWeight: typography.weight.bold },
  courseSemBadge: { color: colors.textMuted, fontSize: 11 },
  courseTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: typography.weight.bold, marginBottom: 4 },
  courseDeptText: { color: colors.textSecondary, fontSize: 11, marginBottom: 10 },
  courseMetaRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  courseMetaItem: { color: colors.textMuted, fontSize: 11 },
  courseActionBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)'
  },
  courseActionBtnText: { color: colors.primaryLight, fontSize: 11, fontWeight: typography.weight.bold },

  /* Cohort Assignments Grid */
  assignmentCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14
  },
  cohortAsgCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: colors.bgDark,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  asgCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  asgSubjectText: { color: colors.primaryLight, fontSize: 11, fontWeight: typography.weight.bold },
  asgMaxMarks: { color: colors.textMuted, fontSize: 11 },
  asgTitleText: { color: colors.textPrimary, fontSize: 14, fontWeight: typography.weight.bold, marginBottom: 4 },
  asgDescText: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginBottom: 12 },
  asgStatsRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    padding: 8,
    borderRadius: 8,
    justifyContent: 'space-around',
    marginBottom: 12
  },
  asgStatItem: { alignItems: 'center' },
  asgStatVal: { color: colors.textPrimary, fontSize: 14, fontWeight: typography.weight.bold },
  asgStatLbl: { color: colors.textMuted, fontSize: 10 },
  asgGradeBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center'
  },
  asgGradeBtnText: { color: '#FFF', fontSize: 11, fontWeight: typography.weight.bold },

  /* Two Column Layout */
  gridTwoCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20
  },
  colCard: {
    flex: 1,
    minWidth: 320,
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 20
  },
  colHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  colHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  colIcon: {
    fontSize: 18,
    marginRight: 8
  },
  colTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary
  },
  viewAllText: {
    color: colors.primaryLight,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold
  },
  scheduleList: {
    gap: 12
  },
  periodRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgDark,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  periodTimeBox: {
    width: 140,
    borderRightWidth: 1,
    borderRightColor: colors.borderLight,
    paddingRight: 10,
    justifyContent: 'center'
  },
  periodTimeText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: typography.weight.bold
  },
  periodRoomText: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2
  },
  periodInfo: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'center'
  },
  periodSubjectText: {
    color: colors.textPrimary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold
  },
  periodFacultyText: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2
  },
  noticeList: {
    gap: 12
  },
  noticeItem: {
    backgroundColor: colors.bgDark,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  noticeItemImportant: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444'
  },
  noticeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  priorityPill: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  priorityUrgent: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)'
  },
  priorityHigh: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)'
  },
  priorityText: {
    fontSize: 9,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary
  },
  noticeDate: {
    fontSize: 10,
    color: colors.textMuted
  },
  noticeTitle: {
    color: colors.textPrimary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    marginBottom: 4
  },
  noticeContent: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16
  },

  // Dynamic Attendance Engine & Subject Breakdown Styles
  attendanceEngineCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    marginBottom: 20,
    ...Platform.select({
      web: { boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)' }
    })
  },
  attendanceEngineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16
  },
  attendanceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 4
  },
  attendanceTitleIcon: {
    fontSize: 20
  },
  attendanceTitle: {
    fontSize: 16,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    letterSpacing: 0.3
  },
  eligibilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1
  },
  eligibilityBadgeEligible: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)'
  },
  eligibilityBadgeShortage: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)'
  },
  eligibilityBadgeText: {
    fontSize: 10,
    fontWeight: typography.weight.bold
  },
  eligibilityBadgeEligibleText: {
    color: colors.accentEmerald
  },
  eligibilityBadgeShortageText: {
    color: colors.accentRose
  },
  attendanceFormulaSub: {
    fontSize: 12,
    color: colors.textSecondary
  },
  formulaHighlight: {
    color: colors.primaryLight,
    fontWeight: typography.weight.bold
  },
  attendanceHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  overallPercentBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  overallPercentLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2
  },
  overallPercentVal: {
    fontSize: 24,
    fontWeight: typography.weight.bold
  },
  progressGaugeWrap: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 16
  },
  progressGaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8
  },
  progressGaugeLabel: {
    fontSize: 11,
    color: colors.textSecondary
  },
  progressGaugeStatus: {
    fontSize: 11,
    color: colors.accentEmerald,
    fontWeight: typography.weight.bold
  },
  progressBarBg: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 5,
    overflow: 'hidden',
    position: 'relative'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5
  },
  attMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20
  },
  attMetricItem: {
    flex: 1,
    minWidth: 140,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center'
  },
  attMetricVal: {
    fontSize: 20,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: 4
  },
  attMetricLbl: {
    fontSize: 11,
    color: colors.textSecondary
  },
  subjectBreakdownWrap: {
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden'
  },
  subjectBreakdownHeaderRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: 'rgba(15, 23, 42, 0.6)'
  },
  subjectBreakdownTitle: {
    fontSize: 13,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: 2
  },
  subjectBreakdownSub: {
    fontSize: 11,
    color: colors.textMuted
  },
  subjectAttTable: {
    width: '100%'
  },
  subjectAttThRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: 'rgba(30, 41, 59, 0.4)'
  },
  subjectAttTh: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  subjectAttTrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)'
  },
  subjectCodePill: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)'
  },
  subjectCodePillText: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: colors.primaryLight
  },
  subjectNameText: {
    fontSize: 12,
    fontWeight: typography.weight.medium,
    color: colors.textPrimary
  },
  sessionCountText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: typography.weight.medium
  },
  subPctWrap: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8
  },
  subPctText: {
    fontSize: 12,
    fontWeight: typography.weight.bold,
    marginBottom: 3
  },
  subMiniBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden'
  },
  subMiniBarFill: {
    height: '100%',
    borderRadius: 2
  },
  subStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1
  },
  subStatusPillEligible: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  subStatusPillShortage: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  subStatusPillText: {
    fontSize: 10,
    fontWeight: typography.weight.bold
  },
  subStatusPillEligibleText: {
    color: colors.accentEmerald
  },
  subStatusPillShortageText: {
    color: colors.accentRose
  },

  /* ======================================================== */
  /* STUDENT 3-BLOCK SUMMARIZED DASHBOARD STYLES             */
  /* ======================================================== */
  studentDashboardWrap: {
    gap: 18,
    marginBottom: 20
  },
  studentCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 16,
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)' }
    })
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary
  },
  cardHeaderSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  cardHeaderAction: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)'
  },
  cardHeaderActionText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: typography.weight.bold
  },
  livePulsePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981'
  },
  livePulseText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  timetableSlotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  slotCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  slotCardOngoing: {
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderColor: 'rgba(16, 185, 129, 0.4)'
  },
  slotTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  slotBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1
  },
  slotBadgeOngoing: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)'
  },
  slotBadgeCompleted: {
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    borderColor: 'rgba(100, 116, 139, 0.3)'
  },
  slotBadgeUpcoming: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.3)'
  },
  slotBadgeTextOngoing: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700'
  },
  slotBadgeTextCompleted: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600'
  },
  slotBadgeTextUpcoming: {
    color: '#818CF8',
    fontSize: 11,
    fontWeight: '600'
  },
  slotTimeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600'
  },
  slotBody: {
    gap: 4
  },
  slotSubjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  slotCodePill: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  slotCodeText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '700'
  },
  slotRoomText: {
    color: colors.textMuted,
    fontSize: 11
  },
  slotSubjectName: {
    fontSize: 14,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginVertical: 2
  },
  slotFacultyText: {
    color: colors.textSecondary,
    fontSize: 12
  },
  noticeListCompact: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  noticeRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight
  },
  noticeRowLeft: {
    flex: 1,
    paddingRight: 12
  },
  noticeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    flexWrap: 'wrap'
  },
  deptBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)'
  },
  deptBadgeText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '700'
  },
  cleanPriorityPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1
  },
  cleanPriorityHigh: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)'
  },
  cleanPriorityNormal: {
    backgroundColor: 'rgba(100, 116, 139, 0.12)',
    borderColor: 'rgba(100, 116, 139, 0.25)'
  },
  cleanPriorityHighText: {
    color: colors.accentAmber,
    fontSize: 10,
    fontWeight: '700'
  },
  cleanPriorityNormalText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600'
  },
  noticeDateCompact: {
    color: colors.textMuted,
    fontSize: 11
  },
  noticeTitleCompact: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 3
  },
  noticeSnippetCompact: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16
  },
  noticeChevron: {
    fontSize: 20,
    color: colors.textMuted,
    marginLeft: 8
  },
  facultyScheduleCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 20,
    marginBottom: 20
  },
  dashAttendanceBtn: {
    marginTop: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: colors.accentEmerald,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center'
  },
  dashAttendanceBtnLive: {
    backgroundColor: colors.accentEmerald,
    borderColor: colors.accentEmerald
  },
  dashAttendanceBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: typography.weight.bold
  },

  /* Admin Summarized Widgets */
  adminSummaryContainer: {
    marginBottom: 20,
    gap: 16
  },
  adminSummaryCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...Platform.select({
      web: { boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)' }
    })
  },
  adminSplitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  summaryCountPill: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)'
  },
  summaryCountPillText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: typography.weight.bold
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
    marginBottom: 16
  },
  yearCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: colors.bgDark,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  yearCardLabel: {
    fontSize: 13,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: 2
  },
  yearCardSem: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 6
  },
  yearCardCount: {
    fontSize: 15,
    fontWeight: typography.weight.bold,
    color: colors.primaryLight
  },
  deptSplitSection: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 12
  },
  deptSplitLabel: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8
  },
  deptSplitChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  deptSplitChip: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8
  },
  deptSplitCode: {
    fontSize: 13,
    fontWeight: typography.weight.bold
  },
  deptSplitName: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1
  },
  deptSplitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  deptSplitBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: typography.weight.bold
  },
  facultyAllocGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14
  },
  facultyAllocCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: colors.bgDark,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  facultyAllocTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  facultyAllocCode: {
    fontSize: 12,
    fontWeight: typography.weight.bold
  },
  facultyAllocVal: {
    fontSize: 12,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary
  },
  facultyAllocSub: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15
  },
  healthKpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
    marginBottom: 12
  },
  healthKpiItem: {
    flex: 1,
    minWidth: 130,
    backgroundColor: colors.bgDark,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  healthKpiLabel: {
    fontSize: 9,
    fontWeight: typography.weight.bold,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4
  },
  healthKpiValue: {
    fontSize: 18,
    fontWeight: typography.weight.bold,
    marginBottom: 2
  },
  healthKpiSub: {
    fontSize: 10,
    color: colors.textMuted
  },
  healthMetaNotice: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  healthMetaNoticeText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center'
  }
});
