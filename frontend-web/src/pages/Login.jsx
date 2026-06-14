import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser, verifyOtpCode, clearError, cancelOtpRequest } from '../store/authSlice';
import { LogIn, UserPlus, HelpCircle, Lock, Mail, Phone, MapPin, User, AlertCircle, KeyRound } from 'lucide-react';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, loading, error, otpRequested, otpEmail, otpDebug, otpPayload } = useSelector(state => state.auth);

  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot' | 'reset'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobileNumber: '',
    password: '',
    address: '',
    role: 'citizen' // default
  });
  
  const [otpInput, setOtpInput] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetData, setResetData] = useState({
    email: '',
    otp: '',
    newPassword: ''
  });

  const [validationError, setValidationError] = useState('');

  // Redirect if logged in
  useEffect(() => {
    if (token) {
      navigate('/dashboard');
    }
  }, [token, navigate]);

  // Clear errors when changing modes
  useEffect(() => {
    dispatch(clearError());
    setValidationError('');
  }, [mode, dispatch]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setValidationError('Please enter both email and password.');
      return;
    }
    dispatch(loginUser({ email: formData.email, password: formData.password }));
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    const { name, email, mobileNumber, password } = formData;
    if (!name || !email || !mobileNumber || !password) {
      setValidationError('Please fill in all required fields.');
      return;
    }
    dispatch(registerUser(formData));
  };

  const handleOtpVerifySubmit = (e) => {
    e.preventDefault();
    if (!otpInput) {
      setValidationError('Please enter the verification OTP code.');
      return;
    }
    dispatch(verifyOtpCode({
      ...otpPayload,
      otp: otpInput
    }));
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      setValidationError('Please provide your registered email address.');
      return;
    }
    fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setResetData({ ...resetData, email: forgotEmail });
          // If debugging, alert the OTP
          if (data.debugOtp) {
            console.log("Debug Reset OTP:", data.debugOtp);
            alert(`Debug Password Reset OTP Code: ${data.debugOtp}`);
          }
          setMode('reset');
        } else {
          setValidationError(data.message || 'Verification failed');
        }
      });
  };

  const handleResetSubmit = (e) => {
    e.preventDefault();
    if (!resetData.otp || !resetData.newPassword) {
      setValidationError('All fields are required.');
      return;
    }
    fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resetData)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert('Password reset successful! You can now login.');
          setMode('login');
        } else {
          setValidationError(data.message || 'Reset password failed');
        }
      });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05), rgba(16, 185, 129, 0.05))',
      padding: '2rem'
    }}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: '480px', padding: '2.5rem', boxShadow: 'var(--shadow-lg)' }}>
        
        {/* Logo Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            backgroundColor: 'var(--primary)',
            color: 'white',
            padding: '0.85rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem'
          }}>
            <KeyRound size={28} />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>CiviTrack</h2>
          <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Citizen Complaint & Infrastructure Tracking Portal
          </p>
        </div>

        {/* Global Error Banner */}
        {(error || validationError) && (
          <div className="flex-row" style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--status-pending)',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error || validationError}</span>
          </div>
        )}

        {/* ====================================================
            LOGIN FORM
            ==================================================== */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="flex-column">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input 
                  type="email" 
                  name="email"
                  placeholder="name@city.gov" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem', width: '100%' }}
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input 
                  type="password" 
                  name="password"
                  placeholder="••••••••" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem', width: '100%' }}
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <button 
                type="button" 
                style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontWeight: 600 }}
                onClick={() => setMode('forgot')}
              >
                Forgot Password?
              </button>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
              <LogIn size={18} /> {loading ? 'Logging in...' : 'Sign In'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-light)' }}>
              Don't have an account?{' '}
              <button type="button" style={{ color: 'var(--primary)', fontWeight: 700 }} onClick={() => setMode('register')}>
                Register Here
              </button>
            </div>
          </form>
        )}

        {/* ====================================================
            REGISTER FORM
            ==================================================== */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="flex-column">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input 
                  type="text" 
                  name="name"
                  placeholder="John Doe" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem', width: '100%' }}
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input 
                  type="email" 
                  name="email"
                  placeholder="johndoe@email.com" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem', width: '100%' }}
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Mobile Number</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                  <input 
                    type="tel" 
                    name="mobileNumber"
                    placeholder="9876543210" 
                    className="form-control" 
                    style={{ paddingLeft: '2.5rem', width: '100%' }}
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Account Role</label>
                <select 
                  name="role"
                  className="form-control" 
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="citizen">Citizen User</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input 
                  type="password" 
                  name="password"
                  placeholder="••••••••" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem', width: '100%' }}
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Primary Address</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-light)' }} />
                <textarea 
                  name="address"
                  placeholder="123 Civic Street, Area, City" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem', width: '100%', height: '70px', resize: 'none' }}
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
              <UserPlus size={18} /> {loading ? 'Registering...' : 'Submit Registration'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-light)' }}>
              Already registered?{' '}
              <button type="button" style={{ color: 'var(--primary)', fontWeight: 700 }} onClick={() => setMode('login')}>
                Sign In Instead
              </button>
            </div>
          </form>
        )}

        {/* ====================================================
            FORGOT PASSWORD FORM
            ==================================================== */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="flex-column">
            <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Trouble signing in?</h4>
            <p style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>
              Provide your email address and we will generate a security OTP code to reset your password credentials.
            </p>

            <div className="form-group" style={{ marginTop: '0.5rem' }}>
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input 
                  type="email" 
                  placeholder="name@email.com" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem', width: '100%' }}
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
              Generate Reset OTP
            </button>

            <button 
              type="button" 
              className="btn btn-outline" 
              style={{ width: '100%' }}
              onClick={() => setMode('login')}
            >
              Back to Login
            </button>
          </form>
        )}

        {/* ====================================================
            PASSWORD RESET FORM
            ==================================================== */}
        {mode === 'reset' && (
          <form onSubmit={handleResetSubmit} className="flex-column">
            <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Set New Password</h4>
            <p style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>
              Enter the OTP code received and define your new login password.
            </p>

            <div className="form-group">
              <label className="form-label">Security OTP Code</label>
              <input 
                type="text" 
                placeholder="6-Digit OTP" 
                className="form-control" 
                value={resetData.otp}
                onChange={e => setResetData({ ...resetData, otp: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <input 
                type="password" 
                placeholder="New Password (min 6 characters)" 
                className="form-control" 
                value={resetData.newPassword}
                onChange={e => setResetData({ ...resetData, newPassword: e.target.value })}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
              Confirm Password Change
            </button>
          </form>
        )}

      </div>

      {/* ====================================================
          OTP VERIFICATION POPUP MODAL (STEP 2 FOR REGISTRATION)
          ==================================================== */}
      {otpRequested && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <KeyRound size={20} style={{ color: 'var(--primary)' }} />
                Verify OTP Security Code
              </h3>
            </div>
            
            <form onSubmit={handleOtpVerifySubmit}>
              <div className="modal-body flex-column">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', lineHeight: '1.4' }}>
                  A one-time verification password has been dispatched to <strong>{otpEmail}</strong>. Please input the 6-digit code below to finalize your registration.
                </p>

                <div className="form-group">
                  <label className="form-label">Enter 6-Digit OTP</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    placeholder="123456" 
                    className="form-control" 
                    style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.4rem', fontWeight: 'bold' }}
                    value={otpInput}
                    onChange={e => setOtpInput(e.target.value.replace(/\D/g,''))}
                    required
                  />
                </div>

                {/* Developer QoL helper banner */}
                {otpDebug && (
                  <div style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px dashed var(--primary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem',
                    textAlign: 'center',
                    fontSize: '0.85rem'
                  }}>
                    <span>👨‍💻 Local Debug Mode Active:</span>
                    <div style={{ marginTop: '0.25rem', fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '4px' }}>
                      {otpDebug}
                    </div>
                    <button 
                      type="button" 
                      style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 'bold', marginTop: '0.25rem' }}
                      onClick={() => setOtpInput(otpDebug)}
                    >
                      (Auto-Fill Code)
                    </button>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => dispatch(cancelOtpRequest())}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify & Log In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
