import { useEffect, useRef, useState } from "react";
import { dbRef, update } from "../../lib/firebase";
import { fx } from "../../lib/sound";
import { QUIDENOUS_QUESTIONS } from "../../lib/gameData";
import type { Room } from "../../types";

/* ══════════════════════════════════════════════════════════════════════════
   QUI DE NOUS… ? — Jeu de vote party (3–8 joueurs, chacun sur son écran)
   Une question drôle apparaît. Chacun vote en secret pour le joueur qui colle
   le mieux. Quand tout le monde a voté, on révèle le décompte : le plus voté
   remporte la manche (+1). Après X manches, le meilleur score gagne.

   État Firebase (source de vérité unique) — lu depuis room.<champ> :
     qdnPhase       : "vote" | "reveal" | undefined (avant démarrage)
     qdnRound       : number
     qdnTotalRounds : number
     qdnQuestion    : string
     qdnUsed        : number[]  (indices de questions déjà servies)
     qdnVotes       : Record<voterId, targetId>
     scores         : Record<playerId, number>
   ══════════════════════════════════════════════════════════════════════════ */

/* Fallback local pour que le fichier soit auto-suffisant si l'import est vide. */
const FALLBACK_QUESTIONS: string[] = [
  "Qui est le plus susceptible d'oublier son propre anniversaire ?",
  "Qui finirait millionnaire par pur coup de chance ?",
  "Qui parle le plus en dormant ?",
  "Qui est le plus susceptible de rire à un enterrement ?",
  "Qui volerait la dernière part de gâteau sans culpabiliser ?",
  "Qui se perdrait dans sa propre ville ?",
  "Qui deviendrait célèbre sur les réseaux pour une bêtise ?",
  "Qui est le plus susceptible d'envoyer un message à la mauvaise personne ?",
  "Qui pleurerait devant une pub émouvante ?",
  "Qui survivrait le plus longtemps sur une île déserte ?",
  "Qui est le plus susceptible d'arriver en retard à son propre mariage ?",
  "Qui garde le plus de secrets ?",
  "Qui danserait sur une table après deux verres ?",
  "Qui est le plus susceptible de devenir président ?",
  "Qui oublie toujours où il a mis ses clés ?",
];

interface QuiDeNousProps {
  room: Room;
  roomId: string;
  playerId: string;
  isHost: boolean;
  isSolo: boolean;
  onLeave: () => void;
  onToast: (m: string) => void;
}

/* Étend Room localement : l'intégrateur typera ces champs sur Room. */
type RoomQDN = Room & {
  qdnPhase?: "vote" | "reveal";
  qdnRound?: number;
  qdnTotalRounds?: number;
  qdnQuestion?: string;
  qdnUsed?: number[];
  qdnVotes?: Record<string, string>;
};

export function QuiDeNous({ room, roomId, playerId, isHost, isSolo, onLeave, onToast }: QuiDeNousProps) {
  const r = room as RoomQDN;

  /* ── Lectures défensives (jamais de crash sur un champ manquant) ── */
  const players = Object.values(room.players || {});
  const phase = r.qdnPhase;                       // undefined | "vote" | "reveal"
  const round = r.qdnRound ?? 0;
  const totalRounds = r.qdnTotalRounds ?? 8;
  const question = r.qdnQuestion ?? "";
  const used = r.qdnUsed ?? [];
  const votes = r.qdnVotes ?? {};
  const scores = room.scores ?? {};

  /* Pool de questions : import si non-vide, sinon fallback local. */
  const QUESTIONS: string[] =
    Array.isArray(QUIDENOUS_QUESTIONS) && QUIDENOUS_QUESTIONS.length > 0
      ? QUIDENOUS_QUESTIONS
      : FALLBACK_QUESTIONS;

  /* ── État UI transitoire uniquement ── */
  const [chosenRounds, setChosenRounds] = useState(8);
  // Vote optimiste : reflète instantanément la sélection avant le retour Firebase.
  const [pendingVote, setPendingVote] = useState<string | null>(null);
  // Garde anti double-écriture de la transition reveal (par manche).
  const revealWrittenRef = useRef<number>(-1);

  // À chaque nouvelle manche, on efface le vote optimiste.
  useEffect(() => { setPendingVote(null); }, [round]);

  const myVote = votes[playerId] !== undefined ? votes[playerId] : (pendingVote ?? undefined);
  const votedCount = players.filter(p => votes[p.id] !== undefined).length;
  const allVoted = players.length > 0 && players.every(p => votes[p.id] !== undefined);

  /* Choisit un index de question non encore utilisé ; réinitialise si épuisé. */
  const pickQuestion = (usedList: number[]): { idx: number; nextUsed: number[] } => {
    const available = QUESTIONS.map((_, i) => i).filter(i => !usedList.includes(i));
    const pool = available.length > 0 ? available : QUESTIONS.map((_, i) => i);
    const idx = pool[Math.floor(Math.random() * pool.length)] ?? 0;
    const base = available.length > 0 ? usedList : []; // reset si on avait tout consommé
    return { idx, nextUsed: [...base, idx] };
  };

  /* Scores initiaux : tous les joueurs à 0. */
  const initScores = (): Record<string, number> => {
    const s: Record<string, number> = { ...scores };
    players.forEach(p => { if (s[p.id] === undefined) s[p.id] = 0; });
    return s;
  };

  /* ── Décompte des votes pour la manche courante ── */
  const counts: Record<string, number> = {};
  players.forEach(p => { counts[p.id] = 0; });
  Object.values(votes).forEach(t => { if (counts[t] !== undefined) counts[t] += 1; });
  const maxCount = players.reduce((m, p) => Math.max(m, counts[p.id]), 0);
  const winnerIds = players.filter(p => counts[p.id] === maxCount && maxCount > 0).map(p => p.id);
  // Qui a voté pour qui (pour l'affichage fun de la révélation).
  const votersByTarget: Record<string, string[]> = {};
  players.forEach(p => { votersByTarget[p.id] = []; });
  Object.entries(votes).forEach(([voter, target]) => {
    if (votersByTarget[target]) votersByTarget[target].push(voter);
  });

  /* ══════════════════════════════════════════════════════════════════════
     TRANSITION VOTE → REVEAL (hôte uniquement, idempotente)
     On applique les points DANS LE MÊME update() qui pose qdnPhase:"reveal".
     Garde : phase encore "vote" + ref par manche → jamais de double écriture.
     ════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!isHost) return;
    if (phase !== "vote") return;
    if (players.length === 0 || !allVoted) return;
    if (revealWrittenRef.current === round) return; // déjà écrit pour cette manche
    revealWrittenRef.current = round;

    const newScores: Record<string, number> = { ...scores };
    players.forEach(p => { if (newScores[p.id] === undefined) newScores[p.id] = 0; });
    // Égalité au sommet → +1 à chaque joueur ex æquo.
    winnerIds.forEach(id => { newScores[id] = (newScores[id] || 0) + 1; });

    update(dbRef(`games/${roomId}`), { qdnPhase: "reveal", scores: newScores });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase, allVoted, round, players.length]);

  /* ══════════════════════════════════════════════════════════════════════
     ACTIONS
     ════════════════════════════════════════════════════════════════════════ */
  const startGame = () => {
    if (players.length < 3) { onToast("Il faut au moins 3 joueurs"); return; }
    const { idx, nextUsed } = pickQuestion([]);
    revealWrittenRef.current = -1;
    update(dbRef(`games/${roomId}`), {
      qdnPhase: "vote",
      qdnRound: 1,
      qdnTotalRounds: chosenRounds,
      qdnQuestion: QUESTIONS[idx],
      qdnUsed: nextUsed,
      qdnVotes: {},
      scores: initScores(),
    });
  };

  const castVote = (targetId: string) => {
    if (phase !== "vote") return;
    fx("vote");
    setPendingVote(targetId);
    // Idempotent : re-voter écrase simplement le vote précédent.
    update(dbRef(`games/${roomId}`), { [`qdnVotes/${playerId}`]: targetId });
  };

  const nextRound = () => {
    if (round < totalRounds) {
      const { idx, nextUsed } = pickQuestion(used);
      update(dbRef(`games/${roomId}`), {
        qdnPhase: "vote",
        qdnRound: round + 1,
        qdnQuestion: QUESTIONS[idx],
        qdnUsed: nextUsed,
        qdnVotes: {},
      });
    } else {
      const winner = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))[0]?.name || "?";
      update(dbRef(`games/${roomId}`), { status: "finished", winner, scores });
    }
  };

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════════════ */

  /* ── Écran de démarrage (phase indéfinie) ── */
  if (phase === undefined) {
    return (
      <div className="screen game-screen qdn-screen">
        <Topbar players={players} scores={scores} round={round} totalRounds={totalRounds} onLeave={onLeave} started={false} />
        <div className="qdn-start">
          <div className="qdn-start-emoji">🤔</div>
          <h1 className="qdn-start-title">Qui de nous… ?</h1>
          <p className="qdn-start-sub">
            Une question drôle apparaît. Chacun vote en secret pour la personne qui colle le mieux.
            Le plus voté remporte la manche. Voter pour soi-même est autorisé (et bien plus drôle) !
          </p>

          {isHost ? (
            <>
              <div className="qdn-rounds-pick">
                <span className="qdn-rounds-label">Nombre de manches</span>
                <div className="qdn-rounds-btns">
                  {[5, 8, 10].map(n => (
                    <button
                      key={n}
                      className={`qdn-round-chip ${chosenRounds === n ? "sel" : ""}`}
                      onClick={() => setChosenRounds(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <button className="qdn-btn qdn-btn-primary" onClick={startGame}>
                Commencer →
              </button>
              {players.length < 3 && (
                <div className="qdn-hint">Il faut au moins 3 joueurs pour lancer la partie.</div>
              )}
            </>
          ) : (
            <div className="qdn-waiting">
              <span className="qdn-dot-pulse" /> En attente de l'hôte…
            </div>
          )}
          {isSolo && (
            <div className="qdn-hint">Mode solo : invite ta famille (3 joueurs minimum) pour jouer !</div>
          )}
        </div>
        <style>{QDN_CSS}</style>
      </div>
    );
  }

  /* ── Phase VOTE ── */
  if (phase === "vote") {
    return (
      <div className="screen game-screen qdn-screen">
        <Topbar players={players} scores={scores} round={round} totalRounds={totalRounds} onLeave={onLeave} started />

        <div className="qdn-question-card">
          <span className="qdn-q-badge">🗳️ Manche {round}</span>
          <div className="qdn-q-text">{question}</div>
        </div>

        <div className="qdn-vote-hint">
          {myVote ? "Tu peux changer ton vote jusqu'à la fin 👇" : "Vote pour un joueur (même toi 😏)"}
        </div>

        <div className="qdn-vote-grid">
          {players.map(p => {
            const selected = myVote === p.id;
            const isMe = p.id === playerId;
            const col = p.color || "var(--accent)";
            return (
              <button
                key={p.id}
                className={`qdn-vote-card ${selected ? "sel" : ""}`}
                style={selected ? { borderColor: col, boxShadow: `0 0 0 3px ${col}55` } : { borderColor: "var(--border)" }}
                onClick={() => castVote(p.id)}
              >
                <span className="qdn-avatar" style={{ background: col }}>{p.emoji || "🙂"}</span>
                <span className="qdn-vote-name">
                  {p.name}{isMe && <span className="qdn-you">toi</span>}
                </span>
                {selected && <span className="qdn-check" style={{ color: col }}>✓</span>}
              </button>
            );
          })}
        </div>

        <div className="qdn-progress-wrap">
          <div className="qdn-progress-bar">
            <div
              className="qdn-progress-fill"
              style={{ width: `${players.length ? (votedCount / players.length) * 100 : 0}%` }}
            />
          </div>
          <div className="qdn-progress-txt">{votedCount}/{players.length} ont voté</div>
        </div>

        <style>{QDN_CSS}</style>
      </div>
    );
  }

  /* ── Phase REVEAL ── */
  const ordered = [...players].sort((a, b) => counts[b.id] - counts[a.id]);
  const isLast = round >= totalRounds;

  return (
    <div className="screen game-screen qdn-screen">
      <Topbar players={players} scores={scores} round={round} totalRounds={totalRounds} onLeave={onLeave} started />

      <div className="qdn-question-card small">
        <span className="qdn-q-badge">🗳️ Manche {round}</span>
        <div className="qdn-q-text small">{question}</div>
      </div>

      <div className="qdn-reveal">
        {ordered.map((p, i) => {
          const c = counts[p.id];
          const isWinner = winnerIds.includes(p.id);
          const col = p.color || "var(--accent)";
          const pct = maxCount > 0 ? (c / maxCount) * 100 : 0;
          const voters = votersByTarget[p.id] || [];
          return (
            <div
              key={p.id}
              className={`qdn-reveal-row ${isWinner ? "win" : ""}`}
              style={{ animationDelay: `${i * 110}ms` }}
            >
              {isWinner && (
                <div className="qdn-confetti" aria-hidden>
                  {["🎉", "✨", "🎊", "⭐", "💫"].map((e, k) => (
                    <span key={k} className="qdn-confetti-bit" style={{ left: `${12 + k * 19}%`, animationDelay: `${k * 90}ms` }}>{e}</span>
                  ))}
                </div>
              )}
              <div className="qdn-reveal-head">
                <span className="qdn-avatar sm" style={{ background: col }}>{p.emoji || "🙂"}</span>
                <span className="qdn-reveal-name">
                  {isWinner && <span className="qdn-crown">🏆</span>}
                  {p.name}
                </span>
                <span className="qdn-reveal-count" style={{ color: col }}>
                  {c} <span className="qdn-vote-word">{c > 1 ? "votes" : "vote"}</span>
                </span>
              </div>
              <div className="qdn-bar-track">
                <div
                  className="qdn-bar-fill"
                  style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${col}, ${col}bb)`, animationDelay: `${i * 110 + 120}ms` }}
                />
              </div>
              {voters.length > 0 && (
                <div className="qdn-voters">
                  {voters.map(vid => {
                    const vp = room.players?.[vid];
                    if (!vp) return null;
                    return (
                      <span key={vid} className="qdn-voter" style={{ borderColor: (vp.color || "var(--accent)") + "88" }}>
                        {vp.emoji || "🙂"} {vp.name}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isHost || isSolo ? (
        <div className="qdn-actions">
          <button className="qdn-btn qdn-btn-primary" onClick={nextRound}>
            {isLast ? "🏆 Voir le classement" : "Manche suivante →"}
          </button>
        </div>
      ) : (
        <div className="qdn-waiting">
          <span className="qdn-dot-pulse" /> En attente de l'hôte…
        </div>
      )}

      <style>{QDN_CSS}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Topbar — même structure que les autres jeux (✕ / centre / mini-scores)
   ════════════════════════════════════════════════════════════════════════ */
function Topbar({
  players, scores, round, totalRounds, onLeave, started,
}: {
  players: { id: string; name: string; color: string }[];
  scores: Record<string, number>;
  round: number;
  totalRounds: number;
  onLeave: () => void;
  started: boolean;
}) {
  return (
    <div className="game-topbar">
      <button className="btn-back" onClick={onLeave}>✕</button>
      <div className="turn-indicator">
        {started ? `🤔 Manche ${round}/${totalRounds}` : "🤔 Qui de nous… ?"}
      </div>
      <div className="score-mini">
        {players.map(p => (
          <span key={p.id} style={{ color: p.color || "#333" }}>
            {p.name.slice(0, 4)} {scores[p.id] || 0}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   STYLES (scopés, préfixe qdn-, thèmes clair + sombre via var() + fallbacks)
   ════════════════════════════════════════════════════════════════════════ */
const QDN_CSS = `
.qdn-screen{display:flex;flex-direction:column;gap:.9rem;padding-bottom:1.4rem;}

/* ── Écran de démarrage ── */
.qdn-start{max-width:520px;margin:0 auto;width:100%;padding:1.2rem 1.1rem;text-align:center;
  display:flex;flex-direction:column;align-items:center;gap:.7rem;}
.qdn-start-emoji{font-size:3.4rem;filter:drop-shadow(0 6px 14px rgba(0,0,0,.15));animation:qdnPop .5s ease;}
.qdn-start-title{font-family:var(--font-d);font-size:2rem;line-height:1.1;
  background:linear-gradient(90deg,var(--primary),var(--accent));
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
.qdn-start-sub{color:var(--muted);font-size:.92rem;font-weight:700;line-height:1.55;max-width:440px;}

.qdn-rounds-pick{display:flex;flex-direction:column;gap:.45rem;align-items:center;margin-top:.3rem;}
.qdn-rounds-label{font-size:.72rem;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);}
.qdn-rounds-btns{display:flex;gap:.5rem;}
.qdn-round-chip{width:52px;height:52px;border-radius:50%;border:2px solid var(--border);
  background:var(--surface-1,var(--card));color:var(--text);font-family:var(--font-d);font-size:1.2rem;
  cursor:pointer;transition:.18s;box-shadow:var(--shadow);}
.qdn-round-chip:hover{transform:translateY(-2px);}
.qdn-round-chip.sel{border-color:var(--primary);color:#fff;
  background:linear-gradient(135deg,var(--primary),var(--accent));box-shadow:var(--shadow-lg);}

/* ── Boutons ── */
.qdn-btn{border:none;border-radius:999px;padding:.9rem 2rem;font-size:1.05rem;font-weight:900;
  cursor:pointer;transition:.18s;font-family:var(--font-b);}
.qdn-btn-primary{color:#fff;background:linear-gradient(135deg,var(--primary),var(--accent));
  box-shadow:0 10px 30px rgba(var(--accent-rgb,124,92,191),.4);}
.qdn-btn-primary:hover{transform:translateY(-2px);box-shadow:0 14px 40px rgba(var(--accent-rgb,124,92,191),.55);}
.qdn-btn-primary:active{transform:translateY(0);}

.qdn-hint{font-size:.8rem;font-weight:800;color:var(--muted);margin-top:.2rem;}
.qdn-waiting{display:flex;align-items:center;justify-content:center;gap:.55rem;font-weight:900;
  color:var(--muted);padding:1rem;font-size:.95rem;}
.qdn-dot-pulse{width:10px;height:10px;border-radius:50%;background:var(--primary);animation:qdnPulse 1s infinite;}

/* ── Carte question ── */
.qdn-question-card{position:relative;max-width:560px;margin:0 auto;width:calc(100% - 1.6rem);
  border-radius:var(--radius);padding:1.4rem 1.2rem;text-align:center;
  background:linear-gradient(135deg,rgba(var(--accent-rgb,124,92,191),.14),rgba(255,107,157,.12));
  border:1px solid var(--border);box-shadow:var(--shadow);animation:qdnPop .4s ease;}
.qdn-question-card.small{padding:.9rem 1rem;}
.qdn-q-badge{display:inline-block;font-size:.68rem;font-weight:900;text-transform:uppercase;letter-spacing:.1em;
  color:var(--accent);background:var(--surface-2,rgba(255,255,255,.6));padding:.28rem .7rem;border-radius:999px;margin-bottom:.6rem;}
.qdn-q-text{font-family:var(--font-d);font-size:1.35rem;line-height:1.3;color:var(--text);}
.qdn-q-text.small{font-size:1rem;}

.qdn-vote-hint{text-align:center;font-size:.85rem;font-weight:800;color:var(--muted);}

/* ── Grille de vote ── */
.qdn-vote-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.7rem;
  max-width:560px;margin:0 auto;width:calc(100% - 1.6rem);}
.qdn-vote-card{position:relative;display:flex;align-items:center;gap:.7rem;text-align:left;
  border:2px solid var(--border);border-radius:var(--radius);padding:.75rem .8rem;cursor:pointer;
  background:var(--surface-1,var(--card));box-shadow:var(--shadow);transition:.15s;font-family:var(--font-b);}
.qdn-vote-card:hover{transform:translateY(-2px);box-shadow:var(--shadow-lg);}
.qdn-vote-card:active{transform:translateY(0);}
.qdn-vote-card.sel{transform:translateY(-2px);}
.qdn-avatar{flex:0 0 auto;width:42px;height:42px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-size:1.3rem;box-shadow:inset 0 -2px 6px rgba(0,0,0,.18);}
.qdn-avatar.sm{width:34px;height:34px;font-size:1.05rem;}
.qdn-vote-name{font-weight:900;font-size:.95rem;color:var(--text);line-height:1.15;
  overflow:hidden;text-overflow:ellipsis;}
.qdn-you{display:inline-block;margin-left:.35rem;font-size:.6rem;font-weight:900;text-transform:uppercase;
  letter-spacing:.06em;color:var(--accent);background:rgba(var(--accent-rgb,124,92,191),.15);
  padding:.1rem .35rem;border-radius:999px;vertical-align:middle;}
.qdn-check{position:absolute;top:.4rem;right:.55rem;font-size:1.1rem;font-weight:900;animation:qdnPop .25s ease;}

/* ── Progression votes ── */
.qdn-progress-wrap{max-width:560px;margin:.2rem auto 0;width:calc(100% - 1.6rem);text-align:center;}
.qdn-progress-bar{height:10px;border-radius:999px;overflow:hidden;background:var(--surface-3,rgba(0,0,0,.08));}
.qdn-progress-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--primary),var(--accent));
  transition:width .4s ease;}
.qdn-progress-txt{margin-top:.35rem;font-size:.82rem;font-weight:900;color:var(--muted);}

/* ── Révélation ── */
.qdn-reveal{max-width:560px;margin:0 auto;width:calc(100% - 1.6rem);display:flex;flex-direction:column;gap:.7rem;}
.qdn-reveal-row{position:relative;border-radius:var(--radius);padding:.7rem .8rem;
  background:var(--surface-1,var(--card));border:1px solid var(--border);box-shadow:var(--shadow);
  opacity:0;animation:qdnRise .5s ease forwards;overflow:hidden;}
.qdn-reveal-row.win{border-color:var(--gold);box-shadow:0 0 0 2px var(--gold),var(--shadow-lg);
  background:linear-gradient(135deg,rgba(255,190,66,.16),var(--surface-1,var(--card)));}
.qdn-reveal-head{display:flex;align-items:center;gap:.55rem;margin-bottom:.45rem;}
.qdn-reveal-name{flex:1;font-weight:900;font-size:.98rem;color:var(--text);display:flex;align-items:center;gap:.3rem;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.qdn-crown{font-size:1.05rem;animation:qdnPop .4s ease;}
.qdn-reveal-count{font-family:var(--font-d);font-size:1.15rem;white-space:nowrap;}
.qdn-vote-word{font-family:var(--font-b);font-size:.65rem;font-weight:800;color:var(--muted);}
.qdn-bar-track{height:12px;border-radius:999px;background:var(--surface-3,rgba(0,0,0,.08));overflow:hidden;}
.qdn-bar-fill{height:100%;width:0;border-radius:999px;animation:qdnGrow .7s cubic-bezier(.22,1,.36,1) forwards;}
.qdn-voters{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.5rem;}
.qdn-voter{font-size:.7rem;font-weight:800;color:var(--text);background:var(--surface-2,rgba(255,255,255,.55));
  border:1px solid var(--border);padding:.16rem .5rem;border-radius:999px;}

/* Confetti CSS pur sur le/les gagnant(s) */
.qdn-confetti{position:absolute;inset:0;pointer-events:none;overflow:hidden;}
.qdn-confetti-bit{position:absolute;top:-14px;font-size:.9rem;opacity:0;animation:qdnFall 1.4s ease-in forwards;}

.qdn-actions{max-width:560px;margin:.3rem auto 0;width:calc(100% - 1.6rem);display:flex;justify-content:center;}
.qdn-actions .qdn-btn{width:100%;}

/* ── Animations ── */
@keyframes qdnPop{from{transform:scale(.7);opacity:0;}to{transform:scale(1);opacity:1;}}
@keyframes qdnRise{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
@keyframes qdnGrow{from{width:0;}}
@keyframes qdnPulse{0%,100%{transform:scale(1);opacity:1;}50%{transform:scale(1.5);opacity:.4;}}
@keyframes qdnFall{0%{opacity:0;transform:translateY(0) rotate(0);}
  15%{opacity:1;}100%{opacity:0;transform:translateY(90px) rotate(220deg);}}

@media (max-width:400px){
  .qdn-vote-grid{grid-template-columns:1fr;}
  .qdn-q-text{font-size:1.15rem;}
  .qdn-start-title{font-size:1.7rem;}
}
`;
