import axios from 'axios';
import { API_BASE_URL, STUDENT_STORAGE_KEYS } from '../../../constants';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // QUAN TRỌNG: gửi cookie qua mọi request
});


axiosInstance.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Chỉ clear user (sessionStorage)
      sessionStorage.removeItem(STUDENT_STORAGE_KEYS.USER);

      // Redirect về login chỉ khi KHÔNG phải đang ở trang login
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login')) {
        window.location.href = '/student/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
