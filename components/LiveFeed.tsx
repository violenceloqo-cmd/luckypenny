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
}

const BURNED_BADGE =
  "bg-[#14F195]/20 text-[#86efac] border-[#14F195]/35";

function explorerHref(sig: string) {
  return solscanTxUrl(sig);
}

export default function LiveFeed({ drops }: LiveFeedProps) {
  const visibleDrops = useMemo(
    () => drops.filter((d) => d.status !== "failed").slice(0, 50),
    [drops],
  );

  return (
    <div className="glass flex h-full flex-col rounded-xl p-3 text-white">
      <div className="mb-2 flex items-center justify-between border-b border-white/8 pb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#14F195] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#14F195]" />
          </span>
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/70">Live Drops</h2>
        </div>
        <span className="font-mono text-[10px] text-white/40">{visibleDrops.length} drops</span>
      </div>
      <div className="feed-scroll -mr-1 flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto pr-1 lg:max-h-none">
        <AnimatePresence initial={false}>
          {visibleDrops.map((d) => (
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
                  className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase ${BURNED_BADGE}`}
                >
                  burned
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                <span>
                  <span className="font-extrabold text-[#00D1FF]">{Number(d.multiplier)}x</span>
                  {" → "}
                  <span className="font-mono text-[#14F195]">{formatSol(Number(d.sol_out))}</span>
                </span>
                <span className="text-white/40">{formatTime(d.created_at)} ago</span>
              </div>
              {(d.burn_sig || d.buy_sig) && (
                <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-white/50">
                  <span>
                    burned{" "}
                    <span className="font-mono text-[#9945FF]">
                      {formatTokens(d.tokens_burned, 6)}
                    </span>
                  </span>
                  <a
                    href={explorerHref((d.burn_sig || d.buy_sig) as string)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#00D1FF] hover:text-[#14F195]"
                    title={d.burn_sig ? "View burn on Solscan" : "View buy on Solscan"}
                  >
                    {d.burn_sig ? shortSig(d.burn_sig) : shortSig(d.buy_sig!)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </motion.div>
          ))}
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
