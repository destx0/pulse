// Stores what LeetCode publishes about one profile. One request per refresh: the submission calendar covers every
// year, so there is no backfill to page through.
import { eq } from "drizzle-orm";
import type { Db } from "../../db";
import { leetcodeDays, leetcodeProfiles, leetcodeSubmissions } from "../../db/schema";
import { fetchLeetcode, LeetcodeError, type LeetcodeSnapshot } from "./client";

const CHUNK = 500;

function errorCode(err: unknown): string {
  if (err instanceof LeetcodeError) return `${err.code}${err.status && err.status !== 200 ? ` (HTTP ${err.status})` : ""}`;
  return "unavailable";
}

/** Replaces the profile, calendar and recent solves in one transaction. */
export async function storeLeetcode(db: Db, userId: number, snapshot: LeetcodeSnapshot, now = Math.floor(Date.now() / 1000)): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .insert(leetcodeProfiles)
      .values({
        userId,
        username: snapshot.username,
        realName: snapshot.realName,
        avatarUrl: snapshot.avatarUrl,
        ranking: snapshot.ranking,
        reputation: snapshot.reputation,
        starRating: snapshot.starRating,
        solvedTotal: snapshot.solved.total,
        solvedEasy: snapshot.solved.easy,
        solvedMedium: snapshot.solved.medium,
        solvedHard: snapshot.solved.hard,
        submissionsTotal: snapshot.submissionsTotal,
        streak: snapshot.streak,
        activeDays: snapshot.activeDays,
        contestRating: snapshot.contest?.rating ?? null,
        contestsAttended: snapshot.contest?.attended ?? null,
        contestGlobalRanking: snapshot.contest?.globalRanking ?? null,
        contestTopPct: snapshot.contest?.topPct ?? null,
        connectedAt: now,
        syncedAt: now,
        lastError: null,
      })
      .onConflictDoUpdate({
        target: leetcodeProfiles.userId,
        set: {
          username: snapshot.username,
          realName: snapshot.realName,
          avatarUrl: snapshot.avatarUrl,
          ranking: snapshot.ranking,
          reputation: snapshot.reputation,
          starRating: snapshot.starRating,
          solvedTotal: snapshot.solved.total,
          solvedEasy: snapshot.solved.easy,
          solvedMedium: snapshot.solved.medium,
          solvedHard: snapshot.solved.hard,
          submissionsTotal: snapshot.submissionsTotal,
          streak: snapshot.streak,
          activeDays: snapshot.activeDays,
          contestRating: snapshot.contest?.rating ?? null,
          contestsAttended: snapshot.contest?.attended ?? null,
          contestGlobalRanking: snapshot.contest?.globalRanking ?? null,
          contestTopPct: snapshot.contest?.topPct ?? null,
          syncedAt: now,
          lastError: null,
        },
      });

    await tx.delete(leetcodeDays).where(eq(leetcodeDays.userId, userId));
    for (let i = 0; i < snapshot.days.length; i += CHUNK) {
      const rows = snapshot.days.slice(i, i + CHUNK).map((d) => ({ userId, day: d.day, submissions: d.submissions }));
      if (rows.length) await tx.insert(leetcodeDays).values(rows);
    }

    for (let i = 0; i < snapshot.recent.length; i += CHUNK) {
      const rows = snapshot.recent.slice(i, i + CHUNK).map((r) => ({ userId, id: r.id, title: r.title, titleSlug: r.slug, lang: r.lang, submittedAt: r.at }));
      if (rows.length) await tx.insert(leetcodeSubmissions).values(rows).onConflictDoNothing();
    }
  });
}

/** Fetches and stores the profile saved for this user. A source without a saved username has nothing to pull. */
export async function pullLeetcode(db: Db, userId: number): Promise<{ changed: boolean }> {
  const [row] = await db.select({ username: leetcodeProfiles.username }).from(leetcodeProfiles).where(eq(leetcodeProfiles.userId, userId));
  if (!row) return { changed: false };
  try {
    const snapshot = await fetchLeetcode(row.username);
    await storeLeetcode(db, userId, snapshot);
    return { changed: true };
  } catch (err) {
    // The last good numbers stay on screen; Settings shows the code until the next success.
    await db.update(leetcodeProfiles).set({ lastError: errorCode(err) }).where(eq(leetcodeProfiles.userId, userId));
    throw err;
  }
}

/** Validates the username by fetching it before anything is saved, so a typo never becomes a connected source. */
export async function connectLeetcode(db: Db, userId: number, username: string): Promise<void> {
  const snapshot = await fetchLeetcode(username);
  await storeLeetcode(db, userId, snapshot);
}

export async function disconnectLeetcode(db: Db, userId: number): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(leetcodeDays).where(eq(leetcodeDays.userId, userId));
    await tx.delete(leetcodeSubmissions).where(eq(leetcodeSubmissions.userId, userId));
    await tx.delete(leetcodeProfiles).where(eq(leetcodeProfiles.userId, userId));
  });
}
