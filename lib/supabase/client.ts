import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Browser-side Supabase client for "use client" components (login, register,
 *  capture, mole/new). Session lives in cookies (via @supabase/ssr) so the
 *  server client below sees the same session on the next request — this is
 *  what replaces the old anonymous-only `ensureSession()` flow. */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
