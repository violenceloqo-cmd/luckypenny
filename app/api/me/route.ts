import { NextResponse } from "next/server";

import { clearSessionCookie, getSession } from "@/lib/auth/session";
import { describeSupabaseError, getSupabaseReader } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    return await handleGet();
  } catch (e) {
    return NextResponse.json({ error: describeSupabaseError(e) }, { status: 503 });
  }
}

async function handleGet() {
  const reader = getSupabaseReader();
  // Read config first so the drop cost is available to signed-out visitors too —
  // the DropButton renders it, and hardcoding it there let it drift from the DB.
  const { data: configRow } = await reader
    .from("config")
    .select("cooldown_seconds, drop_cost_usd")
    .eq("id", 1)
    .maybeSingle();

  const cooldownSec = (configRow?.cooldown_seconds as number | undefined) ?? 60;
  const dropCostUsd = Number(configRow?.drop_cost_usd ?? 1);

  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({
      user: null,
      cooldownRemainingMs: 0,
      cooldownSeconds: cooldownSec,
      dropCostUsd,
    });
  }

  const { data: user } = await reader
    .from("users")
    .select("id, username, last_drop_at")
    .eq("id", sess.uid)
    .maybeSingle();

  if (!user) {
    await clearSessionCookie();
    return NextResponse.json({ user: null, cooldownRemainingMs: 0, cooldownSeconds: cooldownSec, dropCostUsd });
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
    dropCostUsd,
  });
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
