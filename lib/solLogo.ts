/** Solana symbol — three stacked parallelograms, normalized around (0,0). */
export const SOL_LOGO_BARS: [number, number][][] = [
  [
    [-0.55, -0.28],
    [0.65, -0.38],
    [0.55, -0.18],
    [-0.65, -0.08],
  ],
  [
    [-0.65, -0.02],
    [0.55, -0.12],
    [0.65, 0.08],
    [-0.55, 0.18],
  ],
  [
    [-0.55, 0.24],
    [0.65, 0.14],
    [0.55, 0.34],
    [-0.65, 0.44],
  ],
];

export function solLogoPathD(scale = 1): string {
  return SOL_LOGO_BARS.map((bar) => {
    const pts = bar.map(([x, y]) => `${(x * scale).toFixed(2)},${(y * scale).toFixed(2)}`);
    return `M${pts[0]} L${pts[1]} L${pts[2]} L${pts[3]} Z`;
  }).join(" ");
}

export function drawSolLogo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  fill = "rgba(255,255,255,0.92)",
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = fill;
  for (const bar of SOL_LOGO_BARS) {
    ctx.beginPath();
    ctx.moveTo(bar[0][0] * size, bar[0][1] * size);
    for (let i = 1; i < bar.length; i++) {
      ctx.lineTo(bar[i][0] * size, bar[i][1] * size);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
