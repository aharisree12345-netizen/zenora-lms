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
import { api } from '../api/client';
import { Modal } from '../components/Modal';

export function FacultyDirectoryScreen({ onNavigate }) {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);

  // Add Faculty Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formDept, setFormDept] = useState('CS');
  const [formDesignation, setFormDesignation] = useState('Assistant Professor');
  const [formQualification, setFormQualification] = useState('M.Tech, Ph.D.');
  const [formSpecialization, setFormSpecialization] = useState('Computer Science');
  const [formSubjects, setFormSubjects] = useState('');
  const [formPhone, setFormPhone] = useState('+1 555-010-0000');
  const [savingFaculty, setSavingFaculty] = useState(false);
  const [formError, setFormError] = useState('');

  // Edit Faculty Form State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editDept, setEditDept] = useState('CS');
  const [editDesignation, setEditDesignation] = useState('');
  const [editQualification, setEditQualification] = useState('');
  const [editSpecialization, setEditSpecialization] = useState('');
  const [editSubjects, setEditSubjects] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Toast / Feedback Notice
  const [feedbackNotice, setFeedbackNotice] = useState(null);

  useEffect(() => {
    loadFacultyData();
  }, [selectedDept, selectedStatus]);

  async function loadFacultyData() {
    setLoading(true);
    try {
      const params = {};
      if (selectedDept && selectedDept !== 'all') params.department = selectedDept;
      if (selectedStatus && selectedStatus !== 'all') params.status = selectedStatus;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.getAdminFaculty(params);
      if (res.ok && res.data.success) {
        setFaculty(res.data.data || []);
      }
    } catch (err) {
      console.error('[Faculty Directory Error]', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = () => {
    loadFacultyData();
  };

  const handleOpenEdit = (member) => {
    setEditingFaculty(member);
    setEditName(member.name || '');
    setEditEmail(member.email || '');
    setEditEmployeeId(member.employee_id || '');
    setEditDept(member.department || 'CS');
    setEditDesignation(member.designation || 'Assistant Professor');
    setEditQualification(member.qualification || 'M.Tech, Ph.D.');
    setEditSpecialization(member.specialization || '');
    setEditPhone(member.phone || '');
    setEditStatus(member.status || 'active');

    // Format subjects as comma-separated codes or strings
    const subStr = (member.designated_subjects || [])
      .map(s => typeof s === 'string' ? s : `${s.code} - ${s.name}`)
      .join(', ');
    setEditSubjects(subStr);

    setEditError('');
    setShowEditModal(true);
  };

  const handleToggleStatus = async (member) => {
    const nextStatus = member.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await api.toggleFacultyStatus(member.id, nextStatus);
      if (res.ok && res.data.success) {
        showToast(`Faculty member ${member.name} marked as ${nextStatus}.`);
        loadFacultyData();
      } else {
        alert(res.data?.message || 'Failed to update faculty status.');
      }
    } catch (e) {
      alert('Error updating status.');
    }
  };

  const handleSaveNewFaculty = async () => {
    if (!formName.trim() || !formEmail.trim()) {
      setFormError('Full Name and Email address are required.');
      return;
    }
    setSavingFaculty(true);
    setFormError('');

    try {
      // Parse designated subjects
      const subjectsArray = formSubjects
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => {
          const parts = s.split('-');
          return parts.length > 1
            ? { code: parts[0].trim(), name: parts[1].trim() }
            : { code: s, name: s };
        });

      const payload = {
        name: formName.trim(),
        email: formEmail.trim(),
        employee_id: formEmployeeId.trim() || undefined,
        department: formDept,
        designation: formDesignation.trim(),
        qualification: formQualification.trim(),
        specialization: formSpecialization.trim(),
        phone: formPhone.trim(),
        designated_subjects: subjectsArray
      };

      const res = await api.createFacultyMember(payload);
      if (res.ok && res.data.success) {
        setShowAddModal(false);
        // Reset form
        setFormName('');
        setFormEmail('');
        setFormEmployeeId('');
        setFormSubjects('');
        showToast(`Faculty member ${payload.name} successfully registered.`);
        loadFacultyData();
      } else {
        setFormError(res.data?.message || 'Failed to register faculty member.');
      }
    } catch (e) {
      setFormError('Network connection error while registering faculty.');
    } finally {
      setSavingFaculty(false);
    }
  };

  const handleSaveEditFaculty = async () => {
    if (!editName.trim() || !editEmail.trim()) {
      setEditError('Full Name and Email address are required.');
      return;
    }
    setSavingEdit(true);
    setEditError('');

    try {
      const subjectsArray = editSubjects
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => {
          const parts = s.split('-');
          return parts.length > 1
            ? { code: parts[0].trim(), name: parts[1].trim() }
            : { code: s, name: s };
        });

      const payload = {
        name: editName.trim(),
        email: editEmail.trim(),
        employee_id: editEmployeeId.trim(),
        department: editDept,
        designation: editDesignation.trim(),
        qualification: editQualification.trim(),
        specialization: editSpecialization.trim(),
        phone: editPhone.trim(),
        status: editStatus,
        designated_subjects: subjectsArray
      };

      const res = await api.updateFacultyMember(editingFaculty.id, payload);
      if (res.ok && res.data.success) {
        setShowEditModal(false);
        showToast(`Faculty profile for ${payload.name} updated successfully.`);
        loadFacultyData();
      } else {
        setEditError(res.data?.message || 'Failed to update faculty profile.');
      }
    } catch (e) {
      setEditError('Network error while updating faculty profile.');
    } finally {
      setSavingEdit(false);
    }
  };

  const showToast = (msg) => {
    setFeedbackNotice(msg);
    setTimeout(() => {
      setFeedbackNotice(null);
    }, 4000);
  };

  // Metrics
  const csCount = faculty.filter(f => f.department === 'CS').length;
  const ecCount = faculty.filter(f => f.department === 'EC').length;
  const meCount = faculty.filter(f => f.department === 'ME').length;
  const bsCount = faculty.filter(f => f.department === 'Common').length;
  const activeCount = faculty.filter(f => f.status === 'active').length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Toast Feedback */}
      {feedbackNotice && (
        <View style={styles.toastNotice}>
          <Text style={styles.toastNoticeText}>✓ {feedbackNotice}</Text>
        </View>
      )}

      {/* Top Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerLeft}>
          <View style={styles.titleBadgeRow}>
            <Text style={styles.headerTitle}>Faculty Database & Directory</Text>
            <View style={styles.activePill}>
              <View style={styles.activePillDot} />
              <Text style={styles.activePillText}>{activeCount} Active Faculty</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            Institutional Faculty Repository • Teaching Allocations • Department Workloads & Subject Assignments
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            setFormError('');
            setShowAddModal(true);
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.addBtnText}>+ Add Faculty Member</Text>
        </TouchableOpacity>
      </View>

      {/* Department & Cohort Summary Chips */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total Faculty</Text>
          <Text style={styles.kpiValue}>{faculty.length || 11}</Text>
          <Text style={styles.kpiSub}>100% Accredited Staff</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Computer Science (CS)</Text>
          <View style={styles.kpiValueRow}>
            <Text style={[styles.kpiValue, { color: colors.primaryLight }]}>{csCount || 3}</Text>
            <Text style={styles.kpiUnit}>Professors</Text>
          </View>
          <Text style={styles.kpiSub}>Data & Cloud Dept</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Electronics & Comm (EC)</Text>
          <View style={styles.kpiValueRow}>
            <Text style={[styles.kpiValue, { color: colors.accentEmerald }]}>{ecCount || 3}</Text>
            <Text style={styles.kpiUnit}>Professors</Text>
          </View>
          <Text style={styles.kpiSub}>VLSI & Wireless Dept</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Mechanical Engg (ME)</Text>
          <View style={styles.kpiValueRow}>
            <Text style={[styles.kpiValue, { color: colors.accentAmber }]}>{meCount || 3}</Text>
            <Text style={styles.kpiUnit}>Professors</Text>
          </View>
          <Text style={styles.kpiSub}>Robotics & Fluid Dept</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Common / Basic Sciences</Text>
          <View style={styles.kpiValueRow}>
            <Text style={[styles.kpiValue, { color: '#C084FC' }]}>{bsCount || 2}</Text>
            <Text style={styles.kpiUnit}>Professors</Text>
          </View>
          <Text style={styles.kpiSub}>Maths & Humanities</Text>
        </View>
      </View>

      {/* Filter and Search Bar */}
      <View style={styles.filterBar}>
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search faculty by name, email, employee ID, or subject..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => { setSearchQuery(''); loadFacultyData(); }}>
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.searchIcon}>🔍</Text>
          )}
        </View>

        {/* Department Filter Tabs */}
        <View style={styles.deptTabsRow}>
          {[
            { id: 'all', label: 'All Depts' },
            { id: 'CS', label: 'CS Dept' },
            { id: 'EC', label: 'EC Dept' },
            { id: 'ME', label: 'ME Dept' },
            { id: 'Common', label: 'Common (BS)' }
          ].map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.deptTabBtn, selectedDept === tab.id && styles.deptTabBtnActive]}
              onPress={() => setSelectedDept(tab.id)}
            >
              <Text style={[styles.deptTabText, selectedDept === tab.id && styles.deptTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Status Filter */}
        <View style={styles.statusSelectWrap}>
          <select
            style={styles.nativeSelect}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive</option>
          </select>
        </View>
      </View>

      {/* Main Faculty Listing */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading verified faculty records...</Text>
        </View>
      ) : faculty.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>👨‍🏫</Text>
          <Text style={styles.emptyTitle}>No faculty members found</Text>
          <Text style={styles.emptySub}>No teaching staff matches the current filter criteria.</Text>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => {
              setSelectedDept('all');
              setSelectedStatus('all');
              setSearchQuery('');
            }}
          >
            <Text style={styles.resetBtnText}>Clear All Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.facultyGrid}>
          {faculty.map((member) => {
            const isCs = member.department === 'CS';
            const isEc = member.department === 'EC';
            const isMe = member.department === 'ME';
            const isCommon = member.department === 'Common';

            let deptColor = colors.primaryLight;
            let deptBg = 'rgba(99, 102, 241, 0.12)';
            if (isEc) {
              deptColor = colors.accentEmerald;
              deptBg = 'rgba(16, 185, 129, 0.12)';
            } else if (isMe) {
              deptColor = colors.accentAmber;
              deptBg = 'rgba(245, 158, 11, 0.12)';
            } else if (isCommon) {
              deptColor = '#C084FC';
              deptBg = 'rgba(192, 132, 252, 0.12)';
            }

            const isActive = member.status === 'active';

            return (
              <View key={member.id} style={styles.facultyCard}>
                {/* Card Top Row: Employee ID & Status */}
                <View style={styles.cardTopRow}>
                  <View style={styles.empIdRow}>
                    <View style={styles.empIdBadge}>
                      <Text style={styles.empIdText}>{member.employee_id || 'FAC-CS-001'}</Text>
                    </View>
                    <View style={[styles.deptPill, { backgroundColor: deptBg, borderColor: deptColor }]}>
                      <Text style={[styles.deptPillText, { color: deptColor }]}>
                        {member.department}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.statusPill, isActive ? styles.statusActive : styles.statusInactive]}>
                    <View style={[styles.statusDot, isActive ? styles.statusDotActive : styles.statusDotInactive]} />
                    <Text style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextInactive]}>
                      {isActive ? 'ACTIVE' : 'INACTIVE'}
                    </Text>
                  </View>
                </View>

                {/* Faculty Main Identity */}
                <View style={styles.facultyProfileHeader}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitial}>
                      {(member.name || 'F').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.facultyName} numberOfLines={1}>{member.name}</Text>
                    <Text style={styles.facultyDesignation} numberOfLines={1}>{member.designation}</Text>
                    <Text style={styles.facultyEmail} numberOfLines={1}>{member.email}</Text>
                  </View>
                </View>

                {/* Academic Qualifications & Department Info */}
                <View style={styles.metaBox}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>🎓 Qualification:</Text>
                    <Text style={styles.metaValue} numberOfLines={1}>{member.qualification || 'M.Tech, Ph.D.'}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>🔬 Specialization:</Text>
                    <Text style={styles.metaValue} numberOfLines={1}>{member.specialization || 'System Engineering'}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>🏛️ Department:</Text>
                    <Text style={styles.metaValue} numberOfLines={1}>{member.department_name}</Text>
                  </View>
                </View>

                {/* Designated Subjects Chips */}
                <View style={styles.subjectsContainer}>
                  <Text style={styles.subjectsSectionLabel}>DESIGNATED SUBJECTS & WORKLOAD</Text>
                  <View style={styles.subjectsChipsWrap}>
                    {member.designated_subjects && member.designated_subjects.length > 0 ? (
                      member.designated_subjects.slice(0, 4).map((sub, sIdx) => {
                        const code = typeof sub === 'string' ? sub : sub.code;
                        const name = typeof sub === 'string' ? '' : sub.name;
                        return (
                          <View key={sIdx} style={styles.subjectChip}>
                            <Text style={styles.subjectChipCode}>{code}</Text>
                            {name ? <Text style={styles.subjectChipName} numberOfLines={1}>• {name}</Text> : null}
                          </View>
                        );
                      })
                    ) : (
                      <Text style={styles.noSubjectsText}>No specific subjects allocated</Text>
                    )}
                    {member.designated_subjects && member.designated_subjects.length > 4 && (
                      <View style={styles.subjectChipMore}>
                        <Text style={styles.subjectChipMoreText}>+{member.designated_subjects.length - 4} more</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.actionBtnSecondary}
                    onPress={() => handleOpenEdit(member)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionBtnSecondaryText}>✏️ Edit & Reassign</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionBtnToggle,
                      isActive ? styles.actionBtnDeactivate : styles.actionBtnActivate
                    ]}
                    onPress={() => handleToggleStatus(member)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.actionBtnToggleText,
                      isActive ? styles.actionBtnDeactivateText : styles.actionBtnActivateText
                    ]}>
                      {isActive ? 'Deactivate' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* MODAL: ADD FACULTY MEMBER */}
      <Modal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="+ Add Faculty Member"
      >
        <ScrollView style={{ maxHeight: 520 }}>
          {formError ? (
            <View style={styles.modalErrorBox}>
              <Text style={styles.modalErrorText}>{formError}</Text>
            </View>
          ) : null}

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Full Name *</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. Dr. Jennifer Lawrence"
              placeholderTextColor={colors.textMuted}
              value={formName}
              onChangeText={setFormName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Institutional Email *</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. jennifer@apex.edu"
              placeholderTextColor={colors.textMuted}
              value={formEmail}
              onChangeText={setFormEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.formLabel}>Employee ID</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. FAC-CS-004"
                placeholderTextColor={colors.textMuted}
                value={formEmployeeId}
                onChangeText={setFormEmployeeId}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Department *</Text>
              <select
                style={styles.modalSelect}
                value={formDept}
                onChange={(e) => setFormDept(e.target.value)}
              >
                <option value="CS">Computer Science (CS)</option>
                <option value="EC">Electronics & Comm (EC)</option>
                <option value="ME">Mechanical Engg (ME)</option>
                <option value="Common">Common / Basic Sciences</option>
              </select>
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.formLabel}>Designation</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Associate Professor"
                placeholderTextColor={colors.textMuted}
                value={formDesignation}
                onChangeText={setFormDesignation}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Qualification</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. M.Tech, Ph.D."
                placeholderTextColor={colors.textMuted}
                value={formQualification}
                onChangeText={setFormQualification}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Specialization</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. Deep Learning & Computer Vision"
              placeholderTextColor={colors.textMuted}
              value={formSpecialization}
              onChangeText={setFormSpecialization}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Designated Subjects (Comma Separated)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. CS401 - Database Systems, CS404 - DBMS Lab"
              placeholderTextColor={colors.textMuted}
              value={formSubjects}
              onChangeText={setFormSubjects}
            />
            <Text style={styles.formHelp}>Format: [Code] - [Subject Name], separated by commas</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Contact Phone</Text>
            <TextInput
              style={styles.formInput}
              placeholder="+1 555-010-0000"
              placeholderTextColor={colors.textMuted}
              value={formPhone}
              onChangeText={setFormPhone}
            />
          </View>

          <View style={styles.modalActionRow}>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, savingFaculty && { opacity: 0.6 }]}
              onPress={handleSaveNewFaculty}
              disabled={savingFaculty}
            >
              {savingFaculty ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Create Faculty Member</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>

      {/* MODAL: EDIT & REASSIGN FACULTY */}
      <Modal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Faculty & Reassign Subjects"
      >
        <ScrollView style={{ maxHeight: 520 }}>
          {editError ? (
            <View style={styles.modalErrorBox}>
              <Text style={styles.modalErrorText}>{editError}</Text>
            </View>
          ) : null}

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Full Name *</Text>
            <TextInput
              style={styles.formInput}
              value={editName}
              onChangeText={setEditName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Institutional Email *</Text>
            <TextInput
              style={styles.formInput}
              value={editEmail}
              onChangeText={setEditEmail}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.formLabel}>Employee ID</Text>
              <TextInput
                style={styles.formInput}
                value={editEmployeeId}
                onChangeText={setEditEmployeeId}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Department (Reassignment) *</Text>
              <select
                style={styles.modalSelect}
                value={editDept}
                onChange={(e) => setEditDept(e.target.value)}
              >
                <option value="CS">Computer Science (CS)</option>
                <option value="EC">Electronics & Comm (EC)</option>
                <option value="ME">Mechanical Engg (ME)</option>
                <option value="Common">Common / Basic Sciences</option>
              </select>
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.formLabel}>Designation</Text>
              <TextInput
                style={styles.formInput}
                value={editDesignation}
                onChangeText={setEditDesignation}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Status</Text>
              <select
                style={styles.modalSelect}
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Qualification</Text>
            <TextInput
              style={styles.formInput}
              value={editQualification}
              onChangeText={setEditQualification}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Specialization</Text>
            <TextInput
              style={styles.formInput}
              value={editSpecialization}
              onChangeText={setEditSpecialization}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Reassign Designated Subjects (Comma Separated)</Text>
            <TextInput
              style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]}
              multiline
              value={editSubjects}
              onChangeText={setEditSubjects}
              placeholder="e.g. CS401 - Database Systems, CS404 - DBMS Lab"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.formHelp}>Update the subjects assigned to this faculty member.</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Contact Phone</Text>
            <TextInput
              style={styles.formInput}
              value={editPhone}
              onChangeText={setEditPhone}
            />
          </View>

          <View style={styles.modalActionRow}>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowEditModal(false)}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, savingEdit && { opacity: 0.6 }]}
              onPress={handleSaveEditFaculty}
              disabled={savingEdit}
            >
              {savingEdit ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Save Changes</Text>
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
    padding: 24,
    maxWidth: 1300,
    width: '100%',
    alignSelf: 'center'
  },
  toastNotice: {
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 16,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }
    })
  },
  toastNoticeText: {
    color: '#FFF',
    fontWeight: typography.weight.bold,
    fontSize: 13
  },
  headerCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16
  },
  headerLeft: {
    flex: 1,
    minWidth: 280
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 6
  },
  activePillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentEmerald
  },
  activePillText: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: colors.accentEmerald
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    ...Platform.select({
      web: { cursor: 'pointer' }
    })
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: typography.weight.bold
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20
  },
  kpiCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  kpiLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6
  },
  kpiUnit: {
    fontSize: 12,
    color: colors.textMuted
  },
  kpiSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4
  },
  filterBar: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12
  },
  searchWrap: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgDark,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 12,
    height: 38
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    outlineStyle: 'none'
  },
  searchIcon: {
    fontSize: 14,
    color: colors.textMuted
  },
  clearSearchText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: typography.weight.bold
  },
  deptTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap'
  },
  deptTabBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.bgDark,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  deptTabBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  deptTabText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium
  },
  deptTabTextActive: {
    color: '#FFF',
    fontWeight: typography.weight.bold
  },
  statusSelectWrap: {
    minWidth: 130
  },
  nativeSelect: {
    width: '100%',
    backgroundColor: colors.bgDark,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    outlineStyle: 'none'
  },
  modalSelect: {
    width: '100%',
    backgroundColor: colors.bgDark,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    outlineStyle: 'none',
    marginTop: 4
  },
  loadingBox: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 14,
    fontSize: 13,
    color: colors.textSecondary
  },
  emptyCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 48,
    alignItems: 'center'
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 12
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: 6
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16
  },
  resetBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6
  },
  resetBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: typography.weight.bold
  },
  facultyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  facultyCard: {
    flex: 1,
    minWidth: 360,
    maxWidth: 580,
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    ...Platform.select({
      web: { boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)' }
    })
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  empIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  empIdBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  empIdText: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.5
  },
  deptPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1
  },
  deptPillText: {
    fontSize: 11,
    fontWeight: typography.weight.bold
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6
  },
  statusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  statusInactive: {
    backgroundColor: 'rgba(100, 116, 139, 0.12)',
    borderColor: 'rgba(100, 116, 139, 0.3)'
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  statusDotActive: {
    backgroundColor: colors.accentEmerald
  },
  statusDotInactive: {
    backgroundColor: '#94A3B8'
  },
  statusText: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.5
  },
  statusTextActive: {
    color: colors.accentEmerald
  },
  statusTextInactive: {
    color: '#94A3B8'
  },
  facultyProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)'
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: typography.weight.bold,
    color: colors.primaryLight
  },
  facultyName: {
    fontSize: 16,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: 2
  },
  facultyDesignation: {
    fontSize: 12,
    color: colors.primaryLight,
    fontWeight: typography.weight.medium,
    marginBottom: 2
  },
  facultyEmail: {
    fontSize: 12,
    color: colors.textMuted
  },
  metaBox: {
    backgroundColor: colors.bgDark,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 14,
    gap: 4
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  metaLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: typography.weight.medium
  },
  metaValue: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1
  },
  subjectsContainer: {
    marginBottom: 16
  },
  subjectsSectionLabel: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8
  },
  subjectsChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
    maxWidth: '100%'
  },
  subjectChipCode: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginRight: 4
  },
  subjectChipName: {
    fontSize: 11,
    color: colors.textMuted,
    maxWidth: 160
  },
  subjectChipMore: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  subjectChipMoreText: {
    fontSize: 11,
    color: colors.primaryLight,
    fontWeight: typography.weight.bold
  },
  noSubjectsText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic'
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 12
  },
  actionBtnSecondary: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: colors.bgDark,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  actionBtnSecondaryText: {
    fontSize: 12,
    fontWeight: typography.weight.medium,
    color: colors.textPrimary
  },
  actionBtnToggle: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1
  },
  actionBtnDeactivate: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  actionBtnActivate: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  actionBtnToggleText: {
    fontSize: 12,
    fontWeight: typography.weight.bold
  },
  actionBtnDeactivateText: {
    color: '#EF4444'
  },
  actionBtnActivateText: {
    color: colors.accentEmerald
  },
  formGroup: {
    marginBottom: 12
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  formLabel: {
    fontSize: 12,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
    marginBottom: 4
  },
  formInput: {
    backgroundColor: colors.bgDark,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 13,
    outlineStyle: 'none'
  },
  formHelp: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4
  },
  modalErrorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12
  },
  modalErrorText: {
    color: '#F87171',
    fontSize: 12
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18
  },
  modalCancelBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.bgDark,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  modalCancelBtnText: {
    color: colors.textSecondary,
    fontSize: 13
  },
  modalSubmitBtn: {
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: colors.primary
  },
  modalSubmitBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: typography.weight.bold
  }
});
