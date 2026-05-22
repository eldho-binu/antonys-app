import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Calendar, 
  Activity, 
  User, 
  LogOut, 
  Menu,
  X,
  Home,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Download // Add Download icon
} from 'lucide-react';
import clinicLogo from './assets/logo.png';

// API Configuration
const API_BASE = `${import.meta.env.VITE_API_URL}/api`;

// Token management functions
const getStoredToken = () => localStorage.getItem('auth_token');
const setStoredToken = (token) => localStorage.setItem('auth_token', token);
const removeStoredToken = () => localStorage.removeItem('auth_token');

const api = {
  // Helper function to make authenticated requests with auto-refresh
  makeAuthenticatedRequest: async (url, options = {}) => {
    const token = getStoredToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(url, {
      credentials: 'include',
      ...options,
      headers
    });

    // If unauthorized, try to refresh token
    if (response.status === 401 && token) {
      console.log('Token expired, attempting refresh...');
      
      try {
        const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          if (refreshData.success && refreshData.token) {
            setStoredToken(refreshData.token);
            console.log('Token refreshed successfully');
            
            // Retry original request with new token
            headers['Authorization'] = `Bearer ${refreshData.token}`;
            response = await fetch(url, {
              credentials: 'include',
              ...options,
              headers
            });
          }
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }
    }

    // If still unauthorized after refresh attempt, clear token
    if (response.status === 401) {
      removeStoredToken();
      throw new Error('Authentication expired. Please login again.');
    }

    return response;
  },

  // Add token refresh method
  refreshToken: async () => {
    try {
      const token = getStoredToken();
      if (!token) return false;

      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.token) {
          setStoredToken(data.token);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  },

  // Improved auth check with retry logic
  checkAuth: async () => {
    try {
      const response = await api.makeAuthenticatedRequest(`${API_BASE}/auth/check`);
      
      if (!response.ok) {
        if (response.status === 401) {
          removeStoredToken();
          return { success: false, authenticated: false };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Auth check error:', error);
      
      // If it's an auth error, clear token
      if (error.message?.includes('Authentication expired')) {
        removeStoredToken();
      }
      
      return { success: false, authenticated: false };
    }
  },

  login: async (credentials) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const result = await response.json();
      
      // Store JWT token if provided
      if (result.token) {
        setStoredToken(result.token);
      }
      
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.makeAuthenticatedRequest(`${API_BASE}/auth/logout`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      removeStoredToken();
    }
  },

  // Patient APIs
  getPatients: async (page = 1, limit = 50, search = '') => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search })
      });
      
      const response = await api.makeAuthenticatedRequest(`${API_BASE}/patients?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return result;
      } else {
        throw new Error(result.error || 'Failed to fetch patients');
      }
    } catch (error) {
      console.error('Load patients error:', error);
      throw error;
    }
  },

  getDashboardStats: async () => {
    try {
      const response = await api.makeAuthenticatedRequest(`${API_BASE}/dashboard/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return result;
      } else {
        throw new Error(result.error || 'Failed to fetch dashboard stats');
      }
    } catch (error) {
      console.error('Load stats error:', error);
      throw error;
    }
  },

  // Other APIs follow the same pattern...
  createPatient: async (patientData) => {
    try {
      const response = await api.makeAuthenticatedRequest(`${API_BASE}/patients`, {
        method: 'POST',
        body: JSON.stringify(patientData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create patient');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  updatePatient: async (regno, patientData) => {
    try {
      // Double URL encode to handle special characters properly
      const encodedRegno = encodeURIComponent(encodeURIComponent(regno));
      const response = await api.makeAuthenticatedRequest(`${API_BASE}/patients/${encodedRegno}`, {
        method: 'PUT',
        body: JSON.stringify(patientData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update patient');
      }

      return await response.json();
    } catch (error) {
      console.error('Update patient error:', error);
      throw error;
    }
  },

  deletePatient: async (regno) => {
    try {
      // Double URL encode to handle special characters properly
      const encodedRegno = encodeURIComponent(encodeURIComponent(regno));
      const response = await api.makeAuthenticatedRequest(`${API_BASE}/patients/${encodedRegno}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete patient');
      }

      return await response.json();
    } catch (error) {
      console.error('Delete patient error:', error);
      throw error;
    }
  },

  changePassword: async (passwordData) => {
    try {
      const response = await api.makeAuthenticatedRequest(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        body: JSON.stringify(passwordData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change password');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Add CSV export method
  exportPatients: async () => {
    try {
      // Get all patients with a high limit for CSV export
      const response = await api.makeAuthenticatedRequest(`${API_BASE}/patients?limit=10000`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return result.data || [];
      } else {
        throw new Error(result.error || 'Failed to export patients');
      }
    } catch (error) {
      console.error('Export patients error:', error);
      throw error;
    }
  }
};

// Login Component
function LoginForm({ onLogin, loading, error }) {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 p-3">
            <img 
              src={clinicLogo}
              alt="Kuzhivelil Ayurvedic Logo" 
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <Activity className="w-12 h-12 text-white hidden" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ST ANTONY'S AYURVEDICS</h1>
          <p className="text-gray-600 mt-2">Admin Panel Login</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                placeholder="Enter your username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Signing in...
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// Change Password Modal
function ChangePasswordModal({ isOpen, onClose, onSubmit, loading }) {
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false
  });

  useEffect(() => {
    if (!isOpen) {
      setFormData({ current_password: '', new_password: '' });
      setShowPasswords({ current: false, new: false });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Change Password</h3>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
            <div className="relative">
              <input
                type={showPasswords.current ? "text" : "password"}
                value={formData.current_password}
                onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              >
                {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
            <div className="relative">
              <input
                type={showPasswords.new ? "text" : "password"}
                value={formData.new_password}
                onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                minLength="6"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              >
                {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters</p>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function App() {
  // State management
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // UI state
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Data state
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientToDelete, setPatientToDelete] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    regno: '',
    name: '',
    address: '',
    phone: '',
    age: ''
  });

  // Auth check on app load
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = getStoredToken();
        if (!token) {
          setLoading(false);
          return;
        }

        const result = await api.checkAuth();

        if (result.success && result.authenticated) {
          setIsAuthenticated(true);
          setCurrentUser(result.admin);
        } else {
          // Try one more time with token refresh
          const refreshed = await api.refreshToken();
          if (refreshed) {
            const retryResult = await api.checkAuth();
            if (retryResult.success && retryResult.authenticated) {
              setIsAuthenticated(true);
              setCurrentUser(retryResult.admin);
            } else {
              setIsAuthenticated(false);
              setCurrentUser(null);
            }
          } else {
            setIsAuthenticated(false);
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.error('Auth check error:', err);
        setIsAuthenticated(false);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Load data when authenticated  
  useEffect(() => {
    if (isAuthenticated) {
      loadPatients();
      loadDashboardStats();
    }
  }, [isAuthenticated]);

  // Add this useEffect for periodic token refresh
  useEffect(() => {
    let refreshInterval;
    
    if (isAuthenticated) {
      // Refresh token every 6 hours (before 7-day expiration)
      refreshInterval = setInterval(async () => {
        const refreshed = await api.refreshToken();
        if (!refreshed) {
          console.log('Token refresh failed, logging out...');
          handleLogout();
        }
      }, 6 * 60 * 60 * 1000); // 6 hours in milliseconds
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [isAuthenticated]);

  // ADD THE HANDLEEXPORTCSV FUNCTION HERE
  const handleExportCSV = async () => {
    try {
      setLoading(true);
      setError(null);

      const patientsData = await api.exportPatients();

      if (patientsData.length === 0) {
        setError('No patients to export');
        return;
      }

      // Create CSV content
      const headers = ['Registration No', 'Name', 'Address', 'Phone', 'Age', 'Date'];
      const csvContent = [
        headers.join(','),
        ...patientsData.map(patient => {
          const formatCSVField = (field) => {
            if (!field) return '""';
            const stringField = String(field);
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
              return `"${stringField.replace(/"/g, '""')}"`;
            }
            return stringField;
          };

          return [
            formatCSVField(patient.regno),
            formatCSVField(patient.name),
            formatCSVField(patient.address || ''),
            formatCSVField(patient.phone || ''),
            formatCSVField(patient.age),
            formatCSVField(formatDate(patient.created_at || patient.date))
          ].join(',');
        })
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `kuzhivelil_patients_${currentDate}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showSuccess(`Patient data exported successfully! (${patientsData.length} records)`);

    } catch (err) {
      console.error('Export error:', err);
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPatients = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const result = await api.getPatients(page, 50, search);
      
      if (result && result.data) {
        setPatients(result.data);
        setCurrentPage(result.pagination?.page || 1);
        setTotalPages(result.pagination?.total_pages || 1);
        setTotalCount(result.pagination?.total_count || 0);
        setSearchQuery(search);
      } else {
        setPatients([]);
        setCurrentPage(1);
        setTotalPages(1);
        setTotalCount(0);
      }
      
    } catch (err) {
      console.error('Load patients error:', err);
      setPatients([]);
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const response = await api.getDashboardStats();
      setStats(response || {});
    } catch (err) {
      console.error('Load stats error:', err);
      handleApiError(err);
    }
  };

  // Search handler
  const handleGlobalSearch = async (query) => {
    const trimmedQuery = query.trim();
    
    if (!trimmedQuery) {
      setSearchMode(false);
      setSearchQuery('');
      loadPatients(1, '');
      return;
    }

    setSearchMode(true);
    setSearchQuery(trimmedQuery);

    try {
      const result = await api.getPatients(1, 100, trimmedQuery);
      setPatients(result.data || []);
      setCurrentPage(1);
      setTotalPages(result.pagination?.total_pages || 1);
      setTotalCount(result.pagination?.total_count || 0);
    } catch (error) {
      console.error('Search error:', error);
      setPatients([]);
      setError('Search failed. Please try again.');
    }
  };

  // Handle search input with debouncing
  const handleSearchInput = (e) => {
    const query = e.target.value;
    setSearchTerm(query);
    
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      handleGlobalSearch(query);
    }, 500);
  };

  // Pagination handler
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      
      if (searchMode && searchQuery) {
        loadSearchPage(newPage);
      } else {
        loadPatients(newPage, '');
      }
    }
  };

  const loadSearchPage = async (page) => {
    try {
      const result = await api.getPatients(page, 50, searchQuery);
      setPatients(result.data || []);
      setCurrentPage(result.pagination?.page || page);
      setTotalPages(result.pagination?.total_pages || 1);
      setTotalCount(result.pagination?.total_count || 0);
    } catch (error) {
      console.error('Load search page error:', error);
      setError('Failed to load search results');
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchMode(false);
    setSearchQuery('');
    loadPatients(1, '');
  };

  // Form handlers
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreatePatient = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await api.createPatient(formData);

      if (result.success) {
        showSuccess('Patient registered successfully!');
        setFormData({ regno: '', name: '', address: '', phone: '', age: '' });
        await loadPatients();
        await loadDashboardStats();
      } else {
        setError(result.error || 'Failed to create patient');
      }
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (patient) => {
    setSelectedPatient(patient);
    setFormData({
      regno: patient.regno,
      name: patient.name,
      address: patient.address || '',
      phone: patient.phone || '',
      age: patient.age
    });
    setCurrentView('edit');
  };

  const handleUpdatePatient = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await api.updatePatient(selectedPatient.regno, formData);

      if (result.success) {
        showSuccess('Patient updated successfully!');
        await loadPatients();
        setSelectedPatient(null);
        setCurrentView('current');
      } else {
        setError(result.error || 'Failed to update patient');
      }
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePatient = async () => {
    if (!patientToDelete) return;

    try {
      setLoading(true);
      setError(null);

      const result = await api.deletePatient(patientToDelete.regno);

      if (result.success) {
        showSuccess('Patient deleted successfully!');
        await loadPatients();
        await loadDashboardStats();
      } else {
        setError(result.error || 'Failed to delete patient');
      }
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setPatientToDelete(null);
    }
  };

  const handleChangePassword = async (passwordData) => {
    try {
      setLoading(true);
      setError(null);

      const result = await api.changePassword(passwordData);

      if (result.success) {
        showSuccess('Password changed successfully!');
        setShowChangePassword(false);
      } else {
        setError(result.error || 'Failed to change password');
      }
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setIsAuthenticated(false);
      setCurrentUser(null);
      setCurrentView('dashboard');
      setPatients([]);
      setStats({});
    } catch (err) {
      console.error('Logout error:', err);
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  };

  const handleLogin = async (credentials) => {
    try {
      setLoading(true);
      setError(null);

      const result = await api.login(credentials);

      if (result.success) {
        setIsAuthenticated(true);
        setCurrentUser(result.admin);
        setCurrentView('dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApiError = (error) => {
    if (error.message?.includes('Authentication expired')) {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setError('Your session has expired. Please login again.');
    } else {
      setError(error.message || 'An error occurred');
    }
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Get latest registration number
  const getLatestRegno = () => {
    if (patients.length === 0) return 'No registrations yet';
    const sortedByDate = [...patients].sort((a, b) => {
      const dateA = new Date(a.date || a.created_at);
      const dateB = new Date(b.date || b.created_at);
      return dateB - dateA;
    });
    return sortedByDate[0]?.regno || 'No registrations yet';
  };

  const getLatestPatient = () => {
    if (patients.length === 0) return null;
    const sortedByDate = [...patients].sort((a, b) => {
      const dateA = new Date(a.date || a.created_at);
      const dateB = new Date(b.date || b.created_at);
      return dateB - dateA;
    });
    return sortedByDate[0];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  // Show loading screen
  if (loading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login form
  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} loading={loading} error={error} />;
  }

  // Main app interface
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-center h-16 px-4 bg-green-600">
          <div className="w-12 h-12 mr-3 flex items-center justify-center">
            <img 
              src={clinicLogo} 
              alt="Kuzhivelil Ayurvedic Logo" 
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <Activity className="w-10 h-10 text-white hidden" />
          </div>
          <h1 className="text-white text-lg font-bold">ST ANTONY'S AYURVEDICS</h1>
        </div>

        <nav className="mt-8">
          <div className="px-4 space-y-2">
            <button
              onClick={() => {
                setCurrentView('dashboard');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 text-left transition-colors ${currentView === 'dashboard'
                ? 'bg-green-50 text-green-600 border-r-2 border-green-600'
                : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              <Home className="w-5 h-5 mr-3" />
              Dashboard
            </button>

            <button
              onClick={() => {
                setCurrentView('new');
                setFormData({ regno: '', name: '', address: '', phone: '', age: '' });
                setError(null);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 text-left transition-colors ${currentView === 'new'
                ? 'bg-green-50 text-green-600 border-r-2 border-green-600'
                : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              <Plus className="w-5 h-5 mr-3" />
              New Registration
            </button>

            <button
              onClick={() => {
                setCurrentView('current');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 text-left transition-colors ${currentView === 'current'
                ? 'bg-green-50 text-green-600 border-r-2 border-green-600'
                : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              <Users className="w-5 h-5 mr-3" />
              Patient Records
            </button>

            {/* Add Export CSV button */}
            <button
              onClick={handleExportCSV}
              disabled={loading}
              className="w-full flex items-center px-4 py-3 text-left text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5 mr-3" />
              {loading ? 'Exporting...' : 'Export as CSV'}
            </button>
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 bg-green-600 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{currentUser?.username}</p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => setShowChangePassword(true)}
              className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Lock className="w-4 h-4 mr-2" />
              Change Password
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b h-16 flex items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            {/* Mobile layout - show clinic name only when sidebar is closed */}
            {!sidebarOpen && (
              <div className="lg:hidden flex flex-col">
                <h1 className="text-lg font-bold text-green-600">ST ANTONY'S AYURVEDICS</h1>
                <span className="text-gray-600 text-xs font-bold">
                  Welcome, {currentUser?.username}
                </span>
              </div>
            )}
            
            {/* Tablet/Desktop - only welcome message */}
            <div className="hidden lg:block">
              <span className="text-gray-600 text-sm font-bold">
                Welcome back, {currentUser?.username}
              </span>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="px-4 pt-4">
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center mb-4">
              <span className="flex-1">{successMessage}</span>
              <button onClick={() => setSuccessMessage(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center mb-4">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 px-4 py-4">
          
          {/* Dashboard View */}
          {currentView === 'dashboard' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Patients</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_patients || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 flex items-center justify-center">
                      <Users className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Today's Registrations</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.today_registrations || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-saffron-100 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-saffron-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">This Month</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.month_registrations || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 flex items-center justify-center">
                      <Activity className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Latest Registration</p>
                      <p className="text-xl font-bold text-gray-900 mt-1">{getLatestRegno()}</p>
                      {getLatestPatient() && (
                        <p className="text-xs text-gray-500 mt-1">
                          {getLatestPatient().name} - {formatDate(getLatestPatient().date || getLatestPatient().created_at)}
                        </p>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-saffron-100 flex items-center justify-center">
                      <Plus className="w-6 h-6 text-saffron-600" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900">Recent Patients</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-green-50 sticky top-0 z-10 border-b border-green-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-green-700 uppercase tracking-wider">Reg No</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-green-700 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-green-700 uppercase tracking-wider">Phone</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-green-700 uppercase tracking-wider">Age</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-green-700 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {(stats.latest_patients && stats.latest_patients.length > 0) ? (
                        stats.latest_patients.map((patient) => (
                          <tr key={patient.regno} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900">{patient.regno}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900">{patient.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900">{patient.phone || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900">{patient.age}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900">
                              {formatDate(patient.created_at || patient.date)}
                            </td>
                          </tr>
                        ))
                      ) : patients.length > 0 ? (
                        patients.slice(0, 5).map((patient) => (
                          <tr key={patient.regno} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900">{patient.regno}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900">{patient.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">{patient.phone || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">{patient.age}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                              {formatDate(patient.created_at || patient.date)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                            No patients registered yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* New Registration Form */}
          {currentView === 'new' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white shadow-sm p-8 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">New Patient Registration</h2>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Registration Number *</label>
                      <input
                        type="text"
                        name="regno"
                        value={formData.regno}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                        placeholder="e.g., REG001"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                        placeholder="Patient name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Age *</label>
                      <input
                        type="number"
                        name="age"
                        value={formData.age}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                        placeholder="Age"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                        placeholder="10 digit phone number (optional)"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                      placeholder="Full address (optional)"
                    />
                  </div>

                  <div className="flex space-x-4 pt-4">
                    <button
                      onClick={() => setCurrentView('dashboard')}
                      className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreatePatient}
                      disabled={!formData.name || !formData.age || !formData.regno || loading}
                      className="px-6 py-3 bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Register Patient
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Patient Records View */}
          {currentView === 'current' && (
            <div className="space-y-6 h-full flex flex-col">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Patient Records</h2>
                  {searchMode && (
                    <p className="text-sm text-green-600 mt-1">
                      Search results for "{searchQuery}" ({totalCount} found)
                    </p>
                  )}
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchInput}
                    placeholder="Search: name, phone, or reg no..."
                    className="pl-10 pr-12 py-3 border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent w-full sm:w-96 bg-white"
                  />
                  {searchTerm && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Table container with sharp corners */}
              <div className="flex-1 bg-white shadow-sm border border-gray-100 flex flex-col max-h-[calc(100vh-200px)]">
                <div className="flex-1 overflow-auto min-h-[500px]">
                  <table className="w-full">
                    <thead className="bg-green-50 sticky top-0 z-10 border-b border-green-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-green-700 uppercase tracking-wider">Reg No</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-green-700 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-green-700 uppercase tracking-wider">Address</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-green-700 uppercase tracking-wider">Phone</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-green-700 uppercase tracking-wider">Age</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-green-700 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-green-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {patients.length > 0 ? (
                        patients.map((patient) => (
                          <tr key={patient.regno} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900">{patient.regno}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900">{patient.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900">{patient.address || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900">{patient.phone || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900">{patient.age}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900">{formatDate(patient.date || patient.created_at)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => handleEdit(patient)}
                                  className="inline-flex items-center px-3 py-2 text-saffron-600 hover:bg-saffron-50 transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setPatientToDelete(patient);
                                    setShowDeleteModal(true);
                                  }}
                                  className="inline-flex items-center px-3 py-2 text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                            <div className="flex flex-col items-center">
                              <Users className="w-12 h-12 text-gray-300 mb-4" />
                              <p className="text-lg font-medium text-gray-900">
                                {searchMode ? 'No search results found' : 'No patients found'}
                              </p>
                              <p className="text-gray-500">
                                {searchMode 
                                  ? `No patients match "${searchQuery}"`
                                  : 'No patients registered yet'
                                }
                              </p>
                              {searchMode && (
                                <button
                                  onClick={clearSearch}
                                  className="mt-3 px-4 py-2 bg-green-600 text-white hover:bg-green-700 transition-colors"
                                >
                                  Clear Search
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination with sharp corners */}
                {totalPages > 1 && (
                  <div className="border-t bg-white px-6 py-4">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div className="text-sm text-gray-500">
                        Showing {((currentPage - 1) * 50) + 1} to {Math.min(currentPage * 50, totalCount)} of {totalCount} patients
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handlePageChange(1)}
                          disabled={currentPage === 1}
                          className="px-3 py-2 bg-white border border-gray-300 shadow-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          First
                        </button>
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-4 py-2 bg-white border border-gray-300 shadow-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Previous
                        </button>
                        
                        <div className="flex items-center space-x-1">
                          {(() => {
                            const pages = [];
                            const start = Math.max(1, currentPage - 2);
                            const end = Math.min(totalPages, currentPage + 2);
                            
                            for (let i = start; i <= end; i++) {
                              pages.push(
                                <button
                                  key={i}
                                  onClick={() => handlePageChange(i)}
                                  className={`px-3 py-2 text-sm transition-colors ${
                                    i === currentPage
                                      ? 'bg-green-600 text-white'
                                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  {i}
                                </button>
                              );
                            }
                            return pages;
                          })()}
                        </div>
                        
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 bg-white border border-gray-300 shadow-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                        </button>
                        <button
                          onClick={() => handlePageChange(totalPages)}
                          disabled={currentPage === totalPages}
                          className="px-3 py-2 bg-white border border-gray-300 shadow-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Last
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Edit Patient Form */}
          {currentView === 'edit' && selectedPatient && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white shadow-sm p-8 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Patient - {selectedPatient.regno}</h2>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Registration Number</label>
                      <input
                        type="text"
                        value={formData.regno}
                        className="w-full px-4 py-3 border border-gray-300 bg-gray-50 cursor-not-allowed"
                        disabled
                      />
                      <p className="text-xs text-gray-500 mt-1">Registration number cannot be changed</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                      <input
                        type="number"
                        name="age"
                        value={formData.age}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                    />
                  </div>

                  <div className="flex space-x-4 pt-4">
                    <button
                      onClick={() => {
                        setSelectedPatient(null);
                        setCurrentView('current');
                      }}
                      className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdatePatient}
                      disabled={loading}
                      className="px-6 py-3 bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && patientToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 flex items-center justify-center mr-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Patient</h3>
                <p className="text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <strong>{patientToDelete.name}</strong> ({patientToDelete.regno})?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPatientToDelete(null);
                }}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePatient}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 transition-colors"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onSubmit={handleChangePassword}
        loading={loading}
      />
    </div>
  );
}

export default App;