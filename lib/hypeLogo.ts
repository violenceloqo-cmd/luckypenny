/** Hyperliquid brand tokens */
export const HYPE_MINT = "#97fce1";
export const HYPE_MINT_BRIGHT = "#b8fff0";
export const HYPE_BG = "#0d2a2a";
export const HYPE_BG_DEEP = "#071818";
export const HYPE_TEAL = "#1a4545";

/**
 * Hyperliquid blob logo — normalized around (0,0), roughly 1 unit wide.
 * Traced from the official mark for vector rendering at any scale.
 */
export const HYPE_LOGO_D =
  "M -0.48 0.02 C -0.52 -0.16 -0.42 -0.34 -0.22 -0.36 C -0.06 -0.32 0.02 -0.18 0.06 -0.08 " +
  "C 0.10 -0.14 0.18 -0.36 0.38 -0.40 C 0.58 -0.38 0.68 -0.18 0.68 0.02 " +
  "C 0.68 0.22 0.56 0.40 0.36 0.42 C 0.18 0.40 0.10 0.22 0.06 0.10 " +
  "C 0.02 0.20 -0.06 0.34 -0.24 0.36 C -0.44 0.34 -0.52 0.18 -0.48 0.02 Z";

let cachedLogoImage: HTMLImageElement | null = null;

export function getHypeLogoImage(): HTMLImageElement {
  if (!cachedLogoImage) {
    cachedLogoImage = new Image();
    cachedLogoImage.src = "/hype-logo.png";
  }
  return cachedLogoImage;
}

export function hypeLogoPathD(scale = 1): string {
  return HYPE_LOGO_D.replace(
    /(-?\d+\.?\d*)/g,
    (n) => String(parseFloat(n) * scale),
  );
}

export function drawHypeLogo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  fill = HYPE_MINT,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(size, size * 0.55);
  const p = new Path2D(HYPE_LOGO_D);
  ctx.fillStyle = fill;
  ctx.fill(p);
  ctx.restore();
}

/** Hyperliquid logo rendered as a glowing coin — the Plinko drop token. */
export function drawHypeCoin(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
) {
  const img = getHypeLogoImage();
  const logoW = radius * 2.15;

  ctx.save();

  // Outer mint glow
  ctx.shadowColor = "rgba(151, 252, 225, 0.55)";
  ctx.shadowBlur = radius * 0.65;

  // Coin disc
  const discGrad = ctx.createRadialGradient(
    cx - radius * 0.35,
    cy - radius * 0.35,
    0,
    cx,
    cy,
    radius,
  );
  discGrad.addColorStop(0, "#1f5550");
  discGrad.addColorStop(0.55, HYPE_BG);
  discGrad.addColorStop(1, HYPE_BG_DEEP);
  ctx.fillStyle = discGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(151, 252, 225, 0.55)";
  ctx.lineWidth = radius * 0.07;
  ctx.stroke();

  // Inner ring
  ctx.strokeStyle = "rgba(151, 252, 225, 0.18)";
  ctx.lineWidth = radius * 0.04;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.82, 0, Math.PI * 2);
  ctx.stroke();

  // Logo mark
  if (img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, cx - logoW / 2, cy - logoW / 2, logoW, logoW);
  } else {
    drawHypeLogo(ctx, cx, cy, radius * 0.72);
  }

  // Specular highlight
  ctx.fillStyle = "rgba(184, 255, 240, 0.22)";
  ctx.beginPath();
  ctx.arc(cx - radius * 0.28, cy - radius * 0.32, radius * 0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
