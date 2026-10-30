// LeetCode's public GraphQL, read-only. A profile is public data, so there is no token to keep: the username is the
// whole grant. The endpoint is unofficial and Cloudflare-fronted, so every failure maps to a code the UI can explain
// and no response body is ever logged.

const ENDPOINT = "https://leetcode.com/graphql";
const TIMEOUT_MS = 10_000;
const RECENT_LIMIT = 20;

export type LeetcodeCode = "not_found" | "private" | "rate_limited" | "blocked" | "unavailable" | "invalid_response";

export class LeetcodeError extends Error {
  constructor(
    readonly code: LeetcodeCode,
    readonly status: number | null = null,
  ) {
    super(code);
    this.name = "LeetcodeError";
  }
}

export type LeetcodeSnapshot = {
  username: string;
  realName: string | null;
  avatarUrl: string | null;
  ranking: number | null;
  reputation: number | null;
  starRating: number | null;
  solved: { total: number; easy: number; medium: number; hard: number };
  submissionsTotal: number;
  streak: number;
  activeDays: number;
  /** LeetCode's own day keys (`YYYY-MM-DD`, UTC) and accepted submission counts. */
  days: { day: string; submissions: number }[];
  contest: { attended: number; rating: number; globalRanking: number | null; topPct: number | null } | null;
  recent: { id: string; title: string; slug: string; lang: string | null; at: number }[];
};

const QUERY = `query pulse($username: String!, $limit: Int!) {
  matchedUser(username: $username) {
    username
    profile { realName userAvatar ranking reputation starRating }
    submitStatsGlobal { acSubmissionNum { difficulty count submissions } }
    userCalendar { streak totalActiveDays submissionCalendar }
  }
  userContestRanking(username: $username) {
    attendedContestsCount rating globalRanking topPercentage
  }
  recentAcSubmissionList(username: $username, limit: $limit) {
    id title titleSlug timestamp lang
  }
}`;

type Gql = {
  data?: {
    matchedUser?: {
      username?: string;
      profile?: { realName?: string | null; userAvatar?: string | null; ranking?: number | null; reputation?: number | null; starRating?: number | null } | null;
      submitStatsGlobal?: { acSubmissionNum?: { difficulty?: string; count?: number; submissions?: number }[] | null } | null;
      userCalendar?: { streak?: number; totalActiveDays?: number; submissionCalendar?: string | null } | null;
    } | null;
    userContestRanking?: { attendedContestsCount?: number | null; rating?: number | null; globalRanking?: number | null; topPercentage?: number | null } | null;
    recentAcSubmissionList?: { id?: string; title?: string; titleSlug?: string; timestamp?: string; lang?: string | null }[] | null;
  };
  errors?: { message?: string }[];
};

const finite = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const text = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const count = (v: unknown) => {
  const n = finite(v);
  return n === null || n < 0 ? null : Math.round(n);
};

function calendar(raw: string | null | undefined): { day: string; submissions: number }[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new LeetcodeError("invalid_response");
  }
  if (parsed === null || typeof parsed !== "object") throw new LeetcodeError("invalid_response");
  const out: { day: string; submissions: number }[] = [];
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    const at = Number(key);
    const n = count(value);
    if (!Number.isFinite(at) || at <= 0 || n === null) continue;
    out.push({ day: new Date(at * 1000).toISOString().slice(0, 10), submissions: n });
  }
  // Keys are day starts, but a malformed response could repeat one; the later value wins.
  const byDay = new Map(out.map((d) => [d.day, d]));
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/** Reads one public profile. Throws `LeetcodeError`; never returns a partial snapshot. */
export async function fetchLeetcode(username: string, fetchImpl: typeof fetch = fetch): Promise<LeetcodeSnapshot> {
  let res: Response;
  try {
    res = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        referer: `https://leetcode.com/${encodeURIComponent(username)}/`,
        origin: "https://leetcode.com",
        "user-agent": "Pulse/0.1 (self-hosted; +https://github.com/adityaongit/pulse)",
      },
      body: JSON.stringify({ query: QUERY, variables: { username, limit: RECENT_LIMIT } }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new LeetcodeError("unavailable");
  }
  if (res.status === 429) throw new LeetcodeError("rate_limited", 429);
  if (res.status === 403) throw new LeetcodeError("blocked", 403);
  if (!res.ok) throw new LeetcodeError("unavailable", res.status);

  let body: Gql;
  try {
    body = (await res.json()) as Gql;
  } catch {
    throw new LeetcodeError("invalid_response", res.status);
  }

  const user = body.data?.matchedUser;
  if (!user) {
    // LeetCode answers a missing user with an error entry, not an HTTP error.
    if (body.errors?.some((e) => /does not exist/i.test(e.message ?? ""))) throw new LeetcodeError("not_found", res.status);
    throw new LeetcodeError("invalid_response", res.status);
  }
  if (!user.submitStatsGlobal || !user.userCalendar) throw new LeetcodeError("private", res.status);

  const byDifficulty = new Map((user.submitStatsGlobal.acSubmissionNum ?? []).map((r) => [r.difficulty ?? "", r]));
  const solvedOf = (key: string) => count(byDifficulty.get(key)?.count) ?? 0;
  const contest = body.data?.userContestRanking;
  const recent = (body.data?.recentAcSubmissionList ?? [])
    .map((r) => {
      const at = Number(r.timestamp);
      if (!r.id || !r.title || !r.titleSlug || !Number.isFinite(at) || at <= 0) return null;
      return { id: r.id, title: r.title.trim(), slug: r.titleSlug, lang: text(r.lang), at: Math.floor(at) };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return {
    username: user.username ?? username,
    realName: text(user.profile?.realName),
    avatarUrl: text(user.profile?.userAvatar),
    ranking: count(user.profile?.ranking),
    reputation: count(user.profile?.reputation),
    starRating: finite(user.profile?.starRating),
    solved: { total: solvedOf("All"), easy: solvedOf("Easy"), medium: solvedOf("Medium"), hard: solvedOf("Hard") },
    submissionsTotal: count(byDifficulty.get("All")?.submissions) ?? 0,
    streak: count(user.userCalendar.streak) ?? 0,
    activeDays: count(user.userCalendar.totalActiveDays) ?? 0,
    days: calendar(user.userCalendar.submissionCalendar),
    contest:
      contest && finite(contest.rating) !== null
        ? {
            attended: count(contest.attendedContestsCount) ?? 0,
            rating: finite(contest.rating)!,
            globalRanking: count(contest.globalRanking),
            topPct: finite(contest.topPercentage),
          }
        : null,
    recent,
  };
}
