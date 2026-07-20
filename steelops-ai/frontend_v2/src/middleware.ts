import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AUTH_COOKIE_KEY, ROLE_COOKIE_KEY } from "@/lib/constants";
import { getDefaultRouteForRole } from "@/lib/rbac/permissions";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/unauthorized"];

function isPublicPath(pathname: string): boolean {
  return pathname === "/" || PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = isPublicPath(pathname);
  const isAuthenticated = request.cookies.get(AUTH_COOKIE_KEY)?.value === "1";

  if ((pathname === "/login" || pathname === "/register") && isAuthenticated) {
    const role = request.cookies.get(ROLE_COOKIE_KEY)?.value;
    const dest = role ? getDefaultRouteForRole(decodeURIComponent(role)) : "/eaf/prediction";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // Protect all platform / EAF routes — require login
  if (!isPublic && !isAuthenticated) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
