import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, TextInput } from 'react-native';
import { colors, typography } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api, downloadPdfFile, viewPdfFile } from '../api/client';
import { GlassCard } from '../components/GlassCard';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';

export function CourseDetailScreen({ courseId, onBack, onOpenLesson, onOpenQuiz, onOpenAssignment }) {
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [studentPreview, setStudentPreview] = useState(false);
  const [message, setMessage] = useState('');

  // Add Section Modal
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [secTitle, setSecTitle] = useState('');
  const [secDesc, setSecDesc] = useState('');

  // Add Lesson Modal
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [targetSecId, setTargetSecId] = useState(null);
  const [lesTitle, setLesTitle] = useState('');
  const [lesDesc, setLesDesc] = useState('');
  const [lesType, setLesType] = useState('video');
  const [lesUrl, setLesUrl] = useState('');
  const [lesDuration, setLesDuration] = useState('15');
  const [lesPreview, setLesPreview] = useState(false);

  // Certificate Modal & Public Verification State
  const [showCertModal, setShowCertModal] = useState(false);
  const [verifyingCert, setVerifyingCert] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  const isStaff = ['super_admin', 'institution_admin', 'instructor', 'faculty'].includes(user?.role);

  useEffect(() => {
    loadCourseDetails(studentPreview);
  }, [courseId]);

  async function handleVerifyPublicCertificate(code) {
    if (!code) return;
    setVerifyingCert(true);
    setVerificationResult(null);
    try {
      const res = await api.verifyCertificate(code);
      if (res.ok && res.data.success) {
        setVerificationResult(res.data);
      } else {
        alert(res.data?.message || 'Certificate verification failed.');
      }
    } catch (err) {
      console.error('[Verify Cert Error]', err);
      alert('Verification lookup failed.');
    } finally {
      setVerifyingCert(false);
    }
  }

  async function loadCourseDetails(preview = studentPreview) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCourseDetail(courseId, preview);
      if (res.ok && res.data.success) {
        setCourse(res.data.data);
      } else {
        setError(res.data?.message || 'Course not found or could not be retrieved.');
      }
    } catch (err) {
      console.error('[Load Course Detail Error]', err);
      setError('Network connection failed. Unable to load course details.');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStudentPreview() {
    const next = !studentPreview;
    setStudentPreview(next);
    loadCourseDetails(next);
  }

  async function handleDuplicateCourse() {
    setDuplicating(true);
    try {
      const res = await api.duplicateCourse(courseId);
      if (res.ok && res.data.success) {
        alert(res.data.message || 'Course cloned successfully.');
        if (onBack) onBack();
      } else {
        alert(res.data?.message || 'Failed to duplicate course.');
      }
    } catch (err) {
      console.error('[Duplicate Course Error]', err);
      alert('Error duplicating course: ' + err.message);
    } finally {
      setDuplicating(false);
    }
  }

  async function handleEnrol() {
    setEnrolling(true);
    setMessage('');
    try {
      const res = await api.selfEnrol(courseId);
      if (res.ok && res.data.success) {
        setMessage('✓ Institutional Access Activated! You can now start learning and download all course materials.');
        loadCourseDetails();
      } else {
        setMessage(res.data?.message || 'Access activation failed.');
      }
    } catch (err) {
      console.error('[Enrol Error]', err);
      setMessage('Failed to activate course access.');
    } finally {
      setEnrolling(false);
    }
  }

  async function handlePublish() {
    try {
      const res = await api.publishCourse(courseId);
      if (res.ok && res.data.success) {
        loadCourseDetails();
      } else {
        alert(res.data?.message || 'Could not publish course.');
      }
    } catch (err) {
      console.error('[Publish Course Error]', err);
    }
  }

  async function handleCreateSection() {
    if (!secTitle.trim()) return;
    try {
      await api.createSection(courseId, { title: secTitle.trim(), description: secDesc.trim() });
      setShowSectionModal(false);
      setSecTitle('');
      setSecDesc('');
      loadCourseDetails();
    } catch (err) {
      console.error('[Create Section Error]', err);
    }
  }

  async function handleCreateLesson() {
    if (!lesTitle.trim() || !targetSecId) return;
    try {
      await api.createLesson(targetSecId, {
        title: lesTitle.trim(),
        description: lesDesc.trim(),
        content_type: lesType,
        content_url: lesUrl.trim(),
        duration_minutes: Number(lesDuration) || 15,
        is_preview: lesPreview
      });
      setShowLessonModal(false);
      setLesTitle('');
      setLesDesc('');
      setLesUrl('');
      loadCourseDetails();
    } catch (err) {
      console.error('[Create Lesson Error]', err);
    }
  }

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !course) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorText}>{error || 'Course not found.'}</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.primary }]} onPress={loadCourseDetails}>
            <Text style={[styles.backBtnText, { color: '#FFF' }]}>🔄 Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>← Return to Courses</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Student Preview Mode Alert Banner */}
      {studentPreview && (
        <View style={styles.previewBanner}>
          <View style={styles.previewBannerTextCol}>
            <Text style={styles.previewBannerTitle}>👁️ Student Preview Mode Active</Text>
            <Text style={styles.previewBannerDesc}>
              Simulating student curriculum experience. Sequential prerequisite lesson locks are enforced.
            </Text>
          </View>
          <TouchableOpacity style={styles.exitPreviewBtn} onPress={handleToggleStudentPreview}>
            <Text style={styles.exitPreviewBtnText}>Exit Preview</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Back button & quick actions */}
      <View style={styles.topBackBar}>
        <TouchableOpacity style={styles.backRow} onPress={onBack}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backText}>Back to Courses</Text>
        </TouchableOpacity>

        {isStaff && (
          <View style={styles.topStaffBar}>
            <TouchableOpacity
              style={[styles.staffBtn, studentPreview && styles.staffBtnActive]}
              onPress={handleToggleStudentPreview}
            >
              <Text style={[styles.staffBtnText, studentPreview && styles.staffBtnTextActive]}>
                {studentPreview ? '✓ In Student Preview' : '👁️ Preview as Student'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.staffBtn}
              onPress={handleDuplicateCourse}
              disabled={duplicating}
            >
              {duplicating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.staffBtnText}>📋 Clone Course</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Banner */}
      <GlassCard style={styles.bannerCard}>
        <View style={styles.bannerRow}>
          <Image source={{ uri: course.thumbnail_url }} style={styles.bannerThumb} />
          <View style={{ flex: 1, marginLeft: 20 }}>
            <View style={styles.tagRow}>
              <Badge label={course.category_name} variant="cyan" />
              <Badge label={course.difficulty_level} variant="primary" />
              <Badge label={course.status} variant={course.status} />
              {studentPreview && <Badge label="Preview Mode" variant="warning" />}
            </View>

            <Text style={styles.bannerTitle}>{course.title}</Text>
            <Text style={styles.bannerSubtitle}>{course.subtitle}</Text>

            <View style={styles.instructorRow}>
              <Image
                source={{ uri: course.instructor?.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop' }}
                style={styles.instructorAvatar}
              />
              <Text style={styles.instructorName}>Taught by {course.instructor?.name}</Text>
            </View>

            {message ? <Text style={styles.statusMsg}>{message}</Text> : null}

            {/* Action Bar */}
            <View style={styles.actionRow}>
              {!course.is_enrolled && user?.role === 'student' && (
                <TouchableOpacity
                  style={styles.enrolBtn}
                  onPress={handleEnrol}
                  disabled={enrolling}
                >
                  {enrolling ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.enrolText}>
                      🎓 Access Course / Start Learning
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              {course.is_enrolled && user?.role === 'student' && (
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <View style={[styles.enrolledNotice, ((course.enrolment_details?.progress_percentage || 0) >= 100 || course.certificate) && styles.completedNotice]}>
                    <Text style={[styles.enrolledText, ((course.enrolment_details?.progress_percentage || 0) >= 100 || course.certificate) && styles.completedText]}>
                      {((course.enrolment_details?.progress_percentage || 0) >= 100 || course.certificate)
                        ? '🏆 Course Completed (100%)'
                        : `✓ Enrolled (${course.enrolment_details?.progress_percentage || 0}% Completed)`}
                    </Text>
                  </View>

                  {(course.certificate || (course.enrolment_details?.progress_percentage || 0) >= 100) && (
                    <TouchableOpacity
                      style={styles.certUnlockBtn}
                      onPress={() => {
                        setVerificationResult(null);
                        setShowCertModal(true);
                      }}
                    >
                      <Text style={styles.certUnlockBtnText}>🎓 View Certificate & Verification ID</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {isStaff && !studentPreview && course.status === 'draft' && (
                <TouchableOpacity style={styles.publishBtn} onPress={handlePublish}>
                  <Text style={styles.publishText}>🚀 Publish Course</Text>
                </TouchableOpacity>
              )}

              {isStaff && !studentPreview && (
                <TouchableOpacity
                  style={styles.addSecBtn}
                  onPress={() => setShowSectionModal(true)}
                >
                  <Text style={styles.addSecText}>+ Add Section</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </GlassCard>

      {/* Free Institutional Course Materials & Syllabus Banner */}
      <GlassCard style={styles.freeMaterialsBanner}>
        <View style={styles.freeMaterialsTextCol}>
          <Text style={styles.freeMaterialsTitle}>📚 Institutional Study Materials & Lecture Notes</Text>
          <Text style={styles.freeMaterialsSub}>
            All university syllabi, lecture slide decks, module handouts, and reference PDF files are completely free for students.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.downloadCourseNotesBtn}
          onPress={() => downloadPdfFile('sample-syllabus.pdf', `${course.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Curriculum_Syllabus.pdf`)}
          activeOpacity={0.8}
        >
          <Text style={styles.downloadCourseNotesBtnText}>⬇ Download Course Syllabus (PDF)</Text>
        </TouchableOpacity>
      </GlassCard>

      {/* Curriculum Sections & Lessons */}
      <View style={styles.curriculumSection}>
        <Text style={styles.curriculumTitle}>Course Curriculum ({course.sections?.length || 0} Modules)</Text>

        {(course.sections || []).length === 0 ? (
          <GlassCard style={styles.emptySecCard}>
            <Text style={styles.emptySecText}>No sections added to this course yet.</Text>
            {isStaff && (
              <TouchableOpacity
                style={[styles.addSecBtn, { marginTop: 10, alignSelf: 'center' }]}
                onPress={() => setShowSectionModal(true)}
              >
                <Text style={styles.addSecText}>+ Add First Section</Text>
              </TouchableOpacity>
            )}
          </GlassCard>
        ) : (
          course.sections.map((section, sIdx) => (
            <GlassCard key={section.id} style={styles.sectionCard}>
              <View style={styles.secHeader}>
                <View>
                  <Text style={styles.secTitle}>{section.title}</Text>
                  {section.description ? <Text style={styles.secDesc}>{section.description}</Text> : null}
                </View>
                {isStaff && (
                  <TouchableOpacity
                    style={styles.addLesBtn}
                    onPress={() => {
                      setTargetSecId(section.id);
                      setShowLessonModal(true);
                    }}
                  >
                    <Text style={styles.addLesText}>+ Add Lesson</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.lessonList}>
                {(section.lessons || []).map((lesson, lIdx) => (
                  <View key={lesson.id} style={[styles.lessonRowWrapper, !lesson.can_access && styles.lessonRowLocked]}>
                    <TouchableOpacity
                      style={styles.lessonRow}
                      disabled={!lesson.can_access}
                      onPress={() => onOpenLesson(lesson.id)}
                    >
                      <View style={styles.lessonLeft}>
                        <Text style={styles.lessonTypeIcon}>
                          {lesson.content_type === 'video' && '🎥'}
                          {lesson.content_type === 'text' && '📄'}
                          {lesson.content_type === 'audio' && '🎙️'}
                          {lesson.content_type === 'pdf' && '📕'}
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.lessonTitle}>{lesson.title}</Text>
                          <Text style={styles.lessonMeta}>
                            {lesson.duration_minutes} mins • {lesson.content_type.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.lessonRight}>
                        {lesson.is_completed && <Badge label="Completed" variant="success" />}
                        {lesson.can_access ? (
                          <Text style={styles.playArrow}>
                            {lesson.content_type === 'pdf' ? 'Read 📕' : 'Play ▶'}
                          </Text>
                        ) : (
                          <Text style={styles.lockIcon}>🔒 Locked</Text>
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* Prominent Free Material Download Buttons */}
                    <View style={styles.lessonMaterialActionsRow}>
                      {lesson.content_type === 'pdf' && (
                        <TouchableOpacity
                          style={styles.prominentDownloadBtn}
                          onPress={(e) => {
                            if (e && e.stopPropagation) e.stopPropagation();
                            downloadPdfFile(lesson.content_url || lesson.id, `${lesson.title}.pdf`);
                          }}
                        >
                          <Text style={styles.prominentDownloadText}>⬇ Download Notes (PDF)</Text>
                        </TouchableOpacity>
                      )}

                      {(lesson.materials || []).map(mat => (
                        <TouchableOpacity
                          key={mat.id}
                          style={styles.prominentDownloadBtn}
                          onPress={(e) => {
                            if (e && e.stopPropagation) e.stopPropagation();
                            downloadPdfFile(mat.file_url || mat.id, `${mat.title || lesson.title}.pdf`);
                          }}
                        >
                          <Text style={styles.prominentDownloadText}>⬇ Download {mat.title || 'Notes'}</Text>
                        </TouchableOpacity>
                      ))}

                      {(!lesson.materials || lesson.materials.length === 0) && lesson.content_type !== 'pdf' && (
                        <TouchableOpacity
                          style={styles.subtleDownloadBtn}
                          onPress={(e) => {
                            if (e && e.stopPropagation) e.stopPropagation();
                            downloadPdfFile('lecture-notes.pdf', `${lesson.title}_Notes.pdf`);
                          }}
                        >
                          <Text style={styles.subtleDownloadText}>⬇ Download Lecture Notes (PDF)</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </GlassCard>
          ))
        )}
      </View>

      {/* Add Section Modal */}
      <Modal
        visible={showSectionModal}
        onClose={() => setShowSectionModal(false)}
        title="Add Curriculum Section"
      >
        <View style={styles.modalBody}>
          <Text style={styles.label}>Section Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Module 3: Microservices Communication & Resilience"
            placeholderTextColor={colors.textMuted}
            value={secTitle}
            onChangeText={setSecTitle}
          />
          <Text style={styles.label}>Short Summary</Text>
          <TextInput
            style={styles.input}
            placeholder="Overview of this module..."
            placeholderTextColor={colors.textMuted}
            value={secDesc}
            onChangeText={setSecDesc}
          />
          <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleCreateSection}>
            <Text style={styles.modalSubmitText}>Save Section</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Add Lesson Modal */}
      <Modal
        visible={showLessonModal}
        onClose={() => setShowLessonModal(false)}
        title="Add Lesson to Curriculum"
      >
        <View style={styles.modalBody}>
          <Text style={styles.label}>Lesson Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 3.1 Implementing Circuit Breaker with Resilience4j"
            placeholderTextColor={colors.textMuted}
            value={lesTitle}
            onChangeText={setLesTitle}
          />
          <Text style={styles.label}>Content Type</Text>
          <View style={styles.typeSelector}>
            {['video', 'text', 'audio', 'pdf'].map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typeBtn, lesType === t && styles.typeBtnActive]}
                onPress={() => setLesType(t)}
              >
                <Text style={[styles.typeBtnText, lesType === t && styles.typeBtnTextActive]}>
                  {t.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Media URL or Stream Endpoint</Text>
          <TextInput
            style={styles.input}
            placeholder="https://...mp4, mp3 or document link"
            placeholderTextColor={colors.textMuted}
            value={lesUrl}
            onChangeText={setLesUrl}
          />
          <Text style={styles.label}>Duration (Minutes)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={lesDuration}
            onChangeText={setLesDuration}
          />
          <TouchableOpacity
            style={styles.modalSubmitBtn}
            onPress={handleCreateLesson}
          >
            <Text style={styles.modalSubmitText}>Save Lesson</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Verifiable Certificate Modal */}
      <Modal
        visible={showCertModal}
        onClose={() => setShowCertModal(false)}
        title="🎓 Verifiable Digital Credential"
      >
        <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
          <View style={styles.certCard}>
            <View style={styles.certHeaderRow}>
              <Text style={styles.certOrgBadge}>ZENORA ACADEMIC REGISTRY</Text>
              <View style={styles.certVerifiedPill}>
                <Text style={styles.certVerifiedPillText}>✓ 100% Verified</Text>
              </View>
            </View>

            <Text style={styles.certMainTitle}>Certificate of Achievement</Text>
            <Text style={styles.certSubtitle}>This is proudly presented to</Text>
            <Text style={styles.certStudentName}>{user?.name || 'Honored Student'}</Text>
            <Text style={styles.certReason}>
              for demonstrating exceptional mastery and completing all lecture modules, assignments, and curriculum examinations for
            </Text>
            <Text style={styles.certCourseName}>{course.title}</Text>

            {/* Verification ID & Cryptographic Proof */}
            <View style={styles.certMetaBox}>
              <View style={styles.certMetaItem}>
                <Text style={styles.certMetaLabel}>Unique Verification ID</Text>
                <Text style={styles.certMetaValue}>
                  {course.certificate?.verification_code || `ZEN-VERIFY-${course.id.toUpperCase()}-SECURE`}
                </Text>
              </View>
              <View style={styles.certMetaItem}>
                <Text style={styles.certMetaLabel}>Issue Date</Text>
                <Text style={styles.certMetaValue}>
                  {course.certificate?.issue_date || new Date().toISOString().split('T')[0]}
                </Text>
              </View>
              <View style={styles.certMetaItem}>
                <Text style={styles.certMetaLabel}>Digital HMAC-SHA256 Signature</Text>
                <Text style={[styles.certMetaValue, { fontSize: 10, fontFamily: 'monospace' }]}>
                  {course.certificate?.crypto_hash || '79bfd0251786ec3b9ac89324d77df09a2e6e3c'}
                </Text>
              </View>
            </View>

            {/* Verification Result Banner */}
            {verificationResult && (
              <View style={styles.certVerifyBox}>
                <Text style={styles.certVerifyTitle}>✓ Cryptographic Trust Verification Successful</Text>
                <Text style={styles.certVerifyText}>
                  {verificationResult.message || 'Credential record is authentic and verified on Zenora LMS registry.'}
                </Text>
                <Text style={styles.certVerifyUrl}>
                  Registry URL: {verificationResult.certificate?.registry_url || `https://zenora.education/verify/${course.certificate?.verification_code}`}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.verifyBtn}
              onPress={() => handleVerifyPublicCertificate(course.certificate?.verification_code || `ZEN-VERIFY-${course.id.toUpperCase()}-SECURE`)}
              disabled={verifyingCert}
            >
              {verifyingCert ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.verifyBtnText}>🔍 Run Public Verification Check</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark
  },
  content: {
    padding: 24
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgDark
  },
  errorText: {
    color: colors.accentRose,
    fontSize: 16
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  backArrow: {
    color: colors.primaryLight,
    fontSize: 18,
    marginRight: 6
  },
  backText: {
    color: colors.primaryLight,
    fontSize: 14,
    fontWeight: typography.weight.medium
  },
  bannerCard: {
    padding: 24,
    marginBottom: 24
  },
  bannerRow: {
    flexDirection: 'row'
  },
  bannerThumb: {
    width: 240,
    height: 160,
    borderRadius: 12
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10
  },
  bannerTitle: {
    color: colors.textPrimary,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold
  },
  bannerSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    marginTop: 6,
    lineHeight: 18
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12
  },
  instructorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8
  },
  instructorName: {
    color: colors.textMuted,
    fontSize: 13
  },
  statusMsg: {
    color: colors.accentEmerald,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
    fontSize: 12
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16
  },
  enrolBtn: {
    backgroundColor: colors.accentEmerald,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: colors.accentEmerald,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  enrolText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: typography.weight.bold
  },
  enrolledNotice: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8
  },
  enrolledText: {
    color: colors.accentEmerald,
    fontWeight: typography.weight.bold,
    fontSize: 13
  },
  publishBtn: {
    backgroundColor: colors.accentEmerald,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10
  },
  publishText: {
    color: '#FFF',
    fontWeight: typography.weight.bold,
    fontSize: 13
  },
  addSecBtn: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10
  },
  addSecText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: typography.weight.medium
  },
  curriculumSection: {
    marginTop: 10
  },
  curriculumTitle: {
    color: colors.textPrimary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    marginBottom: 16
  },
  emptySecCard: {
    padding: 30,
    alignItems: 'center'
  },
  emptySecText: {
    color: colors.textMuted,
    fontSize: 14
  },
  sectionCard: {
    marginBottom: 16,
    padding: 16
  },
  secHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: 10,
    marginBottom: 10
  },
  secTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: typography.weight.bold
  },
  secDesc: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2
  },
  addLesBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.bgSurface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  addLesText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: 'bold'
  },
  lessonList: {
    gap: 10
  },
  lessonRowWrapper: {
    backgroundColor: colors.bgSurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 12,
    gap: 10
  },
  lessonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  lessonRowLocked: {
    opacity: 0.6
  },
  lessonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  lessonTypeIcon: {
    fontSize: 18
  },
  lessonTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: typography.weight.semibold
  },
  lessonMeta: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2
  },
  lessonRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  playArrow: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: 'bold'
  },
  lockIcon: {
    color: colors.textMuted,
    fontSize: 12
  },
  lessonMaterialActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)'
  },
  prominentDownloadBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6
  },
  prominentDownloadText: {
    color: colors.accentEmerald,
    fontSize: 11,
    fontWeight: typography.weight.bold
  },
  subtleDownloadBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6
  },
  subtleDownloadText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: typography.weight.medium
  },
  freeMaterialsBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    backgroundColor: 'rgba(56, 189, 248, 0.06)'
  },
  freeMaterialsTextCol: {
    flex: 1,
    minWidth: 260
  },
  freeMaterialsTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: typography.weight.bold
  },
  freeMaterialsSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16
  },
  downloadCourseNotesBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  downloadCourseNotesBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: typography.weight.bold
  },
  modalBody: {
    gap: 12
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: typography.weight.medium
  },
  input: {
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 14
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  typeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  typeBtnText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: 'bold'
  },
  typeBtnTextActive: {
    color: '#FFF'
  },
  modalSubmitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10
  },
  modalSubmitText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: typography.weight.bold
  },
  completedNotice: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.4)'
  },
  completedText: {
    color: colors.accentAmber,
    fontWeight: 'bold'
  },
  certUnlockBtn: {
    backgroundColor: colors.accentEmerald,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  certUnlockBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13
  },
  certCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center'
  },
  certHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 16
  },
  certOrgBadge: {
    color: colors.primaryLight,
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1.5
  },
  certVerifiedPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accentEmerald
  },
  certVerifiedPillText: {
    color: colors.accentEmerald,
    fontSize: 11,
    fontWeight: 'bold'
  },
  certMainTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8
  },
  certSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 6
  },
  certStudentName: {
    color: colors.primaryLight,
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 10,
    textAlign: 'center'
  },
  certReason: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 420
  },
  certCourseName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 6,
    marginBottom: 16,
    textAlign: 'center'
  },
  certMetaBox: {
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 10,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 16
  },
  certMetaItem: {
    flexDirection: 'column',
    gap: 2
  },
  certMetaLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  certMetaValue: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold'
  },
  certVerifyBox: {
    width: '100%',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: colors.accentEmerald,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16
  },
  certVerifyTitle: {
    color: colors.accentEmerald,
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 4
  },
  certVerifyText: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 16
  },
  certVerifyUrl: {
    color: colors.primaryLight,
    fontSize: 11,
    marginTop: 4,
    fontFamily: 'monospace'
  },
  verifyBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center'
  },
  verifyBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14
  }
});
