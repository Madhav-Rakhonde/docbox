import React from 'react';
import {
  Box,
  TextField,
  MenuItem,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Chip,
} from '@mui/material';
import { Search, FilterList } from '@mui/icons-material';

const DocumentFilters = ({ filters, onFilterChange, categories }) => {
  const handleChange = (name, value) => {
    onFilterChange({
      ...filters,
      [name]: value,
    });
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
      {/* Search */}
      <TextField
        placeholder="Search documents..."
        value={filters.search || ''}
        onChange={(e) => handleChange('search', e.target.value)}
        size="small"
        sx={{ minWidth: 250, flex: 1 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
      />

      {/* Category Filter */}
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel>Category</InputLabel>
        <Select
          value={filters.category || ''}
          onChange={(e) => handleChange('category', e.target.value)}
          label="Category"
        >
          <MenuItem value="">All Categories</MenuItem>
          {categories.map((cat) => (
            <MenuItem key={cat.id} value={cat.id}>
              {cat.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Sort By */}
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel>Sort By</InputLabel>
        <Select
          value={filters.sortBy || 'uploadedAt'}
          onChange={(e) => handleChange('sortBy', e.target.value)}
          label="Sort By"
        >
          <MenuItem value="uploadedAt">Upload Date</MenuItem>
          <MenuItem value="originalFilename">Name</MenuItem>
          <MenuItem value="fileSize">Size</MenuItem>
          <MenuItem value="expiryDate">Expiry Date</MenuItem>
        </Select>
      </FormControl>

      {/* Order */}
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Order</InputLabel>
        <Select
          value={filters.order || 'desc'}
          onChange={(e) => handleChange('order', e.target.value)}
          label="Order"
        >
          <MenuItem value="asc">Ascending</MenuItem>
          <MenuItem value="desc">Descending</MenuItem>
        </Select>
      </FormControl>

      {/* Active Filters Display */}
      {(filters.search || filters.category) && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flex: '0 0 100%' }}>
          <FilterList fontSize="small" />
          {filters.search && (
            <Chip
              label={`Search: ${filters.search}`}
              size="small"
              onDelete={() => handleChange('search', '')}
            />
          )}
          {filters.category && (
            <Chip
              label="Category filter"
              size="small"
              onDelete={() => handleChange('category', '')}
            />
          )}
        </Box>
      )}
    </Box>
  );
};

export default DocumentFilters;