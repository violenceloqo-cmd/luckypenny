"use client";

import { useEffect, useRef, useState } from "react";

import { MULTIPLIERS } from "@/lib/game/multipliers";
import {
  buildAnchors,
  DEFAULT_LAYOUT,
  pegX,
  pegY,
  PLINKO_DROP_FRAME_STEP,
  PLINKO_FRAMES_PER_SEGMENT,
  samplePath,
  SLOT_BIN_HEIGHT,
  slotX,
} from "@/lib/game/physics";
import { outcomeFromSeed } from "@/lib/game/rng";
import { drawBountyBag, preloadBountyBagSprite } from "@/lib/bountyBrand";

export interface DropEvent {
  id: string;
  seed: string;
  username: string;
}

interface ActiveBall {
  id: string;
  username: string;
  path: { x: number; y: number }[];
  /** Fractional frame index for smooth, slower playback. */
  frame: number;
  slot: number;
  multiplier: number;
  finished: boolean;
}

export interface BoardProps {
  pending: DropEvent[];
  onBallLanded: (event: DropEvent, slot: number, multiplier: number) => void;
}

function drawRewardPool(
  ctx: CanvasRenderingContext2D,
  left: number,
  right: number,
  top: number,
  bottom: number,
  t: number,
) {
  const w = right - left;
  const h = bottom - top;
  const poolTop = top + h * 0.5;

  const grad = ctx.createLinearGradient(0, poolTop, 0, bottom);
  grad.addColorStop(0, "rgba(74, 222, 128, 0)");
  grad.addColorStop(0.35, "rgba(245, 197, 24, 0.12)");
  grad.addColorStop(0.7, "rgba(245, 197, 24, 0.28)");
  grad.addColorStop(1, "rgba(34, 197, 94, 0.38)");
  ctx.fillStyle = grad;
  ctx.fillRect(left, poolTop, w, bottom - poolTop);

  for (let i = 0; i < 10; i++) {
    const cx = left + (w * (i + 0.5)) / 10;
    const bob = Math.sin(t * 0.006 + i * 0.7) * 3;
    const cy = bottom - 12 - bob - (i % 3) * 3;
    if (i % 2 === 0) {
      const coinR = 2.2 + (i % 2);
      const coinGrad = ctx.createRadialGradient(cx - 1, cy - 1, 0, cx, cy, coinR + 1);
      coinGrad.addColorStop(0, "#ffe566");
      coinGrad.addColorStop(0.6, "#f5c518");
      coinGrad.addColorStop(1, "#8b6914");
      ctx.fillStyle = coinGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coinR, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const bw = 8;
      const bh = 4;
      ctx.fillStyle = "rgba(133, 187, 101, 0.75)";
      ctx.strokeStyle = "rgba(61, 154, 92, 0.9)";
      ctx.lineWidth = 0.5;
      ctx.fillRect(cx - bw / 2, cy - bh / 2, bw, bh);
      ctx.strokeRect(cx - bw / 2, cy - bh / 2, bw, bh);
    }
  }

  for (let s = 0; s < 5; s++) {
    const sx = left + ((w * s) / 5 + (t * 0.015 + s * 31) % w);
    const sy = poolTop + 12 + ((t * 0.025 + s * 19) % (h * 0.4));
    ctx.fillStyle = `rgba(74, 222, 128, ${0.12 + (s % 3) * 0.08})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Bounty Plinko — money bags fall through pegs into reward multiplier slots. */
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
        const path = samplePath(anchors, PLINKO_FRAMES_PER_SEGMENT);
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

    preloadBountyBagSprite();

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
      g.addColorStop(0, "#ffe566");
      g.addColorStop(0.4, "#f5c518");
      g.addColorStop(1, "#5c3d1e");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(74, 222, 128, 0.35)";
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    function drawWall(ctx: CanvasRenderingContext2D, x: number, topY: number, botY: number) {
      const w = 3;
      ctx.fillStyle = "#141f14";
      ctx.fillRect(x - w / 2, topY, w, botY - topY);
      ctx.strokeStyle = "rgba(74, 222, 128, 0.35)";
      ctx.lineWidth = 0.6;
      ctx.strokeRect(x - w / 2, topY, w, botY - topY);
      ctx.fillStyle = "#4ade80";
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
      ctx.fillStyle = "rgba(8, 14, 8, 0.97)";
      ctx.fill();
      ctx.clip();

      drawRewardPool(ctx, botLeftX, botRightX, topY, botY, t);

      ctx.strokeStyle = "rgba(74, 222, 128, 0.06)";
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
      borderGrad.addColorStop(0, "#ffe566");
      borderGrad.addColorStop(0.4, "#f5c518");
      borderGrad.addColorStop(0.7, "#4ade80");
      borderGrad.addColorStop(1, "#22c55e");
      ctx.strokeStyle = borderGrad;
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(74, 222, 128, 0.2)";
      ctx.stroke();

      for (let r = 0; r < layout.rows; r++) {
        for (let c = 0; c <= r + 1; c++) {
          drawPeg(ctx, pegX(layout, r, c), pegY(layout, r));
        }
      }

      const binTopY = layout.slotY - SLOT_BIN_HEIGHT / 2;
      const binBotY = layout.slotY + SLOT_BIN_HEIGHT / 2;

      ctx.strokeStyle = "rgba(245, 197, 24, 0.5)";
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
        const maxIdx = b.path.length - 1;
        const idx = Math.min(Math.floor(b.frame), maxIdx);
        const frac = b.frame - idx;
        const nextIdx = Math.min(idx + 1, maxIdx);
        const a = b.path[idx];
        const c = b.path[nextIdx];
        const pt = {
          x: a.x + (c.x - a.x) * frac,
          y: a.y + (c.y - a.y) * frac,
        };
        const prevIdx = Math.max(0, Math.floor(b.frame - PLINKO_DROP_FRAME_STEP));
        const prev = b.path[prevIdx];
        const velocityY = pt.y - prev.y;
        drawBountyBag(ctx, pt.x, pt.y, layout.ballRadius, { velocityY });
        b.frame += PLINKO_DROP_FRAME_STEP;
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
              ? "from-[#ffe566] via-[#f5c518] to-[#b8860b] text-[#0c140c] border-[#ffe566]/70"
              : m >= 10
                ? "from-[#f5c518] via-[#d4a012] to-[#8b6914] text-[#0c140c] border-[#f5c518]/55"
                : m >= 3
                  ? "from-[#1a2818] via-[#141f14] to-[#0c140c] text-[#4ade80] border-[#4ade80]/40"
                  : m >= 1
                    ? "from-[#141f14] via-[#121c12] to-[#0a120a] text-[#f5c518] border-[#f5c518]/25"
                    : "from-[#121c12] via-[#0c140c] to-[#060a06] text-[#86efac] border-emerald-900/40";
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
