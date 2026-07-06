import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { dbRef, update } from "../../lib/firebase";
import { fx } from "../../lib/sound";
import { useSoloAI } from "../../hooks/useSoloAI";
import type { Room, Difficulty } from "../../types";

interface Props { room: Room; roomId: string; playerId: string; isHost: boolean; isSolo: boolean; onLeave: () => void; onToast: (m: string) => void; }

const PAIRS = 8;
const POOL = ["🦊", "🐼", "🐸", "🦁", "🐰", "🐨", "🐧", "🐢", "🐝", "🦄", "🍎", "🍓", "🍕", "🚀", "⭐", "🌈", "🎈", "⚽"];
const shuffle = <T,>(a: T[], rnd = Math.random): T[] => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

export function Memory({ room, roomId, playerId, isHost, isSolo, onLeave, onToast }: Props) {
  const players = Object.values(room.players || {});
  const cards = room.mmCards ?? null;
  const matched = room.mmMatched ?? [];
  const up = room.mmUp ?? [];
  const order = room.mmOrder ?? [];
  const turn = room.mmTurn ?? 0;
  const pairsBy = room.mmPairs ?? {};
  const scores = room.scores ?? {};
  const cur = order[turn] || "";
  const isMyTurn = cur === playerId;
  const aiId = room.aiId;
  const diff: Difficulty = (room.soloDifficulty as Difficulty) || "moyen";
  const nameOf = (id: string) => (id === aiId ? "🤖 Ordi" : (room.players || {})[id]?.name || "Joueur");
  const evalRef = useRef<string>("");

  /* Hôte : distribue les cartes au démarrage. */
  useEffect(() => {
    if (!isHost || cards) return;
    const chosen = shuffle(POOL).slice(0, PAIRS);
    const deck = shuffle([...chosen, ...chosen]);
    const ord = shuffle(players.map(p => p.id));
    update(dbRef(`games/${roomId}`), { mmCards: deck, mmMatched: [], mmUp: [], mmTurn: 0, mmOrder: ord, mmPairs: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, cards]);

  const over = !!cards && matched.length >= (cards?.length || 0) && cards.length > 0;

  /* Retourner une carte (joueur courant seulement). */
  const flip = (i: number) => {
    if (!cards || over || !isMyTurn) return;
    if (matched.includes(i) || up.includes(i) || up.length >= 2) return;
    fx("tap");
    update(dbRef(`games/${roomId}`), { mmUp: [...up, i] });
  };

  /* Hôte : évalue la paire quand 2 cartes sont retournées (source unique). */
  useEffect(() => {
    if (!isHost || !cards || up.length !== 2) return;
    const sig = up.join(",");
    if (evalRef.current === sig) return;
    evalRef.current = sig;
    const [a, b] = up;
    const match = cards[a] === cards[b];
    const id = setTimeout(() => {
      if (match) {
        const nextMatched = [...matched, a, b];
        const done = nextMatched.length >= cards.length;
        const upd: Record<string, unknown> = {
          mmMatched: nextMatched, mmUp: [],
          [`mmPairs/${cur}`]: (pairsBy[cur] || 0) + 1,
          [`scores/${cur}`]: (scores[cur] || 0) + 1,
        };
        if (done) {
          const winnerId = [...order].sort((x, y) => ((y === cur ? (pairsBy[y] || 0) + 1 : pairsBy[y] || 0)) - ((x === cur ? (pairsBy[x] || 0) + 1 : pairsBy[x] || 0)))[0];
          upd.status = "finished"; upd.winner = nameOf(winnerId);
        }
        update(dbRef(`games/${roomId}`), upd);
      } else {
        update(dbRef(`games/${roomId}`), { mmUp: [], mmTurn: (turn + 1) % order.length });
      }
    }, match ? 650 : 1100);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [up, isHost, cards]);

  /* IA (solo) : mémorise avec une probabilité selon la difficulté. */
  const aiActive = !!aiId && !!cards && !over && cur === aiId && isHost && up.length < 2;
  const memChance = diff === "difficile" ? 0.85 : diff === "facile" ? 0.35 : 0.6;
  useSoloAI(aiActive, `${turn}-${matched.length}-${up.length}`, () => {
    if (!cards) return;
    const free = cards.map((_, i) => i).filter(i => !matched.includes(i) && !up.includes(i));
    if (free.length === 0) return;
    let pick: number;
    if (up.length === 1) {
      const em = cards[up[0]];
      const twin = free.find(i => cards[i] === em);
      pick = twin != null && Math.random() < memChance ? twin : free[Math.floor(Math.random() * free.length)];
    } else {
      pick = free[Math.floor(Math.random() * free.length)];
    }
    update(dbRef(`games/${roomId}`), { mmUp: [...up, pick] });
  }, 800);

  if (!cards) {
    return (
      <div className="screen game-screen mem-screen" style={{ ["--fx" as string]: "#8b5cf6", ["--fx2" as string]: "#a78bfa" }}>
        <span className="fx-aurora" aria-hidden />
        <div className="game-topbar"><button className="btn-back" onClick={onLeave}>✕</button><div className="turn-indicator">🃏 Memory des Paires</div><div /></div>
        <div className="quiz-loading"><div className="quiz-spinner" /><div>Distribution…</div></div>
        <style>{MEM_CSS}</style>
      </div>
    );
  }

  return (
    <div className="screen game-screen mem-screen" style={{ ["--fx" as string]: "#8b5cf6", ["--fx2" as string]: "#a78bfa" }}>
      <span className="fx-aurora" aria-hidden />
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className="turn-indicator" style={{ background: isMyTurn && !over ? "rgba(139,92,246,.18)" : "rgba(0,0,0,.05)" }}>
          {over ? `🏆 ${room.winner || "Terminé"}` : isMyTurn ? "🟢 À toi de jouer !" : `⏳ ${nameOf(cur)}`}
        </div>
        <div />
      </div>

      {/* Scores */}
      <div className="mem-scores">
        {order.map(id => (
          <div key={id} className={`mem-pl ${id === cur && !over ? "cur" : ""}`}>
            <span className="mem-pl-name">{nameOf(id).slice(0, 8)}</span>
            <span className="mem-pl-pairs">{pairsBy[id] || 0} 🃏</span>
          </div>
        ))}
      </div>

      {/* Grille */}
      <div className="mem-grid">
        {cards.map((emoji, i) => {
          const isUp = up.includes(i) || matched.includes(i);
          const isMatched = matched.includes(i);
          return (
            <button key={i} className={`mem-card ${isUp ? "up" : ""} ${isMatched ? "done" : ""}`}
              onClick={() => flip(i)} disabled={!isMyTurn || isUp || up.length >= 2 || over}>
              <motion.span className="mem-inner" animate={{ rotateY: isUp ? 180 : 0 }} transition={{ duration: 0.35 }}>
                <span className="mem-back">?</span>
                <span className="mem-front">{emoji}</span>
              </motion.span>
            </button>
          );
        })}
      </div>

      {!isMyTurn && !over && <div className="mem-hint">👀 Observe bien les cartes retournées…</div>}
      {isMyTurn && !over && up.length < 2 && <div className="mem-hint">Retourne 2 cartes — une paire = tu rejoues !</div>}

      <style>{MEM_CSS}</style>
    </div>
  );
}

const MEM_CSS = `
.mem-screen{max-width:520px;margin:0 auto;position:relative;}
.mem-scores{display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap;margin:.5rem 0;}
.mem-pl{display:flex;flex-direction:column;align-items:center;gap:.05rem;padding:.35rem .7rem;border-radius:12px;background:var(--surface-1);border:1.5px solid var(--border);}
.mem-pl.cur{border-color:color-mix(in srgb,var(--fx) 60%,transparent);box-shadow:0 0 0 2px color-mix(in srgb,var(--fx) 40%,transparent);}
.mem-pl-name{font-size:.76rem;font-weight:900;color:var(--text);}
.mem-pl-pairs{font-family:var(--font-d);font-size:.82rem;color:var(--fx);}

.mem-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.55rem;max-width:400px;margin:.4rem auto;padding:0 .3rem;}
.mem-card{aspect-ratio:1;border:none;background:transparent;padding:0;cursor:pointer;perspective:600px;}
.mem-card:disabled{cursor:default;}
.mem-inner{position:relative;width:100%;height:100%;display:block;transform-style:preserve-3d;}
.mem-back,.mem-front{position:absolute;inset:0;display:grid;place-items:center;border-radius:15px;backface-visibility:hidden;}
.mem-back{background:linear-gradient(150deg,var(--fx),var(--fx2));color:rgba(255,255,255,.8);font-family:var(--font-d);font-size:1.8rem;
  box-shadow:0 6px 16px color-mix(in srgb,var(--fx) 40%,transparent),inset 0 2px 0 rgba(255,255,255,.3),inset 0 -4px 8px rgba(0,0,0,.18);}
.mem-front{background:linear-gradient(150deg,#ffffff,#eef);transform:rotateY(180deg);font-size:2rem;
  box-shadow:0 6px 16px rgba(0,0,0,.18),inset 0 2px 0 rgba(255,255,255,.9);}
.mem-card.done .mem-front{background:linear-gradient(150deg, color-mix(in srgb,var(--green) 25%,#fff), #fff);box-shadow:0 0 0 2px var(--green),0 4px 12px color-mix(in srgb,var(--green) 30%,transparent);}
.mem-card.done{animation:memPop .4s ease;}
@keyframes memPop{0%{transform:scale(1)}45%{transform:scale(1.09)}100%{transform:scale(1)}}
.mem-hint{text-align:center;font-size:.82rem;font-weight:800;color:var(--muted);margin-top:.5rem;}
`;
