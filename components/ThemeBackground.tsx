"use client";

import { useMemo } from "react";

import HypeCoinIcon from "@/components/HypeCoinIcon";

interface FloatingOrb {
  left: number;
  top: number;
  scale: number;
  delay: number;
  opacity: number;
}

function generateOrbs(count: number, seed: number): FloatingOrb[] {
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const out: FloatingOrb[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      left: rand() * 100,
      top: 5 + rand() * 70,
      scale: 0.35 + rand() * 0.65,
      delay: rand() * 6,
      opacity: 0.12 + rand() * 0.28,
    });
  }
  return out;
}

export default function ThemeBackground() {
  const orbs = useMemo(() => generateOrbs(14, 99173), []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#071818]">
      {/* Hyperliquid liquid mesh */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 20% 15%, rgba(151, 252, 225, 0.14) 0%, transparent 55%),
            radial-gradient(ellipse 70% 50% at 80% 25%, rgba(94, 207, 184, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse 90% 70% at 50% 100%, rgba(151, 252, 225, 0.08) 0%, transparent 45%),
            linear-gradient(180deg, #0d2a2a 0%, #071818 45%, #051010 100%)
          `,
        }}
        aria-hidden="true"
      />

      {/* Liquid grid */}
      <div
        className="grid-pulse absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            "linear-gradient(rgba(151, 252, 225, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(151, 252, 225, 0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 90% 80% at 50% 40%, black 20%, transparent 75%)",
        }}
        aria-hidden="true"
      />

      {/* Top accent line */}
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#97fce1]/35 to-transparent"
        aria-hidden="true"
      />

      {/* Floating HYPE coins */}
      {orbs.map((o, i) => (
        <div
          key={i}
          className="orb-float absolute"
          style={{
            left: `${o.left}%`,
            top: `${o.top}%`,
            transform: `scale(${o.scale})`,
            animationDelay: `${o.delay}s`,
            opacity: o.opacity,
          }}
          aria-hidden="true"
        >
          <HypeCoinIcon size={48} glow={false} />
        </div>
      ))}

      {/* Bottom liquid glow */}
      <div
        className="liquid-shimmer absolute inset-x-0 bottom-0 h-40"
        style={{
          background: "linear-gradient(to top, rgba(151, 252, 225, 0.06), transparent)",
        }}
        aria-hidden="true"
      />
    </div>
  );
}
