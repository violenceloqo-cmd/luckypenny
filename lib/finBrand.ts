/** Fin brand tokens — split blue sphere motif from the Fin character. */
export const FIN_BLUE = "#59B8F5";
export const FIN_BLUE_DARK = "#3A98D8";
export const FIN_BLUE_DEEP = "#2B7AB8";
export const FIN_LIGHT = "#E4F4FC";
export const FIN_LIGHT_SOFT = "#C8E8F8";
export const FIN_INK = "#1A1A1A";
export const FIN_BG = "#0f2238";
export const FIN_BG_DEEP = "#081522";

export interface DrawFinBallOptions {
  velocityY?: number;
}

const SPRITE_VERSION = 1;
const spriteCache = new Map<string, HTMLCanvasElement>();

export function preloadFinBallSprite() {
  getFinBallSprite(128);
}

function getFinBallSprite(pixelSize: number): HTMLCanvasElement {
  const key = `${SPRITE_VERSION}-${pixelSize}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = pixelSize;
  canvas.height = pixelSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  paintFinBallSprite(ctx, pixelSize / 2, pixelSize / 2, pixelSize * 0.38);
  spriteCache.set(key, canvas);
  return canvas;
}

function wavySplitPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  side: "left" | "right",
) {
  const steps = 32;
  ctx.beginPath();
  if (side === "left") {
    ctx.moveTo(cx - r, cy - r);
    ctx.lineTo(cx - r, cy + r);
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const y = cy + r - t * r * 2;
      const wave = Math.sin((y - cy) / r * Math.PI * 1.35) * r * 0.1;
      ctx.lineTo(cx + wave, y);
    }
    ctx.closePath();
  } else {
    ctx.moveTo(cx + r, cy - r);
    ctx.lineTo(cx + r, cy + r);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = cy + r - t * r * 2;
      const wave = Math.sin((y - cy) / r * Math.PI * 1.35) * r * 0.1;
      ctx.lineTo(cx + wave, y);
    }
    ctx.closePath();
  }
}

function paintFinBallSprite(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
) {
  ctx.save();

  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.55);
  glow.addColorStop(0, "rgba(89, 184, 245, 0.35)");
  glow.addColorStop(0.5, "rgba(228, 244, 252, 0.15)");
  glow.addColorStop(1, "rgba(89, 184, 245, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 1.05, r * 0.95, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  wavySplitPath(ctx, cx, cy, r, "right");
  ctx.fillStyle = FIN_LIGHT;
  ctx.fill();

  wavySplitPath(ctx, cx, cy, r, "left");
  const blueGrad = ctx.createLinearGradient(cx - r, cy - r * 0.2, cx, cy + r * 0.2);
  blueGrad.addColorStop(0, FIN_BLUE);
  blueGrad.addColorStop(1, FIN_BLUE_DARK);
  ctx.fillStyle = blueGrad;
  ctx.fill();

  ctx.restore();

  const shine = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.45, 0, cx - r * 0.05, cy - r * 0.15, r * 0.75);
  shine.addColorStop(0, "rgba(255, 255, 255, 0.65)");
  shine.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = shine;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 0.55);
  ctx.restore();

  const eyeY = cy - r * 0.12;
  const eyeOffset = r * 0.18;
  const eyeR = Math.max(1.2, r * 0.07);
  ctx.fillStyle = FIN_INK;
  ctx.beginPath();
  ctx.arc(cx - eyeOffset, eyeY, eyeR, 0, Math.PI * 2);
  ctx.arc(cx + eyeOffset, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = FIN_INK;
  ctx.lineWidth = Math.max(0.8, r * 0.045);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, eyeY + r * 0.14, r * 0.12, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  ctx.restore();
}

function drawFinTrail(
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
  streak.addColorStop(0, "rgba(228, 244, 252, 0)");
  streak.addColorStop(0.35, "rgba(89, 184, 245, 0.35)");
  streak.addColorStop(0.7, "rgba(58, 152, 216, 0.55)");
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

/** Draw glossy Fin ball on the Plinko board. */
export function drawFinBall(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  options: DrawFinBallOptions = {},
) {
  const vy = options.velocityY ?? 0;
  const speed = Math.min(1, Math.max(0, vy / 4));

  if (speed > 0.06) {
    drawFinTrail(ctx, cx, cy, radius, speed);
  }

  const pixelSize = Math.round(Math.max(64, Math.min(160, radius * 5.5)));
  const sprite = getFinBallSprite(pixelSize);
  const size = radius * 2.35;

  ctx.save();
  ctx.shadowColor = "rgba(89, 184, 245, 0.55)";
  ctx.shadowBlur = radius * 0.55;
  ctx.drawImage(sprite, cx - size / 2, cy - size / 2, size, size);
  ctx.restore();
}
