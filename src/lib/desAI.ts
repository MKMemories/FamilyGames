import type { Difficulty } from "../types";

/* ══════════════════════════════════════════════════════════════════════════
   IA du « Bluff des Dés » (type Perudo / Menteur).
   Heuristique probabiliste : l'espérance du nombre de dés montrant une face
   vaut ≈ (mes propres correspondances) + (dés inconnus)/6. On crie « Menteur »
   quand la mise annoncée dépasse largement cette espérance, sinon on relance
   modestement — parfois avec un petit bluff. La difficulté règle l'agressivité.
   Aucun dé joker : une face ne compte qu'elle-même (règle simple pour les kids).
   ══════════════════════════════════════════════════════════════════════════ */

export interface DesBid {
  qty: number;
  face: number;
}

export interface DesDecision {
  action: "raise" | "call";
  bid?: DesBid;
}

function countFace(dice: number[], face: number): number {
  return dice.reduce((n, d) => n + (d === face ? 1 : 0), 0);
}

/** Plus petite relance strictement supérieure, ou null si impossible. */
function minRaise(bid: DesBid, total: number): DesBid | null {
  if (bid.face < 6) return { qty: bid.qty, face: bid.face + 1 };
  if (bid.qty < total) return { qty: bid.qty + 1, face: 1 };
  return null;
}

/** Construit une relance légale, biaisée vers la face la plus présente dans nos dés. */
function buildRaise(bid: DesBid, ownDice: number[], total: number, bluff: number): DesBid | null {
  let bestFace = 1;
  let bestCount = -1;
  for (let f = 1; f <= 6; f++) {
    const c = countFace(ownDice, f);
    if (c > bestCount) { bestCount = c; bestFace = f; }
  }

  // Même quantité mais une face plus haute que l'on possède déjà bien.
  if (bestFace > bid.face) return { qty: bid.qty, face: bestFace };

  // Sinon on augmente la quantité (n'importe quelle face devient alors légale).
  let qty = bid.qty + 1;
  if (qty > total) return minRaise(bid, total); // dernier recours
  let face = bestFace;
  if (Math.random() < bluff && qty + 1 <= total) qty += 1; // petit bluff
  return { qty, face };
}

export function decideDesMove(
  ownDice: number[],
  bid: DesBid | null,
  totalDice: number,
  difficulty: Difficulty = "moyen",
): DesDecision {
  const unknown = Math.max(0, totalDice - ownDice.length);

  const tune =
    difficulty === "facile"
      ? { callK: 1.7, bluff: 0.30, sharp: 0.55 }
      : difficulty === "difficile"
        ? { callK: 0.7, bluff: 0.12, sharp: 1.0 }
        : { callK: 1.1, bluff: 0.18, sharp: 0.8 };

  /* ── Ouverture (aucune mise en cours) ── */
  if (!bid) {
    let bestFace = 1;
    let bestCount = -1;
    for (let f = 1; f <= 6; f++) {
      const c = countFace(ownDice, f);
      if (c > bestCount) { bestCount = c; bestFace = f; }
    }
    const expected = bestCount + unknown / 6;
    let qty = Math.max(1, Math.round(expected * tune.sharp));
    if (Math.random() < tune.bluff) qty += 1;
    qty = Math.max(1, Math.min(qty, totalDice));
    return { action: "raise", bid: { qty, face: bestFace } };
  }

  /* ── Une mise existe : contester ou relancer ── */
  const own = countFace(ownDice, bid.face);
  const need = bid.qty - own;                 // à trouver parmi les dés inconnus
  const expectedUnknown = unknown / 6;
  const sd = Math.sqrt(unknown * (1 / 6) * (5 / 6)) || 0.5;
  const surplus = need - expectedUnknown;     // écart au-dessus de l'espérance

  // On crie « Menteur » si la mise est improbablement haute.
  if (need > 0 && surplus > tune.callK * sd) return { action: "call" };

  const raise = buildRaise(bid, ownDice, totalDice, tune.bluff);
  if (!raise) return { action: "call" };       // plus aucune relance possible
  return { action: "raise", bid: raise };
}
