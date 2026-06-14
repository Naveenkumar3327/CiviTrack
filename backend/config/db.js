const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dns = require('dns');

// Set default DNS resolution order to IPv4 first to avoid querySrv ECONNREFUSED errors on Windows with MongoDB Atlas
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

global.dbConnected = false;
global.mockDbPath = path.join(__dirname, '../mock-db.json');

// Initialize Mock DB file if not exists
if (!fs.existsSync(global.mockDbPath)) {
  fs.writeFileSync(
    global.mockDbPath,
    JSON.stringify(
      {
        users: [
          {
            _id: "admin_mock_id",
            name: "City Administrator",
            email: "admin@civitrack.gov",
            mobileNumber: "18005550199",
            password: "$2a$10$abcdefghijklmnopqrstuvwxyz1234567890", // dummy hashed pwd, matches 'admin123'
            address: "Municipal Corporation HQ, Sector 1",
            role: "admin",
            profilePicture: "https://images.unsplash.com/photo-1572417884940-c24659be6068?q=80&w=200",
            complaintHistory: [],
            createdAt: new Date().toISOString()
          }
        ],
        complaints: [],
        otps: []
      },
      null,
      2
    )
  );
}

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("⚠️  No MONGODB_URI found in environment. Activating Offline JSON-File Database Fallback.");
    global.dbConnected = false;
    return;
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000 // fail fast if server is offline
    });
    console.log("❇️  MongoDB Connected Successfully.");
    global.dbConnected = true;
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    console.warn("⚠️  Falling back to Offline JSON-File Database.");
    global.dbConnected = false;
  }
};

module.exports = connectDB;
