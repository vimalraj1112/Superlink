import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/config/env';
import { refreshAllQueries } from '@/lib/queryClient';

const API_BASE_URL = `${env.VITE_API_URL}/api/${env.VITE_API_VERSION}`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: invalidate caches on writes and handle token refresh
api.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toUpperCase();
    const url = response.config.url ?? '';

    // Any successful write can change data shown elsewhere (the current list,
    // related records, filter dropdowns and the dashboard counters), so
    // invalidate every cached query and let it refetch. Auth endpoints are
    // skipped because they run during login/logout when there is nothing to
    // refresh.
    if (method && method !== 'GET' && method !== 'HEAD' && !url.includes('/auth/')) {
      refreshAllQueries();
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });

        if (response.data.success) {
          const { tokens } = response.data.data;
          const { accessToken, refreshToken: newRefreshToken } = tokens;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;