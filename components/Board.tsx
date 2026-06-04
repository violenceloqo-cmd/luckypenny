"use client";

import { useEffect, useRef, useState } from "react";

import { MULTIPLIERS } from "@/lib/game/multipliers";
import {
  buildAnchors,
  DEFAULT_LAYOUT,
  pegX,
  pegY,
  samplePath,
  SLOT_BIN_HEIGHT,
  slotX,
} from "@/lib/game/physics";
import { outcomeFromSeed } from "@/lib/game/rng";
import { drawBtcCoin, getBtcLogoImage } from "@/lib/btcBrand";

export interface DropEvent {
  id: string;
  seed: string;
  username: string;
}

interface ActiveBall {
  id: string;
  username: string;
  path: { x: number; y: number }[];
  frame: number;
  slot: number;
  multiplier: number;
  finished: boolean;
}

export interface BoardProps {
  pending: DropEvent[];
  onBallLanded: (event: DropEvent, slot: number, multiplier: number) => void;
}

function drawFireFloor(
  ctx: CanvasRenderingContext2D,
  left: number,
  right: number,
  top: number,
  bottom: number,
  t: number,
) {
  const w = right - left;
  const h = bottom - top;
  const fireTop = top + h * 0.52;

  const grad = ctx.createLinearGradient(0, fireTop, 0, bottom);
  grad.addColorStop(0, "rgba(255, 100, 0, 0)");
  grad.addColorStop(0.35, "rgba(255, 80, 0, 0.22)");
  grad.addColorStop(0.7, "rgba(255, 50, 0, 0.45)");
  grad.addColorStop(1, "rgba(255, 30, 0, 0.65)");
  ctx.fillStyle = grad;
  ctx.fillRect(left, fireTop, w, bottom - fireTop);

  for (let i = 0; i < 10; i++) {
    const fx = left + (w * (i + 0.5)) / 10;
    const wave = Math.sin(t * 0.009 + i * 0.9) * 8;
    const fh = 18 + Math.sin(t * 0.012 + i) * 6;
    const flameGrad = ctx.createLinearGradient(fx, bottom - fh, fx, bottom);
    flameGrad.addColorStop(0, "rgba(255, 200, 0, 0)");
    flameGrad.addColorStop(0.4, "rgba(255, 140, 0, 0.55)");
    flameGrad.addColorStop(1, "rgba(255, 40, 0, 0.85)");
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(fx - 10 + wave, bottom);
    ctx.quadraticCurveTo(fx + wave, bottom - fh, fx + 10 + wave, bottom);
    ctx.closePath();
    ctx.fill();
  }

  for (let e = 0; e < 6; e++) {
    const ex = left + ((w * e) / 6 + (t * 0.02 + e * 17) % w);
    const ey = bottom - 8 - ((t * 0.03 + e * 23) % (h * 0.35));
    ctx.fillStyle = `rgba(255, 200, 80, ${0.25 + (e % 3) * 0.15})`;
    ctx.beginPath();
    ctx.arc(ex, ey, 1.2 + (e % 2), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Burning Plinko furnace — BTC drops through hot pegs into liquidation slots. */
export default function Board({ pending, onBallLanded }: BoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const ballsRef = useRef<ActiveBall[]>([]);
  const animationRef = useRef<number | null>(null);
  const [slotFlash, setSlotFlash] = useState<number | null>(null);
  const [scaleInfo, setScaleInfo] = useState({ scale: 1, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      for (const ev of pending) {
        if (ballsRef.current.some((b) => b.id === ev.id)) continue;
        const out = await outcomeFromSeed(ev.seed);
        if (cancelled) return;
        const anchors = buildAnchors(DEFAULT_LAYOUT, out.bits, out.slotIndex);
        const path = samplePath(anchors, 10);
        ballsRef.current.push({
          id: ev.id,
          username: ev.username,
          path,
          frame: 0,
          slot: out.slotIndex,
          multiplier: out.multiplier,
          finished: false,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pending]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    getBtcLogoImage();

    const layout = DEFAULT_LAYOUT;

    function computeFit() {
      if (!wrap) return { scale: 1, offsetX: 0, offsetY: 0 };
      const rect = wrap.getBoundingClientRect();
      const scale = Math.min(rect.width / layout.width, rect.height / layout.height);
      const offsetX = (rect.width - layout.width * scale) / 2;
      const offsetY = (rect.height - layout.height * scale) / 2;
      return { scale, offsetX, offsetY };
    }

    function resize() {
      if (!canvas || !wrap) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = wrap.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      setScaleInfo(computeFit());
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    function drawPeg(ctx: CanvasRenderingContext2D, x: number, y: number) {
      const r = layout.pegRadius;
      const g = ctx.createRadialGradient(x - 1, y - 1, 0, x, y, r + 2);
      g.addColorStop(0, "#ffe082");
      g.addColorStop(0.4, "#f7931a");
      g.addColorStop(1, "#8b3a00");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 140, 0, 0.45)";
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    function drawWall(ctx: CanvasRenderingContext2D, x: number, topY: number, botY: number) {
      const w = 3;
      ctx.fillStyle = "#2a1006";
      ctx.fillRect(x - w / 2, topY, w, botY - topY);
      ctx.strokeStyle = "rgba(255, 100, 0, 0.4)";
      ctx.lineWidth = 0.6;
      ctx.strokeRect(x - w / 2, topY, w, botY - topY);
      ctx.fillStyle = "#ff6b00";
      ctx.beginPath();
      ctx.arc(x, topY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawFrame() {
      if (!canvas || !wrap) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const fit = computeFit();
      const dpr = window.devicePixelRatio || 1;
      const t = performance.now();

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(
        fit.scale * dpr,
        0,
        0,
        fit.scale * dpr,
        fit.offsetX * dpr,
        fit.offsetY * dpr,
      );

      const topPegSpan = layout.colSpacing;
      const topMargin = 28;
      const bottomMargin = 8;
      const topLeftX = layout.width / 2 - topPegSpan / 2 - topMargin;
      const topRightX = layout.width / 2 + topPegSpan / 2 + topMargin;
      const topY = layout.startY - 18;
      const botY = layout.slotY + SLOT_BIN_HEIGHT / 2 + 6;
      const botLeftX = bottomMargin;
      const botRightX = layout.width - bottomMargin;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(topLeftX, topY);
      ctx.lineTo(topRightX, topY);
      ctx.lineTo(botRightX, botY);
      ctx.lineTo(botLeftX, botY);
      ctx.closePath();
      ctx.fillStyle = "rgba(20, 8, 2, 0.97)";
      ctx.fill();
      ctx.clip();

      drawFireFloor(ctx, botLeftX, botRightX, topY, botY, t);

      ctx.strokeStyle = "rgba(255, 120, 0, 0.07)";
      ctx.lineWidth = 0.5;
      for (let gy = topY + 10; gy < botY; gy += 16) {
        ctx.beginPath();
        ctx.moveTo(botLeftX, gy);
        ctx.lineTo(botRightX, gy);
        ctx.stroke();
      }
      for (let gx = botLeftX + 10; gx < botRightX; gx += 16) {
        ctx.beginPath();
        ctx.moveTo(gx, topY);
        ctx.lineTo(gx, botY);
        ctx.stroke();
      }
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(topLeftX, topY);
      ctx.lineTo(topRightX, topY);
      ctx.lineTo(botRightX, botY);
      ctx.lineTo(botLeftX, botY);
      ctx.closePath();
      ctx.lineWidth = 4;
      const borderGrad = ctx.createLinearGradient(topLeftX, topY, botRightX, botY);
      borderGrad.addColorStop(0, "#ffb84d");
      borderGrad.addColorStop(0.45, "#f7931a");
      borderGrad.addColorStop(0.75, "#ff6b00");
      borderGrad.addColorStop(1, "#ff3300");
      ctx.strokeStyle = borderGrad;
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255, 200, 100, 0.2)";
      ctx.stroke();

      for (let r = 0; r < layout.rows; r++) {
        for (let c = 0; c <= r + 1; c++) {
          drawPeg(ctx, pegX(layout, r, c), pegY(layout, r));
        }
      }

      const binTopY = layout.slotY - SLOT_BIN_HEIGHT / 2;
      const binBotY = layout.slotY + SLOT_BIN_HEIGHT / 2;

      ctx.strokeStyle = "rgba(255, 100, 0, 0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(botLeftX + 4, binBotY);
      ctx.lineTo(botRightX - 4, binBotY);
      ctx.stroke();

      for (let s = 0; s < layout.slots - 1; s++) {
        const wallX = (slotX(layout, s) + slotX(layout, s + 1)) / 2;
        drawWall(ctx, wallX, binTopY, binBotY);
      }

      const balls = ballsRef.current;
      const stillActive: ActiveBall[] = [];
      for (const b of balls) {
        const idx = Math.min(b.frame, b.path.length - 1);
        const pt = b.path[idx];
        drawBtcCoin(ctx, pt.x, pt.y, layout.ballRadius);
        b.frame += 1;
        if (b.frame >= b.path.length) {
          if (!b.finished) {
            b.finished = true;
            setSlotFlash(b.slot);
            window.setTimeout(() => setSlotFlash((cur) => (cur === b.slot ? null : cur)), 1100);
            onBallLanded({ id: b.id, seed: "", username: b.username }, b.slot, b.multiplier);
          }
          if (b.frame < b.path.length + 6) {
            stillActive.push(b);
          }
        } else {
          stillActive.push(b);
        }
      }
      ballsRef.current = stillActive;

      animationRef.current = requestAnimationFrame(drawFrame);
    }

    animationRef.current = requestAnimationFrame(drawFrame);
    return () => {
      ro.disconnect();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [onBallLanded]);

  const layout = DEFAULT_LAYOUT;
  const labelTopPx = scaleInfo.offsetY + (layout.slotY - SLOT_BIN_HEIGHT / 2 + 4) * scaleInfo.scale;
  const labelHeightPx = (SLOT_BIN_HEIGHT - 8) * scaleInfo.scale;

  return (
    <div ref={wrapRef} className="relative h-full w-full select-none">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0">
        {MULTIPLIERS.map((m, i) => {
          const cx = scaleInfo.offsetX + slotX(layout, i) * scaleInfo.scale;
          const width = layout.colSpacing * scaleInfo.scale - 6;
          const tier =
            m >= 100
              ? "from-[#ffe082] via-[#f7931a] to-[#c45e00] text-[#1a0a00] border-[#ffb84d]/70"
              : m >= 10
                ? "from-[#ffb84d] via-[#f7931a] to-[#e65100] text-[#1a0a00] border-[#f7931a]/55"
                : m >= 3
                  ? "from-[#ff9800] via-[#f57c00] to-[#bf360c] text-[#1a0a00] border-[#f7931a]/40"
                  : m >= 1
                    ? "from-[#3a1a08] via-[#2a1006] to-[#1a0a04] text-[#f7931a] border-[#f7931a]/25"
                    : "from-[#2a0a0a] via-[#1a0505] to-[#0a0202] text-[#ff8a65] border-red-900/40";
          const flashing = slotFlash === i;
          return (
            <div
              key={i}
              className={`absolute flex items-center justify-center rounded-md border bg-gradient-to-b font-black shadow-inner ${tier} ${flashing ? "slot-flash" : ""}`}
              style={{
                left: cx - width / 2,
                top: labelTopPx,
                width,
                height: labelHeightPx,
                fontSize: Math.max(9, Math.min(15, width * 0.38)),
                lineHeight: 1,
              }}
              title={`${m}x`}
            >
              {m}x
            </div>
          );
        })}
      </div>
    </div>
  );
}
