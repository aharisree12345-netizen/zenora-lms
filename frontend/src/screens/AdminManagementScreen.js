import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { colors, typography } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { GlassCard } from '../components/GlassCard';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';

export function AdminManagementScreen() {
  const { user } = useAuth();
  const [usersList, setUsersList] = useState([]);
  const [orgsList, setOrgsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bulk CSV Import Modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [csvText, setCsvText] = useState(
    'Name,Email,Roll Number\nAlex Carter,alex.carter@apex.edu,22CS105\nMaya Patel,maya.patel@apex.edu,22CS106\nDavid Kim,david.kim@apex.edu,22CS107'
  );
  const [importStatus, setImportStatus] = useState('');
  const [importDetails, setImportDetails] = useState(null);
  const [importing, setImporting] = useState(false);

  // Add User Modal
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('student');

  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    loadAdminData();
  }, [user?.role]);

  const [error, setError] = useState(null);

  async function loadAdminData() {
    setLoading(true);
    setError(null);
    try {
      const [uRes, oRes] = await Promise.all([
        api.getUsers(),
        isSuperAdmin ? api.getOrganizations() : Promise.resolve({ ok: true, data: { success: true, data: [] } })
      ]);

      if (uRes.ok && uRes.data.success) {
        setUsersList(uRes.data.data || []);
      } else {
        setError(uRes.data?.message || 'Failed to retrieve administrative users.');
      }
      if (oRes.ok && oRes.data.success) {
        setOrgsList(oRes.data.data || []);
      }
    } catch (err) {
      console.error('[Load Admin Data Error]', err);
      setError('Network connection failed. Unable to load administrative management.');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(uId, currentStatus) {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    await api.toggleUserStatus(uId, nextStatus);
    loadAdminData();
  }

  async function handleAddUser() {
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    await api.createUser({
      name: newUserName,
      email: newUserEmail,
      role: newUserRole
    });
    setShowAddUserModal(false);
    setNewUserName('');
    setNewUserEmail('');
    loadAdminData();
  }

  async function handleBulkImport() {
    if (!csvText.trim()) return;
    setImporting(true);
    setImportStatus('');
    setImportDetails(null);

    try {
      const res = await api.bulkImportStudents({ csv_text: csvText });
      if (res.ok && res.data.success) {
        setImportStatus(res.data.message);
        setImportDetails(res.data);
        loadAdminData();
      } else {
        // Fallback to bulkImport
        const fallbackRes = await api.bulkImport('course-cloud-01', csvText);
        if (fallbackRes.ok && fallbackRes.data.success) {
          setImportStatus(fallbackRes.data.message);
          setImportDetails(fallbackRes.data);
          loadAdminData();
        } else {
          setImportStatus(res.data?.message || fallbackRes.data?.message || 'Import failed.');
        }
      }
    } catch (err) {
      console.error('[Bulk Import Error]', err);
      setImportStatus('Network error while processing bulk student import.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>
            {isSuperAdmin ? 'Platform Super Administration & Tenants' : 'Institution & Student Management'}
          </Text>
          <Text style={styles.headerSub}>
            {isSuperAdmin
              ? 'Multi-tenant organization oversight, global user accounts, and platform integrity.'
              : 'Add students, assign instructors, manage academic batches, and process bulk CSV enrolments.'}
          </Text>
        </View>

        <View style={styles.actionGroup}>
          <TouchableOpacity
            style={styles.bulkBtn}
            onPress={() => setShowBulkModal(true)}
          >
            <Text style={styles.bulkBtnText}>📄 Bulk CSV Import</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAddUserModal(true)}
          >
            <Text style={styles.addBtnText}>+ Add Member</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Multi-Tenant Organizations (Super Admin View) */}
      {isSuperAdmin && (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Registered Organizations & Tenants ({orgsList.length})</Text>
          <View style={styles.orgGrid}>
            {orgsList.map(org => (
              <GlassCard key={org.id} style={styles.orgCard}>
                <View style={styles.orgTop}>
                  <Text style={styles.orgIcon}>🏛️</Text>
                  <Badge label={org.status} variant={org.status} />
                </View>
                <Text style={styles.orgName}>{org.name}</Text>
                <Text style={styles.orgDomain}>Domain: {org.custom_domain || 'zenora.edu'}</Text>
                <Text style={styles.orgEmail}>Contact: {org.contact_email}</Text>

                <View style={styles.orgStatsRow}>
                  <Text style={styles.orgStatItem}>🎓 {org.studentsCount || 0} Students</Text>
                  <Text style={styles.orgStatItem}>👨‍🏫 {org.instructorsCount || 0} Instructors</Text>
                  <Text style={styles.orgStatItem}>📚 {org.coursesCount || 0} Courses</Text>
                </View>
              </GlassCard>
            ))}
          </View>
        </View>
      )}

      {/* User Directory */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>User Directory & Permissions ({usersList.length})</Text>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <GlassCard style={styles.tableCard}>
            <View style={styles.tableHead}>
              <Text style={[styles.th, { flex: 2 }]}>User Information</Text>
              <Text style={[styles.th, { flex: 1 }]}>Assigned Role</Text>
              <Text style={[styles.th, { flex: 1 }]}>Account Status</Text>
              <Text style={[styles.th, { flex: 1 }]}>Action</Text>
            </View>

            {usersList.map(u => (
              <View key={u.id} style={styles.tableRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.userNameText}>{u.name}</Text>
                  <Text style={styles.userEmailText}>{u.email}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Badge label={u.role.replace('_', ' ')} variant={u.role} />
                </View>
                <View style={{ flex: 1 }}>
                  <Badge label={u.status} variant={u.status === 'active' ? 'success' : 'danger'} />
                </View>
                <View style={{ flex: 1 }}>
                  <TouchableOpacity
                    style={[styles.statusToggleBtn, u.status === 'active' ? styles.statusBtnSusp : styles.statusBtnAct]}
                    onPress={() => handleToggleStatus(u.id, u.status)}
                  >
                    <Text style={styles.statusToggleText}>
                      {u.status === 'active' ? 'Suspend' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </GlassCard>
        )}
      </View>

      {/* Bulk CSV Import Modal */}
      <Modal
        visible={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Bulk Student Import via CSV"
      >
        <View style={styles.modalBody}>
          <Text style={styles.csvHelp}>
            Enter comma-separated student records with format: <Text style={{ color: colors.primaryLight, fontWeight: 'bold' }}>Name, Email, Roll Number</Text>.
          </Text>
          <Text style={[styles.csvHelp, { fontSize: 11, color: colors.textMuted, marginTop: -4 }]}>
            💡 Note: Students are seeded with default credentials (password: <Text style={{ color: colors.accentAmber }}>Student@123</Text> or roll number). Duplicate emails and roll numbers are automatically detected and skipped.
          </Text>
          <TextInput
            style={[styles.input, { height: 130, fontFamily: 'monospace', fontSize: 12 }]}
            multiline
            value={csvText}
            onChangeText={setCsvText}
          />

          {importStatus ? (
            <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: colors.accentEmerald, padding: 10, borderRadius: 8 }}>
              <Text style={styles.importSuccess}>{importStatus}</Text>
              {importDetails?.duplicates?.length > 0 && (
                <View style={{ marginTop: 6 }}>
                  <Text style={{ color: colors.accentAmber, fontSize: 11, fontWeight: 'bold' }}>
                    ⚠️ Skipped {importDetails.duplicates.length} Duplicate Record(s):
                  </Text>
                  {importDetails.duplicates.map((d, idx) => (
                    <Text key={idx} style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>
                      • {d.name} ({d.email || d.roll_no}): {d.reason || 'Already exists'}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.processBtn}
            onPress={handleBulkImport}
            disabled={importing}
          >
            {importing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.processBtnText}>🚀 Process & Seed Student Accounts</Text>
            )}
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        visible={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        title="Add New Academic Member"
      >
        <View style={styles.modalBody}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Dr. Emily Thorne"
            placeholderTextColor={colors.textMuted}
            value={newUserName}
            onChangeText={setNewUserName}
          />
          <Text style={styles.label}>Email Address *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. emily.thorne@apex.edu"
            placeholderTextColor={colors.textMuted}
            value={newUserEmail}
            onChangeText={setNewUserEmail}
            autoCapitalize="none"
          />
          <Text style={styles.label}>Select Role</Text>
          <View style={styles.rolePicker}>
            {['student', 'instructor', 'institution_admin'].map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.roleOption, newUserRole === r && styles.roleOptionActive]}
                onPress={() => setNewUserRole(r)}
              >
                <Text style={[styles.roleOptionText, newUserRole === r && styles.roleOptionTextActive]}>
                  {r.replace('_', ' ').toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.processBtn} onPress={handleAddUser}>
            <Text style={styles.processBtnText}>Create Account</Text>
          </TouchableOpacity>
        </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold
  },
  headerSub: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    marginTop: 4,
    maxWidth: 650
  },
  actionGroup: {
    flexDirection: 'row',
    gap: 10
  },
  bulkBtn: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8
  },
  bulkBtnText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 13
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13
  },
  sectionBlock: {
    marginBottom: 28
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.size.md,
    fontWeight: 'bold',
    marginBottom: 14
  },
  orgGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  orgCard: {
    flexBasis: '48%',
    minWidth: 300,
    padding: 18
  },
  orgTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  orgIcon: {
    fontSize: 24
  },
  orgName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold'
  },
  orgDomain: {
    color: colors.primaryLight,
    fontSize: 12,
    marginTop: 2
  },
  orgEmail: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2
  },
  orgStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight
  },
  orgStatItem: {
    color: colors.textSecondary,
    fontSize: 11
  },
  tableCard: {
    padding: 20
  },
  tableHead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: 10,
    marginBottom: 8
  },
  th: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)'
  },
  userNameText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: 'bold'
  },
  userEmailText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2
  },
  statusToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  statusBtnSusp: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  statusBtnAct: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  statusToggleText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: 'bold'
  },
  modalBody: {
    gap: 12
  },
  csvHelp: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18
  },
  input: {
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    padding: 10,
    color: colors.textPrimary,
    fontSize: 13
  },
  importSuccess: {
    color: colors.accentEmerald,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    padding: 10,
    borderRadius: 8,
    fontSize: 12
  },
  processBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10
  },
  processBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold'
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500'
  },
  rolePicker: {
    flexDirection: 'row',
    gap: 8
  },
  roleOption: {
    flex: 1,
    backgroundColor: colors.bgSurface,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  roleOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  roleOptionText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: 'bold'
  },
  roleOptionTextActive: {
    color: '#FFF'
  }
});
