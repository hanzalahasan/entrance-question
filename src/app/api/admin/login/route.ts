import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || password === adminPassword) {
    const response = NextResponse.json({ ok: true });
    response.cookies.set("admin_token", adminPassword ?? "open", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  }

  return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
}
