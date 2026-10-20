import { createClient } from '@supabase/supabase-js'

function normalizeUrl(raw: string | undefined) {
  const value = raw?.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
  if (!value) return undefined
  // Allow just the project ref (e.g. "hzxeqxrdwulwtqvkqbqi") as well as the full URL.
  return value.startsWith('http') ? value : `https://${value}.supabase.co`
}

const url = normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(url && anonKey)

// Placeholders keep the app rendering when env vars are missing; requests then fail into the error state.
export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder-anon-key', {
  // The dashboard uses its own password gate, so skip Supabase auth session work on every request.
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  realtime: { params: { eventsPerSecond: 10 } },
})
