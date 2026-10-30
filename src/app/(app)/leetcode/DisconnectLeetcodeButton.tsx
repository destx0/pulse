"use client";
// Two taps, no dialog: the first asks, the second disconnects and removes the stored LeetCode data.
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { disconnectLeetcodeAction } from "@/server/actions/leetcode";

export function DisconnectLeetcodeButton({ className }: { className?: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant={confirming ? "destructive" : "ghost"}
      size="touch"
      className={className}
      disabled={pending}
      onClick={() => {
        if (!confirming) return setConfirming(true);
        start(async () => {
          await disconnectLeetcodeAction();
          setConfirming(false);
        });
      }}
      onBlur={() => setConfirming(false)}
    >
      {pending ? "Disconnecting…" : confirming ? "Tap again to disconnect" : "Disconnect"}
    </Button>
  );
}
