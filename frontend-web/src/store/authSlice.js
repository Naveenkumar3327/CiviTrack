import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Retrieve initial state from local storage
const token = localStorage.getItem('token') || null;
let user = null;
try {
  user = JSON.parse(localStorage.getItem('user')) || null;
} catch (e) {
  user = null;
}

const initialState = {
  user,
  token,
  loading: false,
  error: null,
  otpRequested: false,
  otpEmail: null,
  otpPayload: null, // Temporary store for registration info
  otpDebug: null // Helpful for local testing
};

// Async Thunks
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/login', {
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

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (details, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details)
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return rejectWithValue(data.message || 'Registration request failed');
      }
      return { data, details }; // Return details to combine later during OTP validation
    } catch (err) {
      return rejectWithValue(err.message || 'Network error occurred');
    }
  }
);

export const verifyOtpCode = createAsyncThunk(
  'auth/verifyOtpCode',
  async (otpDetails, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/verify-otp', {
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

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { getState, rejectWithValue }) => {
    const { auth } = getState();
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(profileData)
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return rejectWithValue(data.message || 'Profile update failed');
      }
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error occurred');
    }
  }
);

export const getProfileDetails = createAsyncThunk(
  'auth/getProfileDetails',
  async (_, { getState, rejectWithValue }) => {
    const { auth } = getState();
    try {
      const response = await fetch('/api/users/profile', {
        headers: { 'Authorization': `Bearer ${auth.token}` }
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return rejectWithValue(data.message || 'Failed to retrieve profile details');
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
    logout: (state) => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      state.user = null;
      state.token = null;
      state.error = null;
      state.otpRequested = false;
      state.otpEmail = null;
      state.otpPayload = null;
      state.otpDebug = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    cancelOtpRequest: (state) => {
      state.otpRequested = false;
      state.otpEmail = null;
      state.otpPayload = null;
      state.otpDebug = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        localStorage.setItem('token', action.payload.token);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Register (Step 1)
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.otpRequested = true;
        state.otpEmail = action.payload.details.email;
        state.otpPayload = action.payload.details;
        state.otpDebug = action.payload.data.debugOtp || null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Verify OTP (Step 2)
      .addCase(verifyOtpCode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOtpCode.fulfilled, (state, action) => {
        state.loading = false;
        state.otpRequested = false;
        state.otpEmail = null;
        state.otpPayload = null;
        state.otpDebug = null;
        state.token = action.payload.token;
        state.user = action.payload.user;
        localStorage.setItem('token', action.payload.token);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(verifyOtpCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update Profile
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get Profile Details
      .addCase(getProfileDetails.fulfilled, (state, action) => {
        // Just refresh complaints list and profile data
        state.user = {
          ...state.user,
          ...action.payload.user
        };
        localStorage.setItem('user', JSON.stringify(state.user));
      });
  }
});

export const { logout, clearError, cancelOtpRequest } = authSlice.actions;
export default authSlice.reducer;
