/**
 * Robinhood-style feather mark, normalized to roughly [-1, 1] around (0, 0)
 * with y pointing down (canvas + SVG convention).
 *
 * Three subpaths: the quill sliver, the lower-left vane, and the upper hook.
 * The straight edge shared by the quill and the vane is the diagonal slit that
 * makes the mark read as a feather rather than a leaf.
 *
 * Geometry lives here once and is consumed two ways — `featherPathD()` for SVG
 * and `drawFeather()` for canvas (via Path2D) — mirroring the old
 * `solLogoPathD` / `drawSolLogo` pairing so both renderers stay in sync.
 */

type Cmd =
  | ["M", number, number]
  | ["L", number, number]
  | ["C", number, number, number, number, number, number]
  | ["Z"];

export const FEATHER_SUBPATHS: Cmd[][] = [
  // Quill: a tapered sliver running from the bottom-left tip up to the vane.
  [
    ["M", -0.5, 0.64],
    ["C", -0.4, 0.32, -0.3, 0.04, -0.18, -0.22],
    ["L", -0.07, -0.17],
    ["C", -0.22, 0.08, -0.34, 0.36, -0.43, 0.68],
    ["Z"],
  ],
  // Lower vane: sharp point at the bottom where it meets the quill, a straight
  // upper-left edge (one side of the slit), and a curved outer edge.
  [
    ["M", -0.32, 0.42],
    ["L", 0.17, -0.31],
    ["C", 0.32, -0.12, 0.32, 0.1, 0.15, 0.32],
    ["C", 0.0, 0.49, -0.17, 0.49, -0.32, 0.42],
    ["Z"],
  ],
  // Upper hook: the plume, deliberately the smaller mass. Its straight lower-left
  // edge is the other side of the slit; the notch underneath reads as an arrow.
  [
    ["M", 0.08, -0.37],
    ["C", 0.13, -0.56, 0.25, -0.71, 0.43, -0.7],
    ["C", 0.6, -0.68, 0.67, -0.5, 0.6, -0.31],
    ["C", 0.55, -0.17, 0.48, -0.1, 0.41, -0.07],
    ["L", 0.34, -0.23],
    ["C", 0.29, -0.31, 0.18, -0.37, 0.08, -0.37],
    ["Z"],
  ],
];

function fmt(n: number): string {
  return (Math.round(n * 1000) / 1000).toString();
}

/** SVG path `d` for the feather, scaled about the origin. */
export function featherPathD(scale = 1): string {
  const out: string[] = [];
  for (const sub of FEATHER_SUBPATHS) {
    for (const cmd of sub) {
      if (cmd[0] === "Z") {
        out.push("Z");
        continue;
      }
      const nums = cmd.slice(1) as number[];
      out.push(cmd[0] + nums.map((n) => fmt(n * scale)).join(","));
    }
  }
  return out.join(" ");
}

const pathCache = new Map<number, Path2D>();

/** Canvas twin of `featherPathD`. `size` is the half-extent, like a radius. */
export function drawFeather(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  fill = "#0B0B0B",
) {
  const key = Math.round(size * 4);
  let path = pathCache.get(key);
  if (!path) {
    path = new Path2D(featherPathD(key / 4));
    pathCache.set(key, path);
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = fill;
  ctx.fill(path);
  ctx.restore();
}
