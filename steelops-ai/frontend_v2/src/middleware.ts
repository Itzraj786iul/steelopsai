import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AUTH_COOKIE_KEY } from "@/lib/constants";
import { resolveLegacyRedirect } from "@/lib/navigation/legacy-redirects";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/eaf", "/unauthorized"];

function isPublicPath(pathname: string): boolean {
  return pathname === "/" || PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const legacyTarget = resolveLegacyRedirect(pathname);
  if (legacyTarget) {
    return NextResponse.redirect(new URL(legacyTarget, request.url));
  }

  const isPublic = isPublicPath(pathname);
  const isAuthenticated = request.cookies.get(AUTH_COOKIE_KEY)?.value === "1";

  if ((pathname === "/login" || pathname === "/register") && isAuthenticated) {
    return NextResponse.redirect(new URL("/eaf/dashboard", request.url));
  }

  if (!isPublic && !isAuthenticated) {
    return NextResponse.redirect(new URL("/eaf/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
