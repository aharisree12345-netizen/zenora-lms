import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { colors, typography } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Modal } from '../components/Modal';

export function AnnouncementsScreen() {
  const { user } = useAuth();
  const isFacultyOrAdmin = ['super_admin', 'institution_admin', 'faculty', 'instructor'].includes(user?.role);

  const [announcements, setAnnouncements] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [priorityFilter, setPriorityFilter] = useState('all'); // 'all' | 'important' | 'normal'
  const [deptFilter, setDeptFilter] = useState('all');

  // New circular modal form state
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('normal'); // 'important' | 'normal'
  const [noticeDate, setNoticeDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetDeptId, setTargetDeptId] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit circular modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPriority, setEditPriority] = useState('normal');
  const [editNoticeDate, setEditNoticeDate] = useState('');
  const [editTargetDeptId, setEditTargetDeptId] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    loadData();
  }, [priorityFilter, deptFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const [annRes, deptRes] = await Promise.all([
        api.getAnnouncements({
          priority: priorityFilter !== 'all' ? priorityFilter : undefined,
          department_id: deptFilter !== 'all' ? deptFilter : undefined
        }),
        api.getDepartments().catch(() => ({ ok: false }))
      ]);

      if (annRes.ok && annRes.data?.success) {
        setAnnouncements(annRes.data.data || []);
      }
      if (deptRes.ok && deptRes.data?.success) {
        setDepartments(deptRes.data.data || []);
      }
    } catch (e) {
      console.error('Error loading notices:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) {
      return alert('Notice Title and Content are required.');
    }
    setSaving(true);
    try {
      const res = await api.createAnnouncement({
        title: title.trim(),
        content: content.trim(),
        priority, // 'important' or 'normal'
        date: noticeDate || new Date().toISOString().split('T')[0],
        department_id: targetDeptId || null
      });

      if (res.ok && res.data?.success) {
        setShowModal(false);
        setTitle('');
        setContent('');
        setPriority('normal');
        setNoticeDate(new Date().toISOString().split('T')[0]);
        setTargetDeptId('');
        loadData();
      } else {
        alert(res.data?.message || 'Failed to post academic circular.');
      }
    } catch (e) {
      alert('Error posting circular: ' + (e.message || 'Network error'));
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setEditTitle(item.title || '');
    setEditContent(item.content || '');
    setEditPriority(item.priority === 'important' ? 'important' : 'normal');
    setEditNoticeDate(item.date || (item.created_at ? item.created_at.split('T')[0] : ''));
    setEditTargetDeptId(item.department_id || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      return alert('Notice Title and Content are required.');
    }
    setSavingEdit(true);
    try {
      const res = await api.updateAnnouncement(editingItem.id, {
        title: editTitle.trim(),
        content: editContent.trim(),
        priority: editPriority,
        date: editNoticeDate,
        department_id: editTargetDeptId || null,
        target_department: editTargetDeptId ? (departments.find(d => d.id === editTargetDeptId)?.code || 'ALL') : 'ALL'
      });

      if (res.ok && res.data?.success) {
        setShowEditModal(false);
        setEditingItem(null);
        loadData();
      } else {
        alert(res.data?.message || 'Failed to update academic circular.');
      }
    } catch (e) {
      alert('Error updating circular: ' + (e.message || 'Network error'));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (item) => {
    const confirmed = typeof window !== 'undefined' && window.confirm
      ? window.confirm(`Permanently remove notice: "${item.title}"?`)
      : true;
    if (!confirmed) return;

    try {
      const res = await api.deleteAnnouncement(item.id);
      if (res.ok && res.data?.success) {
        setAnnouncements(prev => prev.filter(a => a.id !== item.id));
      } else {
        alert(res.data?.message || 'Failed to remove academic circular.');
      }
    } catch (e) {
      alert('Error removing notice: ' + (e.message || 'Network error'));
    }
  };

  const filteredAnnouncements = announcements.filter(item => {
    const itemPriority = (item.priority || 'normal').toLowerCase();
    if (priorityFilter === 'important' && itemPriority !== 'important' && itemPriority !== 'urgent' && itemPriority !== 'high') {
      return false;
    }
    if (priorityFilter === 'normal' && (itemPriority === 'important' || itemPriority === 'urgent' || itemPriority === 'high')) {
      return false;
    }
    if (deptFilter !== 'all') {
      if (item.department_id && item.department_id !== deptFilter) return false;
      if (!item.department_id && deptFilter !== 'college_wide') return false;
    }
    return true;
  });

  const importantCount = announcements.filter(a => {
    const p = (a.priority || 'normal').toLowerCase();
    return p === 'important' || p === 'urgent' || p === 'high';
  }).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.pageTitle}>🏛️ Academic Notice Board</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{filteredAnnouncements.length} Active Circulars</Text>
            </View>
            {importantCount > 0 && (
              <View style={styles.importantBadge}>
                <Text style={styles.importantBadgeText}>{importantCount} High Priority</Text>
              </View>
            )}
          </View>
          <Text style={styles.pageSub}>
            Official institutional notices, department circulars, examination schedules, and academic directives
          </Text>
        </View>

        {isFacultyOrAdmin && (
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowModal(true)} activeOpacity={0.85}>
            <Text style={styles.createBtnText}>+ Post New Notice</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Toolbar */}
      <View style={styles.filterToolbar}>
        {/* Priority Filter Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.filterTab, priorityFilter === 'all' && styles.filterTabActive]}
            onPress={() => setPriorityFilter('all')}
          >
            <Text style={[styles.filterTabText, priorityFilter === 'all' && styles.filterTabTextActive]}>
              All Notices ({announcements.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, priorityFilter === 'important' && styles.filterTabImportantActive]}
            onPress={() => setPriorityFilter('important')}
          >
            <Text style={[styles.filterTabText, priorityFilter === 'important' && styles.filterTabTextImportantActive]}>
              High Priority ({importantCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, priorityFilter === 'normal' && styles.filterTabActive]}
            onPress={() => setPriorityFilter('normal')}
          >
            <Text style={[styles.filterTabText, priorityFilter === 'normal' && styles.filterTabTextActive]}>
              Normal ({announcements.length - importantCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Department Filter Dropdown */}
        <View style={styles.deptFilterBox}>
          <Text style={styles.filterLabel}>Department:</Text>
          <select
            style={webSelectCompact}
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="all">All Departments / College-Wide</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>
        </View>
      </View>

      {/* Announcements List */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : filteredAnnouncements.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 36, marginBottom: 12 }}>📢</Text>
          <Text style={styles.emptyTitle}>No notices found</Text>
          <Text style={styles.emptySub}>There are no academic announcements matching the current filters.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filteredAnnouncements.map(item => {
            const isImportant = ['important', 'urgent', 'high'].includes((item.priority || '').toLowerCase());
            const deptObj = departments.find(d => d.id === item.department_id);
            const deptLabel = deptObj ? `${deptObj.name} (${deptObj.code})` : (item.department_name || '🏛️ College-Wide');
            const displayDate = item.date || (item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Today');

            return (
              <View
                key={item.id}
                style={[
                  styles.card,
                  isImportant && styles.cardImportant
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.tagGroup}>
                    {isImportant ? (
                      <View style={styles.pillImportant}>
                        <Text style={styles.pillImportantText}>HIGH PRIORITY CIRCULAR</Text>
                      </View>
                    ) : (
                      <View style={styles.pillNormal}>
                        <Text style={styles.pillNormalText}>OFFICIAL NOTICE</Text>
                      </View>
                    )}

                    <View style={styles.deptBadge}>
                      <Text style={styles.deptBadgeText}>{deptLabel}</Text>
                    </View>

                    <View style={styles.dateBadge}>
                      <Text style={styles.dateBadgeText}>📅 {displayDate}</Text>
                    </View>
                  </View>

                  <Text style={styles.authorText}>
                    Posted by: <Text style={{ color: colors.textPrimary, fontWeight: typography.weight.bold }}>{item.author_name || 'Academic Office'}</Text>
                    {item.author_designation ? ` (${item.author_designation})` : ''}
                  </Text>
                </View>

                <Text style={styles.titleText}>{item.title}</Text>
                <Text style={styles.contentText}>{item.content}</Text>

                {isFacultyOrAdmin && (
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={styles.editCardBtn}
                      onPress={() => handleOpenEdit(item)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.editCardBtnText}>✏️ Edit Notice</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteCardBtn}
                      onPress={() => handleDelete(item)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.deleteCardBtnText}>🗑️ Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* CREATE CIRCULAR MODAL (Faculty & Admin only) */}
      <Modal visible={showModal} onClose={() => setShowModal(false)} title="Post Official Academic Circular">
        <View style={styles.modalBody}>
          <View style={styles.field}>
            <Text style={styles.label}>Notice Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. End Semester Theory Examination Timetable & Hall Allocations"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Priority Tag *</Text>
              <select
                style={webSelectStyle}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="normal">Normal Notice</option>
                <option value="important">High Priority Notice</option>
              </select>
            </View>

            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Notice Date (YYYY-MM-DD) *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                value={noticeDate}
                onChangeText={setNoticeDate}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Target Department</Text>
            <select
              style={webSelectStyle}
              value={targetDeptId}
              onChange={(e) => setTargetDeptId(e.target.value)}
            >
              <option value="">🏛️ College-Wide (All Departments & Batches)</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Circular / Announcement Details *</Text>
            <TextInput
              style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
              multiline
              numberOfLines={6}
              placeholder="Provide complete guidelines, deadlines, room numbers, and required documentation..."
              placeholderTextColor={colors.textMuted}
              value={content}
              onChangeText={setContent}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleCreate}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveBtnText}>✓ Publish Notice to Board</Text>
            )}
          </TouchableOpacity>
        </View>
      </Modal>

      {/* EDIT CIRCULAR MODAL (Faculty & Admin only) */}
      <Modal visible={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Academic Notice">
        <View style={styles.modalBody}>
          <View style={styles.field}>
            <Text style={styles.label}>Notice Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. End Semester Theory Examination Timetable"
              placeholderTextColor={colors.textMuted}
              value={editTitle}
              onChangeText={setEditTitle}
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Priority Tag *</Text>
              <select
                style={webSelectStyle}
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value)}
              >
                <option value="normal">Normal Notice</option>
                <option value="important">High Priority Notice</option>
              </select>
            </View>

            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Target Department</Text>
              <select
                style={webSelectStyle}
                value={editTargetDeptId}
                onChange={(e) => setEditTargetDeptId(e.target.value)}
              >
                <option value="">All Departments (College-Wide)</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Notice Date</Text>
            <TextInput
              style={styles.input}
              value={editNoticeDate}
              onChangeText={setEditNoticeDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Notice Content & Directives *</Text>
            <TextInput
              style={[styles.input, { height: 120, textAlignVertical: 'top', paddingTop: 10 }]}
              multiline
              numberOfLines={6}
              placeholder="Provide complete guidelines, deadlines, room numbers..."
              placeholderTextColor={colors.textMuted}
              value={editContent}
              onChangeText={setEditContent}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, savingEdit && { opacity: 0.7 }]}
            onPress={handleSaveEdit}
            disabled={savingEdit}
            activeOpacity={0.85}
          >
            {savingEdit ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveBtnText}>✓ Save & Update Notice</Text>
            )}
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const webSelectStyle = {
  backgroundColor: colors.bgDark,
  color: colors.textPrimary,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: '8px',
  padding: '10px 12px',
  fontSize: '13px',
  outline: 'none',
  width: '100%'
};

const webSelectCompact = {
  backgroundColor: colors.bgCard,
  color: colors.textPrimary,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: '6px',
  padding: '6px 10px',
  fontSize: '12px',
  outline: 'none',
  minWidth: '220px'
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark },
  content: { padding: 24, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  center: { paddingVertical: 50, alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  pageTitle: { fontSize: 24, fontWeight: typography.weight.bold, color: colors.textPrimary },
  badge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)'
  },
  badgeText: { color: colors.primaryLight, fontSize: 12, fontWeight: typography.weight.bold },
  importantBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  importantBadgeText: { color: '#EF4444', fontSize: 12, fontWeight: typography.weight.bold },
  pageSub: { color: colors.textSecondary, fontSize: 13, marginTop: 6 },
  createBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
  },
  createBtnText: { color: '#FFF', fontSize: 13, fontWeight: typography.weight.bold },

  filterToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
    padding: 12,
    backgroundColor: colors.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  tabRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: colors.bgDark,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  filterTabImportantActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626'
  },
  filterTabText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: typography.weight.semibold
  },
  filterTabTextActive: {
    color: '#FFF',
    fontWeight: typography.weight.bold
  },
  filterTabTextImportantActive: {
    color: '#FFF',
    fontWeight: typography.weight.bold
  },
  deptFilterBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: typography.weight.medium },

  empty: {
    backgroundColor: colors.bgCard,
    padding: 48,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  emptyTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: typography.weight.bold },
  emptySub: { color: colors.textSecondary, fontSize: 13, marginTop: 4, textAlign: 'center' },

  list: { gap: 16 },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
  },
  cardImportant: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 10
  },
  tagGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  pillImportant: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)'
  },
  pillImportantText: { color: '#EF4444', fontSize: 10, fontWeight: typography.weight.bold },
  pillNormal: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)'
  },
  pillNormalText: { color: '#60A5FA', fontSize: 10, fontWeight: typography.weight.bold },
  deptBadge: {
    backgroundColor: colors.bgDark,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  deptBadgeText: { color: colors.textSecondary, fontSize: 11, fontWeight: typography.weight.medium },
  dateBadge: {
    backgroundColor: colors.bgDark,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  dateBadgeText: { color: colors.textMuted, fontSize: 11 },
  authorText: { color: colors.textMuted, fontSize: 12 },

  titleText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: typography.weight.bold,
    marginBottom: 8,
    lineHeight: 24
  },
  contentText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 22
  },

  modalBody: { gap: 14 },
  field: { marginBottom: 2 },
  formRow: { flexDirection: 'row', gap: 12 },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: typography.weight.semibold, marginBottom: 6 },
  input: {
    height: 42,
    backgroundColor: colors.bgDark,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 12,
    color: colors.textPrimary,
    fontSize: 13
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  },
  saveBtnText: { color: '#FFF', fontWeight: typography.weight.bold, fontSize: 14 },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    justifyContent: 'flex-end'
  },
  editCardBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)'
  },
  editCardBtnText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: typography.weight.semibold
  },
  deleteCardBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  deleteCardBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: typography.weight.semibold
  }
});

