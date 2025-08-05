const admin = require('../utils/firebaseAdmin');
const { getFirestore } = require('firebase-admin/firestore');

const sendChatNotification = async (req, res) => {
  const { receiverId, senderName, messageText } = req.body;

  if (!receiverId || !senderName || !messageText) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  try {
    // 🔍 Get FCM token from Firestore
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(receiverId).get();

    if (!userDoc.exists || !userDoc.data().fcmToken) {
      return res.status(404).json({ message: 'User or FCM token not found' });
    }

    const fcmToken = userDoc.data().fcmToken;

    const payload = {
      token: fcmToken,
      notification: {
        title: `${senderName} sent a message`,
        body: messageText.length > 50 ? messageText.slice(0, 47) + '...' : messageText,
      },
      data: {
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        type: 'chat',
        senderName,
        senderId: req.body.senderId || '',
      },
    };

    const response = await admin.messaging().send(payload);
    console.log('✅ Notification sent:', response);

    res.status(200).json({ success: true, response });
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { sendChatNotification };
