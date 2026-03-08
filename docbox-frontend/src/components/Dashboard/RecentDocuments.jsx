import React from 'react';
import {
  Box, Typography, Skeleton,
} from '@mui/material';
import {
  Description, Visibility,
  InsertDriveFile, PictureAsPdf, Image as ImageIcon,
} from '@mui/icons-material';

const safeFormatDate = (dateValue) => {
  if (!dateValue) return 'Unknown date';
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return 'Unknown date'; }
};

const getFileIcon = (fileType) => {
  if (fileType?.includes('pdf')) return <PictureAsPdf sx={{ fontSize: 18, color: '#EF4444' }} />;
  if (fileType?.includes('image')) return <ImageIcon sx={{ fontSize: 18, color: '#6366F1' }} />;
  return <InsertDriveFile sx={{ fontSize: 18, color: '#94A3B8' }} />;
};

const RecentDocuments = ({ documents, loading }) => {
  if (loading) {
    return (
      <Box sx={{ p: 3, borderRadius: '16px', border: '1px solid #E2E8F0', background: 'white' }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A', mb: 2 }}>Recent Documents</Typography>
        {[1,2,3,4,5].map((i) => (
          <Skeleton key={i} height={52} sx={{ my: 0.75, borderRadius: '10px' }} />
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, borderRadius: '16px', border: '1px solid #E2E8F0', background: 'white' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>Recent Documents</Typography>
        {documents?.length > 0 && (
          <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>{Math.min(documents.length, 5)} of {documents.length}</Typography>
        )}
      </Box>

      {documents && documents.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {documents.slice(0, 5).map((doc) => (
            <Box key={doc.id} sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              p: 1.5, borderRadius: '10px', border: '1px solid #F1F5F9',
              cursor: 'pointer',
              transition: 'background 150ms',
              '&:hover': { background: '#F8F9FC', borderColor: '#E2E8F0' },
            }}>
              {/* File icon box */}
              <Box sx={{
                width: 36, height: 36, borderRadius: '8px',
                background: '#F1F5F9', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {getFileIcon(doc.fileType || doc.mimeType || doc.contentType)}
              </Box>

              {/* Name + meta */}
              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <Typography component="span" sx={{
                  fontSize: '0.85rem', fontWeight: 600, color: '#0F172A',
                  display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {doc.originalFilename || doc.filename || doc.name || 'Unnamed document'}
                </Typography>
                <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                  <Box component="span" sx={{
                    px: 1, py: 0.1, borderRadius: '4px',
                    background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
                  }}>
                    <Typography component="span" sx={{ fontSize: '0.65rem', fontWeight: 600, color: '#6366F1' }}>
                      {doc.category?.name || doc.categoryName || 'Uncategorized'}
                    </Typography>
                  </Box>
                  <Typography component="span" sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                    {safeFormatDate(doc.uploadedAt || doc.createdAt || doc.uploadDate || doc.dateUploaded || doc.created)}
                  </Typography>
                </Box>
              </Box>

              <Visibility sx={{ fontSize: 16, color: '#CBD5E1', flexShrink: 0 }} />
            </Box>
          ))}
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <Box sx={{ width: 52, height: 52, borderRadius: '50%', background: '#F1F5F9', mx: 'auto', mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Description sx={{ fontSize: 24, color: '#94A3B8' }} />
          </Box>
          <Typography sx={{ fontSize: '0.875rem', color: '#94A3B8' }}>No documents yet. Upload your first document!</Typography>
        </Box>
      )}
    </Box>
  );
};

export default RecentDocuments;