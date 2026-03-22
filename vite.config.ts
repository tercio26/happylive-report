import { fileURLToPath, URL } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig(({ mode }) => {
  // Load ALL env vars (not just VITE_ prefixed) — used only in Node.js context below
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      vueDevTools(),
      {
        name: 'dev-admin-api',
        configureServer(server) {
          server.middlewares.use('/api/admin-users', async (req: IncomingMessage, res: ServerResponse) => {
            const { createClient } = await import('@supabase/supabase-js')

            const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
            const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
            // Service key read from Node.js env — never bundled into browser code
            const serviceKey = env.SUPABASE_SERVICE_KEY || env.VITE_SUPABASE_SERVICE_KEY

            const admin = createClient(supabaseUrl, serviceKey)
            const anon = createClient(supabaseUrl, anonKey)

            res.setHeader('Content-Type', 'application/json')

            // Verify Bearer token
            const authHeader = req.headers.authorization
            if (!authHeader?.startsWith('Bearer ')) {
              res.statusCode = 401
              res.end(JSON.stringify({ error: 'Unauthorized' }))
              return
            }
            const { data: userData, error: authErr } = await anon.auth.getUser(authHeader.slice(7))
            if (authErr || !userData.user) {
              res.statusCode = 401
              res.end(JSON.stringify({ error: 'Unauthorized' }))
              return
            }

            // Check manage_users permission
            const { data: permData } = await admin
              .from('user_permissions')
              .select('permission_key')
              .eq('user_id', userData.user.id)
              .eq('permission_key', 'manage_users')
              .maybeSingle()
            if (!permData) {
              res.statusCode = 403
              res.end(JSON.stringify({ error: 'Forbidden' }))
              return
            }

            // Parse request body
            const rawBody = await new Promise<string>((resolve) => {
              let chunks = ''
              req.on('data', (c) => { chunks += c })
              req.on('end', () => resolve(chunks))
            })

            try {
              if (req.method === 'GET') {
                const { data: list, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
                if (error) throw error
                res.end(JSON.stringify(list.users))

              } else if (req.method === 'POST') {
                const { email, password, display_name } = JSON.parse(rawBody)
                const { data: created, error } = await admin.auth.admin.createUser({
                  email, password, email_confirm: true,
                  user_metadata: { display_name },
                })
                if (error) throw error
                res.end(JSON.stringify({ id: created.user.id }))

              } else if (req.method === 'PUT') {
                const { userId, display_name } = JSON.parse(rawBody)
                const { error } = await admin.auth.admin.updateUserById(userId, {
                  user_metadata: { display_name },
                })
                if (error) throw error
                res.end(JSON.stringify({ ok: true }))

              } else if (req.method === 'DELETE') {
                const { userId } = JSON.parse(rawBody)
                const { error } = await admin.auth.admin.deleteUser(userId)
                if (error) throw error
                res.end(JSON.stringify({ ok: true }))

              } else {
                res.statusCode = 405
                res.end(JSON.stringify({ error: 'Method not allowed' }))
              }
            } catch (err: unknown) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }))
            }
          })
        },
      },
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
