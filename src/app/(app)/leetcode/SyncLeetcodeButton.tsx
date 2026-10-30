"use client";
// "Sync now" for the LeetCode source: one fetch, then the page re-renders with the result.
import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncLeetcodeAction } from "@/server/actions/leetcode";

export function SyncLeetcodeButton({ className }: { className?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className={className}>
      <Button
        type="button"
        variant="secondary"
        size="touch"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await syncLeetcodeAction();
            setError(r.ok ? null : r.error);
          })
        }
      >
        <RefreshCw aria-hidden className={pending ? "animate-spin" : undefined} />
        {pending ? "Syncing…" : "Sync now"}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-[13px] leading-[18px] text-recovery-red-text">
          {error}
        </p>
      )}
    </div>
  );
}
