import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useWindowDimensions, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, typography } from './src/theme/colors';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { Header } from './src/components/Header';
import { Sidebar } from './src/components/Sidebar';
import { Modal } from './src/components/Modal';

// Academic LMS Screens
import { AuthScreen } from './src/screens/AuthScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { StudentsScreen } from './src/screens/StudentsScreen';
import { ExamsScreen } from './src/screens/ExamsScreen';
import { AcademicStructureScreen } from './src/screens/AcademicStructureScreen';
import { AssignmentsScreen } from './src/screens/AssignmentsScreen';
import { StudyMaterialsScreen } from './src/screens/StudyMaterialsScreen';
import { ScheduleScreen } from './src/screens/ScheduleScreen';
import { AnnouncementsScreen } from './src/screens/AnnouncementsScreen';
import { AttendanceRegisterScreen } from './src/screens/AttendanceRegisterScreen';
import { FacultyDirectoryScreen } from './src/screens/FacultyDirectoryScreen';

// Core Enterprise Modules
import { CoursesScreen } from './src/screens/CoursesScreen';
import { CourseDetailScreen } from './src/screens/CourseDetailScreen';
import { LessonPlayerScreen } from './src/screens/LessonPlayerScreen';
import { QuizzesScreen } from './src/screens/QuizzesScreen';
import { CertificatesScreen } from './src/screens/CertificatesScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { AdminManagementScreen } from './src/screens/AdminManagementScreen';
import { AcademicCalendarScreen } from './src/screens/AcademicCalendarScreen';
import { useResponsive } from './src/utils/responsive';
import { getPlatformBadge, isWindows } from './src/utils/platform';

function MainApp() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [attendanceParams, setAttendanceParams] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isMobile, isTablet, isDesktop, width } = useResponsive();

  // When user logs in or switches, automatically route to the primary dashboard
  React.useEffect(() => {
    if (user) {
      setActiveTab('dashboard');
      setSelectedCourseId(null);
      setSelectedLessonId(null);
      setAttendanceParams(null);
    }
  }, [user?.id, user?.role]);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const handleSelectTab = (tab, params = null) => {
    let targetTab = tab;
    // Permanently retired Course & Curriculum - redirect to institutional Syllabus & Notes
    if (tab === 'courses') {
      targetTab = 'materials';
    }
    if (tab === 'attendance' && params) {
      setAttendanceParams(params);
    }
    setActiveTab(targetTab);
    if (mobileMenuOpen) setMobileMenuOpen(false);
  };

  const mobileBottomNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'schedule', label: 'Timetable', icon: '📅' },
    { id: 'materials', label: 'Syllabus', icon: '📚' },
    { id: 'exams', label: 'Exams', icon: '📝' },
    { id: 'assignments', label: 'Tasks', icon: '📑' }
  ];

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Header onToggleMobileMenu={isMobile ? () => setMobileMenuOpen(!mobileMenuOpen) : null} />

      <View style={styles.body}>
        {/* Desktop Sidebar */}
        {!isMobile && (
          <Sidebar activeTab={activeTab} onSelectTab={handleSelectTab} />
        )}

        <View style={styles.contentArea}>
          {activeTab === 'dashboard' && <DashboardScreen onNavigate={handleSelectTab} />}
          
          {/* Institutional Syllabus & Notes fallback */}
          {activeTab === 'courses' && <StudyMaterialsScreen />}

          {/* 2. Online Assessments & Quizzes */}
          {activeTab === 'quizzes' && <QuizzesScreen />}

          {/* 3. Verifiable Credentials & Certificates */}
          {activeTab === 'certificates' && <CertificatesScreen />}

          {/* 4. Analytics & Reports */}
          {activeTab === 'reports' && <ReportsScreen />}

          {/* 5. SaaS Administration */}
          {activeTab === 'admin' && <AdminManagementScreen />}

          {/* Standard Academic LMS Screens */}
          {activeTab === 'students' && <StudentsScreen />}
          {activeTab === 'faculty-directory' && <FacultyDirectoryScreen onNavigate={handleSelectTab} />}
          {activeTab === 'attendance' && <AttendanceRegisterScreen initialParams={attendanceParams} />}
          {activeTab === 'exams' && <ExamsScreen />}
          {activeTab === 'academics' && <AcademicStructureScreen />}
          {activeTab === 'assignments' && <AssignmentsScreen />}
          {activeTab === 'materials' && <StudyMaterialsScreen />}
          {activeTab === 'calendar' && <AcademicCalendarScreen />}
          {activeTab === 'schedule' && <ScheduleScreen onNavigate={handleSelectTab} />}
          {activeTab === 'announcements' && <AnnouncementsScreen />}
        </View>
      </View>

      {/* Mobile Bottom Navigation Bar */}
      {isMobile && (
        <View style={styles.mobileBottomNav}>
          {mobileBottomNavItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.mobileNavItem, isActive && styles.mobileNavItemActive]}
                onPress={() => handleSelectTab(item.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.mobileNavIcon}>{item.icon}</Text>
                <Text style={[styles.mobileNavLabel, isActive && styles.mobileNavLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Mobile Drawer Modal for full academic navigation */}
      {isMobile && mobileMenuOpen && (
        <Modal
          visible={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          title="College Academic Menu"
        >
          <ScrollView style={{ maxHeight: 480 }}>
            <Sidebar
              activeTab={activeTab}
              onSelectTab={(tab) => {
                handleSelectTab(tab);
                setMobileMenuOpen(false);
              }}
            />
          </ScrollView>
        </Modal>
      )}
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: Platform.OS === 'web' ? '100vh' : '100%',
    backgroundColor: colors.bgDark
  },
  loadingScreen: {
    flex: 1,
    minHeight: Platform.OS === 'web' ? '100vh' : '100%',
    backgroundColor: colors.bgDark,
    alignItems: 'center',
    justifyContent: 'center'
  },
  body: {
    flex: 1,
    flexDirection: 'row'
  },
  contentArea: {
    flex: 1,
    backgroundColor: colors.bgDark
  },
  mobileBottomNav: {
    height: 60,
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8
  },
  mobileNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8
  },
  mobileNavItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)'
  },
  mobileNavIcon: {
    fontSize: 18
  },
  mobileNavLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: typography.weight.medium
  },
  mobileNavLabelActive: {
    color: colors.primaryLight,
    fontWeight: typography.weight.bold
  }
});
