import { drawFeather } from "@/lib/hoodFeather";

/** Robinhood brand tokens for canvas + UI. */
export const HOOD_LIME = "#CCFF00";
export const HOOD_LIME_SOFT = "#E9FF7A";
export const HOOD_LIME_DEEP = "#8FB800";
export const HOOD_BLACK = "#0B0B0B";
export const HOOD_BG = "#0B0E06";
export const HOOD_BG_DEEP = "#050703";
export const HOOD_BG_MID = "#141A0A";

export interface DrawHoodBallOptions {
  velocityY?: number;
}

const SPRITE_VERSION = 2;
const spriteCache = new Map<string, HTMLCanvasElement>();

export function preloadHoodBallSprite() {
  getHoodBallSprite(128);
}

function getHoodBallSprite(pixelSize: number): HTMLCanvasElement {
  const key = `${SPRITE_VERSION}-${pixelSize}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = pixelSize;
  canvas.height = pixelSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  paintHoodBallSprite(ctx, pixelSize / 2, pixelSize / 2, pixelSize * 0.38);
  spriteCache.set(key, canvas);
  return canvas;
}

function paintHoodBallSprite(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
) {
  ctx.save();

  const glow = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.55);
  glow.addColorStop(0, "rgba(204, 255, 0, 0.4)");
  glow.addColorStop(0.45, "rgba(204, 255, 0, 0.18)");
  glow.addColorStop(1, "rgba(204, 255, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 1.05, r * 0.95, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  // Light lime at the top-left shoulder, deepening to olive at the rim — this
  // is what makes a flat brand colour read as a sphere.
  const sphere = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r * 1.05);
  sphere.addColorStop(0, HOOD_LIME_SOFT);
  sphere.addColorStop(0.45, HOOD_LIME);
  sphere.addColorStop(1, HOOD_LIME_DEEP);
  ctx.fillStyle = sphere;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  const shine = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 0, cx - r * 0.1, cy, r * 0.7);
  shine.addColorStop(0, "rgba(255, 255, 255, 0.7)");
  shine.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // The feather is a thin mark, so it needs a large share of the face to stay
  // legible once the sprite scales down to an 8px ball radius.
  drawFeather(ctx, cx, cy, r * 0.55, HOOD_BLACK);

  ctx.restore();
}

function drawHoodTrail(
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
  streak.addColorStop(0, "rgba(143, 184, 0, 0)");
  streak.addColorStop(0.35, "rgba(204, 255, 0, 0.3)");
  streak.addColorStop(0.7, "rgba(204, 255, 0, 0.55)");
  streak.addColorStop(1, "rgba(233, 255, 122, 0.5)");

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

/** Draw the glossy Hood ball on the Plinko board. */
export function drawHoodBall(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  options: DrawHoodBallOptions = {},
) {
  const vy = options.velocityY ?? 0;
  const speed = Math.min(1, Math.max(0, vy / 4));

  if (speed > 0.06) {
    drawHoodTrail(ctx, cx, cy, radius, speed);
  }

  const pixelSize = Math.round(Math.max(64, Math.min(160, radius * 5.5)));
  const sprite = getHoodBallSprite(pixelSize);
  const size = radius * 2.35;

  ctx.save();
  ctx.shadowColor = "rgba(204, 255, 0, 0.5)";
  ctx.shadowBlur = radius * 0.55;
  ctx.drawImage(sprite, cx - size / 2, cy - size / 2, size, size);
  ctx.restore();
}
