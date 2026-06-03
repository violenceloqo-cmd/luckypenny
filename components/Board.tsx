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
import { drawSolLogo } from "@/lib/solLogo";

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

/** Plinko board — Solana orbs drop from the top through pegs into multiplier slots. */
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
      g.addColorStop(0, "#c4b5fd");
      g.addColorStop(0.45, "#9945ff");
      g.addColorStop(1, "#4c1d95");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(20, 241, 149, 0.35)";
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    function drawSolanaBall(ctx: CanvasRenderingContext2D, x: number, y: number) {
      const r = layout.ballRadius;
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r);
      g.addColorStop(0, "#14F195");
      g.addColorStop(0.45, "#00D1FF");
      g.addColorStop(1, "#9945FF");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.32)";
      ctx.beginPath();
      ctx.arc(x - r * 0.28, y - r * 0.28, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      drawSolLogo(ctx, x, y, r * 0.72);
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    function drawWall(ctx: CanvasRenderingContext2D, x: number, topY: number, botY: number) {
      const w = 3;
      ctx.fillStyle = "#1e1b4b";
      ctx.fillRect(x - w / 2, topY, w, botY - topY);
      ctx.strokeStyle = "rgba(153, 69, 255, 0.6)";
      ctx.lineWidth = 0.6;
      ctx.strokeRect(x - w / 2, topY, w, botY - topY);
      ctx.fillStyle = "#14F195";
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
      ctx.fillStyle = "rgba(10, 10, 20, 0.95)";
      ctx.fill();
      ctx.clip();

      ctx.strokeStyle = "rgba(153, 69, 255, 0.08)";
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
      borderGrad.addColorStop(0, "#14F195");
      borderGrad.addColorStop(0.5, "#9945FF");
      borderGrad.addColorStop(1, "#00D1FF");
      ctx.strokeStyle = borderGrad;
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.stroke();

      for (let r = 0; r < layout.rows; r++) {
        for (let c = 0; c <= r + 1; c++) {
          drawPeg(ctx, pegX(layout, r, c), pegY(layout, r));
        }
      }

      const binTopY = layout.slotY - SLOT_BIN_HEIGHT / 2;
      const binBotY = layout.slotY + SLOT_BIN_HEIGHT / 2;

      ctx.strokeStyle = "rgba(20, 241, 149, 0.4)";
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
        drawSolanaBall(ctx, pt.x, pt.y);
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
              ? "from-emerald-200 via-green-400 to-emerald-700 text-emerald-950 border-emerald-400/60"
              : m >= 10
                ? "from-violet-200 via-purple-400 to-purple-700 text-purple-950 border-purple-400/50"
                : m >= 3
                  ? "from-cyan-200 via-sky-400 to-cyan-600 text-cyan-950 border-cyan-400/40"
                  : m >= 1
                    ? "from-slate-200 via-slate-400 to-slate-600 text-slate-900 border-slate-400/30"
                    : "from-rose-200 via-rose-400 to-rose-600 text-rose-950 border-rose-400/40";
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
