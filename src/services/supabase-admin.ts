import { createClient } from '@supabase/supabase-js'

// Service role client — used only in admin-guarded pages.
// VITE_ prefix exposes this in the browser bundle; acceptable for this internal tool.
// Add RLS policies before any public exposure.
export const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY,
)
