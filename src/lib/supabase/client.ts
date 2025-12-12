import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Singleton pattern to ensure only one Supabase client instance
let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return supabaseClient
}

// Reset the singleton client - useful when the client gets into a bad state
export function resetClient() {
  supabaseClient = null
}
