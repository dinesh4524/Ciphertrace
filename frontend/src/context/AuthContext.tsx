import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role, Permission } from '../types';

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  switchPersona: (username: string) => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('ciphertrace_token'));
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (authToken?: string) => {
    const activeToken = authToken || token;
    if (!activeToken) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.data);
      } else {
        // Token invalid, clear it
        localStorage.removeItem('ciphertrace_token');
        setToken(null);
        setCurrentUser(null);
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      localStorage.removeItem('ciphertrace_token');
      setToken(null);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Authentication failed');
      }
      const data = await res.json();
      const accessToken = data.data.access_token;
      localStorage.setItem('ciphertrace_token', accessToken);
      setToken(accessToken);
      setCurrentUser(data.data.user);
    } finally {
      setLoading(false);
    }
  };

  const switchPersona = async (username: string) => {
    await login(username, 'Password123!');
  };

  const logout = () => {
    localStorage.removeItem('ciphertrace_token');
    setToken(null);
    setCurrentUser(null);
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!currentUser) return false;
    if (currentUser.is_superuser || currentUser.role === 'SYSTEM_ADMINISTRATOR') return true;
    return currentUser.permissions.includes(permission);
  };

  const hasRole = (roles: Role[]): boolean => {
    if (!currentUser) return false;
    if (currentUser.is_superuser || currentUser.role === 'SYSTEM_ADMINISTRATOR') return true;
    return roles.includes(currentUser.role);
  };

  return (
    <AuthContext.Provider value={{ currentUser, token, loading, login, logout, switchPersona, hasPermission, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
