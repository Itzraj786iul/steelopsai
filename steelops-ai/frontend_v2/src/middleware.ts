import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AUTH_COOKIE_KEY } from "@/lib/constants";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/eaf"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic =
    pathname === "/" || PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isAuthenticated = request.cookies.get(AUTH_COOKIE_KEY)?.value === "1";

  if (isPublic && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!isPublic && !pathname.startsWith("/unauthorized") && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    const nextPath = pathname === "/" ? "/dashboard" : pathname;
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
  } 

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
