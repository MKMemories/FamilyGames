import { useEffect, useState } from "react";
import { dbRef, update } from "../../lib/firebase";
import type { Room } from "../../types";
import { IMPOSTEUR_WORDS } from "../../lib/gameData";

/* ════════════════════════════════════════════════════════════════════════
   L'IMPOSTEUR — jeu de mots social (Undercover)
   3–8 joueurs, chacun sur son téléphone. Tout le monde reçoit le MÊME mot,
   sauf un imposteur tiré au sort qui reçoit un mot DIFFÉRENT mais proche.
   Chacun donne un indice d'un mot à l'oral, puis vote sur son écran.

   Toute la logique de partie vit dans `room` (Firebase = source de vérité).
   Les seuls états React locaux sont transitoires (hold-to-reveal, confirm).
   Champs Firebase utilisés :
     impPhase       "reveal" | "vote" | "result" (undefined avant la 1re partie)
     impRound       number
     impImposterId  string  (playerId de l'imposteur)
     impWordCivil   string
     impWordImposter string
     impSeen        Record<playerId, boolean>
     impVotes       Record<voterId, targetId>
     room.scores    Record<playerId, number>
   ════════════════════════════════════════════════════════════════════════ */

/* Filet de sécurité : le jeu reste autonome si IMPOSTEUR_WORDS est vide. */
const FALLBACK_WORDS: { civil: string; imposter: string }[] = [
  { civil: "Chat", imposter: "Chien" },
  { civil: "Café", imposter: "Thé" },
  { civil: "Plage", imposter: "Désert" },
  { civil: "Pizza", imposter: "Tarte" },
  { civil: "Guitare", imposter: "Violon" },
  { civil: "Avion", imposter: "Fusée" },
  { civil: "Neige", imposter: "Pluie" },
  { civil: "Roi", imposter: "Reine" },
  { civil: "Vélo", imposter: "Moto" },
  { civil: "Lune", imposter: "Soleil" },
  { civil: "Docteur", imposter: "Infirmier" },
  { civil: "Montagne", imposter: "Colline" },
];

const WORDS: { civil: string; imposter: string }[] =
  Array.isArray(IMPOSTEUR_WORDS) && IMPOSTEUR_WORDS.length > 0 ? IMPOSTEUR_WORDS : FALLBACK_WORDS;

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

interface ImposteurProps {
  room: Room;
  roomId: string;
  playerId: string;
  isHost: boolean;
  isSolo: boolean;
  onLeave: () => void;
  onToast: (m: string) => void;
}

export function Imposteur({ room, roomId, playerId, isHost, isSolo, onLeave, onToast }: ImposteurProps) {
  /* ── Derived state (always from room, never cached) ── */
  const players = Object.values(room.players || {});
  const phase = room.impPhase as "reveal" | "vote" | "result" | undefined;
  const round = room.impRound || 1;
  const imposterId = room.impImposterId || "";
  const wordCivil = room.impWordCivil || "";
  const wordImposter = room.impWordImposter || "";
  const seen = room.impSeen || {};
  const votes = room.impVotes || {};
  const scores = room.scores || {};

  const isImposter = playerId === imposterId;
  const myWord = isImposter ? wordImposter : wordCivil;

  const seenCount = players.filter(p => seen[p.id]).length;
  const votedCount = players.filter(p => votes[p.id]).length;
  const allSeen = players.length > 0 && seenCount === players.length;
  const allVoted = players.length > 0 && votedCount === players.length;

  /* ── Transient UI state ── */
  const [peeking, setPeeking] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const gamePath = `games/${roomId}`;

  /* ═══════════════════════ ACTIONS (host-driven, idempotent) ═══════════════════════ */

  const startGame = () => {
    if (players.length < 3) return;
    const imposter = pick(players);
    const pair = pick(WORDS);
    const nextScores = { ...scores };
    players.forEach(p => { if (nextScores[p.id] === undefined) nextScores[p.id] = 0; });
    update(dbRef(gamePath), {
      impPhase: "reveal",
      impRound: 1,
      impImposterId: imposter.id,
      impWordCivil: pair.civil,
      impWordImposter: pair.imposter,
      impSeen: {},
      impVotes: {},
      scores: nextScores,
    });
  };

  /* Marque le mot comme vu (première révélation seulement). */
  const markSeen = () => {
    if (seen[playerId]) return;
    update(dbRef(gamePath), { impSeen: { ...seen, [playerId]: true } });
  };

  const goToVote = () => {
    if (phase !== "reveal") return;
    update(dbRef(gamePath), { impPhase: "vote", impVotes: {} });
  };

  const castVote = (targetId: string) => {
    if (phase !== "vote") return;
    if (targetId === playerId) return; // pas de vote pour soi-même
    if (votes[playerId] === targetId) return; // pas de doublon inutile
    update(dbRef(gamePath), { impVotes: { ...votes, [playerId]: targetId } });
  };

  /* Calcule le tally + désigne le plus voté (null si égalité). */
  const computeResult = (v: Record<string, string>) => {
    const tally: Record<string, number> = {};
    Object.values(v).forEach(tid => { if (tid) tally[tid] = (tally[tid] || 0) + 1; });
    let max = 0;
    let leaders: string[] = [];
    Object.entries(tally).forEach(([tid, c]) => {
      if (c > max) { max = c; leaders = [tid]; }
      else if (c === max) { leaders.push(tid); }
    });
    const mostVoted = leaders.length === 1 ? leaders[0] : null; // égalité → personne
    const civiliansWin = mostVoted !== null && mostVoted === imposterId;
    return { tally, mostVoted, civiliansWin };
  };

  /* Transition vote → result : on calcule ET on attribue les points d'un seul
     write, ce qui garantit l'idempotence (les points ne sont jamais doublés). */
  const reveal = () => {
    if (phase !== "vote") return;
    const { civiliansWin } = computeResult(votes);
    const nextScores = { ...scores };
    players.forEach(p => { if (nextScores[p.id] === undefined) nextScores[p.id] = 0; });
    if (civiliansWin) {
      // Les civils démasquent l'imposteur : +1 à chaque non-imposteur.
      players.forEach(p => { if (p.id !== imposterId) nextScores[p.id] = (nextScores[p.id] || 0) + 1; });
    } else if (imposterId) {
      // L'imposteur survit (ou égalité) : +2 à l'imposteur.
      nextScores[imposterId] = (nextScores[imposterId] || 0) + 2;
    }
    update(dbRef(gamePath), { impPhase: "result", scores: nextScores });
  };

  const nextRound = () => {
    const imposter = pick(players);
    const pair = pick(WORDS);
    update(dbRef(gamePath), {
      impPhase: "reveal",
      impRound: round + 1,
      impImposterId: imposter.id,
      impWordCivil: pair.civil,
      impWordImposter: pair.imposter,
      impSeen: {},
      impVotes: {},
    });
  };

  const finish = () => {
    const sorted = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
    const winner = sorted[0]?.name || "?";
    update(dbRef(gamePath), { status: "finished", winner, scores });
  };

  /* Auto-avance : quand tout le monde a voté, l'hôte passe au résultat. */
  useEffect(() => {
    if (phase === "vote" && allVoted && isHost) reveal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, allVoted, isHost]);

  /* ═══════════════════════ TOP BAR ═══════════════════════ */
  const phaseLabel =
    phase === "reveal" ? "Ton mot secret" :
    phase === "vote" ? "Qui est l'imposteur ?" :
    phase === "result" ? "Révélation" : "L'Imposteur";

  const topbar = (
    <div className="game-topbar">
      <button className="btn-back" onClick={onLeave}>✕</button>
      <div className="turn-indicator">
        🕵️ {phase ? `Manche ${round} — ${phaseLabel}` : "L'Imposteur"}
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

  /* ═══════════════════════ START (phase undefined) ═══════════════════════ */
  if (!phase) {
    const enough = players.length >= 3;
    return (
      <div className="screen game-screen imp-screen">
        {topbar}
        <div className="imp-wrap">
          <div className="imp-card imp-intro">
            <div className="imp-badge">🕵️ Jeu social</div>
            <h1 className="imp-title">L'Imposteur</h1>
            <p className="imp-lore">
              Tout le monde reçoit le <b>même mot secret</b>… sauf un <em>imposteur</em> qui en
              reçoit un autre, très proche. À tour de rôle, donnez <b>un seul mot</b> comme indice.
              Puis votez pour démasquer l'intrus !
            </p>
            <ul className="imp-steps">
              <li><span>1</span> Chacun découvre son mot sur son écran</li>
              <li><span>2</span> Un indice d'un mot, à l'oral, chacun son tour</li>
              <li><span>3</span> Tout le monde vote pour l'imposteur</li>
            </ul>
            <div className="imp-players-row">
              {players.map(p => (
                <div key={p.id} className="imp-avatar" style={{ background: p.color || "var(--primary)" }} title={p.name}>
                  {p.emoji || "🙂"}
                </div>
              ))}
            </div>
            {isHost ? (
              enough ? (
                <button className="imp-btn imp-btn-primary" onClick={startGame}>🎬 Démarrer la partie</button>
              ) : (
                <div className="imp-hint imp-warn">Il faut au moins 3 joueurs ({players.length}/3)</div>
              )
            ) : (
              <div className="imp-hint">⏳ En attente de l'hôte…</div>
            )}
          </div>
        </div>
        <style>{IMP_CSS}</style>
      </div>
    );
  }

  /* ═══════════════════════ REVEAL ═══════════════════════ */
  if (phase === "reveal") {
    const iSaw = !!seen[playerId];
    return (
      <div className="screen game-screen imp-screen">
        {topbar}
        <div className="imp-wrap">
          <p className="imp-instruct">
            Appuie et <b>maintiens</b> pour révéler ton mot. Garde-le secret !
          </p>

          {/* Carte secrète : le mot reste flouté tant qu'on n'appuie pas. */}
          <div
            className={`imp-secret ${peeking ? "revealed" : ""}`}
            style={{ borderColor: (room.players?.[playerId]?.color) || "var(--primary)" }}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); setPeeking(true); markSeen(); }}
            onPointerUp={() => setPeeking(false)}
            onPointerLeave={() => setPeeking(false)}
            onPointerCancel={() => setPeeking(false)}
            onContextMenu={(e) => e.preventDefault()}
          >
            {peeking ? (
              <>
                <div className="imp-secret-label">Ton mot</div>
                <div className="imp-word">{myWord || "…"}</div>
                <div className="imp-secret-foot">Donne un indice sans le dire !</div>
              </>
            ) : (
              <>
                <div className="imp-lock">🔒</div>
                <div className="imp-secret-hidden">{iSaw ? "Mot vu — maintiens pour revoir" : "Maintiens pour révéler"}</div>
              </>
            )}
          </div>

          <div className="imp-seen-count">
            {seenCount}/{players.length} ont vu leur mot
          </div>

          <div className="imp-reminder">
            💬 Discutez à voix haute. Chacun son tour, donnez <b>un seul mot</b> qui décrit le vôtre —
            ni trop évident, ni trop vague.
          </div>

          {isHost && (
            <button
              className={`imp-btn imp-btn-primary ${!allSeen ? "imp-btn-soft" : ""}`}
              onClick={goToVote}
            >
              {allSeen ? "Tout le monde a vu → Passer au vote" : `Passer au vote (${seenCount}/${players.length})`}
            </button>
          )}
          {!isHost && (
            <div className="imp-hint">{allSeen ? "⏳ L'hôte va lancer le vote…" : "⏳ En attente des autres joueurs…"}</div>
          )}
        </div>
        <style>{IMP_CSS}</style>
      </div>
    );
  }

  /* ═══════════════════════ VOTE ═══════════════════════ */
  if (phase === "vote") {
    const myVote = votes[playerId];
    return (
      <div className="screen game-screen imp-screen">
        {topbar}
        <div className="imp-wrap">
          <p className="imp-instruct">Qui est l'imposteur ? Touche un joueur pour voter.</p>

          <div className="imp-vote-grid">
            {players.map(p => {
              const isMe = p.id === playerId;
              const selected = myVote === p.id;
              const nbVotesFor = players.filter(v => votes[v.id] === p.id).length;
              return (
                <button
                  key={p.id}
                  className={`imp-vote-card ${selected ? "selected" : ""} ${isMe ? "self" : ""}`}
                  style={selected ? { borderColor: p.color || "var(--primary)", boxShadow: `0 0 0 3px ${p.color || "var(--primary)"}55` } : undefined}
                  onClick={() => castVote(p.id)}
                  disabled={isMe}
                >
                  <div className="imp-avatar" style={{ background: p.color || "var(--primary)" }}>{p.emoji || "🙂"}</div>
                  <div className="imp-vote-name">{p.name}{isMe ? " (toi)" : ""}</div>
                  {selected && <div className="imp-vote-check">✓ ton vote</div>}
                  {nbVotesFor > 0 && <div className="imp-vote-count">{nbVotesFor} vote{nbVotesFor > 1 ? "s" : ""}</div>}
                </button>
              );
            })}
          </div>

          <div className="imp-seen-count">{votedCount}/{players.length} ont voté</div>

          {myVote
            ? <div className="imp-hint">Tu peux changer ton vote tant que tout le monde n'a pas voté.</div>
            : <div className="imp-hint imp-warn">Tu n'as pas encore voté.</div>}

          {isHost && (
            <button
              className={`imp-btn imp-btn-primary ${!allVoted ? "imp-btn-soft" : ""}`}
              onClick={reveal}
            >
              {allVoted ? "🎭 Révéler !" : `Révéler maintenant (${votedCount}/${players.length})`}
            </button>
          )}
          {!isHost && allVoted && <div className="imp-hint">⏳ Révélation en cours…</div>}
        </div>
        <style>{IMP_CSS}</style>
      </div>
    );
  }

  /* ═══════════════════════ RESULT ═══════════════════════ */
  const { tally, mostVoted, civiliansWin } = computeResult(votes);
  const imposter = players.find(p => p.id === imposterId);
  const accusedName = mostVoted ? (players.find(p => p.id === mostVoted)?.name || "?") : null;
  const nameOf = (id: string) => players.find(p => p.id === id)?.name || "?";

  return (
    <div className="screen game-screen imp-screen">
      {topbar}
      <div className="imp-wrap">
        <div className={`imp-result-banner ${civiliansWin ? "win" : "lose"}`}>
          <div className="imp-result-emoji">{civiliansWin ? "🎉" : "🕵️"}</div>
          <div className="imp-result-title">
            {civiliansWin ? "Les civils gagnent !" : "L'imposteur s'échappe !"}
          </div>
          <div className="imp-result-sub">
            {mostVoted === null
              ? "Égalité au vote — personne n'est éliminé, l'imposteur gagne."
              : civiliansWin
                ? `${accusedName} a été démasqué·e.`
                : `${accusedName} a été accusé·e à tort.`}
          </div>
        </div>

        <div className="imp-reveal-words">
          <div className="imp-reveal-imposter">
            L'imposteur était <b style={{ color: imposter?.color || "var(--danger)" }}>{imposter?.emoji} {imposter?.name || "?"}</b>
          </div>
          <div className="imp-words-pair">
            <div className="imp-word-chip">
              <span className="imp-chip-label">Mot commun</span>
              <span className="imp-chip-word">{wordCivil}</span>
            </div>
            <div className="imp-word-chip imposter">
              <span className="imp-chip-label">Mot imposteur</span>
              <span className="imp-chip-word">{wordImposter}</span>
            </div>
          </div>
        </div>

        <div className="imp-breakdown">
          <div className="imp-breakdown-title">Les votes</div>
          {players.map(p => {
            const target = votes[p.id];
            return (
              <div key={p.id} className="imp-breakdown-row">
                <span className="imp-bd-voter" style={{ color: p.color || "var(--text)" }}>{p.emoji} {p.name}</span>
                <span className="imp-bd-arrow">→</span>
                <span className="imp-bd-target">
                  {target ? nameOf(target) : "—"}
                  {target && target === imposterId ? " 🎯" : ""}
                </span>
              </div>
            );
          })}
          {/* Récap des accusations */}
          <div className="imp-tally">
            {players
              .filter(p => tally[p.id])
              .sort((a, b) => (tally[b.id] || 0) - (tally[a.id] || 0))
              .map(p => (
                <span key={p.id} className="imp-tally-chip" style={{ borderColor: p.color || "var(--border)" }}>
                  {p.name}: {tally[p.id]}
                </span>
              ))}
          </div>
        </div>

        {/* Scores */}
        <div className="imp-scores">
          {[...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0)).map((p, i) => (
            <div key={p.id} className="imp-score-row">
              <span className="imp-score-rank">{i === 0 ? "👑" : `${i + 1}.`}</span>
              <span className="imp-score-name" style={{ color: p.color || "var(--text)" }}>{p.emoji} {p.name}</span>
              <span className="imp-score-pts">{scores[p.id] || 0}</span>
            </div>
          ))}
        </div>

        {isHost ? (
          <div className="imp-result-actions">
            <button className="imp-btn imp-btn-primary" onClick={nextRound}>🔄 Manche suivante</button>
            {confirmEnd ? (
              <div className="imp-confirm">
                <span>Terminer la partie ?</span>
                <button className="imp-btn imp-btn-danger" onClick={finish}>Oui, terminer</button>
                <button className="imp-btn imp-btn-soft" onClick={() => setConfirmEnd(false)}>Annuler</button>
              </div>
            ) : (
              <button className="imp-btn imp-btn-ghost" onClick={() => setConfirmEnd(true)}>🏁 Terminer</button>
            )}
          </div>
        ) : (
          <div className="imp-hint">⏳ En attente de l'hôte pour la suite…</div>
        )}
      </div>
      <style>{IMP_CSS}</style>
    </div>
  );

  // onToast / isSolo restent disponibles pour d'éventuels retours; non requis ici.
  void onToast; void isSolo;
}

/* ════════════════════════════════════════════════════════════════════════
   STYLES — tout est préfixé imp-, uniquement des variables de thème
   (fonctionne en clair comme en sombre).
   ════════════════════════════════════════════════════════════════════════ */
const IMP_CSS = `
.imp-screen{color:var(--text);}
.imp-wrap{max-width:560px;margin:0 auto;padding:1rem 1rem 2.5rem;display:flex;flex-direction:column;gap:1rem;
  animation:impFade .4s ease;}
@keyframes impFade{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}

.imp-card{background:var(--surface-1);color:var(--text);border:1px solid var(--border);
  border-radius:var(--radius);box-shadow:var(--shadow);padding:1.4rem;text-align:center;}
.imp-badge{display:inline-block;font-size:.7rem;letter-spacing:.22em;text-transform:uppercase;
  color:var(--primary);background:color-mix(in srgb,var(--primary) 12%,transparent);
  padding:.3rem .8rem;border-radius:999px;margin-bottom:.7rem;font-weight:800;}
.imp-title{font-family:var(--font-d,serif);font-size:2.3rem;line-height:1.05;margin:.1rem 0 .6rem;
  background:linear-gradient(90deg,var(--primary),var(--accent));-webkit-background-clip:text;
  background-clip:text;-webkit-text-fill-color:transparent;}
.imp-lore{color:var(--text);font-size:.98rem;line-height:1.6;margin:0 0 1rem;}
.imp-lore em{color:var(--danger);font-style:normal;font-weight:800;}
.imp-steps{list-style:none;padding:0;margin:0 0 1.1rem;text-align:left;display:flex;flex-direction:column;gap:.55rem;}
.imp-steps li{display:flex;align-items:center;gap:.7rem;color:var(--muted);font-size:.92rem;font-weight:600;}
.imp-steps li span{flex:none;width:1.6rem;height:1.6rem;display:grid;place-items:center;border-radius:50%;
  background:var(--surface-3);color:var(--primary);font-weight:900;font-size:.85rem;}
.imp-players-row{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin-bottom:1.1rem;}

.imp-avatar{width:2.6rem;height:2.6rem;border-radius:50%;display:grid;place-items:center;font-size:1.3rem;
  color:#fff;box-shadow:var(--shadow);flex:none;}

.imp-instruct{text-align:center;color:var(--muted);font-size:.95rem;margin:.2rem 0;font-weight:600;}

/* ── Carte secrète (hold to reveal) ── */
.imp-secret{position:relative;user-select:none;-webkit-user-select:none;touch-action:none;cursor:pointer;
  min-height:210px;border-radius:var(--radius);border:2px solid var(--primary);
  background:var(--surface-2);box-shadow:var(--shadow-lg);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.6rem;padding:1.4rem;
  transition:transform .12s ease,box-shadow .2s ease,background .25s ease;overflow:hidden;}
.imp-secret:active{transform:scale(.99);}
.imp-secret::before{content:"";position:absolute;inset:0;
  background:radial-gradient(circle at 50% 30%,color-mix(in srgb,var(--primary) 22%,transparent),transparent 70%);
  opacity:0;transition:opacity .3s ease;}
.imp-secret.revealed::before{opacity:1;}
.imp-lock{font-size:2.4rem;filter:grayscale(.2);}
.imp-secret-hidden{color:var(--muted);font-weight:700;letter-spacing:.02em;filter:blur(0);}
.imp-secret-label{position:relative;font-size:.72rem;letter-spacing:.28em;text-transform:uppercase;
  color:var(--primary);font-weight:800;}
.imp-word{position:relative;font-family:var(--font-d,serif);font-size:3rem;font-weight:900;line-height:1.05;
  color:var(--text);text-align:center;word-break:break-word;
  text-shadow:0 2px 24px color-mix(in srgb,var(--primary) 35%,transparent);animation:impPop .32s ease;}
@keyframes impPop{from{opacity:0;transform:scale(.7);}to{opacity:1;transform:scale(1);}}
.imp-secret-foot{position:relative;color:var(--muted);font-size:.82rem;font-style:italic;}

.imp-seen-count{text-align:center;font-weight:800;color:var(--text);font-size:1rem;
  background:var(--surface-1);border:1px solid var(--border);border-radius:999px;
  padding:.45rem 1rem;align-self:center;box-shadow:var(--shadow);}

.imp-reminder{background:var(--surface-1);border:1px solid var(--border);border-left:3px solid var(--accent);
  border-radius:var(--radius);padding:.8rem 1rem;color:var(--muted);font-size:.88rem;line-height:1.55;}
.imp-reminder b{color:var(--text);}

/* ── Vote ── */
.imp-vote-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:.7rem;}
.imp-vote-card{position:relative;display:flex;flex-direction:column;align-items:center;gap:.5rem;
  background:var(--surface-1);color:var(--text);border:2px solid var(--border);border-radius:var(--radius);
  padding:1rem .7rem;cursor:pointer;box-shadow:var(--shadow);transition:transform .12s ease,border-color .2s ease,box-shadow .2s ease;
  font:inherit;}
.imp-vote-card:not(.self):hover{transform:translateY(-2px);border-color:var(--primary);}
.imp-vote-card:active{transform:scale(.98);}
.imp-vote-card.self{opacity:.55;cursor:not-allowed;}
.imp-vote-card.selected{background:var(--surface-2);}
.imp-vote-name{font-weight:800;font-size:.95rem;text-align:center;line-height:1.15;}
.imp-vote-check{font-size:.72rem;font-weight:800;color:var(--green);text-transform:uppercase;letter-spacing:.06em;}
.imp-vote-count{position:absolute;top:.5rem;right:.5rem;font-size:.68rem;font-weight:800;color:var(--muted);
  background:var(--surface-3);border-radius:999px;padding:.12rem .5rem;}

/* ── Result ── */
.imp-result-banner{border-radius:var(--radius);padding:1.3rem 1rem;text-align:center;box-shadow:var(--shadow-lg);
  border:1px solid var(--border);animation:impPop .4s ease;}
.imp-result-banner.win{background:linear-gradient(180deg,color-mix(in srgb,var(--green) 24%,var(--surface-1)),var(--surface-1));
  border-color:color-mix(in srgb,var(--green) 45%,var(--border));}
.imp-result-banner.lose{background:linear-gradient(180deg,color-mix(in srgb,var(--danger) 22%,var(--surface-1)),var(--surface-1));
  border-color:color-mix(in srgb,var(--danger) 45%,var(--border));}
.imp-result-emoji{font-size:2.8rem;line-height:1;animation:impPop .5s ease;}
.imp-result-title{font-family:var(--font-d,serif);font-size:1.7rem;font-weight:900;margin-top:.3rem;color:var(--text);}
.imp-result-sub{color:var(--muted);font-size:.95rem;margin-top:.3rem;}

.imp-reveal-words{background:var(--surface-1);border:1px solid var(--border);border-radius:var(--radius);
  box-shadow:var(--shadow);padding:1rem;text-align:center;}
.imp-reveal-imposter{font-size:1.05rem;color:var(--text);margin-bottom:.8rem;}
.imp-words-pair{display:flex;gap:.7rem;justify-content:center;flex-wrap:wrap;}
.imp-word-chip{flex:1 1 120px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);
  padding:.7rem;display:flex;flex-direction:column;gap:.25rem;}
.imp-word-chip.imposter{border-color:color-mix(in srgb,var(--danger) 45%,var(--border));
  background:color-mix(in srgb,var(--danger) 10%,var(--surface-2));}
.imp-chip-label{font-size:.66rem;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);font-weight:800;}
.imp-chip-word{font-family:var(--font-d,serif);font-size:1.5rem;font-weight:900;color:var(--text);word-break:break-word;}

.imp-breakdown{background:var(--surface-1);border:1px solid var(--border);border-radius:var(--radius);
  box-shadow:var(--shadow);padding:1rem;}
.imp-breakdown-title{font-size:.72rem;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);
  font-weight:800;margin-bottom:.6rem;}
.imp-breakdown-row{display:flex;align-items:center;gap:.5rem;padding:.32rem 0;border-bottom:1px solid var(--border);font-size:.92rem;}
.imp-breakdown-row:last-of-type{border-bottom:none;}
.imp-bd-voter{font-weight:700;flex:1;}
.imp-bd-arrow{color:var(--muted);}
.imp-bd-target{font-weight:800;color:var(--text);flex:1;text-align:right;}
.imp-tally{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.7rem;}
.imp-tally-chip{font-size:.78rem;font-weight:800;color:var(--text);background:var(--surface-2);
  border:1px solid var(--border);border-radius:999px;padding:.25rem .7rem;}

.imp-scores{background:var(--surface-1);border:1px solid var(--border);border-radius:var(--radius);
  box-shadow:var(--shadow);padding:.6rem 1rem;}
.imp-score-row{display:flex;align-items:center;gap:.7rem;padding:.4rem 0;border-bottom:1px solid var(--border);}
.imp-score-row:last-child{border-bottom:none;}
.imp-score-rank{width:1.8rem;font-weight:900;color:var(--gold);text-align:center;}
.imp-score-name{flex:1;font-weight:800;}
.imp-score-pts{font-weight:900;font-size:1.15rem;color:var(--primary);}

.imp-result-actions{display:flex;flex-direction:column;gap:.7rem;align-items:stretch;}
.imp-confirm{display:flex;gap:.5rem;align-items:center;justify-content:center;flex-wrap:wrap;
  background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:.7rem;}
.imp-confirm span{font-weight:800;color:var(--text);width:100%;text-align:center;}

/* ── Buttons ── */
.imp-btn{font:inherit;font-weight:800;border-radius:999px;padding:.9rem 1.4rem;cursor:pointer;border:1px solid transparent;
  transition:transform .12s ease,box-shadow .2s ease,opacity .2s ease;font-size:1rem;}
.imp-btn:active{transform:scale(.98);}
.imp-btn-primary{background:linear-gradient(90deg,var(--primary),var(--primary2,var(--accent)));color:#fff;
  box-shadow:var(--shadow-lg);}
.imp-btn-primary:hover{transform:translateY(-2px);}
.imp-btn-soft{opacity:.9;filter:saturate(.85);}
.imp-btn-ghost{background:var(--surface-1);color:var(--text);border-color:var(--border);box-shadow:var(--shadow);}
.imp-btn-danger{background:var(--danger);color:#fff;box-shadow:var(--shadow);}

.imp-hint{text-align:center;color:var(--muted);font-size:.92rem;font-weight:600;padding:.4rem;}
.imp-warn{color:var(--danger);font-weight:800;}

@media (max-width:420px){
  .imp-title{font-size:1.9rem;}
  .imp-word{font-size:2.4rem;}
  .imp-vote-grid{grid-template-columns:repeat(2,1fr);}
}
`;
