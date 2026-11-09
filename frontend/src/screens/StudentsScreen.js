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
import { api } from '../api/client';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';

export function StudentsScreen() {
  const { user } = useAuth();
  const isFaculty = user?.role === 'faculty' || user?.role === 'instructor';
  const facultyDefaultDeptId = user?.department_id || (user?.department_code === 'EC' ? 'dept-ec' : (user?.department_code === 'ME' ? 'dept-me' : 'dept-cs'));

  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);

  // Strict scoped student search for faculty portal
  const [hasSearched, setHasSearched] = useState(!isFaculty);
  const [selectedSemester, setSelectedSemester] = useState(4);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState(isFaculty ? facultyDefaultDeptId : '');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [activeStudent, setActiveStudent] = useState(null);

  // Form states for Add Student
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRollNo, setFormRollNo] = useState('');
  const [formRegNo, setFormRegNo] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDeptId, setFormDeptId] = useState('');
  const [formBatchId, setFormBatchId] = useState('');
  const [formGuardian, setFormGuardian] = useState('');
  const [formBloodGroup, setFormBloodGroup] = useState('O+');
  const [formPassword, setFormPassword] = useState('');
  const [savingStudent, setSavingStudent] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdNotice, setCreatedNotice] = useState(null);

  // Form states for Edit Student Profile
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editActiveTab, setEditActiveTab] = useState('academic'); // 'academic' | 'personal'
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRollNo, setEditRollNo] = useState('');
  const [editRegNo, setEditRegNo] = useState('');
  const [editDeptId, setEditDeptId] = useState('');
  const [editBatchId, setEditBatchId] = useState('');
  const [editCurrentSemester, setEditCurrentSemester] = useState('4');
  const [editAcademicYear, setEditAcademicYear] = useState('2025 - 2026');
  const [editAdmissionDate, setEditAdmissionDate] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editPhone, setEditPhone] = useState('');
  const [editParentName, setEditParentName] = useState('');
  const [editParentContact, setEditParentContact] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDateOfBirth, setEditDateOfBirth] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState('O+');
  const [editNotes, setEditNotes] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccessNotice, setEditSuccessNotice] = useState('');

  // Directory mode: 'students' | 'faculty' | 'approvals'
  const [activeDirectoryTab, setActiveDirectoryTab] = useState('students');
  const [facultyList, setFacultyList] = useState([]);
  const [loadingFaculty, setLoadingFaculty] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);

  // Faculty form states
  const [showAddFacultyModal, setShowAddFacultyModal] = useState(false);
  const [facName, setFacName] = useState('');
  const [facEmail, setFacEmail] = useState('');
  const [facStaffId, setFacStaffId] = useState('');
  const [facDeptId, setFacDeptId] = useState('');
  const [facDesignation, setFacDesignation] = useState('Assistant Professor');
  const [facQualification, setFacQualification] = useState('M.Tech, Ph.D.');
  const [facSpecialization, setFacSpecialization] = useState('Computer Science');
  const [facPassword, setFacPassword] = useState('');
  const [facPhone, setFacPhone] = useState('');
  const [savingFaculty, setSavingFaculty] = useState(false);
  const [facError, setFacError] = useState('');
  const [facultyCreatedNotice, setFacultyCreatedNotice] = useState(null);

  // Bulk CSV import states
  const [csvText, setCsvText] = useState(
`Full Name,Email,Roll Number,Register Number,Phone
Pooja Natarajan,pooja@apex.edu,24CSE107,312224104007,+1 555-901-2001
Karthik Raman,karthik@apex.edu,24CSE108,312224104008,+1 555-901-2002
Sneha Varma,sneha@apex.edu,24CSE109,312224104009,+1 555-901-2003`
  );
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  useEffect(() => {
    loadMetadata();
    if (!isFaculty || hasSearched) {
      loadStudents();
    }
  }, [selectedDept, selectedBatch, selectedStatus, hasSearched, selectedSemester]);

  async function loadMetadata() {
    try {
      const [deptRes, batchRes] = await Promise.all([
        api.getDepartments(),
        api.getBatches()
      ]);
      if (deptRes.ok && deptRes.data.success) {
        setDepartments(deptRes.data.data || []);
        if (!formDeptId && deptRes.data.data.length > 0) {
          setFormDeptId(deptRes.data.data[0].id);
        }
      }
      if (batchRes.ok && batchRes.data.success) {
        setBatches(batchRes.data.data || []);
        if (!formBatchId && batchRes.data.data.length > 0) {
          setFormBatchId(batchRes.data.data[0].id);
        }
      }
      loadFaculty();
      loadPendingApprovals();
    } catch (e) {
      console.error('[Metadata Load Error]', e);
    }
  }

  async function loadStudents() {
    if (isFaculty && !hasSearched) return;
    setLoading(true);
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (selectedDept) params.department_id = selectedDept;
      if (selectedBatch) params.batch_id = selectedBatch;
      if (isFaculty && selectedSemester) params.semester = selectedSemester;
      if (selectedStatus && selectedStatus !== 'all') params.status = selectedStatus;

      const res = await api.getStudents(params);
      if (res.ok && res.data.success) {
        let list = res.data.data || [];
        if (isFaculty && selectedSemester) {
          list = list.filter(s => Number(s.current_semester || s.semester) === Number(selectedSemester));
        }
        setStudents(list);
      }
    } catch (err) {
      console.error('[Load Students Error]', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = () => {
    loadStudents();
  };

  const handleToggleStatus = async (studentId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : currentStatus === 'suspended' ? 'graduated' : 'active';
    const res = await api.updateStudentStatus(studentId, nextStatus);
    if (res.ok && res.data.success) {
      loadStudents();
    }
  };

  const handleDeleteStudent = async (student) => {
    const confirmed = typeof window !== 'undefined' && window.confirm
      ? window.confirm(`Permanently remove or archive student: "${student.name}" (${student.roll_no})?`)
      : true;
    if (!confirmed) return;

    try {
      const res = await api.deleteStudent(student.id, { hard_delete: true });
      if (res.ok && res.data?.success) {
        setStudents(prev => prev.filter(s => s.id !== student.id));
      } else {
        alert(res.data?.message || 'Failed to remove student record.');
      }
    } catch (err) {
      alert('Error removing student record: ' + err.message);
    }
  };

  const handleOpenDetail = async (student) => {
    setActiveStudent(student);
    setShowDetailModal(true);
    // Fetch fresh detailed record
    const res = await api.getStudentDetail(student.id);
    if (res.ok && res.data.success) {
      setActiveStudent(res.data.data);
    }
  };

  const handleOpenEdit = (student) => {
    setEditingStudent(student);
    setEditActiveTab('academic');
    setEditError('');
    setEditSuccessNotice('');

    // Pre-populate form with existing values
    setEditName(student.name || '');
    setEditEmail(student.email || '');
    setEditRollNo(student.roll_no || '');
    setEditRegNo(student.register_no || '');
    setEditDeptId(student.department_id || '');
    setEditBatchId(student.batch_id || '');
    setEditCurrentSemester(student.current_semester ? String(student.current_semester) : (student.semester ? String(student.semester) : '4'));
    setEditAcademicYear(student.academic_year || '2025 - 2026');
    setEditAdmissionDate(student.admission_date || '');
    setEditStatus(student.status || 'active');

    setEditPhone(student.phone_number || student.phone || '');
    setEditParentName(student.parent_name || student.guardian_name || '');
    setEditParentContact(student.parent_contact || student.guardian_phone || '');
    setEditAddress(student.address || '');
    setEditDateOfBirth(student.date_of_birth || '');
    setEditBloodGroup(student.blood_group || 'O+');
    setEditNotes(student.notes || student.remarks || '');
    setEditAvatarUrl(student.avatar_url || '');

    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingStudent) return;
    setEditError('');
    setSavingEdit(true);

    try {
      const payload = {
        name: editName.trim(),
        email: editEmail.trim(),
        roll_no: editRollNo.trim(),
        register_no: editRegNo.trim(),
        department_id: editDeptId,
        batch_id: editBatchId,
        current_semester: parseInt(editCurrentSemester, 10) || 4,
        academic_year: editAcademicYear.trim(),
        admission_date: editAdmissionDate.trim() || undefined,
        status: editStatus,
        phone: editPhone.trim(),
        phone_number: editPhone.trim(),
        parent_name: editParentName.trim(),
        guardian_name: editParentName.trim(),
        parent_contact: editParentContact.trim(),
        guardian_phone: editParentContact.trim(),
        address: editAddress.trim(),
        date_of_birth: editDateOfBirth.trim() || undefined,
        blood_group: editBloodGroup.trim(),
        notes: editNotes.trim(),
        remarks: editNotes.trim(),
        avatar_url: editAvatarUrl.trim()
      };

      const res = await api.updateStudentProfile(editingStudent.id, payload);
      if (res.ok && res.data.success) {
        const updated = res.data.data;
        // Live update in student directory table
        setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
        // Live update in detail modal if currently viewing this student
        if (activeStudent && activeStudent.id === updated.id) {
          setActiveStudent(updated);
        }
        setEditSuccessNotice('Student details updated successfully in real time!');
        setTimeout(() => {
          setShowEditModal(false);
          setEditSuccessNotice('');
        }, 1100);
      } else {
        setEditError(res.data?.message || 'Failed to update student details.');
      }
    } catch (err) {
      setEditError('Network error while updating student profile.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreateStudent = async () => {
    setFormError('');
    if (!formName || !formEmail || !formRollNo || !formRegNo || !formBatchId) {
      setFormError('Please fill in Name, Email, Roll Number, Register Number, and Batch.');
      return;
    }

    setSavingStudent(true);
    try {
      const res = await api.createStudent({
        name: formName,
        email: formEmail,
        roll_no: formRollNo,
        register_no: formRegNo,
        phone: formPhone,
        department_id: formDeptId,
        batch_id: formBatchId,
        guardian_name: formGuardian,
        blood_group: formBloodGroup,
        password: formPassword.trim() || undefined
      });

      if (res.ok && res.data.success) {
        setShowAddModal(false);
        const assignedPass = res.data.default_password || formPassword.trim() || formRegNo || 'Student@123';
        const createdData = res.data.data;
        setCreatedNotice({
          name: createdData?.name || formName,
          email: createdData?.email || formEmail,
          roll_no: createdData?.roll_no || formRollNo,
          register_no: createdData?.register_no || formRegNo,
          password: assignedPass,
          batch_name: createdData?.batch_name || 'Assigned Batch'
        });

        // Clear form
        setFormName('');
        setFormEmail('');
        setFormRollNo('');
        setFormRegNo('');
        setFormPassword('');
        setFormPhone('');
        setFormGuardian('');
        loadStudents();
      } else {
        setFormError(res.data?.message || 'Failed to register student.');
      }
    } catch (err) {
      setFormError('Network error while registering student.');
    } finally {
      setSavingStudent(false);
    }
  };

  const handleBulkImport = async () => {
    setBulkImporting(true);
    setBulkResult(null);
    try {
      const res = await api.bulkImportStudents({
        csv_data: csvText,
        default_batch_id: formBatchId || 'batch-cse-4a',
        default_department_id: formDeptId || 'dept-cse-01'
      });
      if (res.ok && res.data.success) {
        setBulkResult(`Successfully registered ${res.data.importedCount} students!`);
        loadStudents();
        setTimeout(() => {
          setShowBulkModal(false);
          setBulkResult(null);
        }, 1800);
      } else {
        setBulkResult('Error: ' + (res.data?.message || 'Bulk import failed.'));
      }
    } catch (err) {
      setBulkResult('Network error during bulk import.');
    } finally {
      setBulkImporting(false);
    }
  };

  const handleExportCsv = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(api.exportStudentsCsvUrl(), '_blank');
    }
  };

  async function loadFaculty() {
    setLoadingFaculty(true);
    try {
      const res = await api.getFaculty();
      if (res.ok && res.data.success) {
        setFacultyList(res.data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFaculty(false);
    }
  }

  async function loadPendingApprovals() {
    setLoadingApprovals(true);
    try {
      const res = await api.getPendingApprovals();
      if (res.ok && res.data.success) {
        setPendingApprovals(res.data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingApprovals(false);
    }
  }

  const handleCreateFaculty = async () => {
    setFacError('');
    if (!facName.trim() || !facEmail.trim()) {
      setFacError('Full name and email are required.');
      return;
    }
    setSavingFaculty(true);
    try {
      const res = await api.createFaculty({
        name: facName.trim(),
        email: facEmail.trim(),
        staff_id: facStaffId.trim(),
        department_id: facDeptId || departments[0]?.id || 'dept-cse-01',
        designation: facDesignation,
        qualification: facQualification,
        specialization: facSpecialization,
        password: facPassword.trim() || 'Faculty@123',
        phone: facPhone.trim()
      });
      if (res.ok && res.data.success) {
        setShowAddFacultyModal(false);
        setFacultyCreatedNotice(res.data.data);
        setFacName('');
        setFacEmail('');
        setFacStaffId('');
        setFacPassword('');
        setFacPhone('');
        loadFaculty();
      } else {
        setFacError(res.data?.message || 'Failed to create faculty member.');
      }
    } catch (e) {
      setFacError('Network error creating faculty member.');
    } finally {
      setSavingFaculty(false);
    }
  };

  const handleToggleFacultyStatus = async (facultyId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const res = await api.updateFacultyStatus(facultyId, nextStatus);
    if (res.ok && res.data.success) {
      loadFaculty();
    }
  };

  const handleApprovePendingUser = async (userId, targetStatus) => {
    const res = await api.approveUser(userId, targetStatus);
    if (res.ok && res.data.success) {
      loadPendingApprovals();
      loadStudents();
      loadFaculty();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Directory Mode Switcher Tabs */}
      <View style={styles.dirNavRow}>
        <TouchableOpacity
          style={[styles.dirNavBtn, activeDirectoryTab === 'students' && styles.dirNavBtnActive]}
          onPress={() => setActiveDirectoryTab('students')}
          activeOpacity={0.8}
        >
          <Text style={[styles.dirNavText, activeDirectoryTab === 'students' && styles.dirNavTextActive]}>
            🎓 Students Directory ({students.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dirNavBtn, activeDirectoryTab === 'faculty' && styles.dirNavBtnActive]}
          onPress={() => {
            setActiveDirectoryTab('faculty');
            loadFaculty();
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.dirNavText, activeDirectoryTab === 'faculty' && styles.dirNavTextActive]}>
            👨‍🏫 Faculty & Staff ({facultyList.length})
          </Text>
        </TouchableOpacity>

        {['super_admin', 'institution_admin'].includes(user?.role) && (
          <TouchableOpacity
            style={[styles.dirNavBtn, activeDirectoryTab === 'approvals' && styles.dirNavBtnActive]}
            onPress={() => {
              setActiveDirectoryTab('approvals');
              loadPendingApprovals();
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.dirNavText, activeDirectoryTab === 'approvals' && styles.dirNavTextActive]}>
              ⏳ Pending Approvals ({pendingApprovals.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {activeDirectoryTab === 'students' && (
        <View>
          {/* Header Bar */}
      <View style={styles.pageHeader}>
        <View>
          <View style={styles.titleBadgeRow}>
            <Text style={styles.pageTitle}>Master Student Directory</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{students.length} Enrolled</Text>
            </View>
          </View>
          <Text style={styles.pageSubtitle}>
            Filterable college database by Department, Batch, Semester, and Academic Status
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExportCsv} activeOpacity={0.8}>
            <Text style={styles.exportBtnText}>📥 Export CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bulkBtn} onPress={() => setShowBulkModal(true)} activeOpacity={0.8}>
            <Text style={styles.bulkBtnText}>📄 Bulk Import</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)} activeOpacity={0.8}>
            <Text style={styles.addBtnText}>+ Add Student</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Faculty Scoped Search Mandatory Top Filter */}
      {isFaculty && (
        <View style={styles.facultyFilterCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <View>
              <Text style={styles.facultyFilterTitle}>Academic Cohort Filter (Strict Role Scope)</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                Students are scoped strictly to your assigned department and chosen semester cohort.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.facultySearchBtn}
              onPress={() => {
                setHasSearched(true);
                loadStudents();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.facultySearchBtnText}>🔍 View Cohort Students</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Academic Year Cohort Selector */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8 }}>ACADEMIC YEAR & SEMESTER:</Text>
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
                  }}
                >
                  <Text style={[styles.cohortPillText, isCohortActive && styles.cohortPillTextActive]}>
                    {cohort.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4, fontWeight: '600' }}>Department *</Text>
              <select
                style={webSelectStyle}
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.code} – {d.name}</option>
                ))}
              </select>
            </View>

            <View style={{ flex: 1, minWidth: 200 }}>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4, fontWeight: '600' }}>Semester *</Text>
              <select
                style={webSelectStyle}
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(parseInt(e.target.value, 10))}
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

      {/* Filters Bar (Admin view or additional search) */}
      {!isFaculty && (
        <View style={styles.filtersBar}>
          {/* Search Input */}
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, roll no, register no, or email..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => { setSearchQuery(''); loadStudents(); }}>
                <Text style={styles.clearSearch}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter Dropdown Pills */}
          <View style={styles.filterGroup}>
            {/* Department Filter */}
            <View style={styles.selectWrapper}>
              <Text style={styles.selectLabel}>Dept:</Text>
              <select
                style={webSelectStyle}
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.code} – {d.name}</option>
                ))}
              </select>
            </View>

            {/* Batch Filter */}
            <View style={styles.selectWrapper}>
              <Text style={styles.selectLabel}>Batch:</Text>
              <select
                style={webSelectStyle}
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
              >
                <option value="">All Batches</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} (Sem {b.semester})</option>
                ))}
              </select>
            </View>

            {/* Status Filter */}
            <View style={styles.selectWrapper}>
              <Text style={styles.selectLabel}>Status:</Text>
              <select
                style={webSelectStyle}
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="graduated">Graduated</option>
              </select>
            </View>
          </View>
        </View>
      )}

      {/* Clear State for Faculty when not searched */}
      {isFaculty && !hasSearched ? (
        <View style={styles.promptCard}>
          <Text style={{ fontSize: 44, marginBottom: 12 }}>👨‍🎓</Text>
          <Text style={styles.promptTitle}>Select Department and Semester to view students.</Text>
          <Text style={styles.promptSub}>
            Please select an academic department and semester above, then click "View Cohort Students" to inspect enrolled students.
          </Text>
          <TouchableOpacity
            style={styles.promptBtn}
            onPress={() => {
              setHasSearched(true);
              loadStudents();
            }}
          >
            <Text style={styles.promptBtnText}>View Cohort Students →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Data Table */}
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Fetching student records...</Text>
            </View>
          ) : students.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>👨‍🎓</Text>
              <Text style={styles.emptyTitle}>No students found</Text>
              <Text style={styles.emptySubtitle}>No enrolled students match the selected department and semester criteria.</Text>
            </View>
          ) : (
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { width: 110 }]}>Roll No</Text>
            <Text style={[styles.th, { width: 130 }]}>Register No</Text>
            <Text style={[styles.th, { flex: 2 }]}>Student Name</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Batch / Class</Text>
            <Text style={[styles.th, { width: 90 }]}>Dept</Text>
            <Text style={[styles.th, { width: 100 }]}>Status</Text>
            <Text style={[styles.th, { width: 170, textAlign: 'right' }]}>Actions</Text>
          </View>

          {students.map((std, idx) => (
            <View key={std.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
              <View style={{ width: 110 }}>
                <Text style={styles.rollNoText}>{std.roll_no}</Text>
              </View>

              <View style={{ width: 130 }}>
                <Text style={styles.regNoText}>{std.register_no}</Text>
              </View>

              <View style={{ flex: 2 }}>
                <Text style={styles.nameText}>{std.name}</Text>
                <Text style={styles.emailText}>{std.email}</Text>
              </View>

              <View style={{ flex: 1.5 }}>
                <Text style={styles.batchText}>{std.batch_name}</Text>
                <Text style={styles.semText}>Sem {std.semester} • Sec {std.section}</Text>
              </View>

              <View style={{ width: 90 }}>
                <Text style={styles.deptText}>{std.department_code || 'CSE'}</Text>
              </View>

              <View style={{ width: 100 }}>
                <TouchableOpacity
                  onPress={() => handleToggleStatus(std.id, std.status)}
                  style={[
                    styles.statusPill,
                    std.status === 'active' && styles.statusActive,
                    std.status === 'suspended' && styles.statusSuspended,
                    std.status === 'graduated' && styles.statusGraduated
                  ]}
                  title="Click to toggle status"
                >
                  <Text style={[
                    styles.statusText,
                    std.status === 'active' && styles.statusTextActive,
                    std.status === 'suspended' && styles.statusTextSuspended,
                    std.status === 'graduated' && styles.statusTextGraduated
                  ]}>
                    {std.status.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ width: 190, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                <TouchableOpacity
                  style={styles.viewRecordBtn}
                  onPress={() => handleOpenDetail(std)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.viewRecordBtnText}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editRecordBtn}
                  onPress={() => handleOpenEdit(std)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.editRecordBtnText}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteRecordBtn}
                  onPress={() => handleDeleteStudent(std)}
                  activeOpacity={0.8}
                  title="Archive / Remove Student"
                >
                  <Text style={styles.deleteRecordBtnText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
        </>
      )}
        </View>
      )}

      {/* TAB 2: MASTER FACULTY DIRECTORY */}
      {activeDirectoryTab === 'faculty' && (
        <View>
          {/* Faculty Header Bar */}
          <View style={styles.pageHeader}>
            <View>
              <View style={styles.titleBadgeRow}>
                <Text style={styles.pageTitle}>Master Faculty Directory</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{facultyList.length} Faculty Members</Text>
                </View>
              </View>
              <Text style={styles.pageSubtitle}>
                Department-wise faculty directory, designations, qualifications, and workload management
              </Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setShowAddFacultyModal(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.addBtnText}>+ Add Faculty Member</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Faculty Table / List */}
          {loadingFaculty ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Fetching faculty records...</Text>
            </View>
          ) : facultyList.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>👨‍🏫</Text>
              <Text style={styles.emptyTitle}>No faculty members registered</Text>
              <Text style={styles.emptySubtitle}>Click "+ Add Faculty Member" to onboard professors and teachers.</Text>
            </View>
          ) : (
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { width: 130 }]}>Staff ID</Text>
                <Text style={[styles.th, { flex: 2 }]}>Faculty Member</Text>
                <Text style={[styles.th, { flex: 1.5 }]}>Department & Role</Text>
                <Text style={[styles.th, { flex: 1.5 }]}>Specialization</Text>
                <Text style={[styles.th, { width: 100 }]}>Workload</Text>
                <Text style={[styles.th, { width: 90 }]}>Status</Text>
                <Text style={[styles.th, { width: 130, textAlign: 'right' }]}>Actions</Text>
              </View>

              {facultyList.map((fac, idx) => (
                <View key={fac.id || fac.user_id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                  <View style={{ width: 130 }}>
                    <Text style={styles.rollNoText}>{fac.staff_id || 'FAC-N/A'}</Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted }}>{fac.qualification || 'M.Tech'}</Text>
                  </View>

                  <View style={{ flex: 2 }}>
                    <Text style={styles.nameText}>{fac.name}</Text>
                    <Text style={styles.emailText}>{fac.email}</Text>
                  </View>

                  <View style={{ flex: 1.5 }}>
                    <Text style={styles.batchText}>{fac.designation || 'Faculty'}</Text>
                    <Text style={styles.semText}>{fac.department_name || fac.department_code || 'Dept'}</Text>
                  </View>

                  <View style={{ flex: 1.5 }}>
                    <Text style={styles.deptText}>{fac.specialization || 'General'}</Text>
                  </View>

                  <View style={{ width: 100 }}>
                    <View style={styles.workloadPill}>
                      <Text style={styles.workloadText}>{fac.workload_hours_per_week || 14} hrs/wk</Text>
                    </View>
                  </View>

                  <View style={{ width: 90 }}>
                    <View style={[
                      styles.statusPill,
                      fac.status === 'active' && styles.statusActive,
                      fac.status === 'suspended' && styles.statusSuspended
                    ]}>
                      <Text style={[
                        styles.statusText,
                        fac.status === 'active' && styles.statusTextActive,
                        fac.status === 'suspended' && styles.statusTextSuspended
                      ]}>
                        {(fac.status || 'ACTIVE').toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={{ width: 130, flexDirection: 'row', justifyContent: 'flex-end' }}>
                    <TouchableOpacity
                      style={styles.toggleStatusBtn}
                      onPress={() => handleToggleFacultyStatus(fac.id || fac.user_id, fac.status)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.toggleStatusBtnText}>
                        {fac.status === 'active' ? 'Suspend' : 'Activate'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* TAB 3: PENDING APPROVALS */}
      {activeDirectoryTab === 'approvals' && (
        <View>
          <View style={styles.pageHeader}>
            <View>
              <View style={styles.titleBadgeRow}>
                <Text style={styles.pageTitle}>Pending Account Approvals</Text>
                <View style={[styles.countBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
                  <Text style={[styles.countBadgeText, { color: '#F59E0B' }]}>
                    {pendingApprovals.length} Awaiting Verification
                  </Text>
                </View>
              </View>
              <Text style={styles.pageSubtitle}>
                Review and approve or reject newly registered student and faculty portal accounts
              </Text>
            </View>
          </View>

          {loadingApprovals ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Fetching pending accounts...</Text>
            </View>
          ) : pendingApprovals.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🎉</Text>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySubtitle}>There are no pending accounts requiring administrator verification.</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {pendingApprovals.map(acc => (
                <View key={acc.id} style={styles.approvalCard}>
                  <View style={styles.approvalHeader}>
                    <View style={styles.approvalIcon}>
                      <Text style={{ fontSize: 20 }}>{acc.role === 'faculty' ? '👨‍🏫' : '👨‍🎓'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.approvalName}>{acc.name}</Text>
                        <View style={[styles.statusPill, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                          <Text style={[styles.statusText, { color: colors.primaryLight }]}>
                            {acc.role.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.approvalEmail}>{acc.email}</Text>
                      <Text style={styles.approvalDetails}>
                        {acc.role === 'student'
                          ? `Roll No: ${acc.roll_no || 'N/A'} • Reg No: ${acc.register_no || 'N/A'} • Dept: ${acc.department_code || 'CSE'}`
                          : `Staff ID: ${acc.staff_id || 'FAC-N/A'} • Dept: ${acc.department_code || 'CSE'} • Desig: ${acc.designation || 'Lecturer'}`
                        }
                      </Text>
                    </View>
                  </View>

                  <View style={styles.approvalActionRow}>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleApprovePendingUser(acc.id, 'rejected')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.rejectBtnText}>✕ Reject</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApprovePendingUser(acc.id, 'active')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.approveBtnText}>✓ Approve & Activate</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* MODAL 1: ADD STUDENT */}
      <Modal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New Student"
      >
        <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
          {formError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{formError}</Text>
            </View>
          ) : null}

          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Rachel Adams"
                placeholderTextColor={colors.textMuted}
                value={formName}
                onChangeText={setFormName}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. rachel@apex.edu"
                placeholderTextColor={colors.textMuted}
                value={formEmail}
                onChangeText={setFormEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.label}>College Roll Number *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 24CSE110"
                placeholderTextColor={colors.textMuted}
                value={formRollNo}
                onChangeText={setFormRollNo}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>University Register Number *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 312224104010"
                placeholderTextColor={colors.textMuted}
                value={formRegNo}
                onChangeText={setFormRegNo}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.label}>Department</Text>
              <select
                style={{ ...webSelectStyle, width: '100%', height: 42 }}
                value={formDeptId}
                onChange={(e) => setFormDeptId(e.target.value)}
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Batch Allocation *</Text>
              <select
                style={{ ...webSelectStyle, width: '100%', height: 42 }}
                value={formBatchId}
                onChange={(e) => setFormBatchId(e.target.value)}
              >
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} (Semester {b.semester})</option>
                ))}
              </select>
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.label}>Guardian / Parent Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Arthur Adams"
                placeholderTextColor={colors.textMuted}
                value={formGuardian}
                onChangeText={setFormGuardian}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. +1 555-019-3382"
                placeholderTextColor={colors.textMuted}
                value={formPhone}
                onChangeText={setFormPhone}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.label}>Account Password (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={formRegNo ? `Default: ${formRegNo}` : 'Leave blank for Register Number'}
                placeholderTextColor={colors.textMuted}
                value={formPassword}
                onChangeText={setFormPassword}
                autoCapitalize="none"
              />
              <Text style={styles.inputHint}>
                💡 If left blank, the student's Register Number will be automatically saved as their default login password in MySQL.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleCreateStudent}
            disabled={savingStudent}
          >
            {savingStudent ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>✓ Register & Allocate to Batch</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {/* MODAL 2: STUDENT PROFILE DETAIL */}
      {activeStudent && (
        <Modal
          visible={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={`Student Record: ${activeStudent.name}`}
        >
          <ScrollView style={{ maxHeight: 540 }} showsVerticalScrollIndicator={false}>
            {/* Header Card */}
            <View style={styles.profileCard}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>
                  {activeStudent.name.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{activeStudent.name}</Text>
                <Text style={styles.profileEmail}>{activeStudent.email}</Text>
                <View style={styles.profilePillRow}>
                  <Text style={styles.profilePill}>Roll: {activeStudent.roll_no}</Text>
                  <Text style={styles.profilePill}>Reg: {activeStudent.register_no}</Text>
                  <Text style={[styles.profilePill, { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: colors.accentEmerald }]}>
                    {activeStudent.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.editInDetailBtn}
                onPress={() => {
                  setShowDetailModal(false);
                  handleOpenEdit(activeStudent);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.editInDetailBtnText}>✏️ Edit Profile</Text>
              </TouchableOpacity>
            </View>

            {/* Academic Placement Details */}
            <View style={styles.sectionBox}>
              <Text style={styles.sectionBoxTitle}>Academic Allocation</Text>
              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Department</Text>
                  <Text style={styles.detailValue}>{activeStudent.department_name}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Batch / Class</Text>
                  <Text style={styles.detailValue}>{activeStudent.batch_name}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Semester & Section</Text>
                  <Text style={styles.detailValue}>Semester {activeStudent.semester} (Section {activeStudent.section})</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Shift / Mode</Text>
                  <Text style={styles.detailValue}>{activeStudent.shift}</Text>
                </View>
              </View>
            </View>

            {/* Personal & Contact Details */}
            <View style={styles.sectionBox}>
              <Text style={styles.sectionBoxTitle}>Personal & Contact Details</Text>
              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Contact Phone</Text>
                  <Text style={styles.detailValue}>{activeStudent.phone || activeStudent.phone_number || 'N/A'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Parent / Guardian Name</Text>
                  <Text style={styles.detailValue}>{activeStudent.parent_name || activeStudent.guardian_name || 'N/A'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Parent / Guardian Phone</Text>
                  <Text style={styles.detailValue}>{activeStudent.parent_contact || activeStudent.guardian_phone || 'N/A'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Blood Group</Text>
                  <Text style={styles.detailValue}>{activeStudent.blood_group || 'O+'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Date of Birth</Text>
                  <Text style={styles.detailValue}>{activeStudent.date_of_birth || 'N/A'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Admission Date</Text>
                  <Text style={styles.detailValue}>{activeStudent.admission_date || 'N/A'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Academic Year</Text>
                  <Text style={styles.detailValue}>{activeStudent.academic_year || '2025 - 2026'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Current Semester</Text>
                  <Text style={styles.detailValue}>Semester {activeStudent.current_semester || activeStudent.semester || 4}</Text>
                </View>
                <View style={[styles.detailItem, { width: '100%' }]}>
                  <Text style={styles.detailLabel}>Residential Address</Text>
                  <Text style={styles.detailValue}>{activeStudent.address || 'N/A'}</Text>
                </View>
                {activeStudent.notes || activeStudent.remarks ? (
                  <View style={[styles.detailItem, { width: '100%' }]}>
                    <Text style={styles.detailLabel}>Faculty & Counselor Remarks</Text>
                    <Text style={[styles.detailValue, { color: colors.primaryLight }]}>{activeStudent.notes || activeStudent.remarks}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Portal Authentication Credentials */}
            <View style={[styles.sectionBox, { backgroundColor: 'rgba(99, 102, 241, 0.08)', borderColor: 'rgba(99, 102, 241, 0.25)' }]}>
              <Text style={[styles.sectionBoxTitle, { color: colors.primaryLight }]}>🔑 Student Login Credentials</Text>
              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Login ID (Email)</Text>
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{activeStudent.email}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Login ID (Roll No)</Text>
                  <Text style={[styles.detailValue, { color: colors.primaryLight, fontWeight: 'bold' }]}>{activeStudent.roll_no}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>University Register No</Text>
                  <Text style={styles.detailValue}>{activeStudent.register_no}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Default Password</Text>
                  <Text style={[styles.detailValue, { color: colors.accentEmerald, fontWeight: 'bold' }]}>
                    {activeStudent.register_no} (or Student@123)
                  </Text>
                </View>
              </View>
            </View>

            {/* Enrolled Subjects List */}
            <View style={styles.sectionBox}>
              <Text style={styles.sectionBoxTitle}>Enrolled Curriculum Subjects ({activeStudent.enrolled_subjects?.length || 0})</Text>
              <View style={styles.subjectList}>
                {(activeStudent.enrolled_subjects || []).map((sub, sIdx) => (
                  <View key={sIdx} style={styles.subjectRow}>
                    <View style={styles.subCodeBadge}>
                      <Text style={styles.subCodeText}>{sub.subject_code}</Text>
                    </View>
                    <View style={{ flex: 1, paddingLeft: 10 }}>
                      <Text style={styles.subNameText}>{sub.subject_name}</Text>
                      <Text style={styles.subMetaText}>{sub.credits} Credits • {sub.type.toUpperCase()}</Text>
                    </View>
                    <View style={styles.subStatusBadge}>
                      <Text style={styles.subStatusText}>{sub.status}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </Modal>
      )}

      {/* MODAL: REGISTRATION SUCCESS WITH CREDENTIALS */}
      {createdNotice && (
        <Modal
          visible={!!createdNotice}
          onClose={() => setCreatedNotice(null)}
          title="Student Account Created Successfully"
        >
          <View style={{ paddingVertical: 6 }}>
            <View style={styles.successBadgeBox}>
              <Text style={styles.successBadgeIcon}>🎉</Text>
              <Text style={styles.successBadgeTitle}>Registration Confirmed</Text>
              <Text style={styles.successBadgeSub}>
                The student account has been saved in the database and enrolled in batch subjects.
              </Text>
            </View>

            <View style={styles.credCard}>
              <Text style={styles.credCardTitle}>STUDENT PORTAL LOGIN CREDENTIALS</Text>

              <View style={styles.credRow}>
                <Text style={styles.credLabel}>Student Name:</Text>
                <Text style={styles.credValue}>{createdNotice.name}</Text>
              </View>

              <View style={styles.credRow}>
                <Text style={styles.credLabel}>Email Address:</Text>
                <Text style={styles.credValue}>{createdNotice.email}</Text>
              </View>

              <View style={styles.credRow}>
                <Text style={styles.credLabel}>College Roll Number:</Text>
                <Text style={[styles.credValue, { color: colors.primaryLight, fontWeight: 'bold' }]}>
                  {createdNotice.roll_no}
                </Text>
              </View>

              <View style={styles.credRow}>
                <Text style={styles.credLabel}>University Register No:</Text>
                <Text style={styles.credValue}>{createdNotice.register_no}</Text>
              </View>

              <View style={[styles.credRow, styles.credHighlightRow]}>
                <Text style={[styles.credLabel, { color: colors.accentEmerald, fontWeight: 'bold' }]}>
                  Default Password:
                </Text>
                <Text style={[styles.credValue, styles.credPassword]}>
                  {createdNotice.password}
                </Text>
              </View>
            </View>

            <Text style={styles.credInstructions}>
              ℹ️ The student can now log in at the Student Login screen using their <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>Email</Text>, <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>Roll Number ({createdNotice.roll_no})</Text>, or <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>Register Number</Text> along with the password shown above.
            </Text>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => setCreatedNotice(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.doneBtnText}>✓ Done</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}

      {/* MODAL 3: BULK CSV IMPORT */}
      <Modal
        visible={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Bulk Register Students via CSV"
      >
        <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.bulkInstructions}>
            Paste or edit standard comma-separated values (CSV) with headers: <Text style={{ color: colors.primaryLight, fontWeight: 'bold' }}>Name, Email, Roll Number, Register Number, Phone</Text>.
          </Text>

          <View style={{ marginBottom: 14 }}>
            <Text style={styles.label}>Target Batch for Allocation:</Text>
            <select
              style={{ ...webSelectStyle, width: '100%', height: 42 }}
              value={formBatchId}
              onChange={(e) => setFormBatchId(e.target.value)}
            >
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name} (Semester {b.semester})</option>
              ))}
            </select>
          </View>

          <TextInput
            style={styles.csvTextArea}
            multiline
            numberOfLines={8}
            value={csvText}
            onChangeText={setCsvText}
            placeholder="Paste CSV text here..."
            placeholderTextColor={colors.textMuted}
          />

          {bulkResult ? (
            <View style={styles.bulkResultBox}>
              <Text style={styles.bulkResultText}>{bulkResult}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleBulkImport}
            disabled={bulkImporting}
          >
            {bulkImporting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>🚀 Import & Allocate to Batch</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {/* MODAL 4: ADD FACULTY MEMBER */}
      <Modal
        visible={showAddFacultyModal}
        onClose={() => setShowAddFacultyModal(false)}
        title="Onboard Faculty / Staff Member"
      >
        <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
          {facError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{facError}</Text>
            </View>
          ) : null}

          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Dr. Robert Vance"
                placeholderTextColor={colors.textMuted}
                value={facName}
                onChangeText={setFacName}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Institutional Email *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. robert.vance@apex.edu"
                placeholderTextColor={colors.textMuted}
                value={facEmail}
                onChangeText={setFacEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.label}>Staff ID *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. FAC-CSE-009"
                placeholderTextColor={colors.textMuted}
                value={facStaffId}
                onChangeText={setFacStaffId}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Department *</Text>
              <select
                style={{ ...webSelectStyle, width: '100%', height: 42 }}
                value={facDeptId}
                onChange={(e) => setFacDeptId(e.target.value)}
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.code} – {d.name}</option>
                ))}
              </select>
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.label}>Designation</Text>
              <select
                style={{ ...webSelectStyle, width: '100%', height: 42 }}
                value={facDesignation}
                onChange={(e) => setFacDesignation(e.target.value)}
              >
                <option value="Assistant Professor">Assistant Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Professor">Professor</option>
                <option value="Head of Department">Head of Department (HOD)</option>
                <option value="Adjunct Lecturer">Adjunct Lecturer</option>
              </select>
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Qualification</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. M.Tech, Ph.D. in AI"
                placeholderTextColor={colors.textMuted}
                value={facQualification}
                onChangeText={setFacQualification}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.label}>Specialization</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Distributed Computing"
                placeholderTextColor={colors.textMuted}
                value={facSpecialization}
                onChangeText={setFacSpecialization}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Contact Phone</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. +1 555-400-3021"
                placeholderTextColor={colors.textMuted}
                value={facPhone}
                onChangeText={setFacPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={{ marginBottom: 14 }}>
            <Text style={styles.label}>Initial Password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Leave blank for default (Faculty@123)"
              placeholderTextColor={colors.textMuted}
              value={facPassword}
              onChangeText={setFacPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleCreateFaculty}
            disabled={savingFaculty}
          >
            {savingFaculty ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>✓ Save & Onboard Faculty</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {/* MODAL 5: FACULTY REGISTRATION SUCCESS */}
      {facultyCreatedNotice && (
        <Modal
          visible={!!facultyCreatedNotice}
          onClose={() => setFacultyCreatedNotice(null)}
          title="Faculty Member Onboarded Successfully"
        >
          <View style={{ paddingVertical: 6 }}>
            <View style={styles.successBadgeBox}>
              <Text style={styles.successBadgeIcon}>👨‍🏫</Text>
              <Text style={styles.successBadgeTitle}>Faculty Profile Created</Text>
              <Text style={styles.successBadgeSub}>
                Faculty credentials have been configured. The teacher can now access the faculty marks entry portal.
              </Text>
            </View>

            <View style={styles.credCard}>
              <Text style={styles.credCardTitle}>FACULTY LOGIN CREDENTIALS</Text>

              <View style={styles.credRow}>
                <Text style={styles.credLabel}>Faculty Name:</Text>
                <Text style={styles.credValue}>{facultyCreatedNotice.name}</Text>
              </View>

              <View style={styles.credRow}>
                <Text style={styles.credLabel}>Email Address:</Text>
                <Text style={styles.credValue}>{facultyCreatedNotice.email}</Text>
              </View>

              <View style={styles.credRow}>
                <Text style={styles.credLabel}>Staff ID / Login ID:</Text>
                <Text style={[styles.credValue, { color: colors.primaryLight, fontWeight: 'bold' }]}>
                  {facultyCreatedNotice.staff_id}
                </Text>
              </View>

              <View style={styles.credRow}>
                <Text style={styles.credLabel}>Designation:</Text>
                <Text style={styles.credValue}>{facultyCreatedNotice.designation || 'Faculty'}</Text>
              </View>

              <View style={[styles.credRow, styles.credHighlightRow]}>
                <Text style={[styles.credLabel, { color: colors.accentEmerald, fontWeight: 'bold' }]}>
                  Default Password:
                </Text>
                <Text style={[styles.credValue, styles.credPassword]}>
                  {facultyCreatedNotice.password || 'Faculty@123'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => setFacultyCreatedNotice(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.doneBtnText}>✓ Done</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}

      {/* MODAL: EDIT STUDENT PROFILE (FACULTY & INSTITUTION ADMIN) */}
      {editingStudent && (
        <Modal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          title={`Edit Student Record: ${editingStudent.name} (${editingStudent.roll_no})`}
        >
          <ScrollView style={{ maxHeight: 560 }} showsVerticalScrollIndicator={false}>
            {/* Organized Tab Navigation */}
            <View style={styles.editTabRow}>
              <TouchableOpacity
                style={[styles.editTabBtn, editActiveTab === 'academic' && styles.editTabBtnActive]}
                onPress={() => setEditActiveTab('academic')}
                activeOpacity={0.8}
              >
                <Text style={[styles.editTabText, editActiveTab === 'academic' && styles.editTabTextActive]}>
                  🎓 Academic Details
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editTabBtn, editActiveTab === 'personal' && styles.editTabBtnActive]}
                onPress={() => setEditActiveTab('personal')}
                activeOpacity={0.8}
              >
                <Text style={[styles.editTabText, editActiveTab === 'personal' && styles.editTabTextActive]}>
                  👤 Personal & Contact Details
                </Text>
              </TouchableOpacity>
            </View>

            {editError ? (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorText}>⚠️ {editError}</Text>
              </View>
            ) : null}

            {editSuccessNotice ? (
              <View style={styles.modalSuccessBox}>
                <Text style={styles.modalSuccessText}>✅ {editSuccessNotice}</Text>
              </View>
            ) : null}

            {/* TAB 1: ACADEMIC DETAILS */}
            {editActiveTab === 'academic' && (
              <View style={{ paddingVertical: 4 }}>
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Student Full Name *</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="e.g. Alex Rivera"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Official College Email *</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editEmail}
                      onChangeText={setEditEmail}
                      placeholder="e.g. student@apex.edu"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>College Roll Number *</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editRollNo}
                      onChangeText={setEditRollNo}
                      placeholder="e.g. 24CSE101"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="characters"
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>University Register Number *</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editRegNo}
                      onChangeText={setEditRegNo}
                      placeholder="e.g. 312224104001"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Academic Department</Text>
                    <select
                      style={{ ...webSelectStyle, width: '100%', height: 42 }}
                      value={editDeptId}
                      onChange={(e) => setEditDeptId(e.target.value)}
                    >
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Batch Allocation *</Text>
                    <select
                      style={{ ...webSelectStyle, width: '100%', height: 42 }}
                      value={editBatchId}
                      onChange={(e) => setEditBatchId(e.target.value)}
                    >
                      {batches.map(b => (
                        <option key={b.id} value={b.id}>{b.name} (Semester {b.semester})</option>
                      ))}
                    </select>
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Current Semester (1-8)</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editCurrentSemester}
                      onChangeText={setEditCurrentSemester}
                      placeholder="1 - 8"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Academic Year</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editAcademicYear}
                      onChangeText={setEditAcademicYear}
                      placeholder="e.g. 2025 - 2026"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Admission Date</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editAdmissionDate}
                      onChangeText={setEditAdmissionDate}
                      placeholder="YYYY-MM-DD (e.g. 2024-06-15)"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Academic Status</Text>
                    <select
                      style={{ ...webSelectStyle, width: '100%', height: 42 }}
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                    >
                      <option value="active">Active & Enrolled</option>
                      <option value="suspended">Suspended</option>
                      <option value="graduated">Graduated / Alumnus</option>
                    </select>
                  </View>
                </View>
              </View>
            )}

            {/* TAB 2: PERSONAL & CONTACT DETAILS */}
            {editActiveTab === 'personal' && (
              <View style={{ paddingVertical: 4 }}>
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Student Contact Phone</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editPhone}
                      onChangeText={setEditPhone}
                      placeholder="+1 (555) 987-6541"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Date of Birth</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editDateOfBirth}
                      onChangeText={setEditDateOfBirth}
                      placeholder="YYYY-MM-DD (e.g. 2004-08-15)"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Parent / Guardian Name</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editParentName}
                      onChangeText={setEditParentName}
                      placeholder="e.g. Carlos Rivera"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Parent / Guardian Contact Phone</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editParentContact}
                      onChangeText={setEditParentContact}
                      placeholder="+1 (555) 111-2233"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Blood Group</Text>
                    <select
                      style={{ ...webSelectStyle, width: '100%', height: 42 }}
                      value={editBloodGroup}
                      onChange={(e) => setEditBloodGroup(e.target.value)}
                    >
                      {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Profile Photo URL</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editAvatarUrl}
                      onChangeText={setEditAvatarUrl}
                      placeholder="https://images.unsplash.com/..."
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                <View style={{ marginBottom: 14 }}>
                  <Text style={styles.label}>Residential Address</Text>
                  <TextInput
                    style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]}
                    value={editAddress}
                    onChangeText={setEditAddress}
                    placeholder="Enter permanent residential address..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                  />
                </View>

                <View style={{ marginBottom: 14 }}>
                  <Text style={styles.label}>Faculty & Counselor Remarks / Notes</Text>
                  <TextInput
                    style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]}
                    value={editNotes}
                    onChangeText={setEditNotes}
                    placeholder="Academic observations, achievements, counselor remarks..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                  />
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.saveEditBtn}
              onPress={handleSaveEdit}
              disabled={savingEdit}
              activeOpacity={0.85}
            >
              {savingEdit ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveEditBtnText}>💾 Save Student Details</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
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
  headerActions: {
    flexDirection: 'row',
    gap: 10
  },
  exportBtn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  exportBtnText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: typography.weight.semibold
  },
  bulkBtn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  bulkBtnText: {
    color: colors.accentEmerald,
    fontSize: 12,
    fontWeight: typography.weight.semibold
  },
  addBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.primary
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: typography.weight.bold
  },
  filtersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: colors.bgCard,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 20
  },
  searchBox: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgDark,
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6
  },
  searchInput: {
    flex: 1,
    height: 36,
    color: colors.textPrimary,
    fontSize: typography.size.xs
  },
  clearSearch: {
    color: colors.textMuted,
    fontSize: 14,
    paddingHorizontal: 4
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10
  },
  selectWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  selectLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: typography.weight.semibold
  },
  loadingWrap: {
    paddingVertical: 60,
    alignItems: 'center'
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    marginTop: 10
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
  tableCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden'
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  th: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.5
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  tableRowAlt: {
    backgroundColor: 'rgba(255, 255, 255, 0.015)'
  },
  rollNoText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: typography.weight.bold
  },
  regNoText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  nameText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: typography.weight.semibold
  },
  emailText: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2
  },
  batchText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: typography.weight.medium
  },
  semText: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2
  },
  deptText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: typography.weight.bold
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1
  },
  statusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  statusSuspended: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  statusGraduated: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.3)'
  },
  statusText: {
    fontSize: 9,
    fontWeight: typography.weight.bold
  },
  statusTextActive: {
    color: colors.accentEmerald
  },
  statusTextSuspended: {
    color: colors.accentRose
  },
  statusTextGraduated: {
    color: colors.primaryLight
  },
  viewRecordBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)'
  },
  viewRecordBtnText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: typography.weight.semibold
  },
  editRecordBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  editRecordBtnText: {
    color: colors.accentEmerald,
    fontSize: 11,
    fontWeight: typography.weight.semibold
  },
  deleteRecordBtn: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  deleteRecordBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: typography.weight.semibold
  },
  editInDetailBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'center',
    marginLeft: 12
  },
  editInDetailBtnText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: typography.weight.semibold
  },
  editTabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  editTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6
  },
  editTabBtnActive: {
    backgroundColor: colors.primary
  },
  editTabText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: typography.weight.medium
  },
  editTabTextActive: {
    color: '#FFF',
    fontWeight: typography.weight.bold
  },
  saveEditBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  },
  saveEditBtnText: {
    color: '#FFF',
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold
  },
  modalErrorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12
  },
  modalErrorText: {
    color: colors.accentRose,
    fontSize: 12
  },
  modalSuccessBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12
  },
  modalSuccessText: {
    color: colors.accentEmerald,
    fontSize: 12,
    fontWeight: typography.weight.semibold
  },
  // Modal styles
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12
  },
  formField: {
    flex: 1
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgDark,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 16
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  profileAvatarText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: typography.weight.bold
  },
  profileName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: typography.weight.bold
  },
  profileEmail: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2
  },
  profilePillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6
  },
  profilePill: {
    fontSize: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    color: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: typography.weight.bold
  },
  sectionBox: {
    backgroundColor: colors.bgDark,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 14
  },
  sectionBoxTitle: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: typography.weight.bold,
    marginBottom: 10
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  detailItem: {
    width: '48%'
  },
  detailLabel: {
    color: colors.textMuted,
    fontSize: 10
  },
  detailValue: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: typography.weight.semibold,
    marginTop: 2
  },
  subjectList: {
    gap: 8
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  subCodeBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  subCodeText: {
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: typography.weight.bold
  },
  subNameText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: typography.weight.semibold
  },
  subMetaText: {
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 1
  },
  subStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  subStatusText: {
    color: colors.accentEmerald,
    fontSize: 9,
    fontWeight: typography.weight.bold
  },
  bulkInstructions: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 18
  },
  csvTextArea: {
    backgroundColor: colors.bgDark,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 12,
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    height: 140,
    textAlignVertical: 'top'
  },
  bulkResultBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  bulkResultText: {
    color: colors.accentEmerald,
    fontSize: 12,
    fontWeight: typography.weight.semibold
  },
  inputHint: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16
  },
  successBadgeBox: {
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginBottom: 16
  },
  successBadgeIcon: {
    fontSize: 32,
    marginBottom: 6
  },
  successBadgeTitle: {
    color: colors.accentEmerald,
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold
  },
  successBadgeSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 16
  },
  credCard: {
    backgroundColor: colors.bgDark,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 16
  },
  credCardTitle: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.2,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: 6
  },
  credRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6
  },
  credHighlightRow: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginTop: 6
  },
  credLabel: {
    color: colors.textMuted,
    fontSize: 12
  },
  credValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: typography.weight.semibold
  },
  credPassword: {
    color: colors.accentEmerald,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: typography.weight.bold
  },
  credInstructions: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16
  },
  doneBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center'
  },
  doneBtnText: {
    color: '#FFF',
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold
  },
  dirNavRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20
  },
  dirNavBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  dirNavBtnActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: colors.primary
  },
  dirNavText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium
  },
  dirNavTextActive: {
    color: colors.primaryLight,
    fontWeight: typography.weight.bold
  },
  workloadPill: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  workloadText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: typography.weight.semibold
  },
  toggleStatusBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  toggleStatusBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: typography.weight.medium
  },
  approvalCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14
  },
  approvalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 260
  },
  approvalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  approvalName: {
    fontSize: 15,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary
  },
  approvalEmail: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2
  },
  approvalDetails: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4
  },
  approvalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  approveBtn: {
    backgroundColor: colors.accentEmerald,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  approveBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: typography.weight.bold
  },
  rejectBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8
  },
  rejectBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: typography.weight.semibold
  },

  /* Faculty Scoped Filter and Prompt Styles */
  facultyFilterCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 18,
    marginBottom: 20
  },
  facultyFilterTitle: {
    fontSize: 15,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary
  },
  facultySearchBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  facultySearchBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: typography.weight.bold
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
  promptBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  promptBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: typography.weight.bold
  }
});
