import { randomBytes } from "node:crypto";

import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { buyback } from "@/lib/evm/buyback";
import { computeOutcome } from "@/lib/game/outcome";
import { describeSupabaseError, supabaseAdmin, supabaseErrorStatus } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Drops do real on-chain work; never cache or render statically.
export const dynamic = "force-dynamic";
// Quote + approve + swap + receipt = ~5–15s. Hobby plan caps at 60.
export const maxDuration = 60;

interface ConfigRow {
  drop_cost_usd: string | number;
  cooldown_seconds: number;
  max_usd_per_drop: string | number;
}

export async function POST() {
  try {
    return await handlePost();
  } catch (e) {
    return NextResponse.json({ error: describeSupabaseError(e) }, { status: 503 });
  }
}

async function handlePost() {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: configRow, error: cfgErr } = await supabaseAdmin
    .from("config")
    .select("drop_cost_usd, cooldown_seconds, max_usd_per_drop")
    .eq("id", 1)
    .single();

  if (cfgErr || !configRow) {
    return NextResponse.json(
      { error: cfgErr ? describeSupabaseError(cfgErr) : "Config missing" },
      { status: cfgErr ? supabaseErrorStatus(cfgErr) : 500 },
    );
  }

  const config = configRow as ConfigRow;
  const dropCost = Number(config.drop_cost_usd);
  const cooldownSec = Number(config.cooldown_seconds);

  // Atomic cooldown claim — if this returns claimed=false the user is rate-limited.
  const { data: claimRows, error: claimErr } = await supabaseAdmin.rpc("claim_drop", {
    p_user_id: sess.uid,
    p_cooldown_seconds: cooldownSec,
  });

  if (claimErr) {
    return NextResponse.json({ error: claimErr.message }, { status: 500 });
  }
  const claim = (claimRows as Array<{ claimed: boolean; remaining_ms: number }> | null)?.[0];
  if (!claim?.claimed) {
    return NextResponse.json(
      {
        error: "Cooldown active",
        cooldownRemainingMs: claim?.remaining_ms ?? cooldownSec * 1000,
      },
      { status: 429 },
    );
  }

  const serverSeed = randomBytes(16).toString("hex");
  const nonce = Date.now();
  const outcome = computeOutcome({ serverSeed, username: sess.username, nonce });
  const usdOut = +(dropCost * outcome.multiplier).toFixed(6);

  // Insert pending drop FIRST — this is what the live feed picks up.
  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("drops")
    .insert({
      user_id: sess.uid,
      username: sess.username,
      server_seed: outcome.seed,
      client_nonce: nonce,
      seed_hash: outcome.seedHash,
      slot_index: outcome.slotIndex,
      multiplier: outcome.multiplier,
      usd_in: dropCost,
      usd_out: usdOut,
      status: "pending",
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    return NextResponse.json(
      { error: insErr?.message ?? "Failed to record drop" },
      { status: 500 },
    );
  }

  const dropId = inserted.id as string;

  // Run the buyback after the response. `waitUntil` keeps the serverless function
  // alive on Vercel (and is a no-op-friendly wrapper locally) so the swap isn't
  // killed when we `return`. Clients pick up the status flip via Supabase
  // Realtime — no need to await on the HTTP response.
  waitUntil((async () => {
    const res = await buyback({ usdAmount: usdOut });
    if (res.ok && res.skipped) {
      await supabaseAdmin
        .from("drops")
        .update({ status: "skipped", error: res.reason })
        .eq("id", dropId);
    } else if (res.ok) {
      await supabaseAdmin
        .from("drops")
        .update({
          status: "bought",
          buy_tx: res.buyTx,
          tokens_bought: res.tokensBought.toString(),
        })
        .eq("id", dropId);
    } else {
      await supabaseAdmin
        .from("drops")
        .update({
          status: "failed",
          buy_tx: res.buyTx ?? null,
          error: res.error,
        })
        .eq("id", dropId);
    }
  })());

  return NextResponse.json({
    dropId,
    seed: outcome.seed,
    slotIndex: outcome.slotIndex,
    multiplier: outcome.multiplier,
    usdIn: dropCost,
    usdOut,
    cooldownSeconds: cooldownSec,
  });
}
