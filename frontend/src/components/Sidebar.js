import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors, typography } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export function Sidebar({ activeTab, onSelectTab }) {
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'institution_admin';
  const isFaculty = user?.role === 'faculty' || user?.role === 'instructor';
  const isStudent = user?.role === 'student';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', roles: ['super_admin', 'faculty', 'student'] },
    { id: 'schedule', label: 'Class Timetable', icon: '📅', badge: 'Live', roles: ['super_admin', 'faculty', 'student'] },
    { id: 'materials', label: 'Syllabus & Notes', icon: '📚', roles: ['super_admin', 'faculty', 'student'] },
    { id: 'students', label: isStudent ? 'Class Directory' : 'Student Database', icon: '👨‍🎓', roles: ['super_admin', 'faculty'] },
    { id: 'faculty-directory', label: 'Faculty Directory', icon: '👨‍🏫', roles: ['super_admin'] },
    { id: 'attendance', label: 'Attendance Register', icon: '📋', badge: 'Live', roles: ['super_admin', 'faculty'] },
    { id: 'exams', label: isStudent ? 'Exam Results' : 'Examinations & Marks', icon: '📝', badge: 'Core', roles: ['super_admin', 'faculty', 'student'] },
    { id: 'quizzes', label: 'Online Assessments', icon: '⏱️', roles: ['super_admin', 'faculty', 'student'] },
    { id: 'assignments', label: 'Assignments', icon: '📑', roles: ['super_admin', 'faculty', 'student'] },
    { id: 'certificates', label: isStudent ? 'Semester Grade Sheet' : 'University Grade Sheets', icon: '📜', badge: 'Official', roles: ['super_admin', 'faculty', 'student'] },
    { id: 'reports', label: isFaculty ? 'Gradebook & Internal Marks' : 'Analytics & Reports', icon: '📊', roles: ['super_admin', 'faculty'] },
    { id: 'academics', label: 'Academic Structure', icon: '🏛️', roles: ['super_admin'] },
    { id: 'admin', label: 'SaaS Administration', icon: '⚙️', roles: ['super_admin'] },
    { id: 'calendar', label: 'Academic Calendar', icon: '🗓️', badge: 'Active', roles: ['super_admin', 'faculty', 'student'] },
    { id: 'announcements', label: 'Circulars & Notices', icon: '📢', roles: ['super_admin', 'faculty', 'student'] }
  ];

  const visibleItems = navItems.filter(item => {
    if (isSuperAdmin) return true;
    if (isFaculty) return item.roles.includes('faculty');
    if (isStudent) return item.roles.includes('student');
    return true;
  });

  return (
    <View style={styles.sidebar}>
      <Text style={styles.sectionHeader}>ACADEMIC NAVIGATION</Text>
      
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        {visibleItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.item, isActive && styles.itemActive]}
              onPress={() => onSelectTab(item.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.itemIcon}>{item.icon}</Text>
              <Text style={[styles.itemLabel, isActive && styles.itemLabelActive]}>
                {item.label}
              </Text>
              {item.badge && (
                <View style={[styles.badge, isActive && styles.badgeActive]}>
                  <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                    {item.badge}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.divider} />

      {/* College Info Card */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Zenora College LMS</Text>
        <Text style={styles.infoDesc}>Anna Univ Reg 2021</Text>
        <View style={styles.onlinePill}>
          <View style={styles.greenDot} />
          <Text style={styles.onlineText}>MySQL Connected</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 250,
    backgroundColor: colors.bgDark,
    borderRightWidth: 1,
    borderRightColor: colors.borderLight,
    paddingVertical: 18,
    paddingHorizontal: 12
  },
  scroll: {
    flex: 1
  },
  sectionHeader: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.2,
    paddingHorizontal: 12,
    marginBottom: 12
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4
  },
  itemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)'
  },
  itemIcon: {
    fontSize: 18,
    marginRight: 12
  },
  itemLabel: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium
  },
  itemLabelActive: {
    color: colors.textPrimary,
    fontWeight: typography.weight.bold
  },
  badge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  badgeActive: {
    backgroundColor: colors.primary
  },
  badgeText: {
    fontSize: 9,
    fontWeight: typography.weight.bold,
    color: colors.primaryLight
  },
  badgeTextActive: {
    color: '#FFF'
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 14
  },
  infoBox: {
    backgroundColor: colors.bgCard,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  infoTitle: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: typography.weight.bold
  },
  infoDesc: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentEmerald,
    marginRight: 6
  },
  onlineText: {
    color: colors.accentEmerald,
    fontSize: 10,
    fontWeight: typography.weight.semibold
  }
});
