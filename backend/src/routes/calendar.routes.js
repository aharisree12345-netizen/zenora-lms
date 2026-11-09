const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { optionalAuth, authenticateToken, verifyRole } = require('../middleware/auth');
const crypto = require('crypto');

const ALLOWED_EVENT_TYPES = [
  'semester_exam',
  'internal_exam',
  'college_program',
  'holiday',
  'assignment_deadline'
];

/**
 * GET /api/calendar/events
 * Accessible by Student, Faculty, Admin.
 * Query params: month (1-12), year (e.g. 2026), department, batch, event_type
 */
router.get('/events', optionalAuth, async (req, res) => {
  try {
    const { month, year, department, batch, event_type } = req.query;
    const user = req.user;
    const isStudent = user && user.role === 'student';

    const data = db.getFallbackData();
    let events = data.academic_events || [];

    // Filter by year if specified
    if (year) {
      const y = parseInt(year, 10);
      if (!isNaN(y)) {
        events = events.filter(e => {
          const startDate = new Date(e.start_date);
          const endDate = new Date(e.end_date);
          return startDate.getFullYear() === y || endDate.getFullYear() === y;
        });
      }
    }

    // Filter by month (1-indexed: 1 = Jan, 10 = Oct, etc.)
    if (month) {
      const m = parseInt(month, 10);
      if (!isNaN(m) && m >= 1 && m <= 12) {
        events = events.filter(e => {
          const startDate = new Date(e.start_date);
          const endDate = new Date(e.end_date);
          const startMonth = startDate.getMonth() + 1;
          const endMonth = endDate.getMonth() + 1;
          return startMonth === m || endMonth === m;
        });
      }
    }

    // Filter by event_type
    if (event_type && event_type !== 'ALL' && event_type !== 'all') {
      events = events.filter(e => e.event_type === event_type);
    }

    // Filter by Department
    if (department && department !== 'ALL' && department !== 'all') {
      events = events.filter(e => {
        if (!e.target_department || e.target_department === 'ALL') return true;
        return e.target_department === department || e.target_department_id === department;
      });
    }

    // Filter by Batch
    if (batch && batch !== 'ALL' && batch !== 'all') {
      events = events.filter(e => {
        if (!e.target_batch || e.target_batch === 'ALL') return true;
        return e.target_batch === batch || e.target_batch_id === batch;
      });
    }

    // If logged-in user is a student without explicit filters, ensure events match student cohort
    if (isStudent && !department && !batch) {
      const studentProfile = (data.student_profiles || []).find(p => p.user_id === user.id);
      const studentDept = studentProfile?.department || ((data.departments || []).find(d => d.id === user.department_id)?.code) || 'CS';
      const studentSem = studentProfile?.current_semester || 4;
      const studentBatchId = studentProfile?.batch_id;

      events = events.filter(e => {
        const matchesDept = !e.target_department || e.target_department === 'ALL' || e.target_department === studentDept || e.target_department === user.department_id;
        const matchesSem = !e.target_semester || e.target_semester === 'ALL' || String(e.target_semester).replace(/^S/i, '') === String(studentSem);
        const matchesBatch = !e.target_batch || e.target_batch === 'ALL' || e.target_batch === studentBatchId;
        return matchesDept && matchesSem && matchesBatch;
      });
    }

    // Enrich events with friendly names
    const enriched = events.map(e => {
      const creator = (data.users || []).find(u => u.id === e.created_by);
      const dept = (data.departments || []).find(d => d.id === e.target_department || d.code === e.target_department);
      const batchObj = (data.batches || []).find(b => b.id === e.target_batch || b.name === e.target_batch);

      return {
        ...e,
        creator_name: creator ? creator.name : 'Academic Office',
        creator_role: creator ? creator.role : 'admin',
        department_name: dept ? dept.name : (e.target_department === 'ALL' ? 'All Departments' : e.target_department),
        department_code: dept ? dept.code : e.target_department,
        batch_name: batchObj ? batchObj.name : (e.target_batch === 'ALL' ? 'All Batches / Cohorts' : e.target_batch)
      };
    });

    // Sort chronologically by start_date ascending
    enriched.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    return res.json({
      success: true,
      count: enriched.length,
      data: enriched
    });
  } catch (err) {
    console.error('[Calendar GET Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve academic calendar events.'
    });
  }
});

/**
 * POST /api/calendar/events
 * Restrict to roles: 'super_admin', 'institution_admin', 'instructor', 'faculty'
 */
router.post(
  '/events',
  authenticateToken,
  verifyRole(['super_admin', 'faculty']),
  async (req, res) => {
    try {
      const {
        title,
        description,
        event_type,
        start_date,
        end_date,
        target_department = 'ALL',
        target_batch = 'ALL'
      } = req.body;

      // 1. Validation
      if (!title || !String(title).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Event title is required.'
        });
      }
      if (String(title).trim().length > 255) {
        return res.status(400).json({
          success: false,
          message: 'Event title must be 255 characters or fewer.'
        });
      }

      if (!event_type || !ALLOWED_EVENT_TYPES.includes(event_type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid event type. Must be one of: ${ALLOWED_EVENT_TYPES.join(', ')}`
        });
      }

      if (!start_date) {
        return res.status(400).json({
          success: false,
          message: 'Start date is required.'
        });
      }

      const parsedStart = new Date(start_date);
      if (isNaN(parsedStart.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Start date must be a valid date/time format.'
        });
      }

      const parsedEnd = end_date ? new Date(end_date) : parsedStart;
      if (isNaN(parsedEnd.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'End date must be a valid date/time format.'
        });
      }

      if (parsedEnd < parsedStart) {
        return res.status(400).json({
          success: false,
          message: 'End date cannot be earlier than start date.'
        });
      }

      const nowIso = new Date().toISOString();
      const newEvent = {
        id: `evt-${crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now()}`,
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        event_type,
        start_date: parsedStart.toISOString(),
        end_date: parsedEnd.toISOString(),
        target_department: target_department || 'ALL',
        target_batch: target_batch || 'ALL',
        created_by: req.user.id,
        created_at: nowIso,
        updated_at: nowIso
      };

      const data = db.getFallbackData();
      if (!data.academic_events) data.academic_events = [];
      data.academic_events.push(newEvent);
      db.saveFallbackData();

      // If MySQL is active, also insert
      if (!db.isUsingFallback()) {
        try {
          await db.query(
            `INSERT INTO academic_events (id, title, description, event_type, start_date, end_date, target_department, target_batch, created_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              newEvent.id,
              newEvent.title,
              newEvent.description,
              newEvent.event_type,
              parsedStart,
              parsedEnd,
              newEvent.target_department,
              newEvent.target_batch,
              newEvent.created_by,
              parsedStart,
              parsedStart
            ]
          );
        } catch (sqlErr) {
          console.warn('[MySQL Insert Event Warning]', sqlErr.message);
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Academic event created successfully.',
        data: newEvent
      });
    } catch (err) {
      console.error('[Calendar POST Error]', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to create academic event.'
      });
    }
  }
);

/**
 * PUT /api/calendar/events/:id
 * Restrict to roles: 'super_admin', 'institution_admin', 'instructor', 'faculty'
 */
router.put(
  '/events/:id',
  authenticateToken,
  verifyRole(['super_admin', 'faculty']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        event_type,
        start_date,
        end_date,
        target_department,
        target_batch
      } = req.body;

      const data = db.getFallbackData();
      const events = data.academic_events || [];
      const eventIndex = events.findIndex(e => e.id === id);

      if (eventIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Academic event not found.'
        });
      }

      const targetEvent = events[eventIndex];

      // Validate updates
      if (title !== undefined) {
        if (!String(title).trim()) {
          return res.status(400).json({ success: false, message: 'Event title cannot be empty.' });
        }
        targetEvent.title = String(title).trim();
      }

      if (description !== undefined) {
        targetEvent.description = description ? String(description).trim() : null;
      }

      if (event_type !== undefined) {
        if (!ALLOWED_EVENT_TYPES.includes(event_type)) {
          return res.status(400).json({
            success: false,
            message: `Invalid event type. Must be one of: ${ALLOWED_EVENT_TYPES.join(', ')}`
          });
        }
        targetEvent.event_type = event_type;
      }

      let parsedStart = new Date(targetEvent.start_date);
      if (start_date !== undefined) {
        parsedStart = new Date(start_date);
        if (isNaN(parsedStart.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid start date format.' });
        }
        targetEvent.start_date = parsedStart.toISOString();
      }

      let parsedEnd = new Date(targetEvent.end_date);
      if (end_date !== undefined) {
        parsedEnd = new Date(end_date);
        if (isNaN(parsedEnd.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid end date format.' });
        }
        targetEvent.end_date = parsedEnd.toISOString();
      }

      if (parsedEnd < parsedStart) {
        return res.status(400).json({
          success: false,
          message: 'End date cannot be earlier than start date.'
        });
      }

      if (target_department !== undefined) {
        targetEvent.target_department = target_department || 'ALL';
      }
      if (target_batch !== undefined) {
        targetEvent.target_batch = target_batch || 'ALL';
      }

      targetEvent.updated_at = new Date().toISOString();
      events[eventIndex] = targetEvent;
      data.academic_events = events;
      db.saveFallbackData();

      // If MySQL is active
      if (!db.isUsingFallback()) {
        try {
          await db.query(
            `UPDATE academic_events SET title = ?, description = ?, event_type = ?, start_date = ?, end_date = ?, target_department = ?, target_batch = ?, updated_at = NOW() WHERE id = ?`,
            [
              targetEvent.title,
              targetEvent.description,
              targetEvent.event_type,
              parsedStart,
              parsedEnd,
              targetEvent.target_department,
              targetEvent.target_batch,
              id
            ]
          );
        } catch (sqlErr) {
          console.warn('[MySQL Update Event Warning]', sqlErr.message);
        }
      }

      return res.json({
        success: true,
        message: 'Academic event updated successfully.',
        data: targetEvent
      });
    } catch (err) {
      console.error('[Calendar PUT Error]', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to update academic event.'
      });
    }
  }
);

/**
 * DELETE /api/calendar/events/:id
 * Restrict to roles: 'super_admin', 'institution_admin', 'instructor', 'faculty'
 */
router.delete(
  '/events/:id',
  authenticateToken,
  verifyRole(['super_admin', 'faculty']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const data = db.getFallbackData();
      const events = data.academic_events || [];
      const exists = events.some(e => e.id === id);

      if (!exists) {
        return res.status(404).json({
          success: false,
          message: 'Academic event not found.'
        });
      }

      data.academic_events = events.filter(e => e.id !== id);
      db.saveFallbackData();

      // If MySQL is active
      if (!db.isUsingFallback()) {
        try {
          await db.query('DELETE FROM academic_events WHERE id = ?', [id]);
        } catch (sqlErr) {
          console.warn('[MySQL Delete Event Warning]', sqlErr.message);
        }
      }

      return res.json({
        success: true,
        message: 'Academic event deleted successfully.'
      });
    } catch (err) {
      console.error('[Calendar DELETE Error]', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete academic event.'
      });
    }
  }
);

module.exports = router;
