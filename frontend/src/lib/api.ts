import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Crucial for sending/receiving HttpOnly cookies cross-origin
});

// Response interceptor to handle automatic Access Token refresh when expired (401)
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // If 401 response and request hasn't been retried yet
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
      originalRequest._retry = true;
      try {
        // Attempt refreshing access token using refresh token cookie
        await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        // Retry original request
        return api(originalRequest);
      } catch (refreshErr) {
        // Refresh failed (refresh token expired/invalid), redirect to login
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
