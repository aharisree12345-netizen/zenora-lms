import { Linking, Platform } from 'react-native';

export function getApiBaseUrl() {
  if (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const protocol = window.location.protocol || 'http:';
    return `${protocol}//${window.location.hostname}:5000/api`;
  }
  return 'http://localhost:5000/api';
}

export function getBackendOrigin() {
  return getApiBaseUrl().replace(/\/api\/?$/, '');
}

let authToken = null;

export function setClientToken(token) {
  authToken = token;
}

export function getClientToken() {
  return authToken;
}

function buildQuery(params) {
  if (!params) return '';
  if (typeof params === 'string') {
    return params.startsWith('?') ? params : `?${params}`;
  }
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.append(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export function resolveFileUrl(url) {
  if (!url) return '';
  let cleanUrl = String(url).trim().replace(/\\/g, '/');

  const origin = getBackendOrigin();

  // If identifier is an ID
  if (cleanUrl.startsWith('mat-') || cleanUrl.startsWith('sub-') || cleanUrl.startsWith('les-')) {
    return `${origin}/api/materials/${encodeURIComponent(cleanUrl)}/view`;
  }

  // If mock domain zenora.edu was stored
  if (cleanUrl.includes('zenora.edu')) {
    const filename = cleanUrl.split('/').pop();
    return `${origin}/uploads/materials/${filename}`;
  }

  // If localhost:5000 is hardcoded but we are browsing via another host
  if (cleanUrl.includes('localhost:5000') || cleanUrl.includes('127.0.0.1:5000')) {
    try {
      const parsed = new URL(cleanUrl);
      return `${origin}${parsed.pathname}${parsed.search}`;
    } catch (e) {
      return cleanUrl.replace(/https?:\/\/(localhost|127\.0\.0\.1):5000/, origin);
    }
  }

  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') || cleanUrl.startsWith('blob:') || cleanUrl.startsWith('data:')) {
    return cleanUrl;
  }

  const uploadsIdx = cleanUrl.indexOf('/uploads/');
  if (uploadsIdx !== -1) {
    cleanUrl = cleanUrl.substring(uploadsIdx);
  } else if (cleanUrl.startsWith('uploads/')) {
    cleanUrl = '/' + cleanUrl;
  } else if (cleanUrl.startsWith('assets/')) {
    cleanUrl = '/' + cleanUrl;
  } else if (!cleanUrl.startsWith('/')) {
    if (cleanUrl.toLowerCase().endsWith('.pdf') || cleanUrl.toLowerCase().endsWith('.mp4')) {
      cleanUrl = '/uploads/materials/' + cleanUrl;
    } else {
      cleanUrl = '/' + cleanUrl;
    }
  }

  return `${origin}${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
}

export function getMaterialDownloadUrl(rawUrlOrId) {
  if (!rawUrlOrId) return '';
  const origin = getBackendOrigin();
  const rawStr = String(rawUrlOrId).trim();
  if (rawStr.includes('/download')) {
    return resolveFileUrl(rawStr);
  }
  if (rawStr.startsWith('mat-') || rawStr.startsWith('sub-') || rawStr.startsWith('les-')) {
    return `${origin}/api/materials/${encodeURIComponent(rawStr)}/download`;
  }
  if (rawStr.endsWith('.pdf')) {
    const baseName = rawStr.split('/').pop().split('\\').pop();
    return `${origin}/api/materials/${encodeURIComponent(baseName)}/download`;
  }
  return resolveFileUrl(rawStr);
}

export function getMaterialViewUrl(rawUrlOrId) {
  if (!rawUrlOrId) return '';
  const origin = getBackendOrigin();
  const rawStr = String(rawUrlOrId).trim();
  if (rawStr.includes('/view')) {
    return resolveFileUrl(rawStr);
  }
  if (rawStr.startsWith('mat-') || rawStr.startsWith('sub-') || rawStr.startsWith('les-')) {
    return `${origin}/api/materials/${encodeURIComponent(rawStr)}/view`;
  }
  if (rawStr.endsWith('.pdf')) {
    const baseName = rawStr.split('/').pop().split('\\').pop();
    return `${origin}/api/materials/${encodeURIComponent(baseName)}/view`;
  }
  return resolveFileUrl(rawStr);
}

/**
 * Triggers an authentic browser download of a PDF document:
 * 1. Resolves full accessible URL or dedicated backend download endpoint
 * 2. Fetches binary blob using fetch(downloadUrl)
 * 3. Creates object URL (URL.createObjectURL(blob))
 * 4. Programmatically clicks <a download="..."> for authentic immediate file download
 * 5. Falls back to direct anchor click without empty href or generic alert popups
 */
export async function downloadPdfFile(rawUrlOrId, defaultFilename = 'document.pdf') {
  if (!rawUrlOrId) return;

  const origin = getBackendOrigin();
  let downloadUrl = '';
  let downloadFilename = (defaultFilename || 'document.pdf').replace(/[/\\?%*:|"<>]/g, '_').trim();
  if (!downloadFilename.toLowerCase().endsWith('.pdf')) {
    downloadFilename += '.pdf';
  }

  const rawStr = String(rawUrlOrId).trim();
  if (rawStr.includes('/download')) {
    downloadUrl = resolveFileUrl(rawStr);
  } else if (rawStr.startsWith('mat-') || rawStr.startsWith('sub-') || rawStr.startsWith('les-')) {
    downloadUrl = `${origin}/api/materials/${encodeURIComponent(rawStr)}/download`;
  } else if (rawStr.endsWith('.pdf')) {
    const baseName = rawStr.split('/').pop().split('\\').pop();
    downloadUrl = `${origin}/api/materials/${encodeURIComponent(baseName)}/download`;
  } else {
    downloadUrl = resolveFileUrl(rawStr);
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf, */*'
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = downloadFilename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 3000);
        return;
      }
    } catch (fetchErr) {
      console.warn('[PDF Blob Download notice, falling back to direct anchor]', fetchErr);
    }

    // Direct anchor fallback
    try {
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = downloadUrl;
      a.download = downloadFilename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (anchorErr) {
      console.error('[Anchor Download fallback error]', anchorErr);
    }
  } else {
    Linking.openURL(downloadUrl).catch(e => console.error(e));
  }
}

export async function handleDownload(url, filename) {
  if (!url) return;
  const resolved = resolveFileUrl(url);
  const targetName = filename || (url.split('/').pop().split('\\').pop()) || 'download.pdf';

  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const response = await fetch(resolved);
      if (!response.ok) throw new Error('File not found on server');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = targetName.endsWith('.pdf') ? targetName : `${targetName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn('[handleDownload error, using window.open fallback]:', err);
      window.open(resolved, '_blank');
    }
  } else {
    Linking.openURL(resolved).catch(err => {
      console.error('[handleDownload Linking error]:', err);
    });
  }
}

export const downloadFile = handleDownload;

/**
 * Cleanly opens a PDF in a new browser tab or inline viewer
 */
export function viewPdfFile(rawUrlOrId) {
  if (!rawUrlOrId) return;
  const viewUrl = getMaterialViewUrl(rawUrlOrId);

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(viewUrl, '_blank', 'noopener,noreferrer');
  } else {
    Linking.openURL(viewUrl).catch(e => console.error(e));
  }
}

export async function apiRequest(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl();
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${path}`;

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(options.headers || {})
  };

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 12000) : null;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || (controller ? controller.signal : undefined)
    });
    if (timeoutId) clearTimeout(timeoutId);

    let data;
    try {
      data = await res.json();
    } catch (parseErr) {
      data = { success: res.ok, message: res.statusText || 'Response parse error' };
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    console.error(`[API Request Error] ${endpoint}:`, err);
    return {
      ok: false,
      status: 0,
      data: {
        success: false,
        message: err.name === 'AbortError'
          ? 'Request timed out. Please check backend server.'
          : 'Network or server connection failed. Ensure backend is running.'
      }
    };
  }
}

// College LMS API Client
export const api = {
  apiRequest,

  // Auth
  login: (identifier, password) => {
    const cleanId = identifier ? String(identifier).trim() : '';
    const cleanPass = password ? String(password) : '';
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: cleanId,
        roll_number: cleanId,
        roll_no: cleanId,
        email: cleanId,
        password: cleanPass
      })
    });
  },
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  switchRole: (targetRole) => apiRequest('/auth/switch-role', { method: 'POST', body: JSON.stringify({ targetRole }) }),
  getProfile: () => apiRequest('/auth/me'),
  forgotPassword: (identifier) => apiRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ identifier }) }),
  resetPassword: (payload) => apiRequest('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
  getPendingApprovals: () => apiRequest('/auth/pending-approvals'),
  approveUser: (userId, status) => apiRequest(`/auth/approve/${userId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Dashboard
  getDashboardStats: () => apiRequest('/dashboard/stats'),

  // Academic Structure & Faculty Directory
  getDepartments: () => apiRequest('/academics/departments'),
  createDepartment: (payload) => apiRequest('/academics/departments', { method: 'POST', body: JSON.stringify(payload) }),
  getAcademicYears: () => apiRequest('/academics/academic-years'),
  createAcademicYear: (payload) => apiRequest('/academics/academic-years', { method: 'POST', body: JSON.stringify(payload) }),
  getBatches: (params) => apiRequest(`/academics/batches${buildQuery(params)}`),
  createBatch: (payload) => apiRequest('/academics/batches', { method: 'POST', body: JSON.stringify(payload) }),
  getSubjects: (params) => apiRequest(`/academics/subjects${buildQuery(params)}`),
  createSubject: (payload) => apiRequest('/academics/subjects', { method: 'POST', body: JSON.stringify(payload) }),
  getFacultyAssignments: () => apiRequest('/academics/faculty-assignments'),
  assignFaculty: (payload) => apiRequest('/academics/faculty-assignments', { method: 'POST', body: JSON.stringify(payload) }),
  getSchedules: (params) => apiRequest(`/academics/schedules${buildQuery(params)}`),
  getFaculty: () => apiRequest('/academics/faculty'),
  createFaculty: (payload) => apiRequest('/academics/faculty', { method: 'POST', body: JSON.stringify(payload) }),
  updateFacultyStatus: (id, status) => apiRequest(`/academics/faculty/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Students & Batch Directory
  getStudents: (params) => apiRequest(`/students${buildQuery(params)}`),
  getStudentDetail: (id) => apiRequest(`/students/${id}`),
  getStudentProfile: (id) => apiRequest(`/students/${id}/profile`),
  createStudent: (payload) => apiRequest('/students', { method: 'POST', body: JSON.stringify(payload) }),
  updateStudent: (id, payload) => apiRequest(`/students/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  updateStudentProfile: (id, payload) => apiRequest(`/students/${id}/profile`, { method: 'PUT', body: JSON.stringify(payload) }),
  updateStudentStatus: (id, status) => apiRequest(`/students/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteStudent: (id, params) => apiRequest(`/students/${id}${buildQuery(params)}`, { method: 'DELETE' }),
  bulkImportStudents: (payload) => apiRequest('/students/bulk-import', { method: 'POST', body: JSON.stringify(payload) }),
  exportStudentsCsvUrl: () => `${getApiBaseUrl()}/students/export/csv`,

  // Examinations & Split-Wise Mark Entry (Core Module)
  getExams: (params) => apiRequest(`/exams${buildQuery(params)}`),
  getExamDetail: (id) => apiRequest(`/exams/${id}`),
  createExam: (payload) => apiRequest('/exams', { method: 'POST', body: JSON.stringify(payload) }),
  configureExamQuestions: (id, questions) => apiRequest(`/exams/${id}/questions`, { method: 'PUT', body: JSON.stringify({ questions }) }),
  getExamMarkGrid: (id) => apiRequest(`/exams/${id}/mark-grid`),
  saveExamMarks: (id, marks) => apiRequest(`/exams/${id}/marks`, { method: 'POST', body: JSON.stringify({ marks }) }),
  publishExam: (id) => apiRequest(`/exams/${id}/publish`, { method: 'POST' }),
  getStudentMarksheet: (examId, studentId) => apiRequest(`/exams/${examId}/student-sheet/${studentId}`),
  getMyExamResults: () => apiRequest('/exams/student/my-results'),

  // Assignments
  getAssignments: (params) => apiRequest(`/assignments${buildQuery(params)}`),
  getAssignmentDetail: (id) => apiRequest(`/assignments/${id}`),
  getAssignmentSubmissions: (id) => apiRequest(`/assignments/${id}/submissions`),
  createAssignment: (payload) => apiRequest('/assignments', { method: 'POST', body: JSON.stringify(payload) }),
  uploadAssignmentFile: (formData) => apiRequest('/assignments/upload', { method: 'POST', body: formData }),
  submitAssignment: (id, payload) => apiRequest(`/assignments/${id}/submit`, { method: 'POST', body: JSON.stringify(payload) }),
  gradeAssignment: (id, submissionId, payload) => apiRequest(`/assignments/${id}/grade/${submissionId}`, { method: 'POST', body: JSON.stringify(payload) }),
  requestResubmission: (id, submissionId, payload) => apiRequest(`/assignments/${id}/resubmission-request/${submissionId}`, { method: 'POST', body: JSON.stringify(payload) }),
  getAssignmentSubmissionDownloadUrl: (submissionId) => `${getApiBaseUrl()}/assignments/submissions/${submissionId}/download`,

  // Study Materials & Syllabus
  getMaterials: (params) => apiRequest(`/materials${buildQuery(params)}`),
  uploadMaterial: (payload) => apiRequest('/materials', { method: 'POST', body: JSON.stringify(payload) }),
  deleteMaterial: (id) => apiRequest(`/materials/${id}`, { method: 'DELETE' }),
  getMaterialDownloadUrl: (id) => `${getApiBaseUrl()}/materials/${id}/download`,
  getMaterialViewUrl: (id) => `${getApiBaseUrl()}/materials/${id}/view`,
  getFileDownloadUrl: (filePath) => `${getApiBaseUrl()}/files/download?path=${encodeURIComponent(filePath || '')}`,
  getFileViewUrl: (filePath) => `${getApiBaseUrl()}/files/view?path=${encodeURIComponent(filePath || '')}`,

  // Academic Announcements
  getAnnouncements: (params) => apiRequest(`/announcements${buildQuery(params)}`),
  createAnnouncement: (payload) => apiRequest('/announcements', { method: 'POST', body: JSON.stringify(payload) }),
  updateAnnouncement: (id, payload) => apiRequest(`/announcements/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteAnnouncement: (id) => apiRequest(`/announcements/${id}`, { method: 'DELETE' }),

  // Notifications
  getNotifications: () => apiRequest('/notifications'),
  markNotificationRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => apiRequest('/notifications/read-all', { method: 'PUT' }),

  // Enterprise Courses & Lifecycle Management
  getCourses: (queryString) => apiRequest(`/courses${queryString ? (queryString.startsWith('?') ? queryString : '?' + queryString) : ''}`),
  getCategories: () => apiRequest('/courses/meta/categories'),
  getCourseDetail: (id, previewMode = false) => apiRequest(`/courses/${id}${previewMode ? '?preview=student' : ''}`),
  createCourse: (payload) => apiRequest('/courses', { method: 'POST', body: JSON.stringify(payload) }),
  updateCourse: (id, payload) => apiRequest(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  duplicateCourse: (id) => apiRequest(`/courses/${id}/duplicate`, { method: 'POST' }),
  publishCourse: (id) => apiRequest(`/courses/${id}/publish`, { method: 'POST' }),
  archiveCourse: (id) => apiRequest(`/courses/${id}/archive`, { method: 'POST' }),
  deleteCourse: (id) => apiRequest(`/courses/${id}`, { method: 'DELETE' }),

  // Curriculum & Lessons
  createSection: (courseId, payload) => apiRequest(`/curriculum/courses/${courseId}/sections`, { method: 'POST', body: JSON.stringify(payload) }),
  updateSection: (id, payload) => apiRequest(`/curriculum/sections/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteSection: (id) => apiRequest(`/curriculum/sections/${id}`, { method: 'DELETE' }),
  createLesson: (sectionId, payload) => apiRequest(`/curriculum/sections/${sectionId}/lessons`, { method: 'POST', body: JSON.stringify(payload) }),
  getLesson: (id, previewMode = false) => apiRequest(`/curriculum/lessons/${id}${previewMode ? '?preview=student' : ''}`),
  updateLessonProgress: (id, payload) => apiRequest(`/curriculum/lessons/${id}/progress`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteLesson: (id) => apiRequest(`/curriculum/lessons/${id}`, { method: 'DELETE' }),

  // Personal Notes & Bookmarks Drawer
  getLessonNotes: (lessonId) => apiRequest(`/curriculum/lessons/${lessonId}/notes`),
  addLessonNote: (lessonId, payload) => apiRequest(`/curriculum/lessons/${lessonId}/notes`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteLessonNote: (lessonId, noteId) => apiRequest(`/curriculum/lessons/${lessonId}/notes/${noteId}`, { method: 'DELETE' }),
  toggleLessonBookmark: (lessonId) => apiRequest(`/curriculum/lessons/${lessonId}/bookmark`, { method: 'POST' }),
  getUserBookmarks: () => apiRequest('/curriculum/user/bookmarks'),

  // Enrolments & Access Controls
  getEnrolments: (params) => apiRequest(`/enrolments${buildQuery(params)}`),
  selfEnrol: (courseId) => apiRequest('/enrolments/self', { method: 'POST', body: JSON.stringify({ course_id: courseId }) }),
  manualEnrol: (payload) => apiRequest('/enrolments/manual', { method: 'POST', body: JSON.stringify(payload) }),
  updateEnrolmentStatus: (id, status) => apiRequest(`/enrolments/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  setEnrolmentExpiry: (id, access_expiry_date) => apiRequest(`/enrolments/${id}/expiry`, { method: 'PUT', body: JSON.stringify({ access_expiry_date }) }),
  revokeEnrolment: (id) => apiRequest(`/enrolments/${id}/revoke`, { method: 'PUT' }),
  restoreEnrolment: (id) => apiRequest(`/enrolments/${id}/restore`, { method: 'PUT' }),

  // Quizzes & Assessments
  getQuizzes: (params) => apiRequest(`/quizzes${buildQuery(params)}`),
  getAssessments: (params) => apiRequest(`/assessments${buildQuery(params)}`),
  getCourseQuizzes: (courseId) => apiRequest(`/quizzes/course/${courseId}`),
  getQuiz: (id) => apiRequest(`/quizzes/${id}`),
  getQuizAttempts: (params) => apiRequest(`/quiz-attempts${buildQuery(params)}`),
  startQuiz: (id) => apiRequest(`/quizzes/${id}/start`, { method: 'POST' }),
  retakeQuiz: (id) => apiRequest(`/quizzes/${id}/retake`, { method: 'POST' }),
  submitQuiz: (id, payload) => apiRequest(`/quizzes/${id}/submit`, { method: 'POST', body: JSON.stringify(payload) }),
  createQuiz: (payload) => apiRequest('/quizzes', { method: 'POST', body: JSON.stringify(payload) }),
  updateQuiz: (id, payload) => apiRequest(`/quizzes/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteQuiz: (id) => apiRequest(`/quizzes/${id}`, { method: 'DELETE' }),

  // Cryptographically Verifiable Digital Certificates & University Grade Sheets
  getCertificates: (params) => apiRequest(`/certificates${buildQuery(params)}`),
  getUserCertificates: () => apiRequest('/certificates/user'),
  getMarksheet: (semester, studentId = null) => apiRequest(`/results/marksheet/${semester}${buildQuery({ student_id: studentId })}`),
  getResultsEligibility: (studentId = null) => apiRequest(`/results/eligibility${buildQuery({ student_id: studentId })}`),
  getSemesterGradeSheet: (semester = 1, studentId = null) => apiRequest(`/results/marksheet/${semester}${buildQuery({ student_id: studentId })}`),
  verifyCertificate: (code) => apiRequest(`/certificates/verify/${encodeURIComponent(code)}`),
  issueCertificate: (payload) => apiRequest('/certificates/issue', { method: 'POST', body: JSON.stringify(payload) }),

  // Reports & Analytics
  getAnalytics: () => apiRequest('/reports/analytics'),
  getReportsAnalytics: () => apiRequest('/reports/analytics'),
  getReports: () => apiRequest('/reports/analytics'),
  getInternalMarks: (params) => apiRequest(`/reports/internal-marks${buildQuery(params)}`),
  exportReportsCsvUrl: (type = 'enrolments', params = {}) => `${getApiBaseUrl()}/reports/export-csv${buildQuery({ type, ...params })}`,

  // Multi-Tenant Admin Management & SaaS Administration
  getOrganizations: () => apiRequest('/admin/organizations'),
  createOrganization: (payload) => apiRequest('/admin/organizations', { method: 'POST', body: JSON.stringify(payload) }),
  getTenants: () => apiRequest('/admin/tenants'),
  createTenant: (payload) => apiRequest('/admin/tenants', { method: 'POST', body: JSON.stringify(payload) }),
  getSubscriptions: () => apiRequest('/admin/subscriptions'),
  getUsers: (params) => apiRequest(`/admin/users${buildQuery(params)}`),
  createUser: (payload) => apiRequest('/admin/users', { method: 'POST', body: JSON.stringify(payload) }),
  toggleUserStatus: (id, status) => apiRequest(`/admin/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  bulkImport: (courseId, csvText) => apiRequest('/enrolments/bulk-import', { method: 'POST', body: JSON.stringify({ course_id: courseId, csv_text: csvText }) }),

  // Dedicated Faculty Database & Directory (Admin Module)
  getAdminFaculty: (params) => apiRequest(`/admin/faculty${buildQuery(params)}`),
  createFacultyMember: (payload) => apiRequest('/admin/faculty', { method: 'POST', body: JSON.stringify(payload) }),
  updateFacultyMember: (id, payload) => apiRequest(`/admin/faculty/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  toggleFacultyStatus: (id, status) => apiRequest(`/admin/faculty/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteFacultyMember: (id) => apiRequest(`/admin/faculty/${id}`, { method: 'DELETE' }),

  // Academic Events Calendar
  getCalendarEvents: (params) => apiRequest(`/calendar/events${buildQuery(params)}`),
  createCalendarEvent: (payload) => apiRequest('/calendar/events', { method: 'POST', body: JSON.stringify(payload) }),
  updateCalendarEvent: (id, payload) => apiRequest(`/calendar/events/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCalendarEvent: (id) => apiRequest(`/calendar/events/${id}`, { method: 'DELETE' }),

  // Dynamic Attendance Calculation Engine
  getAttendance: (params) => apiRequest(`/attendance${buildQuery(params)}`),
  getSessionAttendance: (params) => apiRequest(`/attendance/session${buildQuery(params)}`),
  getAttendanceRoster: (params) => apiRequest(`/attendance/roster${buildQuery(params)}`),
  markAttendance: (payload) => apiRequest('/attendance/mark', { method: 'POST', body: JSON.stringify(payload) }),
  markBulkAttendance: (payload) => apiRequest('/attendance/bulk', { method: 'POST', body: JSON.stringify(payload) }),
  getAttendanceSummary: (params) => apiRequest(`/attendance/summary${buildQuery(params)}`),

  // Synchronized Timetable Engine (Single Source of Truth)
  getFacultySchedule: (params) => apiRequest(`/timetable/faculty/my-schedule${buildQuery(params)}`),
  getStudentSchedule: (params) => apiRequest(`/timetable/student/my-schedule${buildQuery(params)}`),
  getTimetablePeriods: (params) => apiRequest(`/timetable/periods${buildQuery(params)}`),
  getLiveTimetableStatus: (params) => apiRequest(`/timetable/live-status${buildQuery(params)}`)
};


