import React, { useState, useEffect } from 'react';
import { Box, useMediaQuery, useTheme, Collapse, Typography, Chip } from '@mui/material';
import { WifiOff, CloudDone } from '@mui/icons-material';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const DRAWER_WIDTH = 260;

// ─── Offline Banner (inline — no separate file needed) ─────────────────────
const OfflineBanner = () => {
  const [isOnline, setIsOnline]         = useState(navigator.onLine);
  const [justCameBack, setJustCameBack] = useState(false);

  useEffect(() => {
    let backTimer;
    const onOnline  = () => {
      setIsOnline(true);
      setJustCameBack(true);
      backTimer = setTimeout(() => setJustCameBack(false), 4000);
    };
    const onOffline = () => {
      setIsOnline(false);
      setJustCameBack(false);
    };
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
      clearTimeout(backTimer);
    };
  }, []);

  if (isOnline && !justCameBack) return null;

  return (
    <Collapse in={!isOnline || justCameBack} unmountOnExit>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
          px: 2,
          py: 0.9,
          background: isOnline
            ? 'linear-gradient(90deg, #064E3B, #065F46)'
            : 'linear-gradient(90deg, #1E1B4B, #312E81)',
          borderBottom: '1px solid',
          borderColor: isOnline
            ? 'rgba(16,185,129,0.3)'
            : 'rgba(99,102,241,0.35)',
          transition: 'background 400ms ease',
        }}
      >
        {isOnline ? (
          <>
            <CloudDone sx={{ fontSize: 15, color: '#10B981' }} />
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#D1FAE5' }}>
              Back online — syncing your documents…
            </Typography>
          </>
        ) : (
          <>
            <WifiOff sx={{ fontSize: 15, color: '#818CF8' }} />
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#C7D2FE' }}>
              You're offline — showing cached data
            </Typography>
            <Chip
              label="Offline"
              size="small"
              sx={{
                height: 18,
                fontSize: '0.62rem',
                fontWeight: 700,
                background: 'rgba(99,102,241,0.25)',
                color: '#A5B4FC',
                border: '1px solid rgba(99,102,241,0.4)',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          </>
        )}
      </Box>
    </Collapse>
  );
};

// ─── App Layout ────────────────────────────────────────────────────────────
const AppLayout = ({ children }) => {
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => setMobileOpen((prev) => !prev);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg, #F8F9FC)' }}>

      {/* Top Bar */}
      <TopBar
        onMenuClick={handleDrawerToggle}
        drawerWidth={DRAWER_WIDTH}
        isMobile={isMobile}
      />

      {/* Sidebar */}
      <Sidebar
        drawerWidth={DRAWER_WIDTH}
        mobileOpen={mobileOpen}
        onClose={handleDrawerToggle}
        isMobile={isMobile}
      />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          pt: { xs: '56px', sm: '64px' },
          background: 'var(--color-bg, #F8F9FC)',
        }}
      >
        {/* Offline banner — sits flush below the fixed TopBar */}
        <OfflineBanner />

        {/* Inner scroll area with padding */}
        <Box
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3, md: 3.5 },
            maxWidth: '100%',
            backgroundImage: 'radial-gradient(circle, #E2E8F0 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            backgroundPosition: '0 0',
          }}
        >
          <Box sx={{ background: 'transparent', minHeight: 'calc(100vh - 64px)' }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;