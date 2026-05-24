import {
  Keypair,
  VersionedTransaction,
  type Connection,
} from "@solana/web3.js";
import bs58 from "bs58";

const PUMPPORTAL_LOCAL_URL = "https://pumpportal.fun/api/trade-local";

export interface BuyParams {
  mint: string;
  solAmount: number;
  slippagePct?: number;
  priorityFeeSol?: number;
}

export interface BuyResult {
  signature: string;
}

/**
 * Buy `solAmount` worth of `mint` via pump.fun (PumpPortal Local Transaction API).
 *
 * PumpPortal returns a partially-built versioned transaction; we sign with the
 * treasury keypair and submit it ourselves. This keeps the secret key
 * server-side and lets us pick our own RPC.
 */
export async function pumpfunBuy(
  connection: Connection,
  treasury: Keypair,
  params: BuyParams,
): Promise<BuyResult> {
  const slippage = params.slippagePct ?? Number(process.env.PUMP_SLIPPAGE_PCT ?? "10");
  const priorityFee =
    params.priorityFeeSol ?? Number(process.env.PUMP_PRIORITY_FEE_SOL ?? "0.0005");

  const res = await fetch(PUMPPORTAL_LOCAL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      publicKey: treasury.publicKey.toBase58(),
      action: "buy",
      mint: params.mint,
      amount: params.solAmount,
      denominatedInSol: "true",
      slippage,
      priorityFee,
      pool: "auto",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PumpPortal buy failed (${res.status}): ${text || res.statusText}`);
  }

  const buf = new Uint8Array(await res.arrayBuffer());
  const tx = VersionedTransaction.deserialize(buf);
  tx.sign([treasury]);

  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });

  const conf = await connection.confirmTransaction(sig, "confirmed");
  if (conf.value.err) {
    throw new Error(`PumpPortal buy tx failed: ${JSON.stringify(conf.value.err)}`);
  }

  return { signature: sig };
}

// Avoid "unused import" if a consumer never imports bs58; re-export so the
// treasury-key parsing helper has a single home.
export { bs58 };
