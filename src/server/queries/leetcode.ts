// LeetCode `/leetcode` and the Today card. Reads only stored data: the page asks for a refresh on load
// (src/server/leetcode.ts), so a render never waits on LeetCode.
import { and, desc, eq, gte } from "drizzle-orm";
import { leetcodeDays, leetcodeProfiles, leetcodeSubmissions } from "../db/schema";
import { addDays, localDay } from "../time";
import { none, ok, todayOf, type QueryCtx } from "./common";
import type { LeetcodeVM } from "./types";

/** The heatmap window: 53 columns of 7 days, ending today. */
export const LEETCODE_WINDOW_DAYS = 371;
const RECENT_LIMIT = 50;
const SHOWN_RECENT = 12;
const STALE_S = 24 * 3600;

const empty = (): LeetcodeVM => ({
  connected: false,
  username: null,
  realName: null,
  avatarUrl: null,
  ranking: null,
  reputation: null,
  starRating: null,
  solved: { total: none("no_data"), easy: none("no_data"), medium: none("no_data"), hard: none("no_data") },
  submissions: none("no_data"),
  streak: none("no_data"),
  activeDays: none("no_data"),
  today: none("no_data"),
  contest: none("no_data"),
  activity: [],
  recent: [],
  syncedAt: null,
  error: null,
  stale: false,
});

/** The signed-in user's LeetCode view model. `connected: false` means no username is saved. */
export async function getLeetcode(ctx: QueryCtx): Promise<LeetcodeVM> {
  const [profile] = await ctx.db.select().from(leetcodeProfiles).where(eq(leetcodeProfiles.userId, ctx.userId));
  if (!profile) return empty();

  const today = todayOf(ctx);
  const from = addDays(today, -(LEETCODE_WINDOW_DAYS - 1));
  const [days, recent] = await Promise.all([
    ctx.db
      .select({ day: leetcodeDays.day, submissions: leetcodeDays.submissions })
      .from(leetcodeDays)
      .where(and(eq(leetcodeDays.userId, ctx.userId), gte(leetcodeDays.day, from)))
      .orderBy(leetcodeDays.day),
    ctx.db
      .select({ id: leetcodeSubmissions.id, title: leetcodeSubmissions.title, slug: leetcodeSubmissions.titleSlug, lang: leetcodeSubmissions.lang, at: leetcodeSubmissions.submittedAt })
      .from(leetcodeSubmissions)
      .where(eq(leetcodeSubmissions.userId, ctx.userId))
      .orderBy(desc(leetcodeSubmissions.submittedAt))
      .limit(RECENT_LIMIT),
  ]);

  const byDay = new Map(days.map((d) => [d.day, d.submissions]));
  const activity = Array.from({ length: LEETCODE_WINDOW_DAYS }, (_, i) => {
    const day = addDays(from, i);
    return { day, count: byDay.get(day) ?? 0 };
  });

  // One problem can be accepted more than once. The recent list is newest first, so the first row per slug is the
  // latest accepted submission for that problem; "today" and the list count distinct problems, never submissions.
  const unique: typeof recent = [];
  const seen = new Set<string>();
  for (const r of recent) {
    if (seen.has(r.slug)) continue;
    seen.add(r.slug);
    unique.push(r);
  }
  // LeetCode's calendar is keyed by its own (UTC) day, so "today" comes from exact submission times in the user's
  // zone. The recent list caps at 20 accepted submissions, far above a normal session.
  const todayCount = unique.filter((r) => localDay(r.at, ctx.timeZone) === today).length;

  return {
    connected: true,
    username: profile.username,
    realName: profile.realName,
    avatarUrl: profile.avatarUrl,
    ranking: profile.ranking,
    reputation: profile.reputation,
    starRating: profile.starRating,
    solved: {
      total: ok(profile.solvedTotal),
      easy: ok(profile.solvedEasy),
      medium: ok(profile.solvedMedium),
      hard: ok(profile.solvedHard),
    },
    submissions: ok(profile.submissionsTotal),
    streak: ok(profile.streak),
    activeDays: ok(profile.activeDays),
    today: profile.syncedAt === null ? none("no_data") : ok(todayCount),
    contest:
      profile.contestRating === null
        ? none("no_data")
        : ok({
            rating: profile.contestRating,
            attended: profile.contestsAttended ?? 0,
            globalRanking: profile.contestGlobalRanking,
            topPct: profile.contestTopPct,
          }),
    activity,
    recent: unique.slice(0, SHOWN_RECENT).map((r) => ({ id: r.id, title: r.title, slug: r.slug, lang: r.lang, at: r.at * 1000 })),
    syncedAt: profile.syncedAt === null ? null : profile.syncedAt * 1000,
    error: profile.lastError,
    stale: profile.syncedAt === null || ctx.now - profile.syncedAt > STALE_S,
  };
}
