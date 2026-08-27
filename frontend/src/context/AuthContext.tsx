import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '@/api/axios';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: {
    id: string;
    name: string;
    description?: string;
    permissions: Record<string, string[]>;
  };
  isActive: boolean;
  lastLoginAt?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (resource: string, action: string) => boolean;
  hasRole: (roleNames: string | string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setState({ user: null, loading: false, error: null });
        return;
      }

      const response = await api.get('/auth/me');
      if (response.data.success) {
        setState({ user: response.data.data, loading: false, error: null });
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setState({ user: null, loading: false, error: null });
      }
    } catch (error) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setState({ user: null, loading: false, error: null });
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await api.post('/auth/login', { email, password });

      if (response.data.success) {
        const { user, tokens } = response.data.data;
        const { accessToken, refreshToken } = tokens;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        setState({ user, loading: false, error: null });
      } else {
        setState(prev => ({ ...prev, loading: false, error: response.data.message || 'Login failed' }));
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Login failed';
      setState(prev => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setState({ user: null, loading: false, error: null });
    }
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  const hasPermission = (resource: string, action: string): boolean => {
    if (!state.user) return false;
    const permissions = state.user.role.permissions;
    if (!permissions) return false;

    // Check for wildcard permissions
    if (permissions['*']?.includes('*')) return true;
    if (permissions['*']?.includes(action)) return true;
    if (permissions[resource]?.includes('*')) return true;

    return permissions[resource]?.includes(action) ?? false;
  };

  const hasRole = (roleNames: string | string[]): boolean => {
    if (!state.user) return false;
    const roles = Array.isArray(roleNames) ? roleNames : [roleNames];
    return roles.includes(state.user.role.name);
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser, hasPermission, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}