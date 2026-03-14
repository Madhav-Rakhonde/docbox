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
import EligibleSchemes from './pages/EligibleSchemes';
import FamilyDocumentsViewer from './pages/FamilyDocumentsViewer';
import OfflineDocuments from './pages/OfflineDocuments';

// ─── Theme ────────────────────────────────────────────────────────────────────
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6366F1',
      dark: '#4F46E5',
      light: '#818CF8',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#10B981',
      dark: '#059669',
      light: '#34D399',
    },
    error:   { main: '#EF4444' },
    warning: { main: '#F59E0B' },
    info:    { main: '#3B82F6' },
    success: { main: '#10B981' },
    background: {
      default: '#F8F9FC',
      paper:   '#FFFFFF',
    },
    text: {
      primary:   '#0F172A',
      secondary: '#475569',
      disabled:  '#94A3B8',
    },
    divider: '#E2E8F0',
  },
  typography: {
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    h1: { fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 400, letterSpacing: '-0.02em' },
    h2: { fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 400, letterSpacing: '-0.02em' },
    h3: { fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 400, letterSpacing: '-0.01em' },
    h4: { fontWeight: 700, letterSpacing: '-0.01em' },
    h5: { fontWeight: 600, letterSpacing: '-0.005em' },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 600, letterSpacing: '0.01em' },
    body1:  { fontSize: '0.9375rem', lineHeight: 1.65 },
    body2:  { fontSize: '0.875rem',  lineHeight: 1.6 },
    button: { fontWeight: 600, letterSpacing: '0.01em', textTransform: 'none' },
    caption: { fontSize: '0.75rem', letterSpacing: '0.02em' },
    overline: { fontWeight: 600, letterSpacing: '0.08em' },
  },
  shape: { borderRadius: 10 },
  shadows: [
    'none',
    '0 1px 2px rgba(15,23,42,0.06)',
    '0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.06)',
    '0 4px 6px -1px rgba(15,23,42,0.08), 0 2px 4px -2px rgba(15,23,42,0.06)',
    '0 6px 10px -2px rgba(15,23,42,0.08), 0 3px 6px -3px rgba(15,23,42,0.06)',
    '0 10px 15px -3px rgba(15,23,42,0.08), 0 4px 6px -4px rgba(15,23,42,0.06)',
    '0 14px 20px -4px rgba(15,23,42,0.09), 0 6px 8px -5px rgba(15,23,42,0.06)',
    '0 20px 25px -5px rgba(15,23,42,0.1), 0 8px 10px -6px rgba(15,23,42,0.06)',
    '0 25px 30px -6px rgba(15,23,42,0.1), 0 10px 14px -7px rgba(15,23,42,0.07)',
    '0 30px 40px -8px rgba(15,23,42,0.12)',
    ...Array(15).fill('0 30px 40px -8px rgba(15,23,42,0.12)'),
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage: 'none',
          scrollbarWidth: 'thin',
          scrollbarColor: '#CBD5E1 transparent',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          padding: '8px 18px',
          transition: 'all 180ms cubic-bezier(0.4, 0, 0.2, 1)',
        },
        containedPrimary: {
          background: '#6366F1',
          '&:hover': {
            background: '#4F46E5',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
          },
          '&:active': { transform: 'translateY(0)' },
        },
        outlinedPrimary: {
          borderColor: '#6366F1',
          '&:hover': {
            background: 'rgba(99,102,241,0.06)',
            borderColor: '#4F46E5',
          },
        },
        sizeLarge: { padding: '10px 22px', fontSize: '0.9375rem' },
        sizeSmall: { padding: '5px 12px',  fontSize: '0.8125rem' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
          transition: 'box-shadow 200ms ease, transform 200ms ease',
          '&:hover': { boxShadow: '0 4px 12px rgba(15,23,42,0.1)' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 14, border: '1px solid #E2E8F0', backgroundImage: 'none' },
        elevation1: { boxShadow: '0 1px 3px rgba(15,23,42,0.06)' },
        elevation2: { boxShadow: '0 4px 6px -1px rgba(15,23,42,0.08)' },
        elevation3: { boxShadow: '0 10px 15px -3px rgba(15,23,42,0.08)' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 500 },
        colorPrimary: {
          background: 'rgba(99,102,241,0.1)',
          color: '#4F46E5',
          border: 'none',
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          background: '#FFFFFF',
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#94A3B8' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#6366F1',
            borderWidth: '1.5px',
          },
        },
        notchedOutline: { borderColor: '#E2E8F0' },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.9rem',
          color: '#64748B',
          '&.Mui-focused': { color: '#6366F1' },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #F1F5F9',
          padding: '12px 16px',
          fontSize: '0.875rem',
        },
        head: {
          fontWeight: 600,
          fontSize: '0.7rem',
          color: '#64748B',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          background: '#F8FAFC',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background 150ms ease',
          '&:hover': { background: '#F8F9FC' },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '1px 8px',
          padding: '9px 12px',
          transition: 'all 150ms ease',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: { fontFamily: "'DM Sans', sans-serif", fontWeight: 600 },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 700,
          fontSize: '0.65rem',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: '#0F172A',
          fontSize: '0.75rem',
          fontFamily: "'DM Sans', sans-serif",
          borderRadius: 6,
          padding: '6px 10px',
        },
        arrow: { color: '#0F172A' },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10, border: '1px solid' },
        standardError:   { borderColor: '#FECACA', background: '#FEF2F2' },
        standardWarning: { borderColor: '#FDE68A', background: '#FFFBEB' },
        standardSuccess: { borderColor: '#A7F3D0', background: '#ECFDF5' },
        standardInfo:    { borderColor: '#BFDBFE', background: '#EFF6FF' },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 16, border: 'none' },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { fontWeight: 700, fontSize: '1.125rem', paddingBottom: 8 },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: '#F1F5F9' },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        colorPrimary: { color: '#6366F1' },
      },
    },
  },
});

// ─── React Query ──────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <Router>
            <Routes>

              {/* ── Public Routes ── */}
              <Route path="/"                   element={<LandingPage />} />
              <Route path="/login"              element={<Login />} />
              <Route path="/signup"             element={<Signup />} />
              <Route path="/share/:token"       element={<SharePage />} />
              <Route path="/permissions/revoke" element={<RevokePermissions />} />

              {/* ── Protected Routes ── */}
              <Route path="/dashboard"          element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/documents"          element={<PrivateRoute><Documents /></PrivateRoute>} />
              <Route path="/analytics"          element={<PrivateRoute><Analytics /></PrivateRoute>} />
              <Route path="/family"             element={<PrivateRoute><Family /></PrivateRoute>} />
              <Route path="/family-members"     element={<PrivateRoute><FamilyMembers /></PrivateRoute>} />
              <Route path="/permissions"        element={<PrivateRoute><Permissions /></PrivateRoute>} />
              <Route path="/settings"           element={<PrivateRoute><Settings /></PrivateRoute>} />
              <Route path="/notifications"      element={<PrivateRoute><Notifications /></PrivateRoute>} />
              <Route path="/my-documents"       element={<PrivateRoute><MyDocuments /></PrivateRoute>} />

              {/* ── Government Schemes ── */}
              <Route path="/schemes"            element={<PrivateRoute><EligibleSchemes /></PrivateRoute>} />
              <Route path="/eligible-schemes"   element={<PrivateRoute><EligibleSchemes /></PrivateRoute>} />

              {/* ── Family Documents ── */}
              <Route path="/family-documents"   element={<PrivateRoute><FamilyDocumentsViewer /></PrivateRoute>} />

              {/* ── Offline Access (PWA) ── */}
              <Route path="/offline-documents"  element={<PrivateRoute><OfflineDocuments /></PrivateRoute>} />

              {/* ── 404 fallback ── */}
              <Route path="*"                   element={<Navigate to="/" replace />} />

            </Routes>
          </Router>

          {/* Toast Notifications */}
          <ToastContainer
            position="top-right"
            autoClose={3500}
            hideProgressBar
            newestOnTop
            closeOnClick
            pauseOnFocusLoss
            draggable
            pauseOnHover
            toastStyle={{
              fontFamily: "'DM Sans', sans-serif",
              borderRadius: '10px',
              fontSize: '0.875rem',
              boxShadow: '0 10px 25px rgba(15,23,42,0.12)',
              border: '1px solid #E2E8F0',
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;