import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedAdmin: SupabaseClient | null = null;
let cachedAnon: SupabaseClient | null = null;

/**
 * Service-role client. Server-only — bypasses RLS for writes.
 *
 * Built lazily so that missing env vars don't blow up at module-load time
 * (which happens during Next.js `build` page-data collection).
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdmin) return cachedAdmin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  cachedAdmin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAdmin;
}

/**
 * Read-only client that uses the publishable (anon) key. Safe to use for
 * endpoints that only read public data (RLS will enforce row visibility).
 */
export function getSupabaseReader(): SupabaseClient {
  if (cachedAnon) return cachedAnon;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set");
  cachedAnon = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAnon;
}

/** Substrings that mean "we never reached Postgres", not "Postgres said no". */
const NETWORK_HINTS = [
  "fetch failed",
  "enotfound",
  "eai_again",
  "econnrefused",
  "etimedout",
  "getaddrinfo",
  "socket hang up",
];

export function supabaseHost(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").host;
  } catch {
    return "(NEXT_PUBLIC_SUPABASE_URL unset)";
  }
}

function messageOf(err: unknown): string {
  return err instanceof Error
    ? err.message
    : typeof err === "string"
      ? err
      : ((err as { message?: string })?.message ?? String(err));
}

/** True when we never reached Postgres at all (DNS, refused, timeout). */
export function isSupabaseUnreachable(err: unknown): boolean {
  const lower = messageOf(err).toLowerCase();
  return NETWORK_HINTS.some((h) => lower.includes(h));
}

/** An unreachable dependency is a 503, not a 500. */
export function supabaseErrorStatus(err: unknown): 500 | 503 {
  return isSupabaseUnreachable(err) ? 503 : 500;
}

/**
 * Supabase surfaces a bare `TypeError: fetch failed` when its host doesn't
 * resolve, which tells an operator nothing. Name the actual failure instead.
 */
export function describeSupabaseError(err: unknown): string {
  const msg = messageOf(err);
  const lower = msg.toLowerCase();

  if (isSupabaseUnreachable(err)) {
    return `Database unreachable: ${supabaseHost()} did not respond. The Supabase project may be paused or deleted — check NEXT_PUBLIC_SUPABASE_URL.`;
  }
  if (lower.includes("does not exist") || lower.includes("schema cache")) {
    return `${msg} — run the migrations in supabase/migrations/ (0001 → 0003).`;
  }
  return msg;
}

/**
 * Proxy that defers client creation until first property access. Routes can
 * keep doing `supabaseAdmin.from(...)` without crashing during build-time
 * static analysis.
 */
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabaseAdmin();
    const value = client[prop as keyof SupabaseClient];
    return typeof value === "function" ? value.bind(client) : value;
  },
}) as SupabaseClient;
