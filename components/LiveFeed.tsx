"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { blockscoutTxUrl } from "@/lib/evm/explorer";
import { getPublicTokenDecimals } from "@/lib/token";
import { formatTime, formatTokens, formatUsd, shortSig } from "@/lib/utils";

export type DropStatus = "pending" | "bought" | "failed" | "skipped";

export interface FeedDrop {
  id: string;
  username: string;
  slot_index: number;
  multiplier: number;
  usd_in: number;
  usd_out: number;
  status: DropStatus;
  buy_tx?: string | null;
  tokens_bought?: string | null;
  error?: string | null;
  created_at: string;
}

export interface LiveFeedProps {
  drops: FeedDrop[];
  className?: string;
}

/** Each status gets its own badge. Never label a row as something it isn't. */
const STATUS_BADGE: Record<DropStatus, string> = {
  bought: "bg-[#CCFF00]/20 text-[#CCFF00] border-[#CCFF00]/35",
  pending: "bg-white/10 text-white/60 border-white/20",
  skipped: "bg-[#8FB800]/15 text-[#8FB800] border-[#8FB800]/30",
  failed: "bg-red-500/15 text-red-300 border-red-500/30",
};

function BlockscoutLink({ hash, label }: { hash: string; label: string }) {
  return (
    <a
      href={blockscoutTxUrl(hash)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded border border-[#E9FF7A]/25 bg-[#E9FF7A]/10 px-1.5 py-0.5 text-[#E9FF7A] hover:border-[#CCFF00]/40 hover:text-[#CCFF00]"
      title={`View ${label.toLowerCase()} on Blockscout`}
    >
      {label} {shortSig(hash)}
      <ExternalLink className="h-3 w-3" />
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
      <div className="mb-2 flex items-center justify-between border-b border-white/8 pb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#CCFF00] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#CCFF00]" />
          </span>
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/70">Live Drops</h2>
        </div>
        <span className="font-mono text-[10px] text-white/40">{visibleDrops.length} drops</span>
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
              className="rounded-lg border border-[#E9FF7A]/15 bg-black/40 px-3 py-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-bold text-white/90">{d.username}</span>
                <span
                  className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase ${STATUS_BADGE[d.status]}`}
                >
                  {d.status}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                <span>
                  <span className="font-extrabold text-[#E9FF7A]">{Number(d.multiplier)}x</span>
                  {" → "}
                  <span className="font-mono text-[#CCFF00]">{formatUsd(Number(d.usd_out))}</span>
                </span>
                <span className="text-white/40">{formatTime(d.created_at)} ago</span>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-1.5 text-[10px]">
                {d.tokens_bought && (
                  <span className="text-white/45">
                    bought{" "}
                    <span className="font-mono text-[#8FB800]">
                      {formatTokens(d.tokens_bought, decimals)}
                    </span>
                  </span>
                )}
                {d.buy_tx ? (
                  <BlockscoutLink hash={d.buy_tx} label="Buy" />
                ) : (
                  <span className="text-white/35">Blockscout proof pending…</span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {visibleDrops.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#E9FF7A]/25 bg-[#0b0e06]/50 py-8 text-center text-xs text-white/45">
            Waiting for the first Hood drop…
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
