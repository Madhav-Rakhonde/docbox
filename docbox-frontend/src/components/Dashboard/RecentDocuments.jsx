import React from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Box,
  Skeleton,
} from '@mui/material';
import {
  Description,
  Download,
  Visibility,
  InsertDriveFile,
  PictureAsPdf,
  Image as ImageIcon,
} from '@mui/icons-material';

// ✅ Safe date formatter — no date-fns dependency, handles null/invalid dates
const safeFormatDate = (dateValue) => {
  if (!dateValue) return 'Unknown date';
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Unknown date';
  }
};

const getFileIcon = (fileType) => {
  if (fileType?.includes('pdf')) return <PictureAsPdf color="error" />;
  if (fileType?.includes('image')) return <ImageIcon color="primary" />;
  return <InsertDriveFile color="action" />;
};

const RecentDocuments = ({ documents, loading }) => {
  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recent Documents
        </Typography>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} height={60} sx={{ my: 1 }} />
        ))}
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom fontWeight="600">
        Recent Documents
      </Typography>
      {documents && documents.length > 0 ? (
        <List>
          {documents.slice(0, 5).map((doc) => (
            <ListItem
              key={doc.id}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                mb: 1,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ListItemIcon>
                {getFileIcon(doc.fileType || doc.mimeType || doc.contentType)}
              </ListItemIcon>

              <ListItemText
                // ✅ FIX: Override secondary container from <p> to <span>
                // MUI renders secondary inside a <p> by default.
                // Putting <Box> (div) or <Chip> (div) inside a <p> is invalid HTML.
                // secondaryTypographyProps={{ component: 'span' }} changes it to <span>.
                primaryTypographyProps={{ component: 'span' }}
                secondaryTypographyProps={{ component: 'span' }}
                primary={
                  <Typography variant="body1" noWrap component="span" display="block">
                    {doc.originalFilename || doc.filename || doc.name || 'Unnamed document'}
                  </Typography>
                }
                secondary={
                  // ✅ FIX: Use span-based layout instead of Box (div)
                  <Box
                    component="span"
                    sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}
                  >
                    <Chip
                      label={doc.category?.name || doc.categoryName || 'Uncategorized'}
                      size="small"
                      color="primary"
                      variant="outlined"
                      component="span"
                    />
                    <Typography variant="caption" color="text.secondary" component="span">
                      {safeFormatDate(
                        doc.uploadedAt  ||
                        doc.createdAt   ||
                        doc.uploadDate  ||
                        doc.dateUploaded ||
                        doc.created
                      )}
                    </Typography>
                  </Box>
                }
              />

              <ListItemSecondaryAction>
                <IconButton size="small" edge="end">
                  <Visibility fontSize="small" />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      ) : (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Description sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            No documents yet. Upload your first document!
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default RecentDocuments;