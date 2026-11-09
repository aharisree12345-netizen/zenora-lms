import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { colors, typography } from '../theme/colors';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

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

export function ScheduleScreen({ onNavigate }) {
  const { user } = useAuth();
  const isFacultyRole = ['faculty', 'instructor'].includes(user?.role);
  const isStudentRole = user?.role === 'student';
  const isAdminRole = ['super_admin', 'institution_admin'].includes(user?.role);

  // View Mode: 'faculty' or 'cohort'
  const [viewMode, setViewMode] = useState(isFacultyRole ? 'faculty' : (isStudentRole ? 'cohort' : 'faculty'));
  
  // Faculty selector for Admin or Faculty viewing
  const [facultyList, setFacultyList] = useState([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState(user?.role === 'faculty' ? user.id : 'user-faculty-01');

  // Cohort selectors (CS, EC, ME and S1-S6)
  const [selectedDept, setSelectedDept] = useState(user?.student_profile?.department || 'CS');
  const [selectedSem, setSelectedSem] = useState(user?.student_profile?.current_semester ? `S${user.student_profile.current_semester}` : 'S4');

  const todayDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
  const initialDay = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(todayDayName) ? todayDayName : 'Monday';

  const [activeDay, setActiveDay] = useState(initialDay);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendanceSummary, setAttendanceSummary] = useState(null);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const departments = ['CS', 'EC', 'ME'];
  const semesters = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

  // Real-time clock tick every 10 seconds to update Live Now status
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Load faculty list for administrative selector
  useEffect(() => {
    if (isAdminRole) {
      loadFacultyList();
    }
  }, [isAdminRole]);

  async function loadFacultyList() {
    try {
      const res = await api.getFaculty();
      if (res.ok && res.data.success) {
        setFacultyList(res.data.data || []);
      }
    } catch (e) {
      console.warn('Failed to load faculty list', e);
    }
  }

  // Load schedule whenever relevant selectors change
  useEffect(() => {
    loadTimetable();
  }, [viewMode, selectedFacultyId, selectedDept, selectedSem]);

  // Load student attendance KPI summary if student
  useEffect(() => {
    if (isStudentRole) {
      loadAttendanceSummary();
    }
  }, [isStudentRole]);

  async function loadAttendanceSummary() {
    try {
      const res = await api.getAttendanceSummary();
      if (res.ok && res.data.success) {
        setAttendanceSummary(res.data);
      }
    } catch (e) {
      console.warn('Failed to load attendance summary', e);
    }
  }

  async function loadTimetable() {
    setLoading(true);
    try {
      if (viewMode === 'faculty') {
        const res = await api.getFacultySchedule({ faculty_id: selectedFacultyId });
        if (res.ok && res.data.success) {
          setPeriods(res.data.data || []);
        } else {
          setPeriods([]);
        }
      } else {
        const res = await api.getStudentSchedule({ department: selectedDept, semester: selectedSem });
        if (res.ok && res.data.success) {
          setPeriods(res.data.data || []);
        } else {
          setPeriods([]);
        }
      }
    } catch (err) {
      console.error('Failed to load timetable:', err);
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  }

  // Handle direct redirection to Daily Attendance Register
  function handleTakeAttendance(session) {
    if (!onNavigate) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const slotStr = `${session.start_time} - ${session.end_time}`;
    onNavigate('attendance', {
      department: session.department,
      semester: session.semester,
      subject_code: session.subject_code,
      subject_name: session.subject_name,
      date: todayStr,
      slot: slotStr
    });
  }

  const filteredPeriods = periods.filter(p => p.day_of_week === activeDay);

  const currentDayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentTime.getDay()];
  const isTodayTab = activeDay === currentDayOfWeek;
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  // Find active ongoing session right now matching real-time device clock
  const livePeriod = isTodayTab ? filteredPeriods.find(p => {
    const sMin = parseTimeToMinutes(p.start_time);
    const eMin = parseTimeToMinutes(p.end_time);
    if (sMin === null || eMin === null) return false;
    return currentMinutes >= sMin && currentMinutes < eMin;
  }) : null;

  const liveStartMins = livePeriod ? parseTimeToMinutes(livePeriod.start_time) : 0;
  const liveEndMins = livePeriod ? parseTimeToMinutes(livePeriod.end_time) : 0;
  const liveRemainingMins = livePeriod ? (liveEndMins - currentMinutes) : 0;
  const liveElapsedMins = livePeriod ? (currentMinutes - liveStartMins) : 0;
  const liveTotalDuration = (livePeriod && liveEndMins > liveStartMins) ? (liveEndMins - liveStartMins) : 60;
  const liveProgressPct = liveTotalDuration > 0 ? Math.min(100, Math.round((liveElapsedMins / liveTotalDuration) * 100)) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Page Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.pageTitle}>
              {viewMode === 'faculty' ? 'Faculty Teaching Schedule' : 'Academic Class Timetable'}
            </Text>
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>Synchronized Relational Engine</Text>
            </View>
          </View>
          <Text style={styles.pageSub}>
            {viewMode === 'faculty'
              ? 'Weekly teaching allocations, laboratory sessions, and instantaneous attendance marking'
              : 'Institutional class schedule with live hall location and assigned professor allocations'}
          </Text>
        </View>

        {/* Action Controls & Selectors */}
        <View style={styles.controlsWrap}>
          {/* Admin / Switcher Buttons */}
          {isAdminRole && (
            <View style={styles.viewToggleGroup}>
              <TouchableOpacity
                style={[styles.toggleBtn, viewMode === 'faculty' && styles.toggleBtnActive]}
                onPress={() => setViewMode('faculty')}
              >
                <Text style={[styles.toggleBtnText, viewMode === 'faculty' && styles.toggleBtnTextActive]}>
                  👨‍🏫 Faculty View
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, viewMode === 'cohort' && styles.toggleBtnActive]}
                onPress={() => setViewMode('cohort')}
              >
                <Text style={[styles.toggleBtnText, viewMode === 'cohort' && styles.toggleBtnTextActive]}>
                  🎓 Class Cohort View
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Faculty Selector (For Admins) */}
          {viewMode === 'faculty' && isAdminRole && facultyList.length > 0 && (
            <View style={styles.selectorItem}>
              <Text style={styles.selectorLabel}>Select Faculty:</Text>
              <select
                style={webSelectStyle}
                value={selectedFacultyId}
                onChange={(e) => setSelectedFacultyId(e.target.value)}
              >
                {facultyList.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.designation || 'Faculty'})</option>
                ))}
              </select>
            </View>
          )}

          {/* Cohort Department & Semester Selectors (For Student/Cohort View) */}
          {viewMode === 'cohort' && (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <View style={styles.selectorItem}>
                <Text style={styles.selectorLabel}>Department:</Text>
                <select
                  style={webSelectStyle}
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                >
                  {departments.map(d => (
                    <option key={d} value={d}>Dept {d}</option>
                  ))}
                </select>
              </View>

              <View style={styles.selectorItem}>
                <Text style={styles.selectorLabel}>Semester:</Text>
                <select
                  style={webSelectStyle}
                  value={selectedSem}
                  onChange={(e) => setSelectedSem(e.target.value)}
                >
                  {semesters.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </View>
            </View>
          )}

          {/* Quick Nav to Attendance Register */}
          <TouchableOpacity
            style={styles.directAttendanceBtn}
            onPress={() => onNavigate && onNavigate('attendance')}
            activeOpacity={0.8}
          >
            <Text style={styles.directAttendanceBtnText}>📋 Attendance Register →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* REAL-TIME LIVE NOW / ONGOING LECTURE HERO BANNER */}
      {livePeriod && (
        <View style={styles.liveBannerCard}>
          <View style={styles.liveBannerTopRow}>
            <View style={styles.liveBadgeAnimated}>
              <View style={styles.livePulseDot} />
              <Text style={styles.liveBadgeAnimatedText}>🔴 LIVE NOW • ONGOING SESSION</Text>
            </View>
            <View style={styles.countdownBadge}>
              <Text style={styles.countdownText}>
                ⏱️ {liveRemainingMins} mins remaining (Ends at {livePeriod.end_time})
              </Text>
            </View>
          </View>

          <View style={styles.liveTitleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.liveSubjectTitle}>
                {livePeriod.subject_code} - {livePeriod.subject_name}
              </Text>
              <View style={styles.liveBadgeRow}>
                {/* Visual Badge: Year & Cohort */}
                <View style={styles.cohortPill}>
                  <Text style={styles.cohortPillText}>
                    🎓 {livePeriod.year_cohort_label || '2nd Year (S3/S4)'} • {livePeriod.department} ({livePeriod.semester})
                  </Text>
                </View>

                {/* Visual Badge: Session Type */}
                <View style={livePeriod.session_type === 'lab' ? styles.labBadge : styles.theoryBadge}>
                  <Text style={livePeriod.session_type === 'lab' ? styles.labBadgeText : styles.theoryBadgeText}>
                    {livePeriod.session_type === 'lab' ? '🔬 LAB / PRACTICAL' : 'THEORY'}
                  </Text>
                </View>

                {/* Visual Badge: Room / Venue */}
                <View style={styles.roomPill}>
                  <Text style={styles.roomPillText}>
                    {livePeriod.session_type === 'lab' ? '🔬' : '📍'} {livePeriod.room_no}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Action Button: Take Attendance */}
            {(isFacultyRole || isAdminRole) && (
              <TouchableOpacity
                style={styles.takeAttendanceHeroBtn}
                onPress={() => handleTakeAttendance(livePeriod)}
                activeOpacity={0.85}
              >
                <Text style={styles.takeAttendanceHeroBtnText}>📋 Take Attendance</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.liveMetaRow}>
            <View style={styles.liveMetaItem}>
              <Text style={styles.liveMetaLabel}>ASSIGNED PROFESSOR</Text>
              <Text style={styles.liveMetaValue}>👨‍🏫 {livePeriod.faculty_name}</Text>
            </View>
            <View style={styles.liveMetaItem}>
              <Text style={styles.liveMetaLabel}>VENUE / LAB HALL</Text>
              <Text style={[styles.liveMetaValue, { color: colors.accentAmber }]}>
                {livePeriod.session_type === 'lab' ? '🔬 ' : '📍 '}
                {livePeriod.room_no}
              </Text>
            </View>
            <View style={styles.liveMetaItem}>
              <Text style={styles.liveMetaLabel}>SCHEDULED TIMINGS</Text>
              <Text style={styles.liveMetaValue}>⏰ {livePeriod.start_time} - {livePeriod.end_time}</Text>
            </View>
          </View>

          {/* Session Progress Bar */}
          <View style={styles.liveProgressWrap}>
            <View style={styles.liveProgressHeader}>
              <Text style={styles.liveProgressLabel}>Session Elapsed: {liveElapsedMins}m of {liveTotalDuration}m</Text>
              <Text style={styles.liveProgressPct}>{liveProgressPct}% Complete</Text>
            </View>
            <View style={styles.liveProgressBarTrack}>
              <View style={[styles.liveProgressBarFill, { width: `${liveProgressPct}%` }]} />
            </View>
          </View>
        </View>
      )}

      {/* STUDENT ATTENDANCE KPI DASHBOARD BANNER */}
      {isStudentRole && attendanceSummary && (
        <View style={styles.attendanceSummaryCard}>
          <View style={styles.attendanceTopRow}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 24 }}>📊</Text>
                <Text style={styles.attCardTitle}>My Attendance Engine & Eligibility</Text>
              </View>
              <Text style={styles.attCardFormula}>
                Formula: (Total Present Sessions / Total Conducted Sessions) * 100
              </Text>
            </View>

            <View style={styles.attPercentBadge}>
              <Text style={styles.attPercentVal}>{attendanceSummary.overall?.attendance_percentage || '96.4%'}</Text>
              <Text style={styles.attPercentLabel}>
                {attendanceSummary.overall?.eligible_for_exams ? '✓ Regular (>75% Met)' : '⚠️ Low Attendance (<75%)'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Day Selector Navigation Tabs (Mon - Fri) */}
      <View style={styles.dayTabs}>
        {days.map(d => {
          const isCurrentToday = d === currentDayOfWeek;
          return (
            <TouchableOpacity
              key={d}
              style={[styles.dayBtn, activeDay === d && styles.dayBtnActive]}
              onPress={() => setActiveDay(d)}
              activeOpacity={0.8}
            >
              <Text style={[styles.dayBtnText, activeDay === d && styles.dayBtnTextActive]}>
                {d} {isCurrentToday ? '• Today' : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Period Cards Grid */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : filteredPeriods.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={{ fontSize: 36, marginBottom: 8 }}>📅</Text>
          <Text style={styles.emptyTitle}>No scheduled lecture periods for {activeDay}</Text>
          <Text style={styles.emptySub}>
            {viewMode === 'faculty'
              ? 'No teaching sessions assigned to this faculty on this day.'
              : `No timetable periods scheduled for cohort ${selectedDept}-${selectedSem} on ${activeDay}.`}
          </Text>
        </View>
      ) : (
        <View style={styles.periodGrid}>
          {filteredPeriods.map((item, idx) => {
            const sMin = parseTimeToMinutes(item.start_time);
            const eMin = parseTimeToMinutes(item.end_time);
            const isLive = isTodayTab && sMin !== null && eMin !== null && (currentMinutes >= sMin && currentMinutes < eMin);
            const remainingMins = isLive ? (eMin - currentMinutes) : 0;
            const isLab = (item.session_type || '').toLowerCase() === 'lab';

            return (
              <View
                key={item.id || idx}
                style={[
                  styles.periodCard,
                  isLive && styles.periodCardLive
                ]}
              >
                {/* Live Header if slot is currently ongoing */}
                {isLive && (
                  <View style={styles.cardLiveHeaderRow}>
                    <View style={styles.cardLiveBadge}>
                      <View style={styles.cardLivePulseDot} />
                      <Text style={styles.cardLiveBadgeText}>🔴 LIVE NOW • ONGOING</Text>
                    </View>
                    <View style={styles.cardRemainingBadge}>
                      <Text style={styles.cardRemainingText}>
                        ⏱️ {remainingMins} mins left
                      </Text>
                    </View>
                  </View>
                )}

                {/* Badge Row 1: Time & Session Type */}
                <View style={styles.cardTopBadgeRow}>
                  <View style={[styles.timePill, isLive && styles.timePillLive]}>
                    <Text style={[styles.timeText, isLive && styles.timeTextLive]}>
                      ⏰ {item.start_time} - {item.end_time}
                    </Text>
                  </View>

                  {/* Highlighted Visual Badge: [THEORY] vs [🔬 LAB / PRACTICAL] */}
                  <View style={isLab ? styles.labBadge : styles.theoryBadge}>
                    <Text style={isLab ? styles.labBadgeText : styles.theoryBadgeText}>
                      {isLab ? '🔬 LAB / PRACTICAL' : 'THEORY'}
                    </Text>
                  </View>
                </View>

                {/* Badge Row 2: Year & Cohort alongside Department */}
                <View style={styles.cohortAndVenueRow}>
                  <View style={styles.cohortPill}>
                    <Text style={styles.cohortPillText}>
                      🎓 {item.year_cohort_label || '2nd Year (S3/S4)'} • {item.department} ({item.semester})
                    </Text>
                  </View>

                  {/* Room / Venue Badge */}
                  <View style={styles.roomPill}>
                    <Text style={styles.roomPillText}>
                      {isLab ? '🔬 ' : '📍 '}
                      {item.room_no}
                    </Text>
                  </View>
                </View>

                {/* Subject Details */}
                <View style={styles.cardSubjectBlock}>
                  <Text style={[styles.subCode, isLive && styles.subCodeLive]}>{item.subject_code}</Text>
                  <Text style={[styles.subName, isLive && styles.subNameLive]} numberOfLines={2}>
                    {item.subject_name}
                  </Text>
                </View>

                {/* Instructor Attribution */}
                <View style={styles.facultyRow}>
                  <Text style={[styles.facultyName, isLive && styles.facultyNameLive]}>
                    👨‍🏫 {item.faculty_name || 'Prof. Sarah Jenkins'}
                  </Text>
                </View>

                {/* Quick Action Button: 'Take Attendance' */}
                {(isFacultyRole || isAdminRole) && (
                  <View style={styles.cardActionRow}>
                    <TouchableOpacity
                      style={[styles.takeAttendanceCardBtn, isLive && styles.takeAttendanceCardBtnLive]}
                      onPress={() => handleTakeAttendance(item)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.takeAttendanceCardBtnText}>
                        📋 Take Attendance
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const webSelectStyle = {
  backgroundColor: '#0F172A',
  color: '#F8FAFC',
  border: '1px solid #334155',
  borderRadius: 8,
  padding: '7px 12px',
  fontSize: 13,
  outline: 'none',
  cursor: 'pointer'
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark },
  content: { padding: 24, maxWidth: 1400, alignSelf: 'center', width: '100%' },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  pageTitle: { fontSize: 24, fontWeight: typography.weight.bold, color: colors.textPrimary },
  headerBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  headerBadgeText: { color: colors.primaryLight, fontSize: 11, fontWeight: typography.weight.bold },
  pageSub: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },

  controlsWrap: { flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  viewToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 3
  },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  toggleBtnActive: { backgroundColor: colors.primary },
  toggleBtnText: { color: colors.textSecondary, fontSize: 12, fontWeight: typography.weight.semibold },
  toggleBtnTextActive: { color: '#FFF' },

  selectorItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectorLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: typography.weight.semibold },

  directAttendanceBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: colors.accentEmerald,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8
  },
  directAttendanceBtnText: { color: colors.accentEmerald, fontSize: 12, fontWeight: typography.weight.bold },

  // LIVE HERO BANNER
  liveBannerCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 14,
    padding: 20,
    borderWidth: 2,
    borderColor: '#6366F1',
    marginBottom: 24,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8
  },
  liveBannerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12
  },
  liveBadgeAnimated: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)'
  },
  livePulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444'
  },
  liveBadgeAnimatedText: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8
  },
  countdownBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  countdownText: { color: '#E0E7FF', fontSize: 12, fontWeight: typography.weight.semibold },

  liveTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 16
  },
  liveSubjectTitle: {
    fontSize: 22,
    fontWeight: typography.weight.bold,
    color: '#FFF',
    marginBottom: 8
  },
  liveBadgeRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' },

  takeAttendanceHeroBtn: {
    backgroundColor: colors.accentEmerald,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: colors.accentEmerald,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4
  },
  takeAttendanceHeroBtnText: { color: '#FFF', fontSize: 13, fontWeight: typography.weight.bold },

  liveMetaRow: {
    flexDirection: 'row',
    gap: 24,
    flexWrap: 'wrap',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 14
  },
  liveMetaItem: { minWidth: 140 },
  liveMetaLabel: { color: '#A5B4FC', fontSize: 10, fontWeight: typography.weight.bold, letterSpacing: 0.5 },
  liveMetaValue: { color: '#FFF', fontSize: 13, fontWeight: typography.weight.semibold, marginTop: 4 },

  liveProgressWrap: { marginTop: 4 },
  liveProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  liveProgressLabel: { color: '#C7D2FE', fontSize: 11, fontWeight: typography.weight.medium },
  liveProgressPct: { color: '#818CF8', fontSize: 11, fontWeight: typography.weight.bold },
  liveProgressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 3,
    overflow: 'hidden'
  },
  liveProgressBarFill: {
    height: '100%',
    backgroundColor: '#818CF8',
    borderRadius: 3
  },

  // Student Attendance KPI Banner
  attendanceSummaryCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 20
  },
  attendanceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12
  },
  attCardTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: typography.weight.bold },
  attCardFormula: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  attPercentBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: colors.accentEmerald,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center'
  },
  attPercentVal: { color: colors.accentEmerald, fontSize: 18, fontWeight: typography.weight.bold },
  attPercentLabel: { color: colors.accentEmerald, fontSize: 10, fontWeight: typography.weight.semibold, marginTop: 2 },

  // Day Navigation Tabs
  dayTabs: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  dayBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  dayBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayBtnText: { color: colors.textSecondary, fontSize: 13, fontWeight: typography.weight.semibold },
  dayBtnTextActive: { color: '#FFF' },

  // Period Cards Grid
  periodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  periodCard: {
    flex: 1,
    minWidth: 320,
    maxWidth: 440,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: 'space-between'
  },
  periodCardLive: {
    borderColor: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderWidth: 2
  },

  cardLiveHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  cardLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  cardLivePulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  cardLiveBadgeText: { color: '#F87171', fontSize: 10, fontWeight: typography.weight.bold },
  cardRemainingBadge: { backgroundColor: 'rgba(99, 102, 241, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  cardRemainingText: { color: colors.primaryLight, fontSize: 10, fontWeight: typography.weight.bold },

  cardTopBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10
  },
  timePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  timePillLive: { backgroundColor: 'rgba(99, 102, 241, 0.2)' },
  timeText: { color: colors.textSecondary, fontSize: 11, fontWeight: typography.weight.semibold },
  timeTextLive: { color: colors.primaryLight, fontWeight: typography.weight.bold },

  // Visual Badges
  theoryBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  theoryBadgeText: { color: '#38BDF8', fontSize: 10, fontWeight: typography.weight.bold },

  labBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: colors.accentEmerald,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  labBadgeText: { color: colors.accentEmerald, fontSize: 10, fontWeight: typography.weight.bold },

  cohortAndVenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  cohortPill: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  cohortPillText: { color: colors.primaryLight, fontSize: 11, fontWeight: typography.weight.bold },

  roomPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  roomPillText: { color: colors.accentAmber, fontSize: 11, fontWeight: typography.weight.bold },

  cardSubjectBlock: { marginBottom: 10 },
  subCode: { color: colors.textMuted, fontSize: 12, fontWeight: typography.weight.bold, textTransform: 'uppercase' },
  subCodeLive: { color: colors.primaryLight },
  subName: { color: colors.textPrimary, fontSize: 15, fontWeight: typography.weight.bold, marginTop: 2, minHeight: 40 },
  subNameLive: { color: '#FFF' },

  facultyRow: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 10
  },
  facultyName: { color: colors.textSecondary, fontSize: 12 },
  facultyNameLive: { color: colors.textPrimary, fontWeight: typography.weight.semibold },

  cardActionRow: { marginTop: 4 },
  takeAttendanceCardBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: colors.accentEmerald,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center'
  },
  takeAttendanceCardBtnLive: {
    backgroundColor: colors.accentEmerald,
    borderColor: colors.accentEmerald
  },
  takeAttendanceCardBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: typography.weight.bold
  },

  center: { paddingVertical: 60, alignItems: 'center' },
  emptyCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 50,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: typography.weight.bold },
  emptySub: { color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' }
});
