import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Linking
} from 'react-native';
import { colors, typography } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api, resolveFileUrl, downloadFile } from '../api/client';
import { Modal } from '../components/Modal';
import { DocumentViewer } from '../components/DocumentViewer';

export function AssignmentsScreen() {
  const { user } = useAuth();
  const isFacultyOrAdmin = ['super_admin', 'institution_admin', 'faculty', 'instructor'].includes(user?.role);
  const isStudent = user?.role === 'student';

  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Student Categorization Filter ('all', 'pending', 'submitted', 'graded', 'overdue')
  const [studentFilter, setStudentFilter] = useState('all');

  // Faculty Submissions Review Modal Filter ('all', 'pending', 'graded', 'resubmission')
  const [facultySubFilter, setFacultySubFilter] = useState('all');

  // Active Selected Assignment & Submissions Modal (Faculty view)
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [submissionsList, setSubmissionsList] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Create Assignment Modal (Faculty only)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newBatchId, setNewBatchId] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDueDate, setNewDueDate] = useState('2026-04-10');
  const [newMaxMarks, setNewMaxMarks] = useState('20');
  const [newAttachment, setNewAttachment] = useState('');
  const [creating, setCreating] = useState(false);

  // Student Submit Modal (Student only)
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitText, setSubmitText] = useState('');
  const [submitUrl, setSubmitUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Post-submission confirmation modal
  const [submissionConfirmation, setSubmissionConfirmation] = useState(null);

  // Faculty Grading Modal & Split Marks Rubric
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [awardedMarks, setAwardedMarks] = useState('');
  const [gradingFeedback, setGradingFeedback] = useState('');
  const [facultyRemarks, setFacultyRemarks] = useState('');
  const [grading, setGrading] = useState(false);
  const [useSplitGrading, setUseSplitGrading] = useState(false);
  const [splitPartA, setSplitPartA] = useState('');
  const [splitPartB, setSplitPartB] = useState('');
  const [splitPartC, setSplitPartC] = useState('');
  const [showResubmissionSection, setShowResubmissionSection] = useState(false);
  const [resubmissionFeedback, setResubmissionFeedback] = useState('');
  const [requestingResubmission, setRequestingResubmission] = useState(false);

  // Dedicated Document Preview Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState({ url: '', title: '', subtitle: '' });

  const handlePreviewDocument = (url, title = 'Document Preview', subtitle = '') => {
    if (!url) return;
    setPreviewDoc({ url, title, subtitle });
    setShowPreviewModal(true);
  };

  useEffect(() => {
    loadData();
  }, [user?.id, user?.role]);

  async function loadData() {
    setLoading(true);
    try {
      const [asgRes, subRes, batchRes] = await Promise.all([
        api.getAssignments(),
        api.getSubjects(),
        api.getBatches()
      ]);
      if (asgRes.ok && asgRes.data.success) {
        setAssignments(asgRes.data.data || []);
      }
      if (subRes.ok && subRes.data.success) {
        setSubjects(subRes.data.data || []);
        if (subRes.data.data.length > 0) setNewSubjectId(subRes.data.data[0].id);
      }
      if (batchRes.ok && batchRes.data.success) {
        setBatches(batchRes.data.data || []);
        if (batchRes.data.data.length > 0) setNewBatchId(batchRes.data.data[0].id);
      }
    } catch (e) {
      console.error('[Load Assignments Error]', e);
    } finally {
      setLoading(false);
    }
  }

  // Open Document (Direct Preview / Download)
  const handleOpenDocument = (url) => {
    if (!url) return;
    const fullUrl = resolveFileUrl(url);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(fullUrl).catch(err => {
        alert('Could not open document URL: ' + err.message);
      });
    }
  };

  // Authentic Blob Download Handler as requested:
  // Fetches file as Blob, creates Object URL, downloads via <a> element with window.open fallback
  const handleDownload = async (url, filename) => {
    if (!url) return;
    try {
      const resolved = resolveFileUrl(url);
      const response = await fetch(resolved);
      if (!response.ok) throw new Error('File not found on server');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'download.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      if (typeof window !== 'undefined') {
        window.open(resolveFileUrl(url), '_blank', 'noopener,noreferrer');
      }
    }
  };

  // 1-Click Direct File Download for Submissions / Materials
  const handleDownloadSubmissionFile = (sub, defaultName = 'assignment_solution.pdf') => {
    if (!sub) return;
    const downloadUrl = sub.attachment_url || (sub.id ? api.getAssignmentSubmissionDownloadUrl(sub.id) : '');
    const targetName = sub.file_name || `${sub.roll_no || 'student'}_solution.pdf`;
    handleDownload(downloadUrl, targetName);
  };

  // Academic Categorization for Students ('pending', 'submitted', 'graded', 'overdue')
  const getAssignmentCategory = (asg) => {
    const sub = asg.my_submission;
    if (sub && sub.status === 'graded') return 'graded';
    if (sub && ['submitted', 'resubmitted', 'late'].includes(sub.status)) return 'submitted';
    const isOverdue = asg.due_date && new Date(asg.due_date) < new Date();
    if (isOverdue) return 'overdue';
    return 'pending';
  };

  // Handle Faculty Create Assignment
  const handleCreateAssignment = async () => {
    if (!newTitle || !newSubjectId || !newBatchId || !newDesc) {
      return alert('Please fill in Title, Subject, Batch, and Problem Description.');
    }
    setCreating(true);
    try {
      const res = await api.createAssignment({
        title: newTitle,
        subject_id: newSubjectId,
        batch_id: newBatchId,
        description: newDesc,
        due_date: newDueDate,
        max_marks: parseFloat(newMaxMarks) || 20,
        attachment_url: newAttachment
      });
      if (res.ok && res.data.success) {
        setShowCreateModal(false);
        setNewTitle('');
        setNewDesc('');
        setNewAttachment('');
        alert('Assignment published successfully!');
        loadData();
      } else {
        alert(res.data?.message || 'Failed to create assignment.');
      }
    } catch (e) {
      alert('Error creating assignment.');
    } finally {
      setCreating(false);
    }
  };

  // Open Submissions for an assignment (Faculty only)
  const handleOpenSubmissions = async (asg) => {
    if (!isFacultyOrAdmin) return;
    setActiveAssignment(asg);
    setShowSubmissionsModal(true);
    setLoadingSubmissions(true);
    try {
      const res = await api.getAssignmentSubmissions(asg.id);
      if (res.ok && res.data.success) {
        setSubmissionsList(res.data.data.submissions || []);
      } else {
        // Fallback to detail endpoint
        const detailRes = await api.getAssignmentDetail(asg.id);
        if (detailRes.ok && detailRes.data.success) {
          setSubmissionsList(detailRes.data.data.submissions || []);
        }
      }
    } catch (e) {
      console.error('[Open Submissions Error]', e);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Open Student Submit Modal
  const handleOpenSubmit = (asg) => {
    setActiveAssignment(asg);
    // Pre-populate if student already submitted
    if (asg.my_submission) {
      setSubmitText(asg.my_submission.submission_text || '');
      setSubmitUrl(asg.my_submission.attachment_url || '');
    } else {
      setSubmitText('');
      setSubmitUrl('');
    }
    setSelectedFile(null);
    setShowSubmitModal(true);
  };

  // Student file picker handler
  const handleFileChange = (e) => {
    if (e.target && e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Student Submit Solution Handler
  const handleStudentSubmit = async () => {
    if (!submitText && !submitUrl && !selectedFile) {
      return alert('Please enter solution explanation text or attach a completed document file.');
    }

    setSubmitting(true);
    try {
      let finalAttachmentUrl = submitUrl;

      // If user selected a local file, upload it first to /api/assignments/upload
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const uploadRes = await api.uploadAssignmentFile(formData);
        if (uploadRes.ok && uploadRes.data.success) {
          finalAttachmentUrl = uploadRes.data.data.file_url;
        } else {
          setSubmitting(false);
          return alert(uploadRes.data?.message || 'File upload failed. Please try again.');
        }
      }

      const res = await api.submitAssignment(activeAssignment.id, {
        submission_text: submitText,
        attachment_url: finalAttachmentUrl,
        file_name: selectedFile ? selectedFile.name : undefined,
        file_size: selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : undefined
      });

      if (res.ok && res.data.success) {
        setShowSubmitModal(false);
        const submittedFileName = selectedFile ? selectedFile.name : (finalAttachmentUrl ? 'Attached Document' : 'Summary Submission');
        const submittedFileSize = selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : null;
        setSelectedFile(null);
        setSubmissionConfirmation({
          assignmentTitle: activeAssignment.title,
          subjectName: activeAssignment.subject_name,
          fileName: submittedFileName,
          fileSize: submittedFileSize,
          submittedAt: new Date().toLocaleString(),
          isResubmission: activeAssignment.my_submission?.status === 'resubmission_requested'
        });
        loadData();
      } else {
        alert(res.data?.message || 'Submission failed.');
      }
    } catch (e) {
      console.error('[Student Submit Error]', e);
      alert('Network error during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Faculty Grade Modal
  const handleOpenGrade = (sub) => {
    setGradingSubmission(sub);
    setAwardedMarks(sub.marks_awarded !== null && sub.marks_awarded !== undefined ? String(sub.marks_awarded) : '');
    setGradingFeedback(sub.feedback || sub.remarks || '');
    setFacultyRemarks(sub.remarks || sub.feedback || '');
    setResubmissionFeedback(sub.feedback || '');
    setShowResubmissionSection(sub.status === 'resubmission_requested');

    if (sub.split_marks) {
      setUseSplitGrading(true);
      setSplitPartA(sub.split_marks.part_a !== undefined ? String(sub.split_marks.part_a) : '');
      setSplitPartB(sub.split_marks.part_b !== undefined ? String(sub.split_marks.part_b) : '');
      setSplitPartC(sub.split_marks.part_c !== undefined ? String(sub.split_marks.part_c) : '');
    } else {
      setUseSplitGrading(false);
      setSplitPartA('');
      setSplitPartB('');
      setSplitPartC('');
    }
    setShowGradeModal(true);
  };

  // Split Marks Change Handler with auto-sum
  const handleSplitChange = (part, val) => {
    let a = part === 'a' ? parseFloat(val) || 0 : parseFloat(splitPartA) || 0;
    let b = part === 'b' ? parseFloat(val) || 0 : parseFloat(splitPartB) || 0;
    let c = part === 'c' ? parseFloat(val) || 0 : parseFloat(splitPartC) || 0;
    if (part === 'a') setSplitPartA(val);
    if (part === 'b') setSplitPartB(val);
    if (part === 'c') setSplitPartC(val);
    const sum = Number((a + b + c).toFixed(2));
    setAwardedMarks(String(sum));
  };

  // Faculty Save Grade Handler
  const handleSaveGrade = async () => {
    let finalScore = parseFloat(awardedMarks);
    let splitData = null;

    if (useSplitGrading) {
      const a = parseFloat(splitPartA) || 0;
      const b = parseFloat(splitPartB) || 0;
      const c = parseFloat(splitPartC) || 0;
      finalScore = Number((a + b + c).toFixed(2));
      splitData = {
        part_a: a,
        part_b: b,
        part_c: c,
        total: finalScore
      };
    }

    if (isNaN(finalScore) || finalScore < 0 || finalScore > activeAssignment.max_marks) {
      return alert(`Awarded marks must be a valid number between 0 and maximum marks (${activeAssignment.max_marks}).`);
    }

    setGrading(true);
    try {
      const res = await api.gradeAssignment(activeAssignment.id, gradingSubmission.id, {
        marks_awarded: finalScore,
        feedback: gradingFeedback,
        remarks: facultyRemarks || gradingFeedback,
        split_marks: splitData
      });
      if (res.ok && res.data.success) {
        setShowGradeModal(false);
        setShowResubmissionSection(false);
        alert('Evaluation, split marks & remarks recorded successfully!');
        // Refresh submissions in modal
        handleOpenSubmissions(activeAssignment);
        loadData();
      } else {
        alert(res.data?.message || 'Grading failed.');
      }
    } catch (e) {
      alert('Error saving grade.');
    } finally {
      setGrading(false);
    }
  };

  // Faculty Request Resubmission Handler
  const handleRequestResubmission = async () => {
    const feedbackNote = resubmissionFeedback.trim() || gradingFeedback.trim();
    if (!feedbackNote) {
      return alert('Please enter a feedback note explaining what the student needs to revise and re-upload.');
    }

    setRequestingResubmission(true);
    try {
      const res = await api.requestResubmission(activeAssignment.id, gradingSubmission.id, {
        feedback: feedbackNote
      });
      if (res.ok && res.data.success) {
        setShowGradeModal(false);
        setShowResubmissionSection(false);
        setResubmissionFeedback('');
        alert('Resubmission requested successfully! The student has been notified with your feedback note.');
        handleOpenSubmissions(activeAssignment);
        loadData();
      } else {
        alert(res.data?.message || 'Failed to request resubmission.');
      }
    } catch (e) {
      console.error('[Request Resubmission Error]', e);
      alert('Error requesting resubmission.');
    } finally {
      setRequestingResubmission(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hidden file input for web upload */}
      {Platform.OS === 'web' && (
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.zip,.sql,.py,.java,.cpp,.c"
        />
      )}

      {/* Page Header */}
      <View style={styles.pageHeader}>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.pageTitle}>Course Academic Assignments</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>{assignments.length} Total</Text></View>
          </View>
          <Text style={styles.pageSub}>
            {isFacultyOrAdmin
              ? 'Problem set authoring, submission tracking, document previewing & faculty evaluation'
              : 'Course problem sets, document submissions, grade status & faculty feedback'}
          </Text>
        </View>

        {isFacultyOrAdmin && (
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)} activeOpacity={0.8}>
            <Text style={styles.createBtnText}>+ Release Assignment</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Role Banner */}
      <View style={[styles.roleInfoCard, isFacultyOrAdmin ? styles.roleInfoFaculty : styles.roleInfoStudent]}>
        <Text style={styles.roleInfoIcon}>{isFacultyOrAdmin ? '👨‍🏫' : '👨‍🎓'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.roleInfoTitle}>
            {isFacultyOrAdmin ? 'Instructor Evaluation Portal (RBAC Active)' : 'Student Assignment Submission Portal'}
          </Text>
          <Text style={styles.roleInfoDesc}>
            {isFacultyOrAdmin
              ? 'You have elevated privileges to release problem sets, inspect student document attachments, enter marks, and provide constructive feedback.'
              : 'You can review problem statements, upload your assignment document (PDF/Word/Image/Code), and monitor instructor evaluation & feedback.'}
          </Text>
        </View>
      </View>

      {/* Student Categorization Filter Tabs */}
      {(() => {
        const countAll = assignments.length;
        const countPending = assignments.filter(a => getAssignmentCategory(a) === 'pending').length;
        const countSubmitted = assignments.filter(a => getAssignmentCategory(a) === 'submitted').length;
        const countGraded = assignments.filter(a => getAssignmentCategory(a) === 'graded').length;
        const countOverdue = assignments.filter(a => getAssignmentCategory(a) === 'overdue').length;

        return (
          <View style={styles.categoryTabsContainer}>
            <TouchableOpacity
              style={[styles.categoryTab, studentFilter === 'all' && styles.categoryTabActive]}
              onPress={() => setStudentFilter('all')}
              activeOpacity={0.8}
            >
              <Text style={[styles.categoryTabText, studentFilter === 'all' && styles.categoryTabTextActive]}>
                📚 All ({countAll})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.categoryTab, studentFilter === 'pending' && styles.categoryTabActive]}
              onPress={() => setStudentFilter('pending')}
              activeOpacity={0.8}
            >
              <Text style={[styles.categoryTabText, studentFilter === 'pending' && styles.categoryTabTextActive]}>
                ⏳ Pending ({countPending})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.categoryTab, studentFilter === 'submitted' && styles.categoryTabActive]}
              onPress={() => setStudentFilter('submitted')}
              activeOpacity={0.8}
            >
              <Text style={[styles.categoryTabText, studentFilter === 'submitted' && styles.categoryTabTextActive]}>
                📤 Submitted ({countSubmitted})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.categoryTab, studentFilter === 'graded' && styles.categoryTabActive]}
              onPress={() => setStudentFilter('graded')}
              activeOpacity={0.8}
            >
              <Text style={[styles.categoryTabText, studentFilter === 'graded' && styles.categoryTabTextActive]}>
                🎉 Graded ({countGraded})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.categoryTab, studentFilter === 'overdue' && styles.categoryTabActive]}
              onPress={() => setStudentFilter('overdue')}
              activeOpacity={0.8}
            >
              <Text style={[styles.categoryTabText, studentFilter === 'overdue' && styles.categoryTabTextActive]}>
                ⏰ Overdue ({countOverdue})
              </Text>
            </TouchableOpacity>
          </View>
        );
      })()}

      {/* Assignments List */}
      {(() => {
        const displayedAssignments = assignments.filter(a => {
          if (studentFilter === 'all') return true;
          return getAssignmentCategory(a) === studentFilter;
        });

        if (loading) {
          return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
        }

        if (displayedAssignments.length === 0) {
          return (
            <View style={styles.empty}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>📑</Text>
              <Text style={styles.emptyTitle}>
                {studentFilter === 'all'
                  ? 'No assignments released yet'
                  : `No ${studentFilter} assignments found`}
              </Text>
              <Text style={styles.emptySub}>
                {studentFilter === 'all'
                  ? 'Assignments created by teaching faculty will appear here.'
                  : `You have 0 assignments matching the '${studentFilter}' filter category.`}
              </Text>
            </View>
          );
        }

        return (
          <View style={styles.list}>
            {displayedAssignments.map(asg => {
            const mySub = asg.my_submission;
            const isResubmissionRequested = mySub && mySub.status === 'resubmission_requested';
            const isResubmitted = mySub && mySub.status === 'resubmitted';
            const isGraded = mySub && mySub.status === 'graded';
            const isSubmitted = mySub && (mySub.status === 'submitted' || mySub.status === 'late' || isResubmitted || isGraded);

            return (
              <View key={asg.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.tagRow}>
                      <View style={styles.codeTag}><Text style={styles.codeTagText}>{asg.subject_code || 'COURSE'}</Text></View>
                      <Text style={styles.batchTag}>{asg.batch_name || 'Class'}</Text>
                      <Text style={styles.dueText}>⏰ Due: {new Date(asg.due_date).toLocaleDateString()}</Text>
                    </View>
                    <Text style={styles.asgTitle}>{asg.title}</Text>
                    <Text style={styles.asgSubject}>{asg.subject_name}</Text>
                  </View>

                  <View style={styles.maxBox}>
                    <Text style={styles.maxScore}>{asg.max_marks}</Text>
                    <Text style={styles.maxSub}>Max Marks</Text>
                  </View>
                </View>

                {/* Problem Description */}
                <Text style={styles.asgDesc}>{asg.description}</Text>

                {/* Reference Material Attachment */}
                {asg.attachment_url ? (
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 10 }}>
                    <TouchableOpacity
                      style={[styles.attachRow, { flex: 1, marginTop: 0 }]}
                      onPress={() => handlePreviewDocument(asg.attachment_url, `${asg.title} – Reference Document`, asg.subject_name)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.attachIcon}>📎</Text>
                      <Text style={styles.attachText} numberOfLines={1}>
                        Reference: {asg.attachment_url}
                      </Text>
                      <Text style={styles.attachOpenText}>👁️ Preview</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.openDirectBtn}
                      onPress={() => handleOpenDocument(asg.attachment_url)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.openDirectBtnText}>📥 New Tab</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* STUDENT-SPECIFIC SUBMISSION STATUS & EVALUATION BOX */}
                {isStudent && (
                  <View style={styles.studentStatusContainer}>
                    {isResubmissionRequested ? (
                      <View style={styles.resubAlertCard}>
                        <View style={styles.resubAlertHeader}>
                          <View style={styles.resubAlertBadge}>
                            <Text style={styles.resubAlertBadgeText}>
                              ⚠️ RESUBMISSION REQUESTED BY INSTRUCTOR
                            </Text>
                          </View>
                          <Text style={styles.resubAlertDate}>
                            Action Required • Please Revise Work
                          </Text>
                        </View>

                        <View style={styles.feedbackContainer}>
                          <Text style={styles.feedbackHeader}>👨‍🏫 Instructor Revision Feedback Note:</Text>
                          <Text style={styles.feedbackBody}>{mySub.feedback || 'Please update and resubmit your solution based on instructor guidance.'}</Text>
                        </View>

                        <TouchableOpacity
                          style={styles.resubmitActionBtn}
                          onPress={() => handleOpenSubmit(asg)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.resubmitActionBtnText}>🔄 Upload Revised Solution Document</Text>
                        </TouchableOpacity>
                      </View>
                    ) : isResubmitted ? (
                      <View style={styles.submittedCard}>
                        <View style={styles.submittedHeader}>
                          <View style={[styles.submittedBadge, { backgroundColor: 'rgba(56, 189, 248, 0.2)', borderColor: colors.primaryLight }]}>
                            <Text style={[styles.submittedBadgeText, { color: colors.primaryLight }]}>
                              🔄 Revised Solution Submitted ({new Date(mySub.submitted_at).toLocaleDateString()}) • Awaiting Faculty Re-evaluation
                            </Text>
                          </View>
                        </View>
                        {mySub.submission_text ? (
                          <Text style={styles.subSummaryText} numberOfLines={2}>
                            "{mySub.submission_text}"
                          </Text>
                        ) : null}
                        {mySub.attachment_url ? (
                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                            <TouchableOpacity
                              style={styles.submittedDocBtn}
                              onPress={() => handlePreviewDocument(mySub.attachment_url, 'Your Revised Solution Document', asg.title)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.submittedDocText}>👁️ Preview Revised Document</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.openDirectBtn}
                              onPress={() => handleOpenDocument(mySub.attachment_url)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.openDirectBtnText}>📥 Open in New Tab</Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </View>
                    ) : isGraded ? (
                      <View style={styles.gradedCard}>
                        <View style={styles.gradedCardHeader}>
                          <View style={styles.gradedBadge}>
                            <Text style={styles.gradedBadgeText}>
                              🎉 Graded: {mySub.marks_awarded} / {asg.max_marks} Marks
                              {asg.max_marks ? ` (${Math.round(((mySub.marks_awarded || 0) / asg.max_marks) * 100)}%)` : ''}
                            </Text>
                          </View>
                          <Text style={styles.gradedDateText}>
                            Evaluated on: {mySub.graded_at ? new Date(mySub.graded_at).toLocaleDateString() : 'Recently'}
                          </Text>
                        </View>

                        {/* Rubric Split Marks Breakdown if present */}
                        {mySub.split_marks && (
                          <View style={styles.splitBreakdownCard}>
                            <Text style={styles.splitBreakdownTitle}>📊 Rubric Split Marks Breakdown:</Text>
                            <View style={styles.splitBreakdownGrid}>
                              <View style={styles.splitBreakdownItem}>
                                <Text style={styles.splitItemLabel}>Formulation & Approach</Text>
                                <Text style={styles.splitItemVal}>{mySub.split_marks.part_a ?? 0} Marks</Text>
                              </View>
                              <View style={styles.splitBreakdownItem}>
                                <Text style={styles.splitItemLabel}>Implementation & Solution</Text>
                                <Text style={styles.splitItemVal}>{mySub.split_marks.part_b ?? 0} Marks</Text>
                              </View>
                              <View style={styles.splitBreakdownItem}>
                                <Text style={styles.splitItemLabel}>Documentation & Quality</Text>
                                <Text style={styles.splitItemVal}>{mySub.split_marks.part_c ?? 0} Marks</Text>
                              </View>
                            </View>
                          </View>
                        )}

                        {(mySub.feedback || mySub.remarks) ? (
                          <View style={styles.feedbackContainer}>
                            <Text style={styles.feedbackHeader}>👨‍🏫 Faculty Evaluation Remarks & Feedback:</Text>
                            <Text style={styles.feedbackBody}>{mySub.remarks || mySub.feedback}</Text>
                          </View>
                        ) : null}

                        {mySub.attachment_url ? (
                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                            <TouchableOpacity
                              style={styles.submittedDocBtn}
                              onPress={() => handlePreviewDocument(mySub.attachment_url, 'Your Submitted Solution Document', asg.title)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.submittedDocText}>👁️ Preview Document</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.downloadDocBtn}
                              onPress={() => handleDownloadSubmissionFile(mySub, `${asg.subject_code || 'assignment'}_solution`)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.downloadDocBtnText}>⬇ Download Solution</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.openDirectBtn}
                              onPress={() => handleOpenDocument(mySub.attachment_url)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.openDirectBtnText}>📥 New Tab</Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </View>
                    ) : isSubmitted ? (
                      <View style={styles.submittedCard}>
                        <View style={styles.submittedHeader}>
                          <View style={styles.submittedBadge}>
                            <Text style={styles.submittedBadgeText}>
                              🕒 Submitted ({new Date(mySub.submitted_at).toLocaleDateString()}) • Awaiting Faculty Review
                            </Text>
                          </View>
                        </View>
                        {mySub.submission_text ? (
                          <Text style={styles.subSummaryText} numberOfLines={2}>
                            "{mySub.submission_text}"
                          </Text>
                        ) : null}
                        {mySub.attachment_url ? (
                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                            <TouchableOpacity
                              style={styles.submittedDocBtn}
                              onPress={() => handlePreviewDocument(mySub.attachment_url, 'Your Submitted Solution Document', asg.title)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.submittedDocText}>👁️ Preview Document</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.downloadDocBtn}
                              onPress={() => handleDownloadSubmissionFile(mySub, `${asg.subject_code || 'assignment'}_solution`)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.downloadDocBtnText}>⬇ Download Solution</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.openDirectBtn}
                              onPress={() => handleOpenDocument(mySub.attachment_url)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.openDirectBtnText}>📥 New Tab</Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </View>
                    ) : (
                      <View style={styles.pendingCard}>
                        <Text style={styles.pendingCardText}>
                          ⚠️ Submission Pending • Please upload your solution document before the deadline.
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Card Actions Footer */}
                <View style={styles.cardFooter}>
                  <View style={styles.footerStats}>
                    {isFacultyOrAdmin ? (
                      <Text style={styles.footerStatText}>
                        📝 {asg.submissions_count || 0} Submissions • {asg.graded_count || 0} Graded
                        {(asg.submissions_count || 0) > (asg.graded_count || 0) && (
                          <Text style={{ color: colors.accentAmber, fontWeight: 'bold' }}>
                            {' '}({(asg.submissions_count || 0) - (asg.graded_count || 0)} Pending)
                          </Text>
                        )}
                      </Text>
                    ) : (
                      <Text style={styles.footerStatText}>
                        Created by: {asg.created_by_name || 'Faculty'}
                      </Text>
                    )}
                  </View>

                  <View style={styles.footerActions}>
                    {isFacultyOrAdmin ? (
                      <TouchableOpacity
                        style={styles.reviewBtn}
                        onPress={() => handleOpenSubmissions(asg)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.reviewBtnText}>
                          🔍 Review & Grade Submissions ({asg.submissions_count || 0})
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.submitWorkBtn, isSubmitted && styles.resubmitWorkBtn]}
                        onPress={() => handleOpenSubmit(asg)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.submitWorkBtnText}>
                          {isSubmitted ? '✏️ Resubmit / Update Solution' : '📤 Upload & Submit Solution'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
        );
      })()}

      {/* ========================================================== */}
      {/* MODAL 1: FACULTY CREATE ASSIGNMENT (Gated to Faculty/Admin) */}
      {/* ========================================================== */}
      {isFacultyOrAdmin && (
        <Modal visible={showCreateModal} onClose={() => setShowCreateModal(false)} title="Release New Course Assignment">
          <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
            <View style={styles.field}>
              <Text style={styles.label}>Assignment Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Relational Normalization & SQL Triggers Problem Set"
                placeholderTextColor={colors.textMuted}
                value={newTitle}
                onChangeText={setNewTitle}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Subject *</Text>
                <select style={webSelectStyle} value={newSubjectId} onChange={(e) => setNewSubjectId(e.target.value)}>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.code} – {s.name}</option>)}
                </select>
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Target Batch *</Text>
                <select style={webSelectStyle} value={newBatchId} onChange={(e) => setNewBatchId(e.target.value)}>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name} (Sem {b.semester})</option>)}
                </select>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Submission Deadline (YYYY-MM-DD) *</Text>
                <TextInput style={styles.input} value={newDueDate} onChangeText={setNewDueDate} />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Max Marks</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={newMaxMarks} onChangeText={setNewMaxMarks} />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Problem Statement & Requirements *</Text>
              <TextInput
                style={[styles.input, { height: 95, textAlignVertical: 'top' }]}
                multiline
                numberOfLines={4}
                placeholder="Specify the problem requirements, test inputs, expected schema design, and submission format..."
                placeholderTextColor={colors.textMuted}
                value={newDesc}
                onChangeText={setNewDesc}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Reference / Question PDF URL (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="https://zenora.edu/assignments/problem_sheet.pdf"
                placeholderTextColor={colors.textMuted}
                value={newAttachment}
                onChangeText={setNewAttachment}
              />
            </View>

            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleCreateAssignment} disabled={creating}>
              {creating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalPrimaryBtnText}>✓ Publish Assignment</Text>}
            </TouchableOpacity>
          </ScrollView>
        </Modal>
      )}

      {/* ========================================================== */}
      {/* MODAL 2: FACULTY SUBMISSIONS REVIEW & GRADING DASHBOARD    */}
      {/* ========================================================== */}
      {isFacultyOrAdmin && activeAssignment && (
        <Modal
          visible={showSubmissionsModal}
          onClose={() => setShowSubmissionsModal(false)}
          title={`Submissions: ${activeAssignment.title}`}
        >
          <ScrollView style={{ maxHeight: 540 }} showsVerticalScrollIndicator={false}>
            <View style={styles.subModalMetaHeader}>
              <Text style={styles.subModalMetaText}>
                Subject: <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>{activeAssignment.subject_name}</Text> • Max Marks: <Text style={{ color: colors.primaryLight, fontWeight: 'bold' }}>{activeAssignment.max_marks}</Text>
              </Text>
            </View>

            {/* Faculty Submissions Filter Tabs */}
            <View style={styles.facultySubTabsRow}>
              <TouchableOpacity
                style={[styles.facultySubTab, facultySubFilter === 'all' && styles.facultySubTabActive]}
                onPress={() => setFacultySubFilter('all')}
              >
                <Text style={[styles.facultySubTabText, facultySubFilter === 'all' && styles.facultySubTabTextActive]}>
                  All ({submissionsList.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.facultySubTab, facultySubFilter === 'pending' && styles.facultySubTabActive]}
                onPress={() => setFacultySubFilter('pending')}
              >
                <Text style={[styles.facultySubTabText, facultySubFilter === 'pending' && styles.facultySubTabTextActive]}>
                  ⏳ Pending ({submissionsList.filter(s => s.status !== 'graded' && s.status !== 'resubmission_requested').length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.facultySubTab, facultySubFilter === 'graded' && styles.facultySubTabActive]}
                onPress={() => setFacultySubFilter('graded')}
              >
                <Text style={[styles.facultySubTabText, facultySubFilter === 'graded' && styles.facultySubTabTextActive]}>
                  ✓ Graded ({submissionsList.filter(s => s.status === 'graded').length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.facultySubTab, facultySubFilter === 'resubmission' && styles.facultySubTabActive]}
                onPress={() => setFacultySubFilter('resubmission')}
              >
                <Text style={[styles.facultySubTabText, facultySubFilter === 'resubmission' && styles.facultySubTabTextActive]}>
                  ⚠️ Revision Req ({submissionsList.filter(s => s.status === 'resubmission_requested' || s.status === 'resubmitted').length})
                </Text>
              </TouchableOpacity>
            </View>

            {loadingSubmissions ? (
              <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
            ) : (() => {
              const displayedSubmissions = submissionsList.filter(sub => {
                if (facultySubFilter === 'all') return true;
                if (facultySubFilter === 'pending') return sub.status !== 'graded' && sub.status !== 'resubmission_requested';
                if (facultySubFilter === 'graded') return sub.status === 'graded';
                if (facultySubFilter === 'resubmission') return sub.status === 'resubmission_requested' || sub.status === 'resubmitted';
                return true;
              });

              if (displayedSubmissions.length === 0) {
                return (
                  <View style={{ padding: 30, alignItems: 'center' }}>
                    <Text style={{ fontSize: 32, marginBottom: 8 }}>📭</Text>
                    <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 14 }}>
                      {facultySubFilter === 'all' ? 'No Submissions Received Yet' : `No ${facultySubFilter} submissions found`}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                      {facultySubFilter === 'all'
                        ? 'Students in this batch have not submitted their solutions yet.'
                        : `No student submissions match the '${facultySubFilter}' filter.`}
                    </Text>
                  </View>
                );
              }

              return (
                <View style={{ gap: 12 }}>
                  {displayedSubmissions.map(sub => (
                    <View key={sub.id} style={styles.subItem}>
                      <View style={styles.subItemTop}>
                        <View>
                          <Text style={styles.subStudentName}>{sub.student_name}</Text>
                          <Text style={styles.subStudentMeta}>Roll: {sub.roll_no} • Reg: {sub.register_no}</Text>
                        </View>
                        <View style={[
                          styles.subStatusPill,
                          sub.status === 'graded' ? styles.subGraded :
                          sub.status === 'resubmission_requested' ? styles.subResubRequested :
                          sub.status === 'resubmitted' ? styles.subResubmitted :
                          styles.subPending
                        ]}>
                          <Text style={[
                            styles.subStatusText,
                            sub.status === 'graded' ? { color: colors.accentEmerald } :
                            sub.status === 'resubmission_requested' ? { color: colors.accentAmber } :
                            sub.status === 'resubmitted' ? { color: colors.primaryLight } :
                            { color: colors.accentAmber }
                          ]}>
                            {sub.status === 'graded' ? `✓ Graded: ${sub.marks_awarded} / ${activeAssignment.max_marks}` :
                             sub.status === 'resubmission_requested' ? '⚠️ Resubmission Requested' :
                             sub.status === 'resubmitted' ? '🔄 Revised Work Submitted' :
                             '⏳ Pending Evaluation'}
                          </Text>
                        </View>
                      </View>

                      {/* Submission solution explanation */}
                      <Text style={styles.subText}>{sub.submission_text || 'Completed document attached below.'}</Text>

                      {/* DIRECT DOWNLOAD / PREVIEW DOCUMENT BUTTON */}
                      {sub.attachment_url ? (
                        <View style={styles.subDocActionRow}>
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 16 }}>
                              {sub.attachment_url.toLowerCase().endsWith('.pdf') ? '📕' : '📄'}
                            </Text>
                            <Text style={styles.subDocPathText} numberOfLines={1}>
                              {sub.file_name || sub.attachment_url}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                            <TouchableOpacity
                              style={styles.downloadDocBtn}
                              onPress={() => handleDownloadSubmissionFile(sub, `${sub.roll_no || 'student'}_submission`)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.downloadDocBtnText}>⬇ Download File</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.previewDocBtn}
                              onPress={() => handlePreviewDocument(sub.attachment_url, `${sub.student_name}'s Submission`, `Roll: ${sub.roll_no} • ${activeAssignment.title}`)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.previewDocBtnText}>👁️ Preview</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.openDirectBtn}
                              onPress={() => handleOpenDocument(sub.attachment_url)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.openDirectBtnText}>📥 New Tab</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : null}

                      {/* Split Marks Rubric Summary if present */}
                      {sub.split_marks && (
                        <View style={styles.subMiniSplitRow}>
                          <Text style={styles.subMiniSplitText}>
                            📊 Rubric: Approach: {sub.split_marks.part_a ?? 0} • Impl: {sub.split_marks.part_b ?? 0} • Quality: {sub.split_marks.part_c ?? 0} (Total: {sub.marks_awarded})
                          </Text>
                        </View>
                      )}

                      {/* Feedback if already graded or resubmission requested */}
                      {sub.feedback ? (
                        <View style={[styles.feedbackBox, sub.status === 'resubmission_requested' && { borderColor: colors.accentAmber }]}>
                          <Text style={[styles.feedbackTitle, sub.status === 'resubmission_requested' && { color: colors.accentAmber }]}>
                            {sub.status === 'resubmission_requested' ? '⚠️ Revision Feedback Note Sent:' : 'Recorded Feedback:'}
                          </Text>
                          <Text style={styles.feedbackText}>{sub.feedback}</Text>
                        </View>
                      ) : null}

                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity style={[styles.gradeActionBtn, { flex: 1 }]} onPress={() => handleOpenGrade(sub)}>
                          <Text style={styles.gradeActionBtnText}>
                            {sub.status === 'graded' ? '✏️ Edit Grade' : '📝 Enter Marks'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.resubActionBtn, { flex: 1 }]}
                          onPress={() => {
                            handleOpenGrade(sub);
                            setShowResubmissionSection(true);
                          }}
                        >
                          <Text style={styles.resubActionBtnText}>
                            {sub.status === 'resubmission_requested' ? '✏️ Update Revision Note' : '🔄 Request Resubmission'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              );
            })()}
          </ScrollView>
        </Modal>
      )}

      {/* ========================================================== */}
      {/* MODAL 3: STUDENT SUBMIT SOLUTION (File Upload + Text)      */}
      {/* ========================================================== */}
      {isStudent && activeAssignment && (
        <Modal
          visible={showSubmitModal}
          onClose={() => setShowSubmitModal(false)}
          title={`Submit: ${activeAssignment.title}`}
        >
          <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
            <View style={styles.submitModalMeta}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Course: <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>{activeAssignment.subject_name}</Text>
              </Text>
              <Text style={{ color: colors.primaryLight, fontSize: 12, fontWeight: 'bold' }}>
                Max Marks: {activeAssignment.max_marks} • Due: {new Date(activeAssignment.due_date).toLocaleDateString()}
              </Text>
            </View>

            {activeAssignment.my_submission?.status === 'resubmission_requested' && (
              <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', borderWidth: 1, borderColor: colors.accentAmber, borderRadius: 8, padding: 12, marginBottom: 14 }}>
                <Text style={{ color: colors.accentAmber, fontWeight: 'bold', fontSize: 13 }}>
                  ⚠️ Uploading Revised Assignment Solution
                </Text>
                <Text style={{ color: '#E2E8F0', fontSize: 12, marginTop: 4 }}>
                  Instructor Note: "{activeAssignment.my_submission.feedback || 'Please update your solution and resubmit.'}"
                </Text>
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Solution Explanation / Executive Summary</Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                multiline
                numberOfLines={4}
                placeholder="Explain your approach, design schema, algorithm analysis, or key findings..."
                placeholderTextColor={colors.textMuted}
                value={submitText}
                onChangeText={setSubmitText}
              />
            </View>

            {/* Supported format pills */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.formatsLabel}>Supported Academic File Formats:</Text>
              <View style={styles.formatsRow}>
                <View style={styles.formatPill}><Text style={styles.formatPillText}>📕 PDF (.pdf)</Text></View>
                <View style={styles.formatPill}><Text style={styles.formatPillText}>📘 Word (.docx, .doc)</Text></View>
                <View style={styles.formatPill}><Text style={styles.formatPillText}>🖼️ Images (.png, .jpg)</Text></View>
                <View style={styles.formatPill}><Text style={styles.formatPillText}>📦 ZIP Archive (.zip)</Text></View>
                <View style={styles.formatPill}><Text style={styles.formatPillText}>💻 Code (.py, .java, .sql)</Text></View>
              </View>
            </View>

            {/* REAL FILE UPLOAD PICKER */}
            <View style={styles.field}>
              <Text style={styles.label}>Attach Completed Assignment Document * (Max 25 MB)</Text>

              <TouchableOpacity
                style={styles.filePickerBtn}
                onPress={() => {
                  if (Platform.OS === 'web' && fileInputRef.current) {
                    fileInputRef.current.click();
                  } else {
                    alert('File upload is supported on Web browsers.');
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.filePickerIcon}>📂</Text>
                <Text style={styles.filePickerText}>
                  {selectedFile ? `Selected: ${selectedFile.name}` : 'Click to Browse & Upload Document...'}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 4 }}>
                  Direct institutional file upload • Supports PDF, DOCX, Images, ZIP
                </Text>
              </TouchableOpacity>

              {selectedFile && (
                <View style={styles.fileSelectedRow}>
                  <Text style={styles.fileSelectedName} numberOfLines={1}>
                    📎 {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedFile(null)}>
                    <Text style={styles.fileClearText}>✕ Remove</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Alternative External URL */}
            <View style={styles.field}>
              <Text style={styles.label}>Or Link External Document URL (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="https://drive.google.com/... or github repo link"
                placeholderTextColor={colors.textMuted}
                value={submitUrl}
                onChangeText={setSubmitUrl}
              />
            </View>

            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleStudentSubmit} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.modalPrimaryBtnText}>✓ Confirm & Submit Solution to Faculty</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </Modal>
      )}

      {/* ========================================================== */}
      {/* MODAL 4: FACULTY GRADE SUBMISSION (RBAC Enforced)          */}
      {/* ========================================================== */}
      {isFacultyOrAdmin && gradingSubmission && (
        <Modal
          visible={showGradeModal}
          onClose={() => setShowGradeModal(false)}
          title={`Evaluate: ${gradingSubmission.student_name}`}
          maxWidth={850}
        >
          {/* Student Info & Download Button Header */}
          <View style={styles.evalStudentHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Student Information</Text>
              <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: 'bold' }}>
                {gradingSubmission.student_name} (Roll: {gradingSubmission.roll_no} • Reg: {gradingSubmission.register_no})
              </Text>
            </View>
            {gradingSubmission.attachment_url && (
              <TouchableOpacity
                style={styles.downloadDocBtn}
                onPress={() => handleDownloadSubmissionFile(gradingSubmission, `${gradingSubmission.roll_no}_submission`)}
                activeOpacity={0.8}
              >
                <Text style={styles.downloadDocBtnText}>⬇ Download Student File</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Submission Document Embedded Viewer */}
          {gradingSubmission.attachment_url ? (
            <View style={styles.field}>
              <Text style={styles.label}>Student Submitted Solution Document</Text>
              <DocumentViewer
                url={gradingSubmission.attachment_url}
                title={`${gradingSubmission.student_name}'s Work`}
                subtitle={`Roll: ${gradingSubmission.roll_no} • Reg: ${gradingSubmission.register_no}`}
                height={380}
              />
            </View>
          ) : null}

          {/* Split Marks Rubric Matrix Section */}
          <View style={styles.rubricBox}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View>
                <Text style={{ color: colors.primaryLight, fontSize: 13, fontWeight: 'bold' }}>
                  📊 Academic Split Marks Rubric Matrix
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                  Score split academic criteria; total automatically updates
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.toggleSwitchBtn, useSplitGrading && styles.toggleSwitchBtnActive]}
                onPress={() => setUseSplitGrading(!useSplitGrading)}
              >
                <Text style={[styles.toggleSwitchBtnText, useSplitGrading && styles.toggleSwitchBtnTextActive]}>
                  {useSplitGrading ? '✓ Rubric Enabled' : 'Use Split Rubric'}
                </Text>
              </TouchableOpacity>
            </View>

            {useSplitGrading ? (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={[styles.field, { flex: 1, marginBottom: 0 }]}>
                    <Text style={styles.splitInputLabel}>Part A: Formulation & Approach (Target: 25%)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="e.g. 5"
                      placeholderTextColor={colors.textMuted}
                      value={splitPartA}
                      onChangeText={(v) => handleSplitChange('a', v)}
                    />
                  </View>
                  <View style={[styles.field, { flex: 1, marginBottom: 0 }]}>
                    <Text style={styles.splitInputLabel}>Part B: Implementation & Correctness (Target: 50%)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="e.g. 10"
                      placeholderTextColor={colors.textMuted}
                      value={splitPartB}
                      onChangeText={(v) => handleSplitChange('b', v)}
                    />
                  </View>
                  <View style={[styles.field, { flex: 1, marginBottom: 0 }]}>
                    <Text style={styles.splitInputLabel}>Part C: Documentation & Quality (Target: 25%)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="e.g. 5"
                      placeholderTextColor={colors.textMuted}
                      value={splitPartC}
                      onChangeText={(v) => handleSplitChange('c', v)}
                    />
                  </View>
                </View>
                <View style={styles.splitTotalBanner}>
                  <Text style={styles.splitTotalText}>
                    Computed Total Marks: <Text style={{ color: colors.accentEmerald, fontWeight: 'bold' }}>{awardedMarks || 0}</Text> / {activeAssignment.max_marks} Marks
                  </Text>
                </View>
              </View>
            ) : (
              <View style={[styles.field, { marginBottom: 0 }]}>
                <Text style={styles.label}>Total Marks Awarded (Max: {activeAssignment.max_marks}) *</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder={`0 - ${activeAssignment.max_marks}`}
                  placeholderTextColor={colors.textMuted}
                  value={awardedMarks}
                  onChangeText={setAwardedMarks}
                />
              </View>
            )}
          </View>

          {/* Constructive Faculty Feedback & Remarks */}
          <View style={styles.field}>
            <Text style={styles.label}>Constructive Faculty Remarks & Feedback *</Text>
            <TextInput
              style={[styles.input, { height: 95, textAlignVertical: 'top' }]}
              multiline
              numberOfLines={4}
              placeholder="Good decomposition. Provide clearer justification for Boyce-Codd normal form..."
              placeholderTextColor={colors.textMuted}
              value={gradingFeedback}
              onChangeText={(v) => {
                setGradingFeedback(v);
                setFacultyRemarks(v);
              }}
            />
          </View>

          {/* Allow Resubmission Toggle & Note */}
          <View style={{ marginVertical: 14, padding: 14, backgroundColor: 'rgba(245, 158, 11, 0.08)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ color: colors.accentAmber, fontWeight: 'bold', fontSize: 13 }}>
                  🔄 Allow / Request Student Resubmission
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                  Need the student to fix errors or re-upload an updated document before grading?
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.toggleSwitchBtn, showResubmissionSection && styles.toggleSwitchBtnActive]}
                onPress={() => setShowResubmissionSection(!showResubmissionSection)}
              >
                <Text style={[styles.toggleSwitchBtnText, showResubmissionSection && styles.toggleSwitchBtnTextActive]}>
                  {showResubmissionSection ? '✓ Active' : 'Toggle'}
                </Text>
              </TouchableOpacity>
            </View>

            {showResubmissionSection && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.label}>Revision Instructions / Feedback Note for Student *</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  multiline
                  numberOfLines={3}
                  placeholder="e.g. Please revise Question 3 ER schema and provide the normalized 3NF relations, then re-upload..."
                  placeholderTextColor={colors.textMuted}
                  value={resubmissionFeedback}
                  onChangeText={setResubmissionFeedback}
                />
                <TouchableOpacity
                  style={styles.requestResubSubmitBtn}
                  onPress={handleRequestResubmission}
                  disabled={requestingResubmission}
                >
                  {requestingResubmission ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.requestResubSubmitBtnText}>
                      ⚠️ Request Resubmission & Notify Student
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleSaveGrade} disabled={grading}>
            {grading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalPrimaryBtnText}>✓ Finalize Grade & Feedback</Text>}
          </TouchableOpacity>
        </Modal>
      )}

      {/* ========================================================== */}
      {/* MODAL 5: DEDICATED FULL DOCUMENT PREVIEW MODAL             */}
      {/* ========================================================== */}
      <Modal
        visible={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title={previewDoc.title || 'Document Preview'}
        maxWidth={900}
      >
        <View style={{ width: '100%' }}>
          <DocumentViewer
            url={previewDoc.url}
            title={previewDoc.title}
            subtitle={previewDoc.subtitle}
            height={600}
          />
        </View>
      </Modal>

      {/* ========================================================== */}
      {/* MODAL 6: STUDENT SUBMISSION CONFIRMATION MODAL             */}
      {/* ========================================================== */}
      {submissionConfirmation && (
        <Modal
          visible={!!submissionConfirmation}
          onClose={() => setSubmissionConfirmation(null)}
          title="Submission Confirmed"
          maxWidth={520}
        >
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <View style={styles.confirmCheckCircle}>
              <Text style={{ fontSize: 32 }}>🎉</Text>
            </View>
            <Text style={styles.confirmTitle}>
              {submissionConfirmation.isResubmission ? 'Revised Solution Submitted!' : 'Assignment Submitted Successfully!'}
            </Text>
            <Text style={styles.confirmSub}>
              Your solution document has been safely recorded in the institutional academic repository.
            </Text>

            <View style={styles.confirmDetailsBox}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Problem Set:</Text>
                <Text style={styles.confirmVal} numberOfLines={1}>{submissionConfirmation.assignmentTitle}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Course:</Text>
                <Text style={styles.confirmVal}>{submissionConfirmation.subjectName}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Attachment:</Text>
                <Text style={styles.confirmVal} numberOfLines={1}>
                  📎 {submissionConfirmation.fileName} {submissionConfirmation.fileSize ? `(${submissionConfirmation.fileSize})` : ''}
                </Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Submitted At:</Text>
                <Text style={styles.confirmVal}>{submissionConfirmation.submittedAt}</Text>
              </View>
              <View style={[styles.confirmRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.confirmLabel}>Evaluation Status:</Text>
                <Text style={[styles.confirmVal, { color: colors.accentAmber, fontWeight: 'bold' }]}>
                  ⏳ Awaiting Faculty Evaluation
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.modalPrimaryBtn, { width: '100%', marginTop: 16 }]}
              onPress={() => setSubmissionConfirmation(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalPrimaryBtnText}>✓ Done / View Assignment Details</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const webSelectStyle = {
  backgroundColor: colors.bgDark,
  color: colors.textPrimary,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: '8px',
  padding: '10px 12px',
  fontSize: '12px',
  outline: 'none',
  width: '100%'
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark },
  content: { padding: 24 },
  center: { paddingVertical: 40, alignItems: 'center' },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  pageTitle: { fontSize: 22, fontWeight: typography.weight.bold, color: colors.textPrimary },
  badge: { backgroundColor: 'rgba(99, 102, 241, 0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 10 },
  badgeText: { color: colors.primaryLight, fontSize: 11, fontWeight: typography.weight.bold },
  pageSub: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  createBtn: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  createBtnText: { color: '#FFF', fontSize: 13, fontWeight: typography.weight.bold },

  roleInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    gap: 12
  },
  roleInfoFaculty: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderColor: 'rgba(99, 102, 241, 0.25)'
  },
  roleInfoStudent: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)'
  },
  roleInfoIcon: { fontSize: 24 },
  roleInfoTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: typography.weight.bold },
  roleInfoDesc: { color: colors.textSecondary, fontSize: 11, marginTop: 2, lineHeight: 16 },

  empty: { backgroundColor: colors.bgCard, padding: 40, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.borderLight },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: typography.weight.bold },
  emptySub: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  list: { gap: 16 },
  card: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 20, borderWidth: 1, borderColor: colors.borderLight },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  codeTag: { backgroundColor: 'rgba(99, 102, 241, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  codeTagText: { color: colors.primaryLight, fontSize: 10, fontWeight: typography.weight.bold },
  batchTag: { color: colors.textMuted, fontSize: 11 },
  dueText: { color: colors.accentAmber, fontSize: 11, fontWeight: typography.weight.semibold },
  asgTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: typography.weight.bold },
  asgSubject: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  maxBox: { backgroundColor: colors.bgDark, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.borderLight },
  maxScore: { color: colors.primaryLight, fontSize: 18, fontWeight: typography.weight.bold },
  maxSub: { color: colors.textMuted, fontSize: 9 },
  asgDesc: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 12 },

  attachRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgDark, padding: 10, borderRadius: 8, marginTop: 12, borderWidth: 1, borderColor: colors.borderLight },
  attachIcon: { fontSize: 14, marginRight: 8 },
  attachText: { color: colors.primaryLight, fontSize: 11, flex: 1 },
  attachOpenText: { color: colors.accentEmerald, fontSize: 11, fontWeight: typography.weight.bold, marginLeft: 8 },

  studentStatusContainer: { marginTop: 14 },
  gradedCard: { backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.25)' },
  gradedCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  gradedBadge: { backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  gradedBadgeText: { color: colors.accentEmerald, fontSize: 12, fontWeight: typography.weight.bold },
  gradedDateText: { color: colors.textMuted, fontSize: 11 },
  feedbackContainer: { backgroundColor: colors.bgDark, borderRadius: 8, padding: 10, marginTop: 6, borderWidth: 1, borderColor: colors.borderLight },
  feedbackHeader: { color: colors.primaryLight, fontSize: 11, fontWeight: typography.weight.bold },
  feedbackBody: { color: colors.textPrimary, fontSize: 12, marginTop: 4, lineHeight: 16 },
  submittedDocBtn: { alignSelf: 'flex-start', marginTop: 8, backgroundColor: 'rgba(99, 102, 241, 0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  submittedDocText: { color: colors.primaryLight, fontSize: 11, fontWeight: typography.weight.bold },

  submittedCard: { backgroundColor: 'rgba(245, 158, 11, 0.08)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.25)' },
  submittedHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  submittedBadge: { backgroundColor: 'rgba(245, 158, 11, 0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  submittedBadgeText: { color: colors.accentAmber, fontSize: 11, fontWeight: typography.weight.bold },
  subSummaryText: { color: colors.textSecondary, fontSize: 11, fontStyle: 'italic', marginTop: 4 },

  pendingCard: { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
  pendingCardText: { color: colors.accentAmber, fontSize: 11, fontWeight: typography.weight.semibold },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderLight, flexWrap: 'wrap', gap: 10 },
  footerStats: { flex: 1 },
  footerStatText: { color: colors.textMuted, fontSize: 11 },
  footerActions: { flexDirection: 'row', gap: 10 },
  reviewBtn: { backgroundColor: 'rgba(99, 102, 241, 0.15)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.3)' },
  reviewBtnText: { color: colors.primaryLight, fontSize: 12, fontWeight: typography.weight.bold },
  submitWorkBtn: { backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  resubmitWorkBtn: { backgroundColor: '#334155' },
  submitWorkBtnText: { color: '#FFF', fontSize: 12, fontWeight: typography.weight.bold },

  // Modal Styles
  field: { marginBottom: 12 },
  label: { color: colors.textSecondary, fontSize: 11, fontWeight: typography.weight.semibold, marginBottom: 6 },
  input: { height: 40, backgroundColor: colors.bgDark, borderRadius: 8, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 12, color: colors.textPrimary, fontSize: 12 },
  modalPrimaryBtn: { backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  modalPrimaryBtnText: { color: '#FFF', fontWeight: typography.weight.bold, fontSize: 13 },

  subModalMetaHeader: { backgroundColor: colors.bgDark, padding: 10, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: colors.borderLight },
  subModalMetaText: { color: colors.textSecondary, fontSize: 12 },

  subItem: { backgroundColor: colors.bgDark, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.borderLight },
  subItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  subStudentName: { color: colors.textPrimary, fontSize: 14, fontWeight: typography.weight.bold },
  subStudentMeta: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  subStatusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  subGraded: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  subPending: { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
  subStatusText: { fontSize: 11, fontWeight: typography.weight.bold },
  subText: { color: colors.textSecondary, fontSize: 12, lineHeight: 16 },

  subDocActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 8,
    flexWrap: 'wrap'
  },
  subDocPathText: { color: colors.textSecondary, fontSize: 11 },
  previewDocBtn: { backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  previewDocBtnText: { color: colors.accentEmerald, fontSize: 11, fontWeight: typography.weight.bold },
  openDirectBtn: { backgroundColor: 'rgba(99, 102, 241, 0.15)', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.3)' },
  openDirectBtnText: { color: colors.primaryLight, fontSize: 11, fontWeight: typography.weight.bold },

  feedbackBox: { backgroundColor: colors.bgCard, padding: 8, borderRadius: 6, marginTop: 8, borderWidth: 1, borderColor: colors.borderLight },
  feedbackTitle: { color: colors.accentEmerald, fontSize: 10, fontWeight: typography.weight.bold },
  feedbackText: { color: colors.textPrimary, fontSize: 11, marginTop: 2 },
  gradeActionBtn: { backgroundColor: 'rgba(99, 102, 241, 0.15)', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 6, alignSelf: 'flex-start', marginTop: 10 },
  gradeActionBtnText: { color: colors.primaryLight, fontSize: 11, fontWeight: typography.weight.bold },

  submitModalMeta: { backgroundColor: colors.bgDark, padding: 10, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: colors.borderLight, flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  filePickerBtn: { backgroundColor: colors.bgDark, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primaryLight, padding: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  filePickerIcon: { fontSize: 24, marginBottom: 4 },
  filePickerText: { color: colors.primaryLight, fontSize: 12, fontWeight: typography.weight.semibold },
  fileSelectedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgCard, padding: 8, borderRadius: 6, marginTop: 6, borderWidth: 1, borderColor: colors.borderLight },
  fileSelectedName: { color: colors.textPrimary, fontSize: 11, flex: 1 },
  fileClearText: { color: colors.accentRose, fontSize: 11, fontWeight: typography.weight.bold, marginLeft: 8 },

  resubAlertCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    gap: 8
  },
  resubAlertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6
  },
  resubAlertBadge: {
    color: colors.accentAmber,
    fontSize: 11,
    fontWeight: typography.weight.bold,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  resubAlertDate: {
    color: colors.textMuted,
    fontSize: 10
  },
  resubmitActionBtn: {
    backgroundColor: colors.accentAmber,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4
  },
  resubmitActionBtnText: {
    color: '#0F172A',
    fontWeight: typography.weight.bold,
    fontSize: 12
  },
  subResubRequested: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: colors.accentAmber
  },
  subResubmitted: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderWidth: 1,
    borderColor: colors.primaryLight
  },
  resubActionBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)'
  },
  resubActionBtnText: {
    color: colors.accentAmber,
    fontSize: 11,
    fontWeight: typography.weight.bold
  },
  toggleSwitchBtn: {
    backgroundColor: colors.bgCard,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  toggleSwitchBtnActive: {
    backgroundColor: colors.accentAmber,
    borderColor: colors.accentAmber
  },
  toggleSwitchBtnText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: typography.weight.bold
  },
  toggleSwitchBtnTextActive: {
    color: '#0F172A'
  },
  requestResubSubmitBtn: {
    backgroundColor: colors.accentAmber,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  },
  requestResubSubmitBtnText: {
    color: '#0F172A',
    fontWeight: typography.weight.bold,
    fontSize: 12
  },

  // Student Category Filter Tabs
  categoryTabsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20
  },
  categoryTab: {
    backgroundColor: colors.bgCard,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center'
  },
  categoryTabActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: colors.primaryLight
  },
  categoryTabText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: typography.weight.semibold
  },
  categoryTabTextActive: {
    color: colors.primaryLight,
    fontWeight: typography.weight.bold
  },

  // Rubric Split Breakdown in Student Graded Card
  splitBreakdownCard: {
    backgroundColor: colors.bgDark,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  splitBreakdownTitle: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: typography.weight.bold,
    marginBottom: 6
  },
  splitBreakdownGrid: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  splitBreakdownItem: {
    flex: 1,
    minWidth: 120,
    backgroundColor: colors.bgCard,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  splitItemLabel: {
    color: colors.textMuted,
    fontSize: 10
  },
  splitItemVal: {
    color: colors.accentEmerald,
    fontSize: 12,
    fontWeight: typography.weight.bold,
    marginTop: 2
  },

  // Direct 1-Click File Download Button
  downloadDocBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  downloadDocBtnText: {
    color: colors.accentEmerald,
    fontSize: 11,
    fontWeight: typography.weight.bold
  },

  // Faculty Review Filter Tabs
  facultySubTabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap'
  },
  facultySubTab: {
    backgroundColor: colors.bgCard,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  facultySubTabActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: colors.primaryLight
  },
  facultySubTabText: {
    color: colors.textMuted,
    fontSize: 11
  },
  facultySubTabTextActive: {
    color: colors.primaryLight,
    fontWeight: typography.weight.bold
  },
  subMiniSplitRow: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderRadius: 4
  },
  subMiniSplitText: {
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: typography.weight.semibold
  },

  // Modal 3 Supported Format Pills
  formatsLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 4
  },
  formatsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 6
  },
  formatPill: {
    backgroundColor: colors.bgDark,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  formatPillText: {
    color: colors.textSecondary,
    fontSize: 10
  },

  // Modal 4 Faculty Evaluation Header & Split Rubric Matrix
  evalStudentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 10
  },
  rubricBox: {
    backgroundColor: colors.bgDark,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  splitInputLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: typography.weight.semibold,
    marginBottom: 4
  },
  splitTotalBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    alignItems: 'center'
  },
  splitTotalText: {
    color: colors.textPrimary,
    fontSize: 12
  },

  // Modal 6 Submission Confirmation Modal
  confirmCheckCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 2,
    borderColor: colors.accentEmerald,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  confirmTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: typography.weight.bold,
    textAlign: 'center'
  },
  confirmSub: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16
  },
  confirmDetailsBox: {
    width: '100%',
    backgroundColor: colors.bgDark,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 10
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: 8
  },
  confirmLabel: {
    color: colors.textMuted,
    fontSize: 11
  },
  confirmVal: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: typography.weight.semibold,
    flex: 1,
    textAlign: 'right'
  }
});
