/**
 * Read-only preflight: checks the treasury, mint and RPC a drop depends on.
 * Sends nothing.
 *
 *   npm run preflight
 */
import { getMint } from "@solana/spl-token";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { getTokenProgramForMint, readTokenBalance } from "../lib/solana/burn";
import {
  estimateBuyAndBurnLamports,
  getCluster,
  getConnection,
  getMaxSolPerDrop,
  getTokenMint,
  getTreasuryKeypair,
  isDryRun,
} from "../lib/solana/treasury";

const connection = getConnection();
const treasury = getTreasuryKeypair();
const mint = getTokenMint();

const [lamports, programId, version] = await Promise.all([
  connection.getBalance(treasury.publicKey, "confirmed"),
  getTokenProgramForMint(connection, mint),
  connection.getVersion(),
]);
const mintInfo = await getMint(connection, mint, "confirmed", programId);
const held = await readTokenBalance(connection, treasury.publicKey, mint);

const cap = getMaxSolPerDrop();
const jackpotLamports = estimateBuyAndBurnLamports(cap);

console.log("Cluster:        ", getCluster(), `(solana-core ${version["solana-core"]})`);
console.log("Dry run:        ", isDryRun() ? "YES — buys are simulated, nothing is sent" : "no — drops spend real SOL");
console.log("Treasury:       ", treasury.publicKey.toBase58());
console.log("SOL balance:    ", (lamports / LAMPORTS_PER_SOL).toFixed(4));
console.log("Mint:           ", mint.toBase58());
console.log("Token program:  ", programId.toBase58());
console.log("Decimals:       ", mintInfo.decimals);
console.log("Supply (raw):   ", mintInfo.supply.toString());
console.log("Unburned held:  ", held.toString(), held > 0n ? "← run `npm run burn:sweep`" : "");
console.log("Per-drop cap:   ", cap, "SOL");
console.log(
  "Max-drop funded:",
  lamports >= jackpotLamports
    ? "yes"
    : `NO — a ${cap} SOL drop needs ~${(jackpotLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL and would fail`,
);
