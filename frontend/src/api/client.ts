/**
 * Axios HTTP client with auth interceptors.
 * Reads token from Zustand store and attaches to requests.
 */
import axios, { AxiosError } from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  withCredentials: true, // Send HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach JWT from localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mindease_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle 401 gracefully
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear local token on auth failure
      localStorage.removeItem('mindease_token')
      localStorage.removeItem('mindease_user')
      // Redirect to auth page if not already there
      if (!window.location.pathname.includes('/auth')) {
        window.location.href = '/auth'
      }
    }
    return Promise.reject(error)
  }
)

/** Extract user-friendly error message from Axios error */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    if (typeof data === 'object' && data?.detail) {
      return String(data.detail)
    }
    if (error.response?.status === 429) {
      return 'Too many requests. Please wait a moment.'
    }
    if (error.response?.status === 503) {
      return 'Service temporarily unavailable. Please try again.'
    }
    return error.message || 'Network error'
  }
  return 'An unexpected error occurred'
}
