import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/Routes/PrivateRoute';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Analytics from './pages/Analytics';
import Family from './pages/Family';
import FamilyMembers from './pages/FamilyMembers';
import Permissions from './pages/Permissions';
import RevokePermissions from './pages/RevokePermissions';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import MyDocuments from './pages/MyDocuments';
import SharePage from './pages/SharePage';

// ✅ NEW: Scheme Discovery & Family Documents Pages
import EligibleSchemes from './pages/EligibleSchemes';
import FamilyDocumentsViewer from './pages/FamilyDocumentsViewer';

// Theme Configuration
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
  },
});

// React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <Router>
            <Routes>

              {/* 🌐 Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/share/:token" element={<SharePage />} />
              <Route path="/permissions/revoke" element={<RevokePermissions />} />

              {/* 🔒 Protected Routes */}
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/documents" element={<PrivateRoute><Documents /></PrivateRoute>} />
              <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
              <Route path="/family" element={<PrivateRoute><Family /></PrivateRoute>} />
              <Route path="/family-members" element={<PrivateRoute><FamilyMembers /></PrivateRoute>} />
              <Route path="/permissions" element={<PrivateRoute><Permissions /></PrivateRoute>} />
              <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
              <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
              <Route path="/my-documents" element={<PrivateRoute><MyDocuments /></PrivateRoute>} />

              {/* ✅ NEW: Government Schemes Routes */}
              <Route path="/schemes" element={<PrivateRoute><EligibleSchemes /></PrivateRoute>} />
              <Route path="/eligible-schemes" element={<PrivateRoute><EligibleSchemes /></PrivateRoute>} />

              {/* ✅ NEW: Family Documents Route */}
              <Route path="/family-documents" element={<PrivateRoute><FamilyDocumentsViewer /></PrivateRoute>} />

              {/* ❌ 404 Route */}
              <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>
          </Router>

          {/* 🔔 Toast Notifications */}
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;