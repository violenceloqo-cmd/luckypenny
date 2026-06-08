"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { formatSol, formatTime, formatTokens, shortSig } from "@/lib/utils";
import { solscanTxUrl } from "@/lib/solana/cluster";

export interface FeedDrop {
  id: string;
  username: string;
  slot_index: number;
  multiplier: number;
  sol_in: number;
  sol_out: number;
  status: "pending" | "bought" | "burned" | "failed" | "skipped";
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

const BURNED_BADGE =
  "bg-[#4ade80]/20 text-[#bbf7d0] border-[#4ade80]/35";

function SolscanLink({
  sig,
  label,
}: {
  sig: string;
  label: string;
}) {
  return (
    <a
      href={solscanTxUrl(sig)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded border border-[#f5c518]/25 bg-[#f5c518]/10 px-1.5 py-0.5 text-[#f5c518] hover:border-[#4ade80]/40 hover:text-[#4ade80]"
      title={`View ${label.toLowerCase()} on Solscan`}
    >
      {label} {shortSig(sig)}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

export default function LiveFeed({ drops, className = "" }: LiveFeedProps) {
  const visibleDrops = useMemo(
    () => drops.filter((d) => d.status !== "failed").slice(0, 50),
    [drops],
  );

  return (
    <div className={`glass flex h-full flex-col rounded-xl p-3 text-white ${className}`}>
      <div className="mb-2 flex items-center justify-between border-b border-white/8 pb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ade80] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#4ade80]" />
          </span>
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/70">Live Bounty Drops</h2>
        </div>
        <span className="font-mono text-[10px] text-white/40">{visibleDrops.length} bags</span>
      </div>
      <div className="feed-scroll -mr-1 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1 max-h-[40vh] lg:max-h-none">
        <AnimatePresence initial={false}>
          {visibleDrops.map((d) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.25 }}
              className="rounded-lg border border-[#4ade80]/15 bg-black/40 px-3 py-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-bold text-white/90">{d.username}</span>
                <span
                  className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase ${BURNED_BADGE}`}
                >
                  {d.burn_sig ? "burned" : d.status === "pending" ? "pending" : "burned"}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                <span>
                  <span className="font-extrabold text-[#f5c518]">{Number(d.multiplier)}x</span>
                  {" → "}
                  <span className="font-mono text-[#4ade80]">{formatSol(Number(d.sol_out))}</span>
                </span>
                <span className="text-white/40">{formatTime(d.created_at)} ago</span>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-1.5 text-[10px]">
                {d.tokens_burned && (
                  <span className="text-white/45">
                    burned{" "}
                    <span className="font-mono text-[#ffe566]">
                      {formatTokens(d.tokens_burned, 6)}
                    </span>
                  </span>
                )}
                {d.burn_sig && <SolscanLink sig={d.burn_sig} label="Burn" />}
                {d.buy_sig && <SolscanLink sig={d.buy_sig} label="Buy" />}
                {!d.burn_sig && !d.buy_sig && (
                  <span className="text-white/35">Solscan proof pending…</span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {visibleDrops.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#4ade80]/25 bg-[#0c140c]/50 py-8 text-center text-xs text-white/45">
            Waiting for the first bounty bag drop…
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
