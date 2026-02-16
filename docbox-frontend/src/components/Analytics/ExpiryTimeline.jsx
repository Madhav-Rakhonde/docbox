import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

const ExpiryTimeline = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <Paper sx={{ p: 3, height: 400 }}>
        <Typography variant="h6" gutterBottom>
          Expiry Timeline
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <Typography variant="body2" color="text.secondary">
            No expiry data available
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Transform data for timeline
  const timelineData = [
    { period: 'Expired', count: data.expired || 0, fill: '#f44336' },
    { period: 'This Week', count: data.expiringIn7Days || 0, fill: '#ff9800' },
    { period: 'This Month', count: data.expiringIn30Days || 0, fill: '#2196f3' },
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 1.5 }}>
          <Typography variant="body2" fontWeight="600">
            {payload[0].payload.period}
          </Typography>
          <Typography variant="caption" color="primary">
            {payload[0].value} documents
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  return (
    <Paper sx={{ p: 3, height: 400 }}>
      <Typography variant="h6" gutterBottom fontWeight="600">
        Expiry Timeline
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#8884d8"
            fill="#8884d8"
            name="Documents"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default ExpiryTimeline;