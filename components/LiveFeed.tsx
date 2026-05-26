"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

import { formatSol, formatTime, formatTokens, shortSig } from "@/lib/utils";

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
  created_at: string;
}

export interface LiveFeedProps {
  drops: FeedDrop[];
  cluster: "mainnet-beta" | "devnet";
}

function statusBadge(status: FeedDrop["status"]) {
  switch (status) {
    case "burned":
      return "bg-blue-500/30 text-blue-100 border-blue-400/40";
    case "bought":
      return "bg-sky-500/30 text-sky-100 border-sky-400/40";
    case "skipped":
      return "bg-slate-500/30 text-slate-100 border-slate-400/40";
    case "failed":
      return "bg-rose-500/30 text-rose-100 border-rose-400/40";
    default:
      return "bg-indigo-500/30 text-indigo-100 border-indigo-400/40";
  }
}

function explorerHref(sig: string, cluster: string) {
  const c = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${sig}${c}`;
}

export default function LiveFeed({ drops, cluster }: LiveFeedProps) {
  return (
    <div className="glass flex h-full flex-col rounded-2xl p-3 text-white">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-xs font-bold uppercase tracking-widest opacity-80">Flight Log</h2>
        <span className="text-[10px] opacity-60">{drops.length} flights</span>
      </div>
      <div className="feed-scroll -mr-1 flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto pr-1 lg:max-h-none">
        <AnimatePresence initial={false}>
          {drops.slice(0, 50).map((d) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.25 }}
              className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-bold">{d.username}</span>
                <span
                  className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] uppercase ${statusBadge(d.status)}`}
                >
                  {d.status}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-[11px] opacity-90">
                <span>
                  <span className="font-extrabold text-sky-200">{Number(d.multiplier)}x</span>
                  {" "}→ {formatSol(Number(d.sol_out))} SOL
                </span>
                <span className="opacity-60">{formatTime(d.created_at)} ago</span>
              </div>
              {(d.burn_sig || d.buy_sig) && (
                <div className="mt-1 flex items-center justify-between gap-2 text-[10px] opacity-80">
                  <span>
                    burned{" "}
                    <span className="font-mono">{formatTokens(d.tokens_burned, 6)}</span>
                  </span>
                  {(d.burn_sig || d.buy_sig) && (
                    <a
                      href={explorerHref((d.burn_sig || d.buy_sig) as string, cluster)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 underline hover:opacity-100"
                    >
                      {shortSig(d.burn_sig || d.buy_sig)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {drops.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/15 bg-black/20 py-6 text-center text-xs opacity-70">
            Be the first to launch a paper airplane.
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
