'use client'

import { create } from 'zustand'

interface User {
  id: string
  username: string
  role: string
  name: string
}

interface AppState {
  // Auth
  user: User | null
  setUser: (user: User | null) => void

  // Navigation
  currentPage: string
  setCurrentPage: (page: string) => void

  // Sub-navigation (for each dashboard)
  activeTab: string
  setActiveTab: (tab: string) => void

  // Loading
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  currentPage: 'login',
  setCurrentPage: (page) => set({ currentPage: page, activeTab: '' }),

  activeTab: '',
  setActiveTab: (tab) => set({ activeTab: tab }),

  isLoading: true,
  setIsLoading: (loading) => set({ isLoading: loading }),
}))
