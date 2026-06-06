import { drawSolLogo } from "@/lib/solLogo";

/** Solana brand tokens for canvas + UI */
export const SOL_GREEN = "#14F195";
export const SOL_CYAN = "#00D1FF";
export const SOL_PURPLE = "#9945FF";
export const SOL_BG = "#0a0a14";
export const SOL_BG_DEEP = "#050508";

export interface DrawSolBallOptions {
  velocityY?: number;
}

const SPRITE_VERSION = 1;
const spriteCache = new Map<string, HTMLCanvasElement>();

export function preloadSolBallSprite() {
  getSolBallSprite(128);
}

function getSolBallSprite(pixelSize: number): HTMLCanvasElement {
  const key = `${SPRITE_VERSION}-${pixelSize}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = pixelSize;
  canvas.height = pixelSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  paintSolBallSprite(ctx, pixelSize / 2, pixelSize / 2, pixelSize * 0.38);
  spriteCache.set(key, canvas);
  return canvas;
}

function paintSolBallSprite(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
) {
  ctx.save();

  const glow = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.55);
  glow.addColorStop(0, "rgba(20, 241, 149, 0.35)");
  glow.addColorStop(0.45, "rgba(0, 209, 255, 0.2)");
  glow.addColorStop(1, "rgba(153, 69, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 1.05, r * 0.95, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  const sphere = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r * 1.05);
  sphere.addColorStop(0, SOL_GREEN);
  sphere.addColorStop(0.45, SOL_CYAN);
  sphere.addColorStop(1, SOL_PURPLE);
  ctx.fillStyle = sphere;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  const shine = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 0, cx - r * 0.1, cy, r * 0.7);
  shine.addColorStop(0, "rgba(255, 255, 255, 0.75)");
  shine.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  drawSolLogo(ctx, cx, cy, r * 0.42, "rgba(255,255,255,0.95)");

  ctx.restore();
}

function drawSolTrail(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  strength: number,
) {
  const h = radius * (2.5 + strength * 2.8);
  const top = cy - h;

  ctx.save();
  ctx.globalAlpha = 0.35 + strength * 0.25;

  const streak = ctx.createLinearGradient(cx, top, cx, cy);
  streak.addColorStop(0, "rgba(153, 69, 255, 0)");
  streak.addColorStop(0.35, "rgba(0, 209, 255, 0.35)");
  streak.addColorStop(0.7, "rgba(20, 241, 149, 0.55)");
  streak.addColorStop(1, "rgba(255, 255, 255, 0.45)");

  ctx.fillStyle = streak;
  ctx.beginPath();
  ctx.moveTo(cx - radius * 0.45, cy);
  ctx.quadraticCurveTo(cx - radius * 0.3, (cy + top) / 2, cx - radius * 0.2, top);
  ctx.lineTo(cx + radius * 0.2, top);
  ctx.quadraticCurveTo(cx + radius * 0.3, (cy + top) / 2, cx + radius * 0.45, cy);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/** Draw glossy Solana ball on the Plinko board. */
export function drawSolBall(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  options: DrawSolBallOptions = {},
) {
  const vy = options.velocityY ?? 0;
  const speed = Math.min(1, Math.max(0, vy / 4));

  if (speed > 0.06) {
    drawSolTrail(ctx, cx, cy, radius, speed);
  }

  const pixelSize = Math.round(Math.max(64, Math.min(160, radius * 5.5)));
  const sprite = getSolBallSprite(pixelSize);
  const size = radius * 2.35;

  ctx.save();
  ctx.shadowColor = "rgba(0, 209, 255, 0.55)";
  ctx.shadowBlur = radius * 0.55;
  ctx.drawImage(sprite, cx - size / 2, cy - size / 2, size, size);
  ctx.restore();
}
