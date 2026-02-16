import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { categoryService } from '../services/categoryService';

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('📁');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await categoryService.getAllCategories();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleCreate = async () => {
    try {
      await categoryService.createCategory({
        name: categoryName,
        icon: categoryIcon,
        description: `Custom category`
      });
      await loadCategories();
      setShowCreateDialog(false);
      setCategoryName('');
      setCategoryIcon('📁');
      alert('Category created!');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category?')) return;

    try {
      await categoryService.deleteCategory(id);
      await loadCategories();
      alert('Category deleted!');
    } catch (error) {
      alert(error.response?.data?.message || 'Cannot delete category with documents');
    }
  };

  const commonIcons = ['📁', '📄', '🪪', '💳', '🏥', '🎓', '💼', '🏠', '🚗', '📋'];

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5">Manage Categories</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateDialog(true)}
          >
            New Category
          </Button>
        </Box>

        <List>
          {categories.map((category) => (
            <ListItem
              key={category.id}
              secondaryAction={
                <IconButton onClick={() => handleDelete(category.id)}>
                  <DeleteIcon />
                </IconButton>
              }
            >
              <ListItemIcon>
                <Typography variant="h4">{category.icon}</Typography>
              </ListItemIcon>
              <ListItemText
                primary={category.name}
                secondary={category.description}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Category</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Category Name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              fullWidth
              autoFocus
            />

            <Box>
              <Typography variant="subtitle2" gutterBottom>Select Icon</Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {commonIcons.map((icon) => (
                  <Chip
                    key={icon}
                    label={icon}
                    onClick={() => setCategoryIcon(icon)}
                    color={categoryIcon === icon ? 'primary' : 'default'}
                    sx={{ fontSize: '1.2rem', cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Box>

            <TextField
              label="Custom Icon"
              value={categoryIcon}
              onChange={(e) => setCategoryIcon(e.target.value)}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CategoryManagement;