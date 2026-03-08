import React, { useState } from 'react';
import { Box, TextField, InputAdornment, IconButton } from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';

const SearchBar = ({ onSearch, placeholder = 'Search documents…' }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (value) => {
    setSearchQuery(value);
    onSearch(value);
  };

  const handleClear = () => {
    setSearchQuery('');
    onSearch('');
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 600 }}>
      <TextField
        fullWidth
        variant="outlined"
        size="small"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '10px',
            background: 'white',
            '& fieldset': { borderColor: '#E2E8F0' },
            '&:hover fieldset': { borderColor: '#6366F1' },
            '&.Mui-focused fieldset': { borderColor: '#6366F1', borderWidth: '1.5px' },
          },
          '& .MuiInputBase-input': {
            fontSize: '0.875rem', color: '#0F172A',
            '&::placeholder': { color: '#94A3B8', opacity: 1 },
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
            </InputAdornment>
          ),
          endAdornment: searchQuery && (
            <InputAdornment position="end">
              <IconButton onClick={handleClear} size="small"
                sx={{ color: '#94A3B8', '&:hover': { color: '#6366F1', background: 'rgba(99,102,241,0.08)' } }}>
                <ClearIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    </Box>
  );
};

export default SearchBar;