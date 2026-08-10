import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Falling back to the anon key silently is convenient for local dev without
// full env setup, but it means every RLS-protected query (auth.uid() based)
// quietly returns an empty list instead of erroring — worth knowing about
// when a page shows "no data" that should exist.
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    '[supabase] SUPABASE_SERVICE_ROLE_KEY не задан — supabaseAdmin использует anon key. Запросы защищённые RLS-политиками будут возвращать пустой список.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)