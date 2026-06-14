import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const initialState = {
  complaints: [],
  currentComplaint: null,
  analytics: null,
  loading: false,
  submitLoading: false,
  analyticsLoading: false,
  error: null
};

// Helper for headers
const getHeaders = (token) => ({
  'Authorization': `Bearer ${token}`
});

// Async Thunks
export const fetchComplaints = createAsyncThunk(
  'complaints/fetchComplaints',
  async (filters = {}, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    const { category, status, period, sortBy, search } = filters;
    
    // Construct query parameters
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (status) params.append('status', status);
    if (period) params.append('period', period);
    if (sortBy) params.append('sortBy', sortBy);
    if (search) params.append('search', search);

    try {
      const response = await fetch(`/api/complaints?${params.toString()}`, {
        headers: getHeaders(token)
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

export const fetchComplaintById = createAsyncThunk(
  'complaints/fetchComplaintById',
  async (id, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    try {
      const response = await fetch(`/api/complaints/${id}`, {
        headers: getHeaders(token)
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return rejectWithValue(data.message || 'Failed to fetch complaint details');
      }
      return data.complaint;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error occurred');
    }
  }
);

export const createNewComplaint = createAsyncThunk(
  'complaints/createNewComplaint',
  async (formData, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    try {
      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Note: Do not set Content-Type header when uploading FormData! Multer needs to generate boundaries.
        },
        body: formData
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return rejectWithValue({
          message: data.message || 'Complaint submission failed',
          isDuplicate: data.isDuplicate || false,
          complaint: data.complaint || null
        });
      }
      return data.complaint;
    } catch (err) {
      return rejectWithValue({ message: err.message || 'Network error occurred' });
    }
  }
);

export const upvoteComplaint = createAsyncThunk(
  'complaints/upvoteComplaint',
  async (id, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    try {
      const response = await fetch(`/api/complaints/${id}/upvote`, {
        method: 'POST',
        headers: getHeaders(token)
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return rejectWithValue(data.message || 'Upvote action failed');
      }
      return data.complaint;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error occurred');
    }
  }
);

export const followComplaint = createAsyncThunk(
  'complaints/followComplaint',
  async (id, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    try {
      const response = await fetch(`/api/complaints/${id}/follow`, {
        method: 'POST',
        headers: getHeaders(token)
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return rejectWithValue(data.message || 'Follow action failed');
      }
      return data.complaint;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error occurred');
    }
  }
);

export const updateComplaintStatus = createAsyncThunk(
  'complaints/updateComplaintStatus',
  async ({ id, status, remarks, priority }, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    try {
      const response = await fetch(`/api/complaints/${id}/status`, {
        method: 'PUT',
        headers: {
          ...getHeaders(token),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, remarks, priority })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return rejectWithValue(data.message || 'Status update failed');
      }
      return data.complaint;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error occurred');
    }
  }
);

export const resolveComplaint = createAsyncThunk(
  'complaints/resolveComplaint',
  async ({ id, formData }, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    try {
      const response = await fetch(`/api/complaints/${id}/resolve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return rejectWithValue(data.message || 'Failed to resolve complaint');
      }
      return data.complaint;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error');
    }
  }
);

export const closeComplaint = createAsyncThunk(
  'complaints/closeComplaint',
  async (id, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    try {
      const response = await fetch(`/api/complaints/${id}/close`, {
        method: 'PUT',
        headers: getHeaders(token)
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return rejectWithValue(data.message || 'Failed to close complaint');
      }
      return data.complaint;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error');
    }
  }
);

export const fetchAdminAnalytics = createAsyncThunk(
  'complaints/fetchAdminAnalytics',
  async (_, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    try {
      const response = await fetch('/api/complaints/analytics', {
        headers: getHeaders(token)
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return rejectWithValue(data.message || 'Failed to retrieve analytics');
      }
      return data.analytics;
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
    },
    resetCurrentComplaint: (state) => {
      state.currentComplaint = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch List
      .addCase(fetchComplaints.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComplaints.fulfilled, (state, action) => {
        state.loading = false;
        state.complaints = action.payload;
      })
      .addCase(fetchComplaints.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Detail
      .addCase(fetchComplaintById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComplaintById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentComplaint = action.payload;
      })
      .addCase(fetchComplaintById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Submit report
      .addCase(createNewComplaint.pending, (state) => {
        state.submitLoading = true;
        state.error = null;
      })
      .addCase(createNewComplaint.fulfilled, (state, action) => {
        state.submitLoading = false;
        state.complaints.unshift(action.payload);
      })
      .addCase(createNewComplaint.rejected, (state, action) => {
        state.submitLoading = false;
        state.error = action.payload;
      })

      // Admin Analytics
      .addCase(fetchAdminAnalytics.pending, (state) => {
        state.analyticsLoading = true;
      })
      .addCase(fetchAdminAnalytics.fulfilled, (state, action) => {
        state.analyticsLoading = false;
        state.analytics = action.payload;
      })
      .addCase(fetchAdminAnalytics.rejected, (state, action) => {
        state.analyticsLoading = false;
        state.error = action.payload;
      })

      // Upvote / Follow / Status update / Resolve / Close
      .addMatcher(
        (action) => [
          upvoteComplaint.fulfilled.type,
          followComplaint.fulfilled.type,
          updateComplaintStatus.fulfilled.type,
          resolveComplaint.fulfilled.type,
          closeComplaint.fulfilled.type
        ].includes(action.type),
        (state, action) => {
          const updated = action.payload;
          state.currentComplaint = updated;
          state.complaints = state.complaints.map(c => 
            c._id === updated._id || c.id === updated.id ? updated : c
          );
        }
      );
  }
});

export const { clearComplaintError, resetCurrentComplaint } = complaintSlice.actions;
export default complaintSlice.reducer;
