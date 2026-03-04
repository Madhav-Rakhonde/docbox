import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge,
  Paper,
} from '@mui/material';
import {
  CardGiftcard,
  Business,
  OpenInNew,
  Phone,
  CalendarToday,
  TrendingUp,
  CheckCircle,
  Notifications as NotificationsIcon,
  HourglassEmpty,
  Description,
  Refresh,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';

const EligibleSchemes = () => {
  const [eligibleSchemes, setEligibleSchemes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    loadEligibleSchemes();
    loadNotificationCount();
  }, []);

  const loadEligibleSchemes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/schemes/eligible');
      if (response.data.success) {
        setEligibleSchemes(response.data.data.schemes || []);
      }
    } catch (error) {
      console.error('Failed to load schemes:', error);
      toast.error('Failed to load eligible schemes');
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationCount = async () => {
    try {
      const response = await api.get('/notifications/unread/count');
      if (response.data.success) {
        setNotificationCount(response.data.data.count || 0);
      }
    } catch (error) {
      console.error('Failed to load notification count:', error);
    }
  };

  const handleViewScheme = async (scheme) => {
    setSelectedScheme(scheme);
    setDetailsOpen(true);

    // Mark as viewed
    try {
      await api.post(`/schemes/${scheme.scheme?.id || scheme.id}/view`);
      // Reload schemes to update viewed status
      loadEligibleSchemes();
    } catch (error) {
      console.error('Failed to mark as viewed:', error);
    }
  };

  const handleManualDiscovery = async () => {
    try {
      setLoading(true);
      toast.info('Searching for eligible schemes...');
      
      const response = await api.post('/schemes/discover-free');
      
      if (response.data.success) {
        const discovered = response.data.data.totalDiscovered || 0;
        if (discovered > 0) {
          toast.success(`Found ${discovered} new scheme${discovered !== 1 ? 's' : ''}!`);
          loadEligibleSchemes();
        } else {
          toast.info('No new schemes found. We\'ll keep checking for you!');
        }
      }
    } catch (error) {
      console.error('Failed to discover schemes:', error);
      toast.error('Failed to search for schemes');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      SCHOLARSHIP: 'primary',
      SUBSIDY: 'success',
      PENSION: 'warning',
      EMPLOYMENT: 'info',
      HOUSING: 'secondary',
      HEALTH: 'error',
      LOAN: 'default',
    };
    return colors[category] || 'default';
  };

  const renderSchemeCard = (schemeData) => {
    const scheme = schemeData.scheme || schemeData;
    const score = schemeData.eligibilityScore;
    const missingDocs = schemeData.missingDocuments || [];
    const viewed = schemeData.viewed;

    return (
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 6,
          },
        }}
      >
        {!viewed && (
          <Chip
            label="NEW"
            color="error"
            size="small"
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 1,
              fontWeight: 600,
            }}
          />
        )}

        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2, gap: 1 }}>
            <CardGiftcard color="primary" sx={{ fontSize: 32 }} />
            {score && (
              <Chip
                icon={<TrendingUp />}
                label={`${score}% Match`}
                color={score >= 80 ? 'success' : score >= 60 ? 'primary' : 'warning'}
                size="small"
              />
            )}
          </Box>

          <Typography variant="h6" gutterBottom fontWeight={600}>
            {scheme.name}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {scheme.description || 'Government scheme for eligible citizens'}
          </Typography>

          {scheme.amount && (
            <Chip
              label={`₹${scheme.amount.toLocaleString('en-IN')}`}
              color="success"
              variant="outlined"
              sx={{ mb: 1 }}
            />
          )}

          {scheme.issuingAuthority && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
              <Business fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {scheme.issuingAuthority}
              </Typography>
            </Box>
          )}

          {missingDocs.length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="caption">
                Missing: {missingDocs.join(', ')}
              </Typography>
            </Alert>
          )}
        </CardContent>

        <CardActions>
          <Button
            onClick={() => handleViewScheme(schemeData)}
            fullWidth
            variant="contained"
          >
            View Details
          </Button>
        </CardActions>
      </Card>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h4" fontWeight={600}>
            <CardGiftcard sx={{ fontSize: 40, mr: 2, verticalAlign: 'middle' }} />
            🎯 Eligible Schemes
          </Typography>
          
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleManualDiscovery}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Government schemes discovered for you based on your documents
        </Typography>
      </Box>

      {/* Info Banner */}
      <Alert severity="info" sx={{ mb: 4 }} icon={<NotificationsIcon />}>
        <Typography variant="body2">
          💡 <strong>Auto-Discovery Active:</strong> We search for new schemes every night at 2 AM based on your documents.
        </Typography>
      </Alert>

      {/* Schemes Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={60} />
        </Box>
      ) : eligibleSchemes.length > 0 ? (
        <>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Found {eligibleSchemes.length} eligible scheme{eligibleSchemes.length !== 1 ? 's' : ''} for you
          </Typography>
          <Grid container spacing={3}>
            {eligibleSchemes.map((scheme) => (
              <Grid item xs={12} sm={6} md={4} key={scheme.id}>
                {renderSchemeCard(scheme)}
              </Grid>
            ))}
          </Grid>
        </>
      ) : (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <HourglassEmpty sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Schemes Found Yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
            We're discovering schemes based on your documents. This happens automatically every night at 2 AM. 
            <br />
            <br />
            <strong>How it works:</strong>
          </Typography>
          
          <Grid container spacing={2} sx={{ maxWidth: 700, mx: 'auto', mt: 2, mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Description sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                <Typography variant="body2" fontWeight={600}>
                  1. Upload Documents
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Income, Caste, Education certificates
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <HourglassEmpty sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />
                <Typography variant="body2" fontWeight={600}>
                  2. Auto-Discovery
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Every night at 2 AM
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <NotificationsIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                <Typography variant="body2" fontWeight={600}>
                  3. Get Notified
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  New schemes appear here
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Alert severity="info" sx={{ maxWidth: 600, mx: 'auto', mb: 3 }}>
            <Typography variant="body2">
              💡 <strong>Tip:</strong> The more documents you upload (especially Income, Caste, and Education certificates), the more schemes we can discover for you!
            </Typography>
          </Alert>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={handleManualDiscovery}
              disabled={loading}
            >
              Search Now
            </Button>
            <Button
              variant="outlined"
              startIcon={<Description />}
              onClick={() => window.location.href = '/documents'}
            >
              Go to Documents
            </Button>
          </Box>
        </Paper>
      )}

      {/* Scheme Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedScheme && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {selectedScheme.scheme?.name || selectedScheme.name}
                {selectedScheme.eligibilityScore && (
                  <Chip
                    icon={<TrendingUp />}
                    label={`${selectedScheme.eligibilityScore}% Match`}
                    color="success"
                    size="small"
                    sx={{ ml: 1 }}
                  />
                )}
              </Box>
            </DialogTitle>

            <DialogContent dividers>
              {/* Description */}
              <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                Description
              </Typography>
              <Typography variant="body2" paragraph>
                {selectedScheme.scheme?.description || selectedScheme.description || 'Government scheme for eligible citizens'}
              </Typography>

              {/* Benefits */}
              {(selectedScheme.scheme?.benefits || selectedScheme.benefits) && (
                <>
                  <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                    Benefits
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {selectedScheme.scheme?.benefits || selectedScheme.benefits}
                  </Typography>
                </>
              )}

              {/* Amount */}
              {(selectedScheme.scheme?.amount || selectedScheme.amount) && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" color="success.main">
                    Amount: ₹{(selectedScheme.scheme?.amount || selectedScheme.amount).toLocaleString('en-IN')}
                  </Typography>
                </>
              )}

              {/* Contact Information */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                Contact Information
              </Typography>
              <List dense>
                {(selectedScheme.scheme?.helplineNumber || selectedScheme.helplineNumber) && (
                  <ListItem>
                    <ListItemIcon>
                      <Phone />
                    </ListItemIcon>
                    <ListItemText
                      primary="Helpline"
                      secondary={selectedScheme.scheme?.helplineNumber || selectedScheme.helplineNumber}
                    />
                  </ListItem>
                )}
                {(selectedScheme.scheme?.applicationEndDate || selectedScheme.applicationEndDate) && (
                  <ListItem>
                    <ListItemIcon>
                      <CalendarToday />
                    </ListItemIcon>
                    <ListItemText
                      primary="Application Deadline"
                      secondary={new Date(selectedScheme.scheme?.applicationEndDate || selectedScheme.applicationEndDate).toLocaleDateString()}
                    />
                  </ListItem>
                )}
              </List>
            </DialogContent>

            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
              {(selectedScheme.scheme?.applicationUrl || selectedScheme.applicationUrl) && (
                <Button
                  variant="contained"
                  endIcon={<OpenInNew />}
                  onClick={() => window.open(selectedScheme.scheme?.applicationUrl || selectedScheme.applicationUrl, '_blank')}
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