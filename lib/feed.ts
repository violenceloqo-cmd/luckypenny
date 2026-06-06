import type { FeedDrop } from "@/components/LiveFeed";

/** Merge a drop row into the feed list (newest first). */
export function upsertFeedDrop(feed: FeedDrop[], row: Partial<FeedDrop> & { id: string }): FeedDrop[] {
  const next: FeedDrop = {
    id: row.id,
    username: row.username ?? "",
    slot_index: Number(row.slot_index ?? 0),
    multiplier: Number(row.multiplier ?? 0),
    sol_in: Number(row.sol_in ?? 0),
    sol_out: Number(row.sol_out ?? 0),
    status: (row.status as FeedDrop["status"]) ?? "pending",
    buy_sig: row.buy_sig ?? null,
    burn_sig: row.burn_sig ?? null,
    tokens_burned: row.tokens_burned ?? null,
    error: row.error ?? null,
    created_at: row.created_at ?? new Date().toISOString(),
  };

  const idx = feed.findIndex((d) => d.id === row.id);
  if (idx === -1) {
    return [next, ...feed].slice(0, 100);
  }

  return feed.map((d) => (d.id === row.id ? { ...d, ...next } : d));
}
