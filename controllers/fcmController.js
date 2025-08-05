const admin = require('../utils/firebaseAdmin');

// 🔔 Send Push Notification via FCM
const sendNotification = async (req, res) => {
  const { fcmToken, title, body } = req.body;

  // Basic validation
  if (!fcmToken || !body) {
    return res.status(400).json({ success: false, message: 'Missing fcmToken or body' });
  }

  const notificationPayload = {
    token: fcmToken,
    notification: {
      title: title || 'New Message',
      body: body,
    },
    data: {
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
      screen: 'ChatScreen', // optional: use this in client to navigate
    },
    android: {
      notification: {
        sound: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
        },
      },
    },
  };

  try {
    const response = await admin.messaging().send(notificationPayload);
    console.log("✅ Notification sent successfully:", response);
    return res.status(200).json({ success: true, response });
  } catch (error) {
    console.error("❌ FCM Send Error:", error);
    return res.status(500).json({ success: false, message: 'Notification failed', error: error.message });
  }
};

// 💾 Save/Update FCM Token for a User
const saveFcmToken = async (req, res) => {
  const { userId, fcmToken } = req.body;

  if (!userId || !fcmToken) {
    return res.status(400).json({ success: false, message: 'Missing userId or fcmToken' });
  }

  try {
    const userRef = admin.firestore().collection('users').doc(userId);
    await userRef.set({ fcmToken }, { merge: true });

    return res.status(200).json({ success: true, message: '✅ FCM token saved successfully' });
  } catch (error) {
    console.error("❌ Save FCM Token Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 🔍 Get FCM Token for a User (Optional Usage)
const getFcmToken = async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'Missing userId' });
  }

  try {
    const userRef = admin.firestore().collection('users').doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const data = doc.data();
    return res.status(200).json({ success: true, fcmToken: data.fcmToken || null });
  } catch (error) {
    console.error("❌ Get FCM Token Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  sendNotification,
  saveFcmToken,
  getFcmToken,
};
