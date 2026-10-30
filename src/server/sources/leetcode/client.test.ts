import { describe, expect, it } from "vitest";
import { fetchLeetcode, LeetcodeError } from "./client";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const fetchWith = (body: unknown, status = 200) => (async () => json(body, status)) as unknown as typeof fetch;
const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return null;
  } catch (err) {
    return err instanceof LeetcodeError ? err.code : "other";
  }
};

const full = {
  data: {
    matchedUser: {
      username: "destx0",
      profile: { realName: "Pulak Ghosh", userAvatar: "https://assets.leetcode.com/a.png", ranking: 180640, reputation: 0, starRating: 2.5 },
      submitStatsGlobal: {
        acSubmissionNum: [
          { difficulty: "All", count: 545, submissions: 1242 },
          { difficulty: "Easy", count: 222, submissions: 520 },
          { difficulty: "Medium", count: 276, submissions: 649 },
          { difficulty: "Hard", count: 47, submissions: 73 },
        ],
      },
      userCalendar: {
        streak: 5,
        totalActiveDays: 80,
        submissionCalendar: JSON.stringify({ "1767225600": 2, "1767657600": 6 }),
      },
    },
    userContestRanking: { attendedContestsCount: 5, rating: 1486.41, globalRanking: 432534, topPercentage: 49.08 },
    recentAcSubmissionList: [
      { id: "2176849372", title: "Find Target Indices After Sorting Array", titleSlug: "find-target-indices-after-sorting-array", timestamp: "1792480681", lang: "python3" },
      { id: "bad", title: "", titleSlug: "", timestamp: "nope", lang: null },
    ],
  },
};

describe("fetchLeetcode", () => {
  it("parses solved counts, the calendar, contest rating and recent solves", async () => {
    const snap = await fetchLeetcode("destx0", fetchWith(full));
    expect(snap.username).toBe("destx0");
    expect(snap.solved).toEqual({ total: 545, easy: 222, medium: 276, hard: 47 });
    expect(snap.submissionsTotal).toBe(1242);
    expect(snap.streak).toBe(5);
    expect(snap.activeDays).toBe(80);
    expect(snap.days).toEqual([
      { day: "2026-01-01", submissions: 2 },
      { day: "2026-01-06", submissions: 6 },
    ]);
    expect(snap.contest).toEqual({ attended: 5, rating: 1486.41, globalRanking: 432534, topPct: 49.08 });
    expect(snap.recent).toEqual([{ id: "2176849372", title: "Find Target Indices After Sorting Array", slug: "find-target-indices-after-sorting-array", lang: "python3", at: 1792480681 }]);
  });

  it("a missing user is not_found, not an HTTP error", async () => {
    expect(await code(fetchLeetcode("nobody", fetchWith({ errors: [{ message: "That user does not exist." }], data: { matchedUser: null } })))).toBe("not_found");
  });

  it("a profile without public stats is private", async () => {
    const body = { data: { matchedUser: { username: "hidden", profile: null, submitStatsGlobal: null, userCalendar: null } } };
    expect(await code(fetchLeetcode("hidden", fetchWith(body)))).toBe("private");
  });

  it("maps rate limits, blocks and server errors to their codes", async () => {
    expect(await code(fetchLeetcode("destx0", fetchWith({}, 429)))).toBe("rate_limited");
    expect(await code(fetchLeetcode("destx0", fetchWith({}, 403)))).toBe("blocked");
    expect(await code(fetchLeetcode("destx0", fetchWith({}, 503)))).toBe("unavailable");
  });

  it("a malformed calendar or body is invalid_response", async () => {
    const broken = structuredClone(full);
    broken.data.matchedUser.userCalendar.submissionCalendar = "not json";
    expect(await code(fetchLeetcode("destx0", fetchWith(broken)))).toBe("invalid_response");
    expect(await code(fetchLeetcode("destx0", (async () => new Response("nope", { status: 200 })) as unknown as typeof fetch))).toBe("invalid_response");
  });

  it("a network failure is unavailable", async () => {
    const fail = (async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    expect(await code(fetchLeetcode("destx0", fail))).toBe("unavailable");
  });

  it("a profile with no contest history returns null, not a zero rating", async () => {
    const body = structuredClone(full);
    body.data.userContestRanking = null as never;
    expect((await fetchLeetcode("destx0", fetchWith(body))).contest).toBeNull();
  });
});
