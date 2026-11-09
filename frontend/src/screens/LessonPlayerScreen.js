import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Platform } from 'react-native';
import { colors, typography } from '../theme/colors';
import { api, resolveFileUrl, downloadPdfFile, viewPdfFile, getBackendOrigin } from '../api/client';
import { GlassCard } from '../components/GlassCard';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';

export function LessonPlayerScreen({ lessonId, onBack, onOpenLesson }) {
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [userNote, setUserNote] = useState('');
  const [notesList, setNotesList] = useState([]);
  const [progressMsg, setProgressMsg] = useState('');
  const [viewingPdfModal, setViewingPdfModal] = useState(null);

  const [error, setError] = useState(null);

  useEffect(() => {
    loadLessonData();
  }, [lessonId]);

  async function loadLessonData() {
    setLoading(true);
    setError(null);
    setProgressMsg('');
    try {
      const res = await api.getLesson(lessonId);
      if (res.ok && res.data.success) {
        setLesson(res.data.data);
      } else {
        setError(res.data?.message || 'Lesson content is unavailable or requires enrolment.');
      }
    } catch (err) {
      console.error('[Load Lesson Error]', err);
      setError('Network connection failed. Unable to retrieve lesson.');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleComplete() {
    setMarking(true);
    try {
      const newStatus = !lesson?.is_completed;
      const res = await api.updateLessonProgress(lessonId, {
        is_completed: newStatus,
        time_spent_seconds: 900
      });

      if (res.ok && res.data.success) {
        setLesson(prev => ({ ...prev, is_completed: newStatus }));
        setProgressMsg(
          newStatus
            ? `✓ Marked as completed! Course progress is now ${res.data.progress?.course_progress_percentage}%.`
            : 'Lesson unmarked.'
        );
      }
    } catch (err) {
      console.error('[Update Progress Error]', err);
    } finally {
      setMarking(false);
    }
  }

  function handleAddNote() {
    if (!userNote.trim()) return;
    setNotesList(prev => [
      { id: Date.now(), text: userNote, timestamp: new Date().toLocaleTimeString() },
      ...prev
    ]);
    setUserNote('');
  }

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Initializing multimedia player...</Text>
      </View>
    );
  }

  if (error || !lesson) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorText}>{error || 'Lesson content unavailable.'}</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.primary }]} onPress={loadLessonData}>
            <Text style={[styles.backBtnText, { color: '#FFF' }]}>🔄 Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>← Return to Course</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Bar Navigation */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>← Return to Course</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>{lesson.title}</Text>
        <View style={styles.topRight}>
          {lesson.is_completed ? (
            <Badge label="Completed" variant="success" />
          ) : (
            <Badge label="In Progress" variant="warning" />
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* Main Content Player Area */}
        <View style={styles.playerContainer}>
          {lesson.content_type === 'video' && (
            <View style={styles.videoPlaceholder}>
              {Platform.OS === 'web' ? (
                <video
                  key={lesson.content_url}
                  src={lesson.content_url ? resolveFileUrl(lesson.content_url) : `${getBackendOrigin()}/uploads/media/demo_lesson.mp4`}
                  controls
                  playsInline
                  preload="metadata"
                  style={{
                    width: '100%',
                    height: 440,
                    borderRadius: 12,
                    backgroundColor: '#000',
                    outline: 'none',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                  }}
                />
              ) : (
                <View style={styles.nativeVideoBox}>
                  <Text style={styles.videoIcon}>▶</Text>
                  <Text style={styles.videoText}>Video Player Stream Active</Text>
                  <Text style={styles.videoUrl}>{lesson.content_url}</Text>
                </View>
              )}
            </View>
          )}

          {lesson.content_type === 'audio' && (
            <GlassCard style={styles.audioBox}>
              <Text style={styles.audioIcon}>🎙️</Text>
              <Text style={styles.audioTitle}>Audio Lecture & Discussion Podcast</Text>
              <Text style={styles.audioSub}>Duration: {lesson.duration_minutes} Minutes</Text>
              {Platform.OS === 'web' && (
                <audio
                  src={lesson.content_url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'}
                  controls
                  style={{ width: '100%', marginTop: 16 }}
                />
              )}
            </GlassCard>
          )}

          {lesson.content_type === 'text' && (
            <GlassCard style={styles.textBox}>
              <Text style={styles.textHeading}>Interactive Reading Module</Text>
              <Text style={styles.textBody}>{lesson.content_body || 'Comprehensive theoretical notes...'}</Text>
            </GlassCard>
          )}

          {lesson.content_type === 'pdf' && (
            <GlassCard style={styles.pdfViewerCard}>
              <View style={styles.pdfViewerHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={styles.pdfViewerIcon}>📕</Text>
                  <View>
                    <Text style={styles.pdfViewerTitle}>{lesson.title}</Text>
                    <Text style={styles.pdfViewerSub}>Interactive Curriculum Reference Document</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.pdfActionBtn}
                    onPress={() => viewPdfFile(lesson.content_url || lesson.id)}
                  >
                    <Text style={styles.pdfActionBtnText}>↗ Open in New Tab</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pdfActionBtn, { backgroundColor: colors.primary }]}
                    onPress={() => downloadPdfFile(lesson.content_url || lesson.id, `${lesson.title}.pdf`)}
                  >
                    <Text style={[styles.pdfActionBtnText, { color: '#FFF' }]}>⬇ Download</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {Platform.OS === 'web' ? (
                <View style={styles.pdfIframeWrapper}>
                  <iframe
                    src={resolveFileUrl(lesson.content_url)}
                    title={lesson.title}
                    style={{
                      width: '100%',
                      height: 520,
                      border: 'none',
                      borderRadius: 10,
                      backgroundColor: '#1E293B'
                    }}
                  />
                </View>
              ) : (
                <View style={styles.pdfFallbackBox}>
                  <Text style={styles.pdfIcon}>📕</Text>
                  <Text style={styles.pdfTitle}>Document & Slide Deck Reference</Text>
                  <TouchableOpacity
                    style={styles.downloadBtn}
                    onPress={() => downloadPdfFile(lesson.content_url || lesson.id, `${lesson.title}.pdf`)}
                  >
                    <Text style={styles.downloadBtnText}>⬇ Download Reference PDF</Text>
                  </TouchableOpacity>
                </View>
              )}
            </GlassCard>
          )}
        </View>

        {/* Progress Alert */}
        {progressMsg ? (
          <View style={styles.progressAlert}>
            <Text style={styles.progressAlertText}>{progressMsg}</Text>
          </View>
        ) : null}

        {/* Action Controls & Next / Prev */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.navStepBtn, !lesson.navigation?.previous && styles.navStepDisabled]}
            disabled={!lesson.navigation?.previous}
            onPress={() => lesson.navigation?.previous && onOpenLesson(lesson.navigation.previous.id)}
          >
            <Text style={styles.navStepText}>← Previous Lesson</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.completeToggleBtn, lesson.is_completed && styles.completeToggleBtnDone]}
            onPress={handleToggleComplete}
            disabled={marking}
          >
            {marking ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.completeToggleText}>
                {lesson.is_completed ? '✓ Completed' : 'Mark as Complete'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navStepBtn, !lesson.navigation?.next && styles.navStepDisabled]}
            disabled={!lesson.navigation?.next}
            onPress={() => lesson.navigation?.next && onOpenLesson(lesson.navigation.next.id)}
          >
            <Text style={styles.navStepText}>Next Lesson →</Text>
          </TouchableOpacity>
        </View>

        {/* Overview & Materials Section */}
        <View style={styles.detailsGrid}>
          <GlassCard style={styles.overviewCard}>
            <Text style={styles.sectionHeading}>Lesson Overview</Text>
            <Text style={styles.descText}>{lesson.description}</Text>

            {lesson.content_body && lesson.content_type !== 'text' ? (
              <View style={styles.notesBlock}>
                <Text style={styles.notesBlockHeading}>Curriculum Notes & Key Takeaways</Text>
                <Text style={styles.notesBlockBody}>{lesson.content_body}</Text>
              </View>
            ) : null}
          </GlassCard>

          {/* Downloadable Learning Materials */}
          <GlassCard style={styles.materialsCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.sectionHeading}>Learning Resources & Notes</Text>
              <Badge label="Free Institutional Access" variant="success" />
            </View>
            {(lesson.materials || []).length === 0 ? (
              <View style={styles.matRow}>
                <Text style={styles.matIcon}>📕</Text>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.matTitle} numberOfLines={1}>{lesson.title} – Lecture Notes & Handout</Text>
                  <Text style={styles.matSize}>1.5 MB • PDF DOCUMENT</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={styles.matDownloadBtn}
                    onPress={() => downloadPdfFile('lecture-notes.pdf', `${lesson.title}_Lecture_Notes.pdf`)}
                  >
                    <Text style={styles.matDownloadText}>⬇ Download Notes</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              (lesson.materials || []).map(mat => (
                <View key={mat.id} style={styles.matRow}>
                  <Text style={styles.matIcon}>📎</Text>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.matTitle} numberOfLines={1}>{mat.title}</Text>
                    <Text style={styles.matSize}>{(mat.file_size_bytes ? mat.file_size_bytes / 1024 : 1450).toFixed(0)} KB • {(mat.file_type || 'PDF').toUpperCase()}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={styles.matViewBtn}
                      onPress={() => setViewingPdfModal(mat)}
                    >
                      <Text style={styles.matViewText}>👁️ View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.matDownloadBtn}
                      onPress={() => downloadPdfFile(mat.file_url || mat.id, `${mat.title}.pdf`)}
                    >
                      <Text style={styles.matDownloadText}>⬇ Download Material</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            {/* Personal Bookmarks & Notes */}
            <View style={styles.personalNotesSection}>
              <Text style={styles.sectionHeading}>Personal Bookmarks & Notes</Text>
              <View style={styles.noteInputRow}>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Jot down a quick takeaway or bookmark..."
                  placeholderTextColor={colors.textMuted}
                  value={userNote}
                  onChangeText={setUserNote}
                />
                <TouchableOpacity style={styles.addNoteBtn} onPress={handleAddNote}>
                  <Text style={styles.addNoteBtnText}>Save</Text>
                </TouchableOpacity>
              </View>

              {notesList.map(item => (
                <View key={item.id} style={styles.noteItem}>
                  <Text style={styles.noteText}>{item.text}</Text>
                  <Text style={styles.noteTime}>{item.timestamp}</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        </View>
      </ScrollView>

      {/* Instant PDF Document Preview Modal */}
      {viewingPdfModal && (
        <Modal
          visible={Boolean(viewingPdfModal)}
          onClose={() => setViewingPdfModal(null)}
          title={`Document Preview: ${viewingPdfModal.title}`}
          maxWidth={850}
        >
          <View style={styles.pdfModalContainer}>
            <View style={styles.pdfModalActionRow}>
              <Text style={styles.pdfModalSub}>
                {(viewingPdfModal.file_size_bytes ? (viewingPdfModal.file_size_bytes / 1024).toFixed(0) : '1500')} KB • Verified Course Document
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={styles.pdfOpenBtn}
                  onPress={() => viewPdfFile(viewingPdfModal.file_url || viewingPdfModal.id)}
                >
                  <Text style={styles.pdfOpenBtnText}>↗ Open in New Window</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pdfOpenBtn, { backgroundColor: colors.primary }]}
                  onPress={() => downloadPdfFile(viewingPdfModal.file_url || viewingPdfModal.id, `${viewingPdfModal.title}.pdf`)}
                >
                  <Text style={[styles.pdfOpenBtnText, { color: '#FFF' }]}>⬇ Download PDF</Text>
                </TouchableOpacity>
              </View>
            </View>
            {Platform.OS === 'web' ? (
              <iframe
                src={resolveFileUrl(viewingPdfModal.file_url || viewingPdfModal.id)}
                title={viewingPdfModal.title}
                style={{
                  width: '100%',
                  height: 520,
                  border: 'none',
                  borderRadius: 8,
                  backgroundColor: '#1E293B',
                  marginTop: 10
                }}
              />
            ) : (
              <View style={styles.pdfFallbackBox}>
                <Text style={styles.pdfIcon}>📕</Text>
                <Text style={styles.pdfTitle}>{viewingPdfModal.title}</Text>
                <TouchableOpacity
                  style={styles.downloadBtn}
                  onPress={() => downloadPdfFile(viewingPdfModal.file_url || viewingPdfModal.id, `${viewingPdfModal.title}.pdf`)}
                >
                  <Text style={styles.downloadBtnText}>Download PDF Document</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgDark
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 12
  },
  topNav: {
    height: 56,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.bgSurface,
    borderRadius: 6
  },
  backBtnText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: typography.weight.medium
  },
  topTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: typography.weight.bold,
    maxWidth: 500
  },
  topRight: {},
  scrollArea: {
    flex: 1
  },
  scrollContent: {
    padding: 24
  },
  playerContainer: {
    marginBottom: 20
  },
  videoPlaceholder: {
    width: '100%',
    height: 480,
    backgroundColor: '#000',
    borderRadius: 14,
    overflow: 'hidden'
  },
  nativeVideoBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  videoIcon: {
    fontSize: 48,
    color: colors.primaryLight
  },
  videoText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10
  },
  videoUrl: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6
  },
  audioBox: {
    padding: 30,
    alignItems: 'center'
  },
  audioIcon: {
    fontSize: 44
  },
  audioTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10
  },
  audioSub: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4
  },
  textBox: {
    padding: 28
  },
  textHeading: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12
  },
  textBody: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 24
  },
  pdfBox: {
    padding: 30,
    alignItems: 'center'
  },
  pdfIcon: {
    fontSize: 44
  },
  pdfTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10
  },
  downloadBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16
  },
  downloadBtnText: {
    color: '#FFF',
    fontWeight: 'bold'
  },
  progressAlert: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16
  },
  progressAlertText: {
    color: colors.accentEmerald,
    fontWeight: typography.weight.semibold,
    fontSize: 13,
    textAlign: 'center'
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  navStepBtn: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8
  },
  navStepDisabled: {
    opacity: 0.4
  },
  navStepText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: typography.weight.medium
  },
  completeToggleBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10
  },
  completeToggleBtnDone: {
    backgroundColor: colors.accentEmerald
  },
  completeToggleText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: typography.weight.bold
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 20
  },
  overviewCard: {
    flex: 2,
    padding: 20
  },
  materialsCard: {
    flex: 1,
    padding: 20
  },
  sectionHeading: {
    color: colors.textPrimary,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    marginBottom: 12
  },
  descText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  notesBlock: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight
  },
  notesBlockHeading: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: typography.weight.semibold,
    marginBottom: 8
  },
  notesBlockBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18
  },
  emptyMaterials: {
    color: colors.textMuted,
    fontSize: 12
  },
  matRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8
  },
  matIcon: {
    fontSize: 16,
    marginRight: 8
  },
  matTitle: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: typography.weight.medium
  },
  matSize: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2
  },
  matDownloadBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.accentEmerald,
    borderRadius: 6
  },
  matDownloadText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: typography.weight.bold
  },
  personalNotesSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight
  },
  noteInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  noteInput: {
    flex: 1,
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 12
  },
  addNoteBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 8
  },
  addNoteBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold'
  },
  noteItem: {
    backgroundColor: colors.bgSurface,
    padding: 10,
    borderRadius: 8,
    marginBottom: 6
  },
  noteText: {
    color: colors.textPrimary,
    fontSize: 12
  },
  noteTime: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right'
  },
  pdfViewerCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.bgCard
  },
  pdfViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 10
  },
  pdfViewerIcon: {
    fontSize: 28
  },
  pdfViewerTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: typography.weight.bold
  },
  pdfViewerSub: {
    color: colors.textMuted,
    fontSize: 12
  },
  pdfActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  pdfActionBtnText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: typography.weight.medium
  },
  pdfIframeWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  pdfFallbackBox: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  matViewBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    borderRadius: 4
  },
  matViewText: {
    color: colors.accentCyan,
    fontSize: 11,
    fontWeight: typography.weight.medium
  },
  pdfModalContainer: {
    paddingHorizontal: 4,
    paddingBottom: 8
  },
  pdfModalActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  pdfModalSub: {
    color: colors.textSecondary,
    fontSize: 13
  },
  pdfOpenBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 6
  },
  pdfOpenBtnText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: typography.weight.semibold
  }
});
