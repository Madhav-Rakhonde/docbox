import api from './api';

const documentService = {
  /**
   * Upload document with AI auto-detection
   */
  uploadDocument: async (file, categoryId = null, metadata = {}) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (categoryId) {
        formData.append('categoryId', categoryId);
      }
      if (metadata.documentNumber) {
        formData.append('documentNumber', metadata.documentNumber);
      }
      if (metadata.issueDate) {
        formData.append('issueDate', metadata.issueDate);
      }
      if (metadata.expiryDate) {
        formData.append('expiryDate', metadata.expiryDate);
      }
      if (metadata.notes) {
        formData.append('notes', metadata.notes);
      }

      const response = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message,
      };
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Upload failed',
        error: error,
      };
    }
  },

  /**
   * Get all documents with pagination
   */
  getDocuments: async (page = 0, size = 12) => {
    try {
      const response = await api.get(`/documents?page=${page}&size=${size}`);
      return {
        success: true,
        data: response.data.data || response.data,
      };
    } catch (error) {
      console.error('Get documents error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch documents',
      };
    }
  },

  /**
   * Get document by ID
   */
  getDocumentById: async (id) => {
    try {
      const response = await api.get(`/documents/${id}`);
      return {
        success: true,
        data: response.data.data || response.data,
      };
    } catch (error) {
      console.error('Get document error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch document',
      };
    }
  },

  /**
   * Download document
   */
  downloadDocument: async (id, filename) => {
    try {
      const response = await api.get(`/documents/${id}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || 'document');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return {
        success: true,
        message: 'Download started',
      };
    } catch (error) {
      console.error('Download error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Download failed',
      };
    }
  },

  /**
   * Delete document
   */
  deleteDocument: async (id) => {
    try {
      const response = await api.delete(`/documents/${id}`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Document deleted',
      };
    } catch (error) {
      console.error('Delete error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Delete failed',
      };
    }
  },

  /**
   * ✅ NEW: Search documents
   */
  searchDocuments: async (query, page = 0, size = 100) => {
    try {
      const response = await api.get(`/documents/search`, {
        params: { query, page, size }
      });
      return {
        success: true,
        data: response.data.data || response.data,
      };
    } catch (error) {
      console.error('Search error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Search failed',
      };
    }
  },

  /**
   * Get documents by category
   */
  getDocumentsByCategory: async (categoryId, page = 0, size = 12) => {
    try {
      const response = await api.get(`/documents/category/${categoryId}?page=${page}&size=${size}`);
      return {
        success: true,
        data: response.data.data || response.data,
      };
    } catch (error) {
      console.error('Get by category error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch documents',
      };
    }
  },

  /**
   * Update document metadata
   */
  updateDocument: async (id, updates) => {
    try {
      const response = await api.put(`/documents/${id}`, updates);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || 'Document updated',
      };
    } catch (error) {
      console.error('Update error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Update failed',
      };
    }
  },

  /**
   * Get expiring documents
   */
  getExpiringDocuments: async (days = 30) => {
    try {
      const response = await api.get(`/documents/expiring?days=${days}`);
      return {
        success: true,
        data: response.data.data || response.data,
      };
    } catch (error) {
      console.error('Get expiring documents error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch expiring documents',
      };
    }
  },
};

export default documentService;