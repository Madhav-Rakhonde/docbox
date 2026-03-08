import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Grid, Card, CardContent,
  CardActions, Button, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, CircularProgress,
  Alert, Divider, List, ListItem, ListItemText,
  ListItemIcon, Paper,
} from '@mui/material';
import {
  CardGiftcard, Business, OpenInNew, Phone,
  CalendarToday, TrendingUp, CheckCircle,
  Notifications as NotificationsIcon,
  HourglassEmpty, Description, Refresh,
  ArrowForward,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';

// ─── Category Config ───────────────────────────────────────────────────────
const CAT_CONFIG = {
  SCHOLARSHIP: { color: '#6366F1', bg: '#EEF2FF' },
  SUBSIDY:     { color: '#10B981', bg: '#ECFDF5' },
  PENSION:     { color: '#F59E0B', bg: '#FFFBEB' },
  EMPLOYMENT:  { color: '#3B82F6', bg: '#EFF6FF' },
  HOUSING:     { color: '#8B5CF6', bg: '#F5F3FF' },
  HEALTH:      { color: '#EF4444', bg: '#FEF2F2' },
  LOAN:        { color: '#64748B', bg: '#F8FAFC' },
};
const getCatConfig = (cat) => CAT_CONFIG[cat] || CAT_CONFIG.LOAN;

// Score color
const scoreColor = (s) => s >= 80 ? '#10B981' : s >= 60 ? '#6366F1' : '#F59E0B';

// ─── Scheme Card ───────────────────────────────────────────────────────────
const SchemeCard = ({ schemeData, onView }) => {
  const scheme      = schemeData.scheme || schemeData;
  const score       = schemeData.eligibilityScore;
  const missingDocs = schemeData.missingDocuments || [];
  const viewed      = schemeData.viewed;
  const cat         = getCatConfig(scheme.category);

  return (
    <Card elevation={0} sx={{
      height: '100%', display: 'flex', flexDirection: 'column',
      borderRadius: '16px', border: '1px solid #E2E8F0',
      position: 'relative', overflow: 'visible',
      transition: 'transform 200ms ease, box-shadow 200ms ease',
      '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 12px 32px rgba(15,23,42,0.1)' },
    }}>
      {/* NEW badge */}
      {!viewed && (
        <Box sx={{
          position: 'absolute', top: -8, right: 12,
          px: 1.5, py: 0.25, borderRadius: '99px',
          background: '#EF4444', zIndex: 1,
        }}>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'white', letterSpacing: '0.06em' }}>
            NEW
          </Typography>
        </Box>
      )}

      <CardContent sx={{ flex: 1, p: 2.5 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2, gap: 1 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <CardGiftcard sx={{ fontSize: 22, color: cat.color }} />
          </Box>

          {score && (
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 0.5,
              px: 1.25, py: 0.5, borderRadius: '8px',
              background: `${scoreColor(score)}15`,
              border: `1px solid ${scoreColor(score)}30`,
            }}>
              <TrendingUp sx={{ fontSize: 13, color: scoreColor(score) }} />
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: scoreColor(score) }}>
                {score}% Match
              </Typography>
            </Box>
          )}
        </Box>

        {/* Name + Category */}
        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', mb: 0.5, lineHeight: 1.3 }}>
          {scheme.name}
        </Typography>

        {scheme.category && (
          <Box sx={{
            display: 'inline-flex', px: 1, py: 0.25, mb: 1.5,
            borderRadius: '4px', background: cat.bg, border: `1px solid ${cat.color}25`,
          }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: cat.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {scheme.category}
            </Typography>
          </Box>
        )}

        <Typography sx={{ fontSize: '0.82rem', color: '#64748B', lineHeight: 1.6, mb: 1.5,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {scheme.description || 'Government scheme for eligible citizens'}
        </Typography>

        {/* Amount */}
        {scheme.amount && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
            <Box sx={{ width: 3, height: 14, background: '#10B981', borderRadius: 99 }} />
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#10B981' }}>
              ₹{scheme.amount.toLocaleString('en-IN')}
            </Typography>
          </Box>
        )}

        {/* Missing docs warning */}
        {missingDocs.length > 0 && (
          <Box sx={{ p: 1.5, borderRadius: '8px', background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400E', mb: 0.5 }}>
              Missing documents ({missingDocs.length})
            </Typography>
            {missingDocs.slice(0, 2).map((d, i) => (
              <Typography key={i} sx={{ fontSize: '0.72rem', color: '#92400E' }}>• {d}</Typography>
            ))}
            {missingDocs.length > 2 && (
              <Typography sx={{ fontSize: '0.72rem', color: '#92400E' }}>+{missingDocs.length - 2} more</Typography>
            )}
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
        <Button
          fullWidth variant="outlined" size="small"
          endIcon={<ArrowForward sx={{ fontSize: 14 }} />}
          onClick={() => onView(schemeData)}
          sx={{
            borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem',
            borderColor: cat.color, color: cat.color,
            '&:hover': { background: cat.bg, borderColor: cat.color },
          }}
        >
          View Details
        </Button>
      </CardActions>
    </Card>
  );
};

// ─── How It Works Step ──────────────────────────────────────────────────────
const HowStep = ({ icon: Icon, step, title, subtitle, color }) => (
  <Box sx={{ textAlign: 'center', p: 2 }}>
    <Box sx={{
      width: 56, height: 56, borderRadius: '14px',
      background: `${color}15`, mx: 'auto', mb: 1.5,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon sx={{ fontSize: 24, color }} />
    </Box>
    <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#0F172A', mb: 0.25 }}>{title}</Typography>
    <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>{subtitle}</Typography>
  </Box>
);

// ─── Main ──────────────────────────────────────────────────────────────────
const EligibleSchemes = () => {
  const [eligibleSchemes, setEligibleSchemes] = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [selectedScheme, setSelectedScheme]   = useState(null);
  const [detailsOpen, setDetailsOpen]         = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => { loadEligibleSchemes(); loadNotificationCount(); }, []);

  const loadEligibleSchemes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/schemes/eligible');
      if (response.data.success) setEligibleSchemes(response.data.data.schemes || []);
    } catch { toast.error('Failed to load eligible schemes'); }
    finally { setLoading(false); }
  };

  const loadNotificationCount = async () => {
    try {
      const r = await api.get('/notifications/unread/count');
      if (r.data.success) setNotificationCount(r.data.data.count || 0);
    } catch { /* silent */ }
  };

  const handleViewScheme = async (scheme) => {
    setSelectedScheme(scheme);
    setDetailsOpen(true);
    try {
      await api.post(`/schemes/${scheme.scheme?.id || scheme.id}/view`);
      loadEligibleSchemes();
    } catch { /* silent */ }
  };

  const handleManualDiscovery = async () => {
    try {
      setLoading(true);
      toast.info('Searching for eligible schemes…');
      const response = await api.post('/schemes/discover-free');
      if (response.data.success) {
        const discovered = response.data.data.totalDiscovered || 0;
        if (discovered > 0) {
          toast.success(`Found ${discovered} new scheme${discovered !== 1 ? 's' : ''}!`);
          loadEligibleSchemes();
        } else {
          toast.info("No new schemes found. We'll keep checking!");
        }
      }
    } catch { toast.error('Failed to search'); }
    finally { setLoading(false); }
  };

  const sel = selectedScheme;
  const scheme = sel?.scheme || sel;

  return (
    <Container maxWidth="lg" sx={{ animation: 'fadeUp 0.35s ease both' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: { xs: '1.75rem', sm: '2.25rem' },
            fontWeight: 400, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.2, mb: 0.25,
          }}>
            Eligible Schemes
          </Typography>
          <Typography sx={{ color: '#64748B', fontSize: '0.9rem' }}>
            Government schemes you may qualify for based on your documents
          </Typography>
        </Box>
        <Button
          variant="outlined" startIcon={<Refresh sx={{ fontSize: 16 }} />}
          onClick={handleManualDiscovery} disabled={loading} size="small"
          sx={{
            borderRadius: '8px', borderColor: '#E2E8F0', color: '#475569',
            '&:hover': { borderColor: '#6366F1', color: '#6366F1', background: 'rgba(99,102,241,0.05)' },
          }}
        >
          Search Now
        </Button>
      </Box>

      {/* Content */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress sx={{ color: '#6366F1' }} />
        </Box>
      ) : eligibleSchemes.length > 0 ? (
        <>
          <Typography sx={{ fontSize: '0.85rem', color: '#94A3B8', mb: 2.5, fontWeight: 500 }}>
            {eligibleSchemes.length} scheme{eligibleSchemes.length !== 1 ? 's' : ''} found for you
          </Typography>
          <Grid container spacing={2.5}>
            {eligibleSchemes.map((scheme) => (
              <Grid item xs={12} sm={6} md={4} key={scheme.id}>
                <SchemeCard schemeData={scheme} onView={handleViewScheme} />
              </Grid>
            ))}
          </Grid>
        </>
      ) : (
        <Paper elevation={0} sx={{ borderRadius: '20px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {/* Empty state hero */}
          <Box sx={{ py: 6, px: 4, textAlign: 'center', background: 'linear-gradient(135deg, #F8F9FC 0%, #EEF2FF 100%)' }}>
            <Box sx={{
              width: 72, height: 72, borderRadius: '20px',
              background: 'linear-gradient(135deg, #6366F1, #818CF8)',
              mx: 'auto', mb: 2.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
            }}>
              <CardGiftcard sx={{ fontSize: 32, color: 'white' }} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', color: '#0F172A', mb: 0.5 }}>
              No Schemes Found Yet
            </Typography>
            <Typography sx={{ color: '#64748B', fontSize: '0.9rem', maxWidth: 480, mx: 'auto', lineHeight: 1.7 }}>
              We discover eligible government schemes based on your documents automatically every night.
            </Typography>
          </Box>

          {/* How it works */}
          <Box sx={{ px: 4, py: 3, borderTop: '1px solid #F1F5F9' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center', mb: 2 }}>
              How it works
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} sm={4}>
                <HowStep icon={Description} step={1} title="Upload Documents" subtitle="Income, Caste, Education certs" color="#6366F1" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <HowStep icon={HourglassEmpty} step={2} title="Auto-Discovery" subtitle="Every night at 2 AM" color="#F59E0B" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <HowStep icon={NotificationsIcon} step={3} title="Get Notified" subtitle="New schemes appear here" color="#10B981" />
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ mx: 4 }} />

          <Box sx={{ p: 3 }}>
            <Alert severity="info" sx={{ borderRadius: '10px', mb: 2.5, fontSize: '0.85rem' }}>
              💡 The more documents you upload (especially Income, Caste, and Education certificates), the more schemes we can discover for you!
            </Alert>
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained" startIcon={<Refresh sx={{ fontSize: 16 }} />}
                onClick={handleManualDiscovery} disabled={loading}
                sx={{
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                  '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #4338CA)', transform: 'translateY(-1px)' },
                }}
              >
                Search Now
              </Button>
              <Button
                variant="outlined" startIcon={<Description sx={{ fontSize: 16 }} />}
                onClick={() => window.location.href = '/documents'}
                sx={{ borderRadius: '8px', borderColor: '#E2E8F0', color: '#475569', '&:hover': { borderColor: '#6366F1', color: '#6366F1' } }}
              >
                Upload Documents
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Details Dialog */}
      <Dialog
        open={detailsOpen} onClose={() => setDetailsOpen(false)}
        maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: '16px', border: 'none' } }}
      >
        {sel && scheme && (
          <>
            <DialogTitle sx={{ pt: 3, px: 3, fontWeight: 700, fontSize: '1.125rem' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '10px', background: getCatConfig(scheme.category).bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CardGiftcard sx={{ fontSize: 20, color: getCatConfig(scheme.category).color }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>{scheme.name}</Typography>
                  {sel.eligibilityScore && (
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                      <TrendingUp sx={{ fontSize: 13, color: scoreColor(sel.eligibilityScore) }} />
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: scoreColor(sel.eligibilityScore) }}>
                        {sel.eligibilityScore}% Match
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </DialogTitle>

            <DialogContent dividers sx={{ px: 3 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {/* Description */}
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', mb: 1 }}>Description</Typography>
                  <Typography sx={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.7 }}>
                    {scheme.description || 'Government scheme for eligible citizens'}
                  </Typography>
                </Box>

                {/* Benefits */}
                {(sel.scheme?.benefits || sel.benefits) && (
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', mb: 1 }}>Benefits</Typography>
                    <Typography sx={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.7 }}>
                      {sel.scheme?.benefits || sel.benefits}
                    </Typography>
                  </Box>
                )}

                {/* Amount */}
                {(sel.scheme?.amount || sel.amount) && (
                  <Box sx={{ p: 2, borderRadius: '12px', background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 4, height: 32, background: '#10B981', borderRadius: 99 }} />
                    <Box>
                      <Typography sx={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Benefit Amount</Typography>
                      <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#065F46', letterSpacing: '-0.03em' }}>
                        ₹{(sel.scheme?.amount || sel.amount).toLocaleString('en-IN')}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* Contact */}
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', mb: 1 }}>Contact & Deadlines</Typography>
                  <List dense disablePadding>
                    {(sel.scheme?.helplineNumber || sel.helplineNumber) && (
                      <ListItem sx={{ px: 0, py: 0.75 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <Phone sx={{ fontSize: 16, color: '#6366F1' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={<Typography sx={{ fontSize: '0.875rem', color: '#0F172A' }}>{sel.scheme?.helplineNumber || sel.helplineNumber}</Typography>}
                          secondary={<Typography sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>Helpline</Typography>}
                        />
                      </ListItem>
                    )}
                    {(sel.scheme?.applicationEndDate || sel.applicationEndDate) && (
                      <ListItem sx={{ px: 0, py: 0.75 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CalendarToday sx={{ fontSize: 16, color: '#F59E0B' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={<Typography sx={{ fontSize: '0.875rem', color: '#0F172A' }}>
                            {new Date(sel.scheme?.applicationEndDate || sel.applicationEndDate).toLocaleDateString()}
                          </Typography>}
                          secondary={<Typography sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>Application Deadline</Typography>}
                        />
                      </ListItem>
                    )}
                  </List>
                </Box>
              </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
              <Button onClick={() => setDetailsOpen(false)}
                sx={{ borderRadius: '8px', color: '#64748B', '&:hover': { background: '#F1F5F9' } }}>
                Close
              </Button>
              {(sel.scheme?.applicationUrl || sel.applicationUrl) && (
                <Button
                  variant="contained" endIcon={<OpenInNew sx={{ fontSize: 15 }} />}
                  onClick={() => window.open(sel.scheme?.applicationUrl || sel.applicationUrl, '_blank')}
                  sx={{ borderRadius: '8px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                    '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #4338CA)' } }}
                >
                  Apply Online
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default EligibleSchemes;