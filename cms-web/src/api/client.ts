import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
});

// Request interceptor: inject Authorization header
client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: unwrap Result, handle token refresh and 401
client.interceptors.response.use(
  (response) => {
    // Check for new token (sliding refresh)
    const newToken = response.headers['x-new-token'];
    if (newToken) {
      useAuthStore.getState().setToken(newToken);
    }

    const { code, message, data } = response.data;
    if (code !== 200) {
      return Promise.reject(new Error(message));
    }
    return data;
  },
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
