import { PageShell } from "@/components/shells/PageShell";
import { Skeleton } from "@/components/ui/skeleton";

/** LeetCode's loading shape: profile, two stats, heatmap, recent solves. */
export default function Loading() {
  return (
    <PageShell title="LeetCode" loading>
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-3 xl:gap-4">
        <Skeleton className="h-56 rounded-2xl" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    </PageShell>
  );
}
