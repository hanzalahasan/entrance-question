import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin/login")) return NextResponse.next();

  const adminPassword = process.env.ADMIN_PASSWORD;

  // No password configured → open access (dev / demo mode)
  if (!adminPassword) return NextResponse.next();

  const token = request.cookies.get("admin_token")?.value;

  if (token !== adminPassword) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
