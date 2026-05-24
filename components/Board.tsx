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

/**
 * Renders the trapezoidal Plinko board on a canvas. Each incoming drop is
 * deterministically derived from its `seed`, so every viewer sees the ball
 * land in the same slot regardless of when they joined.
 *
 * The slot bins (with walls + multiplier labels) live INSIDE the trapezoid.
 * Walls are drawn on canvas; the multiplier text is overlaid as positioned
 * DOM for crisp scaling and easy flash animations.
 */
export default function Board({ pending, onBallLanded }: BoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const ballsRef = useRef<ActiveBall[]>([]);
  const animationRef = useRef<number | null>(null);
  const [slotFlash, setSlotFlash] = useState<number | null>(null);
  const [scaleInfo, setScaleInfo] = useState({ scale: 1, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
      const g = ctx.createRadialGradient(x - 1.5, y - 1.5, 0, x, y, layout.pegRadius + 1.5);
      g.addColorStop(0, "#fff3a8");
      g.addColorStop(0.5, "#fbbf24");
      g.addColorStop(1, "#7c4a0a");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, layout.pegRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number) {
      const g = ctx.createRadialGradient(x - 3, y - 3, 0, x, y, layout.ballRadius + 1);
      g.addColorStop(0, "#ffe9c2");
      g.addColorStop(0.6, "#f4a261");
      g.addColorStop(1, "#7a3a14");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, layout.ballRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    function drawWall(
      ctx: CanvasRenderingContext2D,
      x: number,
      topY: number,
      botY: number,
    ) {
      // A skinny wooden divider with a gold cap so it reads as a Plinko slot wall.
      ctx.save();
      ctx.fillStyle = "#4f2f15";
      ctx.strokeStyle = "#2a1709";
      ctx.lineWidth = 0.8;
      const w = 4;
      ctx.fillRect(x - w / 2, topY, w, botY - topY);
      ctx.strokeRect(x - w / 2, topY, w, botY - topY);
      // Gold cap
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(x, topY, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#7c4a0a";
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.restore();
    }

    function drawFrame() {
      if (!canvas || !wrap) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const fit = computeFit();
      const dpr = window.devicePixelRatio || 1;

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

      // Trapezoidal frame. Narrow at the top (just wider than the 2-peg row),
      // wide at the bottom (containing all slot bins).
      const topPegSpan = layout.colSpacing; // 2 pegs = 1 spacing
      const topMargin = 28;
      const bottomMargin = 8;
      const topLeftX = layout.width / 2 - topPegSpan / 2 - topMargin;
      const topRightX = layout.width / 2 + topPegSpan / 2 + topMargin;
      const topY = layout.startY - 18;
      const botY = layout.slotY + SLOT_BIN_HEIGHT / 2 + 6;
      const botLeftX = bottomMargin;
      const botRightX = layout.width - bottomMargin;

      // Trapezoid fill (dark wood interior)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(topLeftX, topY);
      ctx.lineTo(topRightX, topY);
      ctx.lineTo(botRightX, botY);
      ctx.lineTo(botLeftX, botY);
      ctx.closePath();
      ctx.fillStyle = "rgba(15, 30, 14, 0.6)";
      ctx.fill();

      // Wood frame outline
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#4f2f15";
      ctx.stroke();
      // Inner highlight
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(255, 220, 140, 0.35)";
      ctx.stroke();
      ctx.restore();

      // Pegs (gold coins)
      for (let r = 0; r < layout.rows; r++) {
        for (let c = 0; c <= r + 1; c++) {
          drawPeg(ctx, pegX(layout, r, c), pegY(layout, r));
        }
      }

      // Slot bin walls. Slots are between adjacent x-positions; we need
      // `slots + 1` walls (including outer two). Outer walls follow the
      // trapezoid sides; inner walls drop vertically inside.
      const binTopY = layout.slotY - SLOT_BIN_HEIGHT / 2;
      const binBotY = layout.slotY + SLOT_BIN_HEIGHT / 2;

      // Bin floor (subtle gold line)
      ctx.save();
      ctx.strokeStyle = "rgba(251, 191, 36, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(botLeftX + 4, binBotY);
      ctx.lineTo(botRightX - 4, binBotY);
      ctx.stroke();
      ctx.restore();

      // Inner walls: between every pair of adjacent slot centres.
      for (let s = 0; s < layout.slots - 1; s++) {
        const wallX = (slotX(layout, s) + slotX(layout, s + 1)) / 2;
        drawWall(ctx, wallX, binTopY, binBotY);
      }

      // Balls
      const balls = ballsRef.current;
      const stillActive: ActiveBall[] = [];
      for (const b of balls) {
        const idx = Math.min(b.frame, b.path.length - 1);
        const p = b.path[idx];
        drawBall(ctx, p.x, p.y);
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

  // Compute DOM overlay positions for slot multiplier labels (in pixel space
  // of the wrapper, transformed from logical coords).
  const layout = DEFAULT_LAYOUT;
  const labelTopPx = scaleInfo.offsetY + (layout.slotY - SLOT_BIN_HEIGHT / 2 + 4) * scaleInfo.scale;
  const labelHeightPx = (SLOT_BIN_HEIGHT - 8) * scaleInfo.scale;

  return (
    <div ref={wrapRef} className="relative h-full w-full select-none">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {/* Multiplier labels positioned over the in-board slot bins */}
      <div className="pointer-events-none absolute inset-0">
        {MULTIPLIERS.map((m, i) => {
          const cx = scaleInfo.offsetX + slotX(layout, i) * scaleInfo.scale;
          const width = layout.colSpacing * scaleInfo.scale - 6;
          const tier =
            m >= 100
              ? "from-yellow-200 via-yellow-400 to-amber-700 text-amber-950"
              : m >= 10
                ? "from-amber-100 via-amber-300 to-amber-600 text-amber-950"
                : m >= 3
                  ? "from-emerald-200 via-emerald-300 to-emerald-600 text-emerald-950"
                  : m >= 1
                    ? "from-stone-100 via-stone-300 to-stone-500 text-stone-900"
                    : "from-rose-200 via-rose-300 to-rose-500 text-rose-950";
          const flashing = slotFlash === i;
          return (
            <div
              key={i}
              className={`absolute flex items-center justify-center rounded-md border border-[#4f2f15] bg-gradient-to-b ${tier} font-black shadow-inner ${flashing ? "slot-flash" : ""}`}
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
