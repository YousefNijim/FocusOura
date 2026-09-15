import { useCallback, useEffect, useRef, useState } from "react";
import type { PetState } from "./PetArt";

/**
 * What the pet is doing right now.
 *
 * Two inputs, in priority order:
 *   0. A state the screen is deliberately holding (the finish screen).
 *   1. A one-shot reaction — the user finished a session, gave up, or poked
 *      the pet. These are the moments worth reacting to, so they win, briefly.
 *   2. The standing situation — mid-session (running or paused), or otherwise
 *      the mood the server derived from how long it has been since a session.
 *
 * Deliberately no timers of its own beyond the reaction fade: the pet is a
 * function of state the app already keeps, so it cannot drift out of sync
 * with the timer the way a second clock would.
 */

export type PetReaction = "celebrating" | "deflated";

const REACTION_MS = 2600;

export function usePetState({
  moodKey,
  sessionState,
  override,
}: {
  moodKey: string | undefined;
  sessionState?: "running" | "paused" | null;
  /** A state the screen holds on purpose, e.g. the finish screen. Outranks all. */
  override?: PetState | null;
}): { state: PetState; react: (r: PetReaction) => void } {
  const [reaction, setReaction] = useState<PetReaction | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const react = useCallback((r: PetReaction) => {
    clearTimeout(timer.current);
    setReaction(r);
    timer.current = setTimeout(() => setReaction(null), REACTION_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (override) return { state: override, react };
  if (reaction) return { state: reaction, react };
  if (sessionState === "running") return { state: "focusing", react };
  if (sessionState === "paused") return { state: "dozing", react };

  // No mood yet (stats still loading, or the request failed) reads as neutral
  // rather than as a gap — an empty slot where the pet lives is worse than a
  // pet that is merely not excited.
  const state: PetState =
    moodKey === "happy" ? "happy" : moodKey === "sad" ? "lonely" : "neutral";

  return { state, react };
}
