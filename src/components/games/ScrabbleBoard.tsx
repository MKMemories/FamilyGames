import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { dbRef, update } from "../../lib/firebase";
import { fx } from "../../lib/sound";
import { useSoloAI } from "../../hooks/useSoloAI";
import { loadFrenchDict } from "../../lib/frenchDict";
import {
  BOARD_SIZE, BLANK, bonusAt, BONUS_LABEL, buildScrabbleBag, tileValue, rackValue,
  validateMove, withPlacements, type Board, type BCell, type Placement,
} from "../../lib/scrabbleBoard";
import { bestScrabbleMove } from "../../lib/scrabbleBoardAI";
import type { Room } from "../../types";

interface Props {
  room: Room; roomId: string; playerId: string; isHost: boolean; isSolo: boolean;
  onLeave: () => void; onToast: (m: string) => void;
}
type Stored = (0 | BCell)[][];
interface Pending extends Placement { rackIdx: number; }

const RACK_SIZE = 7;
const shuffle = <T,>(a: T[]): T[] => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const toEngine = (b: Stored | null | undefined): Board =>
  (b && b.length ? b.map(row => row.map(c => (c === 0 ? null : c))) : Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null)));
const toStore = (b: Board): Stored => b.map(row => row.map(c => (c ? c : 0)));

export function ScrabbleBoard({ room, roomId, playerId, isHost, isSolo, onLeave, onToast }: Props) {
  const players = Object.values(room.players || {});
  const phase = room.gsPhase ?? null;
  const order = room.gsOrder ?? [];
  const turnIdx = room.gsTurn ?? 0;
  const currentId = order.length ? order[turnIdx % order.length] : "";
  const aiId = room.aiId;
  const isMyTurn = currentId === playerId;
  const rack = (room.gsRacks || {})[playerId] || [];
  const engineBoard = useMemo(() => toEngine(room.gsBoard), [room.gsBoard]);
  const bag = room.gsBag || [];
  const scores = room.scores || {};
  const nameOf = (id: string) => (room.players || {})[id]?.name || "Joueur";

  const [dict, setDict] = useState<Set<string> | null>(null);
  useEffect(() => { loadFrenchDict().then(setDict); }, []);

  const [pending, setPending] = useState<Pending[]>([]);
  const [selIdx, setSelIdx] = useState<number | null>(null);
  const [blankAt, setBlankAt] = useState<{ r: number; c: number } | null>(null);
  const [exchangeMode, setExchangeMode] = useState(false);
  const [exchangeSel, setExchangeSel] = useState<number[]>([]);

  // Nouveau tour → on efface les tuiles en attente.
  useEffect(() => { setPending([]); setSelIdx(null); setBlankAt(null); setExchangeMode(false); setExchangeSel([]); }, [turnIdx]);

  const usedRackIdx = new Set(pending.map(p => p.rackIdx));
  const pendingAt = (r: number, c: number) => pending.find(p => p.r === r && p.c === c);
  const preview = useMemo(() => pending.length ? validateMove(engineBoard, pending.map(p => ({ r: p.r, c: p.c, l: p.l, blank: p.blank })), dict) : null, [pending, engineBoard, dict]);

  /* ── Host : démarrage (distribue les chevalets) ── */
  const startGame = () => {
    if (players.length < 2) { onToast("Il faut au moins 2 joueurs"); return; }
    const b = buildScrabbleBag(Math.random);
    const ord = shuffle(players.map(p => p.id));
    const racks: Record<string, string[]> = {};
    const sc: Record<string, number> = {};
    ord.forEach(id => { racks[id] = b.splice(0, RACK_SIZE); sc[id] = 0; });
    const board: Stored = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
    update(dbRef(`games/${roomId}`), {
      gsPhase: "play", gsBoard: board, gsBag: b, gsRacks: racks, gsOrder: ord,
      gsTurn: 0, gsHistory: [], gsPasses: 0, gsLastCells: [], scores: sc,
    });
  };

  /* ── Pose / reprise d'une tuile ── */
  const tapCell = (r: number, c: number) => {
    if (!isMyTurn || phase !== "play") return;
    const pen = pendingAt(r, c);
    if (pen) { setPending(p => p.filter(x => !(x.r === r && x.c === c))); return; } // reprendre
    if (engineBoard[r][c]) return; // occupé
    if (selIdx == null) return;
    const tile = rack[selIdx];
    if (tile === BLANK) { setBlankAt({ r, c }); return; } // choisir la lettre du blanc
    fx("place");
    setPending(p => [...p, { r, c, l: tile, rackIdx: selIdx }]);
    setSelIdx(null);
  };
  const chooseBlank = (letter: string) => {
    if (!blankAt || selIdx == null) return;
    fx("place");
    setPending(p => [...p, { r: blankAt.r, c: blankAt.c, l: letter, blank: true, rackIdx: selIdx }]);
    setBlankAt(null); setSelIdx(null);
  };
  const recallAll = () => { setPending([]); setSelIdx(null); };

  /* ── Validation d'un coup ── */
  const commit = (placements: Placement[], byId: string, byRack: string[]) => {
    const res = validateMove(toEngine(room.gsBoard), placements, dict);
    if (!res.ok) { if (byId === playerId) onToast(res.reason || "Coup invalide"); return; }
    const nb = toStore(withPlacements(toEngine(room.gsBoard), placements));
    const newRack = [...byRack];
    for (const p of placements) {
      const tile = p.blank ? BLANK : p.l;
      const i = newRack.indexOf(tile);
      if (i >= 0) newRack.splice(i, 1);
    }
    const nbag = [...(room.gsBag || [])];
    while (newRack.length < RACK_SIZE && nbag.length) newRack.push(nbag.shift()!);
    const sc = { ...(room.scores || {}) }; sc[byId] = (sc[byId] || 0) + res.total;
    const hist = [...(room.gsHistory || []), { player: nameOf(byId), word: res.words.map(w => w.word).join("+"), pts: res.total }].slice(-30);
    const nextTurn = (turnIdx + 1) % order.length;
    fx(byId === playerId ? "point" : "place");

    // Fin de partie : chevalet vidé + sac vide.
    if (newRack.length === 0 && nbag.length === 0) {
      const finalSc = { ...sc };
      let bonus = 0;
      order.forEach(id => {
        const rk = id === byId ? [] : ((room.gsRacks || {})[id] || []);
        const v = rackValue(rk);
        finalSc[id] = (finalSc[id] || 0) - v;
        bonus += v;
      });
      finalSc[byId] = (finalSc[byId] || 0) + bonus;
      const winner = [...order].sort((a, b) => (finalSc[b] || 0) - (finalSc[a] || 0))[0];
      update(dbRef(`games/${roomId}`), {
        gsBoard: nb, [`gsRacks/${byId}`]: newRack, gsBag: nbag, scores: finalSc,
        gsHistory: hist, gsLastCells: placements.map(p => [p.r, p.c]),
        gsPhase: "over", status: "finished", winner: nameOf(winner),
      });
      return;
    }
    update(dbRef(`games/${roomId}`), {
      gsBoard: nb, [`gsRacks/${byId}`]: newRack, gsBag: nbag, scores: sc,
      gsHistory: hist, gsTurn: nextTurn, gsPasses: 0, gsLastCells: placements.map(p => [p.r, p.c]),
    });
  };

  const validate = () => {
    if (!preview) return;
    if (!preview.ok) { onToast(preview.reason || "Coup invalide"); fx("wrong"); return; }
    commit(pending.map(p => ({ r: p.r, c: p.c, l: p.l, blank: p.blank })), playerId, rack);
    setPending([]);
  };

  /* ── Passer / échanger ── */
  const advanceAfterScoreless = (byId: string, upd: Record<string, unknown>) => {
    const passes = (room.gsPasses || 0) + 1;
    const nextTurn = (turnIdx + 1) % order.length;
    if (passes >= order.length * 2) { // tout le monde a passé 2× → fin
      const finalSc = { ...(room.scores || {}) };
      order.forEach(id => { finalSc[id] = (finalSc[id] || 0) - rackValue((room.gsRacks || {})[id] || []); });
      const winner = [...order].sort((a, b) => (finalSc[a] || 0) < (finalSc[b] || 0) ? 1 : -1)[0];
      update(dbRef(`games/${roomId}`), { ...upd, scores: finalSc, gsPhase: "over", status: "finished", winner: nameOf(winner) });
    } else {
      update(dbRef(`games/${roomId}`), { ...upd, gsTurn: nextTurn, gsPasses: passes });
    }
  };
  const passTurn = (byId = playerId) => { fx("tap"); advanceAfterScoreless(byId, {}); };
  const doExchange = (byId: string, byRack: string[], idxs: number[]) => {
    if (bag.length < RACK_SIZE) { if (byId === playerId) onToast("Pas assez de tuiles dans le sac"); return; }
    const newRack = [...byRack];
    const returned: string[] = [];
    [...idxs].sort((a, b) => b - a).forEach(i => { returned.push(newRack.splice(i, 1)[0]); });
    const nbag = shuffle([...(room.gsBag || []), ...returned]);
    for (let k = 0; k < returned.length; k++) newRack.push(nbag.shift()!);
    fx("swap");
    advanceAfterScoreless(byId, { [`gsRacks/${byId}`]: newRack, gsBag: nbag });
  };
  const confirmExchange = () => {
    if (exchangeSel.length === 0) { setExchangeMode(false); return; }
    doExchange(playerId, rack, exchangeSel);
    setExchangeMode(false); setExchangeSel([]);
  };

  /* ── IA (solo) ── */
  const diff = (room.soloDifficulty as "facile" | "moyen" | "difficile") || "moyen";
  const aiTurn = !!aiId && phase === "play" && currentId === aiId && !!dict && isHost;
  const fillCount = engineBoard.reduce((s, row) => s + row.filter(Boolean).length, 0);
  useSoloAI(aiTurn, `${turnIdx}-${fillCount}`, () => {
    if (!aiId || !dict) return;
    const aiRack = (room.gsRacks || {})[aiId] || [];
    const mv = bestScrabbleMove(toEngine(room.gsBoard), aiRack, dict, diff, Math.random);
    if (mv) commit(mv.placements, aiId, aiRack);
    else if ((room.gsBag || []).length >= RACK_SIZE) doExchange(aiId, aiRack, aiRack.map((_, i) => i).slice(0, Math.min(3, aiRack.length)));
    else passTurn(aiId);
  }, diff === "difficile" ? 900 : diff === "facile" ? 2200 : 1500);

  /* ══════════════════════════ RENDER ══════════════════════════ */
  if (phase === null) {
    return (
      <div className="screen game-screen gs-screen">
        <div className="game-topbar"><button className="btn-back" onClick={onLeave}>✕</button><div className="turn-indicator">🔠 Grand Scrabble</div><div /></div>
        <div className="gs-start">
          <div className="gs-start-badge">🔠</div>
          <h1 className="gs-start-title">Grand Scrabble</h1>
          <p className="gs-start-sub">Le vrai Scrabble sur plateau 15×15 : cases bonus, mots croisés, 2 tuiles blanches. Forme des mots, marque un maximum de points !</p>
          <div className="gs-start-players">{players.map(p => <span key={p.id} className="gs-chip" style={{ background: p.color }}>{p.emoji}</span>)}</div>
          {isHost ? <button className="gs-btn gs-btn-primary" onClick={startGame}>Distribuer & commencer →</button>
                  : <div className="gs-hint">⏳ En attente de l'hôte…</div>}
          {players.length < 2 && <div className="gs-hint gs-warn">Il faut au moins 2 joueurs</div>}
        </div>
        <style>{GS_CSS}</style>
      </div>
    );
  }

  const over = phase === "over";
  const lastCells = new Set((room.gsLastCells || []).map(([r, c]) => `${r},${c}`));

  return (
    <div className="screen game-screen gs-screen">
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className="turn-indicator" style={{ background: isMyTurn && !over ? "rgba(36,178,107,.18)" : "rgba(0,0,0,.05)" }}>
          {over ? "🏁 Partie terminée" : isMyTurn ? "🟢 Ton tour !" : `⏳ ${nameOf(currentId)}`}
        </div>
        <div className="gs-bag" title="Tuiles dans le sac">🎒 {bag.length}</div>
      </div>

      <div className="gs-scores">
        {order.map(id => (
          <span key={id} className={`gs-score ${id === currentId && !over ? "cur" : ""}`} style={{ borderColor: (room.players || {})[id]?.color || "var(--border)" }}>
            <b>{nameOf(id).slice(0, 6)}</b> {scores[id] || 0}
          </span>
        ))}
      </div>

      {/* Plateau */}
      <div className="gs-board-wrap">
        <div className="gs-board">
          {Array.from({ length: BOARD_SIZE }).map((_, r) =>
            Array.from({ length: BOARD_SIZE }).map((_, c) => {
              const cell = engineBoard[r][c];
              const pen = pendingAt(r, c);
              const bon = bonusAt(r, c);
              const shown: BCell | null = cell || (pen ? { l: pen.l, blank: pen.blank } : null);
              const cls = `gs-cell b-${bon === "." ? "n" : bon === "#" ? "dl" : bon === "@" ? "tl" : bon === "2" ? "dw" : bon === "3" ? "tw" : "st"}`;
              return (
                <button key={`${r}-${c}`} className={`${cls} ${pen ? "pending" : ""} ${lastCells.has(`${r},${c}`) ? "last" : ""}`}
                  onClick={() => tapCell(r, c)} disabled={!isMyTurn || over}>
                  {shown ? (
                    <span className="gs-tile-face">{shown.l}{!shown.blank && <span className="gs-tv">{tileValue(shown.l)}</span>}</span>
                  ) : (
                    bon !== "." && <span className="gs-bon">{BONUS_LABEL[bon]}</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Aperçu du coup */}
      <div className="gs-preview-slot">
        {isMyTurn && !over && pending.length > 0 && (
          <span className={`gs-preview ${preview?.ok ? "ok" : "no"}`}>
            {preview?.ok ? `✓ ${preview.words.map(w => w.word).join(" · ")} = ${preview.total} pts${pending.length === 7 ? " 🎉 SCRABBLE +50" : ""}` : `✗ ${preview?.reason || ""}`}
          </span>
        )}
      </div>

      {/* Chevalet */}
      {!over && (
        <div className="gs-rack">
          {rack.map((t, i) => {
            const used = usedRackIdx.has(i);
            const selForEx = exchangeSel.includes(i);
            return (
              <motion.button key={i} className={`gs-tile ${selIdx === i ? "sel" : ""} ${used ? "used" : ""} ${selForEx ? "ex" : ""}`}
                disabled={!isMyTurn || (used && !exchangeMode)} whileTap={{ scale: 0.9 }}
                onClick={() => {
                  if (!isMyTurn) return;
                  if (exchangeMode) { setExchangeSel(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i]); return; }
                  if (used) return;
                  setSelIdx(selIdx === i ? null : i);
                }}>
                <span className="gs-tile-face">{t === BLANK ? "★" : t}{t !== BLANK && <span className="gs-tv">{tileValue(t)}</span>}</span>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Actions */}
      {isMyTurn && !over && (
        <div className="gs-actions">
          {exchangeMode ? (
            <>
              <button className="gs-btn gs-btn-primary" onClick={confirmExchange}>Échanger ({exchangeSel.length})</button>
              <button className="gs-btn gs-btn-ghost" onClick={() => { setExchangeMode(false); setExchangeSel([]); }}>Annuler</button>
            </>
          ) : (
            <>
              <button className="gs-btn gs-btn-primary" onClick={validate} disabled={pending.length === 0 || !preview?.ok}>✅ Valider</button>
              <button className="gs-btn gs-btn-ghost" onClick={recallAll} disabled={pending.length === 0}>↩︎ Reprendre</button>
              <button className="gs-btn gs-btn-ghost" onClick={() => setExchangeMode(true)} disabled={bag.length < RACK_SIZE}>🔄 Échanger</button>
              <button className="gs-btn gs-btn-ghost" onClick={() => passTurn()}>⏭ Passer</button>
            </>
          )}
        </div>
      )}

      {/* Historique */}
      <div className="gs-history">
        <AnimatePresence initial={false}>
          {(room.gsHistory || []).slice(-4).map((h, i) => (
            <motion.div key={`${i}-${h.word}-${h.pts}`} className="gs-hist-row" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <span>{h.player}</span><strong>{h.word}</strong><span className="gs-hist-pts">+{h.pts}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Choix de la lettre du blanc */}
      <AnimatePresence>
        {blankAt && (
          <motion.div className="gs-blank-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setBlankAt(null)}>
            <motion.div className="gs-blank-card" initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="gs-blank-title">Choisis la lettre du ★ blanc</div>
              <div className="gs-blank-grid">
                {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(L => (
                  <button key={L} className="gs-blank-letter" onClick={() => chooseBlank(L)}>{L}</button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{GS_CSS}</style>
    </div>
  );
}

const GS_CSS = `
.gs-screen{max-width:600px;margin:0 auto;}
.gs-bag{font-weight:800;font-size:.85rem;color:var(--muted);}
.gs-scores{display:flex;gap:.4rem;flex-wrap:wrap;justify-content:center;margin:.2rem 0 .5rem;}
.gs-score{font-size:.78rem;font-weight:800;padding:.2rem .5rem;border-radius:999px;border:1.5px solid var(--border);background:var(--surface-1);color:var(--text);}
.gs-score.cur{box-shadow:0 0 0 2px rgba(var(--accent-rgb),.3);}
.gs-score b{font-weight:900;}

.gs-board-wrap{display:flex;justify-content:center;}
.gs-board{display:grid;grid-template-columns:repeat(15,1fr);gap:2px;width:min(96vw,540px);aspect-ratio:1;
  padding:6px;border-radius:12px;background:linear-gradient(160deg,#0d5c47,#0a3f31);box-shadow:inset 0 2px 12px rgba(0,0,0,.5),0 10px 30px rgba(0,0,0,.28);}
.gs-cell{border:none;border-radius:3px;padding:0;display:flex;align-items:center;justify-content:center;cursor:pointer;
  aspect-ratio:1;font-size:clamp(.5rem,2.4vw,.95rem);line-height:1;position:relative;overflow:hidden;}
.gs-cell:disabled{cursor:default;}
.gs-cell.b-n{background:#e9f5ee;} .gs-cell.b-dl{background:#9fd0ff;} .gs-cell.b-tl{background:#3f8fe0;}
.gs-cell.b-dw{background:#ffb3c7;} .gs-cell.b-tw{background:#ff6b6b;} .gs-cell.b-st{background:#ffcf6b;}
.gs-bon{font-size:clamp(.34rem,1.5vw,.56rem);font-weight:800;color:rgba(20,40,30,.72);}
.gs-cell.b-tl .gs-bon,.gs-cell.b-tw .gs-bon{color:rgba(255,255,255,.92);}
.gs-tile-face{position:relative;width:92%;height:92%;display:flex;align-items:center;justify-content:center;
  border-radius:3px;font-family:Georgia,serif;font-weight:800;color:#3a2a15;
  background:linear-gradient(135deg,#f7eccf,#e6cf9c);box-shadow:inset 1px 1px 2px rgba(255,255,255,.8),inset -1px -1px 2px rgba(120,80,35,.4),0 1px 2px rgba(0,0,0,.3);}
.gs-tv{position:absolute;bottom:0;right:1px;font-size:.42em;font-weight:800;color:rgba(90,62,25,.85);}
.gs-cell.pending .gs-tile-face{background:linear-gradient(135deg,#fff4d0,#ffd97e);box-shadow:inset 1px 1px 2px rgba(255,255,255,.9),0 0 0 1.5px var(--accent);}
.gs-cell.last .gs-tile-face{box-shadow:inset 1px 1px 2px rgba(255,255,255,.8),0 0 0 1.5px #24b26b;}

.gs-preview-slot{min-height:26px;display:flex;justify-content:center;align-items:center;margin:.35rem 0;}
.gs-preview{font-size:.82rem;font-weight:800;padding:.15rem .7rem;border-radius:999px;text-align:center;}
.gs-preview.ok{color:var(--green);background:color-mix(in srgb,var(--green) 16%,transparent);}
.gs-preview.no{color:var(--danger);background:color-mix(in srgb,var(--danger) 16%,transparent);}

.gs-rack{display:flex;gap:.4rem;justify-content:center;flex-wrap:wrap;margin:.2rem 0;min-height:56px;}
.gs-tile{width:44px;height:50px;border:none;border-radius:8px;cursor:pointer;padding:0;
  background:linear-gradient(180deg,#f7eccf,#e6cf9c);box-shadow:inset 2px 2px 3px rgba(255,255,255,.9),inset -2px -3px 5px rgba(120,80,35,.4),0 4px 7px rgba(70,45,15,.3);}
.gs-tile .gs-tile-face{background:none;box-shadow:none;font-size:1.5rem;}
.gs-tile.sel{transform:translateY(-6px);box-shadow:0 0 0 2px var(--accent),0 8px 16px rgba(0,0,0,.25);}
.gs-tile.used{opacity:.32;}
.gs-tile.ex{box-shadow:0 0 0 2px var(--danger);transform:translateY(-4px);}
.gs-tile:disabled{cursor:default;}

.gs-actions{display:flex;gap:.4rem;justify-content:center;flex-wrap:wrap;margin:.4rem 0;}
.gs-btn{border:none;border-radius:999px;padding:.55rem 1rem;font-weight:800;font-size:.86rem;cursor:pointer;font-family:var(--font-b);}
.gs-btn-primary{color:#fff;background:linear-gradient(135deg,var(--primary),var(--accent));box-shadow:var(--shadow);}
.gs-btn-primary:disabled{opacity:.5;cursor:default;}
.gs-btn-ghost{background:var(--surface-1);color:var(--text);border:1px solid var(--border);}
.gs-btn-ghost:disabled{opacity:.45;cursor:default;}

.gs-history{max-width:360px;margin:.3rem auto 0;width:calc(100% - 1.6rem);}
.gs-hist-row{display:flex;gap:.5rem;align-items:center;background:var(--surface-1);border:1px solid var(--border);border-radius:10px;padding:.3rem .6rem;margin-bottom:.25rem;font-size:.82rem;}
.gs-hist-row strong{flex:1;font-family:Georgia,serif;letter-spacing:.04em;}
.gs-hist-pts{color:var(--green);font-weight:900;}

.gs-start{max-width:420px;margin:1rem auto;text-align:center;padding:0 1rem;}
.gs-start-badge{font-size:3rem;}
.gs-start-title{font-family:var(--font-d);font-size:1.8rem;margin:.3rem 0;}
.gs-start-sub{color:var(--muted);font-size:.95rem;margin-bottom:1rem;}
.gs-start-players{display:flex;gap:.4rem;justify-content:center;margin-bottom:1rem;}
.gs-chip{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;font-size:1.2rem;box-shadow:var(--shadow);}
.gs-btn-primary.gs-btn{padding:.8rem 1.6rem;font-size:1rem;}
.gs-hint{color:var(--muted);font-size:.85rem;margin-top:.7rem;}
.gs-hint.gs-warn{color:var(--danger);}

.gs-blank-overlay{position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:rgba(10,10,25,.55);backdrop-filter:blur(4px);padding:1rem;}
.gs-blank-card{background:var(--surface-1);border:1px solid var(--border);border-radius:18px;padding:1rem;box-shadow:var(--shadow-lg);max-width:380px;width:100%;}
.gs-blank-title{font-family:var(--font-d);text-align:center;margin-bottom:.6rem;}
.gs-blank-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:.35rem;}
.gs-blank-letter{aspect-ratio:1;border:1px solid var(--border);border-radius:8px;background:var(--surface-2,var(--bg));color:var(--text);font-weight:800;cursor:pointer;font-family:Georgia,serif;font-size:1rem;}
.gs-blank-letter:hover{border-color:var(--accent);color:var(--accent);}
`;
