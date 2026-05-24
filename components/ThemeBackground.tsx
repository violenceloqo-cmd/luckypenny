"use client";

import { useMemo } from "react";

interface Clover {
  left: number;
  top: number;
  scale: number;
  delay: number;
  rotate: number;
}

function generateClovers(count: number, seed: number): Clover[] {
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const out: Clover[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      left: rand() * 100,
      top: 50 + rand() * 50,
      scale: 0.5 + rand() * 1.3,
      delay: rand() * 6,
      rotate: rand() * 360,
    });
  }
  return out;
}

function Clover({ size = 24, color = "#1f6b27" }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g fill={color} stroke="#0e3a18" strokeWidth="1.2">
        <ellipse cx="32" cy="18" rx="10" ry="13" />
        <ellipse cx="46" cy="32" rx="13" ry="10" />
        <ellipse cx="32" cy="46" rx="10" ry="13" />
        <ellipse cx="18" cy="32" rx="13" ry="10" />
        <circle cx="32" cy="32" r="4" fill="#0e3a18" />
      </g>
      <path
        d="M32 42 Q33 54 30 62"
        stroke="#0e3a18"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function Rainbow() {
  const bands = [
    { color: "#ff595e", r: 540 },
    { color: "#ff924c", r: 510 },
    { color: "#ffca3a", r: 480 },
    { color: "#8ac926", r: 450 },
    { color: "#1982c4", r: 420 },
    { color: "#6a4c93", r: 390 },
  ];
  return (
    <svg
      className="pointer-events-none absolute left-1/2 top-[8%] -translate-x-1/2 opacity-70 mix-blend-screen"
      width="1100"
      height="600"
      viewBox="-550 -50 1100 600"
      aria-hidden="true"
    >
      {bands.map((b, i) => (
        <circle
          key={i}
          cx="0"
          cy="540"
          r={b.r}
          fill="none"
          stroke={b.color}
          strokeWidth="22"
          opacity={0.55}
        />
      ))}
    </svg>
  );
}

function Cloud({ x, y, scale = 1, opacity = 0.85 }: { x: string; y: string; scale?: number; opacity?: number }) {
  return (
    <div
      className="pointer-events-none absolute"
      style={{ left: x, top: y, transform: `scale(${scale})`, opacity }}
      aria-hidden="true"
    >
      <svg width="220" height="80" viewBox="0 0 220 80">
        <g fill="#ffffff">
          <ellipse cx="40" cy="50" rx="40" ry="26" />
          <ellipse cx="90" cy="38" rx="42" ry="32" />
          <ellipse cx="150" cy="48" rx="38" ry="26" />
          <ellipse cx="190" cy="55" rx="28" ry="20" />
        </g>
      </svg>
    </div>
  );
}

function Hill({
  shade = "#2f8c2c",
  height = 220,
  offsetY = 0,
  zIndex = 0,
}: {
  shade?: string;
  height?: number;
  offsetY?: number;
  zIndex?: number;
}) {
  return (
    <svg
      className="pointer-events-none absolute left-0 right-0 w-full"
      style={{ bottom: offsetY, height, zIndex }}
      viewBox="0 0 1440 220"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0,140 C220,40 480,40 720,120 C960,200 1220,80 1440,120 L1440,220 L0,220 Z"
        fill={shade}
      />
    </svg>
  );
}

export default function ThemeBackground() {
  const clovers = useMemo(() => generateClovers(28, 12345), []);
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Sky gradient already on body. Add sun, clouds, hills, rainbow, clovers. */}
      <div
        className="absolute left-[8%] top-[6%] h-24 w-24 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, #fff7c2 0%, #fde047 60%, rgba(253, 224, 71, 0) 80%)",
          boxShadow: "0 0 80px rgba(253, 224, 71, 0.7)",
        }}
        aria-hidden="true"
      />
      <Cloud x="6%" y="12%" scale={0.9} opacity={0.85} />
      <Cloud x="68%" y="7%" scale={1.1} />
      <Cloud x="38%" y="18%" scale={0.7} opacity={0.7} />
      <Rainbow />
      <Hill shade="#2f8c2c" height={260} offsetY={0} zIndex={1} />
      <Hill shade="#1f6b27" height={200} offsetY={-40} zIndex={2} />
      <Hill shade="#0f4d18" height={140} offsetY={-90} zIndex={3} />

      {/* Foreground clovers floating subtly */}
      <div className="absolute inset-0">
        {clovers.map((c, i) => (
          <div
            key={i}
            className="clover-float absolute"
            style={{
              left: `${c.left}%`,
              top: `${c.top}%`,
              transform: `scale(${c.scale}) rotate(${c.rotate}deg)`,
              animationDelay: `${c.delay}s`,
              filter: "drop-shadow(0 2px 0 rgba(0,0,0,0.25))",
            }}
            aria-hidden="true"
          >
            <Clover size={26} color={i % 4 === 0 ? "#0f4d18" : "#1f6b27"} />
          </div>
        ))}
      </div>
    </div>
  );
}
