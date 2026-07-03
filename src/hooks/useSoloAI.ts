import { useEffect, useRef } from "react";

/**
 * Drives the computer opponent in solo mode.
 *
 * When `active` is true (it's the AI's turn) it calls `play()` exactly once
 * per distinct `turnKey`, after a short human-like delay. `play` always sees
 * the latest render's closure (fresh board), and the guard prevents the same
 * turn from being played twice across re-renders.
 *
 * `turnKey` should change whenever the AI must act again (e.g. the turn
 * counter, or turn + jump-chain square for multi-move turns).
 */
export function useSoloAI(active: boolean, turnKey: string | number, play: () => void, delayMs = 650) {
  const playRef = useRef(play);
  playRef.current = play;
  const doneRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (!active) return;
    if (doneRef.current === turnKey) return;
    const id = setTimeout(() => {
      doneRef.current = turnKey;
      playRef.current();
    }, delayMs);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, turnKey]);
}
