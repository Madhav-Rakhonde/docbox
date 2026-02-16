import api from './api';

const categoryService = {
  // Get all categories
  getAllCategories: async () => {
    try {
      const response = await api.get('/categories');
      return response.data;
    } catch (error) {
      console.error('Failed to get categories:', error);
      throw error;
    }
  },

  // Get category by ID
  getCategoryById: async (id) => {
    try {
      const response = await api.get(`/categories/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get category:', error);
      throw error;
    }
  },

  // Create new category
  createCategory: async (categoryData) => {
    try {
      const response = await api.post('/categories', categoryData);
      return response.data;
    } catch (error) {
      console.error('Failed to create category:', error);
      throw error;
    }
  },

  // Update category
  updateCategory: async (categoryId, categoryData) => {
    try {
      const response = await api.put(`/categories/${categoryId}`, categoryData);
      return response.data;
    } catch (error) {
      console.error('Failed to update category:', error);
      throw error;
    }
  },

  // Delete category
  deleteCategory: async (categoryId) => {
    try {
      const response = await api.delete(`/categories/${categoryId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete category:', error);
      throw error;
    }
  },

  // Change document category
  changeDocumentCategory: async (documentId, categoryId) => {
    try {
      const response = await api.put(`/documents/${documentId}/category`, { categoryId });
      return response.data;
    } catch (error) {
      console.error('Failed to change document category:', error);
      throw error;
    }
  },

  // Get documents by category
  getDocumentsByCategory: async (categoryId) => {
    try {
      const response = await api.get(`/documents/category/${categoryId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get documents by category:', error);
      throw error;
    }
  }
};

export default categoryService;