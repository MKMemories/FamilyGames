import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { dbRef, update } from "../../lib/firebase";
import { LETTER_VALS } from "../../lib/gameData";
import { loadFrenchDict, isValidWord, suggestFromRack } from "../../lib/frenchDict";
import { fx } from "../../lib/sound";
import type { Room } from "../../types";

interface ScrabbleProps {
  room: Room;
  roomId: string;
  playerId: string;
  isHost: boolean;
  isSolo: boolean;
  onLeave: () => void;
  onToast: (msg: string) => void;
}

export function Scrabble({ room, roomId, playerId, isHost, isSolo, onLeave, onToast }: ScrabbleProps) {
  // Purely-visual transient celebration (no game logic, no Firebase).
  const [celebrate, setCelebrate] = useState<{ word: string; pts: number } | null>(null);
  // Dictionnaire français local (chargé une fois) → validation instantanée.
  const [dict, setDict] = useState<Set<string> | null>(null);
  useEffect(() => { loadFrenchDict().then(setDict); }, []);

  const players = Object.values(room.players || {});
  const currentTurn = room.currentTurn || 0;
  const isMyTurn = isSolo || players[currentTurn % players.length]?.id === playerId;
  const rack = (room.racks || {})[playerId] || [];
  const roundWord = room.roundWord || "";
  const selectedTiles = (room.selectedTiles || []) as number[];
  const passedTurn = room.passedTurn || {};

  const dictReady = !!dict && dict.size > 0;
  const showValidity = roundWord.length >= 2 && dictReady;
  const wordValid = roundWord.length >= 2 && isValidWord(dict, roundWord);

  const handleTile = (idx: number) => {
    if (!isMyTurn || room.winner) return;
    const sel = [...selectedTiles];
    if (sel.includes(idx)) {
      const pos = sel.lastIndexOf(idx);
      sel.splice(pos, 1);
      fx("tap");
      const newWord = roundWord.slice(0, -1);
      update(dbRef(`games/${roomId}`), { selectedTiles: sel, roundWord: newWord });
    } else {
      sel.push(idx);
      fx("place");
      const newWord = roundWord + rack[idx];
      update(dbRef(`games/${roomId}`), { selectedTiles: sel, roundWord: newWord });
    }
  };

  const playWord = async () => {
    const myIdx = players.findIndex(p => p.id === playerId);
    if (!isSolo && myIdx !== currentTurn % players.length) return;
    const word = roundWord.toUpperCase();
    if (word.length < 2) { onToast("Mot trop court !"); return; }

    // Vérification instantanée contre le dictionnaire français local.
    if (!isValidWord(dict, word)) {
      onToast(`« ${word} » n'est pas dans le dictionnaire !`);
      return;
    }

    const pts = word.split("").reduce((s, l) => s + (LETTER_VALS[l] || 0), 0);
    fx("point");
    // Visual-only flourish; does not affect scoring or Firebase.
    setCelebrate({ word, pts });
    setTimeout(() => setCelebrate(null), 1200);
    const prevScore = (room.scores || {})[playerId] || 0;
    const newScores = { ...(room.scores || {}), [playerId]: prevScore + pts };
    const newRack = [...rack];
    const used = [...selectedTiles].sort((a, b) => b - a);
    used.forEach(i => newRack.splice(i, 1));
    const bag = [...(room.bag || [])];
    const needed = Math.min(7 - newRack.length, bag.length);
    for (let i = 0; i < needed; i++) newRack.push(bag.shift()!);
    const hist = [
      ...(room.wordHistory || []),
      { player: players[isSolo ? 0 : myIdx]?.name || "Joueur", word, pts }
    ];
    const allRacksEmpty = players.every(p =>
      p.id === playerId ? newRack.length === 0 : ((room.racks || {})[p.id] || []).length === 0
    );
    const allScores = { ...newScores };
    const maxEntry = Object.entries(allScores).sort((a, b) => b[1] - a[1])[0];
    const winner = allRacksEmpty ? (players.find(p => p.id === maxEntry?.[0])?.name || "") : null;
    const newPassed = { ...passedTurn, [playerId]: false };
    const upd: any = {
      [`racks/${playerId}`]: newRack, bag,
      scores: newScores,
      currentTurn: currentTurn + 1,
      roundWord: "", selectedTiles: [],
      wordHistory: hist,
      passedTurn: newPassed,
    };
    if (winner) { upd.winner = winner; upd.status = "finished"; }
    update(dbRef(`games/${roomId}`), upd);
  };

  const skip = () => {
    const newPassed = { ...passedTurn, [playerId]: true };
    update(dbRef(`games/${roomId}`), {
      currentTurn: currentTurn + 1,
      roundWord: "", selectedTiles: [],
      passedTurn: newPassed,
    });
  };

  const clear = () => {
    update(dbRef(`games/${roomId}`), { roundWord: "", selectedTiles: [] });
  };

  /* 💡 Aide : l'ordinateur propose un mot valide du chevalet, contre -5 pts. */
  const useHint = () => {
    if (!isMyTurn || room.winner) return;
    if (!dictReady) { onToast("Dictionnaire en cours de chargement…"); return; }
    const sug = suggestFromRack(dict, rack, LETTER_VALS);
    if (!sug) { onToast("Aucun mot possible avec ces lettres 😅"); return; }
    const prev = (room.scores || {})[playerId] || 0;
    update(dbRef(`games/${roomId}`), {
      roundWord: sug.word,
      selectedTiles: sug.indices,
      scores: { ...(room.scores || {}), [playerId]: prev - 5 },
    });
    onToast(`💡 -5 pts — essaie « ${sug.word} »`);
  };

  const swapOneLetter = (idx: number) => {
    if (!isMyTurn || room.winner) return;
    const bag = [...(room.bag || [])];
    if (bag.length === 0) { onToast("Sac vide !"); return; }
    const newRack = [...rack];
    const letter = newRack[idx];
    bag.push(letter);
    bag.sort(() => Math.random() - 0.5);
    newRack[idx] = bag.shift()!;
    const newScores = { ...(room.scores || {}), [playerId]: ((room.scores || {})[playerId] || 0) - 1 };
    update(dbRef(`games/${roomId}`), {
      [`racks/${playerId}`]: newRack,
      bag, scores: newScores,
      roundWord: "", selectedTiles: [],
    });
    onToast("-1 pt — lettre échangée !");
  };

  const swapAll = () => {
    if (!isMyTurn || room.winner) return;
    const bag = [...(room.bag || [])];
    if (bag.length < 7) { onToast("Pas assez de lettres dans le sac !"); return; }
    rack.forEach(l => bag.push(l));
    bag.sort(() => Math.random() - 0.5);
    const newRack = bag.splice(0, 7);
    const newScores = { ...(room.scores || {}), [playerId]: ((room.scores || {})[playerId] || 0) - 5 };
    update(dbRef(`games/${roomId}`), {
      [`racks/${playerId}`]: newRack,
      bag, scores: newScores,
      currentTurn: currentTurn + 1,
      roundWord: "", selectedTiles: [],
    });
    onToast("-5 pts — tirage complet !");
  };

  const endGame = () => {
    const scores = room.scores || {};
    const maxEntry = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    const winner = players.find(p => p.id === maxEntry?.[0])?.name || players[0]?.name || "?";
    update(dbRef(`games/${roomId}`), { status: "finished", winner });
  };

  return (
    <div className="screen game-screen scrabble-screen">
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className="turn-indicator" style={{ background: isMyTurn ? "rgba(76,175,80,.2)" : "rgba(0,0,0,.05)" }}>
          {isSolo ? "🎮 Mode Solo" : isMyTurn ? "🟢 Ton tour !" : `⏳ ${(players[currentTurn % players.length] || {}).name || "…"}`}
        </div>
        <div className="score-mini">
          {players.map(p => {
            const sc = (room.scores || {})[p.id] ?? 0;
            return (
              <span key={p.id} style={{ color: p.color || "#333" }}>
                {p.name.slice(0, 4)}{" "}
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={sc}
                    style={{ display: "inline-block" }}
                    initial={{ y: -10, scale: 0.4, opacity: 0 }}
                    animate={{ y: 0, scale: 1, opacity: 1 }}
                    exit={{ y: 8, scale: 0.4, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 600, damping: 24 }}
                  >
                    {sc}
                  </motion.span>
                </AnimatePresence>
              </span>
            );
          })}
        </div>
      </div>

      {room.winner && <div className="win-banner">🎉 {room.winner} gagne !</div>}

      <div className="scrabble-zone">
        {/* Celebratory flourish on a successful word (visual only). */}
        <AnimatePresence>
          {celebrate && (
            <motion.div
              className="sc-celebrate"
              initial={{ opacity: 0, y: 24, scale: 0.6 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.7 }}
              transition={{ type: "spring", stiffness: 340, damping: 18 }}
            >
              <span className="sc-celebrate-word">{celebrate.word}</span>
              <span className="sc-celebrate-pts">+{celebrate.pts} pts</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div className={`scrabble-word-display ${showValidity ? (wordValid ? "sc-valid" : "sc-invalid") : ""}`} layout>
          {roundWord ? (
            <AnimatePresence mode="popLayout" initial={false}>
              {roundWord.split("").map((l, i) => (
                <motion.span
                  key={`${i}-${l}`}
                  className={`placed-tile ${celebrate ? "sc-glow" : ""}`}
                  layout
                  initial={{ scale: 0, y: -26, rotate: -8, opacity: 0 }}
                  animate={{ scale: 1, y: 0, rotate: 0, opacity: 1 }}
                  exit={{ scale: 0, y: 18, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 520, damping: 22 }}
                >
                  {l}
                  <span className="tile-val">{LETTER_VALS[l] || 0}</span>
                </motion.span>
              ))}
            </AnimatePresence>
          ) : (
            <span style={{ color: "var(--muted)" }}>Sélectionne des lettres…</span>
          )}
        </motion.div>

        {/* Indicateur de validité (coloriage rouge / vert instantané) */}
        <div className="sc-word-status-slot">
          {showValidity && (
            <span className={`sc-word-status ${wordValid ? "ok" : "no"}`}>
              {wordValid ? "✓ Mot valide" : "✗ Pas dans le dictionnaire"}
            </span>
          )}
        </div>

        {isMyTurn && !room.winner && (
          <div className="rack-swap-row">
            {rack.map((_, i) => (
              <motion.button
                key={i}
                className="tile-swap-btn"
                onClick={() => swapOneLetter(i)}
                title="Échanger cette lettre (-1 pt)"
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.9 }}
              >↺</motion.button>
            ))}
          </div>
        )}

        <div className="scrabble-rack">
          <AnimatePresence initial={false}>
            {rack.map((l, i) => (
              <motion.button
                key={`${i}-${l}`}
                className={`rack-tile ${selectedTiles.includes(i) ? "selected" : ""}`}
                onClick={() => handleTile(i)}
                disabled={!isMyTurn || !!room.winner}
                layout
                initial={{ opacity: 0, y: 22, scale: 0.6 }}
                animate={{
                  opacity: 1,
                  y: selectedTiles.includes(i) ? -10 : 0,
                  scale: selectedTiles.includes(i) ? 1.08 : 1,
                }}
                exit={{ opacity: 0, y: 18, scale: 0.5 }}
                transition={{
                  type: "spring",
                  stiffness: 480,
                  damping: 26,
                  delay: 0.03 * i,
                }}
                whileHover={isMyTurn && !room.winner ? { y: -4, scale: 1.05 } : undefined}
                whileTap={isMyTurn && !room.winner ? { scale: 0.94 } : undefined}
              >
                <span className="rack-tile-face">{l}</span>
                <span className="tile-val">{LETTER_VALS[l] || 0}</span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {isMyTurn && !room.winner && (
          <>
            <div className="scrabble-actions">
              <button
                className="btn btn-primary"
                onClick={playWord}
                disabled={roundWord.length < 2 || (showValidity && !wordValid)}
              >
                ✅ Valider
              </button>
              <button className="btn btn-ghost" onClick={useHint} title="L'ordinateur propose un mot (-5 pts)">💡 Indice (-5)</button>
              <button className="btn btn-ghost" onClick={skip}>⏭ Passer</button>
              <button className="btn btn-ghost" onClick={clear}>🔄 Effacer</button>
            </div>
            <div style={{ textAlign: "center", marginTop: ".4rem" }}>
              <button
                className="btn btn-ghost"
                style={{ fontSize: ".78rem", padding: ".4rem .9rem" }}
                onClick={swapAll}
              >
                🔀 Tout changer (-5 pts)
              </button>
            </div>
          </>
        )}

        {isHost && !room.winner && (
          <div style={{ textAlign: "center", marginTop: ".8rem" }}>
            <button className="btn btn-accent" style={{ fontSize: ".82rem" }} onClick={endGame}>
              🏁 Terminer la partie et voir le vainqueur
            </button>
          </div>
        )}
      </div>

      <div className="scrabble-history">
        <AnimatePresence initial={false}>
          {(room.wordHistory || []).slice(-5).map((w, i) => (
            <motion.div
              key={`${i}-${w.word}-${w.pts}`}
              className="word-hist-row"
              layout
              initial={{ opacity: 0, x: -18, height: 0 }}
              animate={{ opacity: 1, x: 0, height: "auto" }}
              exit={{ opacity: 0, x: 18 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
            >
              <span>{w.player}</span>
              <strong>{w.word}</strong>
              <span style={{ color: w.pts > 0 ? "var(--green)" : "var(--primary)" }}>
                {w.pts > 0 ? "+" : ""}{w.pts} pts
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <style>{SCRABBLE_CSS}</style>
    </div>
  );
}

/* Premium wooden-tile visuals. Chrome reads the app's theme variables so it
   works in light and dark; the tiles keep their realistic ivory/wood tones,
   which read on both. New helpers are prefixed `sc-`; existing class names are
   re-styled with `.scrabble-zone` specificity so nothing else is affected. */
const SCRABBLE_CSS = `
.scrabble-zone { position: relative; }

/* ── Word tray: a felted board slot the tiles drop onto ── */
.scrabble-zone .scrabble-word-display {
  min-height: 70px;
  gap: .4rem;
  border: none;
  border-radius: 16px;
  padding: .9rem 1rem;
  background:
    radial-gradient(120% 140% at 50% -10%, rgba(255,255,255,.06), transparent 60%),
    linear-gradient(160deg, #2f6b46 0%, #245538 55%, #1d4630 100%);
  box-shadow:
    inset 0 2px 10px rgba(0,0,0,.5),
    inset 0 -2px 6px rgba(255,255,255,.06),
    0 6px 18px rgba(20,50,30,.35);
}
.scrabble-zone .scrabble-word-display > span { color: rgba(255,255,255,.6) !important; }

/* ── Validation dictionnaire : anneau vert (valide) / rouge (invalide) ── */
.scrabble-zone .scrabble-word-display.sc-valid {
  box-shadow: inset 0 2px 10px rgba(0,0,0,.5), 0 0 0 2px #37d67a, 0 6px 20px rgba(45,190,110,.4);
}
.scrabble-zone .scrabble-word-display.sc-invalid {
  box-shadow: inset 0 2px 10px rgba(0,0,0,.5), 0 0 0 2px #ff5a6a, 0 6px 20px rgba(220,60,80,.38);
}
.scrabble-zone .scrabble-word-display.sc-valid .placed-tile { color: #1e7a44; }
.scrabble-zone .scrabble-word-display.sc-invalid .placed-tile { color: #b8202f; }
.sc-word-status-slot { min-height: 22px; text-align: center; margin: .35rem 0 .1rem; }
.sc-word-status { display: inline-block; font-size: .82rem; font-weight: 900; padding: .12rem .7rem; border-radius: 999px; }
.sc-word-status.ok { color: var(--green); background: color-mix(in srgb, var(--green) 16%, transparent); }
.sc-word-status.no { color: var(--danger); background: color-mix(in srgb, var(--danger) 16%, transparent); }

/* ── Shared tile surface: ivory with a subtle vertical wood grain, bevel ── */
.scrabble-zone .rack-tile,
.scrabble-zone .scrabble-word-display .placed-tile {
  position: relative;
  width: 48px;
  height: 54px;
  border: none;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3a2a15;
  font-family: Georgia, "Times New Roman", "Playfair Display", serif;
  font-weight: 800;
  font-size: 1.55rem;
  line-height: 1;
  background:
    linear-gradient(180deg, rgba(255,255,255,.55) 0%, rgba(255,255,255,0) 22%, rgba(120,80,30,.05) 100%),
    repeating-linear-gradient(92deg,
      rgba(180,140,80,.0) 0px,
      rgba(160,120,60,.10) 1px,
      rgba(200,165,105,.0) 3px,
      rgba(180,140,80,.06) 5px),
    linear-gradient(135deg, #f7eccf 0%, #efdcae 52%, #e6cf9c 100%);
  box-shadow:
    inset 2px 2px 3px rgba(255,255,255,.9),
    inset -2px -3px 5px rgba(120,80,35,.4),
    0 4px 7px rgba(70,45,15,.32),
    0 9px 16px rgba(70,45,15,.18);
  text-shadow: 0 1px 0 rgba(255,255,255,.5);
  transition: box-shadow .18s ease, filter .18s ease;
}
.scrabble-zone .rack-tile { cursor: pointer; }
.scrabble-zone .rack-tile:disabled { cursor: default; }
.scrabble-zone .rack-tile-face { display: block; }

/* ── Selected tile: lifts brighter & warmer (motion handles the transform) ── */
.scrabble-zone .rack-tile.selected {
  background:
    linear-gradient(180deg, rgba(255,255,255,.6) 0%, rgba(255,255,255,0) 24%, rgba(180,120,30,.06) 100%),
    linear-gradient(135deg, #fff4d0 0%, #ffe6a4 55%, #ffd97e 100%);
  box-shadow:
    inset 2px 2px 3px rgba(255,255,255,.95),
    inset -2px -3px 5px rgba(160,110,30,.45),
    0 10px 20px rgba(210,150,40,.45),
    0 0 0 2px rgba(255,203,92,.55);
}

/* ── Small point value, engraved bottom-right ── */
.scrabble-zone .tile-val {
  position: absolute;
  bottom: 4px;
  right: 5px;
  font-size: .52rem;
  font-weight: 800;
  font-family: Georgia, serif;
  color: rgba(90,62,25,.85);
  text-shadow: 0 1px 0 rgba(255,255,255,.55);
}

/* Placed tiles read as freshly set on the felt: a touch warmer + cast shadow */
.scrabble-zone .scrabble-word-display .placed-tile {
  width: 42px;
  height: 48px;
  font-size: 1.4rem;
  box-shadow:
    inset 2px 2px 3px rgba(255,255,255,.9),
    inset -2px -3px 5px rgba(120,80,35,.4),
    0 5px 9px rgba(0,0,0,.4),
    0 12px 20px rgba(0,0,0,.28);
}

/* Success glow on the placed word during the celebration */
.scrabble-zone .placed-tile.sc-glow {
  box-shadow:
    inset 2px 2px 3px rgba(255,255,255,.95),
    inset -2px -3px 5px rgba(120,80,35,.4),
    0 0 14px 2px rgba(255,206,84,.85),
    0 6px 12px rgba(0,0,0,.3);
}

.scrabble-zone .scrabble-rack { gap: .5rem; min-height: 58px; }

/* ── Swap chips styled to match the wooden theme, theme-aware ── */
.scrabble-zone .rack-swap-row { gap: .5rem; }
.scrabble-zone .tile-swap-btn {
  width: 48px;
  height: 20px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 32%, transparent);
  color: var(--accent);
  cursor: pointer;
}

/* ── Celebration burst ── */
.sc-celebrate {
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .15rem;
  padding: .5rem 1.1rem;
  border-radius: 14px;
  pointer-events: none;
  background: linear-gradient(135deg, var(--gold, #f5c451), #f0a93a);
  box-shadow: 0 10px 26px rgba(210,150,40,.5), inset 0 1px 0 rgba(255,255,255,.6);
}
.sc-celebrate-word {
  font-family: var(--font-d, Georgia, serif);
  font-weight: 900;
  font-size: 1.15rem;
  letter-spacing: .06em;
  color: #4a2f08;
  text-shadow: 0 1px 0 rgba(255,255,255,.5);
}
.sc-celebrate-pts {
  font-weight: 900;
  font-size: .8rem;
  color: #6b3d05;
}

/* ── History rows: theme-aware surface ── */
.scrabble-history .word-hist-row {
  background: var(--surface-2, var(--surface-3));
  border: 1px solid var(--border);
  overflow: hidden;
}

@media (max-width: 380px) {
  .scrabble-zone .rack-tile { width: 42px; height: 48px; font-size: 1.35rem; }
  .scrabble-zone .scrabble-word-display .placed-tile { width: 38px; height: 44px; font-size: 1.25rem; }
  .scrabble-zone .tile-swap-btn { width: 42px; }
}
`;
