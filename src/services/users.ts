import { supabase } from './supabase'
import type { PermissionKey } from '@/types'

export interface UserProfile {
  id: string
  email: string
  display_name: string
  created_at: string
  permissions: PermissionKey[]
}

async function adminFetch(method: string, body?: object): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch('/api/admin-users', {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? ''}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

async function checkResponse(res: Response): Promise<unknown> {
  const json = await res.json()
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`)
  return json
}

export async function listUsers(): Promise<UserProfile[]> {
  const [res, { data: permsData, error: permsError }] = await Promise.all([
    adminFetch('GET'),
    supabase.from('user_permissions').select('user_id, permission_key'),
  ])

  const authUsers = await checkResponse(res) as { id: string; email?: string; user_metadata?: { display_name?: string }; created_at: string }[]
  if (permsError) throw new Error(permsError.message)

  const permsMap: Record<string, PermissionKey[]> = {}
  for (const p of permsData ?? []) {
    if (!permsMap[p.user_id]) permsMap[p.user_id] = []
    permsMap[p.user_id].push(p.permission_key as PermissionKey)
  }

  return authUsers.map((u) => ({
    id: u.id,
    email: u.email ?? '',
    display_name: u.user_metadata?.display_name ?? '',
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
  const res = await adminFetch('POST', { email, password, display_name: displayName })
  const data = await checkResponse(res) as { id: string }
  if (permissions.length) {
    await setUserPermissions(data.id, permissions)
  }
}

export async function updateUser(
  userId: string,
  displayName: string,
  permissions: PermissionKey[],
): Promise<void> {
  const res = await adminFetch('PUT', { userId, display_name: displayName })
  await checkResponse(res)
  await setUserPermissions(userId, permissions)
}

export async function deleteUser(userId: string): Promise<void> {
  const res = await adminFetch('DELETE', { userId })
  await checkResponse(res)
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
