import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/auth/callback"];

// ZERO-NETWORK middleware — no Supabase SDK, no async calls, never times out.
//
// Why: @supabase/ssr's createServerClient + getSession/getUser can make HTTP
// requests to Supabase (token refresh, JWKS fetch) that easily exceed Vercel
// Edge middleware's budget, causing 504 MIDDLEWARE_INVOCATION_TIMEOUT.
//
// What we do instead: check for the Supabase auth cookie by name pattern.
// The real session cookie is named "sb-<project-ref>-auth-token", optionally
// chunked as "...-auth-token.0", "...-auth-token.1", etc for large tokens —
// so it always ENDS in "-auth-token" or "-auth-token.<digit>".
//
// BUG FIXED HERE: the previous check was `name.includes("-auth-token")`,
// which also matches the PKCE flow's temporary
// "sb-<ref>-auth-token-code-verifier" / "...-auth-token-flow-<hash>-code-verifier"
// cookies that Supabase sets *during* an OAuth attempt and should discard
// after. If that exchange never completes (see /auth/callback), those
// leftover cookies stick around — and the old substring check treated their
// mere presence as "logged in", letting a genuinely signed-out browser
// through to protected pages (empty data, no header) while ALSO bouncing it
// away from /login as "already authenticated", with no way back in short of
// clearing cookies by hand. The anchored regex below only matches the real
// session cookie shape, not the verifier/flow ones.
//
// This is a presence check only (no JWT verification), which is all a
// redirect-gating middleware needs. Actual auth + ownership verification
// happens inside each Server Component (lib/supabase/server.ts → getUser())
// and API route, where there is no time budget and the full Supabase client
// is appropriate.
//
// /dashboard doctor-gating: moved into the dashboard page itself (server
// component) — it can call getUser() freely without any timeout risk.
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((p) => path.startsWith(p));

  // Presence check: Supabase sets "sb-<ref>-auth-token" (or a chunked
  // "...-auth-token.0", "...-auth-token.1", ...) on sign-in. Anchored at the
  // end so it can't also match the "...-auth-token-code-verifier" /
  // "...-auth-token-flow-<hash>-code-verifier" cookies from an in-progress
  // or abandoned OAuth attempt — see the comment above.
  const SESSION_COOKIE_PATTERN = /-auth-token(\.\d+)?$/;
  const hasSession = request.cookies.getAll().some(
    (c) => SESSION_COOKIE_PATTERN.test(c.name) && c.value.length > 10
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
