import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      
      // Actions
      setAuth: (user, tokens) => {
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
        })
      },
      
      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
      },
      
      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData },
        }))
      },
      
      login: async (email, password) => {
        try {
          set({ isLoading: true })
          const response = await authAPI.login(email, password)
          
          get().setAuth(response.user, {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken
          })
          
          toast.success('Welcome back!')
          return { success: true }
        } catch (error) {
          const message = error.message || 'Login failed'
          toast.error(message)
          return { success: false, error: message }
        } finally {
          set({ isLoading: false })
        }
      },
      
      register: async (userData) => {
        try {
          set({ isLoading: true })
          const response = await authAPI.register(userData)
          
          get().setAuth(response.user, {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken
          })
          
          toast.success('Account created successfully!')
          return { success: true }
        } catch (error) {
          const message = error.message || 'Registration failed'
          toast.error(message)
          return { success: false, error: message }
        } finally {
          set({ isLoading: false })
        }
      },
      
      logout: async () => {
        try {
          const { refreshToken } = get()
          if (refreshToken) {
            await authAPI.logout(refreshToken)
          }
        } catch (error) {
          console.error('Logout error:', error)
        } finally {
          get().clearAuth()
          toast.success('Logged out successfully')
        }
      },
      
      refreshAccessToken: async () => {
        try {
          const { refreshToken } = get()
          if (!refreshToken) {
            throw new Error('No refresh token available')
          }
          
          const response = await authAPI.refreshToken(refreshToken)
          
          set({
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
          })
          
          return response.accessToken
        } catch (error) {
          console.error('Token refresh failed:', error)
          // Clear auth and show user-friendly message
          get().clearAuth()
          
          // Only show toast if it's not during app initialization
          if (!get().isLoading) {
            toast.error('Session expired. Please log in again.')
          }
          
          throw error
        }
      },
      
      initializeAuth: async () => {
        try {
          const { accessToken, refreshToken } = get()
          
          if (!accessToken || !refreshToken) {
            set({ isLoading: false })
            return
          }
          
          // Try to refresh token to validate session
          await get().refreshAccessToken()
          
          // Fetch current user data
          const userResponse = await authAPI.getCurrentUser()
          set({ user: userResponse.user })
          
        } catch (error) {
          console.error('Auth initialization failed:', error)
          get().clearAuth()
        } finally {
          set({ isLoading: false })
        }
      },
    }),
    {
      name: 'grepmind-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
