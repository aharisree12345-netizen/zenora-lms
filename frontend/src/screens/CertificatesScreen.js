import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform
} from 'react-native';
import { colors, typography } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { GlassCard } from '../components/GlassCard';
import { Badge } from '../components/Badge';

export function CertificatesScreen() {
  const { user } = useAuth();
  const isFacultyOrAdmin = ['super_admin', 'institution_admin', 'faculty', 'instructor'].includes(user?.role);
  const isStudent = user?.role === 'student';

  const [selectedSemester, setSelectedSemester] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentsList, setStudentsList] = useState([]);
  const [eligibility, setEligibility] = useState(null);
  const [availableSemesters, setAvailableSemesters] = useState([]);
  const [gradeSheetData, setGradeSheetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  // Load students directory for faculty/admin selector
  useEffect(() => {
    if (isFacultyOrAdmin) {
      api.getStudents().then(res => {
        if (res.ok && res.data?.success) {
          const list = res.data.data || [];
          setStudentsList(list);
          if (list.length > 0 && !selectedStudentId) {
            setSelectedStudentId(list[0].id);
          }
        }
      }).catch(() => {});
    }
  }, [user?.role]);

  // Load Eligibility and initial Marksheet whenever user or selected student changes
  useEffect(() => {
    loadEligibilityAndSheet();
  }, [selectedStudentId, user?.id]);

  async function loadEligibilityAndSheet(preferredSem = null) {
    setLoading(true);
    setError(null);
    setIsLocked(false);
    try {
      const studentIdToFetch = isFacultyOrAdmin ? selectedStudentId : user?.id;
      if (!studentIdToFetch) return;

      const eligRes = await api.getResultsEligibility(studentIdToFetch);
      if (eligRes.ok && eligRes.data?.success) {
        const elig = eligRes.data.data;
        setEligibility(elig);
        const completed = elig.completed_semesters || [];
        setAvailableSemesters(completed);

        if (completed.length === 0) {
          setSelectedSemester(null);
          setGradeSheetData(null);
          setIsLocked(true);
          setError(`Results not yet declared. Semester ${elig.current_semester} examinations are currently ongoing.`);
          setLoading(false);
          return;
        }

        // Default to latest completed semester (e.g. S3 for an S4 student)
        const latestSem = elig.latest_completed_semester || completed[completed.length - 1];
        const targetSem = (preferredSem && completed.includes(preferredSem)) ? preferredSem : latestSem;
        setSelectedSemester(targetSem);

        // Fetch marksheet for target completed semester
        const sheetRes = await api.getSemesterGradeSheet(targetSem, studentIdToFetch);
        if (sheetRes.ok && sheetRes.data?.success) {
          setGradeSheetData(sheetRes.data.data);
          setIsLocked(false);
          setError(null);
        } else {
          setGradeSheetData(null);
          setIsLocked(sheetRes.status === 403 || sheetRes.data?.status === 'unpublished');
          setError(sheetRes.data?.message || 'Mark sheet not available for future or ongoing semesters.');
        }
      } else {
        setError('Unable to verify examination eligibility.');
      }
    } catch (err) {
      console.error('[Load Grade Sheet Error]', err);
      setError('Network error: Unable to load semester marksheet.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSemesterChange(sem) {
    setSelectedSemester(sem);
    const studentIdToFetch = isFacultyOrAdmin ? selectedStudentId : user?.id;

    // Check if requested semester is completed
    if (eligibility && sem >= eligibility.current_semester) {
      setGradeSheetData(null);
      setIsLocked(true);
      setError('Mark sheet not available for future or ongoing semesters.');
      return;
    }

    setLoading(true);
    setError(null);
    setIsLocked(false);
    try {
      const sheetRes = await api.getSemesterGradeSheet(sem, studentIdToFetch);
      if (sheetRes.ok && sheetRes.data?.success) {
        setGradeSheetData(sheetRes.data.data);
        setIsLocked(false);
        setError(null);
      } else {
        setGradeSheetData(null);
        setIsLocked(sheetRes.status === 403 || sheetRes.data?.status === 'unpublished');
        setError(sheetRes.data?.message || 'Mark sheet not available for future or ongoing semesters.');
      }
    } catch (err) {
      setError('Network error: Unable to load semester marksheet.');
    } finally {
      setLoading(false);
    }
  }

  const handlePrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
    }
  };

  const sheet = gradeSheetData;
  const header = sheet?.header || {};
  const student = sheet?.student || {};
  const subjects = sheet?.subjects || [];
  const summary = sheet?.summary || {};
  const verification = sheet?.verification || {};

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Controls Bar (Hidden during print) */}
      <View style={styles.noPrint}>
        <View style={styles.headerRow}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={styles.headerTitle}>University Semester Grade Sheet / Mark Card</Text>
              <Badge label="Autonomous CBCS" variant="primary" />
            </View>
            <Text style={styles.headerSub}>
              Official Provisional Statement of Marks & Grades issued under Anna University Autonomous Regulation 2021.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionBtnsRow}>
            <TouchableOpacity style={styles.printBtn} onPress={handlePrint} activeOpacity={0.8}>
              <Text style={styles.printBtnIcon}>🖨️</Text>
              <Text style={styles.printBtnText}>Print / Download PDF</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Semester Selector Tabs & Faculty Student Picker */}
        <GlassCard style={styles.controlsCard}>
          <View style={styles.controlsRow}>
            {/* Semester Tabs */}
            <View style={styles.semTabsGroup}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Text style={styles.groupLabel}>Select Completed Semester:</Text>
                {eligibility && (
                  <View style={styles.cohortPill}>
                    <Text style={styles.cohortPillText}>
                      Enrolled: Semester {eligibility.current_semester} (Active)
                    </Text>
                  </View>
                )}
              </View>

              {availableSemesters.length === 0 ? (
                <View style={styles.noSemestersBadge}>
                  <Text style={styles.noSemestersText}>
                    🔒 No completed terms declared yet (Currently in Semester {eligibility?.current_semester || 1})
                  </Text>
                </View>
              ) : (
                <View style={styles.semTabsList}>
                  {availableSemesters.map(sem => (
                    <TouchableOpacity
                      key={sem}
                      style={[styles.semTab, selectedSemester === sem && styles.semTabActive]}
                      onPress={() => handleSemesterChange(sem)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.semTabText, selectedSemester === sem && styles.semTabTextActive]}>
                        Semester {sem} (S{sem})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Faculty/Admin Student Dropdown */}
            {isFacultyOrAdmin && (
              <View style={styles.studentPickerGroup}>
                <Text style={styles.groupLabel}>Student Record:</Text>
                <select
                  style={studentSelectStyle}
                  value={selectedStudentId || ''}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                >
                  {studentsList.map(s => {
                    const semNum = s.current_semester || s.semester || (s.batch_name ? s.batch_name.replace(/[^0-9]/g, '') : 4);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.roll_no ? `${s.roll_no} - ` : ''}{s.name} ({s.department_name || s.department_code || 'CS'} • S{semNum})
                      </option>
                    );
                  })}
                </select>
              </View>
            )}
          </View>
        </GlassCard>
      </View>

      {/* ========================================================================= */}
      {/* AUTHENTIC UNIVERSITY TRANSCRIPT / GRADE SHEET TEMPLATE                   */}
      {/* ========================================================================= */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading official transcript & grade points...</Text>
        </View>
      ) : isLocked || availableSemesters.length === 0 || error || !sheet ? (
        <View style={styles.lockStateCard}>
          <View style={styles.lockIconCircle}>
            <Text style={{ fontSize: 36 }}>🔒</Text>
          </View>
          <Text style={styles.lockTitle}>Results Not Yet Declared</Text>
          <Text style={styles.lockMessage}>
            {error || 'Mark sheet not available for future or ongoing semesters.'}
          </Text>
          <View style={styles.lockPill}>
            <Text style={styles.lockPillText}>
              {selectedSemester ? `Semester ${selectedSemester} • ` : ''}Examination Results Pending Board Publication
            </Text>
          </View>
          {availableSemesters.length > 0 && (
            <TouchableOpacity
              style={styles.switchSemesterBtn}
              onPress={() => handleSemesterChange(availableSemesters[availableSemesters.length - 1])}
              activeOpacity={0.8}
            >
              <Text style={styles.switchSemesterBtnText}>
                View Latest Declared Marksheet (Semester {availableSemesters[availableSemesters.length - 1]}) →
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.transcriptCanvas} id="university-grade-card">
          {/* Outer Academic Border */}
          <View style={styles.ornateBorder}>
            {/* Header: University Crest & Board Title */}
            <View style={styles.univHeader}>
              <View style={styles.crestBox}>
                <Text style={styles.crestEmblem}>🏛️</Text>
              </View>
              <Text style={styles.univTitle}>{header.university_name || 'ZENORA UNIVERSITY OF ENGINEERING & TECHNOLOGY'}</Text>
              <Text style={styles.boardTitle}>{header.board_name || 'DIRECTORATE OF CONTROLLER OF EXAMINATIONS'}</Text>
              <Text style={styles.accreditSub}>
                {header.accreditation || 'Autonomous Institution • Affiliated to Anna University • Approved by AICTE • NAAC A++ Accredited'}
              </Text>
              <Text style={styles.institutionCode}>{header.institution_code_name || '3122 - ZENORA COLLEGE OF ENGINEERING & TECHNOLOGY'}</Text>

              <View style={styles.goldRule} />

              <Text style={styles.docTitle}>{header.document_title || 'PROVISIONAL STATEMENT OF MARKS AND GRADES'}</Text>
              <Text style={styles.examTitle}>
                {header.exam_name || 'B.E. DEGREE EXAMINATIONS'} • {header.regulation || 'REGULATIONS 2021 (CBCS)'}
              </Text>
              <Text style={styles.sessionTitle}>
                {header.semester_title || `SEMESTER ${selectedSemester}`} • {header.session || 'November - December 2024 Examinations'}
              </Text>
            </View>

            {/* Candidate Identity Particulars Table */}
            <View style={styles.particularsGrid}>
              <View style={styles.particularsRow}>
                <View style={[styles.particularsCell, { flex: 1.2 }]}>
                  <Text style={styles.fieldLabel}>REGISTER NUMBER:</Text>
                  <Text style={styles.fieldValueBold}>{student.register_no || '312224104001'}</Text>
                </View>
                <View style={[styles.particularsCell, { flex: 1.2 }]}>
                  <Text style={styles.fieldLabel}>COLLEGE ROLL NUMBER:</Text>
                  <Text style={styles.fieldValueBold}>{student.roll_no || '24CSE101'}</Text>
                </View>
                <View style={[styles.particularsCell, { flex: 1.6 }]}>
                  <Text style={styles.fieldLabel}>CANDIDATE NAME:</Text>
                  <Text style={styles.fieldValueBold}>{student.name?.toUpperCase() || 'ALEX RIVERA'}</Text>
                </View>
              </View>

              <View style={styles.particularsRow}>
                <View style={[styles.particularsCell, { flex: 2 }]}>
                  <Text style={styles.fieldLabel}>DEGREE & BRANCH:</Text>
                  <Text style={styles.fieldValue}>{student.degree || 'B.E. Computer Science & Engineering'}</Text>
                </View>
                <View style={[styles.particularsCell, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>SEMESTER:</Text>
                  <Text style={styles.fieldValue}>{student.semester_label || `Semester ${selectedSemester} (S${selectedSemester})`}</Text>
                </View>
                <View style={[styles.particularsCell, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>ACADEMIC BATCH:</Text>
                  <Text style={styles.fieldValue}>{student.batch || 'Batch 2024 - 2028'}</Text>
                </View>
              </View>
            </View>

            {/* Subject-Wise Grade Table */}
            <View style={styles.tableWrapper}>
              <View style={styles.tableHead}>
                <Text style={[styles.thCell, { width: 45, textAlign: 'center' }]}>S.No</Text>
                <Text style={[styles.thCell, { width: 100 }]}>Course Code</Text>
                <Text style={[styles.thCell, { flex: 3.5 }]}>Course Title</Text>
                <Text style={[styles.thCell, { width: 65, textAlign: 'center' }]}>Credits (C)</Text>
                <Text style={[styles.thCell, { width: 70, textAlign: 'center' }]}>CIA (50)</Text>
                <Text style={[styles.thCell, { width: 70, textAlign: 'center' }]}>ESE (50)</Text>
                <Text style={[styles.thCell, { width: 75, textAlign: 'center' }]}>Total (100)</Text>
                <Text style={[styles.thCell, { width: 75, textAlign: 'center' }]}>Grade</Text>
                <Text style={[styles.thCell, { width: 70, textAlign: 'center' }]}>Points (G)</Text>
                <Text style={[styles.thCell, { width: 75, textAlign: 'center' }]}>C × G</Text>
                <Text style={[styles.thCell, { width: 75, textAlign: 'center' }]}>Result</Text>
              </View>

              {subjects.map((sub, idx) => (
                <View key={sub.course_code || idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                  <Text style={[styles.tdCell, { width: 45, textAlign: 'center', color: '#64748B' }]}>{idx + 1}</Text>
                  <Text style={[styles.tdCell, { width: 100, fontWeight: '700', color: '#1E293B' }]}>{sub.course_code}</Text>
                  <Text style={[styles.tdCell, { flex: 3.5, color: '#0F172A', fontWeight: '500' }]}>{sub.course_title}</Text>
                  <Text style={[styles.tdCell, { width: 65, textAlign: 'center' }]}>{sub.credits}</Text>
                  <Text style={[styles.tdCell, { width: 70, textAlign: 'center', color: '#334155' }]}>{sub.internal_marks}</Text>
                  <Text style={[styles.tdCell, { width: 70, textAlign: 'center', color: '#334155' }]}>{sub.end_sem_marks}</Text>
                  <Text style={[styles.tdCell, { width: 75, textAlign: 'center', fontWeight: '700', color: '#0F172A' }]}>{sub.total_marks}</Text>
                  <View style={[styles.tdCell, { width: 75, alignItems: 'center', justifyContent: 'center' }]}>
                    <View style={styles.gradeBadge}>
                      <Text style={styles.gradeBadgeText}>{sub.grade_letter}</Text>
                    </View>
                  </View>
                  <Text style={[styles.tdCell, { width: 70, textAlign: 'center', fontWeight: '600' }]}>{sub.grade_point}</Text>
                  <Text style={[styles.tdCell, { width: 75, textAlign: 'center', fontWeight: '700', color: '#1E293B' }]}>{sub.credit_points}</Text>
                  <Text style={[styles.tdCell, { width: 75, textAlign: 'center', color: '#059669', fontWeight: '700' }]}>{sub.result}</Text>
                </View>
              ))}
            </View>

            {/* Semester Summary & Performance Matrix */}
            <View style={styles.summaryMatrix}>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>Total Credits Registered:</Text>
                <Text style={styles.summaryVal}>{summary.total_credits_registered || 22}</Text>
              </View>

              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>Total Credits Earned:</Text>
                <Text style={[styles.summaryVal, { color: '#059669' }]}>{summary.total_credits_earned || 22}</Text>
              </View>

              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>Grade Points (Σ C×G):</Text>
                <Text style={styles.summaryVal}>{summary.total_grade_points || 196}</Text>
              </View>

              <View style={[styles.summaryCol, styles.highlightCol]}>
                <Text style={styles.highlightLabel}>Semester GPA (SGPA):</Text>
                <Text style={styles.highlightVal}>{summary.sgpa || '8.92'}</Text>
              </View>

              <View style={[styles.summaryCol, styles.highlightCol]}>
                <Text style={styles.highlightLabel}>Cumulative GPA (CGPA):</Text>
                <Text style={styles.highlightVal}>{summary.cgpa || '8.85'}</Text>
              </View>
            </View>

            {/* Classification & Outcome Banner */}
            <View style={styles.outcomeBanner}>
              <Text style={styles.outcomeTitle}>
                FINAL CLASSIFICATION: <Text style={styles.outcomeHighlight}>{summary.result_classification || 'FIRST CLASS WITH DISTINCTION'}</Text>
              </Text>
              <Text style={styles.outcomeSub}>
                Medium of Instruction: English • No Standing Arrears • Completed within Prescribed Minimum Duration
              </Text>
            </View>

            {/* Grading Scale Footnote */}
            <View style={styles.footnoteRow}>
              <Text style={styles.footnoteText}>
                GRADING SCALE: O (Outstanding, 10 pts: 90-100) • A+ (Excellent, 9 pts: 80-89) • A (Very Good, 8 pts: 70-79) • B+ (Good, 7 pts: 60-69) • B (Above Average, 6 pts: 50-59) • RA (Re-appear, 0 pts: &lt;50)
              </Text>
            </View>

            {/* Signatures & Controller of Examinations Digital Authentication */}
            <View style={styles.signatureRow}>
              {/* Controller Digital Verification Seal */}
              <View style={styles.securitySealBox}>
                <Text style={styles.securitySealEmblem}>🛡️</Text>
                <View>
                  <Text style={styles.securitySealTitle}>AUTHENTIC UNIVERSITY RECORD</Text>
                  <Text style={styles.securitySealCode}>{verification.verification_code || 'ZEN-CBCS-312224104001-VERIFIED'}</Text>
                  <Text style={styles.securitySealHash}>{verification.digital_signature || 'SHA256:7f83b1657ff1fc53b92dc181'}</Text>
                </View>
              </View>

              {/* Dean Signature */}
              <View style={styles.signBlock}>
                <Text style={styles.signatureFont}>Dr. Sarah Mitchell</Text>
                <View style={styles.signRule} />
                <Text style={styles.signTitle}>DEAN (ACADEMIC AFFAIRS)</Text>
                <Text style={styles.signOrg}>Zenora College of Engineering</Text>
              </View>

              {/* Controller Signature */}
              <View style={styles.signBlock}>
                <Text style={styles.signatureFont}>Dr. K. Senthil Nathan</Text>
                <View style={styles.signRule} />
                <Text style={styles.signTitle}>CONTROLLER OF EXAMINATIONS</Text>
                <Text style={styles.signOrg}>University Directorate of Exams</Text>
              </View>
            </View>

            {/* Document Bottom Security Strip */}
            <View style={styles.docBottomStrip}>
              <Text style={styles.stripText}>Date of Publication: {summary.publication_date || '18-JAN-2025'}</Text>
              <Text style={styles.stripText}>Autonomous CBCS Transcript ID: {verification.verification_code}</Text>
              <Text style={styles.stripText}>Verify online at lms.apex.edu/verify/transcript</Text>
            </View>
          </View>
        </View>
      )}

      {/* Embedded CSS for Print Styling */}
      {Platform.OS === 'web' && (
        <style dangerouslySetInnerHTML={{ __html: printStyleSheet }} />
      )}
    </ScrollView>
  );
}

const studentSelectStyle = {
  backgroundColor: colors.bgDark,
  color: colors.textPrimary,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '12px',
  outline: 'none',
  minWidth: '240px'
};

const printStyleSheet = `
@media print {
  body {
    background: #FFF !important;
    color: #000 !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  .no-print, header, nav, [class*="Sidebar"], [class*="Header"], [class*="noPrint"] {
    display: none !important;
  }
  #university-grade-card {
    box-shadow: none !important;
    border: 2px solid #000 !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 10px !important;
    background: #FFF !important;
  }
}
`;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark
  },
  content: {
    padding: 24,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center'
  },
  noPrint: {
    marginBottom: 20
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: typography.weight.bold
  },
  headerSub: {
    color: colors.textMuted,
    fontSize: typography.size.xs,
    marginTop: 4
  },
  actionBtnsRow: {
    flexDirection: 'row',
    gap: 10
  },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 8,
    ...Platform.select({
      web: { boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)' }
    })
  },
  printBtnIcon: {
    fontSize: 16
  },
  printBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: typography.weight.bold
  },
  controlsCard: {
    padding: 14
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14
  },
  semTabsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8
  },
  groupLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: typography.weight.semibold,
    marginRight: 4
  },
  semTabsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  semTab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.bgDark,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  semTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight
  },
  semTabText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: typography.weight.medium
  },
  semTabTextActive: {
    color: '#FFF',
    fontWeight: typography.weight.bold
  },
  studentPickerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  centerContainer: {
    padding: 60,
    alignItems: 'center'
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 12
  },
  errorCard: {
    padding: 30,
    alignItems: 'center'
  },
  errorTitle: {
    color: colors.accentRose,
    fontSize: 14,
    fontWeight: typography.weight.bold,
    marginBottom: 10
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: typography.weight.bold,
    fontSize: 12
  },

  // =========================================================================
  // AUTHENTIC UNIVERSITY MARK SHEET STYLES
  // =========================================================================
  transcriptCanvas: {
    backgroundColor: '#FAF9F6', // Authentic parchment ivory tone
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    padding: 16,
    ...Platform.select({
      web: { boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)' }
    })
  },
  ornateBorder: {
    borderWidth: 2,
    borderColor: '#94A3B8',
    padding: 18,
    borderRadius: 4
  },
  univHeader: {
    alignItems: 'center',
    marginBottom: 16
  },
  crestBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6
  },
  crestEmblem: {
    fontSize: 22
  },
  univTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 1.2,
    textAlign: 'center'
  },
  boardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 0.8,
    marginTop: 2,
    textAlign: 'center'
  },
  accreditSub: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center'
  },
  institutionCode: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 4,
    textAlign: 'center'
  },
  goldRule: {
    width: '100%',
    height: 2,
    backgroundColor: '#D97706',
    marginVertical: 10
  },
  docTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#92400E',
    letterSpacing: 1.4,
    textAlign: 'center'
  },
  examTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
    textAlign: 'center'
  },
  sessionTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
    textAlign: 'center'
  },

  // Particulars Grid
  particularsGrid: {
    borderWidth: 1,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    marginBottom: 14
  },
  particularsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  particularsCell: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0'
  },
  fieldLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5
  },
  fieldValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 1
  },
  fieldValueBold: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1
  },

  // Subject Table
  tableWrapper: {
    borderWidth: 1,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    marginBottom: 14
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    paddingVertical: 7
  },
  thCell: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.3,
    paddingHorizontal: 6
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 6,
    alignItems: 'center'
  },
  tableRowAlt: {
    backgroundColor: '#F8FAFC'
  },
  tdCell: {
    fontSize: 10,
    color: '#334155',
    paddingHorizontal: 6
  },
  gradeBadge: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  gradeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3730A3'
  },

  // Summary Matrix
  summaryMatrix: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    marginBottom: 10
  },
  summaryCol: {
    flex: 1,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center'
  },
  summaryLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center'
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2
  },
  highlightCol: {
    backgroundColor: '#F0FDF4'
  },
  highlightLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#166534',
    textAlign: 'center'
  },
  highlightVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#15803D',
    marginTop: 2
  },

  // Outcome
  outcomeBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 4
  },
  outcomeTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#78350F'
  },
  outcomeHighlight: {
    fontWeight: '900',
    color: '#B45309'
  },
  outcomeSub: {
    fontSize: 8.5,
    color: '#92400E',
    marginTop: 1
  },

  // Footnote
  footnoteRow: {
    marginBottom: 14,
    paddingHorizontal: 4
  },
  footnoteText: {
    fontSize: 8,
    color: '#64748B',
    fontStyle: 'italic',
    textAlign: 'center'
  },

  // Signatures
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    marginBottom: 10
  },
  securitySealBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    maxWidth: 240
  },
  securitySealEmblem: {
    fontSize: 20
  },
  securitySealTitle: {
    fontSize: 8,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5
  },
  securitySealCode: {
    fontSize: 8,
    fontWeight: '700',
    color: '#2563EB',
    marginTop: 1
  },
  securitySealHash: {
    fontSize: 7,
    color: '#64748B',
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'System',
    marginTop: 1
  },
  signBlock: {
    alignItems: 'center',
    minWidth: 160
  },
  signatureFont: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Platform.OS === 'web' ? 'cursive, Georgia, serif' : 'System',
    marginBottom: 4
  },
  signRule: {
    width: 140,
    height: 1,
    backgroundColor: '#334155',
    marginBottom: 4
  },
  signTitle: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.5
  },
  signOrg: {
    fontSize: 7.5,
    color: '#64748B',
    marginTop: 1
  },

  // Bottom strip
  docBottomStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0'
  },
  stripText: {
    fontSize: 8,
    color: '#94A3B8'
  },

  // Lock State Styles
  lockStateCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    maxWidth: 620,
    width: '100%',
    alignSelf: 'center',
    marginVertical: 36,
    ...Platform.select({
      web: { boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)' }
    })
  },
  lockIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  lockTitle: {
    fontSize: 20,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center'
  },
  lockMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
    maxWidth: 480
  },
  lockPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 20
  },
  lockPillText: {
    color: colors.accentAmber,
    fontSize: 12,
    fontWeight: '700'
  },
  switchSemesterBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  switchSemesterBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: typography.weight.bold
  },
  noSemestersBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)'
  },
  noSemestersText: {
    color: colors.accentAmber,
    fontSize: 12,
    fontWeight: '600'
  },
  cohortPill: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)'
  },
  cohortPillText: {
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: '700'
  }
});
