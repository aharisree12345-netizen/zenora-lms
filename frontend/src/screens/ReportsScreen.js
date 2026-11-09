import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Platform } from 'react-native';
import { colors, typography } from '../theme/colors';
import { api, getApiBaseUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/GlassCard';
import { Badge } from '../components/Badge';

export function ReportsScreen() {
  const { user } = useAuth();
  const isFaculty = user?.role === 'faculty' || user?.role === 'instructor';

  // Screen Mode: 'gradebook' (default for faculty) | 'analytics'
  const [activeMode, setActiveMode] = useState(isFaculty ? 'gradebook' : 'gradebook');

  // Subjects & Batches for Gradebook
  const facultyDefaultDept = user?.department_code || (user?.department_id === 'dept-ec' ? 'EC' : (user?.department_id === 'dept-me' ? 'ME' : 'CS'));
  const [selectedDept, setSelectedDept] = useState(facultyDefaultDept);
  const [selectedSemester, setSelectedSemester] = useState(4);
  const [hasSearched, setHasSearched] = useState(!isFaculty);

  const [subjects, setSubjects] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');

  // Internal Marks Split Weightages
  const [asgWeight, setAsgWeight] = useState(40);
  const [quizWeight, setQuizWeight] = useState(40);
  const [attWeight, setAttWeight] = useState(20);
  const [maxInternal, setMaxInternal] = useState(50);

  // Internal Marks Data
  const [internalReport, setInternalReport] = useState(null);
  const [studentRemarks, setStudentRemarks] = useState({});
  const [loadingInternal, setLoadingInternal] = useState(false);

  // Institutional Analytics Data
  const [analyticsReport, setAnalyticsReport] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadCourseMeta();
  }, []);

  useEffect(() => {
    if (hasSearched && (selectedSubjectId || selectedBatchId)) {
      loadInternalMarks();
    }
  }, [hasSearched, selectedSubjectId, selectedBatchId, asgWeight, quizWeight, attWeight, maxInternal]);

  useEffect(() => {
    if (activeMode === 'analytics' && !analyticsReport) {
      loadAnalytics();
    }
  }, [activeMode]);

  async function loadCourseMeta() {
    try {
      const [subsRes, batchesRes] = await Promise.all([
        api.getSubjects().catch(() => ({ ok: false })),
        api.getBatches().catch(() => ({ ok: false }))
      ]);

      if (subsRes.ok && subsRes.data?.success && subsRes.data.data.length > 0) {
        setSubjects(subsRes.data.data);
        if (!isFaculty) {
          setSelectedSubjectId(subsRes.data.data[0].id);
        }
      }
      if (batchesRes.ok && batchesRes.data?.success && batchesRes.data.data.length > 0) {
        setBatches(batchesRes.data.data);
        if (!isFaculty) {
          setSelectedBatchId(batchesRes.data.data[0].id);
        }
      }
    } catch (e) {
      console.error('[Meta Load Error]', e);
    }
  }

  async function loadInternalMarks() {
    setLoadingInternal(true);
    try {
      const res = await api.getInternalMarks({
        department: selectedDept || undefined,
        semester: selectedSemester || undefined,
        subject_id: selectedSubjectId || undefined,
        batch_id: selectedBatchId || undefined,
        asg_weight: asgWeight,
        quiz_weight: quizWeight,
        att_weight: attWeight,
        max_internal: maxInternal
      });

      if (res.ok && res.data?.success) {
        const reportObj = res.data.data || res.data;
        setInternalReport(reportObj);
        // Pre-fill remarks if not set
        const initialRemarks = {};
        const stList = reportObj.students || [];
        stList.forEach(s => {
          if (studentRemarks[s.student_id] === undefined) {
            initialRemarks[s.student_id] = s.remarks || 'Satisfactory progress';
          }
        });
        setStudentRemarks(prev => ({ ...initialRemarks, ...prev }));
      }
    } catch (e) {
      console.error('[Internal Marks Load Error]', e);
    } finally {
      setLoadingInternal(false);
    }
  }

  async function loadAnalytics() {
    setLoadingAnalytics(true);
    try {
      const res = await api.getAnalytics();
      if (res.ok && res.data?.success) {
        setAnalyticsReport(res.data);
      }
    } catch (e) {
      console.error('[Analytics Load Error]', e);
    } finally {
      setLoadingAnalytics(false);
    }
  }

  function handleRemarkChange(studentId, text) {
    setStudentRemarks(prev => ({ ...prev, [studentId]: text }));
  }

  function handleExportCsv(type = 'internal_marks') {
    setExporting(true);
    let downloadUrl = `${getApiBaseUrl()}/reports/export-csv?type=${type}`;
    if (type === 'internal_marks') {
      downloadUrl += `&subject_id=${encodeURIComponent(selectedSubjectId)}&batch_id=${encodeURIComponent(selectedBatchId)}&asg_weight=${asgWeight}&quiz_weight=${quizWeight}&att_weight=${attWeight}&max_internal=${maxInternal}`;
    }
    if (Platform.OS === 'web') {
      window.open(downloadUrl, '_blank');
    }
    setTimeout(() => setExporting(false), 1200);
  }

  function handlePrint() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
    }
  }

  const totalWeightPercent = Number(asgWeight) + Number(quizWeight) + Number(attWeight);
  const selectedSubjectObj = subjects.find(s => s.id === selectedSubjectId);
  const selectedBatchObj = batches.find(b => b.id === selectedBatchId);
  const rawReport = internalReport?.data || internalReport;
  const studentsList = rawReport?.students || [];

  // Compute live KPI metrics
  const validTotals = studentsList.map(s => Number(s.total_internal_marks !== undefined ? s.total_internal_marks : s.total_internal) || 0);
  const classAvg = validTotals.length ? (validTotals.reduce((a, b) => a + b, 0) / validTotals.length).toFixed(1) : (rawReport?.summary?.class_average || '42.5');
  const maxScore = validTotals.length ? Math.max(...validTotals).toFixed(1) : (rawReport?.summary?.highest_score || '48.0');
  const passingStudents = validTotals.length ? validTotals.filter(t => t >= (maxInternal * 0.5)).length : (rawReport?.summary?.pass_count || studentsList.length);
  const passingRate = studentsList.length ? Math.round((passingStudents / studentsList.length) * 100) : 100;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Mode Navigation Switcher */}
      <View style={styles.modeSwitcherContainer}>
        <View style={styles.modeSwitcherPills}>
          <TouchableOpacity
            style={[styles.modePill, activeMode === 'gradebook' && styles.modePillActive]}
            onPress={() => setActiveMode('gradebook')}
            activeOpacity={0.8}
          >
            <Text style={[styles.modePillText, activeMode === 'gradebook' && styles.modePillTextActive]}>
              📊 Faculty Course Gradebook & Internal Marks Calculator
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modePill, activeMode === 'analytics' && styles.modePillActive]}
            onPress={() => setActiveMode('analytics')}
            activeOpacity={0.8}
          >
            <Text style={[styles.modePillText, activeMode === 'analytics' && styles.modePillTextActive]}>
              📈 Institutional Analytics & Audit
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ========================================================
          MODE 1: FACULTY COURSE GRADEBOOK & INTERNAL MARKS SHEET
         ======================================================== */}
      {activeMode === 'gradebook' && (
        <View style={styles.gradebookSection}>
          {/* Header */}
          <View style={styles.gradebookHeader}>
            <View>
              <View style={styles.titleBadgeRow}>
                <Text style={styles.pageTitle}>Course Gradebook & Split-Up Internal Marks</Text>
                <View style={styles.naacBadge}>
                  <Text style={styles.naacBadgeText}>Continuous Assessment Engine</Text>
                </View>
              </View>
              <Text style={styles.pageSubtitle}>
                Aggregate Assignment scores, Quiz results, and Attendance metrics into consolidated university internal marks.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonGroup}>
              <TouchableOpacity
                style={styles.printBtn}
                onPress={handlePrint}
                activeOpacity={0.8}
              >
                <Text style={styles.printBtnText}>🖨️ Print Mark Sheet</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exportCsvBtn}
                onPress={() => handleExportCsv('internal_marks')}
                disabled={exporting}
                activeOpacity={0.8}
              >
                <Text style={styles.exportCsvBtnText}>
                  {exporting ? 'Exporting...' : '⬇ Export Consolidated CSV'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Mandatory Top Cohort Filter for Strict Scoped Access */}
          <View style={styles.cohortFilterCard}>
            <View style={styles.cohortFilterTopRow}>
              <View>
                <Text style={styles.cohortFilterTitle}>Classroom Cohort & Academic Scope</Text>
                <Text style={styles.cohortFilterSub}>
                  Select Department and Semester to compute marks and evaluate student performance
                </Text>
              </View>

              <TouchableOpacity
                style={styles.loadCohortBtn}
                onPress={() => {
                  setHasSearched(true);
                  loadInternalMarks();
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.loadCohortBtnText}>📊 Calculate Internal Marks</Text>
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
                const isCohortActive = cohort.sems.includes(Number(selectedSemester));
                return (
                  <TouchableOpacity
                    key={cohort.label}
                    style={[styles.cohortPillBtn, isCohortActive && styles.cohortPillBtnActive]}
                    onPress={() => {
                      setSelectedSemester(cohort.defaultSem);
                      if (hasSearched) {
                        setTimeout(() => loadInternalMarks(), 50);
                      }
                    }}
                  >
                    <Text style={[styles.cohortPillText, isCohortActive && styles.cohortPillTextActive]}>
                      {cohort.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.filterGrid}>
              {/* Department */}
              <View style={styles.filterItem}>
                <Text style={styles.filterLabel}>Department *</Text>
                <select
                  style={webSelectStyle}
                  value={selectedDept}
                  onChange={(e) => {
                    setSelectedDept(e.target.value);
                  }}
                >
                  <option value="CS">CS - Computer Science & Engineering</option>
                  <option value="EC">EC - Electronics & Communication Engineering</option>
                  <option value="ME">ME - Mechanical Engineering</option>
                  <option value="Common">Common - Basic Sciences & Humanities</option>
                </select>
              </View>

              {/* Academic Year & Semester */}
              <View style={styles.filterItem}>
                <Text style={styles.filterLabel}>Academic Year & Semester *</Text>
                <select
                  style={webSelectStyle}
                  value={selectedSemester}
                  onChange={(e) => {
                    setSelectedSemester(parseInt(e.target.value, 10));
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

              {/* Subject / Course */}
              <View style={styles.filterItem}>
                <Text style={styles.filterLabel}>Subject / Course</Text>
                <select
                  style={webSelectStyle}
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                >
                  {subjects.length > 0 ? (
                    subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.code} - {s.name} (Sem {s.semester})</option>
                    ))
                  ) : (
                    <option value="sub-default">All Department Courses</option>
                  )}
                </select>
              </View>
            </View>
          </View>

          {/* Strict Scoped State: Prompt when not searched yet */}
          {isFaculty && !hasSearched ? (
            <View style={styles.promptCard}>
              <Text style={styles.promptIcon}>📊</Text>
              <Text style={styles.promptTitle}>Select Department and Semester to view students.</Text>
              <Text style={styles.promptSub}>
                To safeguard student records and optimize performance, choose an academic department and semester above to load internal marks, continuous assessment, and attendance metrics.
              </Text>
              <TouchableOpacity
                style={styles.searchActionBtn}
                onPress={() => {
                  setHasSearched(true);
                  loadInternalMarks();
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.searchActionBtnText}>📊 Load Cohort Internal Marks</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Filter & Split-Up Calculator Config Matrix */}
              <View style={styles.configCard}>
            <Text style={styles.configTitle}>⚙️ Course Selection & Weightage Distribution Matrix</Text>

            <View style={styles.configControlsGrid}>
              {/* Subject Selector */}
              <View style={styles.configField}>
                <Text style={styles.configLabel}>Subject / Course</Text>
                <select
                  style={webSelectStyle}
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.code} - {s.name} (Sem {s.semester})</option>
                  ))}
                </select>
              </View>

              {/* Batch Selector */}
              <View style={styles.configField}>
                <Text style={styles.configLabel}>Batch / Class</Text>
                <select
                  style={webSelectStyle}
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} (Sem {b.semester})</option>
                  ))}
                </select>
              </View>

              {/* Assignment Weightage */}
              <View style={styles.configField}>
                <Text style={styles.configLabel}>Assignment Weight (%)</Text>
                <TextInput
                  style={styles.configInput}
                  keyboardType="numeric"
                  value={String(asgWeight)}
                  onChangeText={(val) => setAsgWeight(Number(val) || 0)}
                />
              </View>

              {/* Quiz Weightage */}
              <View style={styles.configField}>
                <Text style={styles.configLabel}>Quiz / CBT Weight (%)</Text>
                <TextInput
                  style={styles.configInput}
                  keyboardType="numeric"
                  value={String(quizWeight)}
                  onChangeText={(val) => setQuizWeight(Number(val) || 0)}
                />
              </View>

              {/* Attendance Weightage */}
              <View style={styles.configField}>
                <Text style={styles.configLabel}>Attendance Weight (%)</Text>
                <TextInput
                  style={styles.configInput}
                  keyboardType="numeric"
                  value={String(attWeight)}
                  onChangeText={(val) => setAttWeight(Number(val) || 0)}
                />
              </View>

              {/* Max Internal Marks */}
              <View style={styles.configField}>
                <Text style={styles.configLabel}>Max Internal Marks</Text>
                <TextInput
                  style={styles.configInput}
                  keyboardType="numeric"
                  value={String(maxInternal)}
                  onChangeText={(val) => setMaxInternal(Number(val) || 50)}
                />
              </View>
            </View>

            {/* Split Breakdown Formula Pill */}
            <View style={styles.formulaRow}>
              <Text style={styles.formulaLabel}>Calculation Split Formula:</Text>
              <Text style={styles.formulaText}>
                Total ({maxInternal}M) = Assignments ({asgWeight}%) + Quizzes ({quizWeight}%) + Attendance ({attWeight}%)
              </Text>
              <View style={[styles.weightPill, totalWeightPercent === 100 ? styles.weightPillValid : styles.weightPillInvalid]}>
                <Text style={styles.weightPillText}>
                  {totalWeightPercent === 100 ? '✓ 100% Validated' : `⚠️ Total: ${totalWeightPercent}% (Adjust to 100%)`}
                </Text>
              </View>
            </View>
          </View>

          {/* Aggregated KPI Summary Cards */}
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Course & Batch Evaluated</Text>
              <Text style={[styles.kpiValue, { fontSize: 16, marginTop: 4 }]}>
                {selectedSubjectObj?.code || 'CS8491'} - {selectedSubjectObj?.name || 'Algorithms'}
              </Text>
              <Text style={styles.kpiTrend}>{selectedBatchObj?.name || 'Class 2024-2028'} (Sem {selectedBatchObj?.semester || 4})</Text>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Class Average Internal</Text>
              <Text style={[styles.kpiValue, { color: colors.primaryLight }]}>
                {classAvg} <Text style={{ fontSize: 14, color: colors.textMuted }}>/ {maxInternal}</Text>
              </Text>
              <Text style={styles.kpiTrend}>Aggregated continuous performance</Text>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Highest Mark in Cohort</Text>
              <Text style={[styles.kpiValue, { color: colors.accentEmerald }]}>
                {maxScore} <Text style={{ fontSize: 14, color: colors.textMuted }}>/ {maxInternal}</Text>
              </Text>
              <Text style={styles.kpiTrend}>Top performer: Grade O</Text>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Class Passing Rate</Text>
              <Text style={[styles.kpiValue, { color: colors.accentAmber }]}>
                {passingRate}%
              </Text>
              <Text style={styles.kpiTrend}>{passingStudents} of {studentsList.length || 6} students cleared</Text>
            </View>
          </View>

          {/* Consolidated Internal Marks Split-Up Table */}
          <View style={styles.markSheetCard}>
            <View style={styles.markSheetHeader}>
              <View>
                <Text style={styles.markSheetTitle}>Consolidated Internal Mark Calculation Sheet</Text>
                <Text style={styles.markSheetSub}>
                  Component-wise marks scaled according to defined weightages ({asgWeight}% / {quizWeight}% / {attWeight}%)
                </Text>
              </View>
              <TouchableOpacity style={styles.reloadBtn} onPress={loadInternalMarks}>
                <Text style={styles.reloadBtnText}>🔄 Recalculate Marks</Text>
              </TouchableOpacity>
            </View>

            {loadingInternal ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Calculating continuous internal evaluations...</Text>
              </View>
            ) : studentsList.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📊</Text>
                <Text style={styles.emptyTitle}>No students enrolled in selected course/batch</Text>
              </View>
            ) : (
              <View style={styles.tableResponsive}>
                <View style={styles.tableHead}>
                  <Text style={[styles.th, { flex: 1.2 }]}>Roll / Reg No</Text>
                  <Text style={[styles.th, { flex: 2 }]}>Student Name</Text>
                  <Text style={[styles.th, { flex: 1.3, textAlign: 'center' }]}>Assignments ({asgWeight}%)</Text>
                  <Text style={[styles.th, { flex: 1.3, textAlign: 'center' }]}>Quizzes ({quizWeight}%)</Text>
                  <Text style={[styles.th, { flex: 1.3, textAlign: 'center' }]}>Attendance ({attWeight}%)</Text>
                  <Text style={[styles.th, { flex: 1.3, textAlign: 'center' }]}>Internal Total</Text>
                  <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Grade</Text>
                  <Text style={[styles.th, { flex: 2.2 }]}>Faculty Remarks</Text>
                </View>

                {studentsList.map((st) => {
                  const currentRemark = studentRemarks[st.student_id] !== undefined ? studentRemarks[st.student_id] : (st.remarks || '');
                  const rawGrade = st.grade || 'A';
                  const gradeDisplay = rawGrade.split(' ')[0] || rawGrade;

                  const asgMarks = st.assignment_marks !== undefined ? st.assignment_marks : st.assignment_mark;
                  const asgPct = st.assignment_percent !== undefined ? st.assignment_percent : st.assignment_avg;
                  const quizMarks = st.quiz_marks !== undefined ? st.quiz_marks : st.quiz_mark;
                  const quizPct = st.quiz_percent !== undefined ? st.quiz_percent : st.quiz_avg;
                  const attMarks = st.attendance_marks !== undefined ? st.attendance_marks : st.attendance_mark;
                  const attPct = st.attendance_percent !== undefined ? st.attendance_percent : st.attendance_rate;
                  const totalMarks = st.total_internal_marks !== undefined ? st.total_internal_marks : st.total_internal;
                  const maxMarks = st.max_internal_marks !== undefined ? st.max_internal_marks : (st.max_internal || maxInternal);

                  return (
                    <View key={st.student_id} style={styles.tableRow}>
                      <View style={{ flex: 1.2 }}>
                        <Text style={styles.rollNoText}>{st.roll_no || 'CS-24-001'}</Text>
                        <Text style={styles.regNoText}>{st.register_no || '312424104001'}</Text>
                      </View>

                      <View style={{ flex: 2 }}>
                        <Text style={styles.studentNameText}>{st.name}</Text>
                        <Text style={styles.studentEmailText}>{st.email}</Text>
                      </View>

                      {/* Assignment Marks */}
                      <View style={{ flex: 1.3, alignItems: 'center' }}>
                        <Text style={styles.scaledMarkText}>{asgMarks}</Text>
                        <Text style={styles.rawPercentageText}>{asgPct}% avg</Text>
                      </View>

                      {/* Quiz Marks */}
                      <View style={{ flex: 1.3, alignItems: 'center' }}>
                        <Text style={styles.scaledMarkText}>{quizMarks}</Text>
                        <Text style={styles.rawPercentageText}>{quizPct}% avg</Text>
                      </View>

                      {/* Attendance Marks */}
                      <View style={{ flex: 1.3, alignItems: 'center' }}>
                        <Text style={styles.scaledMarkText}>{attMarks}</Text>
                        <Text style={styles.rawPercentageText}>{attPct}% att</Text>
                      </View>

                      {/* Total Consolidated Internal Mark */}
                      <View style={{ flex: 1.3, alignItems: 'center' }}>
                        <Text style={styles.totalInternalText}>{totalMarks} / {maxMarks}</Text>
                      </View>

                      {/* University Grade Pill */}
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <View style={[
                          styles.gradePill,
                          gradeDisplay === 'O' && styles.gradeO,
                          gradeDisplay === 'A+' && styles.gradeAPlus,
                          gradeDisplay === 'A' && styles.gradeA,
                          gradeDisplay === 'B+' && styles.gradeBPlus,
                          gradeDisplay === 'RA' && styles.gradeRA
                        ]}>
                          <Text style={styles.gradePillText}>{rawGrade}</Text>
                        </View>
                      </View>

                      {/* Qualitative General Remarks */}
                      <View style={{ flex: 2.2 }}>
                        <TextInput
                          style={styles.remarkInput}
                          value={currentRemark}
                          placeholder="General remarks..."
                          placeholderTextColor={colors.textMuted}
                          onChangeText={(txt) => handleRemarkChange(st.student_id, txt)}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
            </>
          )}
        </View>
      )}

      {/* ========================================================
          MODE 2: INSTITUTIONAL ANALYTICS & AUDIT
         ======================================================== */}
      {activeMode === 'analytics' && (
        <View style={styles.analyticsSection}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Institutional Analytics & Audit Reports</Text>
              <Text style={styles.headerSub}>
                Real-time reporting on course completions, assessment score distributions, and student cohorts.
              </Text>
            </View>

            {/* CSV Export Buttons */}
            <View style={styles.exportGroup}>
              <TouchableOpacity
                style={styles.exportBtn}
                onPress={() => handleExportCsv('enrolments')}
                disabled={exporting}
              >
                <Text style={styles.exportBtnText}>⬇ Export Enrolments CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exportBtn, { backgroundColor: colors.accentEmerald }]}
                onPress={() => handleExportCsv('grades')}
                disabled={exporting}
              >
                <Text style={styles.exportBtnText}>⬇ Export Gradebook CSV</Text>
              </TouchableOpacity>
            </View>
          </View>

          {loadingAnalytics ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Compiling institutional statistics...</Text>
            </View>
          ) : (
            <>
              {/* Summary KPI Cards */}
              <View style={styles.kpiGrid}>
                <GlassCard style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Total Course Enrolments</Text>
                  <Text style={styles.kpiValue}>{analyticsReport?.summary?.totalEnrolments || 0}</Text>
                  <Text style={styles.kpiTrend}>Enrolled across active terms</Text>
                </GlassCard>

                <GlassCard style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Course Graduations</Text>
                  <Text style={[styles.kpiValue, { color: colors.accentEmerald }]}>
                    {analyticsReport?.summary?.totalCompletions || 0}
                  </Text>
                  <Text style={styles.kpiTrend}>100% curriculum completion</Text>
                </GlassCard>

                <GlassCard style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Certificates Issued</Text>
                  <Text style={[styles.kpiValue, { color: colors.accentViolet }]}>
                    {analyticsReport?.summary?.totalCertificates || 0}
                  </Text>
                  <Text style={styles.kpiTrend}>Cryptographically verifiable</Text>
                </GlassCard>

                <GlassCard style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Average Exam Pass Rate</Text>
                  <Text style={[styles.kpiValue, { color: colors.primaryLight }]}>
                    {analyticsReport?.summary?.averagePassRate || 0}%
                  </Text>
                  <Text style={styles.kpiTrend}>Passing score threshold: 50%</Text>
                </GlassCard>
              </View>

              {/* Course Performance Comparisons Table */}
              <GlassCard style={styles.tableCard}>
                <Text style={styles.cardHeading}>Course Performance Comparison</Text>
                <View style={styles.tableHead}>
                  <Text style={[styles.th, { flex: 2 }]}>Course Title</Text>
                  <Text style={[styles.th, { flex: 1 }]}>Status</Text>
                  <Text style={[styles.th, { flex: 1 }]}>Students</Text>
                  <Text style={[styles.th, { flex: 1 }]}>Avg Progress</Text>
                  <Text style={[styles.th, { flex: 1 }]}>Avg Exam Score</Text>
                  <Text style={[styles.th, { flex: 1 }]}>Graduation Rate</Text>
                </View>

                {(analyticsReport?.coursePerformance || []).map(cp => (
                  <View key={cp.id} style={styles.tableRow}>
                    <Text style={[styles.td, { flex: 2, fontWeight: 'bold' }]}>{cp.title}</Text>
                    <View style={{ flex: 1 }}>
                      <Badge label={cp.status} variant={cp.status} />
                    </View>
                    <Text style={[styles.td, { flex: 1 }]}>{cp.enrolledCount} enrolled</Text>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={styles.miniProgBg}>
                        <View style={[styles.miniProgFill, { width: `${cp.averageProgress}%` }]} />
                      </View>
                      <Text style={styles.tdText}>{cp.averageProgress}%</Text>
                    </View>
                    <Text style={[styles.td, { flex: 1, color: colors.accentEmerald }]}>
                      {cp.averageQuizScore !== null ? `${cp.averageQuizScore}%` : 'N/A'}
                    </Text>
                    <Text style={[styles.td, { flex: 1 }]}>{cp.completionRate}%</Text>
                  </View>
                ))}
              </GlassCard>

              {/* Student Cohort Performance */}
              <GlassCard style={[styles.tableCard, { marginTop: 20 }]}>
                <Text style={styles.cardHeading}>Student Cohort Progress & Evaluation</Text>
                <View style={styles.tableHead}>
                  <Text style={[styles.th, { flex: 2 }]}>Student Name & Email</Text>
                  <Text style={[styles.th, { flex: 1 }]}>Enrolled Courses</Text>
                  <Text style={[styles.th, { flex: 1 }]}>Completed Courses</Text>
                  <Text style={[styles.th, { flex: 1 }]}>Certificates</Text>
                  <Text style={[styles.th, { flex: 1 }]}>Avg Assignment Grade</Text>
                  <Text style={[styles.th, { flex: 1 }]}>Status</Text>
                </View>

                {(analyticsReport?.students || []).map(st => (
                  <View key={st.id} style={styles.tableRow}>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.studentNameText}>{st.name}</Text>
                      <Text style={styles.studentEmailText}>{st.email}</Text>
                    </View>
                    <Text style={[styles.td, { flex: 1 }]}>{st.enrolledCoursesCount} programs</Text>
                    <Text style={[styles.td, { flex: 1 }]}>{st.completedCoursesCount} completed</Text>
                    <Text style={[styles.td, { flex: 1, color: colors.accentViolet }]}>{st.certificatesCount} awarded</Text>
                    <Text style={[styles.td, { flex: 1, color: colors.accentEmerald, fontWeight: 'bold' }]}>
                      {st.averageAssignmentGrade !== null ? `${st.averageAssignmentGrade}/100` : 'Pending'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Badge label={st.status} variant={st.status} />
                    </View>
                  </View>
                ))}
              </GlassCard>
            </>
          )}
        </View>
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
  centerBox: {
    paddingVertical: 50,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 12
  },

  /* Mode Switcher */
  modeSwitcherContainer: {
    marginBottom: 20
  },
  modeSwitcherPills: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    padding: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignSelf: 'flex-start',
    gap: 8,
    flexWrap: 'wrap'
  },
  modePill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  modePillActive: {
    backgroundColor: colors.primary
  },
  modePillText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: typography.weight.semibold
  },
  modePillTextActive: {
    color: '#FFF',
    fontWeight: typography.weight.bold
  },

  /* Gradebook Section */
  gradebookSection: {
    gap: 20
  },
  gradebookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 4
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap'
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary
  },
  naacBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  naacBadgeText: {
    color: colors.accentEmerald,
    fontSize: 11,
    fontWeight: typography.weight.bold
  },
  pageSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap'
  },
  printBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  printBtnText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: typography.weight.bold
  },
  exportCsvBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
  },
  exportCsvBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: typography.weight.bold
  },

  /* Config Card */
  configCard: {
    backgroundColor: colors.bgCard,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
  },
  configTitle: {
    fontSize: 15,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: 16
  },
  configControlsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14
  },
  configField: {
    flex: 1,
    minWidth: 160
  },
  configLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: typography.weight.semibold,
    marginBottom: 6
  },
  configInput: {
    backgroundColor: colors.bgDark,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    height: 38,
    paddingHorizontal: 12,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: typography.weight.bold
  },
  formulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgDark,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    flexWrap: 'wrap',
    gap: 10
  },
  formulaLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: typography.weight.semibold
  },
  formulaText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: typography.weight.semibold
  },
  weightPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  weightPillValid: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)'
  },
  weightPillInvalid: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)'
  },
  weightPillText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: typography.weight.bold
  },

  /* KPI Cards */
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  kpiCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: colors.bgCard,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  kpiLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500'
  },
  kpiValue: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 4
  },
  kpiTrend: {
    color: colors.textMuted,
    fontSize: 11
  },

  /* Mark Sheet Table Card */
  markSheetCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  markSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 10
  },
  markSheetTitle: {
    fontSize: 16,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary
  },
  markSheetSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2
  },
  reloadBtn: {
    backgroundColor: colors.bgDark,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  reloadBtnText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: typography.weight.bold
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center'
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: typography.weight.bold
  },

  tableResponsive: {
    backgroundColor: colors.bgDark,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden'
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  th: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)'
  },
  rollNoText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: typography.weight.bold
  },
  regNoText: {
    color: colors.textMuted,
    fontSize: 10
  },
  studentNameText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: 'bold'
  },
  studentEmailText: {
    color: colors.textMuted,
    fontSize: 11
  },
  scaledMarkText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: typography.weight.bold
  },
  rawPercentageText: {
    color: colors.textMuted,
    fontSize: 10
  },
  totalInternalText: {
    color: colors.primaryLight,
    fontSize: 14,
    fontWeight: typography.weight.bold
  },
  gradePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.15)'
  },
  gradeO: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  gradeAPlus: { backgroundColor: 'rgba(59, 130, 246, 0.2)' },
  gradeA: { backgroundColor: 'rgba(99, 102, 241, 0.2)' },
  gradeBPlus: { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
  gradeRA: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  gradePillText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: typography.weight.bold
  },
  remarkInput: {
    height: 34,
    backgroundColor: colors.bgCard,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 10,
    color: colors.textPrimary,
    fontSize: 11
  },

  /* Analytics Mode */
  analyticsSection: {
    gap: 20
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 12
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold
  },
  headerSub: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    marginTop: 4,
    maxWidth: 600
  },
  exportGroup: {
    flexDirection: 'row',
    gap: 10
  },
  exportBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8
  },
  exportBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold'
  },
  tableCard: {
    padding: 20,
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  cardHeading: {
    color: colors.textPrimary,
    fontSize: typography.size.md,
    fontWeight: 'bold',
    marginBottom: 16
  },
  td: {
    color: colors.textPrimary,
    fontSize: 13
  },
  tdText: {
    color: colors.textSecondary,
    fontSize: 11
  },
  miniProgBg: {
    width: 60,
    height: 6,
    backgroundColor: colors.bgSurface,
    borderRadius: 3,
    overflow: 'hidden'
  },
  miniProgFill: {
    height: 6,
    backgroundColor: colors.primary
  },

  /* Cohort Filter Panel & Prompt Styles */
  cohortFilterCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 18,
    marginBottom: 8
  },
  cohortFilterTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 10
  },
  cohortFilterTitle: {
    color: colors.textPrimary,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold
  },
  cohortFilterSub: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    marginTop: 2
  },
  loadCohortBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8
  },
  loadCohortBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: typography.weight.bold
  },
  cohortQuickPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap'
  },
  cohortQuickLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 0.5
  },
  cohortPillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  cohortPillBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  cohortPillText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600'
  },
  cohortPillTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  filterGrid: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap'
  },
  filterItem: {
    flex: 1,
    minWidth: 200
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: 6
  },
  promptCard: {
    padding: 48,
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10
  },
  promptIcon: {
    fontSize: 52,
    marginBottom: 16
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center'
  },
  promptSub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 500,
    lineHeight: 20,
    marginBottom: 20
  },
  searchActionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8
  },
  searchActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold'
  }
});

