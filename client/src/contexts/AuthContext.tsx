import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import api from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const currentUser = await api.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.log('Auth check failed, user not authenticated');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    try {
      const { authUrl } = await api.getAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const logout = async () => {
    try {
      // Clear user state first
      setUser(null);
      
      // Call backend logout (this will redirect to Microsoft logout)
      window.location.href = '/api/auth/logout';
    } catch (error) {
      console.error('Logout error:', error);
      // Even if API call fails, clear local state and redirect to Microsoft logout
      setUser(null);
      window.location.href = '/api/auth/logout';
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
