import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing authentication token
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        
        if (token && userData) {
          // TODO: Validate token with backend API
          // For now, just restore user data if token exists
          const parsedUserData = JSON.parse(userData);
          setUser(parsedUserData);
        }
        
        setLoading(false);
      } catch (error) {
        // Clear invalid data
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username, password) => {
    try {
      // Import authAPI here to avoid circular dependency
      const { authAPI } = await import('../services/api');
      
      const response = await authAPI.login(username, password);
      
      if (response.success) {
        const { token, user } = response.data;
        
        // Store in localStorage
        localStorage.setItem('authToken', token);
        localStorage.setItem('userData', JSON.stringify(user));
        
        setUser(user);
        return { success: true };
      } else {
        return { success: false, message: response.message || 'שגיאה בהתחברות' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'שגיאה בהתחברות לשרת' 
      };
    }
  };

  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
