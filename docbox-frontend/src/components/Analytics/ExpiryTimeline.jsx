import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <Box sx={{ p: 1.5, background: 'white', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(15,23,42,0.12)' }}>
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', mb: 0.25 }}>
          {payload[0].payload.period}
        </Typography>
        <Typography sx={{ fontSize: '0.75rem', color: '#6366F1', fontWeight: 600 }}>
          {payload[0].value} documents
        </Typography>
      </Box>
    );
  }
  return null;
};

const ExpiryTimeline = ({ data, loading }) => {
  const isEmpty = loading || !data;

  const timelineData = isEmpty ? [] : [
    { period: 'Expired',    count: data.expired || 0 },
    { period: 'This Week',  count: data.expiringIn7Days || 0 },
    { period: 'This Month', count: data.expiringIn30Days || 0 },
  ];

  return (
    <Box sx={{ p: 3, borderRadius: '16px', border: '1px solid #E2E8F0', background: 'white', height: 340 }}>
      <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A', mb: 2.5 }}>
        Expiry Timeline
      </Typography>
      {isEmpty ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
          <Typography sx={{ fontSize: '0.875rem', color: '#94A3B8' }}>No expiry data available</Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="expiryGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone" dataKey="count"
              stroke="#6366F1" strokeWidth={2.5}
              fill="url(#expiryGrad)"
              dot={{ fill: '#6366F1', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 5, fill: '#6366F1', stroke: 'white', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
};

export default ExpiryTimeline;