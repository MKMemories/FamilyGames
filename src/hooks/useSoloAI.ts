import { useEffect, useRef } from "react";

/**
 * Drives the computer opponent in solo mode.
 *
 * When `active` is true (it's the AI's turn) it calls `play()` exactly once
 * per distinct `turnKey`, after a short human-like delay. `play` always sees
 * the latest render's closure (fresh board), and the guard prevents the same
 * turn from being played twice across re-renders.
 *
 * `turnKey` should change whenever the AI must act again WHILE it stays active
 * (e.g. a doubles re-roll or a jump-chain square — cases where `active` never
 * drops between two moves). Across separate turns the guard is reset whenever
 * `active` becomes false, so a `turnKey` that merely cycles (a player index
 * like 0/1) still re-fires on the AI's next turn instead of freezing.
 */
export function useSoloAI(active: boolean, turnKey: string | number, play: () => void, delayMs = 650) {
  const playRef = useRef(play);
  playRef.current = play;
  const doneRef = useRef<string | number | null>(null);

  useEffect(() => {
    // Ce n'est plus le tour de l'IA : on réarme pour le prochain tour, même si
    // la clé se répète (indices de joueur 0/1/2…).
    if (!active) { doneRef.current = null; return; }
    if (doneRef.current === turnKey) return;
    const id = setTimeout(() => {
      doneRef.current = turnKey;
      playRef.current();
    }, delayMs);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, turnKey]);
}
