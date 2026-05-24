const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,16}$/;

const RESERVED = new Set<string>([
  "admin",
  "administrator",
  "root",
  "system",
  "support",
  "moderator",
  "mod",
  "owner",
  "treasury",
  "luckypenny",
  "leprechaun",
  "official",
  "staff",
  "null",
  "undefined",
  "anon",
  "anonymous",
]);

// Tiny profanity guard. Not exhaustive — purely a low-effort first line.
const BLOCKED_SUBSTRINGS = ["nigg", "fag", "kike", "rape", "cunt"];

export interface UsernameValidation {
  ok: boolean;
  reason?: string;
  normalized?: string;
}

export function validateUsername(raw: unknown): UsernameValidation {
  if (typeof raw !== "string") return { ok: false, reason: "Username is required" };
  const trimmed = raw.trim();
  if (!USERNAME_REGEX.test(trimmed)) {
    return {
      ok: false,
      reason: "Username must be 3–16 characters (letters, numbers, underscore).",
    };
  }
  const lower = trimmed.toLowerCase();
  if (RESERVED.has(lower)) {
    return { ok: false, reason: "That username is reserved." };
  }
  for (const sub of BLOCKED_SUBSTRINGS) {
    if (lower.includes(sub)) {
      return { ok: false, reason: "Please pick a different username." };
    }
  }
  return { ok: true, normalized: trimmed };
}
