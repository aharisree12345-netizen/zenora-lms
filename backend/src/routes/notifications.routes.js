const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/notifications (User's notification feed)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const data = db.getFallbackData();
    const myNotifs = (data.notifications || [])
      .filter(n => n.user_id === req.user.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const unreadCount = myNotifs.filter(n => !n.is_read).length;

    return res.json({
      success: true,
      unread_count: unreadCount,
      count: myNotifs.length,
      data: myNotifs
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve notifications.' });
  }
});

// PUT /api/notifications/:id/read (Mark single notification as read)
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const data = db.getFallbackData();
    const notif = (data.notifications || []).find(n => n.id === id && n.user_id === req.user.id);

    if (notif) {
      notif.is_read = true;
      db.saveFallbackData();
    }

    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
});

// PUT /api/notifications/read-all (Mark all user's notifications as read)
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const data = db.getFallbackData();
    (data.notifications || []).forEach(n => {
      if (n.user_id === req.user.id) {
        n.is_read = true;
      }
    });
    db.saveFallbackData();

    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to mark notifications.' });
  }
});

module.exports = router;
