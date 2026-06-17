import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

// Super-admin: list everyone who signed up, with contact details + how many
// mocks/practice questions they've done. Uses the service-role client (bypasses
// RLS) so it MUST stay protected — see the admin-cookie check below.
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  // Protect: when ADMIN_PASSWORD is set, require the admin cookie (the rest of
  // the admin area uses the same token). If it's unset the admin area is "open".
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword) {
    const token = request.cookies.get("admin_token")?.value;
    if (token !== adminPassword) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY is not configured. Add it to your env (Supabase → Settings → API → service_role key) to view users.",
      },
      { status: 503 }
    );
  }

  // 1) All auth users (id, email, phone, created/last-login).
  const authUsers: {
    id: string;
    email?: string;
    phone?: string;
    created_at?: string;
    last_sign_in_at?: string | null;
    user_metadata?: Record<string, unknown>;
  }[] = [];
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) {
      return NextResponse.json(
        { error: `Could not list users: ${error.message}` },
        { status: 500 }
      );
    }
    authUsers.push(...(data.users as typeof authUsers));
    if (data.users.length < 1000) break;
  }

  // 2) Profile names/phones (service role bypasses RLS).
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, phone");
  const profileById = new Map(
    (profiles ?? []).map((p: Record<string, unknown>) => [String(p.id), p])
  );

  // 3) Mock + practice tallies per user.
  const { data: mocks } = await supabaseAdmin
    .from("mock_results")
    .select("user_id, marks, max_marks, submitted_at");
  const { data: practice } = await supabaseAdmin
    .from("practice_attempts")
    .select("user_id, is_correct");

  type Tally = {
    mocks: number;
    lastMock: string | null;
    sumPct: number;
    practice: number;
    practiceCorrect: number;
  };
  const tally = new Map<string, Tally>();
  const t = (id: string) => {
    let v = tally.get(id);
    if (!v) {
      v = { mocks: 0, lastMock: null, sumPct: 0, practice: 0, practiceCorrect: 0 };
      tally.set(id, v);
    }
    return v;
  };
  for (const m of mocks ?? []) {
    const v = t(String((m as Record<string, unknown>).user_id));
    v.mocks += 1;
    const marks = Number((m as Record<string, unknown>).marks) || 0;
    const max = Number((m as Record<string, unknown>).max_marks) || 0;
    v.sumPct += max > 0 ? Math.max(0, (marks / max) * 100) : 0;
    const sub = (m as Record<string, unknown>).submitted_at as string | null;
    if (sub && (!v.lastMock || sub > v.lastMock)) v.lastMock = sub;
  }
  for (const p of practice ?? []) {
    const v = t(String((p as Record<string, unknown>).user_id));
    v.practice += 1;
    if ((p as Record<string, unknown>).is_correct) v.practiceCorrect += 1;
  }

  const users = authUsers
    .map((u) => {
      const prof = profileById.get(u.id);
      const v = tally.get(u.id);
      const name =
        (prof?.full_name as string) ||
        (u.user_metadata?.full_name as string) ||
        (u.user_metadata?.name as string) ||
        "";
      return {
        id: u.id,
        name,
        email: u.email ?? "",
        phone: (prof?.phone as string) || u.phone || "",
        createdAt: u.created_at ?? null,
        lastSignIn: u.last_sign_in_at ?? null,
        mocks: v?.mocks ?? 0,
        avgMockPct: v && v.mocks ? Math.round(v.sumPct / v.mocks) : 0,
        lastMock: v?.lastMock ?? null,
        practice: v?.practice ?? 0,
        practiceAccuracy:
          v && v.practice
            ? Math.round((v.practiceCorrect / v.practice) * 100)
            : 0,
      };
    })
    .sort((a, b) => (b.lastSignIn ?? "").localeCompare(a.lastSignIn ?? ""));

  return NextResponse.json({
    total: users.length,
    everSignedIn: users.filter((u) => u.lastSignIn).length,
    users,
  });
}
