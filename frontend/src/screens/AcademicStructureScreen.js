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

export function AcademicStructureScreen() {
  const [activeSubTab, setActiveSubTab] = useState('departments');
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Forms
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptHod, setDeptHod] = useState('');

  const [batchName, setBatchName] = useState('');
  const [batchDeptId, setBatchDeptId] = useState('');
  const [batchSemester, setBatchSemester] = useState('4');
  const [batchSection, setBatchSection] = useState('A');

  const [subCode, setSubCode] = useState('');
  const [subName, setSubName] = useState('');
  const [subDeptId, setSubDeptId] = useState('');
  const [subSemester, setSubSemester] = useState('4');
  const [subCredits, setSubCredits] = useState('3');
  const [subType, setSubType] = useState('theory');

  const [assignFacultyId, setAssignFacultyId] = useState('');
  const [assignSubId, setAssignSubId] = useState('');
  const [assignBatchId, setAssignBatchId] = useState('');

  useEffect(() => {
    loadAllAcademicData();
  }, []);

  async function loadAllAcademicData() {
    setLoading(true);
    try {
      const [dRes, bRes, sRes, fRes, yRes] = await Promise.all([
        api.getDepartments(),
        api.getBatches(),
        api.getSubjects(),
        api.getFacultyAssignments(),
        api.getAcademicYears()
      ]);
      if (dRes.ok) {
        setDepartments(dRes.data.data || []);
        if (dRes.data.data.length > 0) {
          setBatchDeptId(dRes.data.data[0].id);
          setSubDeptId(dRes.data.data[0].id);
        }
      }
      if (bRes.ok) {
        setBatches(bRes.data.data || []);
        if (bRes.data.data.length > 0) setAssignBatchId(bRes.data.data[0].id);
      }
      if (sRes.ok) {
        setSubjects(sRes.data.data || []);
        if (sRes.data.data.length > 0) setAssignSubId(sRes.data.data[0].id);
      }
      if (fRes.ok) setAssignments(fRes.data.data || []);
      if (yRes.ok) setYears(yRes.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateDept = async () => {
    if (!deptName || !deptCode) return alert('Name and Code are required.');
    const res = await api.createDepartment({ name: deptName, code: deptCode, hod_name: deptHod });
    if (res.ok && res.data.success) {
      setShowDeptModal(false);
      setDeptName('');
      setDeptCode('');
      setDeptHod('');
      loadAllAcademicData();
    }
  };

  const handleCreateBatch = async () => {
    if (!batchName || !batchDeptId) return alert('Batch name and department required.');
    const res = await api.createBatch({
      name: batchName,
      department_id: batchDeptId,
      semester: parseInt(batchSemester, 10),
      section: batchSection
    });
    if (res.ok && res.data.success) {
      setShowBatchModal(false);
      setBatchName('');
      loadAllAcademicData();
    }
  };

  const handleCreateSubject = async () => {
    if (!subCode || !subName || !subDeptId) return alert('Code, Name, and Department required.');
    const res = await api.createSubject({
      code: subCode,
      name: subName,
      department_id: subDeptId,
      semester: parseInt(subSemester, 10),
      credits: parseInt(subCredits, 10),
      type: subType
    });
    if (res.ok && res.data.success) {
      setShowSubjectModal(false);
      setSubCode('');
      setSubName('');
      loadAllAcademicData();
    }
  };

  const handleAssignFaculty = async () => {
    if (!assignSubId || !assignBatchId) return alert('Select Subject and Batch.');
    const res = await api.assignFaculty({
      faculty_id: 'user-faculty-01', // Sarah Jenkins default
      subject_id: assignSubId,
      batch_id: assignBatchId
    });
    if (res.ok && res.data.success) {
      setShowAssignModal(false);
      loadAllAcademicData();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Academic Structure Management</Text>
          <Text style={styles.subtitle}>Manage Departments, Batches, Curriculum Subjects, and Faculty Allocations</Text>
        </View>
      </View>

      {/* Sub Tabs */}
      <View style={styles.subTabs}>
        {[
          { id: 'departments', label: 'Departments', count: departments.length },
          { id: 'batches', label: 'Batches / Classes', count: batches.length },
          { id: 'subjects', label: 'Subjects & Credits', count: subjects.length },
          { id: 'assignments', label: 'Faculty Workload', count: assignments.length }
        ].map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.subTabBtn, activeSubTab === t.id && styles.subTabBtnActive]}
            onPress={() => setActiveSubTab(t.id)}
          >
            <Text style={[styles.subTabBtnText, activeSubTab === t.id && styles.subTabBtnTextActive]}>
              {t.label} ({t.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {/* TAB 1: DEPARTMENTS */}
          {activeSubTab === 'departments' && (
            <View>
              <View style={styles.tabActions}>
                <Text style={styles.tabSecTitle}>College Academic Departments</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowDeptModal(true)}>
                  <Text style={styles.primaryBtnText}>+ Add Department</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.gridCards}>
                {departments.map(d => (
                  <View key={d.id} style={styles.card}>
                    <View style={styles.cardBadgeRow}>
                      <View style={styles.codePill}><Text style={styles.codeText}>{d.code}</Text></View>
                      <Text style={styles.cardCount}>{d.batchCount || 1} Batches • {d.studentCount || 6} Students</Text>
                    </View>
                    <Text style={styles.cardTitle}>{d.name}</Text>
                    <Text style={styles.cardHod}>HOD: {d.hod_name || 'Dr. Department Head'}</Text>
                    <Text style={styles.cardDesc} numberOfLines={2}>{d.description}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* TAB 2: BATCHES */}
          {activeSubTab === 'batches' && (
            <View>
              <View style={styles.tabActions}>
                <Text style={styles.tabSecTitle}>Active Academic Batches & Sections</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowBatchModal(true)}>
                  <Text style={styles.primaryBtnText}>+ Add Batch / Class</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.gridCards}>
                {batches.map(b => (
                  <View key={b.id} style={styles.card}>
                    <View style={styles.cardBadgeRow}>
                      <View style={styles.codePill}><Text style={styles.codeText}>Sem {b.semester}</Text></View>
                      <Text style={styles.cardCount}>Sec {b.section} • {b.shift}</Text>
                    </View>
                    <Text style={styles.cardTitle}>{b.name}</Text>
                    <Text style={styles.cardHod}>{b.department_name}</Text>
                    <Text style={styles.cardDesc}>Advisor: {b.faculty_advisor_name || 'Prof. Sarah Jenkins'}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* TAB 3: SUBJECTS */}
          {activeSubTab === 'subjects' && (
            <View>
              <View style={styles.tabActions}>
                <Text style={styles.tabSecTitle}>Curriculum Subjects & Credit System</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowSubjectModal(true)}>
                  <Text style={styles.primaryBtnText}>+ Add Subject</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.gridCards}>
                {subjects.map(s => (
                  <View key={s.id} style={styles.card}>
                    <View style={styles.cardBadgeRow}>
                      <View style={styles.codePill}><Text style={styles.codeText}>{s.code}</Text></View>
                      <Text style={styles.cardCount}>{s.credits} Credits • {s.type.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.cardTitle}>{s.name}</Text>
                    <Text style={styles.cardHod}>Semester {s.semester} • {s.department_name || 'CSE'}</Text>
                    <Text style={styles.cardDesc} numberOfLines={2}>{s.description}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* TAB 4: FACULTY ASSIGNMENTS */}
          {activeSubTab === 'assignments' && (
            <View>
              <View style={styles.tabActions}>
                <Text style={styles.tabSecTitle}>Faculty Subject & Class Allocations</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowAssignModal(true)}>
                  <Text style={styles.primaryBtnText}>+ Assign Subject</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.gridCards}>
                {assignments.map(a => (
                  <View key={a.id} style={styles.card}>
                    <View style={styles.cardBadgeRow}>
                      <View style={styles.codePill}><Text style={styles.codeText}>{a.subject_code}</Text></View>
                      <Text style={styles.cardCount}>{a.batch_name}</Text>
                    </View>
                    <Text style={styles.cardTitle}>{a.faculty_name}</Text>
                    <Text style={styles.cardHod}>Teaching: {a.subject_name}</Text>
                    <Text style={styles.cardDesc}>Target Class: {a.batch_name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}

      {/* ADD DEPT MODAL */}
      <Modal visible={showDeptModal} onClose={() => setShowDeptModal(false)} title="Add College Department">
        <View style={styles.field}><Text style={styles.label}>Department Name *</Text><TextInput style={styles.input} placeholder="e.g. Mechanical Engineering" placeholderTextColor={colors.textMuted} value={deptName} onChangeText={setDeptName} /></View>
        <View style={styles.field}><Text style={styles.label}>Code *</Text><TextInput style={styles.input} placeholder="e.g. MECH" placeholderTextColor={colors.textMuted} value={deptCode} onChangeText={setDeptCode} /></View>
        <View style={styles.field}><Text style={styles.label}>HOD Name</Text><TextInput style={styles.input} placeholder="e.g. Dr. Arthur Vance" placeholderTextColor={colors.textMuted} value={deptHod} onChangeText={setDeptHod} /></View>
        <TouchableOpacity style={styles.saveBtn} onPress={handleCreateDept}><Text style={styles.saveBtnText}>Save Department</Text></TouchableOpacity>
      </Modal>

      {/* ADD BATCH MODAL */}
      <Modal visible={showBatchModal} onClose={() => setShowBatchModal(false)} title="Create Batch / Class">
        <View style={styles.field}><Text style={styles.label}>Batch Name *</Text><TextInput style={styles.input} placeholder="e.g. CSE-2024-2028-SecC" placeholderTextColor={colors.textMuted} value={batchName} onChangeText={setBatchName} /></View>
        <View style={styles.field}>
          <Text style={styles.label}>Department *</Text>
          <select style={webSelectStyle} value={batchDeptId} onChange={(e) => setBatchDeptId(e.target.value)}>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
          </select>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Semester (1-8)</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={batchSemester} onChangeText={setBatchSemester} />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Section</Text>
            <TextInput style={styles.input} value={batchSection} onChangeText={setBatchSection} />
          </View>
        </View>
        <TouchableOpacity style={styles.saveBtn} onPress={handleCreateBatch}><Text style={styles.saveBtnText}>Create Batch</Text></TouchableOpacity>
      </Modal>

      {/* ADD SUBJECT MODAL */}
      <Modal visible={showSubjectModal} onClose={() => setShowSubjectModal(false)} title="Add Subject to Curriculum">
        <View style={styles.field}><Text style={styles.label}>Subject Code *</Text><TextInput style={styles.input} placeholder="e.g. CS8495" placeholderTextColor={colors.textMuted} value={subCode} onChangeText={setSubCode} /></View>
        <View style={styles.field}><Text style={styles.label}>Subject Title *</Text><TextInput style={styles.input} placeholder="e.g. Computer Networks" placeholderTextColor={colors.textMuted} value={subName} onChangeText={setSubName} /></View>
        <View style={styles.field}>
          <Text style={styles.label}>Department *</Text>
          <select style={webSelectStyle} value={subDeptId} onChange={(e) => setSubDeptId(e.target.value)}>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
          </select>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Credits</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={subCredits} onChangeText={setSubCredits} />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Type</Text>
            <select style={webSelectStyle} value={subType} onChange={(e) => setSubType(e.target.value)}>
              <option value="theory">Theory</option>
              <option value="practical">Practical / Lab</option>
              <option value="elective">Elective</option>
            </select>
          </View>
        </View>
        <TouchableOpacity style={styles.saveBtn} onPress={handleCreateSubject}><Text style={styles.saveBtnText}>Save Subject</Text></TouchableOpacity>
      </Modal>

      {/* ASSIGN FACULTY MODAL */}
      <Modal visible={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Faculty to Subject">
        <View style={styles.field}>
          <Text style={styles.label}>Subject *</Text>
          <select style={webSelectStyle} value={assignSubId} onChange={(e) => setAssignSubId(e.target.value)}>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.code} – {s.name}</option>)}
          </select>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Batch *</Text>
          <select style={webSelectStyle} value={assignBatchId} onChange={(e) => setAssignBatchId(e.target.value)}>
            {batches.map(b => <option key={b.id} value={b.id}>{b.name} (Sem {b.semester})</option>)}
          </select>
        </View>
        <TouchableOpacity style={styles.saveBtn} onPress={handleAssignFaculty}><Text style={styles.saveBtnText}>Allocate Subject</Text></TouchableOpacity>
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
  fontSize: '12px',
  outline: 'none',
  width: '100%'
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark },
  content: { padding: 24 },
  center: { paddingVertical: 40, alignItems: 'center' },
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: typography.weight.bold, color: colors.textPrimary },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  subTabs: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  subTabBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.borderLight },
  subTabBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  subTabBtnText: { color: colors.textSecondary, fontSize: 12, fontWeight: typography.weight.semibold },
  subTabBtnTextActive: { color: '#FFF' },
  tabActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  tabSecTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: typography.weight.bold },
  primaryBtn: { backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  primaryBtnText: { color: '#FFF', fontSize: 12, fontWeight: typography.weight.bold },
  gridCards: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { flex: 1, minWidth: 280, backgroundColor: colors.bgCard, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.borderLight },
  cardBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  codePill: { backgroundColor: 'rgba(99, 102, 241, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  codeText: { color: colors.primaryLight, fontSize: 10, fontWeight: typography.weight.bold },
  cardCount: { color: colors.textMuted, fontSize: 10 },
  cardTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: typography.weight.bold },
  cardHod: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  cardDesc: { color: colors.textMuted, fontSize: 11, marginTop: 6, lineHeight: 16 },
  field: { marginBottom: 12 },
  label: { color: colors.textSecondary, fontSize: 11, fontWeight: typography.weight.semibold, marginBottom: 6 },
  input: { height: 40, backgroundColor: colors.bgDark, borderRadius: 8, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 12, color: colors.textPrimary, fontSize: 12 },
  saveBtn: { backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#FFF', fontWeight: typography.weight.bold, fontSize: 13 }
});
