import React from 'react';
import { Box, Typography } from '@mui/material';
import { Warning, Error as ErrorIcon, CheckCircle } from '@mui/icons-material';
import { format, differenceInDays } from 'date-fns';

const getDaysText = (expiryDate) => {
  const days = differenceInDays(new Date(expiryDate), new Date());
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  return `Expires in ${days} days`;
};

const getSeverityConfig = (isExpired, expiryDate) => {
  if (isExpired) return { color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', icon: ErrorIcon };
  const days = differenceInDays(new Date(expiryDate), new Date());
  if (days <= 3) return { color: '#EF4444', bg: '#FFF5F5', border: '#FECACA', icon: Warning };
  if (days <= 7) return { color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', icon: Warning };
  return { color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', icon: Warning };
};

const ExpiryAlerts = ({ expiringDocuments, expiredDocuments }) => {
  const allAlerts = [
    ...(expiredDocuments || []).map((doc) => ({ ...doc, isExpired: true })),
    ...(expiringDocuments || []),
  ];

  return (
    <Box sx={{ p: 3, borderRadius: '16px', border: '1px solid #E2E8F0', background: 'white' }}>
      <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A', mb: 2 }}>
        Document Alerts
      </Typography>

      {allAlerts.length === 0 ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, borderRadius: '10px', background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
          <CheckCircle sx={{ fontSize: 20, color: '#10B981' }} />
          <Typography sx={{ fontSize: '0.85rem', color: '#065F46', fontWeight: 500 }}>
            All documents are up to date!
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {allAlerts.slice(0, 5).map((doc) => {
            const cfg = getSeverityConfig(doc.isExpired, doc.expiryDate);
            const Icon = cfg.icon;
            return (
              <Box key={doc.id} sx={{
                display: 'flex', alignItems: 'flex-start', gap: 1.5,
                p: 1.5, borderRadius: '10px',
                background: cfg.bg, border: `1px solid ${cfg.border}`,
              }}>
                <Icon sx={{ fontSize: 17, color: cfg.color, mt: 0.15, flexShrink: 0 }} />
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                  <Typography sx={{
                    fontSize: '0.83rem', fontWeight: 600, color: '#0F172A',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {doc.originalFilename || doc.filename}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                    <Box sx={{ px: 0.75, py: 0.1, borderRadius: '4px', background: 'rgba(0,0,0,0.05)' }}>
                      <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: '#475569' }}>
                        {doc.category?.name || 'Uncategorized'}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: cfg.color }}>
                      {doc.isExpired
                        ? `Expired ${format(new Date(doc.expiryDate), 'MMM d, yyyy')}`
                        : getDaysText(doc.expiryDate)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            );
          })}
          {allAlerts.length > 5 && (
            <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8', pl: 0.5, pt: 0.5 }}>
              +{allAlerts.length - 5} more documents
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ExpiryAlerts;