# Hướng Dẫn Sử Dụng Axios Interceptor - Tự Động Thay Thế Token Khi Hết Hạn

## Mục Lục

1. [Khái Niệm Cơ Bản](#khái-niệm-cơ-bản)
2. [Cấu Trúc Hiện Tại](#cấu-trúc-hiện-tại)
3. [Triển Khai Interceptor](#triển-khai-interceptor)
4. [Các Trường Hợp Xử Lý](#các-trường-hợp-xử-lý)
5. [Ví Dụ Thực Tế](#ví-dụ-thực-tế)
6. [Tích Hợp với AuthContext](#tích-hợp-với-authcontext)

---

## Khái Niệm Cơ Bản

### Axios Interceptor là gì?

Axios Interceptor là các function cho phép bạn can thiệp vào request/response trước khi chúng được gửi/nhận. Nó hữu ích để:

- Thêm authorization token vào mỗi request
- Xử lý token hết hạn tự động
- Làm mới token mà không cần người dùng đăng nhập lại
- Xử lý các lỗi chung

### Vòng Đời Token Khi Hết Hạn

```
Request → Check Token Hết Hạn → Làm Mới Token → Gửi Request Lại → Response
```

---

## Cấu Trúc Hiện Tại

Trong project, token thường được lưu ở:

- **AuthContext** (`src/app/contexts/AuthContext.tsx`)
- **LocalStorage** hoặc **SessionStorage**

---

## Triển Khai Interceptor

### Bước 1: Tạo File Axios Instance

Tạo file `src/app/services/axiosInstance.ts`:

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios'

// Khởi tạo axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Flag để tránh multiple refresh token requests
let isRefreshing = false
let failedQueue: Array<{
  onSuccess: (token: string) => void
  onFailed: (error: AxiosError) => void
}> = []

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.onFailed(error)
    } else {
      prom.onSuccess(token!)
    }
  })

  isRefreshing = false
  failedQueue = []
}

export const setupInterceptors = (
  getToken: () => string | null,
  getRefreshToken: () => string | null,
  onTokenRefreshed: (newToken: string) => void,
  onRefreshFailed: () => void
) => {
  // Request Interceptor - Thêm token vào mỗi request
  axiosInstance.interceptors.request.use(
    (config) => {
      const token = getToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // Response Interceptor - Xử lý khi token hết hạn
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as any

      // Nếu status là 401 và chưa retry lần nào
      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          // Nếu đang refresh token, thêm request vào queue
          return new Promise((onSuccess, onFailed) => {
            failedQueue.push({
              onSuccess,
              onFailed
            })
          }).then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return axiosInstance(originalRequest)
          })
        }

        originalRequest._retry = true
        isRefreshing = true

        const refreshToken = getRefreshToken()
        if (!refreshToken) {
          // Không có refresh token - đăng xuất
          processQueue(error, null)
          onRefreshFailed()
          return Promise.reject(error)
        }

        try {
          // Gọi API refresh token
          const response = await axiosInstance.post('/auth/refresh', {
            refreshToken
          })

          const { token: newToken } = response.data

          // Cập nhật token mới
          onTokenRefreshed(newToken)

          // Xử lý các request trong queue
          processQueue(null, newToken)

          // Gửi lại request gốc với token mới
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return axiosInstance(originalRequest)
        } catch (err) {
          // Refresh token thất bại - đăng xuất
          processQueue(error, null)
          onRefreshFailed()
          return Promise.reject(err)
        }
      }

      return Promise.reject(error)
    }
  )
}

export default axiosInstance
```

---

## Các Trường Hợp Xử Lý

### 1. Token Vẫn Còn Hạn

```
Request → Authorization Header: Bearer <token> → Server → Response 200 OK
```

### 2. Token Hết Hạn (Status 401)

```
Request (Token hết hạn) → Response 401 → Refresh Token → Token Mới
→ Gửi Lại Request → Response 200 OK
```

### 3. Refresh Token Cũng Hết Hạn

```
Response 401 → Attempt Refresh → Refresh Token Invalid/Expired
→ Redirect to Login → User Đăng Nhập Lại
```

### 4. Multiple Requests Đồng Thời Khi Token Hết Hạn

```
Request 1 → 401 ↘
Request 2 → 401 ↘ Refresh Token (1 lần)
Request 3 → 401 ↗ Gửi lại Request 1,2,3 với Token Mới
```

---

## Ví Dụ Thực Tế

### Sử Dụng axiosInstance trong Component

```typescript
import axiosInstance from '@/app/services/axiosInstance'

// GET request
const fetchGrades = async () => {
  try {
    const response = await axiosInstance.get('/grades')
    console.log('Grades:', response.data)
  } catch (error) {
    console.error('Failed to fetch grades:', error)
  }
}

// POST request
const submitAssignment = async (assignmentId: string, data: any) => {
  try {
    const response = await axiosInstance.post(`/assignments/${assignmentId}/submit`, data)
    console.log('Submitted:', response.data)
  } catch (error) {
    console.error('Failed to submit:', error)
  }
}

// PUT request
const updateProfile = async (profileData: any) => {
  try {
    const response = await axiosInstance.put('/profile', profileData)
    console.log('Updated:', response.data)
  } catch (error) {
    console.error('Failed to update:', error)
  }
}

// DELETE request
const deleteAssignment = async (assignmentId: string) => {
  try {
    await axiosInstance.delete(`/assignments/${assignmentId}`)
    console.log('Deleted successfully')
  } catch (error) {
    console.error('Failed to delete:', error)
  }
}
```

---

## Tích Hợp với AuthContext

### Cập Nhật AuthContext

Trong `src/app/contexts/AuthContext.tsx`:

```typescript
import { createContext, useContext, useEffect, ReactNode } from 'react';
import axiosInstance, { setupInterceptors } from '@/app/services/axiosInstance';

interface AuthContextType {
  token: string | null;
  refreshToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // ... existing state management

  useEffect(() => {
    // Thiết lập interceptors khi component mount
    setupInterceptors(
      () => getToken(), // Function trả về current token
      () => getRefreshToken(), // Function trả về current refresh token
      (newToken: string) => {
        // Callback khi token được làm mới
        setToken(newToken);
        localStorage.setItem('token', newToken);
      },
      () => {
        // Callback khi refresh thất bại
        logout();
      }
    );
  }, []);

  const logout = () => {
    setToken(null);
    setRefreshToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  };

  return (
    <AuthContext.Provider value={{ /* ... */ }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

---

## Một Số Lưu Ý Quan Trọng

### 1. Token Expiration Check (Tùy Chọn)

```typescript
import { jwtDecode } from 'jwt-decode'

const isTokenExpired = (token: string): boolean => {
  try {
    const decoded: any = jwtDecode(token)
    return decoded.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

// Sử dụng trong request interceptor
axiosInstance.interceptors.request.use((config) => {
  const token = getToken()

  // Nếu token hết hạn trước khi gửi request
  if (token && isTokenExpired(token)) {
    // Refresh token ngay lập tức
    // Hoặc để response interceptor xử lý khi status 401
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

### 2. Xử Lý Lỗi Chi Tiết

```typescript
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.log('Unauthorized - Token expired')
    } else if (error.response?.status === 403) {
      console.log('Forbidden - No permission')
    } else if (error.response?.status === 500) {
      console.log('Server error')
    }
    return Promise.reject(error)
  }
)
```

### 3. Retry Logic (Tùy Chọn)

```typescript
import axiosRetry from 'axios-retry'

axiosRetry(axiosInstance, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return error.response?.status === 429 || error.response?.status === 503
  }
})
```

---

## Quy Trình Xử Lý Tổng Hợp

```
┌─ Tạo Request
│  ↓
├─ Request Interceptor
│  ├─ Thêm Authorization Header
│  ├─ Thêm headers khác (nếu cần)
│  └─ Gửi request
│
├─ Server Xử Lý
│  ├─ Validate Token
│  ├─ Token Còn Hạn? → Response 200
│  └─ Token Hết Hạn? → Response 401
│
└─ Response Interceptor
   ├─ Status 401?
   │  ├─ Có Refresh Token?
   │  │  ├─ Gọi API Refresh Token
   │  │  ├─ Refresh Thành Công? → Gửi Lại Request với Token Mới
   │  │  └─ Refresh Thất Bại? → Redirect Login
   │  └─ Không có? → Logout
   └─ Status khác? → Return Response
```

---

## Kiểm Tra & Testing

### Test Token Refresh

```typescript
// Component Test
import { useEffect } from 'react';
import axiosInstance from '@/app/services/axiosInstance';

export const TestTokenRefresh = () => {
  useEffect(() => {
    const testAPI = async () => {
      try {
        // API này sẽ trả về 401 nếu token hết hạn
        const response = await axiosInstance.get('/protected-endpoint');
        console.log('Success:', response.data);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    testAPI();
  }, []);

  return <div>Check console logs</div>;
};
```

---

## Tài Liệu Tham Khảo

- [Axios Documentation](https://axios-http.com/docs/interceptors)
- [JWT Token Refresh Pattern](https://developer.auth0.com/resources/auth0-spa-js-security-best-practices)
- [axios-retry Package](https://github.com/softonic/axios-retry)

---

## Câu Hỏi Thường Gặp (FAQ)

**Q: Tại sao cần queue các requests khi refresh token?**
A: Để tránh gửi nhiều refresh token requests đồng thời, gây lãng phí tài nguyên và có thể bị reject của server.

**Q: Nên lưu token ở đâu?**
A:

- LocalStorage: Tiện nhưng kém an toàn (XSS attack)
- SessionStorage: Mất khi đóng tab
- Memory + HTTP-only Cookie: An toàn nhất nhưng phức tạp hơn

**Q: Refresh token có hết hạn không?**
A: Có, nhưng thời gian hết hạn lâu hơn access token. Khi refresh token hết hạn, user cần đăng nhập lại.

**Q: Làm cách nào phát hiện token hết hạn trước khi gửi request?**
A: Sử dụng `jwt-decode` để decode token và kiểm tra expiration time, hoặc để response interceptor xử lý khi status 401.
