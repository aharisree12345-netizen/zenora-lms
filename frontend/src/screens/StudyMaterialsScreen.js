import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform
} from 'react-native';
import { colors, typography } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api, resolveFileUrl, downloadPdfFile, viewPdfFile, getBackendOrigin } from '../api/client';
import { Modal } from '../components/Modal';

export function StudyMaterialsScreen() {
  const { user } = useAuth();
  const isFacultyOrAdmin = ['super_admin', 'institution_admin', 'faculty', 'instructor'].includes(user?.role);

  const [materials, setMaterials] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Preview Modal
  const [viewingPdfModal, setViewingPdfModal] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  // Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [category, setCategory] = useState('lecture_notes');
  const [fileUrl, setFileUrl] = useState('');
  const [description, setDescription] = useState('');
  const [fileSize, setFileSize] = useState('1.5 MB');
  const [uploading, setUploading] = useState(false);

  // Delete Modal State
  const [materialToDelete, setMaterialToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadMaterials();
  }, [selectedSubject, selectedCategory]);

  async function loadMaterials() {
    setLoading(true);
    try {
      const params = {};
      if (selectedSubject) params.subject_id = selectedSubject;
      if (selectedCategory && selectedCategory !== 'all') params.category = selectedCategory;

      const [mRes, sRes, bRes] = await Promise.all([
        api.getMaterials(params),
        api.getSubjects(),
        api.getBatches()
      ]);

      if (mRes.ok && mRes.data.success) setMaterials(mRes.data.data || []);
      if (sRes.ok && sRes.data.success) {
        setSubjects(sRes.data.data || []);
        if (!subjectId && sRes.data.data.length > 0) setSubjectId(sRes.data.data[0].id);
      }
      if (bRes.ok && bRes.data.success) setBatches(bRes.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleUpload = async () => {
    if (!title || !subjectId || !fileUrl) {
      return alert('Title, Subject, and File URL are required.');
    }
    setUploading(true);
    try {
      const res = await api.uploadMaterial({
        title,
        subject_id: subjectId,
        category,
        file_url: fileUrl,
        description,
        file_size: fileSize,
        file_type: 'pdf'
      });
      if (res.ok && res.data.success) {
        setShowUploadModal(false);
        setTitle('');
        setFileUrl('');
        setDescription('');
        loadMaterials();
      } else {
        alert(res.data?.message || 'Failed to upload material.');
      }
    } catch (e) {
      alert('Error uploading material.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (mat) => {
    if (!mat) return;
    setDownloadingId(mat.id);
    try {
      const url = resolveFileUrl(mat.file_url || mat.id);
      const filename = `${(mat.title || 'academic_material').replace(/[/\\?%*:|"<>]/g, '_')}.pdf`;
      const response = await fetch(url);
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
      console.warn('[handleDownload Notice, using window.open fallback]:', err);
      if (typeof window !== 'undefined') {
        window.open(resolveFileUrl(mat.file_url || mat.id), '_blank', 'noopener,noreferrer');
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const confirmDeleteMaterial = async () => {
    if (!materialToDelete) return;
    setDeleting(true);
    try {
      const res = await api.deleteMaterial(materialToDelete.id);
      if (res.ok && res.data?.success) {
        // Immediate UI refresh without full page reload
        setMaterials(prev => prev.filter(m => m.id !== materialToDelete.id));
        setMaterialToDelete(null);
      } else {
        alert(res.data?.message || 'Failed to delete academic material.');
      }
    } catch (err) {
      console.error('[Delete Material Error]', err);
      alert('Error occurred while deleting material.');
    } finally {
      setDeleting(false);
    }
  };

  const categoryLabels = {
    syllabus: 'University Syllabus',
    lecture_notes: 'Lecture Notes',
    lab_manual: 'Lab Manual',
    reference_book: 'Reference Book',
    question_bank: 'Question Bank'
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.pageTitle}>Study Materials & Syllabus</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>{materials.length} Documents</Text></View>
          </View>
          <Text style={styles.pageSub}>Approved regulation syllabus, lecture slides, reference PDFs, and laboratory manuals</Text>
        </View>

        {isFacultyOrAdmin && (
          <TouchableOpacity style={styles.uploadBtn} onPress={() => setShowUploadModal(true)} activeOpacity={0.8}>
            <Text style={styles.uploadBtnText}>+ Upload Academic Document</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filterBar}>
        <View style={styles.selectWrap}>
          <Text style={styles.filterLabel}>Subject:</Text>
          <select style={webSelectStyle} value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
            <option value="">All Curriculum Subjects</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.code} – {s.name}</option>)}
          </select>
        </View>

        <View style={styles.selectWrap}>
          <Text style={styles.filterLabel}>Category:</Text>
          <select style={webSelectStyle} value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="all">All Categories</option>
            <option value="syllabus">University Syllabus</option>
            <option value="lecture_notes">Lecture Notes</option>
            <option value="lab_manual">Lab Manuals</option>
            <option value="reference_book">Reference Books</option>
            <option value="question_bank">Question Banks</option>
          </select>
        </View>
      </View>

      {/* Materials Grid */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : materials.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 32, marginBottom: 8 }}>📚</Text>
          <Text style={styles.emptyTitle}>No study materials found</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>Try clearing subject or category filters.</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {materials.map(mat => (
            <View key={mat.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.iconWrap}>
                  <Text style={{ fontSize: 24 }}>
                    {mat.category === 'syllabus' ? '📜' : mat.category === 'lab_manual' ? '🧪' : '📑'}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.catPill}>
                    <Text style={styles.catPillText}>{categoryLabels[mat.category] || (mat.category || '').toUpperCase()}</Text>
                  </View>
                  <Text style={styles.matTitle}>{mat.title}</Text>
                  <Text style={styles.matSubject}>{mat.subject_code} • {mat.subject_name}</Text>
                </View>
              </View>

              <Text style={styles.matDesc} numberOfLines={2}>{mat.description}</Text>

              <View style={styles.cardBottom}>
                <Text style={styles.matMeta}>
                  {(mat.file_type || 'pdf').toUpperCase()} • {mat.file_size || '1.5 MB'} • By {mat.uploaded_by_name}
                </Text>
                
                <View style={styles.actionBtnsRow}>
                  <TouchableOpacity
                    style={styles.viewBtn}
                    onPress={() => setViewingPdfModal(mat)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.viewBtnText}>👁️ View PDF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.downloadBtn}
                    onPress={() => handleDownload(mat)}
                    disabled={downloadingId === mat.id}
                    activeOpacity={0.8}
                  >
                    {downloadingId === mat.id ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.downloadBtnText}>📥 Download</Text>
                    )}
                  </TouchableOpacity>

                  {isFacultyOrAdmin && (
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => setMaterialToDelete(mat)}
                      activeOpacity={0.8}
                      title="Delete this academic document"
                    >
                      <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Interactive PDF Document Preview Modal */}
      {viewingPdfModal && (
        <Modal
          visible={Boolean(viewingPdfModal)}
          onClose={() => setViewingPdfModal(null)}
          title={`Document Preview: ${viewingPdfModal.title}`}
          maxWidth={920}
        >
          <View style={styles.pdfModalContainer}>
            <View style={styles.pdfModalActionRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.pdfModalSub}>
                  {categoryLabels[viewingPdfModal.category] || 'Curriculum Material'} • {viewingPdfModal.subject_code} {viewingPdfModal.subject_name}
                </Text>
                <Text style={styles.pdfModalSub2}>
                  {(viewingPdfModal.file_type || 'PDF').toUpperCase()} Document • {viewingPdfModal.file_size || '1.5 MB'} • Verified Academic Resource
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                {Platform.OS === 'web' ? (
                  <>
                    <a
                      href={resolveFileUrl(viewingPdfModal.file_url || viewingPdfModal.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '8px 14px',
                        backgroundColor: '#1E293B',
                        color: '#F8FAFC',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: '600',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}
                    >
                      ↗ Open in New Tab
                    </a>
                    <a
                      href={resolveFileUrl(viewingPdfModal.file_url || viewingPdfModal.id)}
                      download={`${(viewingPdfModal.title || 'academic_material').replace(/[/\\?%*:|"<>]/g, '_')}.pdf`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '8px 14px',
                        backgroundColor: colors.primary || '#6366F1',
                        color: '#FFFFFF',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}
                    >
                      📥 Direct Download
                    </a>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.modalActionSecondaryBtn}
                      onPress={() => viewPdfFile(viewingPdfModal.file_url || viewingPdfModal.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.modalActionSecondaryText}>↗ Open in New Tab</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modalActionPrimaryBtn}
                      onPress={() => handleDownload(viewingPdfModal)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.modalActionPrimaryText}>📥 Direct Download</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            {Platform.OS === 'web' ? (
              <View style={styles.iframeBox}>
                <iframe
                  src={resolveFileUrl(viewingPdfModal.file_url || viewingPdfModal.id)}
                  title="Document Preview"
                  style={{
                    width: '100%',
                    height: '80vh',
                    border: 'none',
                    borderRadius: '8px'
                  }}
                />
                <View style={styles.previewFallbackRow}>
                  <Text style={styles.previewFallbackText}>
                    If preview doesn't load in your browser,{' '}
                    <Text
                      style={styles.previewFallbackLink}
                      onPress={() => {
                        const targetUrl = resolveFileUrl(viewingPdfModal.file_url || viewingPdfModal.id);
                        if (typeof window !== 'undefined') window.open(targetUrl, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      click here to open in new window.
                    </Text>
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.fallbackBox}>
                <Text style={{ fontSize: 44, marginBottom: 12 }}>📕</Text>
                <Text style={styles.fallbackTitle}>{viewingPdfModal.title}</Text>
                <TouchableOpacity
                  style={styles.modalActionPrimaryBtn}
                  onPress={() => handleDownload(viewingPdfModal)}
                >
                  <Text style={styles.modalActionPrimaryText}>Download PDF Document</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Modal>
      )}

      {/* UPLOAD MODAL */}
      <Modal visible={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload Study Material / Notes">
        <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
          <View style={styles.field}>
            <Text style={styles.label}>Document Title *</Text>
            <TextInput style={styles.input} placeholder="e.g. Unit 3 B+ Tree Indexing & Relational Query Plan" placeholderTextColor={colors.textMuted} value={title} onChangeText={setTitle} />
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Subject *</Text>
              <select style={webSelectStyle} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.code} – {s.name}</option>)}
              </select>
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Category</Text>
              <select style={webSelectStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="lecture_notes">Lecture Notes</option>
                <option value="syllabus">Syllabus Copy</option>
                <option value="lab_manual">Lab Manual</option>
                <option value="reference_book">Reference Book</option>
                <option value="question_bank">Question Bank</option>
              </select>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Quick Sample PDF Preset (Or Enter Custom URL below):</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {[
                { name: 'CS401_Syllabus.pdf', label: 'CS401 Syllabus PDF' },
                { name: 'DBMS_Module1_Notes.pdf', label: 'DBMS Module 1 Notes' },
                { name: 'sample-syllabus.pdf', label: 'Sample Syllabus PDF' },
                { name: 'lecture-notes.pdf', label: 'Lecture Notes PDF' },
                { name: 'CS8481_Lab_Manual.pdf', label: 'Lab Manual PDF' },
                { name: 'CS8492_Syllabus.pdf', label: 'CS8492 DBMS Syllabus' }
              ].map(preset => (
                <TouchableOpacity
                  key={preset.name}
                  style={styles.presetChip}
                  onPress={() => {
                    setFileUrl(`${getBackendOrigin()}/uploads/materials/${preset.name}`);
                    if (!title) setTitle(preset.label);
                  }}
                >
                  <Text style={styles.presetChipText}>{preset.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>File URL (PDF or Drive link) *</Text>
            <TextInput
              style={styles.input}
              placeholder={`${getBackendOrigin()}/uploads/materials/sample-syllabus.pdf`}
              placeholderTextColor={colors.textMuted}
              value={fileUrl}
              onChangeText={setFileUrl}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Brief Description</Text>
            <TextInput
              style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
              multiline
              numberOfLines={3}
              placeholder="Key concepts covered, unit number, examples..."
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleUpload} disabled={uploading}>
            {uploading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>✓ Upload & Share with Students</Text>}
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {/* Delete Confirmation Modal for Faculty & Admin */}
      <Modal
        visible={Boolean(materialToDelete)}
        onClose={() => setMaterialToDelete(null)}
        title="Confirm Document Deletion"
        maxWidth={500}
      >
        {materialToDelete && (
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteWarningBox}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>⚠️</Text>
              <Text style={styles.deleteWarningTitle}>Permanent File Deletion</Text>
              <Text style={styles.deleteWarningSub}>
                Are you sure you want to delete this academic document? This will remove the database record and delete the physical file from server storage.
              </Text>
            </View>

            <View style={styles.deleteDetailsCard}>
              <Text style={styles.deleteItemTitle}>{materialToDelete.title}</Text>
              <Text style={styles.deleteItemMeta}>
                Subject: {materialToDelete.subject_name || materialToDelete.subject_code} • {categoryLabels[materialToDelete.category] || materialToDelete.category}
              </Text>
              <Text style={styles.deleteItemMeta}>
                File: {(materialToDelete.file_type || 'PDF').toUpperCase()} • {materialToDelete.file_size || '1.5 MB'}
              </Text>
            </View>

            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={styles.cancelDeleteBtn}
                onPress={() => setMaterialToDelete(null)}
                disabled={deleting}
              >
                <Text style={styles.cancelDeleteBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmDeleteBtn, deleting && { opacity: 0.6 }]}
                onPress={confirmDeleteMaterial}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.confirmDeleteBtnText}>Yes, Delete Document</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
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
  container: { flex: 1, backgroundColor: colors.bgDark },
  content: { padding: 24 },
  center: { paddingVertical: 40, alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  pageTitle: { fontSize: 22, fontWeight: typography.weight.bold, color: colors.textPrimary },
  badge: { backgroundColor: 'rgba(99, 102, 241, 0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 10 },
  badgeText: { color: colors.primaryLight, fontSize: 11, fontWeight: typography.weight.bold },
  pageSub: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  uploadBtn: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  uploadBtnText: { color: '#FFF', fontSize: 12, fontWeight: typography.weight.bold },
  filterBar: { flexDirection: 'row', gap: 16, backgroundColor: colors.bgCard, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, marginBottom: 20, flexWrap: 'wrap' },
  selectWrap: { flex: 1, minWidth: 200 },
  filterLabel: { color: colors.textMuted, fontSize: 11, fontWeight: typography.weight.semibold, marginBottom: 6 },
  empty: { backgroundColor: colors.bgCard, padding: 40, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.borderLight },
  emptyTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: typography.weight.bold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { flex: 1, minWidth: 320, backgroundColor: colors.bgCard, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: colors.borderLight },
  cardTop: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  iconWrap: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.bgDark, alignItems: 'center', justifyContent: 'center' },
  catPill: { backgroundColor: 'rgba(99, 102, 241, 0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 4 },
  catPillText: { color: colors.primaryLight, fontSize: 9, fontWeight: typography.weight.bold },
  matTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: typography.weight.bold },
  matSubject: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  matDesc: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 12, flexWrap: 'wrap', gap: 8 },
  matMeta: { color: colors.textMuted, fontSize: 10 },
  actionBtnsRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  viewBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)'
  },
  viewBtnText: { color: colors.accentCyan, fontSize: 11, fontWeight: typography.weight.semibold },
  downloadBtn: { backgroundColor: colors.primary, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 6 },
  downloadBtnText: { color: '#FFF', fontSize: 11, fontWeight: typography.weight.semibold },
  presetChip: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)'
  },
  presetChipText: { color: colors.primaryLight, fontSize: 10, fontWeight: typography.weight.medium },
  pdfModalContainer: { paddingHorizontal: 4, paddingBottom: 8 },
  pdfModalActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 12
  },
  pdfModalSub: { color: colors.textPrimary, fontSize: 13, fontWeight: typography.weight.semibold },
  pdfModalSub2: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  modalActionSecondaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 6
  },
  modalActionSecondaryText: { color: colors.primaryLight, fontSize: 12, fontWeight: typography.weight.medium },
  modalActionPrimaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 6
  },
  modalActionPrimaryText: { color: '#FFF', fontSize: 12, fontWeight: typography.weight.bold },
  iframeBox: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  fallbackBox: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  fallbackTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: typography.weight.bold, marginBottom: 14 },
  field: { marginBottom: 12 },
  label: { color: colors.textSecondary, fontSize: 11, fontWeight: typography.weight.semibold, marginBottom: 6 },
  input: { height: 40, backgroundColor: colors.bgDark, borderRadius: 8, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 12, color: colors.textPrimary, fontSize: 12 },
  saveBtn: { backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#FFF', fontWeight: typography.weight.bold, fontSize: 13 },
  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  deleteBtnText: { color: colors.danger, fontSize: 12, fontWeight: typography.weight.semibold },
  deleteModalContent: { padding: 4 },
  deleteWarningBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    textAlign: 'center'
  },
  deleteWarningTitle: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: typography.weight.bold,
    marginBottom: 6
  },
  deleteWarningSub: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18
  },
  deleteDetailsCard: {
    backgroundColor: colors.bgDark,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 14,
    marginBottom: 20
  },
  deleteItemTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: typography.weight.bold,
    marginBottom: 4
  },
  deleteItemMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2
  },
  deleteModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    alignItems: 'center'
  },
  cancelDeleteBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8
  },
  cancelDeleteBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: typography.weight.medium
  },
  confirmDeleteBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: colors.danger,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  confirmDeleteBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: typography.weight.bold
  },
  previewFallbackRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center'
  },
  previewFallbackText: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center'
  },
  previewFallbackLink: {
    color: colors.primaryLight,
    textDecorationLine: 'underline',
    fontWeight: typography.weight.bold
  }
});

