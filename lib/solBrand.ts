import { drawSolLogo } from "@/lib/solLogo";

/** Solana brand tokens for canvas + UI. Mirrored as CSS vars in globals.css. */
export const SOL_GREEN = "#14F195";
export const SOL_CYAN = "#00D1FF";
export const SOL_PURPLE = "#9945FF";
export const SOL_EMBER = "#FF8A3D";
export const SOL_BG = "#0A0A14";
export const SOL_BG_DEEP = "#050508";
export const SOL_BG_MID = "#12101F";

export interface DrawSolBallOptions {
  velocityY?: number;
}

const SPRITE_VERSION = 2;
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

function paintSolBallSprite(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
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

  // Green at the lit shoulder through cyan to purple at the rim — the Solana
  // gradient doubling as sphere shading.
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

function drawSolTrail(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, strength: number) {
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

/** Draw the glossy Solana ball on the Plinko board. `alpha` fades it out as it burns. */
export function drawSolBall(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  options: DrawSolBallOptions & { alpha?: number } = {},
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
  ctx.globalAlpha = options.alpha ?? 1;
  ctx.shadowColor = "rgba(0, 209, 255, 0.55)";
  ctx.shadowBlur = radius * 0.55;
  ctx.drawImage(sprite, cx - size / 2, cy - size / 2, size, size);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// Burn plume: when a ball lands, it ignites and dissolves into rising embers —
// the on-board picture of the tokens it bought being burned.
// ─────────────────────────────────────────────────────────────────────────────

export interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: 0 | 1 | 2;
}

const EMBER_COLORS = [SOL_EMBER, SOL_GREEN, SOL_PURPLE] as const;

/** Deterministic-enough spark spray; purely cosmetic so Math.random is fine. */
export function spawnEmbers(x: number, y: number, count: number): Ember[] {
  const out: Ember[] = [];
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
    const speed = 0.6 + Math.random() * 1.8;
    const maxLife = 38 + Math.random() * 34;
    out.push({
      x: x + (Math.random() - 0.5) * 8,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: maxLife,
      maxLife,
      size: 1.2 + Math.random() * 2.2,
      hue: (i % 5 === 0 ? 1 : i % 7 === 0 ? 2 : 0) as Ember["hue"],
    });
  }
  return out;
}

/** Advance and draw embers in place; returns the ones still alive. */
export function stepEmbers(ctx: CanvasRenderingContext2D, embers: Ember[]): Ember[] {
  const alive: Ember[] = [];
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const e of embers) {
    e.x += e.vx;
    e.y += e.vy;
    e.vy -= 0.025; // heat rises
    e.vx *= 0.985;
    e.life -= 1;
    if (e.life <= 0) continue;
    const t = e.life / e.maxLife;
    ctx.globalAlpha = Math.min(1, t * 1.4);
    ctx.fillStyle = EMBER_COLORS[e.hue];
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.size * (0.4 + t * 0.6), 0, Math.PI * 2);
    ctx.fill();
    alive.push(e);
  }
  ctx.restore();
  return alive;
}

/** Flame tongue licking up from a slot while the ball burns. `t` runs 1 → 0. */
export function drawSlotFlame(ctx: CanvasRenderingContext2D, x: number, baseY: number, width: number, t: number) {
  const now = performance.now();
  const h = width * (0.9 + 0.5 * Math.sin(now * 0.02)) * t;
  if (h <= 0.5) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = Math.min(1, t * 1.5);
  const g = ctx.createLinearGradient(x, baseY - h, x, baseY);
  g.addColorStop(0, "rgba(153, 69, 255, 0)");
  g.addColorStop(0.35, "rgba(255, 138, 61, 0.55)");
  g.addColorStop(0.8, "rgba(255, 200, 120, 0.8)");
  g.addColorStop(1, "rgba(20, 241, 149, 0.6)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - width / 2, baseY);
  ctx.quadraticCurveTo(x - width * 0.35, baseY - h * 0.6, x + Math.sin(now * 0.013) * width * 0.15, baseY - h);
  ctx.quadraticCurveTo(x + width * 0.35, baseY - h * 0.6, x + width / 2, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
