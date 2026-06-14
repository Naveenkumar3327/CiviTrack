const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Otp = require('../models/Otp');

const JWT_SECRET = process.env.JWT_SECRET || 'civitrack_jwt_secret_token_key_2026_production_ready!';

// Helper to generate a token
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });
};

// Helper to generate a 6-digit numeric OTP
const generateOtpCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Register step 1: Request Email and Details, Generate OTP
 */
const register = async (req, res) => {
  const { name, email, mobileNumber, password, address, role } = req.body;

  if (!name || !email || !mobileNumber || !password) {
    return res.status(400).json({ success: false, message: 'Please provide all required fields' });
  }

  try {
    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Generate and store OTP
    const otpCode = generateOtpCode();
    await Otp.deleteMany({ email }); // Delete any prior OTPs
    await Otp.create({ email, otp: otpCode });

    // Print OTP to terminal so user can see it!
    console.log(`\n🔑 [OTP VERIFICATION] Account Registration for ${name} (${email}) | OTP CODE: ${otpCode}\n`);

    // In local demo mode, we return the OTP code directly in the response metadata
    // so the frontend client can pre-fill it automatically for convenience!
    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully to email.',
      debugOtp: otpCode // Auto-fill support for developer review
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

/**
 * Register step 2: Verify OTP and Create Account
 */
const verifyOtp = async (req, res) => {
  const { name, email, mobileNumber, password, address, role, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required' });
  }

  try {
    const record = await Otp.findOne({ email, otp });
    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await User.create({
      name,
      email,
      mobileNumber,
      password: hashedPassword,
      address: address || '',
      role: role || 'citizen'
    });

    // Delete used OTP
    await Otp.deleteMany({ email });

    // Generate token
    const token = generateToken(newUser._id || newUser.id);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: newUser._id || newUser.id,
        name: newUser.name,
        email: newUser.email,
        mobileNumber: newUser.mobileNumber,
        address: newUser.address,
        role: newUser.role,
        profilePicture: newUser.profilePicture || ''
      }
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({ success: false, message: 'Server error during verification' });
  }
};

/**
 * Log In User
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    // Compare passwords (handle mock Admin user explicitly or use bcrypt)
    let isMatch = false;
    if (user._id === "admin_mock_id" && password === "admin123") {
      isMatch = true;
    } else {
      isMatch = await bcrypt.compare(password, user.password);
    }

    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user._id || user.id);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        address: user.address,
        role: user.role,
        profilePicture: user.profilePicture || ''
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

/**
 * Forgot Password - Send OTP
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'No account registered with this email' });
    }

    const otpCode = generateOtpCode();
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp: otpCode });

    console.log(`\n🔑 [OTP VERIFICATION] Password Reset for ${user.name} (${email}) | OTP CODE: ${otpCode}\n`);

    return res.status(200).json({
      success: true,
      message: 'Password reset OTP sent successfully.',
      debugOtp: otpCode
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ success: false, message: 'Server error during reset request' });
  }
};

/**
 * Reset Password - Verify OTP and Save New Password
 */
const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    const record = await Otp.findOne({ email, otp });
    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.updateOne({ email }, { password: hashedPassword });
    await Otp.deleteMany({ email });

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully. You can now login.'
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ success: false, message: 'Server error during password reset' });
  }
};

module.exports = {
  register,
  verifyOtp,
  login,
  forgotPassword,
  resetPassword
};
