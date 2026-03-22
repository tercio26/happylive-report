export type UserRole = 'admin' | 'editor' | 'viewer'

export type PermissionKey = 'manage_data' | 'manage_users' | 'view_reports'

export interface UserPermission {
  id: string
  user_id: string
  permission_key: PermissionKey
}

export interface AuthUser {
  id: string
  email: string
}
