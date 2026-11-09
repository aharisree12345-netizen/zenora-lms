import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { colors, typography } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { Badge } from './Badge';
import { Modal } from './Modal';
import { api } from '../api/client';
import { getPlatformBadge } from '../utils/platform';

export function Header({ onToggleMobileMenu }) {
  const { user, switchRole, logout, unreadCount, refreshNotifications, refreshProfile } = useAuth();
  const platformBadge = getPlatformBadge();
  const [notifList, setNotifList] = useState([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Student self-edit state
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [personalSaveMsg, setPersonalSaveMsg] = useState(null);

  useEffect(() => {
    if (user) {
      setEditPhone(user?.student_profile?.phone_number || user?.student_profile?.phone || user?.phone || '');
      setEditAddress(user?.student_profile?.address || user?.address || '');
      setEditAvatarUrl(user?.avatar_url || '');
    }
  }, [user, showProfileModal]);

  useEffect(() => {
    if (showNotifMenu) {
      loadNotifs();
    }
  }, [showNotifMenu]);

  async function loadNotifs() {
    const res = await api.getNotifications();
    if (res.ok && res.data.success) {
      setNotifList(res.data.data || []);
    }
  }

  async function handleMarkRead(id) {
    await api.markNotificationRead(id);
    loadNotifs();
    refreshNotifications();
  }

  async function handleMarkAll() {
    await api.markAllNotificationsRead();
    loadNotifs();
    refreshNotifications();
  }

  const roleLabelMap = {
    super_admin: 'College Admin',
    faculty: 'Faculty / Teacher',
    student: 'Student'
  };

  const studentProfile = user?.student_profile;
  const facultyProfile = user?.faculty_profile;

  async function handleSavePersonal() {
    if (!user?.id) return;
    setIsSavingPersonal(true);
    setPersonalSaveMsg(null);
    try {
      const res = await api.updateStudentProfile(user.id, {
        phone_number: editPhone,
        address: editAddress,
        avatar_url: editAvatarUrl,
      });
      if (res.ok && (res.data?.success || res.status === 200)) {
        setPersonalSaveMsg({ type: 'success', text: 'Personal profile updated successfully!' });
        if (refreshProfile) await refreshProfile();
        setTimeout(() => {
          setIsEditingPersonal(false);
          setPersonalSaveMsg(null);
        }, 1200);
      } else {
        setPersonalSaveMsg({ type: 'error', text: res.data?.message || 'Failed to update personal details.' });
      }
    } catch (err) {
      setPersonalSaveMsg({ type: 'error', text: 'Network error updating personal details.' });
    } finally {
      setIsSavingPersonal(false);
    }
  }

  return (
    <View style={styles.header}>
      {/* Brand & Mobile Hamburger */}
      <View style={styles.brandRow}>
        {onToggleMobileMenu ? (
          <TouchableOpacity style={styles.mobileMenuBtn} onPress={onToggleMobileMenu} activeOpacity={0.7}>
            <Text style={styles.mobileMenuIcon}>☰</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.logoBadge}>
          <Text style={styles.logoIcon}>🏛️</Text>
        </View>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.brandTitle}>ZENORA</Text>
            <View style={styles.collegePill}>
              <Text style={styles.collegePillText}>COLLEGE LMS</Text>
            </View>
            <View style={styles.platformPill}>
              <Text style={styles.platformPillText}>{platformBadge.icon} {platformBadge.label}</Text>
            </View>
          </View>
          <Text style={styles.orgText} numberOfLines={1}>
            Academic Management System • Autonomous NAAC A++
          </Text>
        </View>
      </View>

      {/* Role Switcher Toolbar (Crucial pair programming feature for instant testing) */}
      <View style={styles.roleBar}>
        <Text style={styles.roleBarLabel}>Switch Persona:</Text>
        {[
          { role: 'super_admin', label: 'Admin', icon: '⚡' },
          { role: 'faculty', label: 'Faculty', icon: '👨‍🏫' },
          { role: 'student', label: 'Student', icon: '🎓' }
        ].map((item) => {
          const isActive = user?.role === item.role || (item.role === 'faculty' && user?.role === 'instructor');
          return (
            <TouchableOpacity
              key={item.role}
              style={[styles.roleBtn, isActive && styles.roleBtnActive]}
              onPress={() => switchRole(item.role)}
              activeOpacity={0.8}
            >
              <Text style={styles.roleBtnIcon}>{item.icon}</Text>
              <Text style={[styles.roleBtnText, isActive && styles.roleBtnTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Right User Bar & Notifications */}
      <View style={styles.rightBar}>
        {/* Notifications Icon Button */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setShowNotifMenu(!showNotifMenu)}
          activeOpacity={0.8}
        >
          <Text style={styles.iconText}>🔔</Text>
          {unreadCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* User Card - Clickable to open Profile Management */}
        <TouchableOpacity
          style={styles.userSection}
          onPress={() => setShowProfileModal(true)}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop' }}
            style={styles.avatar}
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{user?.name || 'User'}</Text>
            <View style={styles.roleSubRow}>
              <Badge label={roleLabelMap[user?.role] || 'User'} variant={user?.role} />
              {studentProfile?.roll_no ? (
                <Text style={styles.rollBadge}>{studentProfile.roll_no}</Text>
              ) : facultyProfile?.staff_id ? (
                <Text style={styles.rollBadge}>{facultyProfile.staff_id}</Text>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={logout} style={styles.logoutBtn} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* In-App Notifications Dropdown */}
      {showNotifMenu && (
        <View style={styles.notifMenu}>
          <View style={styles.notifMenuHeader}>
            <Text style={styles.notifMenuTitle}>Academic Notifications</Text>
            {notifList.length > 0 && (
              <TouchableOpacity onPress={handleMarkAll}>
                <Text style={styles.markAllText}>Mark all as read</Text>
              </TouchableOpacity>
            )}
          </View>

          {notifList.length === 0 ? (
            <View style={styles.emptyNotifs}>
              <Text style={styles.emptyNotifText}>No unread circulars or alerts</Text>
            </View>
          ) : (
            notifList.slice(0, 5).map(item => (
              <TouchableOpacity
                key={item.id}
                style={[styles.notifItem, !item.is_read && styles.notifItemUnread]}
                onPress={() => handleMarkRead(item.id)}
              >
                <View style={styles.notifIconWrap}>
                  <Text style={styles.notifItemIcon}>
                    {item.type === 'exam' ? '📝' : item.type === 'grade' ? '🏆' : item.type === 'assignment' ? '📑' : '📢'}
                  </Text>
                </View>
                <View style={styles.notifItemContent}>
                  <Text style={styles.notifItemTitle}>{item.title}</Text>
                  <Text style={styles.notifItemDesc} numberOfLines={2}>{item.message}</Text>
                  <Text style={styles.notifItemTime}>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {/* ACADEMIC PROFILE & IDENTITY MODAL */}
      <Modal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="Institutional Academic Profile"
      >
        <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
          <View style={styles.modalProfileHeader}>
            <Image
              source={{ uri: user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop' }}
              style={styles.modalAvatar}
            />
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.modalUserName}>{user?.name}</Text>
              <Text style={styles.modalUserEmail}>{user?.email}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                <Badge label={roleLabelMap[user?.role] || user?.role} variant={user?.role} />
                <View style={styles.verifiedPill}>
                  <Text style={styles.verifiedText}>✓ Institutional Record</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Student Specific Profile Details */}
          {user?.role === 'student' && (
            <>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Academic Identity & Enrollment</Text>
                <View style={styles.modalGrid}>
                  <View style={styles.modalGridItem}>
                    <Text style={styles.modalGridLabel}>College Roll Number</Text>
                    <Text style={styles.modalGridVal}>{studentProfile?.roll_no || '24CSE101'}</Text>
                  </View>
                  <View style={styles.modalGridItem}>
                    <Text style={styles.modalGridLabel}>University Register No</Text>
                    <Text style={styles.modalGridVal}>{studentProfile?.register_no || '312224104001'}</Text>
                  </View>
                  <View style={styles.modalGridItem}>
                    <Text style={styles.modalGridLabel}>Department</Text>
                    <Text style={styles.modalGridVal}>{user?.department_name || 'Computer Science & Engineering'}</Text>
                  </View>
                  <View style={styles.modalGridItem}>
                    <Text style={styles.modalGridLabel}>Batch & Semester</Text>
                    <Text style={styles.modalGridVal}>
                      {studentProfile?.batch_name || 'CSE-2024-2028'} • Sem {studentProfile?.semester || 4} ({studentProfile?.section || 'A'})
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Academic Standing & Attendance</Text>
                <View style={styles.attendanceCard}>
                  <View style={styles.attendanceStat}>
                    <Text style={styles.attendanceScore}>96.2%</Text>
                    <Text style={styles.attendanceLabel}>Current Term Attendance</Text>
                  </View>
                  <View style={styles.standingPill}>
                    <Text style={styles.standingText}>Eligible for University Examinations</Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.modalSectionTitle}>Personal & Contact Details</Text>
                  {!isEditingPersonal && (
                    <TouchableOpacity
                      onPress={() => setIsEditingPersonal(true)}
                      style={styles.personalEditBtn}
                    >
                      <Text style={styles.personalEditBtnText}>✏️ Edit My Info</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {personalSaveMsg && (
                  <View style={[styles.statusBanner, personalSaveMsg.type === 'error' ? styles.statusBannerError : styles.statusBannerSuccess]}>
                    <Text style={[styles.statusBannerText, personalSaveMsg.type === 'error' ? styles.statusBannerTextError : styles.statusBannerTextSuccess]}>
                      {personalSaveMsg.text}
                    </Text>
                  </View>
                )}

                {isEditingPersonal ? (
                  <View style={styles.selfEditCard}>
                    <Text style={styles.selfEditHelp}>Update your personal contact information. Academic fields are managed by college registrar/faculty.</Text>
                    
                    <Text style={styles.selfEditLabel}>Phone Number</Text>
                    <TextInput
                      style={styles.selfEditInput}
                      value={editPhone}
                      onChangeText={setEditPhone}
                      placeholder="+1 (555) 000-0000"
                      placeholderTextColor={colors.textMuted}
                    />

                    <Text style={styles.selfEditLabel}>Residential Address</Text>
                    <TextInput
                      style={[styles.selfEditInput, { height: 60, textAlignVertical: 'top' }]}
                      value={editAddress}
                      onChangeText={setEditAddress}
                      placeholder="Street, City, Postal Code"
                      placeholderTextColor={colors.textMuted}
                      multiline
                    />

                    <Text style={styles.selfEditLabel}>Profile Picture URL</Text>
                    <TextInput
                      style={styles.selfEditInput}
                      value={editAvatarUrl}
                      onChangeText={setEditAvatarUrl}
                      placeholder="https://example.com/avatar.jpg"
                      placeholderTextColor={colors.textMuted}
                    />

                    <View style={styles.selfEditActionRow}>
                      <TouchableOpacity
                        style={styles.selfEditCancelBtn}
                        onPress={() => {
                          setIsEditingPersonal(false);
                          setPersonalSaveMsg(null);
                        }}
                        disabled={isSavingPersonal}
                      >
                        <Text style={styles.selfEditCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.selfEditSaveBtn}
                        onPress={handleSavePersonal}
                        disabled={isSavingPersonal}
                      >
                        {isSavingPersonal ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.selfEditSaveText}>Save Changes</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.modalGrid}>
                    <View style={styles.modalGridItem}>
                      <Text style={styles.modalGridLabel}>Student Phone</Text>
                      <Text style={styles.modalGridVal}>{studentProfile?.phone_number || studentProfile?.phone || user?.phone || 'Not provided'}</Text>
                    </View>
                    <View style={styles.modalGridItem}>
                      <Text style={styles.modalGridLabel}>Blood Group</Text>
                      <Text style={styles.modalGridVal}>{studentProfile?.blood_group || 'O+'}</Text>
                    </View>
                    <View style={styles.modalGridItem}>
                      <Text style={styles.modalGridLabel}>Guardian / Parent</Text>
                      <Text style={styles.modalGridVal}>{studentProfile?.parent_name || studentProfile?.guardian_name || 'Carlos Rivera'}</Text>
                    </View>
                    <View style={styles.modalGridItem}>
                      <Text style={styles.modalGridLabel}>Guardian Contact</Text>
                      <Text style={styles.modalGridVal}>{studentProfile?.parent_contact || studentProfile?.guardian_phone || '+1 (555) 111-2233'}</Text>
                    </View>
                    <View style={styles.modalGridItem}>
                      <Text style={styles.modalGridLabel}>Date of Birth</Text>
                      <Text style={styles.modalGridVal}>{studentProfile?.date_of_birth ? String(studentProfile.date_of_birth).split('T')[0] : '2004-03-22'}</Text>
                    </View>
                    <View style={styles.modalGridItem}>
                      <Text style={styles.modalGridLabel}>Admission Date</Text>
                      <Text style={styles.modalGridVal}>{studentProfile?.admission_date ? String(studentProfile.admission_date).split('T')[0] : '2024-06-15'}</Text>
                    </View>
                    <View style={[styles.modalGridItem, { width: '100%' }]}>
                      <Text style={styles.modalGridLabel}>Residential Address</Text>
                      <Text style={styles.modalGridVal}>{studentProfile?.address || user?.address || '742 Evergreen Terrace, Sector 4, Silicon Valley Metro'}</Text>
                    </View>
                    <View style={[styles.modalGridItem, { width: '100%' }]}>
                      <Text style={styles.modalGridLabel}>Academic Notes & Remarks</Text>
                      <Text style={styles.modalGridVal}>{studentProfile?.notes || studentProfile?.remarks || 'Academic record verified. Regular attendance.'}</Text>
                    </View>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Faculty Specific Profile Details */}
          {(user?.role === 'faculty' || user?.role === 'instructor') && (
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Faculty Appointment & Workload</Text>
              <View style={styles.modalGrid}>
                <View style={styles.modalGridItem}>
                  <Text style={styles.modalGridLabel}>Staff ID</Text>
                  <Text style={styles.modalGridVal}>{facultyProfile?.staff_id || user?.staff_id || 'FAC-CSE-001'}</Text>
                </View>
                <View style={styles.modalGridItem}>
                  <Text style={styles.modalGridLabel}>Designation</Text>
                  <Text style={styles.modalGridVal}>{user?.designation || 'Associate Professor & Class Advisor'}</Text>
                </View>
                <View style={styles.modalGridItem}>
                  <Text style={styles.modalGridLabel}>Department</Text>
                  <Text style={styles.modalGridVal}>{user?.department_name || 'Computer Science & Engineering'}</Text>
                </View>
                <View style={styles.modalGridItem}>
                  <Text style={styles.modalGridLabel}>Highest Qualification</Text>
                  <Text style={styles.modalGridVal}>{facultyProfile?.qualification || 'M.E., Ph.D.'}</Text>
                </View>
                <View style={[styles.modalGridItem, { width: '100%' }]}>
                  <Text style={styles.modalGridLabel}>Academic Specialization</Text>
                  <Text style={styles.modalGridVal}>{facultyProfile?.specialization || 'Database Management Systems & Distributed Computing'}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Administrator Details */}
          {(user?.role === 'super_admin' || user?.role === 'institution_admin') && (
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>College Academic Administration</Text>
              <View style={styles.modalGrid}>
                <View style={styles.modalGridItem}>
                  <Text style={styles.modalGridLabel}>Role</Text>
                  <Text style={styles.modalGridVal}>Chief Academic Registrar & Dean</Text>
                </View>
                <View style={styles.modalGridItem}>
                  <Text style={styles.modalGridLabel}>Institution Accreditation</Text>
                  <Text style={styles.modalGridVal}>NBA Tier-1 / NAAC A++ Autonomous</Text>
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.modalLogoutBtn}
            onPress={() => { setShowProfileModal(false); logout(); }}
          >
            <Text style={styles.modalLogoutText}>Sign Out from this Device</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 72,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 100,
    position: 'relative'
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    ...Platform.select({
      web: { boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)' }
    })
  },
  logoIcon: {
    fontSize: 22
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    letterSpacing: 0.5
  },
  collegePill: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)'
  },
  collegePillText: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    color: colors.primaryLight,
    letterSpacing: 0.5
  },
  platformPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  platformPillText: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    color: '#34D399',
    letterSpacing: 0.3
  },
  orgText: {
    fontSize: typography.size.xs,
    color: colors.textMuted,
    marginTop: 2
  },
  roleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgDark,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  roleBarLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: typography.weight.semibold,
    marginRight: 8
  },
  roleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginLeft: 4
  },
  roleBtnActive: {
    backgroundColor: colors.primary
  },
  roleBtnIcon: {
    fontSize: 13,
    marginRight: 4
  },
  roleBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium
  },
  roleBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: typography.weight.bold
  },
  rightBar: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconBtn: {
    position: 'relative',
    padding: 8,
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: colors.bgDark,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  iconText: {
    fontSize: 16
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  notifBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: typography.weight.bold
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
    paddingLeft: 6
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    borderWidth: 2,
    borderColor: colors.primary
  },
  userInfo: {
    justifyContent: 'center'
  },
  userName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    maxWidth: 160
  },
  roleSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  rollBadge: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    color: colors.primaryLight,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6
  },
  logoutBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  logoutText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.accentRose
  },
  notifMenu: {
    position: 'absolute',
    top: 76,
    right: 20,
    width: 360,
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 16,
    ...Platform.select({
      web: { boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)' }
    })
  },
  notifMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  notifMenuTitle: {
    color: colors.textPrimary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold
  },
  markAllText: {
    color: colors.primaryLight,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold
  },
  emptyNotifs: {
    paddingVertical: 20,
    alignItems: 'center'
  },
  emptyNotifText: {
    color: colors.textMuted,
    fontSize: typography.size.xs
  },
  notifItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  notifItemUnread: {
    backgroundColor: 'rgba(99, 102, 241, 0.06)'
  },
  notifIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.bgDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  notifItemIcon: {
    fontSize: 16
  },
  notifItemContent: {
    flex: 1
  },
  notifItemTitle: {
    color: colors.textPrimary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold
  },
  notifItemDesc: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2
  },
  notifItemTime: {
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 4
  },
  mobileMenuBtn: {
    padding: 8,
    marginRight: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8
  },
  mobileMenuIcon: {
    fontSize: 18,
    color: colors.textPrimary
  },
  modalProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    marginBottom: 16
  },
  modalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 16
  },
  modalUserName: {
    color: colors.textPrimary,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold
  },
  modalUserEmail: {
    color: colors.textMuted,
    fontSize: typography.size.xs,
    marginTop: 2
  },
  verifiedPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  verifiedText: {
    color: colors.accentEmerald,
    fontSize: 10,
    fontWeight: typography.weight.semibold
  },
  modalSection: {
    marginBottom: 16
  },
  modalSectionTitle: {
    color: colors.primaryLight,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
    marginBottom: 8
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  modalGridItem: {
    width: '48%',
    backgroundColor: colors.bgCard,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  modalGridLabel: {
    color: colors.textMuted,
    fontSize: 10,
    marginBottom: 4
  },
  modalGridVal: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: typography.weight.semibold
  },
  attendanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgCard,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  attendanceStat: {},
  attendanceScore: {
    color: colors.accentEmerald,
    fontSize: 22,
    fontWeight: typography.weight.bold
  },
  attendanceLabel: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2
  },
  standingPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)'
  },
  standingText: {
    color: colors.accentEmerald,
    fontSize: 11,
    fontWeight: typography.weight.medium
  },
  modalLogoutBtn: {
    marginTop: 10,
    paddingVertical: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center'
  },
  modalLogoutText: {
    color: '#EF4444',
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold
  },
  personalEditBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)'
  },
  personalEditBtnText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: typography.weight.bold
  },
  statusBanner: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1
  },
  statusBannerSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  statusBannerError: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  statusBannerText: {
    fontSize: 12,
    fontWeight: typography.weight.medium
  },
  statusBannerTextSuccess: {
    color: colors.accentEmerald
  },
  statusBannerTextError: {
    color: '#EF4444'
  },
  selfEditCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 8
  },
  selfEditHelp: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 10,
    lineHeight: 16
  },
  selfEditLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: typography.weight.medium,
    marginBottom: 4,
    marginTop: 6
  },
  selfEditInput: {
    backgroundColor: colors.bgApp,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 12
  },
  selfEditActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 14
  },
  selfEditCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  selfEditCancelText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: typography.weight.medium
  },
  selfEditSaveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100
  },
  selfEditSaveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: typography.weight.bold
  }
});
