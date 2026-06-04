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
  Keypair,
  PublicKey,
  Transaction,
  type Connection,
} from "@solana/web3.js";

export interface BurnResult {
  signature: string;
  amount: bigint;
}

/** pump.fun mints use Token-2022; older SPL tokens use the legacy program. */
export async function getTokenProgramForMint(
  connection: Connection,
  mint: PublicKey,
): Promise<typeof TOKEN_PROGRAM_ID | typeof TOKEN_2022_PROGRAM_ID> {
  const info = await connection.getAccountInfo(mint);
  if (!info) throw new Error(`mint account not found: ${mint.toBase58()}`);
  if (info.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID;
  if (info.owner.equals(TOKEN_PROGRAM_ID)) return TOKEN_PROGRAM_ID;
  throw new Error(`unsupported mint owner: ${info.owner.toBase58()}`);
}

/**
 * Read the treasury's associated token account for `mint` and return the
 * current balance as a bigint (raw units, not human-readable).
 */
export async function readTokenBalance(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey,
): Promise<bigint> {
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
 * Permanently burn `amount` raw units from the treasury ATA via the SPL Token
 * program's `BurnChecked` instruction. This reduces mint supply on-chain and
 * shows as a burn on Solscan (unlike sending tokens to the incinerator wallet).
 *
 * Caller is responsible for figuring out the amount (typically: read balance
 * before pumpfunBuy, read after, burn the delta).
 */
export async function burnTokens(
  connection: Connection,
  treasury: Keypair,
  mint: PublicKey,
  amount: bigint,
): Promise<BurnResult> {
  if (amount <= 0n) {
    throw new Error("burn amount must be > 0");
  }

  const programId = await getTokenProgramForMint(connection, mint);
  const mintInfo = await getMint(connection, mint, "confirmed", programId);

  const fromAta = await getAssociatedTokenAddress(
    mint,
    treasury.publicKey,
    false,
    programId,
  );

  const tx = new Transaction();
  tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }));
  tx.add(
    createBurnCheckedInstruction(
      fromAta,
      mint,
      treasury.publicKey,
      amount,
      mintInfo.decimals,
      [],
      programId,
    ),
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = treasury.publicKey;
  tx.sign(treasury);

  const simulation = await connection.simulateTransaction(tx);
  if (simulation.value.err) {
    const logs = simulation.value.logs?.slice(-6).join(" | ") ?? "";
    throw new Error(
      `burn simulation failed: ${JSON.stringify(simulation.value.err)}${logs ? ` — ${logs}` : ""}`,
    );
  }

  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });
  const conf = await connection.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  if (conf.value.err) {
    throw new Error(`burn tx failed: ${JSON.stringify(conf.value.err)}`);
  }

  return { signature: sig, amount };
}
