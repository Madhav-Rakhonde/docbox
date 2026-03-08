import React from 'react';
import {
  Box, TextField, MenuItem, InputAdornment,
  FormControl, InputLabel, Select,
} from '@mui/material';
import { Search, FilterList, Close } from '@mui/icons-material';

const selectSx = {
  borderRadius: '10px',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E2E8F0' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6366F1' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6366F1', borderWidth: '1.5px' },
  fontSize: '0.875rem',
};

const DocumentFilters = ({ filters, onFilterChange, categories }) => {
  const handleChange = (name, value) => onFilterChange({ ...filters, [name]: value });

  const hasActiveFilters = filters.search || filters.category;

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        {/* Search */}
        <TextField
          placeholder="Search documents…"
          value={filters.search || ''}
          onChange={(e) => handleChange('search', e.target.value)}
          size="small"
          sx={{
            minWidth: 240, flex: 1,
            '& .MuiOutlinedInput-root': {
              borderRadius: '10px',
              '& fieldset': { borderColor: '#E2E8F0' },
              '&:hover fieldset': { borderColor: '#6366F1' },
              '&.Mui-focused fieldset': { borderColor: '#6366F1', borderWidth: '1.5px' },
            },
            '& .MuiInputBase-input': { fontSize: '0.875rem' },
          }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment>,
          }}
        />

        {/* Category */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel sx={{ fontSize: '0.875rem' }}>Category</InputLabel>
          <Select value={filters.category || ''} onChange={(e) => handleChange('category', e.target.value)}
            label="Category" sx={selectSx}>
            <MenuItem value="" sx={{ fontSize: '0.875rem' }}>All Categories</MenuItem>
            {categories.map((cat) => (
              <MenuItem key={cat.id} value={cat.id} sx={{ fontSize: '0.875rem', gap: 1 }}>
                <Box component="span" sx={{ mr: 0.5 }}>{cat.icon}</Box>{cat.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Sort By */}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel sx={{ fontSize: '0.875rem' }}>Sort By</InputLabel>
          <Select value={filters.sortBy || 'uploadedAt'} onChange={(e) => handleChange('sortBy', e.target.value)}
            label="Sort By" sx={selectSx}>
            <MenuItem value="uploadedAt"    sx={{ fontSize: '0.875rem' }}>Upload Date</MenuItem>
            <MenuItem value="originalFilename" sx={{ fontSize: '0.875rem' }}>Name</MenuItem>
            <MenuItem value="fileSize"      sx={{ fontSize: '0.875rem' }}>Size</MenuItem>
            <MenuItem value="expiryDate"    sx={{ fontSize: '0.875rem' }}>Expiry Date</MenuItem>
          </Select>
        </FormControl>

        {/* Order */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel sx={{ fontSize: '0.875rem' }}>Order</InputLabel>
          <Select value={filters.order || 'desc'} onChange={(e) => handleChange('order', e.target.value)}
            label="Order" sx={selectSx}>
            <MenuItem value="asc"  sx={{ fontSize: '0.875rem' }}>Ascending</MenuItem>
            <MenuItem value="desc" sx={{ fontSize: '0.875rem' }}>Descending</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1.5, flexWrap: 'wrap' }}>
          <FilterList sx={{ fontSize: 14, color: '#94A3B8' }} />
          {filters.search && (
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.75,
              px: 1.25, py: 0.35, borderRadius: '6px',
              background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
            }}>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#6366F1' }}>
                Search: {filters.search}
              </Typography>
              <Close sx={{ fontSize: 12, color: '#6366F1', cursor: 'pointer' }}
                onClick={() => handleChange('search', '')} />
            </Box>
          )}
          {filters.category && (
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.75,
              px: 1.25, py: 0.35, borderRadius: '6px',
              background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
            }}>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#10B981' }}>
                Category filter active
              </Typography>
              <Close sx={{ fontSize: 12, color: '#10B981', cursor: 'pointer' }}
                onClick={() => handleChange('category', '')} />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default DocumentFilters;