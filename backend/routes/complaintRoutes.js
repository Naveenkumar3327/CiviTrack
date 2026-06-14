const express = require('express');
const router = express.Router();
const { 
  checkDuplicate,
  createComplaint,
  getComplaints,
  getComplaintById,
  upvoteComplaint,
  followComplaint,
  updateComplaintStatus,
  resolveComplaint,
  closeComplaint,
  getAdminAnalytics
} = require('../controllers/complaintController');
const { protect, admin } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

router.use(protect); // All complaint features require authentication

// Duplicate checking and Analytics
router.get('/check-duplicate', checkDuplicate);
router.get('/analytics', admin, getAdminAnalytics); // Place before :id to prevent collision

// General Complaint CRUD
router.post('/', upload.array('images', 5), createComplaint);
router.get('/', getComplaints);
router.get('/:id', getComplaintById);

// Social Upvote & Follow
router.post('/:id/upvote', upvoteComplaint);
router.post('/:id/follow', followComplaint);

// Admin Resolutions & Closures
router.put('/:id/status', admin, updateComplaintStatus);
router.put('/:id/resolve', admin, upload.array('images', 5), resolveComplaint);
router.put('/:id/close', closeComplaint); // Both citizen and admin can close

module.exports = router;
