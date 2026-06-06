import { NextResponse } from "next/server";

import { getSupabaseReader } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Read-only path: use the anon reader (RLS permits public select).
  const reader = getSupabaseReader();
  const { data: drops } = await reader
    .from("drops")
    .select(
      "id, username, slot_index, multiplier, sol_in, sol_out, status, buy_sig, burn_sig, tokens_burned, error, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: stats } = await reader
    .from("drops")
    .select("sol_out, multiplier, tokens_burned, status");

  let totalSolOut = 0;
  let totalTokensBurned = 0n;
  let biggest = 0;
  for (const d of stats ?? []) {
    const m = Number(d.multiplier);
    if (m > biggest) biggest = m;
    if (d.status === "burned" || d.status === "skipped") {
      totalSolOut += Number(d.sol_out);
    }
    if (d.tokens_burned) {
      try {
        totalTokensBurned += BigInt(d.tokens_burned as string);
      } catch {
        // ignore parse errors on legacy rows
      }
    }
  }

  return NextResponse.json({
    drops: drops ?? [],
    stats: {
      totalDrops: stats?.length ?? 0,
      totalSolOut,
      totalTokensBurned: totalTokensBurned.toString(),
      biggestMultiplier: biggest,
    },
  });
}
