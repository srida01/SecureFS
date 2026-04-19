import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Set up the interceptor to add auth token to all requests
export const setupAxiosInterceptor = (getToken: () => Promise<string | null>) => {
  api.interceptors.request.use(async (config) => {
    // Only set token if not already set and token is available
    if (!config.headers.Authorization) {
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });
};

export default api;