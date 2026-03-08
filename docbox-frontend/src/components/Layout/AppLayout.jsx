import React, { useState } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const DRAWER_WIDTH = 260;

const AppLayout = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => setMobileOpen((prev) => !prev);

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--color-bg, #F8F9FC)',
      }}
    >
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
          // Push content below fixed topbar
          pt: { xs: '56px', sm: '64px' },
          background: 'var(--color-bg, #F8F9FC)',
        }}
      >
        {/* Inner scroll area with padding */}
        <Box
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3, md: 3.5 },
            maxWidth: '100%',
            // Subtle dot-grid background
            backgroundImage:
              'radial-gradient(circle, #E2E8F0 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            backgroundPosition: '0 0',
          }}
        >
          <Box
            sx={{
              // Mask the dot-grid with a gradient so edges stay clean
              background: 'transparent',
              minHeight: 'calc(100vh - 64px)',
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;