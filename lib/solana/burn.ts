import {
  createBurnCheckedInstruction,
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
  Transaction,
  type Connection,
  type Keypair,
  type PublicKey,
} from "@solana/web3.js";

import { sendAndConfirm } from "./send";
import { getBurnPriorityFeeSol } from "./treasury";

export interface BurnResult {
  signature: string;
  amount: bigint;
}

/** A BurnChecked costs ~5k CU; the limit bounds what the priority fee can cost. */
const BURN_COMPUTE_UNITS = 40_000;

/**
 * Per-CU price that makes the burn pay the same total priority fee as the buy.
 * The burn must land as fast as the buy did: a lowball fee here once left a
 * drop's tokens unburned for 83s while the leader kept dropping the tx.
 */
function burnPriorityMicroLamports(): number {
  const sol = getBurnPriorityFeeSol();
  return Math.floor((sol * LAMPORTS_PER_SOL * 1_000_000) / BURN_COMPUTE_UNITS);
}

/** pump.fun mints use Token-2022; older SPL tokens use the legacy program. */
export async function getTokenProgramForMint(connection: Connection, mint: PublicKey): Promise<PublicKey> {
  const info = await connection.getAccountInfo(mint);
  if (!info) throw new Error(`mint account not found: ${mint.toBase58()}`);
  if (info.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID;
  if (info.owner.equals(TOKEN_PROGRAM_ID)) return TOKEN_PROGRAM_ID;
  throw new Error(`unsupported mint owner: ${info.owner.toBase58()}`);
}

/** Raw-unit balance of `owner`'s associated token account for `mint` (0 if absent). */
export async function readTokenBalance(connection: Connection, owner: PublicKey, mint: PublicKey): Promise<bigint> {
  const programId = await getTokenProgramForMint(connection, mint);
  const ata = await getAssociatedTokenAddress(mint, owner, false, programId);
  try {
    const acct = await getAccount(connection, ata, "confirmed", programId);
    return acct.amount;
  } catch {
    return 0n;
  }
}

/**
 * Exactly how many raw tokens transaction `signature` delivered to `owner`,
 * read from the transaction's own pre/post token balances.
 *
 * This is what makes concurrent drops safe: diffing the live ATA balance would
 * let one drop see — and burn — tokens that another drop bought a moment later.
 * Returns null if the RPC hasn't indexed the transaction yet.
 */
export async function tokenDeltaFromTx(
  connection: Connection,
  signature: string,
  owner: PublicKey,
  mint: PublicKey,
  attempts = 6,
): Promise<bigint | null> {
  const o = owner.toBase58();
  const m = mint.toBase58();
  for (let i = 0; i < attempts; i++) {
    const tx = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (tx?.meta) {
      const pick = (list: typeof tx.meta.preTokenBalances) =>
        list?.find((b) => b.mint === m && b.owner === o)?.uiTokenAmount.amount ?? "0";
      return BigInt(pick(tx.meta.postTokenBalances)) - BigInt(pick(tx.meta.preTokenBalances));
    }
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  return null;
}

/**
 * Permanently destroy `amount` raw units from the treasury ATA via SPL
 * `BurnChecked`. This lowers the mint's total supply on-chain and shows as a
 * burn on Solscan — unlike sending to an "incinerator" wallet, which only hides
 * the tokens.
 */
export async function burnTokens(
  connection: Connection,
  treasury: Keypair,
  mint: PublicKey,
  amount: bigint,
): Promise<BurnResult> {
  if (amount <= 0n) throw new Error("burn amount must be > 0");

  const programId = await getTokenProgramForMint(connection, mint);
  const mintInfo = await getMint(connection, mint, "confirmed", programId);
  const fromAta = await getAssociatedTokenAddress(mint, treasury.publicKey, false, programId);

  const tx = new Transaction()
    .add(ComputeBudgetProgram.setComputeUnitLimit({ units: BURN_COMPUTE_UNITS }))
    .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: burnPriorityMicroLamports() }))
    .add(
      createBurnCheckedInstruction(fromAta, mint, treasury.publicKey, amount, mintInfo.decimals, [], programId),
    );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = treasury.publicKey;
  tx.sign(treasury);

  const simulation = await connection.simulateTransaction(tx);
  if (simulation.value.err) {
    const logs = simulation.value.logs?.slice(-6).join(" | ") ?? "";
    throw new Error(`burn simulation failed: ${JSON.stringify(simulation.value.err)}${logs ? ` — ${logs}` : ""}`);
  }

  const signature = await sendAndConfirm(connection, tx.serialize(), blockhash, lastValidBlockHeight);

  return { signature, amount };
}
