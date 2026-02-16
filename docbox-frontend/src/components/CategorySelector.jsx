import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import categoryService from '../services/categoryService';

const COMMON_ICONS = ['📄', '📋', '🏠', '🚗', '💳', '🎓', '🏥', '💼', '⚖️', '📁'];

const CategorySelector = ({ open, onClose, document, onSuccess }) => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCreateNew, setShowCreateNew] = useState(false);
  
  // New category fields
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📁');
  const [customIcon, setCustomIcon] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    if (open) {
      loadCategories();
      // ✅ FIX: Check if document exists before accessing its properties
      if (document?.category?.id) {
        setSelectedCategory(document.category.id);
      } else {
        setSelectedCategory('');
      }
    }
  }, [open, document]);

  const loadCategories = async () => {
    try {
      const response = await categoryService.getAllCategories();
      setCategories(response.data || []);
    } catch (error) {
      showToast('Failed to load categories', 'error');
    }
  };

  const showToast = (message, severity = 'info') => {
    setToast({ open: true, message, severity });
  };

  const handleCategoryChange = async () => {
    // ✅ FIX: Validate document ID before making API call
    if (!document || !document.id) {
      showToast('Error: No document selected', 'error');
      console.error('❌ No document ID:', document);
      return;
    }

    if (!selectedCategory) {
      showToast('Please select a category', 'warning');
      return;
    }

    setLoading(true);
    try {
      console.log('📂 Changing category:', {
        documentId: document.id,
        categoryId: selectedCategory
      });

      await categoryService.changeDocumentCategory(document.id, selectedCategory);
      showToast('Category updated successfully!', 'success');
      
      setTimeout(() => {
        if (onSuccess) onSuccess();
        handleClose();
      }, 1000);
    } catch (error) {
      console.error('Failed to change category:', error);
      showToast(error.response?.data?.message || 'Failed to update category', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      showToast('Please enter a category name', 'warning');
      return;
    }

    setLoading(true);
    try {
      const finalIcon = customIcon.trim() || newCategoryIcon;
      
      const response = await categoryService.createCategory({
        name: newCategoryName,
        icon: finalIcon,
        description: newCategoryDescription,
      });

      showToast('Category created successfully!', 'success');
      
      // Reload categories and select the new one
      await loadCategories();
      setSelectedCategory(response.data.id);
      
      // Reset form
      setShowCreateNew(false);
      setNewCategoryName('');
      setNewCategoryIcon('📁');
      setCustomIcon('');
      setNewCategoryDescription('');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to create category', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowCreateNew(false);
    setSelectedCategory('');
    setNewCategoryName('');
    setNewCategoryIcon('📁');
    setCustomIcon('');
    setNewCategoryDescription('');
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {showCreateNew ? 'Create New Category' : 'Change Document Category'}
        </DialogTitle>

        <DialogContent>
          {/* ✅ Show document name */}
          {document && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Document:
              </Typography>
              <Typography variant="body1" fontWeight="600">
                {document.originalFilename}
              </Typography>
            </Box>
          )}

          {!showCreateNew ? (
            <>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Select Category</InputLabel>
                <Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  label="Select Category"
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span style={{ fontSize: '1.2rem' }}>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                fullWidth
                variant="outlined"
                sx={{ mt: 2 }}
                onClick={() => setShowCreateNew(true)}
              >
                + Create New Category
              </Button>
            </>
          ) : (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Category Name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                sx={{ mb: 2 }}
              />

              <Typography variant="body2" sx={{ mb: 1 }}>
                Select Icon:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                {COMMON_ICONS.map((icon) => (
                  <Button
                    key={icon}
                    variant={newCategoryIcon === icon ? 'contained' : 'outlined'}
                    onClick={() => {
                      setNewCategoryIcon(icon);
                      setCustomIcon('');
                    }}
                    sx={{ minWidth: '48px', fontSize: '1.5rem' }}
                  >
                    {icon}
                  </Button>
                ))}
              </Box>

              <TextField
                fullWidth
                label="Or Enter Custom Icon (emoji)"
                value={customIcon}
                onChange={(e) => setCustomIcon(e.target.value)}
                placeholder="🎯"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Description (optional)"
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                multiline
                rows={2}
              />

              <Button
                fullWidth
                variant="text"
                sx={{ mt: 2 }}
                onClick={() => setShowCreateNew(false)}
              >
                ← Back to Select Category
              </Button>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          {!showCreateNew ? (
            <Button
              variant="contained"
              onClick={handleCategoryChange}
              disabled={!selectedCategory || loading || !document?.id}
            >
              {loading ? <CircularProgress size={24} /> : 'Update Category'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleCreateCategory}
              disabled={!newCategoryName.trim() || loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Create & Select'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CategorySelector;
