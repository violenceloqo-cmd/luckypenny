"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Flame } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { solscanTxUrl } from "@/lib/solana/cluster";
import { getPublicTokenDecimals } from "@/lib/token";
import { formatSol, formatTime, formatTokens, shortSig } from "@/lib/utils";

/** pending → bought (burn in flight) → burned. `skipped` = dry-run or zero payout. */
export type DropStatus = "pending" | "bought" | "burned" | "failed" | "skipped";

export interface FeedDrop {
  id: string;
  username: string;
  slot_index: number;
  multiplier: number;
  sol_in: number;
  sol_out: number;
  status: DropStatus;
  buy_sig?: string | null;
  burn_sig?: string | null;
  tokens_burned?: string | null;
  error?: string | null;
  created_at: string;
}

export interface LiveFeedProps {
  drops: FeedDrop[];
  className?: string;
}

/** Each status gets its own badge. Never label a row as something it isn't. */
const STATUS_BADGE: Record<DropStatus, { label: string; className: string }> = {
  pending: { label: "buying", className: "bg-white/10 text-white/60 border-white/20" },
  bought: { label: "burning", className: "bg-[#FF8A3D]/15 text-[#FFB27A] border-[#FF8A3D]/35 animate-pulse" },
  burned: { label: "burned", className: "bg-[#14F195]/15 text-[#14F195] border-[#14F195]/35" },
  skipped: { label: "skipped", className: "bg-[#9945FF]/15 text-[#b98cff] border-[#9945FF]/30" },
  failed: { label: "failed", className: "bg-red-500/15 text-red-300 border-red-500/30" },
};

function SolscanLink({ sig, label, tone }: { sig: string; label: string; tone: "buy" | "burn" }) {
  const toneClass =
    tone === "burn"
      ? "border-[#FF8A3D]/30 bg-[#FF8A3D]/10 text-[#FFB27A] hover:border-[#FF8A3D]/55"
      : "border-[#00D1FF]/25 bg-[#00D1FF]/10 text-[#00D1FF] hover:border-[#00D1FF]/45";
  return (
    <a
      href={solscanTxUrl(sig)}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 ${toneClass}`}
      title={`View ${label.toLowerCase()} transaction on Solscan`}
    >
      {label} {shortSig(sig)}
      <ExternalLink className="h-3 w-3" aria-hidden="true" />
    </a>
  );
}

export default function LiveFeed({ drops, className = "" }: LiveFeedProps) {
  const decimals = getPublicTokenDecimals();
  const visibleDrops = useMemo(
    () => drops.filter((d) => d.status !== "failed").slice(0, 50),
    [drops],
  );

  return (
    <div className={`glass flex h-full flex-col rounded-xl p-3 text-white ${className}`}>
      <div className="mb-2 flex items-center justify-between border-b border-white/8 px-1 pb-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#14F195] opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#14F195]" />
          </span>
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/70">Live Burns</h2>
        </div>
        <span className="font-mono text-[10px] text-white/40">{visibleDrops.length} drops</span>
      </div>
      <div className="feed-scroll -mr-1 flex max-h-[40vh] min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1 lg:max-h-none">
        <AnimatePresence initial={false}>
          {visibleDrops.map((d) => {
            const badge = STATUS_BADGE[d.status];
            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25 }}
                className="rounded-lg border border-[#00D1FF]/15 bg-black/40 px-3 py-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-bold text-white/90">{d.username}</span>
                  <span
                    className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                  <span>
                    <span className="font-extrabold text-[#00D1FF]">{Number(d.multiplier)}x</span>
                    {" → "}
                    <span className="font-mono text-[#14F195]">{formatSol(Number(d.sol_out))} SOL</span>
                  </span>
                  <span className="text-white/40">{formatTime(d.created_at)} ago</span>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-1.5 text-[10px]">
                  {d.tokens_burned && (
                    <span className="inline-flex items-center gap-1 text-white/45">
                      <Flame className="h-3 w-3 text-[#FF8A3D]" aria-hidden="true" />
                      <span className="font-mono text-[#FFB27A]">{formatTokens(d.tokens_burned, decimals)}</span>
                    </span>
                  )}
                  {d.buy_sig && <SolscanLink sig={d.buy_sig} label="Buy" tone="buy" />}
                  {d.burn_sig && <SolscanLink sig={d.burn_sig} label="Burn" tone="burn" />}
                  {!d.buy_sig && d.status === "pending" && (
                    <span className="text-white/35">Buying on pump.fun…</span>
                  )}
                  {d.status === "skipped" && d.error && (
                    <span className="truncate text-white/35" title={d.error}>
                      {d.error.startsWith("dry-run") ? "Dry run — nothing sent" : "Nothing to buy"}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {visibleDrops.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#00D1FF]/25 bg-[#0a0a14]/50 py-8 text-center text-xs text-white/45">
            Waiting for the first SOL drop…
          </div>
        )}
      </div>
    </div>
  );
}

export function useLiveFeedTicker() {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setT((x) => x + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);
}
