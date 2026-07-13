"use client";

import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { Check, Copy, LogOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import Board, { type DropEvent } from "@/components/Board";
import DropButton from "@/components/DropButton";
import LiveFeed, { type FeedDrop, useLiveFeedTicker } from "@/components/LiveFeed";
import LoginCard from "@/components/LoginCard";
import HoodBallIcon from "@/components/HoodBallIcon";
import HoodDropper from "@/components/HoodDropper";
import StatsBar from "@/components/Stats";
import ThemeBackground from "@/components/ThemeBackground";
import WinCameo from "@/components/WinCameo";
import { isBigWin } from "@/lib/game/multipliers";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getPublicTokenAddress } from "@/lib/token";
import { upsertFeedDrop } from "@/lib/feed";

interface Me {
  user: { uid: string; username: string } | null;
  cooldownRemainingMs: number;
  cooldownSeconds: number;
  dropCostUsd: number;
}

interface DropsResponse {
  drops: FeedDrop[];
  stats: {
    totalDrops: number;
    totalUsdOut: number;
    totalTokensBought: string;
    biggestMultiplier: number;
  };
}

const DEFAULT_COOLDOWN_SEC = 60;
const DEFAULT_DROP_COST_USD = 1;

const TOKEN_ADDRESS = getPublicTokenAddress();

function shortenAddress(addr: string) {
  if (!addr) return "";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export default function HomePage() {
  const [me, setMe] = useState<Me>({ user: null, cooldownRemainingMs: 0, cooldownSeconds: DEFAULT_COOLDOWN_SEC, dropCostUsd: DEFAULT_DROP_COST_USD });
  const [loadingMe, setLoadingMe] = useState(true);
  const [feed, setFeed] = useState<FeedDrop[]>([]);
  const [stats, setStats] = useState<DropsResponse["stats"]>({
    totalDrops: 0,
    totalUsdOut: 0,
    totalTokensBought: "0",
    biggestMultiplier: 0,
  });
  const [pendingDrops, setPendingDrops] = useState<DropEvent[]>([]);
  const [dropping, setDropping] = useState(false);
  const [announce, setAnnounce] = useState<string>("");
  const [cameo, setCameo] = useState<{ show: boolean; multiplier: number }>({ show: false, multiplier: 0 });
  const [copied, setCopied] = useState(false);

  const onCopyCA = useCallback(async () => {
    if (!TOKEN_ADDRESS) return;
    try {
      await navigator.clipboard.writeText(TOKEN_ADDRESS);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }, []);

  const seenAnimationRef = useRef<Set<string>>(new Set());

  useLiveFeedTicker();

  const loadMe = useCallback(async () => {
    const r = await fetch("/api/me", { cache: "no-store" });
    const data = (await r.json()) as Me;
    setMe(data);
    setLoadingMe(false);
  }, []);

  const loadFeed = useCallback(async () => {
    const r = await fetch("/api/drops", { cache: "no-store" });
    const data = (await r.json()) as DropsResponse;
    setFeed(data.drops);
    setStats(data.stats);
    for (const d of data.drops) seenAnimationRef.current.add(d.id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await loadMe();
      if (cancelled) return;
      await loadFeed();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMe, loadFeed]);

  useEffect(() => {
    const poll = window.setInterval(() => {
      void loadFeed();
    }, 20_000);
    return () => window.clearInterval(poll);
  }, [loadFeed]);

  useEffect(() => {
    const supa = getSupabaseClient();
    const channel = supa
      .channel("public:drops")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "drops" },
        (payload) => {
          const row = payload.new as FeedDrop & { server_seed: string };
          setFeed((cur) =>
            upsertFeedDrop(cur, {
              id: row.id,
              username: row.username,
              slot_index: row.slot_index,
              multiplier: Number(row.multiplier),
              usd_in: Number(row.usd_in),
              usd_out: Number(row.usd_out),
              status: row.status,
              buy_tx: row.buy_tx ?? null,
              tokens_bought: row.tokens_bought ?? null,
              created_at: row.created_at,
            }),
          );
          if (!seenAnimationRef.current.has(row.id)) {
            seenAnimationRef.current.add(row.id);
            setPendingDrops((cur) => {
              if (cur.some((p) => p.id === row.id)) return cur;
              return [...cur, { id: row.id, seed: row.server_seed, username: row.username }];
            });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "drops" },
        (payload) => {
          const row = payload.new as FeedDrop;
          setFeed((cur) =>
            upsertFeedDrop(cur, {
              id: row.id,
              status: row.status,
              buy_tx: row.buy_tx ?? null,
              tokens_bought: row.tokens_bought ?? null,
              error: row.error ?? null,
            }),
          );
          if (row.status === "bought" || row.status === "skipped") {
            setStats((s) => ({
              ...s,
              totalUsdOut: s.totalUsdOut + Number(row.usd_out),
              totalTokensBought: (() => {
                try {
                  return (BigInt(s.totalTokensBought) + BigInt(row.tokens_bought ?? "0")).toString();
                } catch {
                  return s.totalTokensBought;
                }
              })(),
            }));
          }
        },
      )
      .subscribe();
    return () => {
      void supa.removeChannel(channel);
    };
  }, []);

  const onDrop = useCallback(async () => {
    if (dropping || !me.user) return;
    setDropping(true);
    try {
      const r = await fetch("/api/drop", { method: "POST" });
      const data = await r.json();
      if (!r.ok) {
        if (typeof data.cooldownRemainingMs === "number") {
          setMe((cur) => ({ ...cur, cooldownRemainingMs: data.cooldownRemainingMs }));
        }
        setAnnounce(data.error ?? "Drop failed");
        return;
      }

      const dropId = data.dropId as string;
      const seed = data.seed as string;
      if (dropId && seed) {
        seenAnimationRef.current.add(dropId);
        setPendingDrops((cur) => {
          if (cur.some((p) => p.id === dropId)) return cur;
          return [...cur, { id: dropId, seed, username: me.user!.username }];
        });
        setFeed((cur) =>
          upsertFeedDrop(cur, {
            id: dropId,
            username: me.user!.username,
            slot_index: data.slotIndex as number,
            multiplier: Number(data.multiplier),
            usd_in: Number(data.usdIn),
            usd_out: Number(data.usdOut),
            status: "pending",
            created_at: new Date().toISOString(),
          }),
        );
      }

      setMe((cur) => ({ ...cur, cooldownRemainingMs: cur.cooldownSeconds * 1000 }));
      setStats((s) => ({ ...s, totalDrops: s.totalDrops + 1 }));
      setAnnounce(`Hood ball dropped — targeting ${data.multiplier}x slot.`);
    } finally {
      setDropping(false);
    }
  }, [dropping, me.user]);

  const onBallLanded = useCallback(
    (ev: DropEvent, slot: number, multiplier: number) => {
      setPendingDrops((cur) => cur.filter((p) => p.id !== ev.id));
      setAnnounce(`Landed: ${multiplier}x`);
      if (isBigWin(slot)) {
        confetti({
          particleCount: 180,
          spread: 90,
          origin: { y: 0.7 },
          colors: ["#CCFF00", "#E9FF7A", "#8FB800", "#ffffff"],
          scalar: 1.1,
        });
      }
      if (multiplier >= 100) {
        setCameo({ show: true, multiplier });
        window.setTimeout(() => setCameo({ show: false, multiplier: 0 }), 5500);
      }
    },
    [],
  );

  const onLogout = useCallback(async () => {
    await fetch("/api/me", { method: "DELETE" });
    setMe((cur) => ({ ...cur, user: null, cooldownRemainingMs: 0 }));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      if (me.user && me.cooldownRemainingMs <= 0 && !dropping) void onDrop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dropping, me.cooldownRemainingMs, me.user, onDrop]);

  return (
    <>
      <ThemeBackground />

      {!loadingMe && !me.user && (
        <LoginCard
          onLoggedIn={(u) => setMe((cur) => ({ ...cur, user: u, cooldownRemainingMs: 0 }))}
        />
      )}

      <main className="relative z-0 mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-[1400px] flex-col gap-2 overflow-hidden px-2 py-2 sm:gap-3 sm:px-4 sm:py-3">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 220, damping: 14 }}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0b0e06]/90 ring-1 ring-[#E9FF7A]/35 shadow-[0_0_24px_rgba(233,255,122,0.25)] sm:h-11 sm:w-11"
            >
              <HoodBallIcon size={28} />
            </motion.div>
            <div>
              <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-lg hood-text sm:text-xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                HOOD DROP
              </motion.h1>
              <span className="hidden text-[10px] uppercase tracking-[0.2em] text-white/40 sm:inline">
                Robinhood Chain Plinko · Buy &amp; Hold
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-white/90">
            {TOKEN_ADDRESS && (
              <button
                onClick={onCopyCA}
                title={`Copy contract address: ${TOKEN_ADDRESS}`}
                aria-label="Copy contract address"
                className="group flex items-center gap-1.5 rounded-lg border border-[#E9FF7A]/30 bg-[#0b0e06]/80 px-2.5 py-1 font-mono text-[11px] text-[#E9FF7A] transition hover:border-[#E9FF7A]/55 hover:bg-[#0b0e06] sm:text-xs"
              >
                <span className="hidden text-[10px] font-sans font-semibold uppercase tracking-widest text-white/40 sm:inline">
                  Mint
                </span>
                <span>{shortenAddress(TOKEN_ADDRESS)}</span>
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-[#CCFF00]" />
                ) : (
                  <Copy className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
                )}
              </button>
            )}

            {me.user && (
              <>
                <span className="rounded-lg border border-[#E9FF7A]/20 bg-[#0b0e06]/80 px-3 py-1 font-mono text-xs font-semibold text-white/80">
                  {me.user.username}
                </span>
                <button
                  onClick={onLogout}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-[#E9FF7A]/20 bg-[#0b0e06]/80 text-white/70 hover:border-[#E9FF7A]/40 hover:text-white sm:h-9 sm:w-9"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </header>

        <div className="shrink-0">
          <StatsBar
            totalDrops={stats.totalDrops}
            totalUsdOut={stats.totalUsdOut}
            totalTokensBought={stats.totalTokensBought}
            biggestMultiplier={stats.biggestMultiplier}
          />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_260px] xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="flex min-h-0 flex-col items-center justify-center gap-3">
            <div className="flex min-h-0 w-full flex-1 items-center justify-center">
              <div
                className="flex h-full max-h-full w-full items-center justify-center"
                style={{ aspectRatio: "672 / 580" }}
              >
                <HoodDropper>
                  <Board pending={pendingDrops} onBallLanded={onBallLanded} />
                </HoodDropper>
              </div>
            </div>
            <DropButton
              cooldownMs={me.cooldownRemainingMs}
              cooldownTotalMs={me.cooldownSeconds * 1000}
              dropCostUsd={me.dropCostUsd}
              onDrop={onDrop}
              disabled={!me.user}
              busy={dropping}
            />
          </section>

          <aside className="order-last min-h-0 lg:order-none">
            <LiveFeed drops={feed} />
          </aside>
        </div>
      </main>

      <div className="sr-only" role="status" aria-live="polite">
        {announce}
      </div>

      <WinCameo show={cameo.show} multiplier={cameo.multiplier} />
    </>
  );
}
