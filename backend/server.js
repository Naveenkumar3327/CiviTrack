require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const locationRoutes = require('./routes/locationRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database (or activate JSON file fallback)
connectDB();

// Middleware
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false, // Turn off CSP for easy local asset loading in demo
  crossOriginResourcePolicy: false // Allow loading images across local origins
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve local static file uploads
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/location', locationRoutes);

// Health check and index info
app.get('/', (res, response) => {
  response.status(200).json({
    message: '❇️ Welcome to the CiviTrack Civic Grievance System API Server.',
    status: 'online',
    database: global.dbConnected ? 'MongoDB Connected' : 'Offline JSON-File Fallback Active',
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'Resource endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Global server error:", err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'An internal server error occurred'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n============================================================`);
  console.log(`🚀 CiviTrack backend server is active at http://localhost:${PORT}`);
  console.log(`📂 Uploaded assets served at http://localhost:${PORT}/uploads/`);
  console.log(`============================================================\n`);
});
