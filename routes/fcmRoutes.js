const express = require('express');
const router = express.Router();
const { sendNotification, saveFcmToken, getFcmToken } = require('../controllers/fcmController');

// 🔔 Send push notification
router.post('/send-notification', sendNotification);

// 💾 Save FCM token
router.post('/save-token', saveFcmToken);

// 🔍 Get FCM token
router.get('/get-token', getFcmToken);

module.exports = router;
