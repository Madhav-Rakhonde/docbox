import React, { useState, useEffect } from 'react';
import {
  Container, Paper, Typography, Button, Box,
  List, ListItem, ListItemText, ListItemIcon,
  IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Chip, Tooltip, Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  GridView,
} from '@mui/icons-material';
import { categoryService } from '../services/categoryService';

const COMMON_ICONS = ['📁', '📄', '🪪', '💳', '🏥', '🎓', '💼', '🏠', '🚗', '📋', '🌐', '📊', '🔑', '🎫', '📜'];

const CategoryManagement = () => {
  const [categories, setCategories]           = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [categoryName, setCategoryName]       = useState('');
  const [categoryIcon, setCategoryIcon]       = useState('📁');

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    try {
      const response = await categoryService.getAllCategories();
      setCategories(response.data || []);
    } catch { /* silent */ }
  };

  const handleCreate = async () => {
    try {
      await categoryService.createCategory({ name: categoryName, icon: categoryIcon, description: 'Custom category' });
      await loadCategories();
      setShowCreateDialog(false);
      setCategoryName('');
      setCategoryIcon('📁');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await categoryService.deleteCategory(id);
      await loadCategories();
    } catch (error) {
      alert(error.response?.data?.message || 'Cannot delete category with documents');
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, animation: 'fadeUp 0.35s ease both' }}>
      <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        {/* Header */}
        <Box sx={{
          px: 3, py: 2.5,
          borderBottom: '1px solid #F1F5F9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#FAFBFC',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GridView sx={{ fontSize: 18, color: '#6366F1' }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>
                Document Categories
              </Typography>
              <Typography sx={{ fontSize: '0.78rem', color: '#64748B' }}>
                {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={() => setShowCreateDialog(true)}
            size="small"
            sx={{
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              px: 2,
              '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #4338CA)', transform: 'translateY(-1px)' },
            }}
          >
            New Category
          </Button>
        </Box>

        {/* Category List */}
        {categories.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '2rem', mb: 1 }}>📁</Typography>
            <Typography sx={{ fontWeight: 600, color: '#0F172A', mb: 0.5 }}>No categories yet</Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#64748B' }}>Create your first category to organize documents</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {categories.map((category, index) => (
              <React.Fragment key={category.id}>
                <ListItem
                  sx={{ px: 3, py: 1.75 }}
                  secondaryAction={
                    <Tooltip title="Delete category">
                      <IconButton
                        edge="end"
                        onClick={() => handleDelete(category.id)}
                        size="small"
                        sx={{
                          color: '#94A3B8',
                          '&:hover': { color: '#EF4444', background: '#FEF2F2' },
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemIcon sx={{ minWidth: 52 }}>
                    <Box sx={{
                      width: 40, height: 40,
                      borderRadius: '10px',
                      background: '#F8F9FC',
                      border: '1px solid #E2E8F0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.25rem',
                    }}>
                      {category.icon}
                    </Box>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#0F172A' }}>
                        {category.name}
                      </Typography>
                    }
                    secondary={
                      <Typography sx={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                        {category.description}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < categories.length - 1 && <Divider sx={{ mx: 3 }} />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>

      {/* Create Dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 0.5 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pt: 3, px: 3 }}>Create New Category</DialogTitle>
        <DialogContent sx={{ px: 3 }}>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Category Name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              fullWidth
              autoFocus
              placeholder="e.g., Medical Records"
            />

            <Box>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Choose Icon
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {COMMON_ICONS.map((icon) => (
                  <Box
                    key={icon}
                    onClick={() => setCategoryIcon(icon)}
                    sx={{
                      width: 44, height: 44,
                      borderRadius: '10px',
                      border: '1.5px solid',
                      borderColor: categoryIcon === icon ? '#6366F1' : '#E2E8F0',
                      background: categoryIcon === icon ? 'rgba(99,102,241,0.08)' : '#FAFBFC',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.25rem',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                      '&:hover': { borderColor: '#6366F1', background: 'rgba(99,102,241,0.06)', transform: 'scale(1.05)' },
                    }}
                  >
                    {icon}
                  </Box>
                ))}
              </Box>
            </Box>

            <TextField
              label="Custom Emoji / Icon"
              value={categoryIcon}
              onChange={(e) => setCategoryIcon(e.target.value)}
              fullWidth
              helperText="Or type any emoji directly"
              inputProps={{ maxLength: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={() => setShowCreateDialog(false)}
            sx={{ borderRadius: '8px', color: '#64748B', '&:hover': { background: '#F1F5F9' } }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={!categoryName.trim()}
            sx={{
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #4338CA)' },
              '&:disabled': { opacity: 0.5 },
            }}
          >
            Create Category
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CategoryManagement;