import api, { endpoints } from './api';

const shareService = {
  /**
   * Create a share link for a document
   */
  createShareLink: async (documentId, options = {}) => {
    if (!documentId) throw new Error('documentId is required');

    const payload = {
      documentId,
      expiryHours: options.expiryHours || 72,
      password: options.password || null,
      maxViews: options.maxViews || null,
      allowDownload: options.allowDownload !== undefined ? options.allowDownload : true,
    };

    const response = await api.post(endpoints.share, payload);
    return response.data;
  },

  /**
   * Get a shared document by token
   */
  getSharedDocument: async (token, password = null) => {
    const response = await api.get(`${endpoints.share}/${token}`, {
      params: { password },
    });
    return response.data;
  },

  /**
   * Download a shared document by token
   */
  downloadSharedDocument: async (token, password = null) => {
    const response = await api.get(`${endpoints.share}/${token}/download`, {
      params: { password },
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Get all share links for current user
   */
  getMyShareLinks: async () => {
    const response = await api.get(`${endpoints.share}/my-links`);
    return response.data;
  },

  /**
   * Get QR code for a share link as a displayable URL
   */
  getQRCode: async (shareLinkId) => {
    const response = await api.get(`${endpoints.share}/${shareLinkId}/qrcode`, {
      responseType: 'blob', // Important: QR code is an image file
    });
    // Create a local URL for the image blob so the browser can display it
    return URL.createObjectURL(response.data);
  }
};

export default shareService;