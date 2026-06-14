// Firebase Cloud Messaging configuration wrapper
let firebaseEnabled = false;
let admin = null;

try {
  // If user supplies serviceAccountKey.json, initialize it
  const fs = require('fs');
  const path = require('path');
  const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');

  if (fs.existsSync(serviceAccountPath)) {
    admin = require('firebase-admin');
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("❇️  Firebase Admin SDK initialized successfully.");
    firebaseEnabled = true;
  } else {
    console.warn("⚠️  Firebase serviceAccountKey.json missing. Push notifications will be simulated.");
  }
} catch (error) {
  console.warn("⚠️  Firebase Admin initialization failed. Push notifications will be simulated.");
}

/**
 * Dispatches a push notification to a device token or simulates it in log
 */
const sendPushNotification = async (token, title, body, data = {}) => {
  console.log(`🔔 [NOTIFICATION] To: ${token || 'All Subscribers'} | Title: "${title}" | Body: "${body}" | Data:`, data);
  
  if (!firebaseEnabled || !admin || !token) {
    // In-memory global store so client can fetch simulated notifications
    if (!global.simulatedNotifications) global.simulatedNotifications = [];
    global.simulatedNotifications.unshift({
      id: Date.now().toString(),
      token,
      title,
      body,
      data,
      timestamp: new Date().toISOString()
    });
    return { success: true, simulated: true };
  }

  try {
    const message = {
      notification: { title, body },
      data: data || {},
      token: token
    };
    const response = await admin.messaging().send(message);
    return { success: true, messageId: response };
  } catch (error) {
    console.error("❌ Firebase notification failed:", error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPushNotification,
  firebaseEnabled
};
