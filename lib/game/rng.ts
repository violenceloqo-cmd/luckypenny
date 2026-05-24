// Browser-safe seeded RNG + slot computation.
// MUST stay byte-identical with lib/game/outcome.ts so the client renders the
// same path the server pre-rolled.

import { BOARD_ROWS, MULTIPLIERS, type SlotIndex } from "./multipliers";

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

/**
 * SHA-256 of `seed`, hex-encoded. Uses Web Crypto so works in browser + node.
 */
export async function sha256Hex(seed: string): Promise<string> {
  const enc = new TextEncoder().encode(seed);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const bytes = new Uint8Array(buf);
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

export function seedToUint32FromHex(hex: string): number {
  return parseInt(hex.slice(0, 8), 16) >>> 0;
}

export interface ClientOutcome {
  slotIndex: SlotIndex;
  multiplier: number;
  bits: number[];
}

/**
 * Given the seed string broadcast by the server, deterministically derive
 * the same outcome that the server computed.
 */
export async function outcomeFromSeed(seed: string): Promise<ClientOutcome> {
  const hex = await sha256Hex(seed);
  const rng = mulberry32(seedToUint32FromHex(hex));

  const bits: number[] = new Array(BOARD_ROWS);
  let slot = 0;
  for (let i = 0; i < BOARD_ROWS; i++) {
    const bit = rng() < 0.5 ? 0 : 1;
    bits[i] = bit;
    slot += bit;
  }
  return { slotIndex: slot, multiplier: MULTIPLIERS[slot], bits };
}
