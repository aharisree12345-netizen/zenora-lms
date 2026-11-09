const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const db = require('./config/db');
const { runSeed } = require('./seeds/seed');
const { repairAndSyncFiles } = require('../scripts/repairAndSyncFiles');
const { generateAcademicPdfBuffer } = require('./utils/academicPdfGenerator');

// Import routes
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const academicsRoutes = require('./routes/academics.routes');
const studentsRoutes = require('./routes/students.routes');
const examsRoutes = require('./routes/exams.routes');
const assignmentsRoutes = require('./routes/assignments.routes');
const materialsRoutes = require('./routes/materials.routes');
const announcementsRoutes = require('./routes/announcements.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const coursesRoutes = require('./routes/courses.routes');
const curriculumRoutes = require('./routes/curriculum.routes');
const enrolmentsRoutes = require('./routes/enrolments.routes');
const quizzesRoutes = require('./routes/quizzes.routes');
const certificatesRoutes = require('./routes/certificates.routes');
const reportsRoutes = require('./routes/reports.routes');
const adminRoutes = require('./routes/admin.routes');
const calendarRoutes = require('./routes/calendar.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const resultsRoutes = require('./routes/results.routes');
const timetableRoutes = require('./routes/timetable.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  frameguard: false
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-organization-id'],
  exposedHeaders: ['Content-Disposition', 'Content-Length']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const fs = require('fs');
const { ensurePhysicalSamplePdfs } = require('./utils/ensureUploads');

// Ensure physical sample PDFs and directories exist on server startup
ensurePhysicalSamplePdfs();

// Ensure uploads directories exist
const uploadsDir = path.join(__dirname, '../uploads');
const assignmentsUploadDir = path.join(uploadsDir, 'assignments');
const mediaUploadDir = path.join(uploadsDir, 'media');
const materialsUploadDir = path.join(uploadsDir, 'materials');
const submissionsUploadDir = path.join(uploadsDir, 'submissions');
const assetsUploadDir = path.join(uploadsDir, 'assets');
const srcUploadsDir = path.join(__dirname, 'uploads');
const srcSubmissionsUploadDir = path.join(srcUploadsDir, 'submissions');
const srcAssetsDir = path.join(__dirname, 'assets');

[assignmentsUploadDir, mediaUploadDir, materialsUploadDir, submissionsUploadDir, assetsUploadDir, srcUploadsDir, srcSubmissionsUploadDir, srcAssetsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Enable CORS for static upload routes
app.use('/uploads', cors({ origin: '*', exposedHeaders: ['Content-Disposition', 'Content-Length'] }));
app.use('/assets', cors({ origin: '*', exposedHeaders: ['Content-Disposition', 'Content-Length'] }));

// Serve uploaded files statically with CORS-friendly, streaming and iframe preview headers
const staticSetHeaders = (res, filePath) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.set('Access-Control-Allow-Headers', '*');
  res.set('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  res.set('X-Frame-Options', 'ALLOWALL');
  res.set('Content-Disposition', 'inline');
  if (filePath && filePath.toLowerCase().endsWith('.pdf')) {
    res.set('Content-Type', 'application/pdf');
  } else if (filePath && filePath.toLowerCase().endsWith('.mp4')) {
    res.set('Content-Type', 'video/mp4');
    res.set('Accept-Ranges', 'bytes');
  }
};

const staticMiddlewareOptions = { setHeaders: staticSetHeaders };

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), staticMiddlewareOptions));
app.use('/uploads', express.static(uploadsDir, staticMiddlewareOptions));
app.use('/uploads', express.static(materialsUploadDir, staticMiddlewareOptions));
app.use('/uploads', express.static(assignmentsUploadDir, staticMiddlewareOptions));
app.use('/uploads', express.static(submissionsUploadDir, staticMiddlewareOptions));
app.use('/uploads', express.static(srcUploadsDir, staticMiddlewareOptions));
app.use('/uploads', express.static(srcSubmissionsUploadDir, staticMiddlewareOptions));
app.use('/assets', express.static(assetsUploadDir, staticMiddlewareOptions));
app.use('/assets', express.static(materialsUploadDir, staticMiddlewareOptions));
app.use('/assets', express.static(uploadsDir, staticMiddlewareOptions));
app.use('/assets', express.static(srcAssetsDir, staticMiddlewareOptions));

// Helper: locate physical file across candidate storage directories
function findPhysicalFile(cleanRelPath, filename) {
  const baseUploads = path.resolve(__dirname, '../uploads');
  const candidates = [
    path.resolve(baseUploads, cleanRelPath),
    path.resolve(baseUploads, 'materials', filename),
    path.resolve(baseUploads, 'assignments', filename),
    path.resolve(baseUploads, 'submissions', filename),
    path.resolve(baseUploads, filename),
    path.resolve(__dirname, 'uploads', cleanRelPath),
    path.resolve(__dirname, 'uploads', 'materials', filename),
    path.resolve(__dirname, 'uploads', 'assignments', filename),
    path.resolve(__dirname, 'uploads', 'submissions', filename),
    path.resolve(__dirname, 'uploads', filename)
  ];

  for (const cand of candidates) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
      return cand;
    }
  }
  return null;
}

// Helper: resolve document metadata from query or database for on-the-fly generation
function resolveDocumentMetadata(req, filename) {
  const data = db.getFallbackData();
  const id = String(req.query.id || '').trim();
  const type = String(req.query.type || '').trim().toLowerCase();

  let foundItem = null;
  if (id) {
    if (type === 'assignment') {
      foundItem = (data.assignments || []).find(a => a.id === id);
    } else if (type === 'submission') {
      foundItem = (data.assignment_submissions || []).find(s => s.id === id);
    } else {
      foundItem = (data.learning_materials || []).find(m => m.id === id) ||
                  (data.syllabus_notes || []).find(m => m.id === id) ||
                  (data.subject_materials || []).find(m => m.id === id);
    }
  }

  if (!foundItem && filename) {
    foundItem = (data.learning_materials || []).find(m => m.file_path?.includes(filename) || m.file_url?.includes(filename)) ||
                (data.syllabus_notes || []).find(m => m.file_path?.includes(filename) || m.file_url?.includes(filename)) ||
                (data.assignments || []).find(a => a.attachment_url?.includes(filename)) ||
                (data.assignment_submissions || []).find(s => s.attachment_url?.includes(filename));
  }

  const sub = foundItem ? (data.subjects || []).find(s => s.id === (foundItem.subject_id || foundItem.course_id)) : null;

  const baseTitle = foundItem?.title || filename.replace(/_/g, ' ').replace(/\.pdf$/i, '');
  const courseCode = sub ? sub.code : (foundItem?.course_code || filename.split('_')[0] || 'ACAD');
  const courseName = sub ? sub.name : 'Curriculum Course Study Material';
  const category = (foundItem?.category || (filename.toLowerCase().includes('syllabus') ? 'Syllabus' : 'Lecture Notes')).toUpperCase();

  return {
    title: baseTitle,
    courseCode,
    courseName,
    category,
    department: sub?.department_id === 'dept-cs' ? 'Computer Science & Engineering' :
                sub?.department_id === 'dept-ec' ? 'Electronics & Communication Engineering' :
                sub?.department_id === 'dept-me' ? 'Mechanical Engineering' : 'Engineering Curriculum Division',
    semester: sub ? `Semester ${sub.semester} (S${sub.semester})` : 'Semester S4'
  };
}

// Guaranteed Stream/Download Controller: GET /api/files/download?path=:filePath
app.get('/api/files/download', (req, res) => {
  try {
    const rawPath = req.query.path || req.query.filePath || req.query.file || '';
    let decodedPath = decodeURIComponent(String(rawPath).trim()).replace(/\\/g, '/');
    if (decodedPath.startsWith('http://') || decodedPath.startsWith('https://')) {
      try {
        const parsed = new URL(decodedPath);
        decodedPath = parsed.pathname;
      } catch (e) {}
    }

    let cleanRelPath = decodedPath;
    if (cleanRelPath.startsWith('/uploads/')) cleanRelPath = cleanRelPath.replace('/uploads/', '');
    else if (cleanRelPath.startsWith('uploads/')) cleanRelPath = cleanRelPath.replace('uploads/', '');
    else if (cleanRelPath.startsWith('/')) cleanRelPath = cleanRelPath.substring(1);

    const baseUploads = path.resolve(__dirname, '../uploads');
    let filename = path.basename(cleanRelPath) || (req.query.id ? `${req.query.id}.pdf` : 'document.pdf');
    if (!filename.toLowerCase().endsWith('.pdf') && !filename.includes('.')) filename += '.pdf';

    let fullPath = findPhysicalFile(cleanRelPath, filename);

    // Self-Healing Fallback: If missing, generate PDF buffer on the fly and save to disk
    if (!fullPath) {
      const folder = cleanRelPath.includes('assignment') ? 'assignments' : cleanRelPath.includes('submission') ? 'submissions' : 'materials';
      const targetPath = path.join(baseUploads, folder, filename);
      const meta = resolveDocumentMetadata(req, filename);
      const pdfBuffer = generateAcademicPdfBuffer(meta);
      try {
        fs.writeFileSync(targetPath, pdfBuffer);
        const srcPath = path.join(__dirname, 'uploads', folder, filename);
        if (fs.existsSync(path.dirname(srcPath))) fs.writeFileSync(srcPath, pdfBuffer);
      } catch (e) {}
      fullPath = targetPath;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');

    const stat = fs.statSync(fullPath);
    res.setHeader('Content-Length', stat.size);

    const stream = fs.createReadStream(fullPath);
    return stream.pipe(res);
  } catch (err) {
    console.error('[Files Download Error]', err);
    return res.status(500).json({ success: false, message: 'Internal error streaming file download.' });
  }
});

// Guaranteed Stream/View Controller: GET /api/files/view?path=:filePath or ?type=material&id=123
app.get('/api/files/view', (req, res) => {
  try {
    const rawPath = req.query.path || req.query.filePath || req.query.file || '';
    let decodedPath = decodeURIComponent(String(rawPath).trim()).replace(/\\/g, '/');
    if (decodedPath.startsWith('http://') || decodedPath.startsWith('https://')) {
      try {
        const parsed = new URL(decodedPath);
        decodedPath = parsed.pathname;
      } catch (e) {}
    }

    let cleanRelPath = decodedPath;
    if (cleanRelPath.startsWith('/uploads/')) cleanRelPath = cleanRelPath.replace('/uploads/', '');
    else if (cleanRelPath.startsWith('uploads/')) cleanRelPath = cleanRelPath.replace('uploads/', '');
    else if (cleanRelPath.startsWith('/')) cleanRelPath = cleanRelPath.substring(1);

    const baseUploads = path.resolve(__dirname, '../uploads');
    let filename = path.basename(cleanRelPath) || (req.query.id ? `${req.query.id}.pdf` : 'document.pdf');
    if (!filename.toLowerCase().endsWith('.pdf') && !filename.includes('.')) filename += '.pdf';

    let fullPath = findPhysicalFile(cleanRelPath, filename);

    // Self-Healing Fallback: If missing, generate on the fly, save to disk, and stream!
    if (!fullPath) {
      const folder = cleanRelPath.includes('assignment') ? 'assignments' : cleanRelPath.includes('submission') ? 'submissions' : 'materials';
      const targetPath = path.join(baseUploads, folder, filename);
      const meta = resolveDocumentMetadata(req, filename);
      const pdfBuffer = generateAcademicPdfBuffer(meta);
      try {
        fs.writeFileSync(targetPath, pdfBuffer);
        const srcPath = path.join(__dirname, 'uploads', folder, filename);
        if (fs.existsSync(path.dirname(srcPath))) fs.writeFileSync(srcPath, pdfBuffer);
      } catch (e) {}
      fullPath = targetPath;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('X-Frame-Options', 'ALLOWALL');

    const stat = fs.statSync(fullPath);
    res.setHeader('Content-Length', stat.size);

    const stream = fs.createReadStream(fullPath);
    return stream.pipe(res);
  } catch (err) {
    console.error('[Files View Error]', err);
    return res.status(500).json({ success: false, message: 'Internal error rendering file preview.' });
  }
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'ZENORA COLLEGE LMS – Academic Management System',
    version: '3.0.0-Academic',
    database: db.isUsingFallback() ? 'Embedded Relational (MySQL Compatible)' : 'MySQL 8.x Engine',
    timestamp: new Date().toISOString()
  });
});

// Mount Academic & Enterprise LMS API routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/academics', academicsRoutes);
app.use('/api/departments', (req, res, next) => {
  req.url = '/departments' + (req.url === '/' ? '' : req.url);
  academicsRoutes(req, res, next);
});
app.use('/api/batches', (req, res, next) => {
  req.url = '/batches' + (req.url === '/' ? '' : req.url);
  academicsRoutes(req, res, next);
});
app.use('/api/subjects', (req, res, next) => {
  req.url = '/subjects' + (req.url === '/' ? '' : req.url);
  academicsRoutes(req, res, next);
});
app.use('/api/students', studentsRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/curriculum', curriculumRoutes);
app.use('/api/enrolments', enrolmentsRoutes);
app.use('/api/quizzes', quizzesRoutes);
app.use('/api/assessments', quizzesRoutes);
app.use('/api/quiz-attempts', (req, res, next) => {
  req.url = '/attempts' + (req.url === '/' ? '' : req.url);
  quizzesRoutes(req, res, next);
});
app.use('/api/certificates', certificatesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/analytics', reportsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/timetable', timetableRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err.stack || err);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const emailService = require('./services/email.service');

// Server Initialization
async function startServer() {
  try {
    await db.initDatabase();

    // Auto-seed if fallback data is empty
    const data = db.getFallbackData();
    if (!data.users || data.users.length === 0 || !data.departments || data.departments.length === 0) {
      console.log('[Bootstrap] Running academic seed data...');
      await runSeed();
    }

    // Automated File Generation & Database Repair Pass on boot
    await repairAndSyncFiles();

    // Verify SMTP Email Transport configuration on boot (non-blocking)
    emailService.verifyEmailTransport().catch(err => {
      console.warn('[SMTP] Non-blocking verification warning:', err.message);
    });

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`=================================================`);
      console.log(`🎓 ZENORA COLLEGE LMS – ACADEMIC MANAGEMENT SYSTEM`);
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`=================================================`);
    });
  } catch (err) {
    console.error('[Startup Error]', err);
    process.exit(1);
  }
}

startServer();
