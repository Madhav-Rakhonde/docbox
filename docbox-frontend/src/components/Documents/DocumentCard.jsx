import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  IconButton,
  Typography,
  Chip,
  Menu,
  MenuItem,
  Box
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import CategorySelector from "../CategorySelector";

const DocumentCard = ({ document, onDelete, onView, onDownload }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(document.category);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCategoryChange = (newCategory) => {
    setCurrentCategory(newCategory);
    // Optional: trigger a refresh of the document list
    window.location.reload();
  };

  return (
    <>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="start">
            <Typography variant="h6" noWrap>
              {document.originalFilename}
            </Typography>
            <IconButton onClick={handleMenuOpen} size="small">
              <MoreVertIcon />
            </IconButton>
          </Box>

          <Chip 
            label={currentCategory?.name || 'Others'} 
            size="small" 
            icon={<span>{currentCategory?.icon || '📁'}</span>}
            sx={{ mt: 1 }}
          />

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {(document.fileSize / 1024).toFixed(2)} KB
          </Typography>
        </CardContent>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => { onView(document); handleMenuClose(); }}>
            <ViewIcon sx={{ mr: 1 }} /> View
          </MenuItem>
          <MenuItem onClick={() => { onDownload(document); handleMenuClose(); }}>
            <DownloadIcon sx={{ mr: 1 }} /> Download
          </MenuItem>
          <MenuItem onClick={() => { setShowCategorySelector(true); handleMenuClose(); }}>
            <CategoryIcon sx={{ mr: 1 }} /> Change Category
          </MenuItem>
          <MenuItem onClick={() => { onDelete(document.id); handleMenuClose(); }}>
            <DeleteIcon sx={{ mr: 1 }} /> Delete
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