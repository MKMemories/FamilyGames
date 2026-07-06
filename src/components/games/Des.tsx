import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { dbRef, update } from "../../lib/firebase";
import { fx } from "../../lib/sound";
import type { Room } from "../../types";
import { useSoloAI } from "../../hooks/useSoloAI";
import { decideDesMove } from "../../lib/desAI";

/* ══════════════════════════════════════════════════════════════════════════
   BLUFF DES DÉS — Perudo / Menteur (2–4 joueurs, chacun sur son écran)
   Chacun a 5 dés cachés. À tour de rôle on RELANCE la mise (« il y a au moins
   N dés montrant la face F, tous joueurs confondus ») ou on crie « MENTEUR ! ».
   Au défi, on révèle : si la mise est vraie → le contestant perd un dé, sinon
   le miseur perd un dé. À 0 dé on est éliminé. Dernier survivant = vainqueur.
   PAS de dé joker : une face ne compte qu'elle-même (plus clair pour les kids).

   Source de vérité = room :
     dsPhase   : "bid" | "reveal" | "over" | null
     dsOrder   : string[]                       (ordre de jeu mélangé)
     dsCounts  : Record<pid, number>            (dés restants)
     dsDice    : Record<pid, number[]>          (dés cachés, révélés au défi)
     dsBid     : { qty, face, by } | null
     dsTurn    : pid à jouer
     dsRoundId : number                         (incrémente à chaque manche)
     dsReveal  : { face, qty, actual, loser, bidder, caller } | null
   ══════════════════════════════════════════════════════════════════════════ */

interface DesProps {
  room: Room;
  roomId: string;
  playerId: string;
  isHost: boolean;
  isSolo: boolean;
  onLeave: () => void;
  onToast: (m: string) => void;
}

const rollDice = (n: number): number[] =>
  Array.from({ length: Math.max(0, n) }, () => 1 + Math.floor(Math.random() * 6));

/** Prochain joueur actif (dés > 0) après `fromId` dans l'ordre circulaire. */
function nextActive(order: string[], counts: Record<string, number>, fromId: string): string {
  const n = order.length;
  if (n === 0) return fromId;
  const start = order.indexOf(fromId);
  for (let i = 1; i <= n; i++) {
    const cand = order[(start + i + n) % n];
    if (cand !== fromId && (counts[cand] ?? 0) > 0) return cand;
  }
  return fromId;
}

/** Plus petite relance strictement supérieure, ou null si impossible. */
function minRaise(bid: { qty: number; face: number }, total: number): { qty: number; face: number } | null {
  if (bid.face < 6) return { qty: bid.qty, face: bid.face + 1 };
  if (bid.qty < total) return { qty: bid.qty + 1, face: 1 };
  return null;
}

export function Des({ room, roomId, playerId, isHost, isSolo, onLeave, onToast }: DesProps) {
  void isSolo;

  /* ── Lectures défensives ── */
  const players = Object.values(room.players || {});
  const phase = room.dsPhase ?? null;
  const order = room.dsOrder ?? [];
  const counts = room.dsCounts ?? {};
  const dice = room.dsDice ?? {};
  const bid = room.dsBid ?? null;
  const turn = room.dsTurn ?? "";
  const roundId = room.dsRoundId ?? 0;
  const reveal = room.dsReveal ?? null;

  const totalDice = (order.length ? order : players.map(p => p.id))
    .reduce((s, id) => s + (counts[id] ?? 0), 0);

  const myTurn = phase === "bid" && turn === playerId && (counts[playerId] ?? 0) > 0;
  const turnPlayer = players.find(p => p.id === turn);
  const aiId = room.aiId;
  const aiThinking = phase === "bid" && !!aiId && turn === aiId;

  /* ── Constructeur de mise (état UI local) ── */
  const [bidQty, setBidQty] = useState(1);
  const [bidFace, setBidFace] = useState(1);

  useEffect(() => {
    if (phase !== "bid" || turn !== playerId) return;
    if (bid) {
      const m = minRaise(bid, totalDice);
      if (m) { setBidQty(m.qty); setBidFace(m.face); }
      else { setBidQty(bid.qty); setBidFace(bid.face); }
    } else {
      const myDice = dice[playerId] || [];
      let bf = 1, bc = -1;
      for (let f = 1; f <= 6; f++) {
        const c = myDice.filter(x => x === f).length;
        if (c > bc) { bc = c; bf = f; }
      }
      setBidQty(Math.max(1, bc));
      setBidFace(bf);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, turn, roundId]);

  const isLegal = (qty: number, face: number): boolean => {
    if (qty < 1 || qty > totalDice || face < 1 || face > 6) return false;
    if (!bid) return true;
    return qty > bid.qty || (qty === bid.qty && face > bid.face);
  };

  /* ══════════════════════════════════════════════════════════════════════
     ACTIONS
     ════════════════════════════════════════════════════════════════════════ */
  const startGame = () => {
    if (players.length < 2) { onToast("Il faut au moins 2 joueurs"); return; }
    const ord = players.map(p => p.id);
    for (let i = ord.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ord[i], ord[j]] = [ord[j], ord[i]];
    }
    const nCounts: Record<string, number> = {};
    const nDice: Record<string, number[]> = {};
    const nScores: Record<string, number> = {};
    ord.forEach(id => { nCounts[id] = 5; nDice[id] = rollDice(5); nScores[id] = 0; });
    update(dbRef(`games/${roomId}`), {
      dsOrder: ord,
      dsCounts: nCounts,
      dsDice: nDice,
      dsBid: null,
      dsTurn: ord[0],
      dsRoundId: 1,
      dsPhase: "bid",
      dsReveal: null,
      scores: nScores,
    });
  };

  const raise = (byId: string, qty: number, face: number) => {
    const nextId = nextActive(order, counts, byId);
    update(dbRef(`games/${roomId}`), {
      dsBid: { qty, face, by: byId },
      dsTurn: nextId,
    });
  };

  const doRaise = () => {
    if (!myTurn) return;
    if (!isLegal(bidQty, bidFace)) { onToast("Ta mise doit être plus forte"); return; }
    fx("tap");
    raise(playerId, bidQty, bidFace);
  };

  const callBluff = (callerId: string) => {
    if (!bid) return;
    fx("warn");
    let actual = 0;
    order.forEach(id => {
      if ((counts[id] ?? 0) > 0) actual += (dice[id] || []).filter(x => x === bid.face).length;
    });
    const loser = actual >= bid.qty ? callerId : bid.by;
    update(dbRef(`games/${roomId}`), {
      dsPhase: "reveal",
      dsReveal: { face: bid.face, qty: bid.qty, actual, loser, bidder: bid.by, caller: callerId },
    });
  };

  const continueRound = () => {
    if (!reveal) return;
    const newCounts: Record<string, number> = { ...counts };
    newCounts[reveal.loser] = Math.max(0, (newCounts[reveal.loser] ?? 0) - 1);

    const alive = order.filter(id => (newCounts[id] ?? 0) > 0);

    // Points de survie : +1 à chaque rescapé de la manche (classement final).
    const newScores: Record<string, number> = { ...(room.scores || {}) };
    alive.forEach(id => { newScores[id] = (newScores[id] ?? 0) + 1; });

    if (alive.length <= 1) {
      const winnerId = alive[0] ?? reveal.loser;
      if (winnerId) newScores[winnerId] = (newScores[winnerId] ?? 0) + 5; // bonus vainqueur
      update(dbRef(`games/${roomId}`), {
        status: "finished",
        winner: room.players?.[winnerId]?.name ?? "?",
        scores: newScores,
        dsPhase: "over",
      });
      return;
    }

    const newDice: Record<string, number[]> = {};
    alive.forEach(id => { newDice[id] = rollDice(newCounts[id]); });

    const nextTurn = (newCounts[reveal.loser] ?? 0) > 0
      ? reveal.loser
      : nextActive(order, newCounts, reveal.loser);

    update(dbRef(`games/${roomId}`), {
      dsCounts: newCounts,
      dsDice: newDice,
      dsBid: null,
      dsReveal: null,
      dsTurn: nextTurn,
      dsPhase: "bid",
      dsRoundId: roundId + 1,
      scores: newScores,
    });
  };

  /* ── IA solo ── */
  const aiActive = phase === "bid" && !!aiId && turn === aiId && (counts[aiId ?? ""] ?? 0) > 0;
  useSoloAI(aiActive, `${roundId}-${turn}`, () => {
    if (!aiId) return;
    const ownDice = dice[aiId] || [];
    const dec = decideDesMove(
      ownDice,
      bid ? { qty: bid.qty, face: bid.face } : null,
      totalDice,
      room.soloDifficulty,
    );
    if (dec.action === "call" && bid) {
      callBluff(aiId);
      return;
    }
    // Relance : on garantit la légalité (sinon on retombe sur la mise minimale).
    let nb = dec.bid ?? { qty: 1, face: 1 };
    const legal = !bid || nb.qty > bid.qty || (nb.qty === bid.qty && nb.face > bid.face);
    if (!legal) {
      const m = bid ? minRaise(bid, totalDice) : { qty: 1, face: 1 };
      if (!m) { if (bid) callBluff(aiId); return; }
      nb = m;
    }
    raise(aiId, nb.qty, nb.face);
  }, 950);

  /* ══════════════════════════════════════════════════════════════════════
     RENDER — écran de démarrage
     ════════════════════════════════════════════════════════════════════════ */
  if (phase === null || phase === undefined) {
    return (
      <div className="screen game-screen ds-screen" style={{ ["--fx" as string]: "#a855f7", ["--fx2" as string]: "#c084fc" }}>
        <span className="fx-aurora" aria-hidden />
        <Topbar players={players} counts={counts} turn="" onLeave={onLeave} started={false} />
        <div className="ds-start">
          <div className="ds-start-emoji">🎲</div>
          <h1 className="ds-start-title">Bluff des Dés</h1>
          <p className="ds-start-sub">
            Chacun cache 5 dés. À ton tour, <b>relance la mise</b> (« au moins N dés
            montrent la face F, tous joueurs confondus ») ou crie <b>« MENTEUR&nbsp;! »</b>.
            Au défi on révèle&nbsp;: qui a tort perd un dé. Dernier avec des dés = vainqueur.
          </p>
          <div className="ds-rule-pills">
            <span className="ds-rule-pill">🃏 Aucun joker</span>
            <span className="ds-rule-pill">📈 Relance plus forte</span>
            <span className="ds-rule-pill">🎯 5 dés / joueur</span>
          </div>
          {isHost ? (
            <>
              <button className="ds-btn ds-btn-primary" onClick={startGame}>Commencer →</button>
              {players.length < 2 && <div className="ds-hint">Il faut au moins 2 joueurs.</div>}
            </>
          ) : (
            <div className="ds-waiting"><span className="ds-dot" /> En attente de l'hôte…</div>
          )}
        </div>
        <style>{DS_CSS}</style>
      </div>
    );
  }

  /* ── Données de rendu de partie ── */
  const activeIds = order.filter(id => (counts[id] ?? 0) > 0);
  const myDice = dice[playerId] || [];
  const revealing = phase === "reveal" && !!reveal;

  const faceLabel = (f: number) => `${f}`;

  return (
    <div className="screen game-screen ds-screen" style={{ ["--fx" as string]: "#a855f7", ["--fx2" as string]: "#c084fc" }}>
        <span className="fx-aurora" aria-hidden />
      <Topbar players={players} counts={counts} turn={turn} onLeave={onLeave} started />

      {/* Bandeau mise courante — hauteur fixe, pas de reflow */}
      <div className="ds-bid-banner">
        {revealing && reveal ? (
          <div className="ds-bid-line reveal">
            <span className="ds-bid-caller">🚨 {playerName(room, reveal.caller)} crie « Menteur ! »</span>
          </div>
        ) : bid ? (
          <div className="ds-bid-line">
            <span className="ds-bid-label">Mise&nbsp;:</span>
            <span className="ds-bid-qty">{bid.qty}</span>
            <span className="ds-bid-times">×</span>
            <MiniDie face={bid.face} />
            <span className="ds-bid-by">par {playerName(room, bid.by)}</span>
          </div>
        ) : (
          <div className="ds-bid-line empty">Aucune mise — ouvre les enchères&nbsp;!</div>
        )}
      </div>

      {/* Indicateur de tour — hauteur fixe */}
      <div className={`ds-turn ${myTurn ? "mine" : ""}`}>
        {revealing
          ? "🎲 Révélation…"
          : myTurn
            ? "🟢 À toi de miser"
            : aiThinking
              ? `🤖 ${turnPlayer?.name || "L'ordinateur"} réfléchit…`
              : `⏳ Au tour de ${turnPlayer?.name || "…"}`}
      </div>

      {/* Zone adversaires : dés faces cachées + compteur */}
      <div className="ds-opponents">
        {activeIds.filter(id => id !== playerId).map(id => {
          const p = room.players?.[id];
          if (!p) return null;
          const c = counts[id] ?? 0;
          const isTurn = turn === id && phase === "bid";
          return (
            <div key={id} className={`ds-opp ${isTurn ? "active" : ""}`} style={{ "--pc": p.color } as React.CSSProperties}>
              <div className="ds-opp-head">
                <span className="ds-opp-emoji">{p.emoji || "🙂"}</span>
                <span className="ds-opp-name">{p.name}</span>
              </div>
              <div className="ds-opp-dice">
                {revealing
                  ? (dice[id] || []).map((f, i) => (
                      <RevealDie key={i} face={f} highlight={!!reveal && f === reveal.face} delay={i * 90} />
                    ))
                  : Array.from({ length: c }).map((_, i) => <Die key={i} hidden />)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mes dés */}
      <div className="ds-mine">
        <div className="ds-mine-head">
          <span>Tes dés</span>
          <span className="ds-mine-count">{counts[playerId] ?? 0} restant{(counts[playerId] ?? 0) > 1 ? "s" : ""}</span>
        </div>
        <div className="ds-mine-dice">
          {(counts[playerId] ?? 0) === 0 ? (
            <div className="ds-eliminated">💀 Éliminé — tu regardes la fin de la partie</div>
          ) : (
            myDice.map((f, i) => (
              <motion.div
                key={`${roundId}-${i}`}
                initial={{ rotate: -180, scale: 0.3, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 320, damping: 18, delay: i * 0.06 }}
              >
                <Die face={f} highlight={revealing && !!reveal && f === reveal.face} />
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* ── Phase RÉVÉLATION ── */}
      {revealing && reveal && (
        <div className="ds-reveal-box">
          <div className="ds-reveal-count">
            <span className="ds-reveal-big">{reveal.actual}</span>
            <span className="ds-reveal-vs">dé{reveal.actual > 1 ? "s" : ""} montrent</span>
            <MiniDie face={reveal.face} />
          </div>
          <div className="ds-reveal-verdict">
            {reveal.actual >= reveal.qty ? (
              <>Il en fallait <b>{reveal.qty}</b> — la mise était <b className="ok">vraie</b>&nbsp;! {playerName(room, reveal.caller)} s'est trompé.</>
            ) : (
              <>Il en fallait <b>{reveal.qty}</b> — <b className="ko">bluff démasqué</b>&nbsp;! {playerName(room, reveal.bidder)} avait menti.</>
            )}
          </div>
          <div className="ds-loser">
            😵 <b>{playerName(room, reveal.loser)}</b> perd un dé
          </div>
          {isHost ? (
            <button className="ds-btn ds-btn-primary ds-continue" onClick={continueRound}>Continuer →</button>
          ) : (
            <div className="ds-waiting"><span className="ds-dot" /> En attente de l'hôte…</div>
          )}
        </div>
      )}

      {/* ── Constructeur de mise (mon tour) ── */}
      {myTurn && !revealing && (
        <div className="ds-builder">
          <div className="ds-builder-row">
            <div className="ds-stepper">
              <button className="ds-step-btn" onClick={() => setBidQty(q => Math.max(1, q - 1))} aria-label="moins">−</button>
              <div className="ds-step-val">
                <span className="ds-step-num">{bidQty}</span>
                <span className="ds-step-cap">quantité</span>
              </div>
              <button className="ds-step-btn" onClick={() => setBidQty(q => Math.min(totalDice, q + 1))} aria-label="plus">+</button>
            </div>
            <span className="ds-builder-x">×</span>
            <div className="ds-face-pick">
              {[1, 2, 3, 4, 5, 6].map(f => (
                <button
                  key={f}
                  className={`ds-face-btn ${bidFace === f ? "sel" : ""}`}
                  onClick={() => setBidFace(f)}
                  aria-label={`face ${faceLabel(f)}`}
                >
                  <Die face={f} mini />
                </button>
              ))}
            </div>
          </div>
          <div className="ds-builder-actions">
            <button
              className="ds-btn ds-btn-primary"
              onClick={doRaise}
              disabled={!isLegal(bidQty, bidFace)}
            >
              {bid ? "Relancer" : "Miser"}
            </button>
            <button
              className="ds-btn ds-btn-danger"
              onClick={() => callBluff(playerId)}
              disabled={!bid}
              title={bid ? "Contester la mise" : "Aucune mise à contester"}
            >
              MENTEUR&nbsp;!
            </button>
          </div>
          {!isLegal(bidQty, bidFace) && (
            <div className="ds-builder-hint">Ta mise doit être strictement plus forte (plus de dés, ou même quantité avec une face plus haute).</div>
          )}
        </div>
      )}

      {!myTurn && !revealing && (counts[playerId] ?? 0) > 0 && (
        <div className="ds-waiting mid"><span className="ds-dot" /> {turnPlayer?.name || "Un joueur"} réfléchit à sa mise…</div>
      )}

      <style>{DS_CSS}</style>
    </div>
  );
}

/* ── Helpers d'affichage ── */
function playerName(room: Room, id: string): string {
  return room.players?.[id]?.name ?? "?";
}

/* ── Topbar commune (✕ / titre / mini dés restants) ── */
function Topbar({
  players, counts, turn, onLeave, started,
}: {
  players: { id: string; name: string; color: string }[];
  counts: Record<string, number>;
  turn: string;
  onLeave: () => void;
  started: boolean;
}) {
  return (
    <div className="game-topbar">
      <button className="btn-back" onClick={onLeave}>✕</button>
      <div className="turn-indicator">🎲 Bluff des Dés</div>
      <div className="score-mini">
        {started
          ? players.map(p => (
              <span key={p.id} style={{ color: turn === p.id ? p.color : undefined, fontWeight: turn === p.id ? 900 : 700 }}>
                {p.name.slice(0, 4)} {counts[p.id] ?? 0}🎲
              </span>
            ))
          : <span>À vos dés !</span>}
      </div>
    </div>
  );
}

/* ── Dé à points ── */
const PIP_MAP: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Die({ face = 1, hidden, highlight, mini }: { face?: number; hidden?: boolean; highlight?: boolean; mini?: boolean }) {
  if (hidden) {
    return <div className={`ds-die hidden${mini ? " mini" : ""}`}><span className="ds-die-q">?</span></div>;
  }
  const pips = PIP_MAP[face] || [];
  return (
    <div className={`ds-die${highlight ? " hl" : ""}${mini ? " mini" : ""}`}>
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className={`ds-pip${pips.includes(i) ? " on" : ""}`} />
      ))}
    </div>
  );
}

function MiniDie({ face }: { face: number }) {
  return <span className="ds-inline-die"><Die face={face} mini /></span>;
}

function RevealDie({ face, highlight, delay }: { face: number; highlight: boolean; delay: number }) {
  return (
    <motion.div
      initial={{ rotateY: 180, scale: 0.3, opacity: 0 }}
      animate={{ rotateY: 0, scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 16, delay: delay / 1000 }}
    >
      <Die face={face} highlight={highlight} />
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   STYLES (préfixe ds-, thèmes clair + sombre via var())
   ════════════════════════════════════════════════════════════════════════ */
const DS_CSS = `
.ds-screen{display:flex;flex-direction:column;gap:.75rem;padding-bottom:1.6rem;}

/* Écran de démarrage */
.ds-start{max-width:520px;margin:0 auto;width:100%;padding:1.1rem;text-align:center;
  display:flex;flex-direction:column;align-items:center;gap:.75rem;}
.ds-start-emoji{font-size:3.4rem;filter:drop-shadow(0 6px 14px rgba(0,0,0,.18));animation:dsPop .5s ease;}
.ds-start-title{font-family:var(--font-d);font-size:2rem;line-height:1.1;
  background:linear-gradient(90deg,var(--primary),var(--accent));
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
.ds-start-sub{color:var(--muted);font-size:.92rem;font-weight:700;line-height:1.55;max-width:460px;}
.ds-start-sub b{color:var(--text);}
.ds-rule-pills{display:flex;flex-wrap:wrap;gap:.45rem;justify-content:center;}
.ds-rule-pill{font-size:.74rem;font-weight:900;color:var(--accent);
  background:rgba(var(--accent-rgb),.14);border:1px solid var(--border);
  padding:.3rem .65rem;border-radius:999px;}

/* Boutons */
.ds-btn{border:none;border-radius:999px;padding:.85rem 1.9rem;font-size:1.02rem;font-weight:900;
  cursor:pointer;transition:.16s;font-family:var(--font-b);}
.ds-btn:disabled{opacity:.45;cursor:not-allowed;}
.ds-btn-primary{color:#fff;background:linear-gradient(135deg,var(--primary),var(--accent));
  box-shadow:0 10px 28px rgba(var(--accent-rgb),.4);}
.ds-btn-primary:not(:disabled):hover{transform:translateY(-2px);box-shadow:0 14px 36px rgba(var(--accent-rgb),.55);}
.ds-btn-primary:not(:disabled):active{transform:translateY(0);}
.ds-btn-danger{color:#fff;background:linear-gradient(135deg,var(--danger),#ff8a5c);
  box-shadow:0 10px 28px rgba(240,69,94,.35);}
.ds-btn-danger:not(:disabled):hover{transform:translateY(-2px);}
.ds-continue{width:100%;margin-top:.3rem;}

.ds-hint{font-size:.8rem;font-weight:800;color:var(--muted);}
.ds-waiting{display:flex;align-items:center;justify-content:center;gap:.5rem;font-weight:900;
  color:var(--muted);padding:.7rem;font-size:.92rem;}
.ds-waiting.mid{padding:.5rem;}
.ds-dot{width:9px;height:9px;border-radius:50%;background:var(--accent);animation:dsPulse 1.1s infinite;}

/* Bandeau de mise (hauteur fixe) */
.ds-bid-banner{max-width:560px;margin:0 auto;width:calc(100% - 1.4rem);min-height:56px;
  display:flex;align-items:center;justify-content:center;border-radius:var(--radius);
  background:linear-gradient(135deg,rgba(var(--accent-rgb),.16),rgba(var(--accent-rgb),.06));
  border:1px solid var(--border);box-shadow:var(--shadow);padding:.5rem .8rem;}
.ds-bid-line{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;justify-content:center;}
.ds-bid-line.empty{color:var(--muted);font-weight:900;font-size:.95rem;}
.ds-bid-line.reveal{color:var(--danger);}
.ds-bid-label{font-weight:900;color:var(--muted);font-size:.85rem;}
.ds-bid-qty{font-family:var(--font-d);font-size:1.7rem;color:var(--text);line-height:1;}
.ds-bid-times{font-weight:900;color:var(--muted);}
.ds-bid-by{font-size:.82rem;font-weight:800;color:var(--muted);}
.ds-bid-caller{font-family:var(--font-d);font-size:1.15rem;}

/* Indicateur de tour (hauteur fixe) */
.ds-turn{min-height:34px;display:flex;align-items:center;justify-content:center;
  font-weight:900;font-size:.95rem;color:var(--muted);}
.ds-turn.mine{color:var(--green);}

/* Adversaires */
.ds-opponents{max-width:560px;margin:0 auto;width:calc(100% - 1.4rem);
  display:flex;flex-direction:column;gap:.55rem;}
.ds-opp{border:1.5px solid var(--border);border-radius:var(--radius);padding:.55rem .7rem;
  background:var(--surface-1);box-shadow:var(--shadow);transition:.2s;}
.ds-opp.active{border-color:var(--pc,var(--accent));
  box-shadow:0 6px 20px color-mix(in srgb,var(--pc,var(--accent)) 34%,transparent);}
.ds-opp-head{display:flex;align-items:center;gap:.4rem;margin-bottom:.4rem;}
.ds-opp-emoji{font-size:1.1rem;}
.ds-opp-name{font-weight:900;font-size:.88rem;color:var(--text);}
.ds-opp-dice{display:flex;flex-wrap:wrap;gap:.35rem;}

/* Mes dés */
.ds-mine{max-width:560px;margin:0 auto;width:calc(100% - 1.4rem);
  border:1.5px solid var(--accent);border-radius:var(--radius);padding:.6rem .75rem;
  background:linear-gradient(135deg,rgba(var(--accent-rgb),.1),var(--surface-1));box-shadow:var(--shadow-lg);}
.ds-mine-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:.45rem;
  font-weight:900;font-size:.85rem;color:var(--text);}
.ds-mine-count{font-size:.74rem;color:var(--accent);}
.ds-mine-dice{display:flex;flex-wrap:wrap;gap:.45rem;min-height:44px;align-items:center;}
.ds-eliminated{font-weight:900;color:var(--muted);font-size:.9rem;}

/* Dé */
.ds-die{width:44px;height:44px;border-radius:13px;display:grid;
  grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);
  padding:6px;gap:1px;background:linear-gradient(150deg,#ffffff,#e4e8f2);
  border:1px solid rgba(0,0,0,.1);box-shadow:0 6px 13px rgba(0,0,0,.24),inset 0 2px 2px rgba(255,255,255,.95),inset 0 -4px 7px rgba(0,0,0,.12);}
.ds-die.hidden{box-shadow:0 6px 16px color-mix(in srgb,var(--fx,#a855f7) 45%,transparent),inset 0 2px 2px rgba(255,255,255,.3);}
.ds-die.mini{width:28px;height:28px;border-radius:8px;padding:3px;}
.ds-die.hl{background:linear-gradient(150deg,#fff6d6,#ffe08a);
  border-color:var(--gold);box-shadow:0 0 0 2px var(--gold),0 4px 10px rgba(240,171,52,.5);}
.ds-die.hidden{background:linear-gradient(150deg,var(--primary),var(--accent));
  align-items:center;justify-content:center;place-items:center;}
.ds-die.hidden .ds-die-q{grid-column:1/4;grid-row:1/4;display:flex;align-items:center;justify-content:center;
  color:#fff;font-family:var(--font-d);font-size:1.1rem;}
.ds-die.hidden.mini .ds-die-q{font-size:.85rem;}
.ds-pip{border-radius:50%;background:transparent;place-self:center;width:7px;height:7px;}
.ds-die.mini .ds-pip{width:5px;height:5px;}
.ds-pip.on{background:#22252e;box-shadow:inset 0 -1px 1px rgba(255,255,255,.35);}
.ds-die.hl .ds-pip.on{background:#7a4e00;}
.ds-inline-die{display:inline-flex;vertical-align:middle;}

/* Zone révélation */
.ds-reveal-box{max-width:560px;margin:.2rem auto 0;width:calc(100% - 1.4rem);text-align:center;
  border-radius:var(--radius);padding:1rem;border:1.5px solid var(--gold);
  background:linear-gradient(135deg,color-mix(in srgb,var(--gold) 16%,var(--surface-1)),var(--surface-1));
  box-shadow:var(--shadow-lg);animation:dsPop .4s ease;display:flex;flex-direction:column;gap:.55rem;align-items:center;}
.ds-reveal-count{display:flex;align-items:center;justify-content:center;gap:.5rem;}
.ds-reveal-big{font-family:var(--font-d);font-size:2.4rem;color:var(--accent);line-height:1;}
.ds-reveal-vs{font-weight:900;color:var(--muted);font-size:.9rem;}
.ds-reveal-verdict{font-weight:800;color:var(--text);font-size:.92rem;line-height:1.4;}
.ds-reveal-verdict .ok{color:var(--green);}
.ds-reveal-verdict .ko{color:var(--danger);}
.ds-loser{font-family:var(--font-d);font-size:1.1rem;color:var(--text);
  background:var(--surface-2);border-radius:999px;padding:.35rem .9rem;}

/* Constructeur de mise */
.ds-builder{max-width:560px;margin:.1rem auto 0;width:calc(100% - 1.4rem);
  border:1.5px solid var(--border);border-radius:var(--radius);padding:.75rem;
  background:var(--surface-1);box-shadow:var(--shadow-lg);display:flex;flex-direction:column;gap:.7rem;}
.ds-builder-row{display:flex;align-items:center;justify-content:center;gap:.5rem;flex-wrap:wrap;}
.ds-stepper{display:flex;align-items:center;gap:.4rem;background:var(--surface-2);
  border:1px solid var(--border);border-radius:999px;padding:.25rem;}
.ds-step-btn{width:38px;height:38px;border-radius:50%;border:none;cursor:pointer;
  font-size:1.5rem;font-weight:900;line-height:1;color:#fff;
  background:linear-gradient(135deg,var(--primary),var(--accent));box-shadow:var(--shadow);}
.ds-step-btn:active{transform:scale(.92);}
.ds-step-val{display:flex;flex-direction:column;align-items:center;min-width:52px;}
.ds-step-num{font-family:var(--font-d);font-size:1.6rem;line-height:1;color:var(--text);}
.ds-step-cap{font-size:.6rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);}
.ds-builder-x{font-weight:900;color:var(--muted);font-size:1.1rem;}
.ds-face-pick{display:flex;gap:.3rem;flex-wrap:wrap;justify-content:center;}
.ds-face-btn{border:2px solid var(--border);border-radius:10px;padding:.2rem;cursor:pointer;
  background:var(--surface-2);transition:.14s;line-height:0;}
.ds-face-btn:hover{transform:translateY(-2px);}
.ds-face-btn.sel{border-color:var(--accent);background:rgba(var(--accent-rgb),.16);
  box-shadow:0 0 0 2px rgba(var(--accent-rgb),.35);}
.ds-builder-actions{display:flex;gap:.55rem;}
.ds-builder-actions .ds-btn{flex:1;padding:.85rem 1rem;}
.ds-builder-hint{font-size:.76rem;font-weight:800;color:var(--muted);text-align:center;line-height:1.35;}

@keyframes dsPop{from{transform:scale(.7);opacity:0;}to{transform:scale(1);opacity:1;}}
@keyframes dsPulse{0%,100%{transform:scale(1);opacity:1;}50%{transform:scale(1.5);opacity:.4;}}

@media (max-width:380px){
  .ds-start-title{font-size:1.7rem;}
  .ds-die{width:36px;height:36px;}
  .ds-step-btn{width:34px;height:34px;}
}
`;
