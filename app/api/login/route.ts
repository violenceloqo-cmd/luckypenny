import { NextResponse } from "next/server";

import { setSessionCookie, signSession } from "@/lib/auth/session";
import { validateUsername } from "@/lib/auth/username";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const username = (body as { username?: unknown })?.username;
  const check = validateUsername(username);
  if (!check.ok || !check.normalized) {
    return NextResponse.json({ error: check.reason ?? "Invalid username" }, { status: 400 });
  }

  // Upsert: insert if new, otherwise re-use existing row. Username is unique citext,
  // so two different casings collapse to the same user.
  const { data: existing, error: selErr } = await supabaseAdmin
    .from("users")
    .select("id, username")
    .ilike("username", check.normalized)
    .maybeSingle();

  if (selErr) {
    return NextResponse.json({ error: selErr.message }, { status: 500 });
  }

  let userId: string;
  let storedUsername: string;

  if (existing) {
    userId = existing.id as string;
    storedUsername = existing.username as string;
  } else {
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("users")
      .insert({ username: check.normalized })
      .select("id, username")
      .single();

    if (insErr || !inserted) {
      return NextResponse.json(
        { error: insErr?.message ?? "Failed to create user" },
        { status: 500 },
      );
    }
    userId = inserted.id as string;
    storedUsername = inserted.username as string;
  }

  const token = await signSession({ uid: userId, username: storedUsername });
  await setSessionCookie(token);

  return NextResponse.json({ uid: userId, username: storedUsername });
}
