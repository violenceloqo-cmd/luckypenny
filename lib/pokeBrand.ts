/** Pokéball brand tokens for canvas + UI */
export const POKE_RED = "#EE1515";
export const POKE_RED_DARK = "#C30A0A";
export const POKE_YELLOW = "#FFCB05";
export const POKE_YELLOW_DARK = "#E6A800";
export const POKE_WHITE = "#F5F5F5";
export const POKE_BLACK = "#1D1D1B";
export const POKE_BG = "#141418";
export const POKE_BG_DEEP = "#0a0a0c";

export interface DrawPokeBallOptions {
  velocityY?: number;
}

const SPRITE_VERSION = 1;
const spriteCache = new Map<string, HTMLCanvasElement>();

export function preloadPokeBallSprite() {
  getPokeBallSprite(128);
}

function getPokeBallSprite(pixelSize: number): HTMLCanvasElement {
  const key = `${SPRITE_VERSION}-${pixelSize}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = pixelSize;
  canvas.height = pixelSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  paintPokeBallSprite(ctx, pixelSize / 2, pixelSize / 2, pixelSize * 0.38);
  spriteCache.set(key, canvas);
  return canvas;
}

function paintPokeBallSprite(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
) {
  ctx.save();

  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.55);
  glow.addColorStop(0, "rgba(238, 21, 21, 0.35)");
  glow.addColorStop(0.5, "rgba(255, 203, 5, 0.15)");
  glow.addColorStop(1, "rgba(238, 21, 21, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 1.05, r * 0.95, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = POKE_WHITE;
  ctx.fillRect(cx - r, cy, r * 2, r);

  const redGrad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.45, r * 0.05, cx, cy - r * 0.15, r * 1.05);
  redGrad.addColorStop(0, "#FF5555");
  redGrad.addColorStop(0.55, POKE_RED);
  redGrad.addColorStop(1, POKE_RED_DARK);
  ctx.fillStyle = redGrad;
  ctx.fillRect(cx - r, cy - r, r * 2, r);

  const bandH = r * 0.22;
  ctx.fillStyle = POKE_BLACK;
  ctx.fillRect(cx - r, cy - bandH / 2, r * 2, bandH);

  ctx.restore();

  const btnR = r * 0.24;
  ctx.beginPath();
  ctx.arc(cx, cy, btnR, 0, Math.PI * 2);
  ctx.fillStyle = POKE_WHITE;
  ctx.fill();
  ctx.strokeStyle = POKE_BLACK;
  ctx.lineWidth = r * 0.07;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, btnR * 0.38, 0, Math.PI * 2);
  ctx.fillStyle = POKE_WHITE;
  ctx.fill();
  ctx.strokeStyle = POKE_BLACK;
  ctx.lineWidth = r * 0.035;
  ctx.stroke();

  const shine = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.45, 0, cx - r * 0.05, cy - r * 0.15, r * 0.75);
  shine.addColorStop(0, "rgba(255, 255, 255, 0.7)");
  shine.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = shine;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 0.55);
  ctx.restore();

  ctx.restore();
}

function drawPokeTrail(
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
  streak.addColorStop(0, "rgba(255, 203, 5, 0)");
  streak.addColorStop(0.35, "rgba(255, 203, 5, 0.35)");
  streak.addColorStop(0.7, "rgba(238, 21, 21, 0.55)");
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

/** Draw glossy Pokéball on the Plinko board. */
export function drawPokeBall(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  options: DrawPokeBallOptions = {},
) {
  const vy = options.velocityY ?? 0;
  const speed = Math.min(1, Math.max(0, vy / 4));

  if (speed > 0.06) {
    drawPokeTrail(ctx, cx, cy, radius, speed);
  }

  const pixelSize = Math.round(Math.max(64, Math.min(160, radius * 5.5)));
  const sprite = getPokeBallSprite(pixelSize);
  const size = radius * 2.35;

  ctx.save();
  ctx.shadowColor = "rgba(238, 21, 21, 0.55)";
  ctx.shadowBlur = radius * 0.55;
  ctx.drawImage(sprite, cx - size / 2, cy - size / 2, size, size);
  ctx.restore();
}
