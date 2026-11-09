import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert
} from 'react-native';
import { colors, typography } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Modal } from '../components/Modal';

// Event Type Color Schema & Meta
const EVENT_TYPE_CONFIG = {
  internal_exam: {
    label: 'Internal Exam',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    icon: '📝'
  },
  semester_exam: {
    label: 'Semester Exam',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
    icon: '🏛️'
  },
  college_program: {
    label: 'College Program / Fest',
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.35)',
    icon: '🎪'
  },
  holiday: {
    label: 'Official Holiday',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    icon: '🏖️'
  },
  assignment_deadline: {
    label: 'Academic Deadline',
    color: '#06B6D4',
    bgColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: 'rgba(6, 182, 212, 0.35)',
    icon: '📑'
  }
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function AcademicCalendarScreen() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'institution_admin';
  const isFaculty = user?.role === 'faculty' || user?.role === 'instructor';
  const canManageEvents = isSuperAdmin || isFaculty;

  // View state: 'month' | 'week' | 'agenda'
  const [viewMode, setViewMode] = useState('month');

  // Calendar Cursor Date (defaults to current date or October 2026 academic term)
  const [currentDate, setCurrentDate] = useState(() => {
    // Current academic term anchor: October 2026
    const d = new Date();
    // Default to current year & month, or year 2026 if matching session
    return new Date(2026, 9, 27); // Month index 9 = October
  });

  // Events list & loading
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter options
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');

  // Departments & Batches for pickers
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);

  // Modals state
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    id: null,
    title: '',
    description: '',
    event_type: 'internal_exam',
    start_date: '',
    end_date: '',
    target_department: 'ALL',
    target_batch: 'ALL'
  });

  useEffect(() => {
    loadEvents();
    loadMetadata();
  }, [currentDate.getFullYear(), currentDate.getMonth()]);

  async function loadMetadata() {
    try {
      const [deptRes, batchRes] = await Promise.all([
        api.getDepartments().catch(() => ({ ok: false })),
        api.getBatches().catch(() => ({ ok: false }))
      ]);
      if (deptRes.ok && deptRes.data?.success) setDepartments(deptRes.data.data || []);
      if (batchRes.ok && batchRes.data?.success) setBatches(batchRes.data.data || []);
    } catch (e) {
      // non-fatal
    }
  }

  async function loadEvents() {
    setLoading(true);
    setError(null);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // 1-indexed

      const res = await api.getCalendarEvents({ year, month });
      if (res.ok && res.data?.success) {
        setEvents(res.data.data || []);
      } else {
        // If empty or month has none, fallback to all events
        const allRes = await api.getCalendarEvents();
        if (allRes.ok && allRes.data?.success) {
          setEvents(allRes.data.data || []);
        } else {
          setError(res.data?.message || 'Failed to load academic events.');
        }
      }
    } catch (err) {
      console.error('[Calendar Load Error]', err);
      setError('Unable to load calendar events from server.');
    } finally {
      setLoading(false);
    }
  }

  // Navigation handlers
  function handlePrev() {
    if (viewMode === 'week') {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(prevWeek.getDate() - 7);
      setCurrentDate(prevWeek);
    } else {
      const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      setCurrentDate(prevMonth);
    }
  }

  function handleNext() {
    if (viewMode === 'week') {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(nextWeek.getDate() + 7);
      setCurrentDate(nextWeek);
    } else {
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      setCurrentDate(nextMonth);
    }
  }

  function handleToday() {
    setCurrentDate(new Date(2026, 9, 27)); // Academic target date
  }

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (selectedTypeFilter !== 'ALL' && e.event_type !== selectedTypeFilter) return false;
      if (selectedDeptFilter !== 'ALL') {
        if (e.target_department && e.target_department !== 'ALL' && e.target_department !== selectedDeptFilter && e.target_department_id !== selectedDeptFilter) {
          return false;
        }
      }
      return true;
    });
  }, [events, selectedTypeFilter, selectedDeptFilter]);

  // Counts for Category Pills
  const categoryCounts = useMemo(() => {
    const counts = {
      internal_exam: 0,
      semester_exam: 0,
      college_program: 0,
      holiday: 0,
      assignment_deadline: 0
    };
    events.forEach(e => {
      if (counts[e.event_type] !== undefined) counts[e.event_type]++;
    });
    return counts;
  }, [events]);

  // Month Grid Computation
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of month (0 = Sun, 1 = Mon ... 6 = Sat)
    const firstDayDate = new Date(year, month, 1);
    let startDayOfWeek = firstDayDate.getDay();
    // Convert Sunday=0 to Monday=0 (Mon=0, Tue=1 ... Sun=6)
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    // Total days in month
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    // Days in previous month
    const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month padding days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = totalDaysInPrevMonth - i;
      const dateObj = new Date(year, month - 1, dayNum);
      days.push({
        dateNumber: dayNum,
        fullDate: dateObj,
        isCurrentMonth: false,
        isToday: false
      });
    }

    // Current month days
    const today = new Date();
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const dateObj = new Date(year, month, i);
      const isToday =
        dateObj.getFullYear() === 2026 &&
        dateObj.getMonth() === 9 &&
        dateObj.getDate() === 27;

      days.push({
        dateNumber: i,
        fullDate: dateObj,
        isCurrentMonth: true,
        isToday
      });
    }

    // Next month padding days to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const dateObj = new Date(year, month + 1, i);
      days.push({
        dateNumber: i,
        fullDate: dateObj,
        isCurrentMonth: false,
        isToday: false
      });
    }

    return days;
  }, [currentDate]);

  // Map events to day cells
  function getEventsForDate(date) {
    const checkTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

    return filteredEvents.filter(e => {
      const s = new Date(e.start_date);
      const startTime = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();

      const end = new Date(e.end_date || e.start_date);
      const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();

      return checkTime >= startTime && checkTime <= endTime;
    });
  }

  // Week View Days Computation
  const weekDays = useMemo(() => {
    const current = new Date(currentDate);
    // Find Monday of the current week
    let day = current.getDay();
    day = day === 0 ? 6 : day - 1; // Mon = 0, Sun = 6
    const monday = new Date(current);
    monday.setDate(current.getDate() - day);

    const result = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const isToday =
        d.getFullYear() === 2026 &&
        d.getMonth() === 9 &&
        d.getDate() === 27;
      result.push({
        dayName: WEEK_DAYS[i],
        dateNumber: d.getDate(),
        fullDate: d,
        isToday
      });
    }
    return result;
  }, [currentDate]);

  // CRUD Operations
  function openCreateModal(defaultDate = null) {
    if (!canManageEvents) return;
    setIsEditing(false);
    setFormError(null);

    const baseDate = defaultDate ? new Date(defaultDate) : new Date(currentDate);
    const dateStr = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(baseDate.getDate()).padStart(2, '0')}`;

    setFormData({
      id: null,
      title: '',
      description: '',
      event_type: 'internal_exam',
      start_date: `${dateStr}T09:30`,
      end_date: `${dateStr}T16:30`,
      target_department: 'ALL',
      target_batch: 'ALL'
    });
    setIsFormModalOpen(true);
  }

  function openEditModal(event) {
    if (!canManageEvents || !event) return;
    setIsEditing(true);
    setFormError(null);

    const s = event.start_date ? event.start_date.slice(0, 16) : '';
    const e = event.end_date ? event.end_date.slice(0, 16) : s;

    setFormData({
      id: event.id,
      title: event.title || '',
      description: event.description || '',
      event_type: event.event_type || 'internal_exam',
      start_date: s,
      end_date: e,
      target_department: event.target_department || 'ALL',
      target_batch: event.target_batch || 'ALL'
    });
    setIsDetailsModalOpen(false);
    setIsFormModalOpen(true);
  }

  async function handleSaveEvent() {
    setFormError(null);
    if (!formData.title.trim()) {
      setFormError('Please enter an event title.');
      return;
    }
    if (!formData.start_date) {
      setFormError('Please provide a valid start date and time.');
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        event_type: formData.event_type,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : new Date(formData.start_date).toISOString(),
        target_department: formData.target_department || 'ALL',
        target_batch: formData.target_batch || 'ALL'
      };

      if (isEditing && formData.id) {
        const res = await api.updateCalendarEvent(formData.id, payload);
        if (res.ok && res.data?.success) {
          setIsFormModalOpen(false);
          loadEvents();
        } else {
          setFormError(res.data?.message || 'Failed to update academic event.');
        }
      } else {
        const res = await api.createCalendarEvent(payload);
        if (res.ok && res.data?.success) {
          setIsFormModalOpen(false);
          loadEvents();
        } else {
          setFormError(res.data?.message || 'Failed to schedule academic event.');
        }
      }
    } catch (err) {
      console.error('[Event Save Error]', err);
      setFormError('Failed to communicate with server.');
    } finally {
      setFormSubmitting(false);
    }
  }

  function handleDeleteEvent(event) {
    if (!canManageEvents || !event) return;

    const confirmAction = () => {
      api.deleteCalendarEvent(event.id).then(res => {
        if (res.ok && res.data?.success) {
          setIsDetailsModalOpen(false);
          loadEvents();
        } else {
          Alert.alert('Error', res.data?.message || 'Failed to delete event.');
        }
      }).catch(() => {
        Alert.alert('Error', 'Unable to delete event.');
      });
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete "${event.title}" from the academic calendar?`)) {
        confirmAction();
      }
    } else {
      Alert.alert(
        'Confirm Deletion',
        `Are you sure you want to delete "${event.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: confirmAction }
        ]
      );
    }
  }

  function handleEventClick(event) {
    setSelectedEvent(event);
    setIsDetailsModalOpen(true);
  }

  function formatDateTimeRange(startStr, endStr) {
    if (!startStr) return '';
    const s = new Date(startStr);
    const e = endStr ? new Date(endStr) : s;

    const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit' };

    const startDatePart = s.toLocaleDateString('en-US', dateOptions);
    const startTimePart = s.toLocaleTimeString('en-US', timeOptions);

    const endDatePart = e.toLocaleDateString('en-US', dateOptions);
    const endTimePart = e.toLocaleTimeString('en-US', timeOptions);

    if (startDatePart === endDatePart) {
      return `${startDatePart} • ${startTimePart} - ${endTimePart}`;
    }
    return `${startDatePart} (${startTimePart}) → ${endDatePart} (${endTimePart})`;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header Banner */}
      <View style={styles.headerCard}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <Text style={styles.headerIcon}>🗓️</Text>
            <Text style={styles.headerTitle}>Academic Events Calendar</Text>
            <View style={styles.activeTermPill}>
              <Text style={styles.activeTermText}>Semester 4 & 6 Term</Text>
            </View>
          </View>
          <Text style={styles.headerSub}>
            Official institutional calendar for continuous assessments, semester examinations, college programs, symposiums, and submission deadlines.
          </Text>
        </View>

        <View style={styles.headerActions}>
          {/* View Mode Toggle */}
          <View style={styles.viewToggleGroup}>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'month' && styles.viewToggleBtnActive]}
              onPress={() => setViewMode('month')}
              activeOpacity={0.8}
            >
              <Text style={[styles.viewToggleText, viewMode === 'month' && styles.viewToggleTextActive]}>
                Month View
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'week' && styles.viewToggleBtnActive]}
              onPress={() => setViewMode('week')}
              activeOpacity={0.8}
            >
              <Text style={[styles.viewToggleText, viewMode === 'week' && styles.viewToggleTextActive]}>
                Week View
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'agenda' && styles.viewToggleBtnActive]}
              onPress={() => setViewMode('agenda')}
              activeOpacity={0.8}
            >
              <Text style={[styles.viewToggleText, viewMode === 'agenda' && styles.viewToggleTextActive]}>
                Agenda List
              </Text>
            </TouchableOpacity>
          </View>

          {/* Add Event Button for Faculty & Admin */}
          {canManageEvents && (
            <TouchableOpacity
              style={styles.addEventBtn}
              onPress={() => openCreateModal()}
              activeOpacity={0.85}
            >
              <Text style={styles.addEventBtnIcon}>➕</Text>
              <Text style={styles.addEventBtnText}>Add Event</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Calendar Controls & Navigation Bar */}
      <View style={styles.navBar}>
        <View style={styles.navControlsLeft}>
          <TouchableOpacity style={styles.navArrowBtn} onPress={handlePrev} activeOpacity={0.7}>
            <Text style={styles.navArrowText}>◀</Text>
          </TouchableOpacity>

          <Text style={styles.currentMonthLabel}>
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Text>

          <TouchableOpacity style={styles.navArrowBtn} onPress={handleNext} activeOpacity={0.7}>
            <Text style={styles.navArrowText}>▶</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.todayBtn} onPress={handleToday} activeOpacity={0.7}>
            <Text style={styles.todayBtnText}>Today</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Dropdowns */}
        <View style={styles.filterRow}>
          {/* Department Filter */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Dept:</Text>
            <View style={styles.pickerWrap}>
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                style={webSelectStyle}
              >
                <option value="ALL">All Departments</option>
                <option value="dept-cse-01">Computer Science (CSE)</option>
                <option value="dept-it-02">Information Tech (IT)</option>
                <option value="dept-ece-03">Electronics (ECE)</option>
                <option value="dept-aids-04">AI & Data Science (AIDS)</option>
              </select>
            </View>
          </View>

          {/* Event Type Filter */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Type:</Text>
            <View style={styles.pickerWrap}>
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                style={webSelectStyle}
              >
                <option value="ALL">All Event Types</option>
                <option value="internal_exam">📝 Internal Exams</option>
                <option value="semester_exam">🏛️ Semester Exams</option>
                <option value="college_program">🎪 College Programs & Fests</option>
                <option value="holiday">🏖️ Holidays</option>
                <option value="assignment_deadline">📑 Academic Deadlines</option>
              </select>
            </View>
          </View>
        </View>
      </View>

      {/* Legend & Category Overview Bar */}
      <View style={styles.legendBar}>
        <View style={[styles.legendPill, { borderColor: EVENT_TYPE_CONFIG.internal_exam.borderColor }]}>
          <View style={[styles.legendDot, { backgroundColor: EVENT_TYPE_CONFIG.internal_exam.color }]} />
          <Text style={styles.legendText}>Internal Exams ({categoryCounts.internal_exam})</Text>
        </View>

        <View style={[styles.legendPill, { borderColor: EVENT_TYPE_CONFIG.semester_exam.borderColor }]}>
          <View style={[styles.legendDot, { backgroundColor: EVENT_TYPE_CONFIG.semester_exam.color }]} />
          <Text style={styles.legendText}>Semester Exams ({categoryCounts.semester_exam})</Text>
        </View>

        <View style={[styles.legendPill, { borderColor: EVENT_TYPE_CONFIG.college_program.borderColor }]}>
          <View style={[styles.legendDot, { backgroundColor: EVENT_TYPE_CONFIG.college_program.color }]} />
          <Text style={styles.legendText}>Programs & Fests ({categoryCounts.college_program})</Text>
        </View>

        <View style={[styles.legendPill, { borderColor: EVENT_TYPE_CONFIG.holiday.borderColor }]}>
          <View style={[styles.legendDot, { backgroundColor: EVENT_TYPE_CONFIG.holiday.color }]} />
          <Text style={styles.legendText}>Holidays ({categoryCounts.holiday})</Text>
        </View>

        <View style={[styles.legendPill, { borderColor: EVENT_TYPE_CONFIG.assignment_deadline.borderColor }]}>
          <View style={[styles.legendDot, { backgroundColor: EVENT_TYPE_CONFIG.assignment_deadline.color }]} />
          <Text style={styles.legendText}>Deadlines ({categoryCounts.assignment_deadline})</Text>
        </View>
      </View>

      {/* Loading & Error States */}
      {loading && (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading institutional calendar...</Text>
        </View>
      )}

      {error && !loading && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadEvents}>
            <Text style={styles.retryBtnText}>Retry Loading</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MONTH VIEW */}
      {!loading && !error && viewMode === 'month' && (
        <View style={styles.calendarContainer}>
          {/* Day of Week Header Row */}
          <View style={styles.weekHeaderRow}>
            {WEEK_DAYS.map(day => (
              <View key={day} style={styles.weekHeaderCell}>
                <Text style={styles.weekHeaderText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.monthGrid}>
            {monthDays.map((dayItem, index) => {
              const dayEvents = getEventsForDate(dayItem.fullDate);
              const maxVisible = 2;
              const overflow = dayEvents.length - maxVisible;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    !dayItem.isCurrentMonth && styles.dayCellMuted,
                    dayItem.isToday && styles.dayCellToday
                  ]}
                  activeOpacity={canManageEvents ? 0.7 : 1}
                  onPress={() => {
                    if (dayEvents.length > 0) {
                      handleEventClick(dayEvents[0]);
                    } else if (canManageEvents) {
                      openCreateModal(dayItem.fullDate);
                    }
                  }}
                >
                  <View style={styles.dayTopRow}>
                    <View style={[styles.dateBadge, dayItem.isToday && styles.dateBadgeToday]}>
                      <Text style={[styles.dateText, dayItem.isToday && styles.dateTextToday]}>
                        {dayItem.dateNumber}
                      </Text>
                    </View>
                    {dayItem.isToday && (
                      <View style={styles.todayPill}>
                        <Text style={styles.todayPillText}>TODAY</Text>
                      </View>
                    )}
                  </View>

                  {/* Day Events Tags */}
                  <View style={styles.dayEventsList}>
                    {dayEvents.slice(0, maxVisible).map(evt => {
                      const cfg = EVENT_TYPE_CONFIG[evt.event_type] || EVENT_TYPE_CONFIG.internal_exam;
                      return (
                        <TouchableOpacity
                          key={evt.id}
                          style={[styles.eventTag, { backgroundColor: cfg.bgColor, borderColor: cfg.borderColor }]}
                          onPress={(e) => {
                            if (Platform.OS === 'web') e.stopPropagation();
                            handleEventClick(evt);
                          }}
                          activeOpacity={0.8}
                          title={`${evt.title} (${cfg.label})`}
                        >
                          <Text style={styles.eventTagIcon}>{cfg.icon}</Text>
                          <Text style={[styles.eventTagText, { color: cfg.color }]} numberOfLines={1}>
                            {evt.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                    {overflow > 0 && (
                      <TouchableOpacity
                        style={styles.overflowBadge}
                        onPress={() => handleEventClick(dayEvents[0])}
                      >
                        <Text style={styles.overflowText}>+{overflow} more</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* WEEK VIEW */}
      {!loading && !error && viewMode === 'week' && (
        <View style={styles.weekViewContainer}>
          <View style={styles.weekColumnsRow}>
            {weekDays.map((col, idx) => {
              const dayEvents = getEventsForDate(col.fullDate);
              return (
                <View key={idx} style={[styles.weekCol, col.isToday && styles.weekColToday]}>
                  <View style={[styles.weekColHeader, col.isToday && styles.weekColHeaderToday]}>
                    <Text style={styles.weekColDayName}>{col.dayName}</Text>
                    <Text style={[styles.weekColDateNum, col.isToday && styles.weekColDateNumToday]}>
                      {col.dateNumber}
                    </Text>
                  </View>

                  <ScrollView style={styles.weekEventsScroll}>
                    {dayEvents.length === 0 ? (
                      <View style={styles.weekEmptyCell}>
                        <Text style={styles.weekEmptyText}>No events</Text>
                        {canManageEvents && (
                          <TouchableOpacity
                            style={styles.quickAddLink}
                            onPress={() => openCreateModal(col.fullDate)}
                          >
                            <Text style={styles.quickAddText}>+ Add</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : (
                      dayEvents.map(evt => {
                        const cfg = EVENT_TYPE_CONFIG[evt.event_type] || EVENT_TYPE_CONFIG.internal_exam;
                        return (
                          <TouchableOpacity
                            key={evt.id}
                            style={[styles.weekEventCard, { borderColor: cfg.borderColor, backgroundColor: cfg.bgColor }]}
                            onPress={() => handleEventClick(evt)}
                            activeOpacity={0.8}
                          >
                            <View style={styles.weekEventTop}>
                              <Text style={[styles.weekEventTypePill, { color: cfg.color }]}>
                                {cfg.icon} {cfg.label}
                              </Text>
                            </View>
                            <Text style={styles.weekEventTitle} numberOfLines={2}>{evt.title}</Text>
                            <Text style={styles.weekEventTarget}>
                              👥 {evt.department_name || evt.target_department}
                            </Text>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* AGENDA / LIST VIEW */}
      {!loading && !error && viewMode === 'agenda' && (
        <View style={styles.agendaContainer}>
          {filteredEvents.length === 0 ? (
            <View style={styles.agendaEmptyBox}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🗓️</Text>
              <Text style={styles.agendaEmptyTitle}>No Academic Events Found</Text>
              <Text style={styles.agendaEmptySub}>No events match your current department or type filters.</Text>
            </View>
          ) : (
            filteredEvents.map(evt => {
              const cfg = EVENT_TYPE_CONFIG[evt.event_type] || EVENT_TYPE_CONFIG.internal_exam;
              return (
                <View key={evt.id} style={[styles.agendaCard, { borderLeftColor: cfg.color }]}>
                  <View style={styles.agendaCardLeft}>
                    <View style={[styles.agendaIconWrap, { backgroundColor: cfg.bgColor }]}>
                      <Text style={{ fontSize: 24 }}>{cfg.icon}</Text>
                    </View>
                    <View style={styles.agendaMainInfo}>
                      <View style={styles.agendaBadgeRow}>
                        <View style={[styles.typeBadgePill, { backgroundColor: cfg.bgColor, borderColor: cfg.borderColor }]}>
                          <Text style={[styles.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                        <Text style={styles.agendaTargetBadge}>
                          Department: {evt.department_name || evt.target_department}
                        </Text>
                      </View>
                      <Text style={styles.agendaTitle}>{evt.title}</Text>
                      {evt.description ? (
                        <Text style={styles.agendaDesc} numberOfLines={2}>{evt.description}</Text>
                      ) : null}
                      <Text style={styles.agendaTimeRange}>
                        📅 {formatDateTimeRange(evt.start_date, evt.end_date)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.agendaActions}>
                    <TouchableOpacity
                      style={styles.detailsBtn}
                      onPress={() => handleEventClick(evt)}
                    >
                      <Text style={styles.detailsBtnText}>View Details →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* EVENT DETAILS MODAL */}
      <Modal
        visible={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="Academic Event Briefing"
        maxWidth={620}
      >
        {selectedEvent && (() => {
          const cfg = EVENT_TYPE_CONFIG[selectedEvent.event_type] || EVENT_TYPE_CONFIG.internal_exam;
          return (
            <View style={styles.detailsModalContent}>
              <View style={styles.modalHeroBadgeRow}>
                <View style={[styles.modalTypePill, { backgroundColor: cfg.bgColor, borderColor: cfg.borderColor }]}>
                  <Text style={[styles.modalTypePillText, { color: cfg.color }]}>
                    {cfg.icon} {cfg.label}
                  </Text>
                </View>
                <View style={styles.modalAudiencePill}>
                  <Text style={styles.modalAudienceText}>
                    Target: {selectedEvent.department_name || selectedEvent.target_department}
                  </Text>
                </View>
              </View>

              <Text style={styles.modalEventTitle}>{selectedEvent.title}</Text>

              {/* Schedule Info Box */}
              <View style={styles.modalInfoBox}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>📅 Date & Time:</Text>
                  <Text style={styles.infoValue}>
                    {formatDateTimeRange(selectedEvent.start_date, selectedEvent.end_date)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>🏛️ Department:</Text>
                  <Text style={styles.infoValue}>
                    {selectedEvent.department_name || selectedEvent.target_department || 'All Departments (College-Wide)'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>👨‍🎓 Target Cohort:</Text>
                  <Text style={styles.infoValue}>
                    {selectedEvent.batch_name || selectedEvent.target_batch || 'All Batches'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>👤 Organizer:</Text>
                  <Text style={styles.infoValue}>
                    {selectedEvent.creator_name || 'Academic Administration'} ({selectedEvent.creator_role || 'Staff'})
                  </Text>
                </View>
              </View>

              {/* Description */}
              <View style={styles.modalDescSection}>
                <Text style={styles.modalDescLabel}>Event Details & Circular Instructions:</Text>
                <Text style={styles.modalDescText}>
                  {selectedEvent.description || 'No additional instructions provided for this academic event.'}
                </Text>
              </View>

              {/* Faculty & Admin Actions */}
              {canManageEvents && (
                <View style={styles.modalAdminActionsRow}>
                  <TouchableOpacity
                    style={styles.modalEditBtn}
                    onPress={() => openEditModal(selectedEvent)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modalBtnIcon}>✏️</Text>
                    <Text style={styles.modalBtnText}>Edit Event</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalDeleteBtn}
                    onPress={() => handleDeleteEvent(selectedEvent)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modalBtnIcon}>🗑️</Text>
                    <Text style={styles.modalDeleteBtnText}>Delete Event</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })()}
      </Modal>

      {/* CREATE / EDIT EVENT MODAL (Faculty & Admin) */}
      <Modal
        visible={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={isEditing ? 'Edit Academic Event' : 'Schedule Academic Event'}
        maxWidth={640}
      >
        <View style={styles.formContent}>
          {formError && (
            <View style={styles.formAlert}>
              <Text style={styles.formAlertText}>⚠️ {formError}</Text>
            </View>
          )}

          {/* Event Title */}
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Event Title *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Continuous Assessment Test (CAT-2)"
              placeholderTextColor={colors.textMuted}
              value={formData.title}
              onChangeText={(val) => setFormData(p => ({ ...p, title: val }))}
            />
          </View>

          {/* Event Type Pills Selector */}
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Event Category *</Text>
            <View style={styles.typeSelectorGrid}>
              {Object.entries(EVENT_TYPE_CONFIG).map(([key, cfg]) => {
                const isSelected = formData.event_type === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.typeOptionCard,
                      isSelected && { borderColor: cfg.color, backgroundColor: cfg.bgColor }
                    ]}
                    onPress={() => setFormData(p => ({ ...p, event_type: key }))}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.typeOptionIcon}>{cfg.icon}</Text>
                    <Text style={[styles.typeOptionText, isSelected && { color: cfg.color, fontWeight: 'bold' }]}>
                      {cfg.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Date Range Inputs */}
          <View style={styles.formRowTwoCol}>
            <View style={[styles.formField, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Start Date & Time *</Text>
              <input
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData(p => ({ ...p, start_date: e.target.value }))}
                style={webDateTimeStyle}
              />
            </View>

            <View style={[styles.formField, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>End Date & Time *</Text>
              <input
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData(p => ({ ...p, end_date: e.target.value }))}
                style={webDateTimeStyle}
              />
            </View>
          </View>

          {/* Target Department & Batch */}
          <View style={styles.formRowTwoCol}>
            <View style={[styles.formField, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Target Department</Text>
              <select
                value={formData.target_department}
                onChange={(e) => setFormData(p => ({ ...p, target_department: e.target.value }))}
                style={webSelectInputStyle}
              >
                <option value="ALL">All Departments (College-Wide)</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </View>

            <View style={[styles.formField, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Target Batch / Section</Text>
              <select
                value={formData.target_batch}
                onChange={(e) => setFormData(p => ({ ...p, target_batch: e.target.value }))}
                style={webSelectInputStyle}
              >
                <option value="ALL">All Batches</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} (Sem {b.semester})</option>
                ))}
              </select>
            </View>
          </View>

          {/* Description */}
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Description & Instructions</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Provide syllabus coverage, prerequisites, room venues, or circular details..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              value={formData.description}
              onChangeText={(val) => setFormData(p => ({ ...p, description: val }))}
            />
          </View>

          {/* Modal Footer Actions */}
          <View style={styles.formFooterActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setIsFormModalOpen(false)}
              disabled={formSubmitting}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, formSubmitting && { opacity: 0.7 }]}
              onPress={handleSaveEvent}
              disabled={formSubmitting}
            >
              {formSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {isEditing ? 'Save Changes' : 'Schedule Event'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// Inline CSS for Web input elements
const webSelectStyle = {
  backgroundColor: '#161F30',
  color: '#F9FAFB',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '8px',
  padding: '6px 12px',
  fontSize: '13px',
  outline: 'none',
  cursor: 'pointer'
};

const webSelectInputStyle = {
  backgroundColor: '#161F30',
  color: '#F9FAFB',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '8px',
  padding: '10px 12px',
  fontSize: '14px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box'
};

const webDateTimeStyle = {
  backgroundColor: '#161F30',
  color: '#F9FAFB',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '8px',
  padding: '10px 12px',
  fontSize: '14px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box'
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark
  },
  contentContainer: {
    padding: 20,
    maxWidth: 1350,
    alignSelf: 'center',
    width: '100%'
  },

  /* Header Card */
  headerCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16
  },
  headerLeft: {
    flex: 1,
    minWidth: 300
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
    flexWrap: 'wrap'
  },
  headerIcon: { fontSize: 26 },
  headerTitle: {
    fontSize: 22,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary
  },
  activeTermPill: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)'
  },
  activeTermText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: typography.weight.bold
  },
  headerSub: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap'
  },
  viewToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  viewToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8
  },
  viewToggleBtnActive: {
    backgroundColor: colors.primary
  },
  viewToggleText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: typography.weight.medium
  },
  viewToggleTextActive: {
    color: '#FFF',
    fontWeight: typography.weight.bold
  },
  addEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)'
  },
  addEventBtnIcon: { fontSize: 13 },
  addEventBtnText: {
    color: '#FFF',
    fontWeight: typography.weight.bold,
    fontSize: 13
  },

  /* Navigation Bar */
  navBar: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14
  },
  navControlsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  navArrowBtn: {
    backgroundColor: '#161F30',
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  navArrowText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold'
  },
  currentMonthLabel: {
    fontSize: 17,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    minWidth: 140,
    textAlign: 'center'
  },
  todayBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)'
  },
  todayBtnText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: typography.weight.bold
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap'
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  filterLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: typography.weight.medium
  },
  pickerWrap: {},

  /* Legend Bar */
  legendBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16
  },
  legendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  legendText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: typography.weight.medium
  },

  /* Calendar Month Grid */
  calendarContainer: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
  },
  weekHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  weekHeaderCell: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  weekHeaderText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.5
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  dayCell: {
    width: '14.2857%', // 100% / 7 columns
    minHeight: 110,
    backgroundColor: '#111827',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 6,
    boxSizing: 'border-box'
  },
  dayCellMuted: {
    backgroundColor: 'rgba(11, 15, 25, 0.6)'
  },
  dayCellToday: {
    backgroundColor: 'rgba(99, 102, 241, 0.07)',
    borderColor: 'rgba(99, 102, 241, 0.4)'
  },
  dayTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  dateBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dateBadgeToday: {
    backgroundColor: colors.primary
  },
  dateText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: typography.weight.semibold
  },
  dateTextToday: {
    color: '#FFF',
    fontWeight: 'bold'
  },
  todayPill: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4
  },
  todayPillText: {
    color: colors.primaryLight,
    fontSize: 8,
    fontWeight: 'bold'
  },
  dayEventsList: {
    gap: 4
  },
  eventTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1
  },
  eventTagIcon: {
    fontSize: 10
  },
  eventTagText: {
    fontSize: 10,
    fontWeight: typography.weight.semibold,
    flex: 1
  },
  overflowBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)'
  },
  overflowText: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: 'bold'
  },

  /* Week View */
  weekViewContainer: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden'
  },
  weekColumnsRow: {
    flexDirection: 'row',
    minHeight: 480
  },
  weekCol: {
    flex: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#111827'
  },
  weekColToday: {
    backgroundColor: 'rgba(99, 102, 241, 0.04)'
  },
  weekColHeader: {
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: '#0F172A'
  },
  weekColHeaderToday: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)'
  },
  weekColDayName: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4
  },
  weekColDateNum: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: typography.weight.bold
  },
  weekColDateNumToday: {
    color: colors.primaryLight
  },
  weekEventsScroll: {
    flex: 1,
    padding: 8
  },
  weekEmptyCell: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 6
  },
  weekEmptyText: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic'
  },
  quickAddLink: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.1)'
  },
  quickAddText: {
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: 'bold'
  },
  weekEventCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    marginBottom: 8
  },
  weekEventTop: {
    marginBottom: 4
  },
  weekEventTypePill: {
    fontSize: 10,
    fontWeight: 'bold'
  },
  weekEventTitle: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4
  },
  weekEventTarget: {
    color: colors.textMuted,
    fontSize: 10
  },

  /* Agenda View */
  agendaContainer: {
    gap: 12
  },
  agendaEmptyBox: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  agendaEmptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold'
  },
  agendaEmptySub: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4
  },
  agendaCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderLeftWidth: 4,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12
  },
  agendaCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 280
  },
  agendaIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  agendaMainInfo: {
    flex: 1
  },
  agendaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap'
  },
  typeBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold'
  },
  agendaTargetBadge: {
    color: colors.textMuted,
    fontSize: 11
  },
  agendaTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2
  },
  agendaDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 4
  },
  agendaTimeRange: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: 'medium'
  },
  agendaActions: {},
  detailsBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  detailsBtnText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold'
  },

  /* Details Modal */
  detailsModalContent: {
    padding: 10
  },
  modalHeroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap'
  },
  modalTypePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1
  },
  modalTypePillText: {
    fontSize: 11,
    fontWeight: 'bold'
  },
  modalAudiencePill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  modalAudienceText: {
    color: colors.textSecondary,
    fontSize: 11
  },
  modalEventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 16
  },
  modalInfoBox: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 8,
    marginBottom: 16
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: 'medium'
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right'
  },
  modalDescSection: {
    marginBottom: 20
  },
  modalDescLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6
  },
  modalDescText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20
  },
  modalAdminActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 16
  },
  modalEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8
  },
  modalDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8
  },
  modalBtnIcon: { fontSize: 13 },
  modalBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  modalDeleteBtnText: { color: '#EF4444', fontSize: 12, fontWeight: 'bold' },

  /* Form Modal */
  formContent: {
    padding: 10
  },
  formAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 14
  },
  formAlertText: { color: '#EF4444', fontSize: 12 },
  formField: {
    marginBottom: 14
  },
  formRowTwoCol: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap'
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6
  },
  textInput: {
    backgroundColor: '#161F30',
    color: colors.textPrimary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top'
  },
  typeSelectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  typeOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#161F30',
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  typeOptionIcon: { fontSize: 13 },
  typeOptionText: {
    color: colors.textSecondary,
    fontSize: 11
  },
  formFooterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 16
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#1E293B'
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: 'medium'
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
    minWidth: 110,
    alignItems: 'center'
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold'
  },

  /* Center Box */
  centerBox: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    gap: 10
  },
  errorText: { color: '#EF4444', fontSize: 13 },
  retryBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6
  },
  retryBtnText: { color: colors.textPrimary, fontSize: 12, fontWeight: 'bold' }
});
