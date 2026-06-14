import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import complaintReducer from './complaintSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    complaints: complaintReducer
  }
});

export default store;
