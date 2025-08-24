import axios from 'axios';

// Base API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds for OCR processing
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    console.log('🔑 API Request:', config.method?.toUpperCase(), config.url);
    console.log('🎫 Auth token exists:', !!token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Token added to request');
    } else {
      console.warn('⚠️ No auth token found in localStorage');
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.config.method?.toUpperCase(), response.config.url, 'Status:', response.status);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error.config?.method?.toUpperCase(), error.config?.url);
    console.error('Error status:', error.response?.status);
    console.error('Error message:', error.response?.data?.message || error.message);
    console.error('Full error:', error);

    // Don't redirect to login during OCR/receipt upload operations or transaction creation
    const isOCROperation = error.config?.url?.includes('/ocr') ||
      error.config?.url?.includes('/receipt') ||
      error.config?.url?.includes('/transactions');

    console.log('🔍 Checking if OCR operation:', {
      url: error.config?.url,
      isOCROperation,
      status: error.response?.status
    });

    if (error.response?.status === 401 && !isOCROperation) {
      console.warn('🙫 Token expired or invalid, redirecting to login');
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      window.location.href = '/login';
    } else if (error.response?.status === 401 && isOCROperation) {
      console.warn('⚠️ Authentication error during OCR/receipt/transaction operation - not redirecting');
      console.log('📝 Will not redirect to login for this operation');
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  }
};

// Transactions API calls
export const transactionsAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/transactions?${params}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/transactions/${id}`);
    return response.data;
  },

  create: async (transactionData) => {
    const response = await api.post('/transactions', transactionData);
    return response.data;
  },

  update: async (id, transactionData) => {
    const response = await api.put(`/transactions/${id}`, transactionData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/transactions/${id}`);
    return response.data;
  },

  uploadReceipt: async (transactionId, file) => {
    const formData = new FormData();
    formData.append('receipt', file);

    const response = await api.post(`/transactions/${transactionId}/receipt`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  processOCR: async (transactionId) => {
    const response = await api.post(`/transactions/${transactionId}/ocr`);
    return response.data;
  },

  getStatistics: async () => {
    return api.get('/transactions/statistics').then(response => response.data);
  },
  getMyTransactions: async () => {
    return api.get('/transactions/my').then(response => response.data);
  }
};

// Categories API calls
export const categoriesAPI = {
  getAll: async () => {
    const response = await api.get('/categories');
    return response.data;
  },

  create: async (categoryData) => {
    const response = await api.post('/categories', categoryData);
    return response.data;
  },

  update: async (id, categoryData) => {
    const response = await api.put(`/categories/${id}`, categoryData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  },

  getBudgetAlerts: async () => {
    const response = await api.get('/categories/budget-alerts');
    return response.data;
  }
};

// Reports API calls
export const reportsAPI = {
  getMonthlyReport: async (year, month) => {
    const response = await api.get(`/reports/monthly/${year}/${month}`);
    return response.data;
  },

  getOptimizationReport: async () => {
    const response = await api.get('/reports/optimization');
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await api.get('/reports/dashboard');
    return response.data;
  },

  exportToExcel: async (reportType, params = {}) => {
    const queryParams = new URLSearchParams(params);
    const response = await api.get(`/reports/export/${reportType}?${queryParams}`, {
      responseType: 'blob',
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true, message: 'הדוח הורד בהצלחה' };
  }
};

// Users API calls
export const usersAPI = {
  getAll: async () => {
    const response = await api.get('/users');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  create: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  update: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  getStats: async (id) => {
    const response = await api.get(`/users/${id}/stats`);
    return response.data;
  }
};

// Special Requests API calls
export const specialRequestsAPI = {
  create: async (requestData) => {
    const response = await api.post('/special-requests', requestData);
    return response.data;
  },

  getMyRequests: async () => {
    const response = await api.get('/special-requests/my-requests');
    return response.data;
  },

  getPendingAmount: async () => {
    const response = await api.get('/special-requests/pending-amount/');
    return response.data;
  },

  // Admin functions
  getAllPending: async () => {
    const response = await api.get('/special-requests/admin/pending');
    return response.data;
  },

  getAllRequests: async () => {
    const response = await api.get('/special-requests/admin/all');
    return response.data;
  },

  updateStatus: async (id, status, adminNotes) => {
    const response = await api.patch(`/special-requests/admin/${id}/status`, {
      status,
      adminNotes
    });
    return response.data;
  }
};

// Combined API for easy import
export const API = {
  auth: authAPI,
  transactions: transactionsAPI,
  categories: categoriesAPI,
  reports: reportsAPI,
  users: usersAPI,
  specialRequests: specialRequestsAPI
};

export default api;
