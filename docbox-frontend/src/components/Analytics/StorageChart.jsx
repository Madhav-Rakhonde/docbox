import React from 'react';
import { Box, Typography } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <Box sx={{ p: 1.5, background: 'white', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(15,23,42,0.12)' }}>
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', mb: 0.25 }}>{payload[0].name}</Typography>
        <Typography sx={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 600 }}>{payload[0].value} MB</Typography>
      </Box>
    );
  }
  return null;
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      style={{ fontSize: 11, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const StorageChart = ({ data, loading }) => {
  const isEmpty = loading || !data || data.length === 0;

  const chartData = isEmpty ? [] : data.map((item) => ({
    name: item.category || item.name || 'Unknown',
    value: parseFloat((item.bytes / (1024 * 1024)).toFixed(2)),
    mb: parseFloat((item.bytes / (1024 * 1024)).toFixed(2)),
  }));

  return (
    <Box sx={{ p: 3, borderRadius: '16px', border: '1px solid #E2E8F0', background: 'white', height: 340 }}>
      <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A', mb: 2.5 }}>
        Storage by Category
      </Typography>
      {isEmpty ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
          <Typography sx={{ fontSize: '0.875rem', color: '#94A3B8' }}>No data available</Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={chartData} cx="50%" cy="45%" outerRadius={90} dataKey="value"
              labelLine={false} label={renderCustomLabel}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="white" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8}
              wrapperStyle={{ fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', color: '#64748B' }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
};

export default StorageChart;