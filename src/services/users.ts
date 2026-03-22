import { supabaseAdmin } from './supabase-admin'
import { supabase } from './supabase'
import type { PermissionKey } from '@/types'

export interface UserProfile {
  id: string
  email: string
  display_name: string
  created_at: string
  permissions: PermissionKey[]
}

export async function listUsers(): Promise<UserProfile[]> {
  const [{ data: authData, error: authError }, { data: permsData, error: permsError }] =
    await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
      supabase.from('user_permissions').select('user_id, permission_key'),
    ])

  if (authError) throw new Error(authError.message)
  if (permsError) throw new Error(permsError.message)

  const permsMap: Record<string, PermissionKey[]> = {}
  for (const p of permsData ?? []) {
    if (!permsMap[p.user_id]) permsMap[p.user_id] = []
    permsMap[p.user_id].push(p.permission_key as PermissionKey)
  }

  return authData.users.map((u) => ({
    id: u.id,
    email: u.email ?? '',
    display_name: (u.user_metadata?.display_name as string) ?? '',
    created_at: u.created_at,
    permissions: permsMap[u.id] ?? [],
  }))
}

export async function createUser(
  email: string,
  password: string,
  displayName: string,
  permissions: PermissionKey[],
): Promise<void> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })
  if (error) throw new Error(error.message)
  if (data.user && permissions.length) {
    await setUserPermissions(data.user.id, permissions)
  }
}

export async function updateUser(
  userId: string,
  displayName: string,
  permissions: PermissionKey[],
): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: { display_name: displayName },
  })
  if (error) throw new Error(error.message)
  await setUserPermissions(userId, permissions)
}

export async function deleteUser(userId: string): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) throw new Error(error.message)
}

export async function setUserPermissions(userId: string, permissions: PermissionKey[]): Promise<void> {
  const { error: delError } = await supabase
    .from('user_permissions')
    .delete()
    .eq('user_id', userId)
  if (delError) throw new Error(delError.message)

  if (permissions.length) {
    const { error } = await supabase
      .from('user_permissions')
      .insert(permissions.map((p) => ({ user_id: userId, permission_key: p })))
    if (error) throw new Error(error.message)
  }
}
