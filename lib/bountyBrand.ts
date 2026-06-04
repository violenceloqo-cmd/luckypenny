/** Pump.fun bounty brand tokens */
export const BOUNTY_GOLD = "#f5c518";
export const BOUNTY_GOLD_BRIGHT = "#ffe566";
export const BOUNTY_GOLD_DARK = "#b8860b";
export const BOUNTY_SACK = "#8b5a2b";
export const BOUNTY_SACK_DARK = "#5c3d1e";
export const CASH_GREEN = "#3d9a5c";
export const CASH_GREEN_BRIGHT = "#6ecf8a";
export const CASH_BILL = "#85bb65";
export const PUMP_GREEN = "#4ade80";
export const VAULT_BG = "#0c140c";

export interface DrawBountyBagOptions {
  velocityY?: number;
}

const SPRITE_VERSION = 2;
const spriteCache = new Map<string, HTMLCanvasElement>();

export function preloadBountyBagSprite() {
  getBountyBagSprite(128);
}

function getBountyBagSprite(pixelSize: number): HTMLCanvasElement {
  const key = `${SPRITE_VERSION}-${pixelSize}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = pixelSize;
  canvas.height = pixelSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const cx = pixelSize / 2;
  const cy = pixelSize / 2;
  const r = pixelSize * 0.38;
  paintBountyCashBag(ctx, cx, cy, r);

  spriteCache.set(key, canvas);
  return canvas;
}

function drawCashBill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rot: number,
  alpha = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;

  ctx.fillStyle = CASH_BILL;
  ctx.strokeStyle = CASH_GREEN;
  ctx.lineWidth = Math.max(0.8, w * 0.08);
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, w * 0.08);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(45, 90, 45, 0.5)";
  ctx.lineWidth = Math.max(0.5, w * 0.05);
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.22, h * 0.28, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = CASH_GREEN;
  ctx.font = `bold ${Math.max(6, h * 0.35)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("$", 0, 0);

  ctx.restore();
}

function drawCoin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rad: number,
) {
  const g = ctx.createRadialGradient(x - rad * 0.2, y - rad * 0.2, 0, x, y, rad);
  g.addColorStop(0, BOUNTY_GOLD_BRIGHT);
  g.addColorStop(0.6, BOUNTY_GOLD);
  g.addColorStop(1, BOUNTY_GOLD_DARK);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = BOUNTY_SACK_DARK;
  ctx.lineWidth = Math.max(0.5, rad * 0.15);
  ctx.stroke();
}

/** Money bag stuffed with cash — Plinko drop token. */
function paintBountyCashBag(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
) {
  const w = r * 1.42;
  const h = r * 1.62;
  const topY = cy - h * 0.4;
  const botY = cy + h * 0.36;

  ctx.save();

  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.55);
  glow.addColorStop(0, "rgba(61, 154, 92, 0.3)");
  glow.addColorStop(0.45, "rgba(245, 197, 24, 0.2)");
  glow.addColorStop(1, "rgba(74, 222, 128, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Bills peeking out of the sack
  drawCashBill(ctx, cx - w * 0.35, topY + h * 0.08, w * 0.42, h * 0.2, -0.35, 0.95);
  drawCashBill(ctx, cx + w * 0.32, topY + h * 0.05, w * 0.38, h * 0.18, 0.4, 0.9);

  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.beginPath();
  ctx.ellipse(cx, botY + r * 0.14, w * 0.95, h * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  const bodyGrad = ctx.createLinearGradient(cx - w, topY, cx + w * 0.6, botY);
  bodyGrad.addColorStop(0, BOUNTY_GOLD_BRIGHT);
  bodyGrad.addColorStop(0.3, BOUNTY_GOLD);
  bodyGrad.addColorStop(0.75, BOUNTY_GOLD_DARK);
  bodyGrad.addColorStop(1, BOUNTY_SACK_DARK);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.58, topY + h * 0.2);
  ctx.bezierCurveTo(cx - w, topY + h * 0.38, cx - w, botY, cx, botY);
  ctx.bezierCurveTo(cx + w, botY, cx + w, topY + h * 0.38, cx + w * 0.58, topY + h * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(92, 61, 30, 0.65)";
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.stroke();

  // Cash band across bag
  ctx.fillStyle = "rgba(61, 154, 92, 0.55)";
  ctx.fillRect(cx - w * 0.45, cy - r * 0.05, w * 0.9, r * 0.35);
  ctx.strokeStyle = CASH_GREEN;
  ctx.lineWidth = Math.max(0.6, r * 0.05);
  ctx.strokeRect(cx - w * 0.45, cy - r * 0.05, w * 0.9, r * 0.35);

  const neckGrad = ctx.createLinearGradient(cx, topY, cx, topY + h * 0.22);
  neckGrad.addColorStop(0, "#a67c2e");
  neckGrad.addColorStop(1, BOUNTY_SACK_DARK);
  ctx.fillStyle = neckGrad;
  ctx.beginPath();
  ctx.ellipse(cx, topY + h * 0.13, w * 0.4, h * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = BOUNTY_SACK_DARK;
  ctx.lineWidth = Math.max(1.2, r * 0.1);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.44, topY + h * 0.15);
  ctx.quadraticCurveTo(cx, topY + h * 0.02, cx + w * 0.44, topY + h * 0.15);
  ctx.stroke();

  ctx.fillStyle = BOUNTY_SACK_DARK;
  ctx.beginPath();
  ctx.arc(cx, topY + h * 0.08, r * 0.24, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = CASH_GREEN;
  ctx.font = `800 ${Math.round(r * 1.2)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("$", cx, cy + r * 0.12);

  drawCoin(ctx, cx - w * 0.48, botY - h * 0.08, r * 0.14);
  drawCoin(ctx, cx + w * 0.5, botY - h * 0.05, r * 0.12);

  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.22, topY + h * 0.42, w * 0.14, h * 0.22, -0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawCashTrail(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  strength: number,
) {
  const h = radius * (2.4 + strength * 2.5);
  const top = cy - h;

  ctx.save();
  ctx.globalAlpha = 0.3 + strength * 0.2;

  const streak = ctx.createLinearGradient(cx, top, cx, cy);
  streak.addColorStop(0, "rgba(61, 154, 92, 0)");
  streak.addColorStop(0.4, "rgba(133, 187, 101, 0.35)");
  streak.addColorStop(0.75, "rgba(245, 197, 24, 0.5)");
  streak.addColorStop(1, "rgba(255, 229, 102, 0.7)");
  ctx.fillStyle = streak;
  ctx.beginPath();
  ctx.moveTo(cx - radius * 0.4, cy);
  ctx.lineTo(cx - radius * 0.25, top);
  ctx.lineTo(cx + radius * 0.25, top);
  ctx.lineTo(cx + radius * 0.4, cy);
  ctx.closePath();
  ctx.fill();

  const billW = radius * 0.55;
  const billH = radius * 0.28;
  drawCashBill(ctx, cx - radius * 0.35, cy - h * 0.45, billW, billH, -0.2, 0.5 * strength);
  drawCashBill(ctx, cx + radius * 0.3, cy - h * 0.65, billW * 0.85, billH * 0.9, 0.25, 0.4 * strength);

  ctx.restore();
}

/** Draw cash-stuffed bounty bag on the Plinko board. */
export function drawBountyBag(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  options: DrawBountyBagOptions = {},
) {
  const vy = options.velocityY ?? 0;
  const speed = Math.min(1, Math.max(0, vy / 4));

  if (speed > 0.06) {
    drawCashTrail(ctx, cx, cy, radius, speed);
  }

  const pixelSize = Math.round(Math.max(64, Math.min(160, radius * 5.5)));
  const sprite = getBountyBagSprite(pixelSize);
  const size = radius * 2.4;

  ctx.save();
  ctx.shadowColor = "rgba(61, 154, 92, 0.45)";
  ctx.shadowBlur = radius * 0.55;
  ctx.drawImage(sprite, cx - size / 2, cy - size / 2, size, size);
  ctx.restore();
}
