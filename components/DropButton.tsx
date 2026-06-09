"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import PokeBallIcon from "@/components/PokeBallIcon";
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

  const size = 128;
  const stroke = 6;
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
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#drop-grad)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - dashOffset}
            fill="none"
          />
          <defs>
            <linearGradient id="drop-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFCB05" />
              <stop offset="50%" stopColor="#EE1515" />
              <stop offset="100%" stopColor="#F5F5F5" />
            </linearGradient>
          </defs>
        </svg>

        <motion.button
          whileTap={{ scale: isDisabled ? 1 : 0.94 }}
          whileHover={{ scale: isDisabled ? 1 : 1.03 }}
          onClick={onDrop}
          disabled={isDisabled}
          aria-label="Drop Pokéball"
          className={cn(
            "btn-drop relative grid place-items-center rounded-full font-extrabold uppercase tracking-wide",
            "transition-all",
            isDisabled && "cursor-not-allowed opacity-50",
          )}
          style={{ width: size - stroke * 2, height: size - stroke * 2, margin: stroke }}
        >
          {busy ? (
            <span className="text-xs text-[#FFCB05]">Throwing…</span>
          ) : onCooldown ? (
            <span className="flex flex-col items-center leading-tight">
              <span className="mono-stat text-2xl font-black text-white">{seconds}s</span>
              <span className="mt-0.5 text-[9px] tracking-[0.2em] text-white/50">COOLDOWN</span>
            </span>
          ) : (
            <span className="flex flex-col items-center leading-tight">
              <PokeBallIcon size={32} className="mb-1" />
              <span className="text-[10px] tracking-widest text-[#FFCB05]">THROW BALL</span>
            </span>
          )}
        </motion.button>
      </div>
      <div className="text-xs text-white/50">
        <span className="font-semibold text-[#EE1515]">0.01</span> per throw · pump.fun buy &amp; burn
      </div>
    </div>
  );
}
