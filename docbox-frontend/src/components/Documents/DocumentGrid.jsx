import React from 'react';
import {
  Grid, Card, CardContent, Typography, IconButton,
  Chip, Box, CircularProgress, Menu, MenuItem,
  ListItemIcon, ListItemText, Divider, Tooltip,
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
  HourglassEmpty as ProcessingIcon,
  ErrorOutline as FailedIcon,
  PictureAsPdf,
  Image as ImageIcon,
  Description,
  InsertDriveFile,
} from '@mui/icons-material';

// ── File type icon ────────────────────────────────────────────────────────
const FileIcon = ({ fileType }) => {
  if (!fileType) return <InsertDriveFile sx={{ fontSize: 36, color: '#94A3B8' }} />;
  const t = fileType.toLowerCase();
  if (t === 'pdf')
    return <PictureAsPdf sx={{ fontSize: 36, color: '#EF4444' }} />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp', 'tiff'].includes(t))
    return <ImageIcon sx={{ fontSize: 36, color: '#3B82F6' }} />;
  if (['doc', 'docx'].includes(t))
    return <Description sx={{ fontSize: 36, color: '#1565C0' }} />;
  return <InsertDriveFile sx={{ fontSize: 36, color: '#94A3B8' }} />;
};

// ── Processing status badge ───────────────────────────────────────────────
const ProcessingBadge = ({ status }) => {
  if (!status || status === 'READY') return null;

  if (status === 'PROCESSING') {
    return (
      <Tooltip title="AI is detecting category and expiry date in the background">
        <Chip
          icon={<CircularProgress size={10} sx={{ color: '#6366F1 !important' }} />}
          label="Processing…"
          size="small"
          sx={{
            height: 20, fontSize: '0.68rem', fontWeight: 600,
            background: 'rgba(99,102,241,0.1)',
            color: '#4F46E5',
            border: '1px solid rgba(99,102,241,0.25)',
            '& .MuiChip-icon': { ml: '6px' },
          }}
        />
      </Tooltip>
    );
  }

  if (status === 'FAILED') {
    return (
      <Tooltip title="Auto-detection failed — please set category manually">
        <Chip
          icon={<FailedIcon sx={{ fontSize: 12, color: '#EF4444 !important' }} />}
          label="Set category"
          size="small"
          sx={{
            height: 20, fontSize: '0.68rem', fontWeight: 600,
            background: 'rgba(239,68,68,0.08)',
            color: '#DC2626',
            border: '1px solid rgba(239,68,68,0.2)',
            '& .MuiChip-icon': { ml: '6px' },
          }}
        />
      </Tooltip>
    );
  }

  return null;
};

// ── Single document card ──────────────────────────────────────────────────
const DocumentCard = ({
  document,
  onView,
  onDownload,
  onShare,
  onDelete,
  onChangeCategory,
  onCreateCategory,
}) => {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenuOpen  = (e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); };
  const handleMenuClose = () => setAnchorEl(null);

  // ✅ FIX: curried handler — receives the event, stops propagation so the
  // card's own onClick (which triggers onView) never fires from menu clicks.
  const handleAction = (action) => (e) => {
    if (e) e.stopPropagation();
    handleMenuClose();
    action(document);
  };

  const isProcessing = document.processingStatus === 'PROCESSING';

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(2)} MB`;
  };

  return (
    <Card
      onClick={() => !isProcessing && onView(document)}
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        background: isProcessing ? '#FAFBFF' : 'white',
        transition: 'transform 200ms ease, box-shadow 200ms ease',
        cursor: isProcessing ? 'default' : 'pointer',
        '&:hover': isProcessing ? {} : {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
        },
      }}>

      {/* ── File icon area ──────────────────────────────────────────── */}
      <Box sx={{
        height: 130,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isProcessing ? 'rgba(99,102,241,0.04)' : '#F8FAFC',
        borderBottom: '1px solid #F1F5F9',
        position: 'relative',
      }}>
        {isProcessing ? (
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ position: 'relative', display: 'inline-flex', mb: 0.75 }}>
              <CircularProgress size={40} sx={{ color: '#6366F1' }} />
              <Box sx={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ProcessingIcon sx={{ fontSize: 18, color: '#6366F1' }} />
              </Box>
            </Box>
            <Typography sx={{ fontSize: '0.68rem', color: '#6366F1', fontWeight: 600 }}>
              AI Processing
            </Typography>
          </Box>
        ) : (
          <FileIcon fileType={document.fileType} />
        )}

        {/* Three-dot menu */}
        <Box sx={{ position: 'absolute', top: 6, right: 6 }}>
          <IconButton
            onClick={handleMenuOpen}
            size="small"
            sx={{
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(4px)',
              '&:hover': { background: 'white', boxShadow: '0 2px 8px rgba(15,23,42,0.1)' },
            }}>
            <MoreVertIcon sx={{ fontSize: 16, color: '#64748B' }} />
          </IconButton>
        </Box>

        {/* Expiry badges */}
        {document.isExpired && (
          <Box sx={{ position: 'absolute', top: 6, left: 6 }}>
            <Chip label="Expired" color="error" size="small"
              sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
          </Box>
        )}
        {document.isExpiringSoon && !document.isExpired && (
          <Box sx={{ position: 'absolute', top: 6, left: 6 }}>
            <Chip label="Expiring" color="warning" size="small"
              sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
          </Box>
        )}
      </Box>

      {/* ── Card body ────────────────────────────────────────────────── */}
      <CardContent sx={{ p: 2, pb: '12px !important', flexGrow: 1 }}>

        {/* Filename */}
        <Typography
          sx={{
            fontWeight: 700, fontSize: '0.8rem', color: '#0F172A',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            mb: 1,
          }}
          title={document.originalFilename}>
          {document.originalFilename}
        </Typography>

        {/* Processing status badge */}
        <Box sx={{ mb: 0.75 }}>
          <ProcessingBadge status={document.processingStatus} />
        </Box>

        {/* Category */}
        {document.category && (
          <Box sx={{
            display: 'inline-flex', alignItems: 'center',
            px: 1, py: 0.25, borderRadius: '6px', background: '#F1F5F9', mb: 0.75,
          }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>
              {document.category.name}
            </Typography>
          </Box>
        )}

        {/* Meta */}
        <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8' }}>
          {formatFileSize(document.fileSize)}
          {document.createdAt && (
            <> · {new Date(document.createdAt).toLocaleDateString('en-IN')}</>
          )}
        </Typography>
      </CardContent>

      {/* ── Context menu ──────────────────────────────────────────────── */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            borderRadius: '12px', border: '1px solid #E2E8F0',
            boxShadow: '0 8px 24px rgba(15,23,42,0.1)', minWidth: 180,
          },
        }}>

        <MenuItem onClick={handleAction(onView)} disabled={isProcessing}
          sx={{ fontSize: '0.875rem' }}>
          <ListItemIcon><ViewIcon sx={{ fontSize: 16, color: '#6366F1' }} /></ListItemIcon>
          <ListItemText>View</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleAction(onDownload)} sx={{ fontSize: '0.875rem' }}>
          <ListItemIcon><DownloadIcon sx={{ fontSize: 16, color: '#3B82F6' }} /></ListItemIcon>
          <ListItemText>Download</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleAction(onShare)} disabled={isProcessing}
          sx={{ fontSize: '0.875rem' }}>
          <ListItemIcon><ShareIcon sx={{ fontSize: 16, color: '#10B981' }} /></ListItemIcon>
          <ListItemText>Share</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleAction(onChangeCategory)} sx={{ fontSize: '0.875rem' }}>
          <ListItemIcon><ChangeCategoryIcon sx={{ fontSize: 16, color: '#F59E0B' }} /></ListItemIcon>
          <ListItemText>Change Category</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleAction(onCreateCategory)} sx={{ fontSize: '0.875rem' }}>
          <ListItemIcon><CreateCategoryIcon sx={{ fontSize: 16, color: '#8B5CF6' }} /></ListItemIcon>
          <ListItemText>Create New Category</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleAction(onDelete)}
          sx={{ fontSize: '0.875rem', color: '#EF4444' }}>
          <ListItemIcon><DeleteIcon sx={{ fontSize: 16, color: '#EF4444' }} /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  );
};

// ── Grid wrapper ──────────────────────────────────────────────────────────
const DocumentGrid = ({
  documents,
  loading,
  onView,
  onDownload,
  onShare,
  onDelete,
  onChangeCategory,
  onCreateCategory,
}) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={56} sx={{ color: '#6366F1' }} />
      </Box>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <FolderIcon sx={{ fontSize: 72, color: '#CBD5E1', mb: 2 }} />
        <Typography sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
          No documents found
        </Typography>
        <Typography sx={{ fontSize: '0.875rem', color: '#94A3B8' }}>
          Upload your first document to get started
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2.5}>
      {documents.map((doc) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={doc.id}>
          <DocumentCard
            document={doc}
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