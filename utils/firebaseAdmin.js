// utils/firebaseAdmin.js
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // ✅ Ensure correct path

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = admin;
