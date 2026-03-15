import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, ArrowForward } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

// Inline logo mark
const LogoMark = () => (
  <svg width="36" height="36" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="8" width="18" height="22" rx="3" fill="#6366F1" opacity="0.3"/>
    <rect x="7" y="5" width="18" height="22" rx="3" fill="#6366F1" opacity="0.6"/>
    <rect x="10" y="2" width="18" height="22" rx="3" fill="#6366F1"/>
    <rect x="14" y="8" width="9" height="1.8" rx="0.9" fill="white" opacity="0.9"/>
    <rect x="14" y="12" width="7" height="1.8" rx="0.9" fill="white" opacity="0.6"/>
    <rect x="14" y="16" width="8" height="1.8" rx="0.9" fill="white" opacity="0.6"/>
  </svg>
);

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await login(formData);
    if (result.success) {
      toast.success('Welcome back!');
      navigate('/dashboard');
    } else {
      setError(result.error || 'Invalid email or password');
    }
    setLoading(false);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: '#0F172A',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative background */}
      <Box sx={{
        position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      }}>
        {/* Gradient orbs */}
        <Box sx={{
          position: 'absolute', top: '-20%', right: '-10%',
          width: '50vw', height: '50vw', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
        }}/>
        <Box sx={{
          position: 'absolute', bottom: '-15%', left: '-10%',
          width: '40vw', height: '40vw', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
        }}/>
        {/* Grid pattern */}
        <Box sx={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}/>
      </Box>

      {/* Left — Branding Panel (hidden on mobile) */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          px: { lg: 8, xl: 12 },
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Brand */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 6 }}>
          <LogoMark />
          <Typography sx={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: '1.5rem',
            color: '#F8FAFC',
            letterSpacing: '-0.03em',
          }}>
            Doc<span style={{ color: '#818CF8', fontWeight: 400 }}>Box</span>
          </Typography>
        </Box>

        <Typography sx={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 'clamp(2rem, 3vw, 3rem)',
          color: '#F8FAFC',
          lineHeight: 1.2,
          mb: 2,
          maxWidth: 480,
        }}>
          Your documents,<br />
          <span style={{ color: '#818CF8' }}>organized perfectly.</span>
        </Typography>
        <Typography sx={{
          fontSize: '1rem',
          color: '#475569',
          maxWidth: 420,
          lineHeight: 1.7,
          mb: 5,
        }}>
          Securely store, manage, and share all your important documents with powerful family collaboration tools.
        </Typography>

        {/* Feature pills */}
        {['Bank-grade encryption', 'Offline access ready', 'Family sharing & permissions'].map((f) => (
          <Box key={f} sx={{
            display: 'flex', alignItems: 'center', gap: 1, mb: 1.5,
          }}>
            <Box sx={{
              width: 20, height: 20, borderRadius: '50%',
              background: 'rgba(99,102,241,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', background: '#818CF8' }} />
            </Box>
            <Typography sx={{ fontSize: '0.9rem', color: '#64748B' }}>{f}</Typography>
          </Box>
        ))}
      </Box>

      {/* Right — Login Form */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: { xs: 1, lg: 'unset' },
          width: { lg: 480 },
          px: { xs: 2, sm: 4 },
          py: 4,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 420,
            p: { xs: 3, sm: 4 },
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.97)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          }}
        >
          {/* Mobile logo */}
          <Box sx={{ display: { xs: 'flex', lg: 'none' }, mb: 3, alignItems: 'center', gap: 1.5 }}>
            <LogoMark />
            <Typography sx={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: '1.25rem',
              color: '#0F172A',
              letterSpacing: '-0.02em',
            }}>
              Doc<span style={{ color: '#6366F1' }}>Box</span>
            </Typography>
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5, letterSpacing: '-0.02em' }}>
            Welcome back
          </Typography>
          <Typography sx={{ color: '#64748B', fontSize: '0.9rem', mb: 3 }}>
            Sign in to access your documents
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: '10px', fontSize: '0.875rem' }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Email address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                autoFocus
                size="medium"
              />

              <TextField
                fullWidth
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                        {showPassword
                          ? <VisibilityOff sx={{ fontSize: 18, color: '#94A3B8' }} />
                          : <Visibility   sx={{ fontSize: 18, color: '#94A3B8' }} />
                        }
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                endIcon={!loading && <ArrowForward sx={{ fontSize: 18 }} />}
                sx={{
                  mt: 0.5,
                  py: 1.4,
                  borderRadius: '10px',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 20px rgba(99,102,241,0.4)',
                  },
                }}
              >
                {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Sign in'}
              </Button>
            </Box>
          </form>

          <Typography sx={{ textAlign: 'center', mt: 3, fontSize: '0.875rem', color: '#64748B' }}>
            Don't have an account?{' '}
            <Link
              component={RouterLink}
              to="/signup"
              sx={{ color: '#6366F1', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Create one
            </Link>
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default Login;