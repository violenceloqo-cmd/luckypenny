"use client";

import { Flame, Plane, Rocket, Trophy } from "lucide-react";

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
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="glass flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 sm:px-4">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-200 to-blue-600 text-blue-950 shadow-inner">
        {icon}
      </div>
      <div className="min-w-0 leading-tight">
        <div className="text-[10px] uppercase tracking-widest text-white/60">{label}</div>
        <div className="truncate text-base font-extrabold text-white sm:text-lg">{value}</div>
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
        icon={<Plane className="h-4 w-4" />}
        label="Flights Today"
        value={totalDrops.toLocaleString()}
      />
      <Tile
        icon={<Rocket className="h-4 w-4" />}
        label="SOL Spent"
        value={`${formatSol(totalSolOut)} SOL`}
      />
      <Tile
        icon={<Flame className="h-4 w-4" />}
        label="Tokens Burned"
        value={formatTokens(totalTokensBurned, 6)}
      />
      <Tile
        icon={<Trophy className="h-4 w-4" />}
        label="Best Flight"
        value={`${biggestMultiplier}x`}
      />
    </div>
  );
}
