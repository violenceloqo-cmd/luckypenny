import type { FeedDrop } from "@/components/LiveFeed";

/** Merge a drop row into the feed list (newest first). */
export function upsertFeedDrop(feed: FeedDrop[], row: Partial<FeedDrop> & { id: string }): FeedDrop[] {
  const next: FeedDrop = {
    id: row.id,
    username: row.username ?? "",
    slot_index: Number(row.slot_index ?? 0),
    multiplier: Number(row.multiplier ?? 0),
    usd_in: Number(row.usd_in ?? 0),
    usd_out: Number(row.usd_out ?? 0),
    status: (row.status as FeedDrop["status"]) ?? "pending",
    buy_tx: row.buy_tx ?? null,
    tokens_bought: row.tokens_bought ?? null,
    error: row.error ?? null,
    created_at: row.created_at ?? new Date().toISOString(),
  };

  const idx = feed.findIndex((d) => d.id === row.id);
  if (idx === -1) {
    return [next, ...feed].slice(0, 100);
  }

  return feed.map((d) => (d.id === row.id ? { ...d, ...next } : d));
}
