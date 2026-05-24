// Deterministic Plinko path geometry.
//
// We deliberately don't use a real physics engine: matter-js's solver is
// floating-point sensitive and would produce *visually* different paths on
// different machines, which conflicts with "every viewer sees the same drop".
//
// Instead, given the L/R bits produced from the server seed, we synthesize a
// smooth path that hits the correct peg row-by-row and lands in the right
// slot. The ball animation walks this path frame-by-frame.

import { BOARD_ROWS, MULTIPLIERS } from "./multipliers";

export interface BoardLayout {
  rows: number;
  slots: number;
  /** Logical width of the board, in arbitrary units. */
  width: number;
  /** Logical height of the board, in arbitrary units. */
  height: number;
  /** Vertical spacing between peg rows. */
  rowSpacing: number;
  /** Horizontal spacing between adjacent pegs in the same row. */
  colSpacing: number;
  /** y-coordinate of the slot row (bottom). */
  slotY: number;
  /** y-coordinate where the ball starts. */
  startY: number;
  /** Radius of a peg (logical units). */
  pegRadius: number;
  /** Radius of the ball (logical units). */
  ballRadius: number;
}

export const SLOT_BIN_HEIGHT = 48;

export const DEFAULT_LAYOUT: BoardLayout = (() => {
  const rows = BOARD_ROWS;
  const slots = MULTIPLIERS.length;
  const colSpacing = 48;
  const rowSpacing = 38;
  // The bottom row of pegs has `rows + 1 = 13` pegs == `slots` pegs, spanning
  // `slots - 1` colSpacings. We leave one extra colSpacing as horizontal padding
  // so the slot bins (which sit *between* peg columns) fit inside the trapezoid.
  const width = (slots + 1) * colSpacing;
  const startY = 10;
  // Slot bins sit immediately under the last peg row — no empty band.
  const slotY = startY + rowSpacing * rows + SLOT_BIN_HEIGHT / 2 - 4;
  const height = slotY + SLOT_BIN_HEIGHT / 2 + 8;
  return {
    rows,
    slots,
    width,
    height,
    rowSpacing,
    colSpacing,
    slotY,
    startY,
    pegRadius: 4,
    ballRadius: 8,
  };
})();

/**
 * Centre x of peg (row, col), where row ∈ [0..rows-1] and col ∈ [0..row+1].
 * Row 0 has 2 pegs (col 0 and 1), row 1 has 3, etc.
 * Pegs are centered horizontally around layout.width / 2.
 */
export function pegX(layout: BoardLayout, row: number, col: number): number {
  const pegsInRow = row + 2;
  const totalSpan = (pegsInRow - 1) * layout.colSpacing;
  const leftX = layout.width / 2 - totalSpan / 2;
  return leftX + col * layout.colSpacing;
}

export function pegY(layout: BoardLayout, row: number): number {
  return layout.startY + (row + 1) * layout.rowSpacing;
}

export function slotX(layout: BoardLayout, slotIndex: number): number {
  const totalSpan = (layout.slots - 1) * layout.colSpacing;
  const leftX = layout.width / 2 - totalSpan / 2;
  return leftX + slotIndex * layout.colSpacing;
}

export interface PathPoint {
  x: number;
  y: number;
}

/**
 * Build the ball's anchor path: it starts above the top pegs, then for each
 * row deflects left/right based on bits, then drops into the chosen slot.
 *
 * After computing pegs, we deflect each peg position by ±pegRadius+ballRadius
 * on the appropriate side so the ball appears to *bounce off* the peg, not
 * teleport through it. The final segment goes from the last-row peg to the
 * slot's x.
 */
export function buildAnchors(
  layout: BoardLayout,
  bits: number[],
  finalSlot: number,
): PathPoint[] {
  const startX = layout.width / 2;
  const points: PathPoint[] = [{ x: startX, y: layout.startY }];

  let col = 0; // column index walked along the triangle
  for (let row = 0; row < bits.length; row++) {
    // The ball deflects against the peg at (row, col) when going left and
    // (row, col+1) when going right. We use the *middle* between those pegs
    // post-deflection as the anchor.
    const bit = bits[row];
    const nextCol = col + bit; // 0 left, 1 right
    col = nextCol;
    // Position between pegs at next row level: average peg positions to put
    // the ball in the gap that flows to the next row's deflection.
    const xLeftPeg = pegX(layout, row, nextCol);
    const xRightPeg = pegX(layout, row, nextCol + 1);
    // Anchor right below the peg row, slightly offset toward direction of travel
    const midX = (xLeftPeg + xRightPeg) / 2;
    points.push({ x: midX, y: pegY(layout, row) + layout.rowSpacing / 2 });
  }

  // Funnel into the slot: first to the top of the bin, then settle at the bottom.
  const targetX = slotX(layout, finalSlot);
  const binTopY = layout.slotY - SLOT_BIN_HEIGHT / 2;
  const binBottomY = layout.slotY + SLOT_BIN_HEIGHT / 2 - layout.ballRadius - 4;
  points.push({ x: targetX, y: binTopY });
  points.push({ x: targetX, y: binBottomY });

  return points;
}

/**
 * Sample the anchor path with a configurable number of frames using a small
 * "bounce" easing per segment so it feels like a real Plinko ball.
 *
 * Frames returned are timed for ~16ms/frame at 60fps. Each frame is an (x, y).
 */
export function samplePath(
  anchors: PathPoint[],
  framesPerSegment = 14,
): PathPoint[] {
  const out: PathPoint[] = [];
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    for (let f = 0; f < framesPerSegment; f++) {
      const t = f / framesPerSegment;
      // Vertical "bounce": parabola with peak at start (looks like dropping
      // and then falling with gravity into the next anchor).
      const x = a.x + (b.x - a.x) * t;
      // Quadratic ease-in vertically (gravity-like acceleration).
      const yEase = t * t;
      const y = a.y + (b.y - a.y) * yEase;
      out.push({ x, y });
    }
  }
  // Make sure we end exactly on the final anchor.
  out.push(anchors[anchors.length - 1]);
  return out;
}

export function totalDurationMs(framesPerSegment: number, anchorCount: number, fps = 60): number {
  const frames = framesPerSegment * (anchorCount - 1) + 1;
  return Math.round((frames / fps) * 1000);
}
