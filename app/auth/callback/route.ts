import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google OAuth (and email-confirmation links) redirect here with a `code`
// query param instead of an active session — this route exchanges that code
// for a real session cookie before sending the person on into the app.
// middleware.ts must treat this path as public, or it would bounce the
// not-yet-authenticated request to /login before the exchange ever runs.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
