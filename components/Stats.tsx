"use client";

import { Coins, CircleDot, Flame, Trophy } from "lucide-react";

import { formatSol, formatTokens } from "@/lib/utils";

export interface StatsBarProps {
  totalDrops: number;
  totalSolOut: number;
  totalTokensBurned: string;
  biggestMultiplier: number;
}

function Tile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="glass flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 sm:px-4">
      <div
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg shadow-inner"
        style={{
          background: `linear-gradient(135deg, ${accent}33, ${accent}88)`,
          border: `1px solid ${accent}55`,
          color: accent,
        }}
      >
        {icon}
      </div>
      <div className="min-w-0 leading-tight">
        <div className="text-[10px] uppercase tracking-widest text-white/45">{label}</div>
        <div className="mono-stat truncate text-base font-extrabold text-white sm:text-lg">{value}</div>
      </div>
    </div>
  );
}

export default function StatsBar({
  totalDrops,
  totalSolOut,
  totalTokensBurned,
  biggestMultiplier,
}: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      <Tile
        icon={<CircleDot className="h-4 w-4" />}
        label="Throws"
        value={totalDrops.toLocaleString()}
        accent="#EE1515"
      />
      <Tile
        icon={<Coins className="h-4 w-4" />}
        label="SOL Out"
        value={formatSol(totalSolOut)}
        accent="#FFCB05"
      />
      <Tile
        icon={<Flame className="h-4 w-4" />}
        label="Tokens Burned"
        value={formatTokens(totalTokensBurned, 6)}
        accent="#F5F5F5"
      />
      <Tile
        icon={<Trophy className="h-4 w-4" />}
        label="Best Catch"
        value={`${biggestMultiplier}x`}
        accent="#EE1515"
      />
    </div>
  );
}
