import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

const admin = createClient(supabaseUrl, supabaseServiceKey)
const anon = createClient(supabaseUrl, supabaseAnonKey)

interface HandlerEvent {
  httpMethod: string
  headers: Record<string, string | undefined>
  body: string | null
}

interface HandlerResponse {
  statusCode: number
  headers: Record<string, string>
  body: string
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function getCallerId(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const { data, error } = await anon.auth.getUser(authHeader.slice(7))
  if (error || !data.user) return null
  return data.user.id
}

async function hasManageUsers(userId: string): Promise<boolean> {
  const { data } = await admin
    .from('user_permissions')
    .select('permission_key')
    .eq('user_id', userId)
    .eq('permission_key', 'manage_users')
    .maybeSingle()
  return !!data
}

export const handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  const callerId = await getCallerId(event.headers.authorization)
  if (!callerId) {
    return { statusCode: 401, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const allowed = await hasManageUsers(callerId)
  if (!allowed) {
    return { statusCode: 403, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Forbidden' }) }
  }

  try {
    // GET — list users
    if (event.httpMethod === 'GET') {
      const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
      if (error) throw error
      return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify(data.users) }
    }

    // POST — create user
    if (event.httpMethod === 'POST') {
      const { email, password, display_name } = JSON.parse(event.body ?? '{}')
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name },
      })
      if (error) throw error
      return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ id: data.user.id }) }
    }

    // PUT — update user metadata
    if (event.httpMethod === 'PUT') {
      const { userId, display_name } = JSON.parse(event.body ?? '{}')
      const { error } = await admin.auth.admin.updateUserById(userId, {
        user_metadata: { display_name },
      })
      if (error) throw error
      return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ ok: true }) }
    }

    // DELETE — delete user
    if (event.httpMethod === 'DELETE') {
      const { userId } = JSON.parse(event.body ?? '{}')
      const { error } = await admin.auth.admin.deleteUser(userId)
      if (error) throw error
      return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ ok: true }) }
    }

    return { statusCode: 405, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return { statusCode: 500, headers: JSON_HEADERS, body: JSON.stringify({ error: msg }) }
  }
}
