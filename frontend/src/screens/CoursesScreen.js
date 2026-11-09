import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { colors, typography } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { GlassCard } from '../components/GlassCard';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';

export function CoursesScreen({ onSelectCourse }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState('');
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create Course Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSemester, setNewSemester] = useState('4');
  const [newDifficulty, setNewDifficulty] = useState('all_levels');
  const [newDuration, setNewDuration] = useState('12');
  const [creating, setCreating] = useState(false);

  const isStaff = ['super_admin', 'institution_admin', 'instructor', 'faculty'].includes(user?.role);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let queryParams = [];
      if (selectedCat) queryParams.push(`category=${encodeURIComponent(selectedCat)}`);
      if (difficulty) queryParams.push(`difficulty=${encodeURIComponent(difficulty)}`);
      if (search.trim()) queryParams.push(`search=${encodeURIComponent(search.trim())}`);

      const [cRes, catRes] = await Promise.all([
        api.getCourses(queryParams.join('&')),
        api.getCategories ? api.getCategories() : api.apiRequest('/courses/meta/categories')
      ]);

      // Check course response
      if (!cRes.ok || !cRes.data || cRes.data.success === false) {
        const errorMsg = cRes.data?.message || `Unable to load courses (HTTP ${cRes.status || 'Connection Error'}).`;
        setError(errorMsg);
        setCourses([]);
      } else {
        const courseList = Array.isArray(cRes.data.data)
          ? cRes.data.data
          : Array.isArray(cRes.data)
          ? cRes.data
          : [];
        setCourses(courseList);
        setError(null);
      }

      // Check categories response
      if (catRes && catRes.ok && catRes.data && catRes.data.success) {
        setCategories(Array.isArray(catRes.data.data) ? catRes.data.data : []);
      }
    } catch (err) {
      console.error('[Load Courses Error]', err);
      setError(err?.message || 'Failed to connect to the course server. Please verify backend service.');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCat, difficulty, search]);

  useEffect(() => {
    loadCourses();
  }, [selectedCat, difficulty, user?.role]);

  const handleSearchSubmit = () => {
    loadCourses();
  };

  const handleClearSearch = () => {
    setSearch('');
    // Trigger reload with cleared search
    setTimeout(() => {
      loadCourses();
    }, 0);
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCat('');
    setDifficulty('');
  };

  const handleCreateCourse = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await api.createCourse({
        title: newTitle.trim(),
        subtitle: newSubtitle.trim(),
        description: newDesc.trim(),
        difficulty_level: newDifficulty,
        estimated_duration_hours: Number(newDuration) || 12,
        price: 0,
        is_free: true,
        enrolment_mode: 'institutional'
      });

      if (res.ok && res.data.success) {
        setShowCreateModal(false);
        setNewTitle('');
        setNewSubtitle('');
        setNewDesc('');
        loadCourses();
      } else {
        alert(res.data?.message || 'Failed to create course draft.');
      }
    } catch (err) {
      console.error('[Create Course Error]', err);
      alert('An unexpected error occurred while saving the course.');
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicateCourse = async (id, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      await api.duplicateCourse(id);
      loadCourses();
    } catch (err) {
      console.error('[Duplicate Course Error]', err);
    }
  };

  const handleArchiveCourse = async (id, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      await api.archiveCourse(id);
      loadCourses();
    } catch (err) {
      console.error('[Archive Course Error]', err);
    }
  };

  const difficultyOptions = [
    { label: 'All Levels', value: '' },
    { label: 'Beginner', value: 'beginner' },
    { label: 'Intermediate', value: 'intermediate' },
    { label: 'Advanced', value: 'advanced' }
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Header & Search */}
      <View style={styles.headerRow}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.headerTitle}>
            {isStaff ? 'Course & Curriculum Management' : 'Course & Curriculum Directory'}
          </Text>
          <Text style={styles.headerSub}>
            {isStaff
              ? 'Create, structure lessons, publish modules, and track student coursework.'
              : 'Browse accredited curriculum courses, access lecture modules, and download study materials.'}
          </Text>
        </View>

        {isStaff && (
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.createBtnText}>+ New Course</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search & Filter Toolbar */}
      <View style={styles.filterBar}>
        {/* Search Input Row */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by title, topic, or keyword..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.searchBtn} onPress={handleSearchSubmit} activeOpacity={0.8}>
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Category Topic Pills */}
        <View style={styles.pillSection}>
          <Text style={styles.filterSectionLabel}>TOPICS:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            <TouchableOpacity
              style={[styles.catPill, !selectedCat && styles.catPillActive]}
              onPress={() => setSelectedCat('')}
              activeOpacity={0.8}
            >
              <Text style={[styles.catPillText, !selectedCat && styles.catPillTextActive]}>All Topics</Text>
            </TouchableOpacity>
            {categories.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.catPill, selectedCat === c.id && styles.catPillActive]}
                onPress={() => setSelectedCat(c.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.catPillText, selectedCat === c.id && styles.catPillTextActive]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Difficulty Filter Pills */}
        <View style={[styles.pillSection, { marginTop: 10 }]}>
          <Text style={styles.filterSectionLabel}>LEVEL:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {difficultyOptions.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.diffPill, difficulty === opt.value && styles.diffPillActive]}
                onPress={() => setDifficulty(opt.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.diffPillText, difficulty === opt.value && styles.diffPillTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Main Content: Loading, Error, Empty, or Course Grid */}
      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading academic courses...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateContainer}>
          <View style={styles.errorCard}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Unable to Load Courses</Text>
            <Text style={styles.errorSub}>{error}</Text>
            <View style={styles.errorActionRow}>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={loadCourses}
                activeOpacity={0.8}
              >
                <Text style={styles.retryBtnText}>🔄 Retry Loading Courses</Text>
              </TouchableOpacity>
              {(search || selectedCat || difficulty) && (
                <TouchableOpacity
                  style={styles.resetFilterBtn}
                  onPress={handleResetFilters}
                  activeOpacity={0.8}
                >
                  <Text style={styles.resetFilterBtnText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      ) : courses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyTitle}>No courses available</Text>
          <Text style={styles.emptySub}>
            {search || selectedCat || difficulty
              ? 'No courses match your active search or filters. Try adjusting your query or resetting filters.'
              : 'There are currently no published courses available in the curriculum.'}
          </Text>
          {(search || selectedCat || difficulty) ? (
            <TouchableOpacity
              style={styles.resetFilterBtn}
              onPress={handleResetFilters}
              activeOpacity={0.8}
            >
              <Text style={styles.resetFilterBtnText}>Reset All Filters</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <View>
          <View style={styles.resultSummaryRow}>
            <Text style={styles.resultCountText}>
              Showing {courses.length} course{courses.length === 1 ? '' : 's'}
              {selectedCat ? ` in selected category` : ''}
              {difficulty ? ` (${difficulty})` : ''}
            </Text>
          </View>

          <View style={styles.grid}>
            {courses.map(course => (
              <TouchableOpacity
                key={course.id}
                style={styles.cardWrapper}
                activeOpacity={0.85}
                onPress={() => onSelectCourse(course.id)}
              >
                <GlassCard style={styles.card}>
                  <View style={styles.thumbWrapper}>
                    <Image
                      source={{ uri: course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=350&fit=crop' }}
                      style={styles.thumbnail}
                    />
                    <View style={styles.badgeOver}>
                      <Badge label={course.difficulty_level || 'all_levels'} variant="primary" />
                      <Badge label={course.status || 'published'} variant={course.status || 'published'} />
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.courseCategory}>{course.category_name || 'Technology'}</Text>
                    <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
                    <Text style={styles.courseSubtitle} numberOfLines={2}>{course.subtitle || course.description}</Text>

                    {/* Metadata Row */}
                    <View style={styles.metaRow}>
                      <Text style={styles.metaText}>⏱ {course.estimated_duration_hours || 10}h duration</Text>
                      <Text style={styles.metaText}>📖 {course.total_lessons || 0} lessons</Text>
                    </View>

                    {/* Instructor & Institutional Status */}
                    <View style={styles.footerRow}>
                      <View style={styles.instructorInfo}>
                        <Image
                          source={{ uri: course.instructor_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop' }}
                          style={styles.instructorImg}
                        />
                        <Text style={styles.instructorName} numberOfLines={1}>{course.instructor_name || 'Zenora Faculty'}</Text>
                      </View>

                      <View style={styles.institutionalTag}>
                        <Text style={styles.institutionalTagText}>🏛️ Institutional Course</Text>
                      </View>
                    </View>

                    {/* Course Access Call-To-Action */}
                    <View style={styles.cardAccessBtn}>
                      <Text style={styles.cardAccessBtnText}>
                        {course.is_enrolled ? 'Continue Coursework →' : 'Access Course Modules →'}
                      </Text>
                    </View>

                    {/* Student Enrolment Progress if enrolled */}
                    {course.is_enrolled && (
                      <View style={styles.enrolledProgressBox}>
                        <View style={styles.progressBar}>
                          <View style={[styles.progressFill, { width: `${course.user_progress || 0}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{course.user_progress || 0}% Complete</Text>
                      </View>
                    )}

                    {/* Staff Quick Actions */}
                    {isStaff && (
                      <View style={styles.staffActionRow}>
                        <TouchableOpacity
                          style={styles.miniActionBtn}
                          onPress={(e) => handleDuplicateCourse(course.id, e)}
                        >
                          <Text style={styles.miniActionText}>📋 Clone</Text>
                        </TouchableOpacity>
                        {course.status !== 'archived' && (
                          <TouchableOpacity
                            style={[styles.miniActionBtn, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}
                            onPress={(e) => handleArchiveCourse(course.id, e)}
                          >
                            <Text style={[styles.miniActionText, { color: colors.accentRose }]}>📁 Archive</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                </GlassCard>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Create Course Modal */}
      <Modal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Educational Course"
      >
        <View style={styles.modalForm}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Course Title *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Distributed Cloud Architecture 2026"
              placeholderTextColor={colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Subtitle / Short Description</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Master resilient systems and high-throughput databases"
              placeholderTextColor={colors.textMuted}
              value={newSubtitle}
              onChangeText={setNewSubtitle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Overview & Objectives</Text>
            <TextInput
              style={[styles.textInput, { height: 90 }]}
              multiline
              placeholder="Detailed syllabus, course requirements, and outcomes..."
              placeholderTextColor={colors.textMuted}
              value={newDesc}
              onChangeText={setNewDesc}
            />
          </View>

          <View style={styles.twoInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Estimated Hours</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={newDuration}
                onChangeText={setNewDuration}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Academic Semester</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                placeholder="e.g. 4"
                placeholderTextColor={colors.textMuted}
                value={newSemester}
                onChangeText={setNewSemester}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.saveCourseBtn}
            onPress={handleCreateCourse}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveCourseText}>Save Course as Draft</Text>
            )}
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
    padding: 24,
    paddingBottom: 60
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16
  },
  headerTextGroup: {
    flex: 1,
    minWidth: 260
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
    maxWidth: 700,
    lineHeight: 18
  },
  createBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    boxShadow: '0px 4px 12px rgba(99, 102, 241, 0.35)'
  },
  createBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: typography.weight.bold
  },
  filterBar: {
    marginBottom: 24
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.size.base,
    height: '100%',
    outlineStyle: 'none'
  },
  clearBtn: {
    padding: 6
  },
  clearBtnText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: 'bold'
  },
  searchBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  searchBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: typography.weight.bold
  },
  pillSection: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  filterSectionLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
    marginRight: 10,
    minWidth: 46
  },
  categoryScroll: {
    flexDirection: 'row'
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: 8
  },
  catPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  catPillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: typography.weight.medium
  },
  catPillTextActive: {
    color: '#FFF',
    fontWeight: typography.weight.bold
  },
  diffPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 8
  },
  diffPillActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: colors.primary
  },
  diffPillText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: typography.weight.medium
  },
  diffPillTextActive: {
    color: colors.primaryLight,
    fontWeight: typography.weight.bold
  },
  resultSummaryRow: {
    marginBottom: 16
  },
  resultCountText: {
    color: colors.textMuted,
    fontSize: 12
  },
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    minHeight: 280
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    marginTop: 14,
    fontWeight: typography.weight.medium
  },
  errorCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    maxWidth: 500,
    width: '100%'
  },
  errorIcon: {
    fontSize: 36,
    marginBottom: 10
  },
  errorTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: typography.weight.bold,
    marginBottom: 6
  },
  errorSub: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20
  },
  errorActionRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center'
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: typography.weight.bold
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 16,
    marginVertical: 10
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: typography.weight.bold
  },
  emptySub: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 6,
    maxWidth: 420,
    textAlign: 'center',
    lineHeight: 18
  },
  resetFilterBtn: {
    marginTop: 16,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  resetFilterBtnText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: typography.weight.semibold
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20
  },
  cardWrapper: {
    flexBasis: '31%',
    minWidth: 280
  },
  card: {
    padding: 0,
    overflow: 'hidden'
  },
  thumbWrapper: {
    position: 'relative',
    height: 160
  },
  thumbnail: {
    width: '100%',
    height: '100%'
  },
  badgeOver: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  cardBody: {
    padding: 16
  },
  courseCategory: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6
  },
  courseTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: typography.weight.bold,
    lineHeight: 20
  },
  courseSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)'
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 11
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14
  },
  instructorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10
  },
  instructorImg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8
  },
  instructorName: {
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1
  },
  institutionalTag: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)'
  },
  institutionalTagText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: typography.weight.bold
  },
  cardAccessBtn: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    alignItems: 'center'
  },
  cardAccessBtnText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: typography.weight.bold
  },
  enrolledProgressBox: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.bgSurface,
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressFill: {
    height: 6,
    backgroundColor: colors.accentEmerald
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right'
  },
  staffActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight
  },
  miniActionBtn: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    backgroundColor: colors.bgSurface
  },
  miniActionText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: typography.weight.medium
  },
  modalForm: {
    gap: 16
  },
  inputGroup: {
    gap: 6
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: typography.weight.medium
  },
  textInput: {
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 14
  },
  twoInputs: {
    flexDirection: 'row',
    gap: 12
  },
  saveCourseBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10
  },
  saveCourseText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: typography.weight.bold
  }
});
