"use client";

import { useMemo } from "react";

import HoodBallIcon from "@/components/HoodBallIcon";

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
      top: 5 + rand() * 75,
      scale: 0.3 + rand() * 0.5,
      delay: rand() * 6,
      opacity: 0.08 + rand() * 0.18,
    });
  }
  return out;
}

export default function ThemeBackground() {
  const orbs = useMemo(() => generateOrbs(10, 42069), []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#050703]">
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 90% 70% at 50% 0%, rgba(143, 184, 0, 0.2) 0%, transparent 55%),
            radial-gradient(ellipse 60% 50% at 15% 40%, rgba(233, 255, 122, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse 70% 60% at 85% 60%, rgba(204, 255, 0, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse 100% 50% at 50% 100%, rgba(233, 255, 122, 0.12) 0%, transparent 45%),
            linear-gradient(180deg, #141a0a 0%, #0b0e06 40%, #050703 100%)
          `,
        }}
        aria-hidden="true"
      />

      <div
        className="grid-pulse absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(233, 255, 122, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(233, 255, 122, 0.05) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse 90% 80% at 50% 45%, black 15%, transparent 75%)",
        }}
        aria-hidden="true"
      />

      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#E9FF7A]/40 to-transparent"
        aria-hidden="true"
      />

      {orbs.map((o, i) => (
        <div
          key={i}
          className="hood-float absolute"
          style={{
            left: `${o.left}%`,
            top: `${o.top}%`,
            transform: `scale(${o.scale})`,
            animationDelay: `${o.delay}s`,
            opacity: o.opacity,
          }}
          aria-hidden="true"
        >
          <HoodBallIcon size={44} glow={false} />
        </div>
      ))}

      <div
        className="hood-shimmer absolute inset-x-0 bottom-0 h-48"
        style={{
          background: "linear-gradient(to top, rgba(143, 184, 0, 0.1), transparent)",
        }}
        aria-hidden="true"
      />
    </div>
  );
}
