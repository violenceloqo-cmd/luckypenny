import type { Connection } from "@solana/web3.js";

const REBROADCAST_MS = 2_000;

/**
 * Send a signed transaction and keep re-sending the same bytes every 2s until
 * it confirms or its blockhash expires.
 *
 * A single `sendRawTransaction` is fire-and-hope: under load the leader drops
 * it and nothing retries until the blockhash dies ~60–90s later. Re-sending
 * identical bytes is safe — same signature, so it can land at most once.
 */
export async function sendAndConfirm(
  connection: Connection,
  raw: Uint8Array,
  blockhash: string,
  lastValidBlockHeight: number,
): Promise<string> {
  const send = () => connection.sendRawTransaction(raw, { skipPreflight: true, maxRetries: 0 });
  const signature = await send();

  let settled = false;
  const confirmation = connection
    .confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed")
    .finally(() => {
      settled = true;
    });

  void (async () => {
    while (!settled) {
      await new Promise((r) => setTimeout(r, REBROADCAST_MS));
      if (!settled) await send().catch(() => undefined);
    }
  })();

  const conf = await confirmation;
  if (conf.value.err) throw new Error(`tx ${signature} failed: ${JSON.stringify(conf.value.err)}`);
  return signature;
}
