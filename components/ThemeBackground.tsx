"use client";

import { useMemo } from "react";

import PaperAirplaneIcon from "@/components/PaperAirplaneIcon";

interface FloatingPlane {
  left: number;
  top: number;
  scale: number;
  delay: number;
  rotate: number;
}

function generatePlanes(count: number, seed: number): FloatingPlane[] {
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const out: FloatingPlane[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      left: rand() * 100,
      top: 8 + rand() * 55,
      scale: 0.45 + rand() * 0.9,
      delay: rand() * 8,
      rotate: -30 + rand() * 60,
    });
  }
  return out;
}

function Cloud({ x, y, scale = 1, opacity = 0.9 }: { x: string; y: string; scale?: number; opacity?: number }) {
  return (
    <div
      className="cloud-drift pointer-events-none absolute"
      style={{ left: x, top: y, transform: `scale(${scale})`, opacity }}
      aria-hidden="true"
    >
      <svg width="200" height="72" viewBox="0 0 200 72">
        <g fill="#ffffff">
          <ellipse cx="36" cy="44" rx="36" ry="24" />
          <ellipse cx="82" cy="32" rx="38" ry="28" />
          <ellipse cx="138" cy="42" rx="34" ry="22" />
          <ellipse cx="172" cy="48" rx="26" ry="18" />
        </g>
      </svg>
    </div>
  );
}

export default function ThemeBackground() {
  const planes = useMemo(() => generatePlanes(14, 42426), []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Notebook grid at bottom */}
      <div
        className="absolute inset-x-0 bottom-0 h-[38%] opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "linear-gradient(to top, black 40%, transparent)",
        }}
        aria-hidden="true"
      />

      {/* Sun glow */}
      <div
        className="absolute right-[10%] top-[5%] h-28 w-28 rounded-full"
        style={{
          background: "radial-gradient(circle, #fff 0%, #fde68a 35%, rgba(253, 224, 171, 0) 70%)",
          boxShadow: "0 0 100px rgba(253, 224, 171, 0.6)",
        }}
        aria-hidden="true"
      />

      <Cloud x="4%" y="10%" scale={0.85} />
      <Cloud x="55%" y="6%" scale={1.05} opacity={0.75} />
      <Cloud x="78%" y="18%" scale={0.7} opacity={0.65} />

      {/* Distant horizon line */}
      <div
        className="absolute inset-x-0 bottom-[32%] h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
        aria-hidden="true"
      />

      {planes.map((p, i) => (
        <div
          key={i}
          className="plane-float absolute opacity-70"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            transform: `scale(${p.scale}) rotate(${p.rotate}deg)`,
            animationDelay: `${p.delay}s`,
            filter: "drop-shadow(0 4px 6px rgba(15, 39, 68, 0.2))",
          }}
          aria-hidden="true"
        >
          <PaperAirplaneIcon size={40} />
        </div>
      ))}
    </div>
  );
}
