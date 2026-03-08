import React, { useState } from 'react';
import {
  Card, CardContent, IconButton, Typography,
  Menu, MenuItem, Box, Divider, ListItemIcon, ListItemText,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import CategorySelector from '../CategorySelector';

const DocumentCard = ({ document, onDelete, onView, onDownload }) => {
  const [anchorEl, setAnchorEl]                       = useState(null);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [currentCategory, setCurrentCategory]         = useState(document.category);

  const handleMenuOpen  = (e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); };
  const handleMenuClose = () => setAnchorEl(null);

  const handleCategoryChange = (newCategory) => {
    setCurrentCategory(newCategory);
    window.location.reload();
  };

  return (
    <>
      <Card elevation={0} sx={{
        borderRadius: '14px', border: '1px solid #E2E8F0', background: 'white',
        transition: 'transform 200ms ease, box-shadow 200ms ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(15,23,42,0.08)' },
      }}>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography sx={{
              fontWeight: 700, fontSize: '0.875rem', color: '#0F172A',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              flex: 1, mr: 1,
            }}>
              {document.originalFilename}
            </Typography>
            <IconButton onClick={handleMenuOpen} size="small"
              sx={{ flexShrink: 0, color: '#94A3B8', '&:hover': { background: '#F1F5F9', color: '#0F172A' } }}>
              <MoreVertIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, mt: 1.5,
            px: 1.25, py: 0.35, borderRadius: '6px', background: '#F1F5F9' }}>
            <Typography sx={{ fontSize: '0.9rem', lineHeight: 1 }}>
              {currentCategory?.icon || '📁'}
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>
              {currentCategory?.name || 'Others'}
            </Typography>
          </Box>

          <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8', mt: 1 }}>
            {(document.fileSize / 1024).toFixed(2)} KB
          </Typography>
        </CardContent>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}
          PaperProps={{ sx: { borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(15,23,42,0.1)', minWidth: 160 } }}>
          <MenuItem onClick={() => { onView(document); handleMenuClose(); }}
            sx={{ fontSize: '0.875rem', color: '#0F172A' }}>
            <ListItemIcon><ViewIcon sx={{ fontSize: 16, color: '#6366F1' }} /></ListItemIcon>
            <ListItemText>View</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { onDownload(document); handleMenuClose(); }}
            sx={{ fontSize: '0.875rem', color: '#0F172A' }}>
            <ListItemIcon><DownloadIcon sx={{ fontSize: 16, color: '#3B82F6' }} /></ListItemIcon>
            <ListItemText>Download</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { setShowCategorySelector(true); handleMenuClose(); }}
            sx={{ fontSize: '0.875rem', color: '#0F172A' }}>
            <ListItemIcon><CategoryIcon sx={{ fontSize: 16, color: '#10B981' }} /></ListItemIcon>
            <ListItemText>Change Category</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => { onDelete(document.id); handleMenuClose(); }}
            sx={{ fontSize: '0.875rem', color: '#EF4444' }}>
            <ListItemIcon><DeleteIcon sx={{ fontSize: 16, color: '#EF4444' }} /></ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        </Menu>
      </Card>

      <CategorySelector
        open={showCategorySelector}
        onClose={() => setShowCategorySelector(false)}
        currentCategory={currentCategory}
        onCategoryChange={handleCategoryChange}
        documentId={document.id}
      />
    </>
  );
};

export default DocumentCard;