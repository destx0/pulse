// The LeetCode view model: stored data only, local "today" from exact submission times, honest empty states.
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../db";
import { leetcodeDays, leetcodeProfiles, leetcodeSubmissions } from "../db/schema";
import { addUser, ctxFor, freshDb, NOW, TZ, USER } from "../testing";
import { addDays, localDay } from "../time";
import { getLeetcode, LEETCODE_WINDOW_DAYS } from "./leetcode";

let db: Db;
const profile = (userId = USER) => ({
  userId,
  username: "destx0",
  realName: "Pulak Ghosh",
  avatarUrl: "https://assets.leetcode.com/a.png",
  ranking: 180640,
  reputation: 0,
  starRating: 2.5,
  solvedTotal: 545,
  solvedEasy: 222,
  solvedMedium: 276,
  solvedHard: 47,
  submissionsTotal: 1242,
  streak: 5,
  activeDays: 80,
  contestRating: 1486.41,
  contestsAttended: 5,
  contestGlobalRanking: 432534,
  contestTopPct: 49.08,
  connectedAt: NOW - 3600,
  syncedAt: NOW - 600,
  lastError: null,
});

beforeEach(async () => {
  db = await freshDb();
});

describe("getLeetcode", () => {
  it("is honest before a username is saved", async () => {
    const vm = await getLeetcode(ctxFor(db));
    expect(vm).toMatchObject({ connected: false, username: null, activity: [], recent: [], syncedAt: null, error: null });
    expect(vm.solved.total).toMatchObject({ value: null, reason: "no_data" });
    expect(vm.today).toMatchObject({ value: null, reason: "no_data" });
  });

  it("reads solved counts, streak, contest, today and recent solves", async () => {
    const today = localDay(NOW, TZ);
    const yesterday = addDays(today, -1);
    await db.insert(leetcodeProfiles).values(profile());
    await db.insert(leetcodeDays).values([
      { userId: USER, day: yesterday, submissions: 3 },
      { userId: USER, day: today, submissions: 4 },
    ]);
    await db.insert(leetcodeSubmissions).values([
      { userId: USER, id: "a", title: "Two Sum", titleSlug: "two-sum", lang: "python3", submittedAt: NOW - 600 },
      { userId: USER, id: "b", title: "Add Two Numbers", titleSlug: "add-two-numbers", lang: "python3", submittedAt: NOW - 120 },
      // The same problem accepted again: one problem, not two.
      { userId: USER, id: "a2", title: "Two Sum", titleSlug: "two-sum", lang: "python3", submittedAt: NOW - 300 },
    ]);

    const vm = await getLeetcode(ctxFor(db));
    expect(vm.connected).toBe(true);
    expect(vm.solved).toMatchObject({ total: { value: 545 }, easy: { value: 222 }, medium: { value: 276 }, hard: { value: 47 } });
    expect(vm.submissions.value).toBe(1242);
    expect(vm.streak.value).toBe(5);
    expect(vm.activeDays.value).toBe(80);
    expect(vm.today.value).toBe(2);
    expect(vm.contest.value).toEqual({ rating: 1486.41, attended: 5, globalRanking: 432534, topPct: 49.08 });
    expect(vm.activity).toHaveLength(LEETCODE_WINDOW_DAYS);
    expect(vm.activity.at(-1)).toEqual({ day: today, count: 4 });
    expect(vm.recent.map((r) => r.title)).toEqual(["Add Two Numbers", "Two Sum"]);
    expect(vm.recent[0].at).toBe((NOW - 120) * 1000);
    expect(vm.recent[1].id).toBe("a2");
    expect(vm.syncedAt).toBe((NOW - 600) * 1000);
    expect(vm.error).toBeNull();
  });

  it("counts today in the user's zone, not UTC", async () => {
    // 2026-10-02T00:30+05:30 is still 2026-10-01 in UTC; the submission belongs to the local 2nd.
    const late = Date.parse("2026-10-02T00:30:00+05:30") / 1000;
    await db.insert(leetcodeProfiles).values({ ...profile(), syncedAt: late });
    await db.insert(leetcodeSubmissions).values({ userId: USER, id: "late", title: "Late", titleSlug: "late", lang: "cpp", submittedAt: late });
    const vm = await getLeetcode(ctxFor(db, late));
    expect(vm.today.value).toBe(1);
  });

  it("keeps the last good numbers when the last refresh failed", async () => {
    await db.insert(leetcodeProfiles).values({ ...profile(), lastError: "rate_limited (HTTP 429)", syncedAt: NOW - 7200 });
    const vm = await getLeetcode(ctxFor(db));
    expect(vm.error).toBe("rate_limited (HTTP 429)");
    expect(vm.solved.total.value).toBe(545);
    expect(vm.stale).toBe(false);
  });

  it("no contest history is no_data, not a zero rating", async () => {
    await db.insert(leetcodeProfiles).values({ ...profile(), contestRating: null, contestsAttended: null, contestGlobalRanking: null, contestTopPct: null });
    const vm = await getLeetcode(ctxFor(db));
    expect(vm.contest).toMatchObject({ value: null, reason: "no_data" });
  });

  it("never reads another user's LeetCode rows", async () => {
    const other = await addUser(db, "other@pulse.test");
    await db.insert(leetcodeProfiles).values(profile(other));
    await db.insert(leetcodeDays).values({ userId: other, day: "2026-10-01", submissions: 9 });
    await db.insert(leetcodeSubmissions).values({ userId: other, id: "x", title: "Other", titleSlug: "other", lang: "cpp", submittedAt: NOW });
    const vm = await getLeetcode(ctxFor(db));
    expect(vm.connected).toBe(false);
    expect(vm.activity).toEqual([]);
  });
});
