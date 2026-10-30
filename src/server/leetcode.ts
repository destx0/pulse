// LeetCode refreshes, fire-and-forget from page loads (the health worker's pattern). One request per user per
// 15 minutes; the page renders the stored numbers and the next load picks up the new ones.
import { getDb } from "./db";
import { pullLeetcode } from "./sources/leetcode/sync";

const THROTTLE_MS = 15 * 60_000;

type State = { inflight: Map<number, Promise<void>>; last: Map<number, number> };
// globalThis: survives dev reloads and is shared by the page and action bundles.
const g = globalThis as typeof globalThis & { __pulseLeetcode?: State };
const state = (g.__pulseLeetcode ??= { inflight: new Map(), last: new Map() });

/** Refreshes in the background unless this user was refreshed recently (or is being refreshed now). */
export function requestLeetcodeSync(userId: number, { force = false } = {}): void {
  if (state.inflight.has(userId)) return;
  if (!force && Date.now() - (state.last.get(userId) ?? 0) < THROTTLE_MS) return;
  state.last.set(userId, Date.now());
  const run = pullLeetcode(getDb(), userId)
    .then(() => undefined)
    .catch((err: unknown) => {
      console.error(`[leetcode] user ${userId} sync failed: ${err instanceof Error ? err.message : String(err)}`);
    })
    .finally(() => state.inflight.delete(userId));
  state.inflight.set(userId, run);
}

/** "Sync now": waits for any run in flight, then fetches once more so the action can report the result. */
export async function syncLeetcodeNow(userId: number): Promise<void> {
  await state.inflight.get(userId);
  state.last.set(userId, Date.now());
  await pullLeetcode(getDb(), userId);
}
