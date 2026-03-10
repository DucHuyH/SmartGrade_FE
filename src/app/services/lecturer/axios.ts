import axios from 'axios'
import { API_BASE_URL, STORAGE_KEYS } from '../../../constants'

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // QUAN TRỌNG: gửi cookie qua mọi request
})

axiosInstance.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
// axiosInstance.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       // Chỉ clear user (sessionStorage)
//       sessionStorage.removeItem(STORAGE_KEYS.USER)

//       // Redirect về login
//       window.location.href = '/login'
//     }
//     return Promise.reject(error)
//   }
// )
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Lấy thông tin URL của request vừa bị lỗi
    const originalRequestUrl = error.config?.url || ''

    // Kích hoạt redirect NẾU lỗi là 401 VÀ request đó KHÔNG PHẢI là gọi API login
    if (error.response?.status === 401 && !originalRequestUrl.includes('login')) {
      sessionStorage.removeItem(STORAGE_KEYS.USER)

      // CẬP NHẬT LẠI ROUTE: Thay '/login' bằng route trang đăng nhập thực tế của bạn
      // Ví dụ: '/' hoặc '/lecturer-login'
      window.location.href = '/lecturer/login'
    }
    return Promise.reject(error)
  }
)

export default axiosInstance
