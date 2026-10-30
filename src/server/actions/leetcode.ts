"use server";
// Settings › Data source and the LeetCode page: connect, disconnect and "Sync now". Public profile data, no OAuth.
import { revalidatePath } from "next/cache";
import { currentUser, SIGNED_OUT } from "../auth";
import { getDb } from "../db";
import { syncLeetcodeNow } from "../leetcode";
import { leetcodeErrorText, parseLeetcodeUsername } from "../sources/leetcode/errors";
import { connectLeetcode, disconnectLeetcode } from "../sources/leetcode/sync";
import type { ActionResult } from "./journal";

export type LeetcodeFormState = { ok: true; error?: undefined } | { ok: false; error: string } | null;

export async function connectLeetcodeAction(_: LeetcodeFormState, form: FormData): Promise<LeetcodeFormState> {
  const user = await currentUser();
  if (!user) return SIGNED_OUT;
  const username = parseLeetcodeUsername(form.get("username"));
  if (!username) return { ok: false, error: "Enter your LeetCode username, for example destx0." };
  try {
    // Fetched before it is saved: a typo never becomes a connected source.
    await connectLeetcode(getDb(), user.userId, username);
  } catch (err) {
    return { ok: false, error: leetcodeErrorText(err) };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function disconnectLeetcodeAction(): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return SIGNED_OUT;
  await disconnectLeetcode(getDb(), user.userId);
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function syncLeetcodeAction(): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return SIGNED_OUT;
  try {
    await syncLeetcodeNow(user.userId);
  } catch (err) {
    return { ok: false, error: leetcodeErrorText(err) };
  }
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}
