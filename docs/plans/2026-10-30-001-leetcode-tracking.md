# LeetCode tracking

Status: implemented 2026-10-30. A second, independent source beside Google Health, read from a public LeetCode
profile (`destx0`). It never feeds Recovery, Strain, Sleep or Pulse Age.

## What it tracks

| Metric | Source | Notes |
|---|---|---|
| Solved total and Easy / Medium / Hard | `submitStatsGlobal.acSubmissionNum` | `count` is distinct problems, not submissions |
| Current streak and active days | `userCalendar` | LeetCode's own streak; a day is a day with an accepted submission |
| Activity heatmap | `userCalendar.submissionCalendar` | Accepted submissions per day. A problem accepted twice counts twice **here**; this is activity, not unique problems |
| Contest rating, attended, global rank, top % | `userContestRanking` | Null when the profile has no rated contests, never a zero |
| Today's solved | Recent accepted submissions, exact timestamps | Distinct `titleSlug` values on the user's local day |
| Recent problems | `recentAcSubmissionList` | Latest 12 distinct problems (deduped by slug) |

One problem can be accepted more than once. Every problem count (today, recent, solved totals) dedupes by
`titleSlug`; the heatmap is explicitly submissions. LeetCode's recent list caps at 20 accepted submissions per
fetch, so a day with more than 20 accepted submissions can undercount today until the next sync adds more rows.

## Data

- `leetcode_profiles` — one row per user: username, avatar, ranking, solved counts, streak, contest, `synced_at`,
  `last_error` (status/code only).
- `leetcode_days` — `(user_id, day)` accepted submissions from the calendar.
- `leetcode_submissions` — accepted submissions keyed by LeetCode submission id; the query dedupes by slug.

Sync (`src/server/sources/leetcode/`): one GraphQL request per refresh, 15-minute throttle per user, in-flight
dedupe (`src/server/leetcode.ts`). Connecting fetches before saving, so a typo never becomes a connected source.
Disconnecting deletes all three tables' rows for that user. No token is stored: a public profile is the grant.

## UI

- `/leetcode` (`src/app/(app)/leetcode/`): profile and solved breakdown, streak, contest, 12-month activity
  heatmap, recent problems, Sync now, Disconnect.
- Home: a compact "N solved today" pill under the wordmark, and a LeetCode strip at the bottom; both only on
  today and only when connected.
- More: a "Tracked" row with today's count.
- Settings › Data source: the LeetCode card (connect, change username, sync, disconnect).

Honest states: not connected shows the connect form; a failed refresh keeps the last numbers and names the code;
no rated contests shows copy, not `0`; a private profile is explained on connect.

## Tests

- `src/server/sources/leetcode/client.test.ts` — parsing, calendar, contest, not found, private, 429/403/5xx,
  malformed responses, network failure.
- `src/server/queries/leetcode.test.ts` — empty state, counts, local-day boundary, dedupe of repeated accepted
  submissions, failed refresh, no contest, isolation.
- `src/server/queries/isolation.test.ts` — the LeetCode view model never reads another user's rows.

## Deliberately not included

- Health scoring, Pulse Age and Journal impact.
- Coach read tools.
- The landing site (`site/`) feature list and screenshots: this is a personal fork addition; update it if the
  feature ships upstream.
