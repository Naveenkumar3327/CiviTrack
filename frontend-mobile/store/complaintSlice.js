import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_URL } from './authSlice';

const initialState = {
  complaints: [],
  loading: false,
  submitLoading: false,
  error: null
};

// Async Thunks
export const fetchComplaintsMobile = createAsyncThunk(
  'complaints/fetchComplaintsMobile',
  async (_, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    try {
      const response = await fetch(`${API_URL}/api/complaints`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return rejectWithValue(data.message || 'Failed to fetch complaints');
      }
      return data.complaints;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error occurred');
    }
  }
);

export const createComplaintMobile = createAsyncThunk(
  'complaints/createComplaintMobile',
  async (formData, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    try {
      const response = await fetch(`${API_URL}/api/complaints`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return rejectWithValue({
          message: data.message || 'Submission failed',
          isDuplicate: data.isDuplicate || false,
          complaint: data.complaint || null
        });
      }
      return data.complaint;
    } catch (err) {
      return rejectWithValue({ message: err.message || 'Network error' });
    }
  }
);

export const upvoteComplaintMobile = createAsyncThunk(
  'complaints/upvoteComplaintMobile',
  async (id, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    try {
      const response = await fetch(`${API_URL}/api/complaints/${id}/upvote`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return rejectWithValue(data.message || 'Upvote failed');
      }
      return data.complaint;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error');
    }
  }
);

export const followComplaintMobile = createAsyncThunk(
  'complaints/followComplaintMobile',
  async (id, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    try {
      const response = await fetch(`${API_URL}/api/complaints/${id}/follow`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return rejectWithValue(data.message || 'Follow failed');
      }
      return data.complaint;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error');
    }
  }
);

const complaintSlice = createSlice({
  name: 'complaints',
  initialState,
  reducers: {
    clearComplaintError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchComplaintsMobile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComplaintsMobile.fulfilled, (state, action) => {
        state.loading = false;
        state.complaints = action.payload;
      })
      .addCase(fetchComplaintsMobile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createComplaintMobile.pending, (state) => {
        state.submitLoading = true;
        state.error = null;
      })
      .addCase(createComplaintMobile.fulfilled, (state, action) => {
        state.submitLoading = false;
        state.complaints.unshift(action.payload);
      })
      .addCase(createComplaintMobile.rejected, (state, action) => {
        state.submitLoading = false;
        state.error = action.payload;
      })

      .addMatcher(
        (action) => [
          upvoteComplaintMobile.fulfilled.type,
          followComplaintMobile.fulfilled.type
        ].includes(action.type),
        (state, action) => {
          const updated = action.payload;
          state.complaints = state.complaints.map(c => 
            c._id === updated._id || c.id === updated.id ? updated : c
          );
        }
      );
  }
});

export const { clearComplaintError } = complaintSlice.actions;
export default complaintSlice.reducer;
