import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, FormControl, InputLabel, Select, MenuItem,
  TextField, Box, Typography, Snackbar, Alert, CircularProgress,
} from '@mui/material';
import { Add, ArrowBack } from '@mui/icons-material';
import categoryService from '../services/categoryService';

const COMMON_ICONS = ['📄', '📋', '🏠', '🚗', '💳', '🎓', '🏥', '💼', '⚖️', '📁'];

const CategorySelector = ({ open, onClose, document, onSuccess }) => {
  const [categories, setCategories]           = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCreateNew, setShowCreateNew]     = useState(false);

  const [newCategoryName, setNewCategoryName]               = useState('');
  const [newCategoryIcon, setNewCategoryIcon]               = useState('📁');
  const [customIcon, setCustomIcon]                         = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    if (open) {
      loadCategories();
      if (document?.category?.id) setSelectedCategory(document.category.id);
      else setSelectedCategory('');
    }
  }, [open, document]);

  const loadCategories = async () => {
    try {
      const response = await categoryService.getAllCategories();
      setCategories(response.data || []);
    } catch { showToast('Failed to load categories', 'error'); }
  };

  const showToast = (message, severity = 'info') => setToast({ open: true, message, severity });

  const handleCategoryChange = async () => {
    if (!document || !document.id) { showToast('Error: No document selected', 'error'); return; }
    if (!selectedCategory) { showToast('Please select a category', 'warning'); return; }
    setLoading(true);
    try {
      await categoryService.changeDocumentCategory(document.id, selectedCategory);
      showToast('Category updated successfully!', 'success');
      setTimeout(() => { if (onSuccess) onSuccess(); handleClose(); }, 1000);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update category', 'error');
    } finally { setLoading(false); }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) { showToast('Please enter a category name', 'warning'); return; }
    setLoading(true);
    try {
      const finalIcon = customIcon.trim() || newCategoryIcon;
      const response = await categoryService.createCategory({
        name: newCategoryName, icon: finalIcon, description: newCategoryDescription,
      });
      showToast('Category created!', 'success');
      await loadCategories();
      setSelectedCategory(response.data.id);
      setShowCreateNew(false);
      setNewCategoryName(''); setNewCategoryIcon('📁'); setCustomIcon(''); setNewCategoryDescription('');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to create category', 'error');
    } finally { setLoading(false); }
  };

  const handleClose = () => {
    setShowCreateNew(false);
    setSelectedCategory('');
    setNewCategoryName(''); setNewCategoryIcon('📁'); setCustomIcon(''); setNewCategoryDescription('');
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 0.5 } }}>

        <DialogTitle sx={{ pt: 3, px: 3, pb: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>
            {showCreateNew ? 'Create New Category' : 'Change Document Category'}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ px: 3, pt: 1.5 }}>

          {/* Document name pill */}
          {document && (
            <Box sx={{ mb: 2.5, p: 1.5, borderRadius: '10px', background: '#F8F9FC', border: '1px solid #E2E8F0' }}>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.25 }}>
                Document
              </Typography>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#0F172A' }}>
                {document.originalFilename}
              </Typography>
            </Box>
          )}

          {!showCreateNew ? (
            <>
              <FormControl fullWidth sx={{ mt: 0.5 }}>
                <InputLabel sx={{ fontSize: '0.875rem' }}>Select Category</InputLabel>
                <Select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
                  label="Select Category"
                  sx={{ borderRadius: '10px', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E2E8F0' } }}>
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 32, height: 32, borderRadius: '8px', background: '#F1F5F9',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                          {cat.icon}
                        </Box>
                        <Typography sx={{ fontSize: '0.875rem', color: '#0F172A' }}>{cat.name}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button fullWidth variant="outlined" startIcon={<Add sx={{ fontSize: 16 }} />}
                onClick={() => setShowCreateNew(true)}
                sx={{ mt: 2, borderRadius: '10px', borderColor: '#C7D2FE', color: '#6366F1', fontWeight: 600, fontSize: '0.825rem',
                  '&:hover': { background: 'rgba(99,102,241,0.06)', borderColor: '#6366F1' } }}>
                Create New Category
              </Button>
            </>
          ) : (
            <Box sx={{ mt: 0.5 }}>
              <TextField fullWidth label="Category Name" value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)} sx={{ mb: 2.5 }} />

              <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
                Select Icon
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2.5 }}>
                {COMMON_ICONS.map((icon) => (
                  <Box key={icon} onClick={() => { setNewCategoryIcon(icon); setCustomIcon(''); }}
                    sx={{
                      width: 40, height: 40, borderRadius: '10px', fontSize: '1.25rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      border: newCategoryIcon === icon && !customIcon ? '2px solid #6366F1' : '1px solid #E2E8F0',
                      background: newCategoryIcon === icon && !customIcon ? 'rgba(99,102,241,0.08)' : '#F8F9FC',
                      transition: 'all 150ms ease',
                      '&:hover': { borderColor: '#6366F1', background: 'rgba(99,102,241,0.06)' },
                    }}>
                    {icon}
                  </Box>
                ))}
              </Box>

              <TextField fullWidth label="Or Enter Custom Icon (emoji)" value={customIcon}
                onChange={(e) => setCustomIcon(e.target.value)} placeholder="🎯" sx={{ mb: 2 }} />

              <TextField fullWidth label="Description (optional)" value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)} multiline rows={2} />

              <Button fullWidth variant="text" startIcon={<ArrowBack sx={{ fontSize: 15 }} />}
                onClick={() => setShowCreateNew(false)}
                sx={{ mt: 2, borderRadius: '8px', color: '#64748B', '&:hover': { background: '#F1F5F9' } }}>
                Back to Select Category
              </Button>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={handleClose} disabled={loading}
            sx={{ borderRadius: '8px', color: '#64748B', '&:hover': { background: '#F1F5F9' } }}>
            Cancel
          </Button>
          {!showCreateNew ? (
            <Button variant="contained" onClick={handleCategoryChange}
              disabled={!selectedCategory || loading || !document?.id}
              startIcon={loading ? null : undefined}
              sx={{ borderRadius: '8px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)', fontWeight: 600,
                '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #4338CA)' } }}>
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Update Category'}
            </Button>
          ) : (
            <Button variant="contained" onClick={handleCreateCategory}
              disabled={!newCategoryName.trim() || loading}
              sx={{ borderRadius: '8px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)', fontWeight: 600,
                '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #4338CA)' } }}>
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Create & Select'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity}
          sx={{ width: '100%', borderRadius: '10px' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CategorySelector;