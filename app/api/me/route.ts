import { NextResponse } from "next/server";

import { clearSessionCookie, getSession } from "@/lib/auth/session";
import { getSupabaseReader } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ user: null, cooldownRemainingMs: 0, cooldownSeconds: 60 });
  }

  const reader = getSupabaseReader();
  const { data: configRow } = await reader
    .from("config")
    .select("cooldown_seconds")
    .eq("id", 1)
    .maybeSingle();

  const cooldownSec = (configRow?.cooldown_seconds as number | undefined) ?? 60;

  const { data: user } = await reader
    .from("users")
    .select("id, username, last_drop_at")
    .eq("id", sess.uid)
    .maybeSingle();

  if (!user) {
    await clearSessionCookie();
    return NextResponse.json({ user: null, cooldownRemainingMs: 0 });
  }

  let cooldownRemainingMs = 0;
  if (user.last_drop_at) {
    const last = new Date(user.last_drop_at as string).getTime();
    const elapsed = Date.now() - last;
    cooldownRemainingMs = Math.max(0, cooldownSec * 1000 - elapsed);
  }

  return NextResponse.json({
    user: { uid: user.id, username: user.username },
    cooldownRemainingMs,
    cooldownSeconds: cooldownSec,
  });
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
