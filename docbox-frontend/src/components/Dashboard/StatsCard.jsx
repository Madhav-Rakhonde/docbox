import React from 'react';
import { Box, Typography } from '@mui/material';
import { TrendingUp } from '@mui/icons-material';

const StatsCard = ({ title, value, subtitle, icon: Icon, color = '#6366F1', trend }) => {
  return (
    <Box sx={{
      p: 2.5, borderRadius: '14px',
      border: '1px solid #E2E8F0', background: 'white',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      height: '100%',
      transition: 'transform 200ms ease, box-shadow 200ms ease',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(15,23,42,0.08)' },
    }}>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{
          fontSize: '0.72rem', fontWeight: 600, color: '#94A3B8',
          textTransform: 'uppercase', letterSpacing: '0.07em', mb: 1,
        }}>
          {title}
        </Typography>
        <Typography sx={{
          fontSize: '2rem', fontWeight: 700, color: '#0F172A',
          letterSpacing: '-0.04em', lineHeight: 1, mb: 0.5,
        }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography sx={{ fontSize: '0.78rem', color: '#64748B' }}>{subtitle}</Typography>
        )}
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
            <TrendingUp sx={{ fontSize: 14, color: '#10B981' }} />
            <Typography sx={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 600 }}>
              {trend}
            </Typography>
          </Box>
        )}
      </Box>
      <Box sx={{
        width: 44, height: 44, borderRadius: '12px', flexShrink: 0, ml: 1.5,
        background: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon sx={{ fontSize: 20, color }} />
      </Box>
    </Box>
  );
};

export default StatsCard;