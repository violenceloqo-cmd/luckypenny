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

interface ActivePlane {
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
  onPlaneLanded: (event: DropEvent, slot: number, multiplier: number) => void;
}

/**
 * Plinko board — paper airplanes glide through pegs and land in multiplier slots.
 * Path is seed-deterministic so every viewer sees the same flight.
 */
export default function Board({ pending, onPlaneLanded }: BoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const planesRef = useRef<ActivePlane[]>([]);
  const animationRef = useRef<number | null>(null);
  const [slotFlash, setSlotFlash] = useState<number | null>(null);
  const [scaleInfo, setScaleInfo] = useState({ scale: 1, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      for (const ev of pending) {
        if (planesRef.current.some((p) => p.id === ev.id)) continue;
        const out = await outcomeFromSeed(ev.seed);
        if (cancelled) return;
        const anchors = buildAnchors(DEFAULT_LAYOUT, out.bits, out.slotIndex);
        const path = samplePath(anchors, 10);
        planesRef.current.push({
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
      const g = ctx.createRadialGradient(x - 1, y - 1, 0, x, y, layout.pegRadius + 1);
      g.addColorStop(0, "#f8fafc");
      g.addColorStop(0.5, "#cbd5e1");
      g.addColorStop(1, "#64748b");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, layout.pegRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(15, 39, 68, 0.45)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    function drawPaperAirplane(
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      angle: number,
    ) {
      const s = layout.ballRadius * 0.55;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.scale(s, s);

      // Body
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(14, -5);
      ctx.lineTo(6, 0);
      ctx.lineTo(14, 5);
      ctx.closePath();
      ctx.fillStyle = "#fffef9";
      ctx.fill();
      ctx.strokeStyle = "#0f2744";
      ctx.lineWidth = 0.35;
      ctx.stroke();

      // Fold wing (top)
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(6, 0);
      ctx.lineTo(14, -5);
      ctx.closePath();
      ctx.fillStyle = "#dbeafe";
      ctx.fill();
      ctx.strokeStyle = "#0f2744";
      ctx.lineWidth = 0.25;
      ctx.stroke();

      // Fold wing (bottom)
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(14, 5);
      ctx.closePath();
      ctx.fillStyle = "#bfdbfe";
      ctx.fill();
      ctx.strokeStyle = "#0f2744";
      ctx.lineWidth = 0.25;
      ctx.stroke();

      // Red crease
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(6, 0);
      ctx.strokeStyle = "#e63946";
      ctx.lineWidth = 0.4;
      ctx.stroke();

      ctx.restore();
    }

    function drawWall(ctx: CanvasRenderingContext2D, x: number, topY: number, botY: number) {
      ctx.save();
      ctx.fillStyle = "#475569";
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 0.8;
      const w = 3;
      ctx.fillRect(x - w / 2, topY, w, botY - topY);
      ctx.strokeRect(x - w / 2, topY, w, botY - topY);
      ctx.fillStyle = "#93c5fd";
      ctx.beginPath();
      ctx.arc(x, topY, 3, 0, Math.PI * 2);
      ctx.fill();
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

      const topPegSpan = layout.colSpacing;
      const topMargin = 28;
      const bottomMargin = 8;
      const topLeftX = layout.width / 2 - topPegSpan / 2 - topMargin;
      const topRightX = layout.width / 2 + topPegSpan / 2 + topMargin;
      const topY = layout.startY - 18;
      const botY = layout.slotY + SLOT_BIN_HEIGHT / 2 + 6;
      const botLeftX = bottomMargin;
      const botRightX = layout.width - bottomMargin;

      // Board interior — notebook paper
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(topLeftX, topY);
      ctx.lineTo(topRightX, topY);
      ctx.lineTo(botRightX, botY);
      ctx.lineTo(botLeftX, botY);
      ctx.closePath();
      ctx.fillStyle = "rgba(255, 254, 249, 0.92)";
      ctx.fill();

      // Subtle grid lines inside board
      ctx.clip();
      ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
      ctx.lineWidth = 0.5;
      for (let gy = topY + 12; gy < botY; gy += 14) {
        ctx.beginPath();
        ctx.moveTo(botLeftX, gy);
        ctx.lineTo(botRightX, gy);
        ctx.stroke();
      }
      ctx.restore();

      // Frame outline
      ctx.beginPath();
      ctx.moveTo(topLeftX, topY);
      ctx.lineTo(topRightX, topY);
      ctx.lineTo(botRightX, botY);
      ctx.lineTo(botLeftX, botY);
      ctx.closePath();
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#2563eb";
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.stroke();

      for (let r = 0; r < layout.rows; r++) {
        for (let c = 0; c <= r + 1; c++) {
          drawPeg(ctx, pegX(layout, r, c), pegY(layout, r));
        }
      }

      const binTopY = layout.slotY - SLOT_BIN_HEIGHT / 2;
      const binBotY = layout.slotY + SLOT_BIN_HEIGHT / 2;

      ctx.save();
      ctx.strokeStyle = "rgba(37, 99, 235, 0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(botLeftX + 4, binBotY);
      ctx.lineTo(botRightX - 4, binBotY);
      ctx.stroke();
      ctx.restore();

      for (let s = 0; s < layout.slots - 1; s++) {
        const wallX = (slotX(layout, s) + slotX(layout, s + 1)) / 2;
        drawWall(ctx, wallX, binTopY, binBotY);
      }

      const planes = planesRef.current;
      const stillActive: ActivePlane[] = [];
      for (const p of planes) {
        const idx = Math.min(p.frame, p.path.length - 1);
        const pt = p.path[idx];
        const prev = p.path[Math.max(0, idx - 1)];
        const angle = Math.atan2(pt.y - prev.y, pt.x - prev.x);
        drawPaperAirplane(ctx, pt.x, pt.y, angle);
        p.frame += 1;
        if (p.frame >= p.path.length) {
          if (!p.finished) {
            p.finished = true;
            setSlotFlash(p.slot);
            window.setTimeout(() => setSlotFlash((cur) => (cur === p.slot ? null : cur)), 1100);
            onPlaneLanded({ id: p.id, seed: "", username: p.username }, p.slot, p.multiplier);
          }
          if (p.frame < p.path.length + 6) {
            stillActive.push(p);
          }
        } else {
          stillActive.push(p);
        }
      }
      planesRef.current = stillActive;

      animationRef.current = requestAnimationFrame(drawFrame);
    }

    animationRef.current = requestAnimationFrame(drawFrame);
    return () => {
      ro.disconnect();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [onPlaneLanded]);

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
              ? "from-sky-100 via-blue-300 to-blue-700 text-blue-950"
              : m >= 10
                ? "from-blue-50 via-sky-200 to-sky-500 text-sky-950"
                : m >= 3
                  ? "from-indigo-100 via-indigo-200 to-indigo-500 text-indigo-950"
                  : m >= 1
                    ? "from-slate-50 via-slate-200 to-slate-400 text-slate-900"
                    : "from-rose-100 via-rose-200 to-rose-400 text-rose-950";
          const flashing = slotFlash === i;
          return (
            <div
              key={i}
              className={`absolute flex items-center justify-center rounded-md border border-blue-800/40 bg-gradient-to-b ${tier} font-black shadow-inner ${flashing ? "slot-flash" : ""}`}
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
