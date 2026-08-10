import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

// Service-role client — bypasses RLS entirely, so it must only ever be used
// from trusted server-only code (API routes) that does its own ownership
// checks (see app/api/classify/route.ts). Regular pages should use
// lib/supabase/server.ts (Server Components) or lib/supabase/client.ts
// (Client Components) instead — those carry the signed-in user's session
// and let RLS do the filtering, which is what "own moles" / "own photo_analyses"
// policies in supabase/schema.sql are designed around.
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[supabase] SUPABASE_SERVICE_ROLE_KEY не задан — supabaseAdmin использует anon key. Запросы, защищённые RLS-политиками, будут возвращать пустой список."
  );
}

export const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceKey);
