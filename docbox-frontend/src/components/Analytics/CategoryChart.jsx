import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const BAR_COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Box sx={{ p: 1.5, background: 'white', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(15,23,42,0.12)' }}>
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', mb: 0.25 }}>{label}</Typography>
        <Typography sx={{ fontSize: '0.75rem', color: '#6366F1', fontWeight: 600 }}>{payload[0].value} documents</Typography>
      </Box>
    );
  }
  return null;
};

const CategoryChart = ({ data, loading }) => {
  const isEmpty = loading || !data || data.length === 0;

  const chartData = isEmpty ? [] : data.map((item) => ({
    category: item.category || item.name || 'Unknown',
    count: parseInt(item.count) || 0,
  }));

  return (
    <Box sx={{ p: 3, borderRadius: '16px', border: '1px solid #E2E8F0', background: 'white', height: 340 }}>
      <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A', mb: 2.5 }}>
        Documents by Category
      </Typography>
      {isEmpty ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
          <Typography sx={{ fontSize: '0.875rem', color: '#94A3B8' }}>No data available</Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)', radius: 4 }} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
};

export default CategoryChart;