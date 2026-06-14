import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Platform } from 'react-native';

// Production Backend Render server
const API_URL = 'https://civitrack-backend-yy9q.onrender.com';

const initialState = {
  user: null,
  token: null,
  loading: false,
  error: null,
  otpRequested: false,
  otpEmail: null,
  otpPayload: null,
  otpDebug: null
};

// Async Thunks
export const loginMobile = createAsyncThunk(
  'auth/loginMobile',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return rejectWithValue(data.message || 'Login failed');
      }
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error occurred');
    }
  }
);

export const registerMobile = createAsyncThunk(
  'auth/registerMobile',
  async (details, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details)
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return rejectWithValue(data.message || 'Registration request failed');
      }
      return { data, details };
    } catch (err) {
      return rejectWithValue(err.message || 'Network error occurred');
    }
  }
);

export const verifyOtpMobile = createAsyncThunk(
  'auth/verifyOtpMobile',
  async (otpDetails, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(otpDetails)
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return rejectWithValue(data.message || 'Invalid or expired OTP');
      }
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error occurred');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logoutMobile: (state) => {
      state.user = null;
      state.token = null;
      state.error = null;
      state.otpRequested = false;
      state.otpEmail = null;
      state.otpPayload = null;
      state.otpDebug = null;
    },
    clearMobileError: (state) => {
      state.error = null;
    },
    cancelOtpMobile: (state) => {
      state.otpRequested = false;
      state.otpEmail = null;
      state.otpPayload = null;
      state.otpDebug = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginMobile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginMobile.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(loginMobile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Register
      .addCase(registerMobile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerMobile.fulfilled, (state, action) => {
        state.loading = false;
        state.otpRequested = true;
        state.otpEmail = action.payload.details.email;
        state.otpPayload = action.payload.details;
        state.otpDebug = action.payload.data.debugOtp || null;
      })
      .addCase(registerMobile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Verify OTP
      .addCase(verifyOtpMobile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOtpMobile.fulfilled, (state, action) => {
        state.loading = false;
        state.otpRequested = false;
        state.otpEmail = null;
        state.otpPayload = null;
        state.otpDebug = null;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(verifyOtpMobile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { logoutMobile, clearMobileError, cancelOtpMobile } = authSlice.actions;
export default authSlice.reducer;
export { API_URL };
