import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login", "/register", "/auth/callback"];

// Refreshes the Supabase session cookie on every request and gates access:
// unauthenticated visitors get bounced to /login (this is what "add
// registration/login" ultimately needs to mean — the old app had no
// server-side check at all, see the removed NOTE comment in app/page.tsx),
// and /dashboard additionally requires app_metadata.doctor === true, closing
// the gap the README explicitly flagged as "add before shipping".
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // getSession() reads the JWT from the cookie without making a network
  // request — critical for Edge middleware where a Supabase round-trip
  // easily exceeds Vercel's ~25ms middleware budget and causes 504s.
  // getUser() (server-side token verification) is only needed in API routes
  // and Server Components that actually read user data, not in the middleware
  // whose only job is redirect-or-pass.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;

  const path = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && path.startsWith("/dashboard")) {
    const isDoctor = (user.app_metadata as Record<string, unknown> | undefined)?.doctor === true;
    if (!isDoctor) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Skip static assets, favicon, AND all /api/ routes — those are protected
    // individually (device Bearer secret or session check inside the route
    // handler) and don't need the middleware redirect logic. Excluding them
    // also eliminates any chance the middleware's cookie-refresh path blocks
    // the ESP32 device requests that have no cookie at all.
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
