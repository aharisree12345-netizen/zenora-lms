import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert
} from 'react-native';
import { colors, typography } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';

export function ExamsScreen() {
  const { user } = useAuth();
  const isFacultyOrAdmin = ['super_admin', 'institution_admin', 'faculty', 'instructor'].includes(user?.role);
  const isStudent = user?.role === 'student';
  const isFaculty = user?.role === 'faculty' || user?.role === 'instructor';

  // Navigation mode: 'list' | 'grid' | 'marksheet'
  const [viewMode, setViewMode] = useState('list');
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Strict Scoped Search Filters (Faculty Portal)
  const facultyDefaultDept = user?.department_code || (user?.department_id === 'dept-ec' ? 'EC' : (user?.department_id === 'dept-me' ? 'ME' : 'CS'));
  const [selectedDept, setSelectedDept] = useState(facultyDefaultDept);
  const [selectedSem, setSelectedSem] = useState(4);
  const [hasSearched, setHasSearched] = useState(!isFaculty);

  // Active Selected Exam & Mark Grid state
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [gridData, setGridData] = useState(null);
  const [gridLoading, setGridLoading] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // Live editable scores matrix: { [student_id]: { [question_id]: string_or_number } }
  const [marksState, setMarksState] = useState({});
  // Validation errors map: { `${student_id}_${question_id}`: errorMessage }
  const [validationErrors, setValidationErrors] = useState({});

  // Student Marksheet View state
  const [marksheetData, setMarksheetData] = useState(null);
  const [marksheetLoading, setMarksheetLoading] = useState(false);

  // Modals
  const [showCreateExamModal, setShowCreateExamModal] = useState(false);
  const [showConfigureSplitModal, setShowConfigureSplitModal] = useState(false);

  // Create Exam Form
  const [newTitle, setNewTitle] = useState('');
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newBatchId, setNewBatchId] = useState('');
  const [newExamType, setNewExamType] = useState('Internal 1');
  const [newMaxMarks, setNewMaxMarks] = useState('50');
  const [newDate, setNewDate] = useState('2026-03-30');
  const [newDuration, setNewDuration] = useState('90');
  const [creatingExam, setCreatingExam] = useState(false);
  const [createError, setCreateError] = useState('');

  // Configure Split Questions state
  const [splitQuestions, setSplitQuestions] = useState([
    { question_number: 1, question_label: 'Q1', section_part: 'Part A', max_marks: 2, topic_coverage: '' },
    { question_number: 2, question_label: 'Q2', section_part: 'Part A', max_marks: 2, topic_coverage: '' },
    { question_number: 3, question_label: 'Q3', section_part: 'Part A', max_marks: 2, topic_coverage: '' },
    { question_number: 4, question_label: 'Q4', section_part: 'Part A', max_marks: 2, topic_coverage: '' },
    { question_number: 5, question_label: 'Q5', section_part: 'Part A', max_marks: 2, topic_coverage: '' },
    { question_number: 6, question_label: 'Q6', section_part: 'Part B', max_marks: 10, topic_coverage: '' },
    { question_number: 7, question_label: 'Q7', section_part: 'Part B', max_marks: 10, topic_coverage: '' },
    { question_number: 8, question_label: 'Q8', section_part: 'Part B', max_marks: 10, topic_coverage: '' },
    { question_number: 9, question_label: 'Q9', section_part: 'Part B', max_marks: 10, topic_coverage: '' }
  ]);
  const [savingSplit, setSavingSplit] = useState(false);

  useEffect(() => {
    if (!isFaculty || hasSearched) {
      loadScopedExams(selectedDept, selectedSem);
    } else {
      loadMetaOnly();
    }
  }, [user?.id, user?.role]);

  async function loadMetaOnly() {
    setLoading(true);
    try {
      const [subsRes, batchesRes] = await Promise.all([
        api.getSubjects(),
        api.getBatches()
      ]);
      if (subsRes.ok && subsRes.data?.success) {
        setSubjects(subsRes.data.data || []);
        if (subsRes.data.data.length > 0) setNewSubjectId(subsRes.data.data[0].id);
      }
      if (batchesRes.ok && batchesRes.data?.success) {
        setBatches(batchesRes.data.data || []);
        if (batchesRes.data.data.length > 0) setNewBatchId(batchesRes.data.data[0].id);
      }
      setExams([]);
    } catch (e) {
      console.error('[Exams Meta Load Error]', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadScopedExams(dept = selectedDept, sem = selectedSem) {
    setLoading(true);
    try {
      const examParams = isFaculty ? { department: dept, semester: sem } : {};
      const [examsRes, subsRes, batchesRes] = await Promise.all([
        api.getExams(examParams),
        api.getSubjects(),
        api.getBatches()
      ]);
      if (examsRes.ok && examsRes.data.success) {
        setExams(examsRes.data.data || []);
      }
      if (subsRes.ok && subsRes.data.success) {
        setSubjects(subsRes.data.data || []);
        if (subsRes.data.data.length > 0) setNewSubjectId(subsRes.data.data[0].id);
      }
      if (batchesRes.ok && batchesRes.data.success) {
        setBatches(batchesRes.data.data || []);
        if (batchesRes.data.data.length > 0) setNewBatchId(batchesRes.data.data[0].id);
      }
    } catch (e) {
      console.error('[Exams Load Error]', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadInitialData() {
    await loadScopedExams(selectedDept, selectedSem);
  }

  // Open Interactive Mark Entry Grid (Faculty / Admin only)
  const handleOpenMarkGrid = async (examId) => {
    if (!isFacultyOrAdmin) {
      alert('Access Denied: Only teachers, instructors, and administrators can evaluate or enter marks.');
      return;
    }
    setSelectedExamId(examId);
    setViewMode('grid');
    setGridLoading(true);
    setValidationErrors({});
    setSaveStatus(null);

    try {
      const res = await api.getExamMarkGrid(examId);
      if (res.ok && res.data.success) {
        setGridData(res.data.data);
        // Initialize editable marksState from server marks_matrix
        const initialMatrix = {};
        const matrix = res.data.data.marks_matrix || {};
        Object.keys(matrix).forEach(stdId => {
          initialMatrix[stdId] = {};
          Object.keys(matrix[stdId]).forEach(qId => {
            const val = matrix[stdId][qId];
            initialMatrix[stdId][qId] = val !== null && val !== undefined ? String(val) : '';
          });
        });
        setMarksState(initialMatrix);
      }
    } catch (err) {
      console.error('[Open Mark Grid Error]', err);
    } finally {
      setGridLoading(false);
    }
  };

  // Open Itemized Student Marksheet View
  const handleOpenMarksheet = async (examId, studentId) => {
    const targetStudentId = studentId || user?.id;
    setViewMode('marksheet');
    setMarksheetLoading(true);
    try {
      const res = await api.getStudentMarksheet(examId, targetStudentId);
      if (res.ok && res.data.success) {
        setMarksheetData(res.data.data);
      }
    } catch (err) {
      console.error('[Open Marksheet Error]', err);
    } finally {
      setMarksheetLoading(false);
    }
  };

  // Real-time client-side cell mark change with strict validation
  const handleCellChange = (studentId, questionId, textValue, maxMarks) => {
    // Update local state
    setMarksState(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [questionId]: textValue
      }
    }));

    const errorKey = `${studentId}_${questionId}`;
    if (!textValue || textValue.trim() === '') {
      // Clear error if empty
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });
      return;
    }

    const numVal = parseFloat(textValue);
    if (isNaN(numVal) || numVal < 0) {
      setValidationErrors(prev => ({ ...prev, [errorKey]: 'Mark cannot be negative.' }));
    } else if (numVal > maxMarks) {
      setValidationErrors(prev => ({
        ...prev,
        [errorKey]: `Exceeds max allowed (${maxMarks} marks).`
      }));
    } else {
      // Valid score
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });
    }
  };

  // Dynamic Auto-Summation: Compute real-time total for student
  const computeStudentLiveTotal = (studentId) => {
    const stdMarks = marksState[studentId] || {};
    let total = 0;
    let hasEntries = false;
    Object.values(stdMarks).forEach(val => {
      if (val !== '' && val !== null && val !== undefined) {
        const n = parseFloat(val);
        if (!isNaN(n)) {
          total += n;
          hasEntries = true;
        }
      }
    });
    return hasEntries ? parseFloat(total.toFixed(2)) : '-';
  };

  // Save entered marks to server
  const handleSaveMarks = async () => {
    if (Object.keys(validationErrors).length > 0) {
      alert('Please fix marks that exceed maximum allowed questions before saving.');
      return;
    }

    setSavingMarks(true);
    setSaveStatus(null);

    const payload = [];
    Object.keys(marksState).forEach(studentId => {
      Object.keys(marksState[studentId] || {}).forEach(questionId => {
        const val = marksState[studentId][questionId];
        if (val !== '' && val !== null && val !== undefined) {
          payload.push({
            student_id: studentId,
            question_id: questionId,
            marks_obtained: parseFloat(val)
          });
        }
      });
    });

    if (payload.length === 0) {
      setSavingMarks(false);
      setSaveStatus({ type: 'warning', text: 'No marks entered to save.' });
      return;
    }

    try {
      const res = await api.saveExamMarks(selectedExamId, payload);
      if (res.ok && res.data.success) {
        setSaveStatus({ type: 'success', text: `Saved ${payload.length} question marks successfully!` });
        // Refresh grid background data
        api.getExamMarkGrid(selectedExamId).then(r => {
          if (r.ok && r.data.success) setGridData(r.data.data);
        });
        loadInitialData();
      } else {
        setSaveStatus({ type: 'error', text: res.data?.message || 'Failed to save marks.' });
      }
    } catch (err) {
      setSaveStatus({ type: 'error', text: 'Network connection failed while saving marks.' });
    } finally {
      setSavingMarks(false);
    }
  };

  // Publish Exam to Students
  const handlePublishExam = async () => {
    if (!selectedExamId) return;
    try {
      const res = await api.publishExam(selectedExamId);
      if (res.ok && res.data.success) {
        setSaveStatus({ type: 'success', text: 'Exam published! Results are now visible to students.' });
        loadInitialData();
        if (gridData) {
          setGridData(prev => ({
            ...prev,
            exam: { ...prev.exam, status: 'published' }
          }));
        }
      } else {
        alert(res.data?.message || 'Failed to publish exam.');
      }
    } catch (err) {
      alert('Error publishing exam.');
    }
  };

  // Open Question Split Configuration Modal
  const handleOpenConfigureSplit = (exam) => {
    setSelectedExamId(exam.id);
    const existingQ = exam.questions || [];
    if (existingQ.length > 0) {
      setSplitQuestions(existingQ);
    } else {
      // Default standard pattern for 50 marks
      setSplitQuestions([
        { question_number: 1, question_label: 'Q1', section_part: 'Part A', max_marks: 2, topic_coverage: '' },
        { question_number: 2, question_label: 'Q2', section_part: 'Part A', max_marks: 2, topic_coverage: '' },
        { question_number: 3, question_label: 'Q3', section_part: 'Part A', max_marks: 2, topic_coverage: '' },
        { question_number: 4, question_label: 'Q4', section_part: 'Part A', max_marks: 2, topic_coverage: '' },
        { question_number: 5, question_label: 'Q5', section_part: 'Part A', max_marks: 2, topic_coverage: '' },
        { question_number: 6, question_label: 'Q6', section_part: 'Part B', max_marks: 10, topic_coverage: '' },
        { question_number: 7, question_label: 'Q7', section_part: 'Part B', max_marks: 10, topic_coverage: '' },
        { question_number: 8, question_label: 'Q8', section_part: 'Part B', max_marks: 10, topic_coverage: '' },
        { question_number: 9, question_label: 'Q9', section_part: 'Part B', max_marks: 10, topic_coverage: '' }
      ]);
    }
    setShowConfigureSplitModal(true);
  };

  const handleSaveQuestionSplit = async () => {
    setSavingSplit(true);
    try {
      const res = await api.configureExamQuestions(selectedExamId, splitQuestions);
      if (res.ok && res.data.success) {
        setShowConfigureSplitModal(false);
        loadInitialData();
        // If grid is open, refresh
        if (viewMode === 'grid') handleOpenMarkGrid(selectedExamId);
      } else {
        alert(res.data?.message || 'Failed to save question configuration.');
      }
    } catch (err) {
      alert('Error saving question configuration.');
    } finally {
      setSavingSplit(false);
    }
  };

  const handleAddSplitRow = () => {
    const nextNum = splitQuestions.length + 1;
    setSplitQuestions(prev => [
      ...prev,
      {
        question_number: nextNum,
        question_label: `Q${nextNum}`,
        section_part: nextNum <= 5 ? 'Part A' : 'Part B',
        max_marks: nextNum <= 5 ? 2 : 10,
        topic_coverage: ''
      }
    ]);
  };

  const handleRemoveSplitRow = (index) => {
    setSplitQuestions(prev => prev.filter((_, idx) => idx !== index));
  };

  // Handle Create New Exam Submit
  const handleCreateExamSubmit = async () => {
    setCreateError('');
    if (!newTitle || !newSubjectId || !newBatchId || !newDate) {
      setCreateError('Please fill in Title, Subject, Batch, and Exam Date.');
      return;
    }

    setCreatingExam(true);
    try {
      const res = await api.createExam({
        title: newTitle,
        subject_id: newSubjectId,
        batch_id: newBatchId,
        exam_type: newExamType,
        max_total_marks: parseFloat(newMaxMarks) || 50,
        exam_date: newDate,
        duration_minutes: parseInt(newDuration, 10) || 90
      });

      if (res.ok && res.data.success) {
        setShowCreateExamModal(false);
        setNewTitle('');
        loadInitialData();
        // Prompt to configure questions
        handleOpenConfigureSplit(res.data.data);
      } else {
        setCreateError(res.data?.message || 'Failed to create exam.');
      }
    } catch (err) {
      setCreateError('Network error while creating exam.');
    } finally {
      setCreatingExam(false);
    }
  };

  const splitConfigSum = splitQuestions.reduce((acc, q) => acc + (parseFloat(q.max_marks) || 0), 0);

  // ==========================================
  // VIEW 2: INTERACTIVE MARK ENTRY GRID (Spreadsheet Mode)
  // ==========================================
  if (viewMode === 'grid') {
    if (!isFacultyOrAdmin) {
      setViewMode('list');
      return null;
    }

    if (gridLoading || !gridData) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading Interactive Mark Entry Grid...</Text>
        </View>
      );
    }

    const { exam, questions, students } = gridData;

    return (
      <View style={styles.container}>
        {/* Grid Header & Command Bar */}
        <View style={styles.gridHeaderBar}>
          <View style={{ flex: 1 }}>
            <TouchableOpacity onPress={() => setViewMode('list')} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Back to All Exams</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Text style={styles.gridExamTitle}>{exam.title}</Text>
              <View style={[styles.statusPill, exam.status === 'published' ? styles.statusPublished : styles.statusDraft]}>
                <Text style={styles.statusPillText}>{exam.status.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.gridExamMeta}>
              {exam.subject_code} • {exam.subject_name} • {exam.batch_name} • Max Total: {exam.max_total_marks} Marks
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.gridActionGroup}>
            <TouchableOpacity
              style={styles.configBtn}
              onPress={() => handleOpenConfigureSplit(exam)}
              activeOpacity={0.8}
            >
              <Text style={styles.configBtnText}>⚙️ Split Pattern</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveDraftBtn, savingMarks && { opacity: 0.7 }]}
              onPress={handleSaveMarks}
              disabled={savingMarks}
              activeOpacity={0.8}
            >
              {savingMarks ? <ActivityIndicator size="small" color="#FFF" /> : (
                <Text style={styles.saveDraftBtnText}>💾 Save Draft Marks</Text>
              )}
            </TouchableOpacity>

            {exam.status !== 'published' && (
              <TouchableOpacity
                style={styles.publishBtn}
                onPress={handlePublishExam}
                activeOpacity={0.8}
              >
                <Text style={styles.publishBtnText}>🚀 Publish Results</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Real-time Status / Alert Banner */}
        {saveStatus && (
          <View style={[
            styles.alertBanner,
            saveStatus.type === 'success' && styles.alertSuccess,
            saveStatus.type === 'error' && styles.alertError,
            saveStatus.type === 'warning' && styles.alertWarning
          ]}>
            <Text style={styles.alertBannerText}>{saveStatus.text}</Text>
          </View>
        )}

        {/* Validation Instructions */}
        <View style={styles.gridHelpBar}>
          <Text style={styles.gridHelpText}>
            ⌨️ Enter marks for each question. Real-time validation prevents scores from exceeding maximum question values.
            Total marks auto-calculate dynamically in real time.
          </Text>
        </View>

        {/* SPREADSHEET TABLE (Horizontal & Vertical Scrollable) */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={styles.spreadsheet}>
              {/* Table Header */}
              <View style={styles.ssHeaderRow}>
                <View style={[styles.ssHeaderCell, styles.ssCellFixed, { width: 100 }]}>
                  <Text style={styles.ssHeaderLabel}>Roll Number</Text>
                </View>
                <View style={[styles.ssHeaderCell, styles.ssCellFixed, { width: 170 }]}>
                  <Text style={styles.ssHeaderLabel}>Student Name</Text>
                </View>

                {/* Question Columns with Split Max Marks */}
                {questions.map(q => (
                  <View key={q.id} style={[styles.ssHeaderCell, { width: 88 }]}>
                    <Text style={styles.ssQNum}>{q.question_label}</Text>
                    <View style={styles.ssMaxPill}>
                      <Text style={styles.ssMaxPillText}>Max {q.max_marks}</Text>
                    </View>
                    <Text style={styles.ssSectionPart}>{q.section_part}</Text>
                  </View>
                ))}

                {/* Auto Calculated Total Column */}
                <View style={[styles.ssHeaderCell, styles.ssTotalCellHeader, { width: 110 }]}>
                  <Text style={styles.ssTotalHeaderLabel}>Auto Total</Text>
                  <Text style={styles.ssTotalMaxSub}>/ {exam.max_total_marks}</Text>
                </View>

                {/* Student Marksheet Action */}
                <View style={[styles.ssHeaderCell, { width: 100 }]}>
                  <Text style={styles.ssHeaderLabel}>View Sheet</Text>
                </View>
              </View>

              {/* Student Rows */}
              {students.map((student, rIdx) => {
                const liveTotal = computeStudentLiveTotal(student.student_id);
                return (
                  <View key={student.student_id} style={[styles.ssRow, rIdx % 2 === 1 && styles.ssRowAlt]}>
                    {/* Fixed Roll Number */}
                    <View style={[styles.ssCell, styles.ssCellFixed, { width: 100 }]}>
                      <Text style={styles.ssRollText}>{student.roll_no}</Text>
                    </View>

                    {/* Fixed Student Name */}
                    <View style={[styles.ssCell, styles.ssCellFixed, { width: 170 }]}>
                      <Text style={styles.ssNameText} numberOfLines={1}>{student.name}</Text>
                    </View>

                    {/* Question Input Cells */}
                    {questions.map(q => {
                      const val = (marksState[student.student_id] && marksState[student.student_id][q.id]) || '';
                      const hasError = !!validationErrors[`${student.student_id}_${q.id}`];

                      return (
                        <View key={q.id} style={[styles.ssCell, { width: 88 }]}>
                          <TextInput
                            style={[
                              styles.ssInput,
                              hasError && styles.ssInputError,
                              val !== '' && !hasError && styles.ssInputFilled
                            ]}
                            keyboardType="numeric"
                            value={val}
                            placeholder="0"
                            placeholderTextColor={colors.textMuted}
                            onChangeText={(text) => handleCellChange(student.student_id, q.id, text, q.max_marks)}
                          />
                          {hasError && (
                            <Text style={styles.errorTip}>Max {q.max_marks}</Text>
                          )}
                        </View>
                      );
                    })}

                    {/* Live Calculated Total Score */}
                    <View style={[styles.ssCell, styles.ssTotalCell, { width: 110 }]}>
                      <Text style={[styles.liveTotalText, liveTotal !== '-' && styles.liveTotalTextActive]}>
                        {liveTotal}
                      </Text>
                    </View>

                    {/* Marksheet button */}
                    <View style={[styles.ssCell, { width: 100, alignItems: 'center' }]}>
                      <TouchableOpacity
                        style={styles.sheetActionBtn}
                        onPress={() => handleOpenMarksheet(exam.id, student.student_id)}
                      >
                        <Text style={styles.sheetActionText}>📄 Grade Card</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </ScrollView>
      </View>
    );
  }

  // ==========================================
  // VIEW 3: ITEMIZED STUDENT MARKSHEET (Grade Card)
  // ==========================================
  if (viewMode === 'marksheet') {
    if (marksheetLoading || !marksheetData) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Generating itemized marksheet...</Text>
        </View>
      );
    }

    const { exam, subject, student, summary, itemized_breakdown } = marksheetData;

    // 1. Aggregate Total Max Marks: Compute total_max_marks by summing individual question max_marks
    const questions = itemized_breakdown || marksheetData.questions || [];
    const totalMaxMarks = questions.reduce((sum, q) => sum + (Number(q.max_marks) || 0), 0) || Number(summary?.max_total_marks) || Number(exam?.max_total_marks) || Number(exam?.max_marks) || 0;
    const totalScoredMarks = questions.reduce((sum, q) => sum + (Number(q.scored !== undefined ? q.scored : q.marks_obtained) || 0), 0);

    // 2. Fix Percentage Computation: Dynamically calculate from totalScoredMarks / totalMaxMarks
    const calculatedPercentage = totalMaxMarks > 0 
      ? ((totalScoredMarks / totalMaxMarks) * 100).toFixed(1) 
      : '0.0';

    // 3. Fix Grade Logic (Remove wrongful 'RA / Re-Appear'):
    // Grade evaluation based on calculatedPercentage:
    // >= 90%: 'O' (Outstanding)
    // >= 80%: 'A+' (Excellent)
    // >= 70%: 'A' (Very Good)
    // >= 60%: 'B+' (Good)
    // >= 50%: 'B' (Average / Pass)
    // < 50%: 'RA' (Re-Appear)
    const getGradeDetails = (pctVal) => {
      const pctNum = parseFloat(pctVal);
      if (pctNum >= 90) return { grade: 'O', label: 'Outstanding', isPass: true };
      if (pctNum >= 80) return { grade: 'A+', label: 'Excellent', isPass: true };
      if (pctNum >= 70) return { grade: 'A', label: 'Very Good', isPass: true };
      if (pctNum >= 60) return { grade: 'B+', label: 'Good', isPass: true };
      if (pctNum >= 50) return { grade: 'B', label: 'Average / Pass', isPass: true };
      return { grade: 'RA', label: 'Re-Appear', isPass: false };
    };

    const gradeDetails = getGradeDetails(calculatedPercentage);

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity
          onPress={() => {
            if (isFacultyOrAdmin && selectedExamId) {
              setViewMode('grid');
            } else {
              setViewMode('list');
            }
          }}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>← Back to {isFacultyOrAdmin && selectedExamId ? 'Mark Entry Grid' : 'Exams'}</Text>
        </TouchableOpacity>

        {/* University Style Grade Sheet Card */}
        <View style={styles.gradeCardContainer}>
          {/* Header */}
          <View style={styles.gradeCardHeader}>
            <View style={styles.collegeEmblemSmall}>
              <Text style={{ fontSize: 28 }}>🏛️</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.gradeCollegeTitle}>ZENORA COLLEGE OF ENGINEERING & TECHNOLOGY</Text>
              <Text style={styles.gradeCollegeSub}>Autonomous Institution • Affiliated to Anna University</Text>
              <Text style={styles.gradeSheetTitle}>OFFICIAL STUDENT EXAM MARK SHEET</Text>
            </View>
          </View>

          {/* Student & Exam Info Grid */}
          <View style={styles.gradeInfoGrid}>
            <View style={styles.gradeInfoCol}>
              <Text style={styles.gradeInfoLabel}>Student Name:</Text>
              <Text style={styles.gradeInfoValue}>{student.name}</Text>

              <Text style={styles.gradeInfoLabel}>Roll Number:</Text>
              <Text style={styles.gradeInfoValue}>{student.roll_no}</Text>

              <Text style={styles.gradeInfoLabel}>University Register No:</Text>
              <Text style={styles.gradeInfoValue}>{student.register_no}</Text>
            </View>

            <View style={styles.gradeInfoCol}>
              <Text style={styles.gradeInfoLabel}>Exam Title:</Text>
              <Text style={styles.gradeInfoValue}>{exam.title}</Text>

              <Text style={styles.gradeInfoLabel}>Subject:</Text>
              <Text style={styles.gradeInfoValue}>{subject.code} – {subject.name}</Text>

              <Text style={styles.gradeInfoLabel}>Batch / Semester:</Text>
              <Text style={styles.gradeInfoValue}>{student.batch_name} (Sem {student.semester})</Text>
            </View>
          </View>

          {/* Summary Score Banner */}
          <View style={styles.scoreBanner}>
            <View style={styles.scoreBannerItem}>
              <Text style={styles.scoreBannerLabel}>Marks Scored</Text>
              <Text style={styles.scoreBannerValue}>{totalScoredMarks} / {totalMaxMarks}</Text>
            </View>
            <View style={styles.scoreBannerDivider} />
            <View style={styles.scoreBannerItem}>
              <Text style={styles.scoreBannerLabel}>Percentage</Text>
              <Text style={styles.scoreBannerValue}>{calculatedPercentage}%</Text>
            </View>
            <View style={styles.scoreBannerDivider} />
            <View style={styles.scoreBannerItem}>
              <Text style={styles.scoreBannerLabel}>Grade Awarded</Text>
              <View style={[
                styles.gradeBadgePill,
                {
                  backgroundColor: gradeDetails.isPass ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  borderColor: gradeDetails.isPass ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
                }
              ]}>
                <Text style={[styles.scoreBannerValue, { color: gradeDetails.isPass ? colors.accentEmerald : colors.accentAmber }]}>
                  {gradeDetails.grade} ({gradeDetails.label})
                </Text>
              </View>
            </View>
            <View style={styles.scoreBannerDivider} />
            <View style={styles.scoreBannerItem}>
              <Text style={styles.scoreBannerLabel}>Class Rank</Text>
              <Text style={styles.scoreBannerValue}>#{summary?.rank || 1} of {summary?.total_students_ranked || 1}</Text>
            </View>
          </View>

          {/* Itemized Question-by-Question Breakdown Table */}
          <Text style={styles.breakdownTitle}>Itemized Question-Wise Score Breakdown</Text>
          <View style={styles.breakdownTable}>
            <View style={styles.btHeader}>
              <Text style={[styles.btTh, { width: 70 }]}>Q. No</Text>
              <Text style={[styles.btTh, { width: 100 }]}>Section</Text>
              <Text style={[styles.btTh, { flex: 2 }]}>Topic Coverage / Question</Text>
              <Text style={[styles.btTh, { width: 90, textAlign: 'center' }]}>Max Marks</Text>
              <Text style={[styles.btTh, { width: 90, textAlign: 'center' }]}>Scored</Text>
              <Text style={[styles.btTh, { width: 90, textAlign: 'right' }]}>% Scored</Text>
            </View>

            {itemized_breakdown.map((row, idx) => (
              <View key={idx} style={[styles.btRow, idx % 2 === 1 && styles.btRowAlt]}>
                <View style={{ width: 70 }}>
                  <Text style={styles.btQNum}>{row.question_label}</Text>
                </View>
                <View style={{ width: 100 }}>
                  <Text style={styles.btSection}>{row.section_part}</Text>
                </View>
                <View style={{ flex: 2 }}>
                  <Text style={styles.btTopic}>{row.topic_coverage || 'Academic Assessment Question'}</Text>
                </View>
                <View style={{ width: 90, alignItems: 'center' }}>
                  <Text style={styles.btMaxMarks}>{row.max_marks}</Text>
                </View>
                <View style={{ width: 90, alignItems: 'center' }}>
                  <Text style={[styles.btScored, row.marks_obtained === row.max_marks && styles.btScoredFull]}>
                    {row.marks_obtained}
                  </Text>
                </View>
                <View style={{ width: 90, alignItems: 'flex-end' }}>
                  <Text style={styles.btPct}>{row.percentage}%</Text>
                </View>
              </View>
            ))}

            {/* Total Row */}
            <View style={styles.btTotalRow}>
              <Text style={[styles.btTotalLabel, { width: 170 }]}>CALCULATED TOTAL</Text>
              <View style={{ flex: 2 }} />
              <View style={{ width: 90, alignItems: 'center' }}>
                <Text style={styles.btTotalVal}>{totalMaxMarks}</Text>
              </View>
              <View style={{ width: 90, alignItems: 'center' }}>
                <Text style={[styles.btTotalVal, { color: colors.primaryLight }]}>{totalScoredMarks}</Text>
              </View>
              <View style={{ width: 90, alignItems: 'flex-end' }}>
                <Text style={[styles.btTotalVal, { color: colors.accentEmerald }]}>{calculatedPercentage}%</Text>
              </View>
            </View>
          </View>

          {/* Verification Footer */}
          <View style={styles.gradeCardFooter}>
            <Text style={styles.footerSealText}>
              ✓ Digitally Verified by Academic Controller • Zenora College LMS Exam Engine
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  // ==========================================
  // VIEW 1: MAIN EXAMS LIST & SELECTION
  // ==========================================
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header Bar */}
      <View style={styles.pageHeader}>
        <View>
          <View style={styles.titleBadgeRow}>
            <Text style={styles.pageTitle}>College Academic Examinations</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{exams.length} Exams</Text>
            </View>
          </View>
          <Text style={styles.pageSubtitle}>
            Internal Assessment Tests (IAT), Model practicals, Question split marks & Spreadsheet mark entry
          </Text>
        </View>

        {isFacultyOrAdmin && (
          <TouchableOpacity
            style={styles.createExamBtn}
            onPress={() => setShowCreateExamModal(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.createExamBtnText}>+ Create New Exam</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Mandatory Top Cohort Filter for Strict Scoped Access */}
      {isFacultyOrAdmin && (
        <View style={styles.cohortFilterCard}>
          <View style={styles.cohortFilterTopRow}>
            <View>
              <Text style={styles.cohortFilterTitle}>Classroom Cohort & Examination Scope</Text>
              <Text style={styles.cohortFilterSub}>
                Select Department and Semester to view scheduled exams and access spreadsheet mark entry
              </Text>
            </View>

            <TouchableOpacity
              style={styles.loadCohortBtn}
              onPress={() => {
                setHasSearched(true);
                loadScopedExams(selectedDept, selectedSem);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.loadCohortBtnText}>📋 Load Cohort Examinations</Text>
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
                    if (hasSearched) {
                      loadScopedExams(selectedDept, cohort.defaultSem);
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
          </View>
        </View>
      )}

      {/* Exams Grid Cards */}
      {isFaculty && !hasSearched ? (
        <View style={styles.promptCard}>
          <Text style={styles.promptIcon}>📝</Text>
          <Text style={styles.promptTitle}>Select Department and Semester to view students.</Text>
          <Text style={styles.promptSub}>
            To safeguard student records and optimize performance, choose an academic department and semester above to load examinations, question split patterns, and spreadsheet mark entry.
          </Text>
          <TouchableOpacity
            style={styles.searchActionBtn}
            onPress={() => {
              setHasSearched(true);
              loadScopedExams(selectedDept, selectedSem);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.searchActionBtnText}>📋 Load Cohort Examinations & Marks Entry</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading academic examinations...</Text>
        </View>
      ) : exams.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyTitle}>No examinations found for this cohort</Text>
          <Text style={styles.emptySubtitle}>Click "Create New Exam" above to schedule a college assessment for {selectedDept} Semester {selectedSem}.</Text>
        </View>
      ) : (
        <View style={styles.examsList}>
          {exams.map(exam => (
            <View key={exam.id} style={styles.examCard}>
              <View style={styles.examCardTop}>
                <View style={{ flex: 1 }}>
                  <View style={styles.examTagRow}>
                    <View style={styles.subjectBadge}>
                      <Text style={styles.subjectBadgeText}>{exam.subject_code}</Text>
                    </View>
                    <View style={[styles.statusPill, exam.status === 'published' ? styles.statusPublished : styles.statusDraft]}>
                      <Text style={styles.statusPillText}>{exam.status.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.examDateText}>📅 {exam.exam_date}</Text>
                  </View>

                  <Text style={styles.examTitle}>{exam.title}</Text>
                  <Text style={styles.examSubjectText}>{exam.subject_name}</Text>
                </View>

                {/* Score / Stats Badge */}
                <View style={styles.marksBadge}>
                  <Text style={styles.marksValue}>{exam.max_total_marks}</Text>
                  <Text style={styles.marksSub}>Max Marks</Text>
                </View>
              </View>

              {/* Stats Footer Row */}
              <View style={styles.examCardStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Target Batch:</Text>
                  <Text style={styles.statValue}>{exam.batch_name}</Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Questions Split:</Text>
                  <Text style={styles.statValue}>{exam.questions_count} Questions</Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Evaluated:</Text>
                  <Text style={styles.statValue}>{exam.evaluated_count || 0} / {exam.total_enrolled || 6} Students</Text>
                </View>

                {exam.class_average && (
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Class Average:</Text>
                    <Text style={[styles.statValue, { color: colors.accentEmerald }]}>{exam.class_average} / {exam.max_total_marks}</Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.examCardActions}>
                {isFacultyOrAdmin ? (
                  <>
                    <TouchableOpacity
                      style={styles.actionEnterMarks}
                      onPress={() => handleOpenMarkGrid(exam.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionEnterMarksText}>📊 Spreadsheet Mark Entry Grid</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionSplitConfig}
                      onPress={() => handleOpenConfigureSplit(exam)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionSplitConfigText}>⚙️ Configure Split Pattern</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.actionEnterMarks}
                    onPress={() => handleOpenMarksheet(exam.id, user?.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionEnterMarksText}>📄 View Itemized Mark Sheet</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* MODAL: CREATE EXAM */}
      <Modal
        visible={showCreateExamModal}
        onClose={() => setShowCreateExamModal(false)}
        title="Schedule New Academic Examination"
      >
        <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
          {createError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{createError}</Text>
            </View>
          ) : null}

          <View style={styles.formField}>
            <Text style={styles.label}>Exam Title *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Internal Assessment Test 2 (IAT-2)"
              placeholderTextColor={colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
            />
          </View>

          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.label}>Curriculum Subject *</Text>
              <select
                style={{ ...webSelectStyle, width: '100%', height: 42 }}
                value={newSubjectId}
                onChange={(e) => setNewSubjectId(e.target.value)}
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.code} – {s.name}</option>
                ))}
              </select>
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Target Batch / Class *</Text>
              <select
                style={{ ...webSelectStyle, width: '100%', height: 42 }}
                value={newBatchId}
                onChange={(e) => setNewBatchId(e.target.value)}
              >
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} (Sem {b.semester})</option>
                ))}
              </select>
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.label}>Exam Type</Text>
              <select
                style={{ ...webSelectStyle, width: '100%', height: 42 }}
                value={newExamType}
                onChange={(e) => setNewExamType(e.target.value)}
              >
                <option value="Internal 1">Internal Assessment 1</option>
                <option value="Internal 2">Internal Assessment 2</option>
                <option value="Model Exam">Model Examination</option>
                <option value="Lab Practical">Lab Practical Exam</option>
                <option value="Semester Exam">Semester End Exam</option>
              </select>
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Max Total Marks</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={newMaxMarks}
                onChangeText={setNewMaxMarks}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.label}>Exam Date (YYYY-MM-DD) *</Text>
              <TextInput
                style={styles.modalInput}
                value={newDate}
                onChangeText={setNewDate}
                placeholder="2026-03-30"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Duration (Minutes)</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={newDuration}
                onChangeText={setNewDuration}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleCreateExamSubmit}
            disabled={creatingExam}
          >
            {creatingExam ? <ActivityIndicator color="#FFF" /> : (
              <Text style={styles.submitBtnText}>✓ Create Exam & Configure Split</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {/* MODAL: CONFIGURE QUESTION SPLIT */}
      <Modal
        visible={showConfigureSplitModal}
        onClose={() => setShowConfigureSplitModal(false)}
        title="Configure Question-Wise Split Marks Pattern"
      >
        <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.splitHelpText}>
            Define question numbers, section parts (e.g. Part A 2 marks, Part B 10 marks), and individual maximum marks.
          </Text>

          {/* Current Tally indicator */}
          <View style={styles.tallyBox}>
            <Text style={styles.tallyLabel}>Configured Total Marks:</Text>
            <Text style={[styles.tallyValue, { color: colors.primaryLight }]}>{splitConfigSum} Marks</Text>
            <Text style={styles.tallyCount}>({splitQuestions.length} Questions)</Text>
          </View>

          {/* Questions Rows */}
          {splitQuestions.map((q, idx) => (
            <View key={idx} style={styles.splitRow}>
              <View style={{ width: 60 }}>
                <Text style={styles.splitSubLabel}>Label</Text>
                <TextInput
                  style={styles.splitInput}
                  value={q.question_label}
                  onChangeText={(txt) => {
                    const next = [...splitQuestions];
                    next[idx].question_label = txt;
                    setSplitQuestions(next);
                  }}
                />
              </View>

              <View style={{ width: 110 }}>
                <Text style={styles.splitSubLabel}>Section</Text>
                <select
                  style={{ ...webSelectStyle, height: 36, fontSize: '11px' }}
                  value={q.section_part}
                  onChange={(e) => {
                    const next = [...splitQuestions];
                    next[idx].section_part = e.target.value;
                    setSplitQuestions(next);
                  }}
                >
                  <option value="Part A">Part A (Short)</option>
                  <option value="Part B">Part B (Descriptive)</option>
                  <option value="Part C">Part C (Case Study)</option>
                </select>
              </View>

              <View style={{ width: 80 }}>
                <Text style={styles.splitSubLabel}>Max Marks</Text>
                <TextInput
                  style={styles.splitInput}
                  keyboardType="numeric"
                  value={String(q.max_marks)}
                  onChangeText={(txt) => {
                    const next = [...splitQuestions];
                    next[idx].max_marks = parseFloat(txt) || 0;
                    setSplitQuestions(next);
                  }}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.splitSubLabel}>Topic Coverage / Unit</Text>
                <TextInput
                  style={styles.splitInput}
                  placeholder="e.g. Unit 2 B+ Trees"
                  placeholderTextColor={colors.textMuted}
                  value={q.topic_coverage}
                  onChangeText={(txt) => {
                    const next = [...splitQuestions];
                    next[idx].topic_coverage = txt;
                    setSplitQuestions(next);
                  }}
                />
              </View>

              {splitQuestions.length > 1 && (
                <TouchableOpacity
                  style={styles.removeSplitBtn}
                  onPress={() => handleRemoveSplitRow(idx)}
                >
                  <Text style={{ color: colors.accentRose, fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          <TouchableOpacity style={styles.addSplitRowBtn} onPress={handleAddSplitRow}>
            <Text style={styles.addSplitRowBtnText}>+ Add Another Question</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSaveQuestionSplit}
            disabled={savingSplit}
          >
            {savingSplit ? <ActivityIndicator color="#FFF" /> : (
              <Text style={styles.submitBtnText}>✓ Save Question Pattern</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}

const webSelectStyle = {
  backgroundColor: colors.bgDark,
  color: colors.textPrimary,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: '8px',
  padding: '6px 12px',
  fontSize: '12px',
  outline: 'none',
  cursor: 'pointer'
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark
  },
  content: {
    padding: 24
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    marginTop: 12
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary
  },
  countBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)'
  },
  countBadgeText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: typography.weight.bold
  },
  pageSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    marginTop: 4
  },
  createExamBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  createExamBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: typography.weight.bold
  },
  emptyWrap: {
    backgroundColor: colors.bgCard,
    padding: 40,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: typography.size.xs,
    marginTop: 4
  },
  examsList: {
    gap: 16
  },
  examCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  examCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  examTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  subjectBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  subjectBadgeText: {
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: typography.weight.bold
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  statusPublished: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)'
  },
  statusDraft: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)'
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary
  },
  examDateText: {
    color: colors.textMuted,
    fontSize: 11
  },
  examTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: typography.weight.bold
  },
  examSubjectText: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    marginTop: 2
  },
  marksBadge: {
    backgroundColor: colors.bgDark,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  marksValue: {
    color: colors.primaryLight,
    fontSize: 20,
    fontWeight: typography.weight.bold
  },
  marksSub: {
    color: colors.textMuted,
    fontSize: 10
  },
  examCardStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    backgroundColor: colors.bgDark,
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: typography.weight.semibold
  },
  examCardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14
  },
  actionEnterMarks: {
    backgroundColor: colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8
  },
  actionEnterMarksText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: typography.weight.bold
  },
  actionSplitConfig: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  actionSplitConfigText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: typography.weight.medium
  },
  // Interactive Grid styles
  gridHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  backBtn: {
    marginBottom: 4
  },
  backBtnText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: typography.weight.semibold
  },
  gridExamTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: typography.weight.bold,
    marginRight: 10
  },
  gridExamMeta: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2
  },
  gridActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  configBtn: {
    backgroundColor: colors.bgDark,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  configBtnText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: typography.weight.semibold
  },
  saveDraftBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)'
  },
  saveDraftBtnText: {
    color: colors.accentEmerald,
    fontSize: 12,
    fontWeight: typography.weight.bold
  },
  publishBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8
  },
  publishBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: typography.weight.bold
  },
  gridHelpBar: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  gridHelpText: {
    color: colors.textSecondary,
    fontSize: 11
  },
  alertBanner: {
    paddingVertical: 8,
    paddingHorizontal: 16
  },
  alertSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)'
  },
  alertError: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)'
  },
  alertWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)'
  },
  alertBannerText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: typography.weight.semibold
  },
  // Spreadsheet Table
  spreadsheet: {
    backgroundColor: colors.bgCard
  },
  ssHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  ssHeaderCell: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.borderLight
  },
  ssCellFixed: {
    alignItems: 'flex-start',
    paddingLeft: 12
  },
  ssHeaderLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: typography.weight.bold
  },
  ssQNum: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: typography.weight.bold
  },
  ssMaxPill: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2
  },
  ssMaxPillText: {
    color: colors.primaryLight,
    fontSize: 9,
    fontWeight: typography.weight.bold
  },
  ssSectionPart: {
    color: colors.textMuted,
    fontSize: 8,
    marginTop: 2
  },
  ssTotalCellHeader: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)'
  },
  ssTotalHeaderLabel: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: typography.weight.bold
  },
  ssTotalMaxSub: {
    color: colors.textMuted,
    fontSize: 9
  },
  ssRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    alignItems: 'center'
  },
  ssRowAlt: {
    backgroundColor: 'rgba(255, 255, 255, 0.015)'
  },
  ssCell: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.borderLight
  },
  ssRollText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: typography.weight.bold
  },
  ssNameText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: typography.weight.semibold
  },
  ssInput: {
    height: 34,
    backgroundColor: colors.bgDark,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
    color: colors.textPrimary,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: typography.weight.semibold
  },
  ssInputFilled: {
    borderColor: 'rgba(99, 102, 241, 0.4)'
  },
  ssInputError: {
    borderColor: colors.accentRose,
    backgroundColor: 'rgba(239, 68, 68, 0.15)'
  },
  errorTip: {
    color: colors.accentRose,
    fontSize: 8,
    textAlign: 'center',
    marginTop: 2
  },
  ssTotalCell: {
    backgroundColor: 'rgba(99, 102, 241, 0.06)',
    alignItems: 'center'
  },
  liveTotalText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: typography.weight.bold
  },
  liveTotalTextActive: {
    color: colors.accentEmerald
  },
  sheetActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 6
  },
  sheetActionText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: typography.weight.semibold
  },
  // Grade Sheet View styles
  gradeCardContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    marginTop: 10,
    ...Platform.select({
      web: { boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)' }
    })
  },
  gradeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.borderLight,
    paddingBottom: 16,
    marginBottom: 20
  },
  collegeEmblemSmall: {
    marginRight: 16
  },
  gradeCollegeTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: typography.weight.bold,
    letterSpacing: 1
  },
  gradeCollegeSub: {
    color: colors.primaryLight,
    fontSize: 11,
    marginTop: 2
  },
  gradeSheetTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.5,
    marginTop: 6
  },
  gradeInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.bgDark,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 20
  },
  gradeInfoCol: {
    flex: 1
  },
  gradeInfoLabel: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 6
  },
  gradeInfoValue: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: typography.weight.bold
  },
  scoreBanner: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 20
  },
  scoreBannerItem: {
    alignItems: 'center'
  },
  scoreBannerLabel: {
    color: colors.textMuted,
    fontSize: 10,
    marginBottom: 4
  },
  scoreBannerValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: typography.weight.bold
  },
  scoreBannerDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.borderLight
  },
  gradeBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  breakdownTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: typography.weight.bold,
    marginBottom: 10
  },
  breakdownTable: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden'
  },
  btHeader: {
    flexDirection: 'row',
    backgroundColor: colors.bgDark,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  btTh: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: typography.weight.bold
  },
  btRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    alignItems: 'center'
  },
  btRowAlt: {
    backgroundColor: 'rgba(255, 255, 255, 0.015)'
  },
  btQNum: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: typography.weight.bold
  },
  btSection: {
    color: colors.textMuted,
    fontSize: 11
  },
  btTopic: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: typography.weight.medium
  },
  btMaxMarks: {
    color: colors.textMuted,
    fontSize: 12
  },
  btScored: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: typography.weight.bold
  },
  btScoredFull: {
    color: colors.accentEmerald
  },
  btPct: {
    color: colors.textSecondary,
    fontSize: 11
  },
  btTotalRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgDark,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderTopWidth: 2,
    borderTopColor: colors.borderLight,
    alignItems: 'center'
  },
  btTotalLabel: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: typography.weight.bold
  },
  btTotalVal: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: typography.weight.bold
  },
  gradeCardFooter: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    alignItems: 'center'
  },
  footerSealText: {
    color: colors.accentEmerald,
    fontSize: 10,
    fontWeight: typography.weight.semibold
  },
  // Modal & form styles
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12
  },
  formField: {
    flex: 1,
    marginBottom: 12
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: typography.weight.semibold,
    marginBottom: 6
  },
  modalInput: {
    height: 42,
    backgroundColor: colors.bgDark,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 12,
    color: colors.textPrimary,
    fontSize: typography.size.xs
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  errorBoxText: {
    color: colors.accentRose,
    fontSize: 12
  },
  // Split Config styles
  splitHelpText: {
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 12,
    lineHeight: 16
  },
  tallyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgDark,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 14,
    gap: 8
  },
  tallyLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: typography.weight.semibold
  },
  tallyValue: {
    fontSize: 13,
    fontWeight: typography.weight.bold
  },
  tallyCount: {
    color: colors.textMuted,
    fontSize: 11
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 10,
    backgroundColor: colors.bgDark,
    padding: 8,
    borderRadius: 8
  },
  splitSubLabel: {
    color: colors.textMuted,
    fontSize: 9,
    marginBottom: 4
  },
  splitInput: {
    height: 36,
    backgroundColor: colors.bgCard,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 8,
    color: colors.textPrimary,
    fontSize: 11
  },
  removeSplitBtn: {
    padding: 6,
    justifyContent: 'center'
  },
  addSplitRowBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
    borderRadius: 8,
    marginTop: 6
  },
  addSplitRowBtnText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: typography.weight.semibold
  },

  /* Cohort Filter Panel & Prompt Styles */
  cohortFilterCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 18,
    marginBottom: 16
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
    marginBottom: 20,
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
