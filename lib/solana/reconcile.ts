import type { ParsedInstruction, PartiallyDecodedInstruction } from "@solana/web3.js";

import { supabaseAdmin } from "@/lib/supabase/server";

import { burnTokens, readTokenBalance, tokenDeltaFromTx } from "./burn";
import { getConnection, getTokenMint, getTreasuryKeypair } from "./treasury";

/**
 * Heal drops stuck in `bought` — the buy landed but the process died before
 * the burn was recorded (function timeout, server restart).
 *
 * For each stuck drop: if a burn of exactly its amount already landed on-chain,
 * record it; otherwise burn it now. Either way the row ends `burned`, so the
 * on-chain record and the site agree that every buy was burned.
 */

export interface ReconcileResult {
  id: string;
  outcome: "recorded" | "burned" | "failed" | "skipped";
  detail: string;
}

interface StuckRow {
  id: string;
  buy_sig: string;
}

const CLAIM = "reconciling";

/** Signatures of burns of `mint` for exactly `amount`, newer than `afterSig`, oldest first. */
async function findBurnSigs(afterSig: string, amount: bigint): Promise<string[]> {
  const connection = getConnection();
  const owner = getTreasuryKeypair().publicKey;
  const mint = getTokenMint().toBase58();
  const sigs = await connection.getSignaturesForAddress(owner, { until: afterSig, limit: 100 });
  const found: string[] = [];
  for (const s of sigs.reverse()) {
    if (s.err) continue;
    const tx = await connection.getParsedTransaction(s.signature, { maxSupportedTransactionVersion: 0 });
    const ixs: (ParsedInstruction | PartiallyDecodedInstruction)[] = [
      ...(tx?.transaction.message.instructions ?? []),
      ...(tx?.meta?.innerInstructions?.flatMap((i) => i.instructions) ?? []),
    ];
    const burnsIt = ixs.some((ix) => {
      if (!("parsed" in ix)) return false;
      const { type, info } = ix.parsed as { type?: string; info?: Record<string, unknown> };
      if (type !== "burnChecked" && type !== "burn") return false;
      if (info?.mint !== mint) return false;
      const raw = type === "burnChecked" ? (info.tokenAmount as { amount?: string })?.amount : info.amount;
      return raw === amount.toString();
    });
    if (burnsIt) found.push(s.signature);
  }
  return found;
}

async function reconcileOne(row: StuckRow): Promise<ReconcileResult> {
  const connection = getConnection();
  const treasury = getTreasuryKeypair();
  const mint = getTokenMint();

  const delta = await tokenDeltaFromTx(connection, row.buy_sig, treasury.publicKey, mint);
  if (delta === null || delta <= 0n) {
    await supabaseAdmin
      .from("drops")
      .update({ status: "failed", error: "Reconcile: buy delivered no tokens (or tx not found)" })
      .eq("id", row.id);
    return { id: row.id, outcome: "failed", detail: "buy delivered no tokens" };
  }

  // A burn that landed after the process died: record it, unless another row owns it.
  const candidates = await findBurnSigs(row.buy_sig, delta);
  if (candidates.length > 0) {
    const { data: taken } = await supabaseAdmin.from("drops").select("burn_sig").in("burn_sig", candidates);
    const used = new Set((taken ?? []).map((t) => t.burn_sig as string));
    const burnSig = candidates.find((c) => !used.has(c));
    if (burnSig) {
      await supabaseAdmin
        .from("drops")
        .update({ status: "burned", burn_sig: burnSig, tokens_burned: delta.toString(), error: null })
        .eq("id", row.id);
      return { id: row.id, outcome: "recorded", detail: `burn already on-chain: ${burnSig}` };
    }
  }

  // Never burned: burn it now. Tokens are fungible, so burning this row's
  // amount leaves any in-flight drop's tokens for that drop's own burn.
  const held = await readTokenBalance(connection, treasury.publicKey, mint);
  if (held < delta) {
    await supabaseAdmin
      .from("drops")
      .update({
        status: "failed",
        error: `Reconcile: needs ${delta} raw tokens to burn but treasury holds ${held} — check the treasury on Solscan`,
      })
      .eq("id", row.id);
    return { id: row.id, outcome: "failed", detail: `treasury holds ${held} < ${delta}` };
  }

  const burn = await burnTokens(connection, treasury, mint, delta);
  await supabaseAdmin
    .from("drops")
    .update({ status: "burned", burn_sig: burn.signature, tokens_burned: delta.toString(), error: null })
    .eq("id", row.id);
  return { id: row.id, outcome: "burned", detail: burn.signature };
}

/**
 * 5 min is past the drop route's 60s maxDuration plus a blockhash's ~90s life,
 * so a row this old can't still have a live burn in flight.
 */
export async function reconcileStuckDrops({ olderThanMs = 5 * 60_000 } = {}): Promise<ReconcileResult[]> {
  const cutoff = new Date(Date.now() - olderThanMs).toISOString();
  const { data: rows, error } = await supabaseAdmin
    .from("drops")
    .select("id, buy_sig")
    .eq("status", "bought")
    .is("burn_sig", null)
    .is("error", null)
    .not("buy_sig", "is", null)
    .lt("updated_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(10);
  if (error) throw new Error(`reconcile query failed: ${error.message}`);

  const results: ReconcileResult[] = [];
  for (const row of (rows ?? []) as StuckRow[]) {
    // Claim the row so two reconcilers can never burn the same drop twice.
    const { data: claimed } = await supabaseAdmin
      .from("drops")
      .update({ error: CLAIM })
      .eq("id", row.id)
      .eq("status", "bought")
      .is("error", null)
      .select("id");
    if (!claimed?.length) {
      results.push({ id: row.id, outcome: "skipped", detail: "claimed by another reconciler" });
      continue;
    }
    try {
      results.push(await reconcileOne(row));
    } catch (e) {
      // Release the claim so the next run retries.
      await supabaseAdmin.from("drops").update({ error: null }).eq("id", row.id).eq("error", CLAIM);
      results.push({ id: row.id, outcome: "skipped", detail: (e as Error).message.slice(0, 200) });
    }
  }
  return results;
}
