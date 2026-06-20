/**
 * Zustand auth store — persists token and user profile to localStorage.
 * Supports both authenticated and guest users transparently.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile, UserType } from '../types'

interface AuthStore {
  token: string | null
  user: UserProfile | null
  isAuthenticated: boolean
  isGuest: boolean

  setAuth: (token: string, user: UserProfile) => void
  setGuest: (token: string, sessionId: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isGuest: false,

      setAuth: (token, user) => {
        localStorage.setItem('mindease_token', token)
        set({
          token,
          user,
          isAuthenticated: true,
          isGuest: false,
        })
      },

      setGuest: (token, sessionId) => {
        localStorage.setItem('mindease_token', token)
        const guestUser: UserProfile = {
          user_id: sessionId,
          user_type: 'guest' as UserType,
          name: 'Guest Explorer',
          created_at: new Date().toISOString(),
        }
        set({
          token,
          user: guestUser,
          isAuthenticated: false,
          isGuest: true,
        })
      },

      clearAuth: () => {
        localStorage.removeItem('mindease_token')
        localStorage.removeItem('mindease_user')
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isGuest: false,
        })
      },
    }),
    {
      name: 'mindease_auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isGuest: state.isGuest,
      }),
    }
  )
)
