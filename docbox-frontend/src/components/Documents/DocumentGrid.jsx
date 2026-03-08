import React from 'react';
import {
  Grid, Typography, IconButton, Box, CircularProgress,
  Menu, MenuItem, ListItemIcon, ListItemText, Divider,
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
  InsertDriveFile,
} from '@mui/icons-material';

// ─── File type icon box ───────────────────────────────────────────────────
const fileTypeMeta = (fileType) => {
  const t = (fileType || '').toLowerCase();
  if (t === 'pdf')  return { emoji: '📄', bg: '#FEF2F2', color: '#EF4444' };
  if (['jpg','jpeg','png','gif','webp','heic'].includes(t))
    return { emoji: '🖼️', bg: '#EFF6FF', color: '#3B82F6' };
  if (['doc','docx'].includes(t))
    return { emoji: '📝', bg: '#EEF2FF', color: '#6366F1' };
  return { emoji: '📁', bg: '#F8F9FC', color: '#94A3B8' };
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

// ─── DocumentCard ────────────────────────────────────────────────────────
const DocumentCard = ({ document, onView, onDownload, onShare, onDelete, onChangeCategory, onCreateCategory }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenuOpen  = (e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); };
  const handleMenuClose = () => setAnchorEl(null);
  const handleAction    = (action) => { handleMenuClose(); action(document); };

  const meta = fileTypeMeta(document.fileType);

  return (
    <Box elevation={0} sx={{
      borderRadius: '14px', border: '1px solid #E2E8F0', background: 'white',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      cursor: 'pointer', height: '100%',
      transition: 'transform 200ms ease, box-shadow 200ms ease',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(15,23,42,0.08)' },
    }}
      onClick={() => onView(document)}>

      {/* Thumbnail area */}
      <Box sx={{
        height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: meta.bg, borderBottom: '1px solid #E2E8F0', position: 'relative',
      }}>
        <Typography sx={{ fontSize: '2.5rem' }}>{meta.emoji}</Typography>

        {/* Type badge */}
        <Box sx={{ position: 'absolute', bottom: 8, left: 8,
          px: 1, py: 0.2, borderRadius: '4px', background: 'white', border: `1px solid ${meta.color}25` }}>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: meta.color, textTransform: 'uppercase' }}>
            {document.fileType || 'FILE'}
          </Typography>
        </Box>

        {/* Menu button */}
        <IconButton onClick={handleMenuOpen} size="small"
          sx={{ position: 'absolute', top: 6, right: 6,
            background: 'white', width: 28, height: 28,
            border: '1px solid #E2E8F0',
            color: '#94A3B8', '&:hover': { background: '#F8F9FC', color: '#0F172A' } }}>
          <MoreVertIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2, flex: 1 }}>
        <Typography sx={{
          fontWeight: 700, fontSize: '0.825rem', color: '#0F172A',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mb: 0.75,
        }} title={document.originalFilename}>
          {document.originalFilename}
        </Typography>

        {document.category && (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 0.75,
            px: 1, py: 0.2, borderRadius: '5px', background: '#F1F5F9' }}>
            <Typography sx={{ fontSize: '0.75rem' }}>{document.category.icon}</Typography>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>{document.category.name}</Typography>
          </Box>
        )}

        <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>
          {formatFileSize(document.fileSize)}
          {document.createdAt && ` · ${new Date(document.createdAt).toLocaleDateString('en-IN')}`}
        </Typography>
      </Box>

      {/* Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}
        PaperProps={{ sx: { borderRadius: '12px', border: '1px solid #E2E8F0',
          boxShadow: '0 8px 24px rgba(15,23,42,0.1)', minWidth: 180 } }}>
        <MenuItem onClick={() => handleAction(onView)} sx={{ fontSize: '0.875rem' }}>
          <ListItemIcon><ViewIcon sx={{ fontSize: 16, color: '#6366F1' }} /></ListItemIcon>
          <ListItemText>View</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction(onDownload)} sx={{ fontSize: '0.875rem' }}>
          <ListItemIcon><DownloadIcon sx={{ fontSize: 16, color: '#3B82F6' }} /></ListItemIcon>
          <ListItemText>Download</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction(onShare)} sx={{ fontSize: '0.875rem' }}>
          <ListItemIcon><ShareIcon sx={{ fontSize: 16, color: '#10B981' }} /></ListItemIcon>
          <ListItemText>Share</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleAction(onChangeCategory)} sx={{ fontSize: '0.875rem' }}>
          <ListItemIcon><ChangeCategoryIcon sx={{ fontSize: 16, color: '#6366F1' }} /></ListItemIcon>
          <ListItemText>Change Category</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction(onCreateCategory)} sx={{ fontSize: '0.875rem' }}>
          <ListItemIcon><CreateCategoryIcon sx={{ fontSize: 16, color: '#F59E0B' }} /></ListItemIcon>
          <ListItemText>Create New Category</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleAction(onDelete)} sx={{ fontSize: '0.875rem', color: '#EF4444' }}>
          <ListItemIcon><DeleteIcon sx={{ fontSize: 16, color: '#EF4444' }} /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

// ─── DocumentGrid ─────────────────────────────────────────────────────────
const DocumentGrid = ({ documents, loading, onView, onDownload, onShare, onDelete, onChangeCategory, onCreateCategory }) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress sx={{ color: '#6366F1' }} />
      </Box>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <Box sx={{ width: 64, height: 64, borderRadius: '50%', background: '#F1F5F9',
          mx: 'auto', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FolderIcon sx={{ fontSize: 28, color: '#94A3B8' }} />
        </Box>
        <Typography sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5 }}>No documents found</Typography>
        <Typography sx={{ fontSize: '0.875rem', color: '#94A3B8' }}>
          Upload your first document to get started
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2.5}>
      {documents.map((document) => (
        <Grid item xs={12} sm={6} md={4} key={document.id}>
          <DocumentCard document={document} onView={onView} onDownload={onDownload}
            onShare={onShare} onDelete={onDelete}
            onChangeCategory={onChangeCategory} onCreateCategory={onCreateCategory} />
        </Grid>
      ))}
    </Grid>
  );
};

export default DocumentGrid;