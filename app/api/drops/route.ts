import { NextResponse } from "next/server";

import { describeSupabaseError, getSupabaseReader } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return await handleGet();
  } catch (e) {
    return NextResponse.json({ error: describeSupabaseError(e) }, { status: 503 });
  }
}

async function handleGet() {
  // Read-only path: use the anon reader (RLS permits public select).
  const reader = getSupabaseReader();
  const { data: drops } = await reader
    .from("drops")
    .select(
      "id, username, slot_index, multiplier, usd_in, usd_out, status, buy_tx, tokens_bought, error, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: stats } = await reader
    .from("drops")
    .select("usd_out, multiplier, tokens_bought, status");

  let totalUsdOut = 0;
  let totalTokensBought = 0n;
  let biggest = 0;
  for (const d of stats ?? []) {
    const m = Number(d.multiplier);
    if (m > biggest) biggest = m;
    if (d.status === "bought" || d.status === "skipped") {
      totalUsdOut += Number(d.usd_out);
    }
    if (d.tokens_bought) {
      try {
        totalTokensBought += BigInt(d.tokens_bought as string);
      } catch {
        // ignore parse errors on legacy rows
      }
    }
  }

  return NextResponse.json({
    drops: drops ?? [],
    stats: {
      totalDrops: stats?.length ?? 0,
      totalUsdOut,
      totalTokensBought: totalTokensBought.toString(),
      biggestMultiplier: biggest,
    },
  });
}
