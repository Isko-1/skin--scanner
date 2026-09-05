import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/auth/callback"];

// ZERO-NETWORK middleware — no Supabase SDK, no async calls, never times out.
//
// Why: @supabase/ssr's createServerClient + getSession/getUser can make HTTP
// requests to Supabase (token refresh, JWKS fetch) that easily exceed Vercel
// Edge middleware's budget, causing 504 MIDDLEWARE_INVOCATION_TIMEOUT.
//
// What we do instead: check for the Supabase auth cookie by name pattern.
// The cookie name is "sb-<project-ref>-auth-token" — we look for any cookie
// whose name contains "-auth-token" and has a non-empty value. This is a
// presence check only (no JWT verification), which is all a redirect-gating
// middleware needs. Actual auth + ownership verification happens inside each
// Server Component (lib/supabase/server.ts → getUser()) and API route, where
// there is no time budget and the full Supabase client is appropriate.
//
// /dashboard doctor-gating: moved into the dashboard page itself (server
// component) — it can call getUser() freely without any timeout risk.
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((p) => path.startsWith(p));

  // Presence check: Supabase sets "sb-<ref>-auth-token" on sign-in.
  const hasSession = request.cookies.getAll().some(
    (c) => c.name.includes("-auth-token") && c.value.length > 10
  );

  if (!hasSession && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (hasSession && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Exclude static assets, favicon, and /api/ routes.
    // API routes are protected individually (Bearer secret or session check
    // inside the handler) — running middleware on them would add latency for
    // no benefit, and the device firmware has no cookies anyway.
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
