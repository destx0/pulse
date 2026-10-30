"use client";
// Connect or change a LeetCode username. The action fetches the profile before saving, so a typo fails here.
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CAPTION } from "@/components/metrics/primitives";
import { connectLeetcodeAction, type LeetcodeFormState } from "@/server/actions/leetcode";

export function ConnectLeetcode({ defaultValue = "", label = "Connect" }: { defaultValue?: string; label?: string }) {
  const [state, action, pending] = useActionState(connectLeetcodeAction, null as LeetcodeFormState);
  // Controlled: a failed action resets an uncontrolled field, and retyping a username is avoidable friction.
  const [username, setUsername] = useState(defaultValue);
  return (
    <form action={action} className="space-y-3">
      <label htmlFor="leetcode-username" className="block text-[13px] leading-4 font-semibold">
        LeetCode username
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="leetcode-username"
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="destx0"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          className="h-11 rounded-xl text-base"
        />
        <Button type="submit" size="touch" disabled={pending} className="shrink-0">
          {pending ? "Checking…" : label}
        </Button>
      </div>
      {state && !state.ok && (
        <p role="alert" className="text-[13px] leading-[18px] text-recovery-red-text">
          {state.error}
        </p>
      )}
      <p className={CAPTION}>Public profile only: solved counts, streak, contest rating and recent solves. Pulse never posts, and no password is needed.</p>
    </form>
  );
}
