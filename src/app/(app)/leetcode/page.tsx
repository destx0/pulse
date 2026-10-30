import { connection } from "next/server";
import { ArrowUpRight, Code2, Flame, Trophy } from "lucide-react";
import { ago } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ActivityHeatmap, ActivityLegend } from "@/components/charts/ActivityHeatmap";
import { CAPTION } from "@/components/metrics/primitives";
import { MetricState } from "@/components/shells/MetricState";
import { PageShell } from "@/components/shells/PageShell";
import { SectionShell } from "@/components/shells/SectionShell";
import { requestLeetcodeSync } from "@/server/leetcode";
import { todayOf, userCtx } from "@/server/queries/common";
import { getLeetcode } from "@/server/queries/leetcode";
import type { LeetcodeVM } from "@/server/queries/types";
import { ConnectLeetcode } from "./ConnectLeetcode";
import { DisconnectLeetcodeButton } from "./DisconnectLeetcodeButton";
import { SyncLeetcodeButton } from "./SyncLeetcodeButton";

export const metadata = { title: "LeetCode", description: "Your LeetCode practice beside your health." };

const SKELETON = <span className="inline-block h-7 w-16 rounded-md bg-foreground/8" aria-hidden />;

/** A number from a Metric, with the kit's honest empty state. */
function Count({ metric, className }: { metric: LeetcodeVM["solved"]["total"]; className?: string }) {
  return (
    <MetricState metric={metric} skeleton={SKELETON}>
      {(v) => <span className={cn("font-numeric tabular-nums", className)}>{v.toLocaleString("en-US")}</span>}
    </MetricState>
  );
}

function Profile({ vm, now }: { vm: LeetcodeVM; now: number }) {
  const easy = vm.solved.easy.value ?? 0;
  const medium = vm.solved.medium.value ?? 0;
  const hard = vm.solved.hard.value ?? 0;
  const rows = [
    { label: "Easy", metric: vm.solved.easy, dot: "bg-optimal" },
    { label: "Medium", metric: vm.solved.medium, dot: "bg-warning" },
    { label: "Hard", metric: vm.solved.hard, dot: "bg-recovery-red" },
  ] as const;
  return (
    <SectionShell variant="card" title="Profile" info={false}>
      <div className="flex items-center gap-3">
        {vm.avatarUrl ? (
          // LeetCode's own avatar; plain img, not next/image, so a self-hosted server needs no remote allowlist.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={vm.avatarUrl} alt="" width={48} height={48} className="size-12 shrink-0 rounded-full bg-muted object-cover" />
        ) : (
          <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-foreground/8">
            <Code2 className="size-6 text-foreground-secondary" strokeWidth={1.5} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg leading-6 font-semibold">{vm.username}</p>
          <p className={cn(CAPTION, "truncate")}>
            {[vm.realName, vm.ranking !== null ? `Rank #${vm.ranking.toLocaleString("en-US")}` : null].filter(Boolean).join(" · ") || "LeetCode profile"}
          </p>
        </div>
        <a
          href={`https://leetcode.com/u/${encodeURIComponent(vm.username ?? "")}/`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs leading-4 font-bold tracking-[0.1em] text-foreground-secondary uppercase transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Open
          <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={2} />
        </a>
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <Count metric={vm.solved.total} className="block text-5xl leading-none font-semibold" />
          <p className={cn(CAPTION, "mt-1")}>problems solved</p>
        </div>
        <p className={cn(CAPTION, "tabular-nums")}>
          <Count metric={vm.submissions} /> accepted submissions
        </p>
      </div>

      <div aria-hidden className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted">
        {easy > 0 && <span className="rounded-l-full bg-optimal" style={{ flexGrow: easy }} />}
        {medium > 0 && <span className="bg-warning" style={{ flexGrow: medium }} />}
        {hard > 0 && <span className="rounded-r-full bg-recovery-red" style={{ flexGrow: hard }} />}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {rows.map((r) => (
          <div key={r.label} className="flex min-w-0 items-center gap-2">
            <span aria-hidden className={cn("size-2 shrink-0 rounded-[2px]", r.dot)} />
            <div className="min-w-0">
              <dt className={CAPTION}>{r.label}</dt>
              <dd className="text-lg leading-6 font-semibold">
                <Count metric={r.metric} />
              </dd>
            </div>
          </div>
        ))}
      </dl>

      <p className={cn(CAPTION, "mt-4 tabular-nums", vm.error && "text-warning-text")}>
        {vm.error
          ? `Couldn’t refresh (${vm.error}). Showing the last sync${vm.syncedAt ? ` from ${ago(vm.syncedAt, now)}` : ""}.`
          : vm.syncedAt
            ? `Synced ${ago(vm.syncedAt, now)}.`
            : "Not synced yet."}
      </p>
    </SectionShell>
  );
}

function StreakCard({ vm }: { vm: LeetcodeVM }) {
  return (
    <SectionShell variant="card" title="Streak" info={false} icon={<Flame />}>
      <MetricState metric={vm.streak} skeleton={SKELETON} empty={<p className={CAPTION}>No streak yet.</p>}>
        {(v) => (
          <p className="font-numeric text-3xl leading-9 font-semibold tabular-nums">
            {v}
            <span className="ml-1 text-base leading-6 font-medium text-foreground-secondary">{v === 1 ? "day" : "days"}</span>
          </p>
        )}
      </MetricState>
      <p className={cn(CAPTION, "mt-1 tabular-nums")}>
        <Count metric={vm.activeDays} /> active days
      </p>
    </SectionShell>
  );
}

function ContestCard({ vm }: { vm: LeetcodeVM }) {
  return (
    <SectionShell variant="card" title="Contest" info={false} icon={<Trophy />}>
      <MetricState metric={vm.contest} skeleton={SKELETON} empty={<p className={CAPTION}>No rated contests yet.</p>}>
        {(c) => (
          <>
            <p className="font-numeric text-3xl leading-9 font-semibold tabular-nums">{Math.round(c.rating)}</p>
            <p className={cn(CAPTION, "mt-1 tabular-nums")}>
              {c.attended} {c.attended === 1 ? "contest" : "contests"}
              {c.topPct !== null && ` · top ${c.topPct.toFixed(1)}%`}
            </p>
          </>
        )}
      </MetricState>
    </SectionShell>
  );
}

function Recent({ vm, now }: { vm: LeetcodeVM; now: number }) {
  return (
    <SectionShell variant="card" title="Recent problems" info={false}>
      {vm.recent.length === 0 ? (
        <p className={CAPTION}>No accepted problems in the last sync.</p>
      ) : (
        <ul className="divide-y divide-border">
          {vm.recent.map((r) => (
            <li key={r.id}>
              <a
                href={`https://leetcode.com/problems/${r.slug}/`}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-12 items-center gap-3 rounded-lg py-2 transition-colors outline-none hover:text-foreground-secondary focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="min-w-0 flex-1 truncate text-[15px] leading-[22px]">{r.title}</span>
                {r.lang && <span className={cn(CAPTION, "hidden shrink-0 sm:block")}>{r.lang}</span>}
                <span className={cn(CAPTION, "shrink-0 tabular-nums")}>{ago(r.at, now)}</span>
                <ArrowUpRight aria-hidden className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}

/** LeetCode `/leetcode` (More): a second source, deliberately outside every health score. */
export default async function LeetcodePage() {
  await connection();
  const ctx = await userCtx();
  const vm = await getLeetcode(ctx);
  // Fire-and-forget: this render shows stored data, the next one shows what changed.
  requestLeetcodeSync(ctx.userId);
  const now = ctx.now * 1000;
  const today = todayOf(ctx);

  return (
    <PageShell title="LeetCode" actions={vm.connected ? <SyncLeetcodeButton /> : undefined}>
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-3 xl:gap-4">
        {vm.connected ? (
          <>
            <Profile vm={vm} now={now} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <StreakCard vm={vm} />
              <ContestCard vm={vm} />
            </div>
            <SectionShell variant="card" title="Activity" info={false} aside={<span className="whitespace-nowrap">Last 12 months</span>}>
              <ActivityHeatmap days={vm.activity} today={today} />
              <ActivityLegend />
              <p className={cn(CAPTION, "mt-2")}>Accepted submissions per day. A problem accepted twice counts twice here; the solved totals above count distinct problems.</p>
            </SectionShell>
            <Recent vm={vm} now={now} />
            <div className="flex justify-center pt-2 pb-2">
              <DisconnectLeetcodeButton />
            </div>
          </>
        ) : (
          <SectionShell variant="card" title="Connect LeetCode" info={false}>
            <p className="text-[15px] leading-[22px] text-pretty text-foreground-secondary">
              Track solved problems, streaks and contest rating beside your health. Pulse reads only your public profile, and LeetCode never becomes a health input.
            </p>
            <div className="mt-4">
              <ConnectLeetcode />
            </div>
          </SectionShell>
        )}
      </div>
    </PageShell>
  );
}
