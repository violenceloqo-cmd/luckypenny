"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import PaperAirplaneIcon from "@/components/PaperAirplaneIcon";
import { cn } from "@/lib/utils";

export interface DropButtonProps {
  disabled?: boolean;
  cooldownMs: number;
  cooldownTotalMs: number;
  onDrop: () => void;
  busy?: boolean;
}

interface Drain {
  anchorMs: number;
  remainingMs: number;
}

export default function DropButton({
  disabled,
  cooldownMs,
  cooldownTotalMs,
  onDrop,
  busy,
}: DropButtonProps) {
  const [drain, setDrain] = useState<Drain>({ anchorMs: cooldownMs, remainingMs: cooldownMs });
  if (drain.anchorMs !== cooldownMs) {
    setDrain({ anchorMs: cooldownMs, remainingMs: cooldownMs });
  }

  useEffect(() => {
    if (cooldownMs <= 0) return;
    const start = Date.now();
    const initial = cooldownMs;
    const id = window.setInterval(() => {
      const r = Math.max(0, initial - (Date.now() - start));
      setDrain((cur) =>
        cur.anchorMs === initial ? { anchorMs: initial, remainingMs: r } : cur,
      );
      if (r <= 0) window.clearInterval(id);
    }, 100);
    return () => window.clearInterval(id);
  }, [cooldownMs]);

  const remaining = drain.remainingMs;
  const total = Math.max(1, cooldownTotalMs || 60_000);
  const pct = Math.max(0, Math.min(1, remaining / total));

  const onCooldown = remaining > 0;
  const isDisabled = !!disabled || onCooldown || !!busy;
  const seconds = Math.ceil(remaining / 1000);

  const size = 124;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  return (
    <div className="relative flex flex-col items-center gap-2">
      <div className="relative">
        <svg
          width={size}
          height={size}
          className="pointer-events-none absolute inset-0 -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(0,0,0,0.35)"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#launch-grad)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - dashOffset}
            fill="none"
          />
          <defs>
            <linearGradient id="launch-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>
        </svg>

        <motion.button
          whileTap={{ scale: isDisabled ? 1 : 0.96 }}
          whileHover={{ scale: isDisabled ? 1 : 1.02 }}
          onClick={onDrop}
          disabled={isDisabled}
          aria-label="Launch paper airplane"
          className={cn(
            "btn-launch relative grid place-items-center rounded-full font-extrabold uppercase tracking-wide",
            "transition-all",
            isDisabled && "cursor-not-allowed opacity-60",
          )}
          style={{ width: size - stroke * 2, height: size - stroke * 2, margin: stroke }}
        >
          {busy ? (
            <span className="text-xs">Launching…</span>
          ) : onCooldown ? (
            <span className="flex flex-col items-center leading-tight">
              <span className="text-2xl font-black tabular-nums">{seconds}s</span>
              <span className="mt-0.5 text-[9px] tracking-widest opacity-80">RELOAD</span>
            </span>
          ) : (
            <span className="flex flex-col items-center leading-tight">
              <PaperAirplaneIcon size={28} className="mb-0.5" />
              <span className="text-[10px] opacity-90">Launch</span>
            </span>
          )}
        </motion.button>
      </div>
      <div className="text-xs opacity-80">
        <span className="font-semibold">0.01 SOL</span> per flight · one per minute
      </div>
    </div>
  );
}
