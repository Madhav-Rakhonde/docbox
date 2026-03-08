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
  Grid,
} from '@mui/material';
import { Visibility, VisibilityOff, ArrowForward } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const LogoMark = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="8" width="18" height="22" rx="3" fill="#6366F1" opacity="0.3"/>
    <rect x="7" y="5" width="18" height="22" rx="3" fill="#6366F1" opacity="0.6"/>
    <rect x="10" y="2" width="18" height="22" rx="3" fill="#6366F1"/>
    <rect x="14" y="8" width="9" height="1.8" rx="0.9" fill="white" opacity="0.9"/>
    <rect x="14" y="12" width="7" height="1.8" rx="0.9" fill="white" opacity="0.6"/>
    <rect x="14" y="16" width="8" height="1.8" rx="0.9" fill="white" opacity="0.6"/>
  </svg>
);

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (!formData.phoneNumber.startsWith('+91')) {
      setError('Phone number must start with +91');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setError('');
    const { confirmPassword, ...signupData } = formData;
    const result = await signup(signupData);
    if (result.success) {
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } else {
      setError(result.error || 'Signup failed');
    }
    setLoading(false);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0F172A',
        position: 'relative',
        overflow: 'hidden',
        py: 4,
        px: 2,
      }}
    >
      {/* Decorative background */}
      <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <Box sx={{
          position: 'absolute', top: '-20%', right: '-10%',
          width: '50vw', height: '50vw', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
        }}/>
        <Box sx={{
          position: 'absolute', bottom: '-20%', left: '-10%',
          width: '45vw', height: '45vw', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)',
        }}/>
        <Box sx={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}/>
      </Box>

      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 520,
          p: { xs: 3, sm: 4.5 },
          borderRadius: '20px',
          background: 'rgba(255,255,255,0.97)',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <LogoMark />
          <Typography sx={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: '1.125rem',
            color: '#0F172A',
            letterSpacing: '-0.02em',
          }}>
            Doc<span style={{ color: '#6366F1' }}>Box</span>
          </Typography>
        </Box>

        <Typography variant="h5" sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5, letterSpacing: '-0.02em' }}>
          Create your account
        </Typography>
        <Typography sx={{ color: '#64748B', fontSize: '0.9rem', mb: 3 }}>
          Start managing your documents in seconds
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
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              autoFocus
              autoComplete="name"
            />

            <TextField
              fullWidth
              label="Email address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />

            <TextField
              fullWidth
              label="Phone Number"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              required
              placeholder="+919876543210"
              helperText="Format: +91 followed by 10-digit number"
              inputProps={{ style: { letterSpacing: '0.02em' } }}
            />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  helperText="Min. 8 characters"
                  autoComplete="new-password"
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
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Confirm Password"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                />
              </Grid>
            </Grid>

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
              {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Create Account'}
            </Button>
          </Box>
        </form>

        <Typography sx={{ textAlign: 'center', mt: 3, fontSize: '0.875rem', color: '#64748B' }}>
          Already have an account?{' '}
          <Link
            component={RouterLink}
            to="/login"
            sx={{ color: '#6366F1', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            Sign in
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
};

export default Signup;