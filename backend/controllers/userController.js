const User = require('../models/User');
const Complaint = require('../models/Complaint');

/**
 * Fetch User Profile
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Retrieve citizen complaint history
    const complaints = await Complaint.find({ 'citizen.id': req.user.id });

    // Exclude password from output
    const userObj = user.toObject ? user.toObject() : user;
    const { password, ...safeUser } = userObj;

    return res.status(200).json({
      success: true,
      user: {
        id: user._id || user.id,
        ...safeUser,
        complaints: complaints || []
      }
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ success: false, message: 'Server error retrieving profile' });
  }
};

/**
 * Update User Profile Details
 */
const updateProfile = async (req, res) => {
  const { name, mobileNumber, address, profilePicture } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updates = {};
    if (name) updates.name = name;
    if (mobileNumber) updates.mobileNumber = mobileNumber;
    if (address) updates.address = address;
    if (profilePicture !== undefined) updates.profilePicture = profilePicture;

    const updatedUser = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
    const updatedUserObj = updatedUser.toObject ? updatedUser.toObject() : updatedUser;
    const { password, ...safeUser } = updatedUserObj;

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id || updatedUser.id,
        ...safeUser
      }
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
};

module.exports = {
  getProfile,
  updateProfile
};
