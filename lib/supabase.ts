import { createClient } from '@supabase/supabase-js'

// Accept URLs pasted from the API docs (e.g. ".../rest/v1/"); supabase-js appends that path itself.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/+$/, '')
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

// Placeholders keep the app rendering when env vars are missing; requests then fail into the error state.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
)
