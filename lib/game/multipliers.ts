// Lucky-Penny themed multipliers. 12 rows of pegs ⇒ 13 slots at the bottom.
// Symmetric: rare 100x edges (Pot of Gold), modest center.
//
// IMPORTANT: changing this array also requires updating BOARD_ROWS if the count
// of slots changes, since slots = rows + 1.
export const BOARD_ROWS = 12;

export const MULTIPLIERS: readonly number[] = [
  100, 10, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 10, 100,
] as const;

if (MULTIPLIERS.length !== BOARD_ROWS + 1) {
  throw new Error(
    `MULTIPLIERS length (${MULTIPLIERS.length}) must equal BOARD_ROWS + 1 (${BOARD_ROWS + 1})`,
  );
}

export type SlotIndex = number; // 0..MULTIPLIERS.length-1

export function multiplierFor(slot: SlotIndex): number {
  if (slot < 0 || slot >= MULTIPLIERS.length) {
    throw new Error(`slot out of range: ${slot}`);
  }
  return MULTIPLIERS[slot];
}

// Slot indices considered "big wins" — used by the UI for confetti/leprechaun cameo.
export function isBigWin(slot: SlotIndex): boolean {
  return multiplierFor(slot) >= 10;
}
