import { apiClient } from './client'
import type { AuthResponse, GuestSessionResponse, UserProfile } from '../types'

export const authApi = {
  signup: async (email: string, password: string, name: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/signup', { email, password, name })
    return data
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', { email, password })
    return data
  },

  guestSession: async (): Promise<GuestSessionResponse> => {
    const { data } = await apiClient.post<GuestSessionResponse>('/auth/guest')
    return data
  },

  getMe: async (): Promise<UserProfile> => {
    const { data } = await apiClient.get<UserProfile>('/auth/me')
    return data
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },
}
