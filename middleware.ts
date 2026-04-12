import { NextRequest, NextResponse } from "next/server";

// NOTE: No importar @/lib/auth aquí — pg no es compatible con Edge Runtime.
// La protección de rutas se hace en app/(app)/layout.tsx (client-side redirect).
// Este middleware solo maneja redirects ligeros sin DB.

const PUBLIC_PATHS = ["/auth", "/api/auth", "/setup", "/api/health"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for Better Auth session cookie (lightweight, no DB call)
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");

  if (!sessionCookie) {
    const loginUrl = new URL("/auth", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|public).*)",
  ],
};
