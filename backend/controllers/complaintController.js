const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { uploadToStorage } = require('../middleware/uploadMiddleware');
const { analyzeIssue } = require('../config/gemini');
const { sendPushNotification } = require('../config/firebase');

/**
 * Haversine formula to compute distance between two coordinates in meters
 */
const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};

/**
 * Check if a similar complaint exists within 100 meters
 */
const checkDuplicate = async (req, res) => {
  const { latitude, longitude } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  try {
    let duplicate = null;

    if (global.dbConnected) {
      // Use Mongoose 2dsphere index query
      duplicate = await Complaint.model.findOne({
        status: { $ne: 'Closed' },
        location: {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            $maxDistance: 100 // 100 meters
          }
        }
      });
    } else {
      // Fallback manual Haversine distance search on local JSON DB
      const complaints = await Complaint.find();
      duplicate = complaints.find((c) => {
        if (c.status === 'Closed') return false;
        const [cLng, cLat] = c.location.coordinates;
        const dist = getHaversineDistance(lat, lng, cLat, cLng);
        return dist <= 100;
      });
    }

    if (duplicate) {
      return res.status(200).json({
        success: true,
        isDuplicate: true,
        message: 'Similar issue already reported nearby.',
        complaint: duplicate
      });
    }

    return res.status(200).json({
      success: true,
      isDuplicate: false
    });
  } catch (error) {
    console.error("Duplicate check error:", error);
    return res.status(500).json({ success: false, message: 'Server error checking duplicates' });
  }
};

/**
 * Create a new Citizen Complaint
 */
const createComplaint = async (req, res) => {
  const { title, description, category, latitude, longitude, address, landmark, bypassDuplicate, city, state, country, postalCode, isAnonymous } = req.body;

  if (!title || !description || !latitude || !longitude || !address) {
    return res.status(400).json({ success: false, message: 'Please fill all required complaint fields' });
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  try {
    // 1. Nearby check (unless bypassed)
    if (bypassDuplicate !== 'true') {
      let duplicate = null;
      if (global.dbConnected) {
        duplicate = await Complaint.model.findOne({
          status: { $ne: 'Closed' },
          location: {
            $nearSphere: {
              $geometry: { type: 'Point', coordinates: [lng, lat] },
              $maxDistance: 100
            }
          }
        });
      } else {
        const complaints = await Complaint.find();
        duplicate = complaints.find((c) => {
          if (c.status === 'Closed') return false;
          const [cLng, cLat] = c.location.coordinates;
          return getHaversineDistance(lat, lng, cLat, cLng) <= 100;
        });
      }

      if (duplicate) {
        return res.status(409).json({
          success: false,
          isDuplicate: true,
          message: 'Similar issue already reported nearby. Use bypass to report anyway.',
          complaint: duplicate
        });
      }
    }

    // 2. Upload images (Multer stores them in req.files)
    const uploadedImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploaded = await uploadToStorage(file, req);
        uploadedImages.push(uploaded);
      }
    }

    // 3. AI analysis with Google Gemini
    let geminiSummary = '';
    let geminiPriority = 'Medium';
    let detectedCategory = category;

    if (uploadedImages.length > 0 && req.files && req.files[0]) {
      const mainFile = req.files[0];
      const aiResult = await analyzeIssue(mainFile.buffer, mainFile.mimetype, description);
      geminiSummary = aiResult.summary;
      geminiPriority = aiResult.suggestedPriority;
      
      // Auto-assign category if client specified 'Other' or left empty
      if (!detectedCategory || detectedCategory === 'Other') {
        detectedCategory = aiResult.category;
      }
    }

    // 4. Save to Database
    const newComplaint = await Complaint.create({
      title,
      description,
      category: detectedCategory || 'Other',
      priority: geminiPriority || 'Medium',
      images: uploadedImages,
      location: {
        type: 'Point',
        coordinates: [lng, lat],
        address,
        landmark: landmark || '',
        city: city || '',
        state: state || '',
        country: country || '',
        postalCode: postalCode || ''
      },
      isAnonymous: isAnonymous === 'true',
      status: 'Pending',
      statusTimeline: [
        {
          status: 'Pending',
          remarks: 'Complaint successfully submitted by citizen.',
          updatedBy: 'Citizen',
          timestamp: new Date()
        }
      ],
      upvotes: [],
      followers: [req.user.id],
      citizen: {
        id: req.user.id,
        name: req.user.name
      },
      geminiSummary,
      geminiPriority,
      resolutionDetails: {
        beforeImages: uploadedImages.map(img => img.url),
        afterImages: [],
        remarks: ''
      }
    });

    // 5. Notify Citizen (Push simulator)
    await sendPushNotification(
      req.user.id,
      'Complaint Submitted',
      `Your complaint "${title}" has been registered successfully. Track status: Pending.`,
      { complaintId: newComplaint._id || newComplaint.id }
    );

    return res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      complaint: newComplaint
    });
  } catch (error) {
    console.error("Create complaint error:", error);
    return res.status(500).json({ success: false, message: 'Server error filing complaint' });
  }
};

/**
 * Get all complaints (with filters, search, and sorting)
 */
const getComplaints = async (req, res) => {
  const { search, category, status, sortBy, period } = req.query;

  try {
    let complaints = await Complaint.find();

    // 1. Search filter (by ID, address, title)
    if (search) {
      const q = search.toLowerCase();
      complaints = complaints.filter(
        (c) =>
          (c._id && c._id.toString().toLowerCase().includes(q)) ||
          (c.title && c.title.toLowerCase().includes(q)) ||
          (c.location && c.location.address.toLowerCase().includes(q))
      );
    }

    // 2. Category filter
    if (category && category !== 'All') {
      complaints = complaints.filter((c) => c.category === category);
    }

    // 3. Status filter
    if (status && status !== 'All') {
      complaints = complaints.filter((c) => c.status === status);
    }

    // 4. Date filter (period: today, week, month)
    if (period && period !== 'All') {
      const limitDate = new Date();
      if (period === 'Today') limitDate.setHours(0, 0, 0, 0);
      else if (period === 'Week') limitDate.setDate(limitDate.getDate() - 7);
      else if (period === 'Month') limitDate.setMonth(limitDate.getMonth() - 1);

      complaints = complaints.filter((c) => new Date(c.createdAt) >= limitDate);
    }

    // 5. Sorting (upvotes vs newest)
    if (sortBy === 'upvotes') {
      complaints.sort((a, b) => (b.upvotes ? b.upvotes.length : 0) - (a.upvotes ? a.upvotes.length : 0));
    } else {
      // Default: Newest first
      complaints.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Hide user details for anonymous complaints if requesting user is not admin
    const isAdmin = req.user && req.user.role === 'admin';
    const processedComplaints = complaints.map(c => {
      const doc = c.toObject ? c.toObject() : { ...c };
      if (doc.isAnonymous && !isAdmin) {
        doc.citizen = { id: '', name: 'Anonymous Citizen' };
      }
      return doc;
    });

    return res.status(200).json({
      success: true,
      count: processedComplaints.length,
      complaints: processedComplaints
    });
  } catch (error) {
    console.error("Get complaints error:", error);
    return res.status(500).json({ success: false, message: 'Server error retrieving complaints' });
  }
};

/**
 * Fetch Single Complaint Details
 */
const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }
    
    const doc = complaint.toObject ? complaint.toObject() : { ...complaint };
    const isAdmin = req.user && req.user.role === 'admin';
    if (doc.isAnonymous && !isAdmin) {
      doc.citizen = { id: '', name: 'Anonymous Citizen' };
    }

    return res.status(200).json({ success: true, complaint: doc });
  } catch (error) {
    console.error("Get complaint by ID error:", error);
    return res.status(500).json({ success: false, message: 'Server error retrieving complaint detail' });
  }
};

/**
 * Upvote a Complaint
 */
const upvoteComplaint = async (req, res) => {
  const userId = req.user.id;
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const upvoted = complaint.upvotes.includes(userId);
    let updated;

    if (upvoted) {
      // Remove upvote
      updated = await Complaint.findByIdAndUpdate(
        req.params.id,
        { $pull: { upvotes: userId } },
        { new: true }
      );
    } else {
      // Add upvote
      updated = await Complaint.findByIdAndUpdate(
        req.params.id,
        { $push: { upvotes: userId } },
        { new: true }
      );
    }

    return res.status(200).json({
      success: true,
      upvoted: !upvoted,
      upvoteCount: updated.upvotes.length,
      complaint: updated
    });
  } catch (error) {
    console.error("Upvote error:", error);
    return res.status(500).json({ success: false, message: 'Server error processing upvote' });
  }
};

/**
 * Follow / Subscribe to updates for a complaint
 */
const followComplaint = async (req, res) => {
  const userId = req.user.id;
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const following = complaint.followers.includes(userId);
    let updated;

    if (following) {
      // Unfollow
      updated = await Complaint.findByIdAndUpdate(
        req.params.id,
        { $pull: { followers: userId } },
        { new: true }
      );
    } else {
      // Follow
      updated = await Complaint.findByIdAndUpdate(
        req.params.id,
        { $push: { followers: userId } },
        { new: true }
      );
    }

    return res.status(200).json({
      success: true,
      following: !following,
      complaint: updated
    });
  } catch (error) {
    console.error("Follow error:", error);
    return res.status(500).json({ success: false, message: 'Server error processing follow status' });
  }
};

/**
 * Admin: Update Complaint Status / Assign Officer / Add Remarks
 */
const updateComplaintStatus = async (req, res) => {
  const { status, remarks, priority } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required' });
  }

  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const timelineNode = {
      status,
      remarks: remarks || `Status transitioned to ${status}`,
      updatedBy: req.user.name,
      timestamp: new Date()
    };

    const updateObj = {
      $set: { status },
      $push: { statusTimeline: timelineNode }
    };

    if (priority) {
      updateObj.$set.priority = priority;
    }

    const updated = await Complaint.findByIdAndUpdate(req.params.id, updateObj, { new: true });

    // Send notifications to all subscribers (followers)
    if (updated.followers && updated.followers.length > 0) {
      for (const followerId of updated.followers) {
        await sendPushNotification(
          followerId,
          `Complaint Update: ${status}`,
          `Complaint "${updated.title}" has been updated to "${status}". Remarks: ${remarks || 'None'}`,
          { complaintId: updated._id || updated.id }
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: `Status successfully updated to ${status}`,
      complaint: updated
    });
  } catch (error) {
    console.error("Admin status update error:", error);
    return res.status(500).json({ success: false, message: 'Server error updating status' });
  }
};

/**
 * Admin: Upload Resolution Files and Solve Issue
 */
const resolveComplaint = async (req, res) => {
  const { remarks } = req.body;

  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Upload "After" images
    const uploadedImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploaded = await uploadToStorage(file, req);
        uploadedImages.push(uploaded.url);
      }
    }

    const timelineNode = {
      status: 'Resolved',
      remarks: remarks || 'The issue has been resolved. Please review the resolution before closing.',
      updatedBy: req.user.name,
      timestamp: new Date()
    };

    const updateObj = {
      $set: {
        status: 'Resolved',
        'resolutionDetails.afterImages': uploadedImages,
        'resolutionDetails.remarks': remarks || 'Issue resolved successfully.',
        'resolutionDetails.resolvedAt': new Date()
      },
      $push: { statusTimeline: timelineNode }
    };

    const updated = await Complaint.findByIdAndUpdate(req.params.id, updateObj, { new: true });

    // Notify subscribers
    if (updated.followers && updated.followers.length > 0) {
      for (const followerId of updated.followers) {
        await sendPushNotification(
          followerId,
          'Issue Resolved ❇️',
          `Good news! The reported issue "${updated.title}" has been resolved.`,
          { complaintId: updated._id || updated.id }
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Complaint resolved successfully',
      complaint: updated
    });
  } catch (error) {
    console.error("Resolve complaint error:", error);
    return res.status(500).json({ success: false, message: 'Server error resolving complaint' });
  }
};

/**
 * Admin/User: Close Complaint
 */
const closeComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const timelineNode = {
      status: 'Closed',
      remarks: 'Complaint has been verified and permanently closed.',
      updatedBy: req.user.name,
      timestamp: new Date()
    };

    const updateObj = {
      $set: {
        status: 'Closed',
        'resolutionDetails.closedAt': new Date()
      },
      $push: { statusTimeline: timelineNode }
    };

    const updated = await Complaint.findByIdAndUpdate(req.params.id, updateObj, { new: true });

    // Notify subscribers
    if (updated.followers && updated.followers.length > 0) {
      for (const followerId of updated.followers) {
        await sendPushNotification(
          followerId,
          'Complaint Closed 🔒',
          `Your reported issue "${updated.title}" is now archived and closed.`,
          { complaintId: updated._id || updated.id }
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Complaint closed successfully',
      complaint: updated
    });
  } catch (error) {
    console.error("Close complaint error:", error);
    return res.status(500).json({ success: false, message: 'Server error closing complaint' });
  }
};

/**
 * Admin: Get Dashboard Analytics
 */
const getAdminAnalytics = async (req, res) => {
  try {
    const complaints = await Complaint.find();

    // 1. Basic Counts
    const stats = {
      total: complaints.length,
      pending: complaints.filter(c => c.status === 'Pending').length,
      underReview: complaints.filter(c => c.status === 'Under Review').length,
      assigned: complaints.filter(c => c.status === 'Assigned').length,
      inProgress: complaints.filter(c => c.status === 'In Progress').length,
      resolved: complaints.filter(c => c.status === 'Resolved').length,
      closed: complaints.filter(c => c.status === 'Closed').length
    };

    // 2. Category Breakdown
    const categoriesBreakdown = {};
    complaints.forEach((c) => {
      categoriesBreakdown[c.category] = (categoriesBreakdown[c.category] || 0) + 1;
    });

    // 3. Monthly Trends (last 6 months)
    const monthlyTrends = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Seed last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthlyTrends[label] = { submitted: 0, resolved: 0 };
    }

    complaints.forEach((c) => {
      const cDate = new Date(c.createdAt);
      const cMonthLabel = `${monthNames[cDate.getMonth()]} ${cDate.getFullYear()}`;
      if (monthlyTrends[cMonthLabel] !== undefined) {
        monthlyTrends[cMonthLabel].submitted += 1;
      }

      if (c.status === 'Resolved' && c.resolutionDetails && c.resolutionDetails.resolvedAt) {
        const rDate = new Date(c.resolutionDetails.resolvedAt);
        const rMonthLabel = `${monthNames[rDate.getMonth()]} ${rDate.getFullYear()}`;
        if (monthlyTrends[rMonthLabel] !== undefined) {
          monthlyTrends[rMonthLabel].resolved += 1;
        }
      }
    });

    // Convert trends to array
    const monthlyTrendsArray = Object.keys(monthlyTrends).map(key => ({
      month: key,
      submitted: monthlyTrends[key].submitted,
      resolved: monthlyTrends[key].resolved
    }));

    // 4. Area/Neighborhood Breakdown (extract from address or mock simple groups)
    const areaBreakdown = {};
    complaints.forEach((c) => {
      // Get neighborhood or street. E.g. Split address by comma, take second element, or simple fallback
      const addressParts = c.location.address.split(',');
      const area = addressParts.length > 1 ? addressParts[1].trim() : 'Central District';
      areaBreakdown[area] = (areaBreakdown[area] || 0) + 1;
    });

    // Sort areaBreakdown and take top 5
    const topAreas = Object.keys(areaBreakdown)
      .map(name => ({ name, count: areaBreakdown[name] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 5. In-app notification logs (for simulation page)
    const notifications = global.simulatedNotifications || [];

    return res.status(200).json({
      success: true,
      analytics: {
        stats,
        categories: categoriesBreakdown,
        monthlyTrends: monthlyTrendsArray,
        topAreas,
        recentNotifications: notifications.slice(0, 15)
      }
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return res.status(500).json({ success: false, message: 'Server error compiling dashboard analytics' });
  }
};

module.exports = {
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
};
