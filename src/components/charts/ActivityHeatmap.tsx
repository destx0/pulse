// A year of LeetCode accepted submissions, GitHub-style. Server component: no state, one `<div role="img">` for
// assistive tech, per-cell `title` for the pointer. Days are LeetCode's own calendar days (UTC keys).
import { DAY, formatDay } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ActivityDay = { day: string; count: number };

const LEVEL = (n: number) =>
  n === 0 ? "bg-foreground/8" : n < 3 ? "bg-optimal/30" : n < 6 ? "bg-optimal/55" : n < 10 ? "bg-optimal/80" : "bg-optimal";

/** Sunday-first columns, as LeetCode draws them. The first week is padded so weekdays line up. */
function weeksOf(days: ActivityDay[]): (ActivityDay | null)[][] {
  const pad = new Date(`${days[0].day}T00:00:00Z`).getUTCDay();
  const cells: (ActivityDay | null)[] = [...Array<null>(pad).fill(null), ...days];
  const weeks: (ActivityDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function ActivityHeatmap({ days, today }: { days: ActivityDay[]; today: string }) {
  if (!days.length) return null;
  const weeks = weeksOf(days);
  const total = days.reduce((n, d) => n + d.count, 0);
  return (
    <div className="overflow-x-auto pb-1">
      <div role="img" aria-label={`${total} accepted submissions in the last year`} className="min-w-max">
        <div aria-hidden className="mb-1 flex gap-[2px]">
          {weeks.map((week, i) => {
            const first = week.find((d) => d?.day.endsWith("-01"));
            return (
              <span key={i} className="w-2.5 whitespace-nowrap text-[10px] leading-3 text-muted-foreground sm:w-[11px]">
                {first ? formatDay(first.day, { month: "short" }) : ""}
              </span>
            );
          })}
        </div>
        <div aria-hidden className="flex gap-[2px]">
          {weeks.map((week, i) => (
            <div key={i} className="flex flex-col gap-[2px]">
              {week.map((d, j) =>
                d ? (
                  <span
                    key={j}
                    title={`${d.count} on ${formatDay(d.day, DAY.monthDay)}`}
                    className={cn("size-2.5 rounded-[2px] sm:size-[11px]", LEVEL(d.count), d.day === today && "ring-1 ring-foreground/60")}
                  />
                ) : (
                  <span key={j} className="size-2.5 sm:size-[11px]" />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The four-step legend under the heatmap. */
export function ActivityLegend() {
  return (
    <div aria-hidden className="mt-2 flex items-center justify-end gap-1.5 text-[10px] leading-3 text-muted-foreground">
      Less
      {[0, 1, 3, 6, 10].map((n) => (
        <span key={n} className={cn("size-2.5 rounded-[2px]", LEVEL(n))} />
      ))}
      More
    </div>
  );
}
