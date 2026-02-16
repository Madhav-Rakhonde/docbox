import api from './api';

const shareLinkService = {
  // Create share link
  createShareLink: async (data) => {
    const response = await api.post('/share/create', data);
    return response.data;
  },

  // Get my share links
  getMyShares: async () => {
    const response = await api.get('/share/my-shares');
    return response.data;
  },

  // Get QR code
  getQRCode: async (shareLinkId) => {
    const response = await api.get(`/share/${shareLinkId}/qrcode`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Delete share link
  deleteShareLink: async (shareLinkId) => {
    const response = await api.delete(`/share/${shareLinkId}`);
    return response.data;
  },

  // Access shared document (public)
  accessSharedDocument: async (token, password = null) => {
    const response = await api.post(`/share/access/${token}`, {
      password,
    });
    return response.data;
  },

  // Download shared document (public)
  downloadSharedDocument: async (token, password = null) => {
    const response = await api.get(`/share/download/${token}`, {
      params: { password },
      responseType: 'blob',
    });
    return response.data;
  },
};

export default shareLinkService;