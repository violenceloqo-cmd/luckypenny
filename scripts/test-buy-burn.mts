/**
 * Direct mainnet buy+burn smoke test (no Plinko UI).
 *
 * Usage:
 *   npx tsx scripts/test-buy-burn.mts [solAmount]
 *
 * Default solAmount: 0.01
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { buyAndBurn } from "../lib/solana/buyAndBurn";
import { getConnection, getTreasuryKeypair } from "../lib/solana/treasury";

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i === -1) continue;
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    /* optional */
  }
}

loadEnv();

const solAmount = Number(process.argv[2] ?? "0.01");
if (!Number.isFinite(solAmount) || solAmount <= 0) {
  console.error("Usage: npx tsx scripts/test-buy-burn.mts [solAmount]");
  process.exit(1);
}

const treasury = getTreasuryKeypair();
const connection = getConnection();
const bal = await connection.getBalance(treasury.publicKey);

console.log("Treasury:", treasury.publicKey.toBase58());
console.log("Balance:", (bal / LAMPORTS_PER_SOL).toFixed(4), "SOL");
console.log("Mint:", process.env.PUMPFUN_TOKEN_MINT);
console.log("Cluster:", process.env.SOLANA_CLUSTER);
console.log("Testing buy+burn for", solAmount, "SOL...\n");

const res = await buyAndBurn({ solAmount });
console.log(JSON.stringify(res, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));
process.exit(res.ok && !res.skipped ? 0 : 1);
