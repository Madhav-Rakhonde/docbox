import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Paper,
  Divider,
  Badge,
} from '@mui/material';
import {
  People,
  Description,
  Visibility,
  Download,
  FolderOpen,
  CalendarToday,
  Person,
  FilePresent,
  Warning,
  Close,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';

const FamilyDocumentsViewer = () => {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    loadFamilyMembers();
  }, []);

  useEffect(() => {
    if (selectedMember) {
      loadMemberDocuments(selectedMember.id);
    }
  }, [selectedMember]);

  const loadFamilyMembers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/family/members');
      
      if (response.data.success) {
        setFamilyMembers(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load family members:', error);
      toast.error('Failed to load family members');
    } finally {
      setLoading(false);
    }
  };

  const loadMemberDocuments = async (memberId) => {
    try {
      setDocumentsLoading(true);
      const response = await api.get(`/family/members/${memberId}/documents`);
      
      if (response.data.success) {
        setDocuments(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
      toast.error('Failed to load member documents');
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleMemberSelect = (member) => {
    setSelectedMember(member);
    setDocuments([]);
    setTabValue(0);
  };

  const handleDocumentView = async (document) => {
    setSelectedDocument(document);
    setPreviewOpen(true);
  };

  const handleDocumentDownload = async (documentId, filename) => {
    try {
      const response = await api.get(`/documents/${documentId}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Document downloaded successfully');
    } catch (error) {
      console.error('Failed to download document:', error);
      toast.error('Failed to download document');
    }
  };

  const getDocumentIcon = () => {
    return <Description color="primary" />;
  };

  const isDocumentExpiring = (expiryDate) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isDocumentExpired = (expiryDate) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    return expiry < today;
  };

  const filteredDocuments = documents.filter((doc) => {
    if (tabValue === 0) return true;
    if (tabValue === 1) return isDocumentExpiring(doc.expiryDate);
    if (tabValue === 2) return isDocumentExpired(doc.expiryDate);
    return true;
  });

  const getDocumentStats = () => {
    return {
      total: documents.length,
      expiring: documents.filter(doc => isDocumentExpiring(doc.expiryDate)).length,
      expired: documents.filter(doc => isDocumentExpired(doc.expiryDate)).length,
    };
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight={600}>
          <People sx={{ fontSize: 40, mr: 2, verticalAlign: 'middle' }} />
          Family Documents
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage documents for your family members
        </Typography>
      </Box>

      {!selectedMember && (
        <>
          {familyMembers.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <People sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No Family Members
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                You haven't added any family members yet
              </Typography>
              <Button variant="contained" href="/family">
                Add Family Member
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {familyMembers.map((member) => (
                <Grid item xs={12} sm={6} md={4} key={member.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 6,
                      },
                    }}
                    onClick={() => handleMemberSelect(member)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar
                          src={member.profilePictureUrl}
                          sx={{
                            width: 60,
                            height: 60,
                            bgcolor: 'primary.main',
                            mr: 2,
                          }}
                        >
                          <Person fontSize="large" />
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="h6" fontWeight={600}>
                            {member.name}
                          </Typography>
                          <Chip
                            label={member.relationship || 'Family Member'}
                            size="small"
                            color="primary"
                            sx={{ mt: 0.5 }}
                          />
                        </Box>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {member.email && (
                          <Typography variant="caption" color="text.secondary">
                            📧 {member.email}
                          </Typography>
                        )}
                        {member.hasLoginAccess ? (
                          <Chip
                            label={`${member.documentCount || 0} Documents`}
                            size="small"
                            color="success"
                            icon={<FilePresent />}
                          />
                        ) : (
                          <Chip
                            label="Profile Only"
                            size="small"
                            color="default"
                          />
                        )}
                      </Box>

                      <Button
                        variant="outlined"
                        fullWidth
                        sx={{ mt: 2 }}
                        endIcon={<FolderOpen />}
                        disabled={!member.hasLoginAccess}
                      >
                        View Documents
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {selectedMember && (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar
                  src={selectedMember.profilePictureUrl}
                  sx={{
                    width: 70,
                    height: 70,
                    bgcolor: 'primary.main',
                    mr: 2,
                  }}
                >
                  <Person fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight={600}>
                    {selectedMember.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Chip 
                      label={selectedMember.relationship || 'Family Member'} 
                      size="small" 
                      color="primary" 
                    />
                    <Chip
                      label={`${getDocumentStats().total} Documents`}
                      size="small"
                      icon={<FilePresent />}
                    />
                  </Box>
                </Box>
              </Box>

              <Button
                variant="outlined"
                startIcon={<Close />}
                onClick={() => setSelectedMember(null)}
              >
                Back
              </Button>
            </Box>
          </Paper>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FilePresent color="primary" />
                    <Box>
                      <Typography variant="h4" fontWeight={600}>
                        {getDocumentStats().total}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Documents
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Warning color="warning" />
                    <Box>
                      <Typography variant="h4" fontWeight={600} color="warning.main">
                        {getDocumentStats().expiring}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Expiring Soon
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Close color="error" />
                    <Box>
                      <Typography variant="h4" fontWeight={600} color="error.main">
                        {getDocumentStats().expired}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Expired
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Paper sx={{ mb: 3 }}>
            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
              <Tab label={`All (${getDocumentStats().total})`} />
              <Tab
                label={
                  <Badge badgeContent={getDocumentStats().expiring} color="warning">
                    Expiring Soon
                  </Badge>
                }
              />
              <Tab
                label={
                  <Badge badgeContent={getDocumentStats().expired} color="error">
                    Expired
                  </Badge>
                }
              />
            </Tabs>
          </Paper>

          {documentsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : filteredDocuments.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <Description sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No Documents Found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {tabValue === 0
                  ? 'This family member has no documents yet'
                  : tabValue === 1
                  ? 'No documents expiring soon'
                  : 'No expired documents'}
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {filteredDocuments.map((document) => (
                <Grid item xs={12} sm={6} md={4} key={document.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      border: isDocumentExpired(document.expiryDate)
                        ? '2px solid'
                        : isDocumentExpiring(document.expiryDate)
                        ? '2px solid'
                        : 'none',
                      borderColor: isDocumentExpired(document.expiryDate)
                        ? 'error.main'
                        : 'warning.main',
                    }}
                  >
                    {(isDocumentExpiring(document.expiryDate) ||
                      isDocumentExpired(document.expiryDate)) && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          zIndex: 1,
                        }}
                      >
                        <Chip
                          label={
                            isDocumentExpired(document.expiryDate)
                              ? 'EXPIRED'
                              : 'EXPIRING SOON'
                          }
                          color={isDocumentExpired(document.expiryDate) ? 'error' : 'warning'}
                          size="small"
                        />
                      </Box>
                    )}

                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        {getDocumentIcon()}
                        <Typography variant="caption" sx={{ ml: 1 }}>
                          {document.category?.name || 'Uncategorized'}
                        </Typography>
                      </Box>

                      <Typography variant="h6" gutterBottom>
                        {document.originalFilename}
                      </Typography>

                      {document.expiryDate && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                          <CalendarToday fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            Expires: {new Date(document.expiryDate).toLocaleDateString()}
                          </Typography>
                        </Box>
                      )}

                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}
                      </Typography>
                    </CardContent>

                    <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Visibility />}
                        onClick={() => handleDocumentView(document)}
                        fullWidth
                      >
                        View
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<Download />}
                        onClick={() =>
                          handleDocumentDownload(document.id, document.originalFilename)
                        }
                        fullWidth
                      >
                        Download
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedDocument && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{selectedDocument.originalFilename}</Typography>
                <IconButton onClick={() => setPreviewOpen(false)}>
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Category:</strong> {selectedDocument.category?.name || 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Uploaded:</strong>{' '}
                  {new Date(selectedDocument.uploadedAt).toLocaleString()}
                </Typography>
                {selectedDocument.expiryDate && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Expires:</strong>{' '}
                    {new Date(selectedDocument.expiryDate).toLocaleDateString()}
                  </Typography>
                )}
              </Box>
              <Alert severity="info">
                Document preview not available. Please download to view.
              </Alert>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPreviewOpen(false)}>Close</Button>
              <Button
                variant="contained"
                startIcon={<Download />}
                onClick={() =>
                  handleDocumentDownload(
                    selectedDocument.id,
                    selectedDocument.originalFilename
                  )
                }
              >
                Download
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default FamilyDocumentsViewer;