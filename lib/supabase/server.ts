import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Session-bound Supabase client for Server Components and Route Handlers.
 *  Reads the user's session from cookies and runs every query through RLS
 *  as that user — this is what the old pages were missing: they queried
 *  through supabaseAdmin (service key) with no owner_id filter at all, so
 *  "/" and "/mole/[id]" showed every user's moles to every visitor. */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render, which can't set cookies.
          // Harmless as long as middleware.ts is refreshing the session
          // cookie on every request (it is — see middleware.ts).
        }
      },
    },
  });
}
