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
import { format } from 'date-fns';

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
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <ListItemIcon>{getFileIcon(doc.fileType)}</ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body1" noWrap>
                    {doc.originalFilename || doc.filename}
                  </Typography>
                }
                secondary={
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                    <Chip
                      label={doc.category?.name || 'Uncategorized'}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {doc.uploadedAt
                        ? format(new Date(doc.uploadedAt), 'MMM d, yyyy')
                        : 'Unknown date'}
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