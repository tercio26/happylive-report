import { defineStore } from 'pinia'
import { supabase } from '@/services/supabase'
import type { AuthUser, PermissionKey } from '@/types'

interface AuthState {
  user: AuthUser | null
  permissions: PermissionKey[]
  loading: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    permissions: [],
    loading: true,
  }),

  getters: {
    isLoggedIn: (state) => !!state.user,
    hasPermission: (state) => (key: PermissionKey) => state.permissions.includes(key),
  },

  actions: {
    async init() {
      this.loading = true
      const { data } = await supabase.auth.getSession()
      if (data.session?.user) {
        this.user = {
          id: data.session.user.id,
          email: data.session.user.email ?? '',
        }
        await this.fetchPermissions()
      }
      this.loading = false
    },

    async login(email: string, password: string) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      this.user = {
        id: data.user.id,
        email: data.user.email ?? '',
      }
      await this.fetchPermissions()
    },

    async logout() {
      await supabase.auth.signOut()
      this.user = null
      this.permissions = []
    },

    async fetchPermissions() {
      if (!this.user) return
      const { data, error } = await supabase
        .from('user_permissions')
        .select('permission_key')
        .eq('user_id', this.user.id)
      if (!error && data) {
        this.permissions = data.map((row) => row.permission_key as PermissionKey)
      }
    },
  },
})
