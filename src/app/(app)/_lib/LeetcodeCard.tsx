import Link from "next/link";
import { ChevronRight, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CAPTION } from "@/components/metrics/primitives";
import { CARD_LINK } from "@/components/shells/SectionShell";
import type { LeetcodeVM } from "@/server/queries/types";

/** Today's compact LeetCode strip: practice is a second source, so it never joins a health dial. */
export function LeetcodeCard({ vm }: { vm: LeetcodeVM }) {
  if (!vm.connected) return null;
  const solved = vm.solved.total.value;
  const today = vm.today.value;
  const streak = vm.streak.value;
  return (
    <Link href="/leetcode" className={cn(CARD_LINK, "flex min-h-16 items-center gap-3 p-4 xl:p-5")}>
      <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-optimal/15 text-optimal-text">
        <Code2 className="size-5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs leading-4 font-bold tracking-[0.1em] uppercase">LeetCode</span>
        <span className={cn(CAPTION, "block truncate tabular-nums", vm.error && "text-warning-text")}>
          {vm.error ? "Sync failed — open for details" : today === null ? "Not synced yet" : `${today} solved today`}
          {!vm.error && streak !== null && streak > 0 && ` · ${streak}-day streak`}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-numeric text-xl leading-6 font-semibold tabular-nums">{solved === null ? "--" : solved.toLocaleString("en-US")}</span>
        <span className={cn(CAPTION, "block")}>solved</span>
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
    </Link>
  );
}

/**
 * Today's solved count in the Home header block, under the wordmark (the screenshot's "top"). Hidden until a
 * username is connected; "Syncing…" until the first fetch lands, never a made-up zero.
 */
export function LeetcodeToday({ vm }: { vm: LeetcodeVM }) {
  if (!vm.connected) return null;
  const failed = vm.error !== null;
  const today = vm.today.value;
  const value = failed ? "—" : today === null ? "—" : today;
  const label = failed ? "sync failed" : today === null ? "syncing" : "solved today";
  return (
    <div className="flex justify-center">
      <Link
        href="/leetcode"
        aria-label={failed ? "LeetCode: sync failed" : today === null ? "LeetCode: syncing today’s solves" : `LeetCode: ${today} solved today`}
        className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.045] px-3 py-1 text-[13px] leading-5 transition-[background-color,scale] duration-150 ease-standard outline-none hover:bg-foreground/[0.08] focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.96]"
      >
        <Code2 aria-hidden className={cn("size-4", failed ? "text-warning-text" : "text-optimal-text")} strokeWidth={2} />
        <span className="font-numeric font-bold tabular-nums">{value}</span>
        <span className={cn(failed ? "text-warning-text" : "text-muted-foreground")}>{label}</span>
      </Link>
    </div>
  );
}
