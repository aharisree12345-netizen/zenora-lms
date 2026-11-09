import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { colors, typography } from '../theme/colors';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function AttendanceRegisterScreen({ initialParams }) {
  const { user } = useAuth();
  const isFaculty = user?.role === 'faculty' || user?.role === 'instructor';
  const facultyDefaultDept = user?.department_code || (user?.department_id === 'dept-ec' ? 'EC' : (user?.department_id === 'dept-me' ? 'ME' : 'CS'));

  const [departments, setDepartments] = useState([
    { id: 'dept-cs', code: 'CS', name: 'Computer Science & Engineering' },
    { id: 'dept-ec', code: 'EC', name: 'Electronics & Communication' },
    { id: 'dept-me', code: 'ME', name: 'Mechanical Engineering' }
  ]);

  const [selectedDept, setSelectedDept] = useState(
    initialParams?.department ? initialParams.department.toUpperCase().replace('DEPT-', '') : facultyDefaultDept
  );
  const [selectedSem, setSelectedSem] = useState(
    initialParams?.semester ? parseInt(String(initialParams.semester).replace('S', ''), 10) : 4
  );
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialParams?.subject_id || '');
  const [selectedDate, setSelectedDate] = useState(
    initialParams?.date || new Date().toISOString().split('T')[0]
  );
  const [selectedSlot, setSelectedSlot] = useState(
    initialParams?.slot || 'Period 1 (08:45 AM - 09:40 AM)'
  );

  // Strict Scoped Search: Do not load students by default for faculty upon page load unless pre-filled from schedule
  const [hasSearched, setHasSearched] = useState(
    Boolean(initialParams?.department && initialParams?.semester) || !isFaculty
  );

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const sessionSlots = [
    'Period 1 (08:45 AM - 09:40 AM)',
    'Period 2 (09:40 AM - 10:35 AM)',
    'Period 3 (10:50 AM - 11:45 AM)',
    'Period 4 (11:45 AM - 12:40 PM)',
    'Practical Lab (01:30 PM - 04:30 PM)'
  ];

  // Update parameters when initialParams change
  useEffect(() => {
    if (initialParams) {
      if (initialParams.department) {
        setSelectedDept(initialParams.department.toUpperCase().replace('DEPT-', ''));
      }
      if (initialParams.semester) {
        setSelectedSem(parseInt(String(initialParams.semester).replace('S', ''), 10));
      }
      if (initialParams.date) {
        setSelectedDate(initialParams.date);
      }
      if (initialParams.slot) {
        setSelectedSlot(initialParams.slot);
      }
      if (initialParams.subject_id) {
        setSelectedSubjectId(initialParams.subject_id);
      }
      setHasSearched(true);
    }
  }, [initialParams]);

  // Load all curriculum subjects
  useEffect(() => {
    loadSubjects();
  }, []);

  async function loadSubjects() {
    try {
      const res = await api.getSubjects();
      if (res.ok && res.data.success) {
        setSubjects(res.data.data || []);
      }
    } catch (e) {
      console.warn('Failed to load curriculum subjects', e);
    }
  }

  // Filter subjects matching chosen department and semester
  const availableSubjects = subjects.filter(s => {
    const semMatches = Number(s.semester) === Number(selectedSem);
    const sDept = (departments.find(d => d.id === s.department_id)?.code) || 'CS';
    const deptMatches = sDept === selectedDept || s.department_id === 'dept-bs';
    return semMatches && deptMatches;
  });

  // Auto-select matching subject (prioritizing initialParams)
  useEffect(() => {
    if (availableSubjects.length > 0) {
      if (initialParams) {
        const paramMatch = availableSubjects.find(s =>
          (initialParams.subject_id && s.id === initialParams.subject_id) ||
          (initialParams.subject_code && s.code?.toLowerCase() === initialParams.subject_code.toLowerCase()) ||
          (initialParams.subject_name && s.name?.toLowerCase().includes(initialParams.subject_name.toLowerCase()))
        );
        if (paramMatch) {
          setSelectedSubjectId(paramMatch.id);
          return;
        }
      }

      const exists = availableSubjects.some(s => s.id === selectedSubjectId);
      if (!exists) {
        setSelectedSubjectId(availableSubjects[0].id);
      }
    } else {
      setSelectedSubjectId('');
    }
  }, [selectedDept, selectedSem, subjects, initialParams]);

  // Load roster ONLY if hasSearched is true and subject selected
  useEffect(() => {
    if (hasSearched && selectedSubjectId) {
      loadRoster();
    } else if (!hasSearched) {
      setStudents([]);
    }
  }, [hasSearched, selectedDept, selectedSem, selectedSubjectId, selectedDate]);

  async function loadRoster() {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.getAttendanceRoster({
        department: selectedDept,
        semester: selectedSem,
        subject_id: selectedSubjectId,
        date: selectedDate
      });

      if (res.ok && res.data.success) {
        setStudents(res.data.students || []);
      }
    } catch (err) {
      console.error('Failed to load attendance roster', err);
    } finally {
      setLoading(false);
    }
  }

  function handleToggleStatus(studentId, newStatus) {
    setStudents(prev =>
      prev.map(st => (st.student_id === studentId ? { ...st, status: newStatus } : st))
    );
  }

  function handleUpdateRemarks(studentId, remarks) {
    setStudents(prev =>
      prev.map(st => (st.student_id === studentId ? { ...st, remarks } : st))
    );
  }

  function handleMarkAll(status) {
    setStudents(prev => prev.map(st => ({ ...st, status })));
  }

  async function handleSaveAttendance() {
    if (!selectedSubjectId) {
      alert('Please select an academic subject.');
      return;
    }
    if (students.length === 0) {
      alert('No enrolled students in this cohort to mark.');
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const payload = {
        subject_id: selectedSubjectId,
        department: selectedDept,
        semester: selectedSem,
        date: selectedDate,
        session_slot: selectedSlot,
        records: students.map(s => ({
          student_id: s.student_id,
          status: s.status || 'present',
          remarks: s.remarks || ''
        }))
      };

      const res = await api.markBulkAttendance(payload);
      if (res.ok && res.data.success) {
        setFeedback({
          type: 'success',
          message: res.data.message || 'Attendance saved successfully!'
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.data?.message || 'Failed to save attendance.'
        });
      }
    } catch (err) {
      console.error('Attendance save error', err);
      setFeedback({
        type: 'error',
        message: 'Network error occurred while saving attendance.'
      });
    } finally {
      setSaving(false);
    }
  }

  const presentCount = students.filter(s => s.status === 'present').length;
  const absentCount = students.filter(s => s.status === 'absent').length;
  const sessionRate = students.length > 0 ? ((presentCount / students.length) * 100).toFixed(1) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Page Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.pageTitle}>Daily Attendance Register</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>3-Year / 6-Sem Model</Text></View>
          </View>
          <Text style={styles.pageSub}>
            Faculty classroom attendance engine with real-time MySQL sync and duplicate prevention
          </Text>
        </View>

        {/* Live Status Pill */}
        <View style={styles.statusPill}>
          <View style={styles.greenDot} />
          <Text style={styles.statusPillText}>Attendance Engine Active</Text>
        </View>
      </View>

      {/* Synchronized Timetable Pre-fill Banner */}
      {initialParams && (
        <View style={styles.timetableSyncBanner}>
          <Text style={{ fontSize: 16 }}>⚡</Text>
          <Text style={styles.timetableSyncText}>
            Pre-filled from Live Timetable: <Text style={{ fontWeight: '700', color: colors.primaryLight }}>{initialParams.subject_code || ''} {initialParams.subject_name || ''}</Text> • Cohort {selectedDept}-S{selectedSem} • {selectedSlot}
          </Text>
        </View>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <View style={[
          styles.feedbackBanner,
          feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError
        ]}>
          <Text style={[
            styles.feedbackText,
            feedback.type === 'success' ? styles.feedbackSuccessText : styles.feedbackErrorText
          ]}>
            {feedback.message}
          </Text>
        </View>
      )}

      {/* Control Selector Panel */}
      <View style={styles.controlsCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <View>
            <Text style={styles.controlsTitle}>Classroom Cohort & Session Parameters</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
              Strict Scoped Search: Cohort roster is scoped strictly to selected Department and Semester
            </Text>
          </View>

          <TouchableOpacity
            style={styles.loadRosterBtn}
            onPress={() => {
              setHasSearched(true);
              loadRoster();
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.loadRosterBtnText}>📋 Load Cohort Register</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Academic Year & Semester Cohort Pills */}
        <View style={styles.cohortQuickPillsRow}>
          <Text style={styles.cohortQuickLabel}>ACADEMIC COHORT:</Text>
          {[
            { label: '1st Year [S1/S2]', sems: [1, 2], defaultSem: 2 },
            { label: '2nd Year [S3/S4]', sems: [3, 4], defaultSem: 4 },
            { label: '3rd Year [S5/S6]', sems: [5, 6], defaultSem: 6 }
          ].map(cohort => {
            const isCohortActive = cohort.sems.includes(Number(selectedSem));
            return (
              <TouchableOpacity
                key={cohort.label}
                style={[styles.cohortPillBtn, isCohortActive && styles.cohortPillBtnActive]}
                onPress={() => {
                  setSelectedSem(cohort.defaultSem);
                }}
              >
                <Text style={[styles.cohortPillText, isCohortActive && styles.cohortPillTextActive]}>
                  {cohort.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.controlsGrid}>
          {/* 1. Department (Defaults to logged-in faculty department) */}
          <View style={styles.controlItem}>
            <Text style={styles.controlLabel}>Department *</Text>
            <select
              style={webSelectStyle}
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
              }}
            >
              {departments.map(d => (
                <option key={d.code} value={d.code}>{d.code} - {d.name}</option>
              ))}
            </select>
          </View>

          {/* 2. Academic Year & Semester */}
          <View style={styles.controlItem}>
            <Text style={styles.controlLabel}>Academic Year & Semester *</Text>
            <select
              style={webSelectStyle}
              value={selectedSem}
              onChange={(e) => {
                setSelectedSem(parseInt(e.target.value, 10));
              }}
            >
              <optgroup label="[1st Year - S1/S2]">
                <option value={1}>1st Year - S1 (Semester 1)</option>
                <option value={2}>1st Year - S2 (Semester 2)</option>
              </optgroup>
              <optgroup label="[2nd Year - S3/S4]">
                <option value={3}>2nd Year - S3 (Semester 3)</option>
                <option value={4}>2nd Year - S4 (Semester 4)</option>
              </optgroup>
              <optgroup label="[3rd Year - S5/S6]">
                <option value={5}>3rd Year - S5 (Semester 5)</option>
                <option value={6}>3rd Year - S6 (Semester 6)</option>
              </optgroup>
            </select>
          </View>

          {/* 3. Subject */}
          <View style={[styles.controlItem, { flex: 2, minWidth: 260 }]}>
            <Text style={styles.controlLabel}>Curriculum Subject *</Text>
            {availableSubjects.length === 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: 12, paddingVertical: 10 }}>
                No subjects configured for {selectedDept}-S{selectedSem}
              </Text>
            ) : (
              <select
                style={webSelectStyle}
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
              >
                {availableSubjects.map(s => (
                  <option key={s.id} value={s.id}>{s.code} - {s.name} ({s.credits} Credits)</option>
                ))}
              </select>
            )}
          </View>

          {/* 4. Date */}
          <View style={styles.controlItem}>
            <Text style={styles.controlLabel}>Session Date *</Text>
            <input
              type="date"
              style={webInputStyle}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </View>

          {/* 5. Slot */}
          <View style={styles.controlItem}>
            <Text style={styles.controlLabel}>Lecture / Lab Slot *</Text>
            <select
              style={webSelectStyle}
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
            >
              {sessionSlots.map(slot => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
          </View>
        </View>
      </View>

      {/* When Faculty has not triggered search: Show clear state */}
      {!hasSearched ? (
        <View style={styles.promptCard}>
          <Text style={{ fontSize: 44, marginBottom: 12 }}>📋</Text>
          <Text style={styles.promptTitle}>Select Department and Semester to view students.</Text>
          <Text style={styles.promptSub}>
            Please verify your Department and Academic Year & Semester above, then click "Load Cohort Register" to inspect and record student attendance.
          </Text>
          <TouchableOpacity
            style={styles.promptLoadBtn}
            onPress={() => {
              setHasSearched(true);
              loadRoster();
            }}
          >
            <Text style={styles.promptLoadBtnText}>Open Register for {selectedDept}-S{selectedSem} →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Roster Metric Summary & Bulk Buttons */}
          <View style={styles.rosterActionBar}>
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>{students.length}</Text>
                <Text style={styles.metricLabel}>Enrolled</Text>
              </View>
              <View style={[styles.metricItem, { borderColor: 'rgba(16, 185, 129, 0.4)' }]}>
                <Text style={[styles.metricVal, { color: colors.accentEmerald }]}>{presentCount}</Text>
                <Text style={styles.metricLabel}>Present</Text>
              </View>
              <View style={[styles.metricItem, { borderColor: 'rgba(239, 68, 68, 0.4)' }]}>
                <Text style={[styles.metricVal, { color: colors.danger }]}>{absentCount}</Text>
                <Text style={styles.metricLabel}>Absent</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricVal, { color: colors.primaryLight }]}>{sessionRate}%</Text>
                <Text style={styles.metricLabel}>Session Rate</Text>
              </View>
            </View>

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.btnMarkPresentAll}
                onPress={() => handleMarkAll('present')}
                activeOpacity={0.8}
              >
                <Text style={styles.btnMarkPresentAllText}>✓ Mark All Present</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnMarkAbsentAll}
                onPress={() => handleMarkAll('absent')}
                activeOpacity={0.8}
              >
                <Text style={styles.btnMarkAbsentAllText}>✕ Mark All Absent</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnSaveAttendance, saving && { opacity: 0.6 }]}
                onPress={handleSaveAttendance}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.btnSaveAttendanceText}>💾 Save Attendance</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Student Roster Table */}
          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 12 }}>Loading class roster...</Text>
            </View>
          ) : students.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>👨‍🎓</Text>
              <Text style={styles.emptyTitle}>No Students Found in {selectedDept}-S{selectedSem}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                Try selecting a different department or semester cohort.
              </Text>
            </View>
          ) : (
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { width: 110 }]}>Roll No</Text>
            <Text style={[styles.th, { flex: 1 }]}>Student Name & Details</Text>
            <Text style={[styles.th, { width: 220, textAlign: 'center' }]}>Status (Toggle)</Text>
            <Text style={[styles.th, { width: 200 }]}>Faculty Remarks</Text>
          </View>

          {students.map((st, idx) => {
            const isPresent = st.status === 'present';
            const isAbsent = st.status === 'absent';

            return (
              <View key={st.student_id || idx} style={styles.tableRow}>
                {/* Roll No */}
                <View style={{ width: 110 }}>
                  <View style={styles.rollBadge}>
                    <Text style={styles.rollBadgeText}>{st.roll_no}</Text>
                  </View>
                </View>

                {/* Name & Details */}
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.studentName}>{st.name}</Text>
                  <Text style={styles.studentMeta}>Reg: {st.register_no} • {st.email}</Text>
                </View>

                {/* Status Toggle Buttons */}
                <View style={{ width: 220, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, isPresent && styles.toggleBtnPresent]}
                    onPress={() => handleToggleStatus(st.student_id, 'present')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.toggleBtnText, isPresent && styles.toggleBtnTextActive]}>
                      ✓ Present
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.toggleBtn, isAbsent && styles.toggleBtnAbsent]}
                    onPress={() => handleToggleStatus(st.student_id, 'absent')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.toggleBtnText, isAbsent && styles.toggleBtnTextActive]}>
                      ✕ Absent
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Remarks Input */}
                <View style={{ width: 200 }}>
                  <TextInput
                    style={styles.remarksInput}
                    placeholder="e.g. Medical leave, Late"
                    placeholderTextColor={colors.textMuted}
                    value={st.remarks || ''}
                    onChangeText={(val) => handleUpdateRemarks(st.student_id, val)}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Footer Bottom Submit */}
      {students.length > 0 && !loading && (
        <View style={styles.bottomBar}>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            💡 Attendance records are automatically linked with student eligibility reports and exam hall tickets.
          </Text>
          <TouchableOpacity
            style={[styles.btnSaveAttendance, saving && { opacity: 0.6 }]}
            onPress={handleSaveAttendance}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.btnSaveAttendanceText}>💾 Save & Sync Attendance</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
        </>
      )}
    </ScrollView>
  );
}

const webSelectStyle = {
  backgroundColor: colors.bgDark,
  color: colors.textPrimary,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '12px',
  outline: 'none',
  width: '100%'
};

const webInputStyle = {
  backgroundColor: colors.bgDark,
  color: colors.textPrimary,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: '8px',
  padding: '7px 12px',
  fontSize: '12px',
  outline: 'none',
  width: '100%'
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark },
  content: { padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  pageTitle: { fontSize: 22, fontWeight: typography.weight.bold, color: colors.textPrimary },
  badge: { backgroundColor: 'rgba(99, 102, 241, 0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 10 },
  badgeText: { color: colors.primaryLight, fontSize: 11, fontWeight: typography.weight.bold },
  pageSub: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16, 185, 129, 0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accentEmerald },
  statusPillText: { color: colors.accentEmerald, fontSize: 11, fontWeight: typography.weight.bold },

  feedbackBanner: { padding: 14, borderRadius: 8, marginBottom: 18, borderWidth: 1 },
  feedbackSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: colors.accentEmerald },
  feedbackSuccessText: { color: colors.accentEmerald, fontSize: 13, fontWeight: typography.weight.bold },
  feedbackError: { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: colors.danger },
  feedbackErrorText: { color: colors.danger, fontSize: 13, fontWeight: typography.weight.bold },

  controlsCard: { backgroundColor: colors.bgCard, borderRadius: 12, padding: 18, borderWidth: 1, borderColor: colors.borderLight, marginBottom: 18 },
  controlsTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: typography.weight.bold, marginBottom: 14 },
  controlsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  controlItem: { flex: 1, minWidth: 150 },
  controlLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: typography.weight.semibold, marginBottom: 6 },

  rosterActionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 18 },
  metricsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  metricItem: { backgroundColor: colors.bgCard, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.borderLight, alignItems: 'center', minWidth: 80 },
  metricVal: { fontSize: 16, fontWeight: typography.weight.bold, color: colors.textPrimary },
  metricLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  actionButtonsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  btnMarkPresentAll: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderWidth: 1, borderColor: colors.accentEmerald, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  btnMarkPresentAllText: { color: colors.accentEmerald, fontSize: 12, fontWeight: typography.weight.bold },
  btnMarkAbsentAll: { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderWidth: 1, borderColor: colors.danger, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  btnMarkAbsentAllText: { color: colors.danger, fontSize: 12, fontWeight: typography.weight.bold },
  btnSaveAttendance: { backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnSaveAttendanceText: { color: '#FFF', fontSize: 13, fontWeight: typography.weight.bold },

  tableCard: { backgroundColor: colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden', marginBottom: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: colors.bgSurface, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  th: { color: colors.textMuted, fontSize: 11, fontWeight: typography.weight.bold, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  rollBadge: { backgroundColor: 'rgba(99, 102, 241, 0.12)', borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.3)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  rollBadgeText: { color: colors.primaryLight, fontSize: 11, fontWeight: typography.weight.bold },
  studentName: { color: colors.textPrimary, fontSize: 13, fontWeight: typography.weight.semibold },
  studentMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },

  toggleBtn: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 6, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.bgDark },
  toggleBtnPresent: { backgroundColor: colors.accentEmerald, borderColor: colors.accentEmerald },
  toggleBtnAbsent: { backgroundColor: colors.danger, borderColor: colors.danger },
  toggleBtnText: { color: colors.textSecondary, fontSize: 11, fontWeight: typography.weight.semibold },
  toggleBtnTextActive: { color: '#FFF', fontWeight: typography.weight.bold },

  remarksInput: { height: 34, backgroundColor: colors.bgDark, borderRadius: 6, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 10, color: colors.textPrimary, fontSize: 11 },

  bottomBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgCard, padding: 16, borderRadius: 10, borderWidth: 1, borderColor: colors.borderLight, marginBottom: 20 },
  centerLoading: { paddingVertical: 60, alignItems: 'center' },
  emptyCard: { backgroundColor: colors.bgCard, borderRadius: 12, padding: 50, alignItems: 'center', borderWidth: 1, borderColor: colors.borderLight },

  timetableSyncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16
  },
  timetableSyncText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: typography.weight.medium
  },

  promptCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 48,
    alignItems: 'center',
    marginBottom: 20
  },
  promptTitle: {
    fontSize: 17,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8
  },
  promptSub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 520,
    lineHeight: 18,
    marginBottom: 20
  },
  promptLoadBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  promptLoadBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: typography.weight.bold
  },
  loadRosterBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  loadRosterBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: typography.weight.bold
  },
  cohortQuickPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 14
  },
  cohortQuickLabel: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    color: colors.textMuted,
    letterSpacing: 0.8
  },
  cohortPillBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: colors.bgDark,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  cohortPillBtnActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: colors.primary
  },
  cohortPillText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium
  },
  cohortPillTextActive: {
    color: colors.primaryLight,
    fontWeight: typography.weight.bold
  }
});
