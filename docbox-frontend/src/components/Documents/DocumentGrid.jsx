import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Chip,
  Box,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
  DriveFileMove as ChangeCategoryIcon,
  CreateNewFolder as CreateCategoryIcon,
} from '@mui/icons-material';

const DocumentCard = ({ 
  document, 
  onView, 
  onDownload, 
  onShare, 
  onDelete,
  onChangeCategory,  // ✅ NEW
  onCreateCategory,  // ✅ NEW
}) => {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenuOpen = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAction = (action) => {
    handleMenuClose();
    action(document);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="start">
          <Typography variant="h6" noWrap sx={{ maxWidth: '80%' }}>
            {document.originalFilename}
          </Typography>
          <IconButton onClick={handleMenuOpen} size="small">
            <MoreVertIcon />
          </IconButton>
        </Box>

        {document.category && (
          <Chip
            icon={<span style={{ fontSize: '1rem' }}>{document.category.icon}</span>}
            label={document.category.name}
            size="small"
            sx={{ mt: 1 }}
          />
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {formatFileSize(document.fileSize)}
        </Typography>

        {document.createdAt && (
          <Typography variant="caption" color="text.secondary">
            {new Date(document.createdAt).toLocaleDateString()}
          </Typography>
        )}
      </CardContent>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleAction(onView)}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleAction(onDownload)}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleAction(onShare)}>
          <ListItemIcon>
            <ShareIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Share</ListItemText>
        </MenuItem>

        <Divider />

        {/* ✅ NEW: Change Category */}
        <MenuItem onClick={() => handleAction(onChangeCategory)}>
          <ListItemIcon>
            <ChangeCategoryIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText>Change Category</ListItemText>
        </MenuItem>

        {/* ✅ NEW: Create New Category */}
        <MenuItem onClick={() => handleAction(onCreateCategory)}>
          <ListItemIcon>
            <CreateCategoryIcon fontSize="small" color="secondary" />
          </ListItemIcon>
          <ListItemText>Create New Category</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem 
          onClick={() => handleAction(onDelete)} 
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  );
};

const DocumentGrid = ({ 
  documents, 
  loading, 
  onView, 
  onDownload, 
  onShare, 
  onDelete,
  onChangeCategory,  // ✅ NEW
  onCreateCategory,  // ✅ NEW
}) => {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <Box textAlign="center" py={8}>
        <FolderIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No documents found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Upload your first document to get started
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      {documents.map((document) => (
        <Grid item xs={12} sm={6} md={4} key={document.id}>
          <DocumentCard
            document={document}
            onView={onView}
            onDownload={onDownload}
            onShare={onShare}
            onDelete={onDelete}
            onChangeCategory={onChangeCategory}
            onCreateCategory={onCreateCategory}
          />
        </Grid>
      ))}
    </Grid>
  );
};

export default DocumentGrid;