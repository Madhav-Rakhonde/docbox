import React from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Alert,
  Chip,
  Box,
} from '@mui/material';
import { Warning, Error as ErrorIcon } from '@mui/icons-material';
import { format, differenceInDays } from 'date-fns';

const ExpiryAlerts = ({ expiringDocuments, expiredDocuments }) => {
  const getDaysText = (expiryDate) => {
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days === 0) return 'Expires today';
    if (days === 1) return 'Expires tomorrow';
    return `Expires in ${days} days`;
  };

  const getSeverity = (expiryDate) => {
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days <= 3) return 'error';
    if (days <= 7) return 'warning';
    return 'info';
  };

  const allAlerts = [
    ...(expiredDocuments || []).map((doc) => ({ ...doc, isExpired: true })),
    ...(expiringDocuments || []),
  ];

  if (!allAlerts || allAlerts.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight="600">
          Document Alerts
        </Typography>
        <Alert severity="success" sx={{ mt: 2 }}>
          All documents are up to date! No expiring documents.
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom fontWeight="600">
        Document Alerts
      </Typography>
      <List>
        {allAlerts.slice(0, 5).map((doc) => (
          <ListItem
            key={doc.id}
            sx={{
              border: 1,
              borderColor: doc.isExpired ? 'error.main' : 'warning.main',
              borderRadius: 1,
              mb: 1,
              bgcolor: doc.isExpired ? 'error.lighter' : 'warning.lighter',
            }}
          >
            {doc.isExpired ? (
              <ErrorIcon color="error" sx={{ mr: 2 }} />
            ) : (
              <Warning color="warning" sx={{ mr: 2 }} />
            )}
            <ListItemText
              primary={
                <Typography variant="body1" fontWeight="500">
                  {doc.originalFilename || doc.filename}
                </Typography>
              }
              secondary={
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
                  <Chip
                    label={doc.category?.name || 'Uncategorized'}
                    size="small"
                    variant="outlined"
                  />
                  <Typography
                    variant="caption"
                    color={doc.isExpired ? 'error' : 'warning.dark'}
                    fontWeight="600"
                  >
                    {doc.isExpired
                      ? `Expired ${format(new Date(doc.expiryDate), 'MMM d, yyyy')}`
                      : getDaysText(doc.expiryDate)}
                  </Typography>
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
      {allAlerts.length > 5 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          + {allAlerts.length - 5} more documents
        </Typography>
      )}
    </Paper>
  );
};

export default ExpiryAlerts;