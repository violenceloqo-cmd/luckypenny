"use client";

import { useMemo } from "react";

import SolanaBallIcon from "@/components/SolanaBallIcon";

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
      opacity: 0.15 + rand() * 0.35,
    });
  }
  return out;
}

export default function ThemeBackground() {
  const orbs = useMemo(() => generateOrbs(18, 99173), []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#07070d]">
      {/* Solana gradient mesh */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 15% 10%, rgba(153, 69, 255, 0.35) 0%, transparent 55%),
            radial-gradient(ellipse 70% 50% at 85% 20%, rgba(0, 209, 255, 0.2) 0%, transparent 50%),
            radial-gradient(ellipse 90% 70% at 50% 100%, rgba(20, 241, 149, 0.12) 0%, transparent 45%),
            linear-gradient(180deg, #0a0a14 0%, #07070d 40%, #050508 100%)
          `,
        }}
        aria-hidden="true"
      />

      {/* Crypto grid */}
      <div
        className="grid-pulse absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(153, 69, 255, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(153, 69, 255, 0.12) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 90% 80% at 50% 40%, black 20%, transparent 75%)",
        }}
        aria-hidden="true"
      />

      {/* Scan line accent */}
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#14F195]/40 to-transparent"
        aria-hidden="true"
      />

      {/* Floating SOL orbs */}
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
          <SolanaBallIcon size={48} glow={false} />
        </div>
      ))}

      {/* Bottom glow strip — terminal feel */}
      <div
        className="absolute inset-x-0 bottom-0 h-32"
        style={{
          background: "linear-gradient(to top, rgba(153, 69, 255, 0.08), transparent)",
        }}
        aria-hidden="true"
      />
    </div>
  );
}
