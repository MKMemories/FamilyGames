import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { dbRef, update } from "../../lib/firebase";
import type { Room } from "../../types";
import { useSoloAI } from "../../hooks/useSoloAI";
import { placeAIFleet, chooseAIShot, type Difficulty } from "../../lib/ai/batailleAI";

/* ════════════════════════════════════════════════════════════════════════
   BATAILLE NAVALE — Battleship, strictly 2 players, one screen each.
   Each player secretly places a fleet on their own 10×10 grid, then players
   alternate firing at the opponent's grid until one fleet is fully sunk.

   All shared state lives on the room (single source of truth) under bn* keys:
     bnPhase  : "place" | "battle" | "over"
     bnGrids  : Record<playerId, number[][]>   (own fleet: 0 water / 1 ship)
     bnReady  : Record<playerId, boolean>
     bnShots  : Record<playerId, Record<"r-c", "hit"|"miss">>  (shots BY player)
     bnTurn   : playerId whose turn it is to fire
     bnWinner : playerId of the winner
   Only the placement-in-progress and orientation are local React state.
   ════════════════════════════════════════════════════════════════════════ */

const SIZE = 10;
const LETTERS = Array.from({ length: SIZE }, (_, i) => String.fromCharCode(65 + i)); // A..J

const FLEET: { size: number; name: string }[] = [
  { size: 5, name: "Porte-avions" },
  { size: 4, name: "Croiseur" },
  { size: 3, name: "Contre-torpilleur" },
  { size: 3, name: "Sous-marin" },
  { size: 2, name: "Torpilleur" },
];
const TOTAL_SHIP_CELLS = FLEET.reduce((n, s) => n + s.size, 0); // 17

type Cell = [number, number];
type Ship = { size: number; name: string; cells: Cell[]; horizontal: boolean };
type ShotMap = Record<string, "hit" | "miss">;

const key = (r: number, c: number) => `${r}-${c}`;

/** The footprint cells for a ship anchored top-left at (r,c). */
function shipCells(r: number, c: number, size: number, horizontal: boolean): Cell[] {
  const out: Cell[] = [];
  for (let i = 0; i < size; i++) out.push(horizontal ? [r, c + i] : [r + i, c]);
  return out;
}

const inBounds = (cells: Cell[]) =>
  cells.every(([r, c]) => r >= 0 && r < SIZE && c >= 0 && c < SIZE);

/** Build a 10×10 grid (0 water / 1 ship) from a list of placed ships. */
function gridFromShips(ships: Ship[]): number[][] {
  const g = Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0));
  for (const s of ships) for (const [r, c] of s.cells) g[r][c] = 1;
  return g;
}

/** Always returns a valid, non-overlapping, in-bounds fleet. */
function randomFleet(): Ship[] {
  for (let attempt = 0; attempt < 500; attempt++) {
    const occupied = new Set<string>();
    const ships: Ship[] = [];
    let ok = true;
    for (const spec of FLEET) {
      let placed = false;
      for (let t = 0; t < 500; t++) {
        const h = Math.random() < 0.5;
        const r = Math.floor(Math.random() * (h ? SIZE : SIZE - spec.size + 1));
        const c = Math.floor(Math.random() * (h ? SIZE - spec.size + 1 : SIZE));
        const cells = shipCells(r, c, spec.size, h);
        if (cells.some(([cr, cc]) => occupied.has(key(cr, cc)))) continue;
        cells.forEach(([cr, cc]) => occupied.add(key(cr, cc)));
        ships.push({ size: spec.size, name: spec.name, cells, horizontal: h });
        placed = true;
        break;
      }
      if (!placed) { ok = false; break; }
    }
    if (ok && ships.length === FLEET.length) return ships;
  }
  return []; // statistically unreachable
}

/** True when every ship cell (value 1) of `grid` is present as "hit" in `shots`. */
function allSunk(grid: number[][] | undefined, shots: ShotMap): boolean {
  if (!grid) return false;
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (grid[r][c] === 1 && shots[key(r, c)] !== "hit") return false;
  return true;
}

/** If (r,c) belongs to a ship that is now fully hit, return that ship's cells. */
function sunkShipAt(grid: number[][], shots: ShotMap, r0: number, c0: number): Cell[] | null {
  if (grid[r0][c0] !== 1) return null;
  const seen = new Set<string>();
  const stack: Cell[] = [[r0, c0]];
  const cells: Cell[] = [];
  while (stack.length) {
    const [r, c] = stack.pop()!;
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) continue;
    if (grid[r][c] !== 1 || seen.has(key(r, c))) continue;
    seen.add(key(r, c));
    cells.push([r, c]);
    stack.push([r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]);
  }
  return cells.every(([r, c]) => shots[key(r, c)] === "hit") ? cells : null;
}

/** Purely-visual hull styling: rounded ends + segment class for a ship cell,
 *  derived from whether adjacent cells are also part of a ship. No logic. */
function hullClass(isShip: (r: number, c: number) => boolean, r: number, c: number): string {
  if (!isShip(r, c)) return "";
  const up = isShip(r - 1, c), down = isShip(r + 1, c);
  const left = isShip(r, c - 1), right = isShip(r, c + 1);
  const cls = ["bn-ship"];
  if (left || right) {
    if (!left && right) cls.push("bn-hull-cap-l");
    else if (left && !right) cls.push("bn-hull-cap-r");
    else cls.push("bn-hull-mid-h");
  } else if (up || down) {
    if (!up && down) cls.push("bn-hull-cap-t");
    else if (up && !down) cls.push("bn-hull-cap-b");
    else cls.push("bn-hull-mid-v");
  } else {
    cls.push("bn-hull-solo");
  }
  return cls.join(" ");
}

interface BatailleNavaleProps {
  room: Room;
  roomId: string;
  playerId: string;
  isHost: boolean;
  isSolo: boolean;
  onLeave: () => void;
  onToast: (m: string) => void;
}

export function BatailleNavale({ room, roomId, playerId, isHost, isSolo, onLeave, onToast }: BatailleNavaleProps) {
  const R = room as any; // bn* fields typed on Room by the integrator

  // ── Shared state (single source of truth) ─────────────────────────────
  const phase: "place" | "battle" | "over" = R.bnPhase || "place";
  const grids: Record<string, number[][]> = R.bnGrids || {};
  const ready: Record<string, boolean> = R.bnReady || {};
  const shots: Record<string, ShotMap> = R.bnShots || {};
  const turn: string = R.bnTurn || "";
  const winner: string = R.bnWinner || "";

  const players = Object.values(room.players || {});
  const opponentId = players.find((p) => p.id !== playerId)?.id;
  const opponent = players.find((p) => p.id !== playerId);

  // ── Solo-vs-computer wiring (only when the room carries an aiId) ───────
  // In solo the local player is the human; the AI is the other player.
  const aiId = room.aiId;
  const humanId = playerId;
  const diff: Difficulty = (room.soloDifficulty as Difficulty) || "moyen";

  // An opponent is present in real multiplayer OR when the AI is in the room.
  const hasOpponent = !!opponentId && (!isSolo || !!aiId);

  const write = (upd: Record<string, any>) => update(dbRef(`games/${roomId}`), upd);

  // ── Local placement state (in-progress fleet + orientation) ───────────
  const [placedShips, setPlacedShips] = useState<Ship[]>([]);
  const [horizontal, setHorizontal] = useState(true);
  const [hover, setHover] = useState<Cell | null>(null);

  const iAmReady = !!ready[playerId];

  // Reset the local editor whenever we (re)enter placement un-ready
  // (fresh load or host "Rejouer" which clears bnReady/bnGrids).
  useEffect(() => {
    if (phase === "place" && !iAmReady) setPlacedShips([]);
  }, [phase, iAmReady]);

  const occupiedSet = useMemo(() => {
    const s = new Set<string>();
    for (const sh of placedShips) for (const [r, c] of sh.cells) s.add(key(r, c));
    return s;
  }, [placedShips]);

  const nextSpec = placedShips.length < FLEET.length ? FLEET[placedShips.length] : null;
  const fleetComplete = placedShips.length === FLEET.length;

  // Preview footprint for the ship being placed (desktop hover nicety).
  const preview = useMemo(() => {
    if (!nextSpec || !hover) return null;
    const cells = shipCells(hover[0], hover[1], nextSpec.size, horizontal);
    const ok = inBounds(cells) && !cells.some(([r, c]) => occupiedSet.has(key(r, c)));
    return { cells, ok };
  }, [nextSpec, hover, horizontal, occupiedSet]);

  // ── Placement actions ─────────────────────────────────────────────────
  const placeAt = (r: number, c: number) => {
    if (iAmReady) return;
    if (!nextSpec) { onToast("Flotte complète — clique « Prêt ✓ »"); return; }
    const cells = shipCells(r, c, nextSpec.size, horizontal);
    if (!inBounds(cells)) { onToast("Le navire sort de la grille"); return; }
    if (cells.some(([cr, cc]) => occupiedSet.has(key(cr, cc)))) { onToast("Placement impossible : chevauchement"); return; }
    setPlacedShips((prev) => [...prev, { size: nextSpec.size, name: nextSpec.name, cells, horizontal }]);
  };

  const autoPlace = () => {
    if (iAmReady) return;
    const fleet = randomFleet();
    if (fleet.length === FLEET.length) setPlacedShips(fleet);
    else onToast("Réessaie le placement aléatoire");
  };

  const resetPlacement = () => {
    if (iAmReady) return;
    setPlacedShips([]);
    setHover(null);
  };

  const confirmReady = () => {
    if (iAmReady || !fleetComplete) return;
    write({ [`bnGrids/${playerId}`]: gridFromShips(placedShips), [`bnReady/${playerId}`]: true });
  };

  // ── Both ready → battle. Host-only, idempotent transition. ────────────
  useEffect(() => {
    if (!isHost || !opponentId) return;
    if (phase === "battle" || phase === "over") return;
    if (ready[playerId] && ready[opponentId]) {
      write({
        bnPhase: "battle",
        bnTurn: room.hostId,
        bnShots: { [playerId]: {}, [opponentId]: {} },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, opponentId, phase, ready[playerId], opponentId ? ready[opponentId] : false, room.hostId]);

  // ── Firing ────────────────────────────────────────────────────────────
  const myShots: ShotMap = shots[playerId] || {};
  const oppShots: ShotMap = (opponentId && shots[opponentId]) || {};
  const isMyTurn = phase === "battle" && turn === playerId && !winner;

  // Purely-visual: which of MY landed hits belong to a now-sunk enemy ship,
  // so those cells can flash. Only ever inspects cells I've already hit.
  const sunkFireCells = useMemo(() => {
    const set = new Set<string>();
    const g = opponentId ? grids[opponentId] : undefined;
    if (!g) return set;
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) {
        if (myShots[key(r, c)] !== "hit" || set.has(key(r, c))) continue;
        const ship = sunkShipAt(g, myShots, r, c);
        if (ship) ship.forEach(([sr, sc]) => set.add(key(sr, sc)));
      }
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opponentId, grids, JSON.stringify(myShots)]);

  const fire = (r: number, c: number) => {
    if (phase !== "battle" || winner) return;
    if (turn !== playerId) { onToast("Ce n'est pas ton tour"); return; }
    if (!opponentId) return;
    const oppGrid = grids[opponentId];
    if (!oppGrid) return;
    const k = key(r, c);
    if (myShots[k]) { onToast("Case déjà visée"); return; }

    const result: "hit" | "miss" = oppGrid[r][c] === 1 ? "hit" : "miss";
    const nextShots: ShotMap = { ...myShots, [k]: result };
    const upd: Record<string, any> = { [`bnShots/${playerId}/${k}`]: result };

    if (result === "hit" && allSunk(oppGrid, nextShots)) {
      upd.bnWinner = playerId;
      upd.bnPhase = "over";
    } else {
      upd.bnTurn = opponentId; // always pass the turn — simple & infallible
      if (result === "hit" && sunkShipAt(oppGrid, nextShots, r, c)) onToast("Touché-coulé ! 🔥");
      else if (result === "hit") onToast("Touché !");
    }
    write(upd);
  };

  // ── Computer opponent (solo only; no-ops entirely without an aiId) ────
  // 1) AI placement: as soon as it needs a fleet, drop a random valid one and
  //    ready up. Nested-path write so we never clobber the human's grid.
  const aiPlaceActive = !!aiId && phase !== "battle" && phase !== "over" && !ready[aiId];
  useSoloAI(aiPlaceActive, "place", () => {
    if (!aiId) return;
    write({ [`bnGrids/${aiId}`]: placeAIFleet(), [`bnReady/${aiId}`]: true });
  });

  // 2) AI firing: on its turn, pick a cell from its OWN past shots, resolve it
  //    against the human's fleet, record it, then win-or-pass. Keyed on the
  //    number of shots the AI has taken so each distinct turn fires once.
  const aiFireActive = !!aiId && phase === "battle" && turn === aiId && !winner;
  const aiShotCount = Object.keys((shots[aiId || ""] || {})).length;
  const playAIShot = () => {
    if (!aiId) return;
    const aiShots: ShotMap = shots[aiId] || {};
    const humanGrid = grids[humanId];
    if (!humanGrid) return;
    const [r, c] = chooseAIShot(aiShots, diff);
    const k = key(r, c);
    if (aiShots[k]) return; // safety: never re-fire the same square
    const result: "hit" | "miss" = humanGrid[r][c] === 1 ? "hit" : "miss";
    const nextShots: ShotMap = { ...aiShots, [k]: result };
    const upd: Record<string, any> = { [`bnShots/${aiId}/${k}`]: result };
    if (result === "hit" && allSunk(humanGrid, nextShots)) {
      upd.bnWinner = aiId;
      upd.bnPhase = "over";
    } else {
      upd.bnTurn = humanId; // pass the turn back to the human
    }
    write(upd);
  };
  useSoloAI(aiFireActive, `fire:${aiShotCount}`, playAIShot);

  // ── Host replay reset ─────────────────────────────────────────────────
  const replay = () => {
    write({
      bnPhase: "place",
      bnGrids: null,
      bnReady: null,
      bnShots: null,
      bnTurn: "",
      bnWinner: "",
    });
    setPlacedShips([]);
    setHover(null);
  };

  // ── Derived counts / labels ───────────────────────────────────────────
  // Purely-visual: cells of MY fleet that belong to a fully-sunk ship, so the
  // wreck can flash. Reads only my own grid + the shots already taken at me.
  const sunkOwnCells = useMemo(() => {
    const set = new Set<string>();
    const g = grids[playerId];
    if (!g) return set;
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) {
        if (g[r][c] !== 1 || oppShots[key(r, c)] !== "hit" || set.has(key(r, c))) continue;
        const ship = sunkShipAt(g, oppShots, r, c);
        if (ship) ship.forEach(([sr, sc]) => set.add(key(sr, sc)));
      }
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grids, playerId, JSON.stringify(oppShots)]);

  const myHitsTaken = Object.values(oppShots).filter((v) => v === "hit").length; // hits on MY fleet
  const myHitsDealt = Object.values(myShots).filter((v) => v === "hit").length; // hits I landed
  const iWon = winner === playerId;

  const phaseLabel =
    phase === "place" ? "Placement" : phase === "battle" ? "Combat" : "Terminé";

  const turnText = () => {
    if (phase === "place") return iAmReady ? "En attente…" : "Place ta flotte";
    if (phase === "over") return iWon ? "Victoire !" : "Défaite";
    if (isMyTurn) return "🎯 À toi de tirer";
    return `⏳ Tour de ${opponent?.name || "l'adversaire"}`;
  };

  return (
    <div className="screen game-screen bn-screen">
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div
          className="turn-indicator bn-turn"
          style={{ background: isMyTurn || (phase === "over" && iWon) ? "rgba(76,175,80,.2)" : "rgba(0,0,0,.05)" }}
        >
          {turnText()}
        </div>
        <div className="score-mini bn-phasetag">{phaseLabel}</div>
      </div>

      {/* ── PLACEMENT ──────────────────────────────────────────────── */}
      {phase === "place" && (
        <div className="bn-body">
          {!hasOpponent && (
            <div className="bn-note">⏳ En attente de l'adversaire…</div>
          )}

          <div className="bn-status-row">
            <span className={`bn-chip ${iAmReady ? "ok" : ""}`}>
              Toi : {iAmReady ? "prêt ✓" : "en cours"}
            </span>
            <span className={`bn-chip ${opponentId && ready[opponentId] ? "ok" : ""}`}>
              Adversaire : {opponentId ? (ready[opponentId] ? "prêt ✓" : "en attente") : "—"}
            </span>
          </div>

          {!iAmReady ? (
            <>
              <div className="bn-place-info">
                {nextSpec ? (
                  <>À placer : <b>{nextSpec.name}</b> <span className="bn-dim">({nextSpec.size} cases)</span></>
                ) : (
                  <b>Flotte complète — prêt à combattre !</b>
                )}
              </div>
              <div className="bn-guide">
                {nextSpec
                  ? "👆 Touche ta grille pour poser le bateau · « Orientation » pour le tourner · « Aléatoire » place tout"
                  : "✅ Valide avec « Je suis prêt » pour lancer le combat"}
              </div>

              {renderGrid({
                variant: "place",
                onCellClick: placeAt,
                onCellEnter: (r, c) => setHover([r, c]),
                onGridLeave: () => setHover(null),
                cellClass: (r, c) => {
                  const cls: string[] = [];
                  const hull = hullClass((rr, cc) => occupiedSet.has(key(rr, cc)), r, c);
                  if (hull) cls.push(hull);
                  if (preview && preview.cells.some(([pr, pc]) => pr === r && pc === c))
                    cls.push(preview.ok ? "bn-prev-ok" : "bn-prev-bad");
                  return cls.join(" ");
                },
              })}

              <div className="bn-fleet-list">
                {FLEET.map((s, i) => (
                  <span key={i} className={`bn-fleet-item ${i < placedShips.length ? "placed" : ""}`}>
                    {"■".repeat(s.size)} {s.name}
                  </span>
                ))}
              </div>

              <div className="bn-controls">
                <button className="bn-btn bn-btn-ghost" onClick={() => setHorizontal((h) => !h)}>
                  Orientation : {horizontal ? "Horizontale ↔" : "Verticale ↕"}
                </button>
                <button className="bn-btn bn-btn-ghost" onClick={autoPlace}>🎲 Aléatoire</button>
                <button className="bn-btn bn-btn-ghost" onClick={resetPlacement}>♻ Réinitialiser</button>
                <button className="bn-btn bn-btn-go" disabled={!fleetComplete} onClick={confirmReady}>
                  Prêt ✓
                </button>
              </div>
            </>
          ) : (
            <div className="bn-waiting">
              <div className="pulse-dot" />
              <p>Flotte verrouillée. En attente de l'adversaire…</p>
              {renderGrid({
                variant: "own-static",
                cellClass: (r, c) => hullClass((rr, cc) => grids[playerId]?.[rr]?.[cc] === 1, r, c),
              })}
            </div>
          )}
        </div>
      )}

      {/* ── BATTLE ─────────────────────────────────────────────────── */}
      {phase === "battle" && (
        <div className="bn-body">
          {!hasOpponent ? (
            <div className="bn-note">⏳ En attente de l'adversaire…</div>
          ) : (
            <>
              <div className="bn-battle-head">
                <span className="bn-mini-stat">🎯 Touchés : {myHitsDealt}/{TOTAL_SHIP_CELLS}</span>
                <span className="bn-mini-stat danger">🛡 Subis : {myHitsTaken}/{TOTAL_SHIP_CELLS}</span>
              </div>

              <div className="bn-fire-label">Grille adverse {isMyTurn ? "— tire !" : ""}</div>
              <div className="bn-guide">
                {isMyTurn
                  ? "👆 Touche une case pour tirer · 🎯 touché · 💧 raté · coule les 5 bateaux !"
                  : "⏳ L'adversaire tire — observe « Ta flotte » en bas."}
              </div>
              <AnimatePresence>
                {aiFireActive && (
                  <motion.div
                    className="ai-thinking bn-ai-thinking"
                    initial={{ opacity: 0, y: -6, scale: .9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: .9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  >
                    <span className="bn-ai-scope">🤖</span> vise
                    <span className="bn-ai-dots"><i /><i /><i /></span>
                  </motion.div>
                )}
              </AnimatePresence>
              {renderGrid({
                variant: "fire",
                onCellClick: (r, c) => isMyTurn && fire(r, c),
                interactive: isMyTurn,
                cellClass: (r, c) => {
                  const s = myShots[key(r, c)];
                  if (s === "hit") return sunkFireCells.has(key(r, c)) ? "bn-hit bn-sunk" : "bn-hit";
                  if (s === "miss") return "bn-miss";
                  return isMyTurn ? "bn-shootable" : "";
                },
                cellMarker: (r, c) => {
                  const s = myShots[key(r, c)];
                  if (s === "hit") return <HitMarker sunk={sunkFireCells.has(key(r, c))} />;
                  if (s === "miss") return <MissMarker />;
                  return null;
                },
              })}

              <div className="bn-own-wrap">
                <div className="bn-fire-label small">Ta flotte</div>
                {renderGrid({
                  variant: "own",
                  cellClass: (r, c) => {
                    const isShip = (rr: number, cc: number) => grids[playerId]?.[rr]?.[cc] === 1;
                    const ship = isShip(r, c);
                    const s = oppShots[key(r, c)];
                    if (ship && s === "hit")
                      return `${hullClass(isShip, r, c)} bn-own-hit${sunkOwnCells.has(key(r, c)) ? " bn-sunk" : ""}`;
                    if (ship) return hullClass(isShip, r, c);
                    if (s === "miss") return "bn-own-splash";
                    return "";
                  },
                  cellMarker: (r, c) => {
                    const ship = grids[playerId]?.[r]?.[c] === 1;
                    const s = oppShots[key(r, c)];
                    if (ship && s === "hit") return <HitMarker small sunk={sunkOwnCells.has(key(r, c))} />;
                    if (s === "miss") return <MissMarker small />;
                    return null;
                  },
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── OVER ───────────────────────────────────────────────────── */}
      {phase === "over" && (
        <div className="bn-body">
          <div className={`bn-over ${iWon ? "win" : "lose"}`}>
            <div className="bn-over-emoji">{iWon ? "🏆" : "💥"}</div>
            <h2>{iWon ? "Victoire navale !" : "Flotte coulée…"}</h2>
            <p>
              {iWon
                ? "Tu as envoyé toute la flotte adverse par le fond."
                : `${opponent?.name || "L'adversaire"} a coulé tous tes navires.`}
            </p>
            <div className="bn-over-btns">
              {isHost && <button className="bn-btn bn-btn-go" onClick={replay}>↻ Rejouer</button>}
              <button className="bn-btn bn-btn-ghost" onClick={onLeave}>← Retour</button>
            </div>
          </div>
        </div>
      )}

      <style>{BN_CSS}</style>
    </div>
  );
}

/* ── Explosion / splash effects (framer-motion, purely visual) ───────── */
function HitMarker({ sunk, small }: { sunk?: boolean; small?: boolean }) {
  return (
    <motion.div
      className={`bn-fx bn-fx-hit ${small ? "sm" : ""} ${sunk ? "sunk" : ""}`}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* expanding shockwave ring */}
      <motion.span
        className="bn-ring bn-ring-hit"
        initial={{ scale: 0.2, opacity: 0.9 }}
        animate={{ scale: 2.3, opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      {/* burst core: pops, shakes, settles into a burning marker */}
      <motion.span
        className="bn-fx-core"
        initial={{ scale: 0, rotate: -35 }}
        animate={{ scale: [0, 1.4, 1], rotate: [-35, 12, 0], x: [0, -2, 2, -1, 0] }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        {sunk ? "☠️" : "🔥"}
      </motion.span>
    </motion.div>
  );
}

function MissMarker({ small }: { small?: boolean }) {
  return (
    <div className={`bn-fx bn-fx-miss ${small ? "sm" : ""}`}>
      {/* two concentric splash ripples */}
      <motion.span
        className="bn-ring bn-ring-splash"
        initial={{ scale: 0.15, opacity: 0.75 }}
        animate={{ scale: 2, opacity: 0 }}
        transition={{ duration: 0.75, ease: "easeOut" }}
      />
      <motion.span
        className="bn-ring bn-ring-splash"
        initial={{ scale: 0.15, opacity: 0.5 }}
        animate={{ scale: 1.4, opacity: 0 }}
        transition={{ duration: 0.75, delay: 0.1, ease: "easeOut" }}
      />
      {/* settled miss dot */}
      <motion.span
        className="bn-miss-dot"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.28, type: "spring", stiffness: 340, damping: 18 }}
      />
    </div>
  );
}

/* ── Grid renderer (labels A–J / 1–10 + 10×10 cells) ─────────────────── */
function renderGrid(opts: {
  variant: "place" | "fire" | "own" | "own-static";
  cellClass: (r: number, c: number) => string;
  cellMarker?: (r: number, c: number) => ReactNode;
  onCellClick?: (r: number, c: number) => void;
  onCellEnter?: (r: number, c: number) => void;
  onGridLeave?: () => void;
  interactive?: boolean;
}) {
  const compact = opts.variant === "own" || opts.variant === "own-static";
  return (
    <div
      className={`bn-grid-wrap ${compact ? "compact" : ""}`}
      onMouseLeave={opts.onGridLeave}
    >
      <div className={`bn-grid ${opts.interactive ? "live" : ""}`}>
        {/* animated deep-sea shimmer overlay (single element, all cells) */}
        <span className="bn-water-fx" aria-hidden="true" />
        <div className="bn-corner" />
        {LETTERS.map((l) => (
          <div key={`c${l}`} className="bn-lbl">{l}</div>
        ))}
        {Array.from({ length: SIZE }, (_, r) => (
          <div key={`row${r}`} className="bn-row-contents">
            <div className="bn-lbl">{r + 1}</div>
            {Array.from({ length: SIZE }, (_, c) => (
              <div
                key={key(r, c)}
                className={`bn-cell ${opts.cellClass(r, c)}`}
                onClick={opts.onCellClick ? () => opts.onCellClick!(r, c) : undefined}
                onMouseEnter={opts.onCellEnter ? () => opts.onCellEnter!(r, c) : undefined}
              >
                {opts.cellMarker ? opts.cellMarker(r, c) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STYLES (scoped, prefixed bn-, theme-var driven with safe fallbacks)
   ════════════════════════════════════════════════════════════════════════ */
const BN_CSS = `
.bn-turn{ font-weight:800; font-size:.85rem; }
.bn-phasetag{ font-size:.7rem; font-weight:900; text-transform:uppercase; letter-spacing:.08em; color:var(--muted,#9b8aaa); }

.bn-body{ display:flex; flex-direction:column; align-items:center; gap:.7rem; padding:.6rem .5rem 1.4rem; }
.bn-note{ font-weight:800; color:var(--muted,#9b8aaa); background:var(--surface-2, rgba(0,0,0,.04)); padding:.5rem 1rem; border-radius:999px; font-size:.85rem; }

.bn-status-row{ display:flex; gap:.5rem; flex-wrap:wrap; justify-content:center; }
.bn-chip{ font-size:.72rem; font-weight:800; padding:.32rem .7rem; border-radius:999px; background:var(--surface-2, rgba(0,0,0,.05));
  border:1px solid var(--border, rgba(200,180,220,.25)); color:var(--muted,#9b8aaa); }
.bn-chip.ok{ background:color-mix(in srgb, var(--green,#4caf50) 18%, transparent); color:var(--green,#4caf50); border-color:transparent; }

.bn-place-info{ font-size:.9rem; color:var(--text,#3a2d4a); }
.bn-place-info b{ color:var(--accent,#7c5cbf); }
.bn-guide{ text-align:center; font-size:.74rem; font-weight:700; line-height:1.35; color:var(--muted); max-width:340px; margin:.15rem auto .35rem; padding:0 .4rem; }
.bn-dim{ color:var(--muted,#9b8aaa); font-size:.8rem; }

/* ── Grid = framed sonar chart over deep sea ──────────────────────────── */
.bn-grid-wrap{ width:100%; max-width:min(94vw, 440px); }
.bn-grid-wrap.compact{ max-width:min(66vw, 260px); }
.bn-grid{ position:relative; display:grid; grid-template-columns:1.35em repeat(${SIZE}, 1fr); gap:2px;
  background:linear-gradient(180deg, #0d4568, #0a3350); padding:6px 6px 6px 2px; border-radius:.7rem;
  box-shadow:var(--shadow, 0 8px 32px rgba(122,80,160,.12)), inset 0 0 0 1px rgba(120,200,255,.18),
    inset 0 0 22px rgba(4,20,34,.6); user-select:none; overflow:hidden; }
.bn-row-contents{ display:contents; }
.bn-corner{ background:transparent; }
.bn-lbl{ position:relative; z-index:2; display:flex; align-items:center; justify-content:center; font-size:.6rem; font-weight:900;
  color:rgba(190,225,250,.85); text-shadow:0 1px 2px rgba(0,0,0,.5); aspect-ratio:auto; }
.bn-grid-wrap.compact .bn-lbl{ font-size:.5rem; }

/* animated water shimmer (one element, sits behind the cells) */
.bn-water-fx{ position:absolute; inset:2px; z-index:0; pointer-events:none; border-radius:.55rem;
  background:
    linear-gradient(115deg, transparent 22%, rgba(150,225,255,.16) 42%, rgba(205,240,255,.24) 50%, rgba(150,225,255,.16) 58%, transparent 78%),
    radial-gradient(140% 120% at 26% 12%, #13597f 0%, #0b3c5c 52%, #062639 100%);
  background-size:320% 320%, 100% 100%;
  animation:bnWater 9s ease-in-out infinite; }
@keyframes bnWater{ 0%{ background-position:0% 50%, 0 0; } 50%{ background-position:100% 50%, 0 0; } 100%{ background-position:0% 50%, 0 0; } }
@media (prefers-reduced-motion: reduce){ .bn-water-fx{ animation:none; } }

.bn-cell{ position:relative; z-index:1; aspect-ratio:1; border-radius:.16rem; overflow:hidden;
  background:linear-gradient(160deg, rgba(22,74,106,.55), rgba(8,45,70,.62));
  box-shadow:inset 0 0 0 1px rgba(120,190,235,.10);
  display:flex; align-items:center; justify-content:center; line-height:1;
  transition:box-shadow .18s ease, transform .12s ease; }

/* firing hover: sonar targeting reticle */
.bn-grid.live .bn-shootable{ cursor:crosshair; }
.bn-grid.live .bn-shootable:hover{ transform:scale(1.06);
  box-shadow:inset 0 0 0 2px rgba(120,230,180,.9), 0 0 12px rgba(60,220,150,.55); }
.bn-grid.live .bn-shootable:hover::after{ content:""; position:absolute; width:52%; height:52%; border-radius:50%;
  border:1.5px solid rgba(150,255,205,.9); box-shadow:0 0 6px rgba(80,230,160,.7); }

/* ── Ships: metallic riveted hull with rounded caps ──────────────────── */
.bn-ship{ z-index:1; border-radius:2px;
  background:
    radial-gradient(circle at 50% 26%, rgba(255,255,255,.4) 0 1px, transparent 1.6px),
    radial-gradient(circle at 50% 74%, rgba(0,0,0,.32) 0 1px, transparent 1.6px),
    linear-gradient(150deg, #aeb6c4 0%, #7e8695 34%, #545c69 52%, #6d7683 70%, #9aa2b0 100%);
  box-shadow:inset 0 1px 1px rgba(255,255,255,.35), inset 0 -2px 3px rgba(0,0,0,.4),
    inset 0 0 0 1px rgba(255,255,255,.12); }
.bn-hull-cap-l{ border-top-left-radius:46%; border-bottom-left-radius:46%; }
.bn-hull-cap-r{ border-top-right-radius:46%; border-bottom-right-radius:46%; }
.bn-hull-cap-t{ border-top-left-radius:46%; border-top-right-radius:46%; }
.bn-hull-cap-b{ border-bottom-left-radius:46%; border-bottom-right-radius:46%; }
.bn-hull-solo{ border-radius:48%; }
.bn-hull-mid-h, .bn-hull-mid-v{ border-radius:1px; }

/* placement preview glow */
.bn-prev-ok{ box-shadow:inset 0 0 0 2px rgba(90,230,150,.95), 0 0 12px rgba(50,220,130,.6) !important; }
.bn-prev-ok:not(.bn-ship){ background:linear-gradient(160deg, rgba(50,190,120,.55), rgba(30,150,95,.6)) !important; }
.bn-prev-bad{ box-shadow:inset 0 0 0 2px rgba(255,110,120,.95), 0 0 12px rgba(240,60,80,.6) !important; }
.bn-prev-bad:not(.bn-ship){ background:linear-gradient(160deg, rgba(230,70,85,.55), rgba(180,40,55,.6)) !important; }

/* ── Hit / miss cell surfaces ────────────────────────────────────────── */
.bn-hit{ background:radial-gradient(circle at 50% 45%, #ffcf6b 0%, #ff7a1a 32%, #b02a0a 70%, #4f1305 100%) !important;
  box-shadow:inset 0 0 8px rgba(0,0,0,.55), 0 0 12px rgba(255,110,30,.55) !important; }
.bn-miss{ background:radial-gradient(circle at 50% 45%, #2f7ba3, #0c3552 75%) !important;
  box-shadow:inset 0 0 8px rgba(2,16,28,.6) !important; }
.bn-own-hit{ background:radial-gradient(circle at 50% 40%, #ff9a3c, #c23412 60%, #611705 100%) !important;
  box-shadow:inset 0 0 8px rgba(0,0,0,.5), 0 0 10px rgba(255,120,40,.5) !important; }
.bn-own-splash{ background:radial-gradient(circle at 50% 45%, #2f7ba3, #0c3552 75%) !important; }

/* sunk ship: rhythmic flash */
.bn-sunk{ animation:bnSunk 1s ease-in-out infinite; }
@keyframes bnSunk{ 0%,100%{ box-shadow:inset 0 0 8px rgba(0,0,0,.55), 0 0 6px rgba(255,90,60,.4); }
  50%{ box-shadow:inset 0 0 10px rgba(0,0,0,.6), 0 0 18px rgba(255,180,60,.95); } }
@media (prefers-reduced-motion: reduce){ .bn-sunk{ animation:none; } }

/* ── framer-motion effect markers (rings + burst / splash dot) ───────── */
.bn-fx{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; }
.bn-fx-core{ font-size:clamp(.7rem, 4.6vw, 1.05rem); line-height:1;
  filter:drop-shadow(0 0 5px rgba(255,150,40,.95)); }
.bn-fx.sm .bn-fx-core{ font-size:clamp(.55rem, 3.4vw, .8rem); }
.bn-ring{ position:absolute; border-radius:50%; }
.bn-ring-hit{ width:64%; height:64%; border:2px solid rgba(255,180,70,.95);
  box-shadow:0 0 10px rgba(255,120,20,.85), inset 0 0 6px rgba(255,150,40,.6); }
.bn-ring-splash{ width:60%; height:60%; border:2px solid rgba(165,225,255,.9);
  box-shadow:0 0 6px rgba(150,215,255,.7); }
.bn-miss-dot{ width:26%; height:26%; border-radius:50%;
  background:radial-gradient(circle at 40% 35%, #f2fbff, #8fbcd6 80%);
  box-shadow:0 0 5px rgba(190,230,255,.85), inset 0 0 2px rgba(255,255,255,.9); }
.bn-fx.sm .bn-miss-dot{ width:30%; height:30%; }

@keyframes bnPop{ 0%{ transform:scale(.4); opacity:.3; } 70%{ transform:scale(1.12); } 100%{ transform:scale(1); opacity:1; } }

/* ── AI targeting indicator ──────────────────────────────────────────── */
.bn-ai-thinking{ display:inline-flex; align-items:center; gap:.35rem; font-weight:900; font-size:.78rem;
  color:var(--accent,#7c5cbf); background:color-mix(in srgb, var(--accent,#7c5cbf) 14%, transparent);
  padding:.28rem .7rem; border-radius:999px; }
.bn-ai-scope{ animation:bnScope 1.4s ease-in-out infinite; }
@keyframes bnScope{ 0%,100%{ transform:translateX(-1px) rotate(-6deg); } 50%{ transform:translateX(1px) rotate(6deg); } }
.bn-ai-dots{ display:inline-flex; gap:2px; }
.bn-ai-dots i{ width:4px; height:4px; border-radius:50%; background:currentColor; opacity:.4; animation:bnDot 1s infinite; }
.bn-ai-dots i:nth-child(2){ animation-delay:.15s; }
.bn-ai-dots i:nth-child(3){ animation-delay:.3s; }
@keyframes bnDot{ 0%,100%{ opacity:.3; transform:translateY(0); } 40%{ opacity:1; transform:translateY(-2px); } }

/* Fleet list ---------------------------------------------------------- */
.bn-fleet-list{ display:flex; flex-wrap:wrap; gap:.35rem .7rem; justify-content:center; font-size:.68rem; font-weight:800; }
.bn-fleet-item{ color:var(--muted,#9b8aaa); letter-spacing:.06em; }
.bn-fleet-item.placed{ color:var(--accent,#7c5cbf); text-decoration:line-through; opacity:.75; }

/* Controls ------------------------------------------------------------ */
.bn-controls{ display:flex; flex-wrap:wrap; gap:.45rem; justify-content:center; }
.bn-btn{ border:none; border-radius:999px; padding:.55rem 1rem; font-family:var(--font-b,system-ui); font-weight:800;
  font-size:.82rem; cursor:pointer; transition:transform .12s ease, box-shadow .2s ease; }
.bn-btn:active{ transform:scale(.96); }
.bn-btn-ghost{ background:var(--surface-2, var(--card,#fff)); color:var(--text,#3a2d4a); border:1px solid var(--border, rgba(200,180,220,.35)); }
.bn-btn-ghost:hover{ box-shadow:var(--shadow, 0 8px 32px rgba(122,80,160,.12)); }
.bn-btn-go{ background:linear-gradient(135deg, var(--primary,#ff6b9d), var(--accent,#7c5cbf)); color:#fff;
  box-shadow:0 8px 22px rgba(124,92,191,.35); }
.bn-btn-go:disabled{ opacity:.45; cursor:not-allowed; box-shadow:none; }

/* Waiting ------------------------------------------------------------- */
.bn-waiting{ display:flex; flex-direction:column; align-items:center; gap:.7rem; }
.bn-waiting p{ font-weight:800; color:var(--muted,#9b8aaa); font-size:.88rem; }

/* Battle -------------------------------------------------------------- */
.bn-battle-head{ display:flex; gap:.6rem; flex-wrap:wrap; justify-content:center; }
.bn-mini-stat{ font-size:.74rem; font-weight:900; padding:.3rem .7rem; border-radius:999px;
  background:var(--surface-2, rgba(0,0,0,.05)); color:var(--text,#3a2d4a); }
.bn-mini-stat.danger{ color:var(--danger,#e5484d); }
.bn-fire-label{ font-weight:900; font-size:.82rem; color:var(--text,#3a2d4a); text-transform:uppercase; letter-spacing:.05em; }
.bn-fire-label.small{ font-size:.72rem; color:var(--muted,#9b8aaa); }
.bn-own-wrap{ display:flex; flex-direction:column; align-items:center; gap:.4rem; margin-top:.3rem; }

/* Over ---------------------------------------------------------------- */
.bn-over{ text-align:center; background:var(--card,#fff); border:1px solid var(--border, rgba(200,180,220,.3));
  border-radius:var(--radius,1.2rem); padding:1.6rem 1.4rem; box-shadow:var(--shadow-lg, 0 20px 60px rgba(122,80,160,.18));
  max-width:min(90vw,420px); animation:bnPop .4s ease; }
.bn-over-emoji{ font-size:3rem; }
.bn-over h2{ font-family:var(--font-d,serif); font-size:1.5rem; margin:.3rem 0; }
.bn-over.win h2{ color:var(--green,#4caf50); }
.bn-over.lose h2{ color:var(--danger,#e5484d); }
.bn-over p{ color:var(--muted,#9b8aaa); font-weight:700; font-size:.9rem; margin-bottom:1.1rem; line-height:1.5; }
.bn-over-btns{ display:flex; gap:.6rem; justify-content:center; flex-wrap:wrap; }

@media (max-width:400px){ .bn-cell{ font-size:3.6vw; } .bn-place-info{ font-size:.82rem; } }
`;
