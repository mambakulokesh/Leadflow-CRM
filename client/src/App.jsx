import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Customers from './pages/Customers';
import Users from './pages/Users';

function App() {
  return (
    <AuthProvider>
      <Toaster
        position="bottom-right"
        gutter={10}
        toastOptions={{
          duration: 3500,
          style: {
            background: '#0f172a',
            color: '#f1f5f9',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '14px',
            padding: '14px 18px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
            maxWidth: '360px',
          },
          success: {
            style: { borderLeft: '4px solid #34d399' },
            iconTheme: { primary: '#34d399', secondary: '#0f172a' },
          },
          error: {
            style: { borderLeft: '4px solid #f87171' },
            iconTheme: { primary: '#f87171', secondary: '#0f172a' },
          },
          loading: {
            style: { borderLeft: '4px solid #60a5fa' },
            iconTheme: { primary: '#60a5fa', secondary: '#0f172a' },
          },
        }}
      />
      <Router>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/users" element={<Users />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
