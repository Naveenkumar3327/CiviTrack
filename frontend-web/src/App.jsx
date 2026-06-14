import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';
import Login from './pages/Login';
import CitizenPortal from './pages/CitizenPortal';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          {/* Auth point */}
          <Route path="/login" element={<Login />} />

          {/* User Citizen View */}
          <Route path="/dashboard" element={<CitizenPortal />} />

          {/* User Admin Command */}
          <Route path="/admin" element={<AdminDashboard />} />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}
