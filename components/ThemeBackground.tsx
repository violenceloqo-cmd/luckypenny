"use client";

import { useMemo } from "react";

import BtcCoinIcon from "@/components/BtcCoinIcon";

interface FloatingBtc {
  left: number;
  top: number;
  scale: number;
  delay: number;
  opacity: number;
}

function generateCoins(count: number, seed: number): FloatingBtc[] {
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const out: FloatingBtc[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      left: rand() * 100,
      top: 5 + rand() * 75,
      scale: 0.3 + rand() * 0.55,
      delay: rand() * 6,
      opacity: 0.1 + rand() * 0.22,
    });
  }
  return out;
}

export default function ThemeBackground() {
  const coins = useMemo(() => generateCoins(12, 42069), []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0a0502]">
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 90% 70% at 50% 0%, rgba(247, 147, 26, 0.35) 0%, transparent 55%),
            radial-gradient(ellipse 60% 50% at 15% 40%, rgba(255, 100, 0, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse 70% 60% at 85% 60%, rgba(255, 69, 0, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse 100% 50% at 50% 100%, rgba(255, 50, 0, 0.15) 0%, transparent 45%),
            linear-gradient(180deg, #2a1408 0%, #1a0c04 40%, #0a0502 100%)
          `,
        }}
        aria-hidden="true"
      />

      <div
        className="grid-pulse absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(247, 147, 26, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(247, 147, 26, 0.07) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse 90% 80% at 50% 45%, black 15%, transparent 75%)",
        }}
        aria-hidden="true"
      />

      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f7931a]/40 to-transparent"
        aria-hidden="true"
      />

      {coins.map((o, i) => (
        <div
          key={i}
          className="btc-float absolute"
          style={{
            left: `${o.left}%`,
            top: `${o.top}%`,
            transform: `scale(${o.scale})`,
            animationDelay: `${o.delay}s`,
            opacity: o.opacity,
          }}
          aria-hidden="true"
        >
          <BtcCoinIcon size={44} glow={false} />
        </div>
      ))}

      <div
        className="flame-shimmer absolute inset-x-0 bottom-0 h-48"
        style={{
          background: "linear-gradient(to top, rgba(255, 69, 0, 0.12), transparent)",
        }}
        aria-hidden="true"
      />
    </div>
  );
}
