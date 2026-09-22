import { VersionedTransaction, type Connection, type Keypair } from "@solana/web3.js";

import { sendAndConfirm } from "./send";
import { getPumpPriorityFeeSol, getPumpSlippagePct } from "./treasury";

const PUMPPORTAL_LOCAL_URL = "https://pumpportal.fun/api/trade-local";

export interface BuyParams {
  mint: string;
  solAmount: number;
}

/**
 * Ask PumpPortal's Local Transaction API for an unsigned pump.fun buy, then sign
 * it with the treasury. The secret key never leaves the server and we submit
 * through our own RPC. `pool: "auto"` follows the token after it graduates off
 * the bonding curve to PumpSwap.
 */
export async function buildPumpfunBuy(treasury: Keypair, params: BuyParams): Promise<VersionedTransaction> {
  const res = await fetch(PUMPPORTAL_LOCAL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      publicKey: treasury.publicKey.toBase58(),
      action: "buy",
      mint: params.mint,
      amount: params.solAmount,
      denominatedInSol: "true",
      slippage: getPumpSlippagePct(),
      priorityFee: getPumpPriorityFeeSol(),
      pool: "auto",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PumpPortal buy failed (${res.status}): ${text || res.statusText}`);
  }

  const tx = VersionedTransaction.deserialize(new Uint8Array(await res.arrayBuffer()));
  tx.sign([treasury]);
  return tx;
}

/** Simulate a signed buy without sending it. Throws with the program logs on failure. */
export async function simulatePumpfunBuy(connection: Connection, tx: VersionedTransaction): Promise<void> {
  const sim = await connection.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true });
  if (sim.value.err) {
    const logs = sim.value.logs?.slice(-6).join(" | ") ?? "";
    throw new Error(`buy simulation failed: ${JSON.stringify(sim.value.err)}${logs ? ` — ${logs}` : ""}`);
  }
}

/** Send a signed buy and wait for `confirmed`. Returns the signature. */
export async function sendPumpfunBuy(connection: Connection, tx: VersionedTransaction): Promise<string> {
  const { lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  // Preflight once so a doomed buy (slippage, funds) fails fast with logs,
  // then rebroadcast until it lands.
  await simulatePumpfunBuy(connection, tx);
  return sendAndConfirm(connection, tx.serialize(), tx.message.recentBlockhash, lastValidBlockHeight);
}
