// Copy for a LeetCode failure, and the username a person may paste (a name, @name or profile URL).
import { LeetcodeError } from "./client";

/** Accepts `name`, `@name` or a profile URL; returns the username or null. */
export function parseLeetcodeUsername(raw: FormDataEntryValue | string | null): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().replace(/^@/, "");
  const url = /^https?:\/\/(?:www\.)?leetcode\.com\/(?:u\/)?([A-Za-z0-9_-]+)\/?$/i.exec(s);
  const username = (url?.[1] ?? s).trim();
  return /^[A-Za-z0-9_-]{1,30}$/.test(username) ? username : null;
}

export function leetcodeErrorText(err: unknown): string {
  if (!(err instanceof LeetcodeError)) return "Couldn’t reach LeetCode. Try again.";
  switch (err.code) {
    case "not_found":
      return "No LeetCode profile with that username.";
    case "private":
      return "That profile doesn’t share its stats publicly.";
    case "rate_limited":
      return "LeetCode is rate limiting. Try again in a minute.";
    case "blocked":
      return "LeetCode blocked the request. Try again later.";
    case "invalid_response":
      return "LeetCode returned something unexpected. Try again.";
    default:
      return "Couldn’t reach LeetCode. Try again.";
  }
}
