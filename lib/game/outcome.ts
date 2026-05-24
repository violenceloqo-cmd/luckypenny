import { createHash } from "node:crypto";

import { BOARD_ROWS, MULTIPLIERS, type SlotIndex } from "./multipliers";

// ─────────────────────────────────────────────────────────────────────────────
// Provably-fair RNG. Mulberry32 over a seed derived from sha256.
// Same seed string ⇒ same number stream, so server + every client agree.
// ─────────────────────────────────────────────────────────────────────────────

export function seedToUint32(seed: string): number {
  const hex = createHash("sha256").update(seed).digest("hex").slice(0, 8);
  return parseInt(hex, 16) >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface OutcomeInput {
  serverSeed: string;
  username: string;
  nonce: number | bigint;
}

export interface Outcome {
  seed: string;
  seedHash: string;
  slotIndex: SlotIndex;
  multiplier: number;
  /** Sequence of L/R bits, length === BOARD_ROWS. 0 = left, 1 = right. */
  bits: number[];
}

function buildSeed({ serverSeed, username, nonce }: OutcomeInput): string {
  return `${serverSeed}:${username}:${nonce.toString()}`;
}

/**
 * Compute a deterministic Plinko outcome.
 *
 * The seed is hashed and passed to a Mulberry32 PRNG; one number per row picks
 * a left/right peg deflection. The final slot index is just the count of right
 * deflections (0..BOARD_ROWS).
 */
export function computeOutcome(input: OutcomeInput): Outcome {
  const seed = buildSeed(input);
  const seedHash = createHash("sha256").update(seed).digest("hex");
  const rng = mulberry32(seedToUint32(seed));

  const bits: number[] = new Array(BOARD_ROWS);
  let slot = 0;
  for (let i = 0; i < BOARD_ROWS; i++) {
    const bit = rng() < 0.5 ? 0 : 1;
    bits[i] = bit;
    slot += bit;
  }

  return {
    seed,
    seedHash,
    slotIndex: slot,
    multiplier: MULTIPLIERS[slot],
    bits,
  };
}

/**
 * Same algorithm but starting from a raw seed string (used by the client when
 * it receives the seed via realtime — it doesn't know serverSeed/nonce
 * separately, only the composed value).
 */
export function computeOutcomeFromSeed(seed: string): Outcome {
  const seedHash = createHash("sha256").update(seed).digest("hex");
  const rng = mulberry32(seedToUint32(seed));
  const bits: number[] = new Array(BOARD_ROWS);
  let slot = 0;
  for (let i = 0; i < BOARD_ROWS; i++) {
    const bit = rng() < 0.5 ? 0 : 1;
    bits[i] = bit;
    slot += bit;
  }
  return { seed, seedHash, slotIndex: slot, multiplier: MULTIPLIERS[slot], bits };
}
