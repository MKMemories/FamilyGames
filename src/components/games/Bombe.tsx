import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { dbRef, update } from "../../lib/firebase";
import type { Room } from "../../types";
import { useSoloAI } from "../../hooks/useSoloAI";
import { BOMBE_SYLLABLES, BOMBE_WORDS } from "../../lib/bombeData";

/* ══════════════════════════════════════════════════════════════════════════
   MOT BOMBE — patate chaude party (2–4 joueurs, chacun sur son écran)
   La bombe passe de joueur en joueur. Le porteur doit taper un mot contenant
   la syllabe affichée AVANT que la mèche n'atteigne zéro. À chaque mot valide,
   la bombe passe au joueur suivant avec une nouvelle syllabe. Si la mèche
   explose, le porteur perd un cœur. Dernier survivant = gagnant.

   Source de vérité unique = room (Firebase). Écrit toujours par UN SEUL client :
   - transitions de lancement → l'hôte
   - soumission d'un mot / explosion de la mèche → le PORTEUR uniquement
   Donc pas de course : chaque écriture a un auteur unique déterministe.

   Champs Firebase (lus via room.<champ> ?? défaut) :
     bmbPhase        "play" | "over" | null (avant lancement)
     bmbSyllable     string   syllabe courante
     bmbHolder       string   playerId du porteur
     bmbLives        Record<playerId, number>
     bmbUsedWords    string[] mots déjà joués (normalisés)
     bmbUsedSyllables string[] syllabes déjà servies
     bmbRoundId      number   incrémenté à chaque passage → réinitialise la mèche
     bmbOrder        string[] ordre des joueurs encore en vie
     bmbLastWord     string   dernier mot joué
     bmbLastBy       string   playerId de l'auteur du dernier mot
     bmbFuseMs       number   durée de la mèche pour le porteur courant
   ══════════════════════════════════════════════════════════════════════════ */

const FALLBACK_SYLLABLES = ["CHA", "PAR", "MON", "CAR", "TON", "COU", "BON", "MAR"];
const FALLBACK_WORDS = ["chat", "chien", "maison", "carotte", "bonbon", "château", "voiture", "ballon"];

const SYLLABLES: string[] =
  Array.isArray(BOMBE_SYLLABLES) && BOMBE_SYLLABLES.length > 0 ? BOMBE_SYLLABLES : FALLBACK_SYLLABLES;
const WORD_BANK: string[] =
  Array.isArray(BOMBE_WORDS) && BOMBE_WORDS.length > 0 ? BOMBE_WORDS : FALLBACK_WORDS;

/* minuscules + suppression des accents → comparaison indulgente */
const norm = (s: string): string =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const FUSE_MS = 12000;
const TICK_MS = 60;

interface BombeProps {
  room: Room;
  roomId: string;
  playerId: string;
  isHost: boolean;
  isSolo: boolean;
  onLeave: () => void;
  onToast: (m: string) => void;
}

export function Bombe({ room, roomId, playerId, isHost, isSolo, onLeave, onToast }: BombeProps) {
  const gamePath = `games/${roomId}`;

  /* ── Lectures défensives ── */
  const players = Object.values(room.players || {});
  const phase = room.bmbPhase ?? null;                       // null | "play" | "over"
  const syllable = room.bmbSyllable ?? "";
  const holder = room.bmbHolder ?? "";
  const lives = room.bmbLives ?? {};
  const usedWords = room.bmbUsedWords ?? [];
  const usedSyllables = room.bmbUsedSyllables ?? [];
  const roundId = room.bmbRoundId ?? 0;
  const order = room.bmbOrder ?? [];
  const lastWord = room.bmbLastWord ?? "";
  const lastBy = room.bmbLastBy ?? "";
  const fuseMs = room.bmbFuseMs ?? FUSE_MS;

  const aiId = room.aiId;
  const difficulty = room.soloDifficulty ?? "moyen";

  const isHolder = holder === playerId;
  const holderPlayer = room.players?.[holder];
  const holderName = holderPlayer?.name ?? "?";
  const livingIds = order.filter(id => (lives[id] ?? 0) > 0);

  /* ── État UI transitoire ── */
  const [chosenLives, setChosenLives] = useState(3);
  const [input, setInput] = useState("");
  const [fuseLeft, setFuseLeft] = useState(fuseMs);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ════════════════════════ HELPERS PARTAGÉS ════════════════════════ */

  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  /* Choisit une syllabe non encore servie ; réinitialise la liste si épuisée. */
  const pickSyllable = (usedList: string[]): { syl: string; nextUsed: string[] } => {
    const available = SYLLABLES.filter(s => !usedList.includes(s));
    const pool = available.length > 0 ? available : SYLLABLES;
    const syl = pool[Math.floor(Math.random() * pool.length)] ?? SYLLABLES[0];
    const base = available.length > 0 ? usedList : [];
    return { syl, nextUsed: [...base, syl] };
  };

  /* Joueur suivant (encore en vie) dans l'ordre, en partant après fromId.
     excludeId : id à considérer comme mort (ex. celui qu'on vient d'éliminer). */
  const nextHolder = (fromId: string, excludeId?: string): string => {
    if (order.length === 0) return fromId;
    const alive = (id: string) => (lives[id] ?? 0) > 0 && id !== excludeId;
    const start = order.indexOf(fromId);
    for (let step = 1; step <= order.length; step++) {
      const cand = order[(start + step) % order.length];
      if (alive(cand)) return cand;
    }
    // fallback : premier vivant, sinon fromId
    return order.find(alive) ?? fromId;
  };

  /* ════════════════════════ ACTIONS ════════════════════════ */

  /* Lancement (hôte). */
  const startGame = () => {
    if (players.length < 2) { onToast("Il faut au moins 2 joueurs"); return; }
    const ord = shuffle(players.map(p => p.id));
    const lv: Record<string, number> = {};
    const sc: Record<string, number> = {};
    ord.forEach(id => { lv[id] = chosenLives; sc[id] = 0; });
    const { syl, nextUsed } = pickSyllable([]);
    update(dbRef(gamePath), {
      bmbPhase: "play",
      bmbOrder: ord,
      bmbLives: lv,
      bmbHolder: ord[0],
      bmbSyllable: syl,
      bmbUsedSyllables: nextUsed,
      bmbUsedWords: [],
      bmbRoundId: 1,
      bmbFuseMs: FUSE_MS,
      bmbLastWord: "",
      bmbLastBy: "",
      scores: sc,
    });
  };

  /* Validation locale d'un mot (on fait confiance à la famille : pas de dico). */
  const validate = (raw: string): { ok: boolean; reason?: string; clean: string } => {
    const clean = norm(raw);
    if (clean.length < 3) return { ok: false, reason: "Au moins 3 lettres !", clean };
    if (!/^[a-zàâäçéèêëîïôöùûüÿœæ-]+$/.test(raw.trim().toLowerCase()))
      return { ok: false, reason: "Lettres uniquement", clean };
    if (!clean.includes(norm(syllable)))
      return { ok: false, reason: `Le mot doit contenir « ${syllable} »`, clean };
    if (usedWords.includes(clean)) return { ok: false, reason: "Déjà joué !", clean };
    return { ok: true, clean };
  };

  /* Le PORTEUR soumet un mot valide → passe la bombe. Écriture par le porteur. */
  const submitWord = (raw: string, byId: string) => {
    const { ok, reason, clean } = validate(raw);
    if (!ok) {
      if (byId === playerId) { onToast(reason || "Mot invalide"); setShake(true); setTimeout(() => setShake(false), 450); }
      return;
    }
    const { syl, nextUsed } = pickSyllable(usedSyllables);
    const next = nextHolder(byId);
    update(dbRef(gamePath), {
      bmbUsedWords: [...usedWords, clean],
      bmbLastWord: clean,
      bmbLastBy: byId,
      bmbSyllable: syl,
      bmbUsedSyllables: nextUsed,
      bmbHolder: next,
      bmbRoundId: roundId + 1,
    });
    if (byId === playerId) setInput("");
  };

  /* La mèche explose sur le porteur. Écriture par le porteur uniquement.
     Score = classement d'élimination : le survivant obtient le plus, chaque
     éliminé un score décroissant selon son ordre de sortie (départage par les
     cœurs restants du survivant). */
  const explode = () => {
    const N = players.length;
    const cur = lives[holder] ?? 0;
    const remaining = Math.max(0, cur - 1);
    const nextLives = { ...lives, [holder]: remaining };
    const eliminated = remaining <= 0;
    const stillAlive = order.filter(id => (nextLives[id] ?? 0) > 0);
    const scores: Record<string, number> = { ...(room.scores ?? {}) };

    if (eliminated) {
      // Placé juste derrière tous ceux encore en vie → score = (N - vivants - 1).
      scores[holder] = Math.max(0, N - stillAlive.length - 1);
    }

    // Fin de partie : un seul (ou zéro) survivant.
    if (stillAlive.length <= 1) {
      const survivorId = stillAlive[0];
      if (survivorId) scores[survivorId] = (N - 1) + (nextLives[survivorId] ?? 0);
      players.forEach(p => { if (scores[p.id] === undefined) scores[p.id] = 0; });
      const survivor = survivorId ? room.players?.[survivorId] : undefined;
      update(dbRef(gamePath), {
        bmbPhase: "over",
        bmbLives: nextLives,
        status: "finished",
        winner: survivor?.name ?? "?",
        scores,
      });
      return;
    }

    const next = nextHolder(holder, eliminated ? holder : undefined);
    const nextOrder = eliminated ? order.filter(id => id !== holder) : order;
    const { syl, nextUsed } = pickSyllable(usedSyllables);
    update(dbRef(gamePath), {
      bmbLives: nextLives,
      bmbOrder: nextOrder,
      bmbHolder: next,
      bmbSyllable: syl,
      bmbUsedSyllables: nextUsed,
      bmbRoundId: roundId + 1,
      scores,
    });
  };

  /* ════════════════════════ MÈCHE (porteur uniquement) ════════════════════════ */
  /* Seul le client du porteur fait tourner le compte à rebours, réinitialisé à
     chaque bmbRoundId. Quand il atteint 0, ce même client écrit l'explosion. */
  // Qui fait tourner la mèche : le porteur lui-même, ou — en solo — le client
  // humain (hôte) quand c'est l'IA qui tient la bombe (l'IA n'a pas d'écran).
  const iRunFuse = isHolder || (!!aiId && holder === aiId && isHost);
  useEffect(() => {
    if (phase !== "play") return;
    setFuseLeft(fuseMs);
    if (!iRunFuse) return;

    let left = fuseMs;
    const started = Date.now();
    const id = setInterval(() => {
      left = fuseMs - (Date.now() - started);
      if (left <= 0) {
        left = 0;
        setFuseLeft(0);
        clearInterval(id);
        explode();
      } else {
        setFuseLeft(left);
      }
    }, TICK_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId, phase, iRunFuse, fuseMs]);

  /* Focus auto sur l'input quand c'est mon tour. */
  useEffect(() => {
    if (phase === "play" && isHolder) inputRef.current?.focus();
  }, [roundId, phase, isHolder]);

  /* ════════════════════════ IA SOLO ════════════════════════ */
  const aiActive = phase === "play" && !!aiId && holder === aiId;
  const aiDelay = difficulty === "difficile" ? 1400 : difficulty === "facile" ? 5200 : 3000;
  useSoloAI(aiActive, `${roundId}`, () => {
    if (!aiId) return;
    // En facile, l'IA "sèche" parfois → la mèche explose sur elle (les enfants gagnent).
    if (difficulty === "facile" && Math.random() < 0.45) return;
    const sl = norm(syllable);
    const candidates = WORD_BANK.filter(w => {
      const n = norm(w);
      return n.length >= 3 && n.includes(sl) && !usedWords.includes(n);
    });
    if (candidates.length === 0) return; // rien trouvé → la mèche fera son office
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    submitWord(chosen, aiId);
  }, aiDelay);

  /* ════════════════════════ RENDER ════════════════════════ */

  const topbar = (
    <div className="game-topbar">
      <button className="btn-back" onClick={onLeave}>✕</button>
      <div className="turn-indicator">💣 Mot Bombe</div>
      <div className="score-mini">
        {players.map(p => (
          <span key={p.id} style={{ color: p.color || "#333" }}>
            {p.name.slice(0, 4)} {"❤".repeat(Math.max(0, lives[p.id] ?? 0)) || "☠"}
          </span>
        ))}
      </div>
    </div>
  );

  /* ── Écran de démarrage ── */
  if (phase !== "play") {
    const enough = players.length >= 2;
    return (
      <div className="screen game-screen bmb-screen">
        {topbar}
        <div className="bmb-wrap">
          <div className="bmb-intro">
            <div className="bmb-intro-bomb">💣</div>
            <h1 className="bmb-title">Mot Bombe</h1>
            <p className="bmb-lore">
              La bombe passe de main en main ! Quand elle est chez toi, tape vite un
              <b> mot qui contient la syllabe</b> affichée avant que la mèche n'explose 💥.
              Chaque explosion coûte un <b>cœur</b> ❤️. Le dernier survivant gagne !
            </p>
            <div className="bmb-players-row">
              {players.map(p => (
                <div key={p.id} className="bmb-avatar" style={{ background: p.color || "var(--primary)" }} title={p.name}>
                  {p.emoji || "🙂"}
                </div>
              ))}
            </div>

            {isHost ? (
              enough ? (
                <>
                  <div className="bmb-lives-pick">
                    <span className="bmb-lives-label">Vies par joueur</span>
                    <div className="bmb-lives-btns">
                      {[2, 3].map(n => (
                        <button
                          key={n}
                          className={`bmb-life-chip ${chosenLives === n ? "sel" : ""}`}
                          onClick={() => setChosenLives(n)}
                        >
                          {"❤".repeat(n)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button className="bmb-btn bmb-btn-primary" onClick={startGame}>💥 Commencer</button>
                </>
              ) : (
                <div className="bmb-hint bmb-warn">Il faut au moins 2 joueurs ({players.length}/2)</div>
              )
            ) : (
              <div className="bmb-hint">⏳ En attente de l'hôte…</div>
            )}
            {isSolo && <div className="bmb-hint">Mode solo : affronte l'ordinateur 🤖</div>}
          </div>
        </div>
        <style>{BMB_CSS}</style>
      </div>
    );
  }

  /* ── Phase de jeu ── */
  const ratio = Math.max(0, Math.min(1, fuseLeft / fuseMs));
  const danger = ratio < 0.34;
  const critical = ratio < 0.16;
  const secondsLeft = Math.ceil(fuseLeft / 1000);
  // La bombe pulse de plus en plus vite quand la mèche raccourcit.
  const pulseDur = 0.25 + ratio * 0.85;

  return (
    <div className="screen game-screen bmb-screen">
      {topbar}
      <div className="bmb-wrap">
        {/* Ordre des joueurs + vies */}
        <div className="bmb-order">
          {order.map(id => {
            const p = room.players?.[id];
            if (!p) return null;
            const lv = lives[id] ?? 0;
            const active = id === holder;
            const dead = lv <= 0;
            return (
              <div key={id} className={`bmb-seat ${active ? "active" : ""} ${dead ? "dead" : ""}`}
                style={active ? { borderColor: p.color || "var(--primary)", boxShadow: `0 0 0 3px ${(p.color || "var(--primary)")}55` } : undefined}>
                <div className="bmb-seat-avatar" style={{ background: p.color || "var(--primary)" }}>{dead ? "💀" : (p.emoji || "🙂")}</div>
                <div className="bmb-seat-name">{p.name}</div>
                <div className="bmb-seat-hearts">
                  {lv > 0 ? "❤️".repeat(lv) : "☠️"}
                </div>
                {active && <div className="bmb-seat-flag">💣</div>}
              </div>
            );
          })}
        </div>

        {/* La bombe */}
        <div className={`bmb-stage ${danger ? "danger" : ""} ${critical ? "critical" : ""}`}>
          <motion.div
            className="bmb-bomb"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: pulseDur, repeat: Infinity, ease: "easeInOut" }}
            style={{
              boxShadow: `0 0 ${20 + (1 - ratio) * 70}px ${8 + (1 - ratio) * 26}px rgba(var(--danger-rgb,239,68,68),${0.18 + (1 - ratio) * 0.6})`,
            }}
          >
            <div className="bmb-bomb-fuse" aria-hidden>
              <span className="bmb-spark" style={{ opacity: danger ? 1 : 0.85 }}>✨</span>
            </div>
            <div className="bmb-bomb-body">
              <div className="bmb-syllable-label">Syllabe</div>
              <div className="bmb-syllable">{syllable}</div>
            </div>
          </motion.div>

          {/* Mèche (barre) */}
          <div className="bmb-fuse-track">
            <div
              className={`bmb-fuse-fill ${danger ? "danger" : ""} ${critical ? "critical" : ""}`}
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
          <div className={`bmb-timer ${danger ? "danger" : ""}`}>{secondsLeft}s</div>
        </div>

        {/* Zone d'action : hauteur fixe pour éviter les sauts de mise en page */}
        <div className="bmb-action">
          {isHolder ? (
            <form
              className={`bmb-form ${shake ? "shake" : ""}`}
              onSubmit={e => { e.preventDefault(); submitWord(input, playerId); }}
            >
              <div className="bmb-form-hint">🔥 C'est à toi ! Un mot avec « <b>{syllable}</b> »</div>
              <div className="bmb-input-row">
                <input
                  ref={inputRef}
                  className="bmb-input"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={`…${syllable.toLowerCase()}…`}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="send"
                  maxLength={24}
                />
                <button type="submit" className="bmb-btn bmb-btn-primary bmb-send">Go 💥</button>
              </div>
            </form>
          ) : (
            <div className="bmb-waiting-turn">
              <div className="bmb-waiting-face" style={{ background: holderPlayer?.color || "var(--primary)" }}>
                {aiId && holder === aiId ? "🤖" : (holderPlayer?.emoji || "🙂")}
              </div>
              <div className="bmb-waiting-txt">⏳ C'est à <b>{holderName}</b> !</div>
              <div className="bmb-waiting-sub">La bombe pourrait bientôt lui exploser au nez 😅</div>
            </div>
          )}
        </div>

        {/* Ticker : dernier mot joué (hauteur fixe) */}
        <div className="bmb-ticker">
          <AnimatePresence mode="wait">
            <motion.div
              key={lastWord || "start"}
              className="bmb-ticker-inner"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              {lastWord ? (
                <>
                  <span className="bmb-ticker-label">Dernier mot</span>
                  <span className="bmb-ticker-word">{lastWord}</span>
                  <span className="bmb-ticker-by">
                    {room.players?.[lastBy]?.emoji} {room.players?.[lastBy]?.name || ""}
                  </span>
                </>
              ) : (
                <span className="bmb-ticker-label">La partie commence… trouve un mot vite !</span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="bmb-alive-count">
          {livingIds.length} joueur{livingIds.length > 1 ? "s" : ""} encore en vie
        </div>
      </div>
      <style>{BMB_CSS}</style>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STYLES — préfixe bmb-, variables de thème (clair + sombre)
   ════════════════════════════════════════════════════════════════════════ */
const BMB_CSS = `
.bmb-screen{color:var(--text);}
.bmb-wrap{max-width:560px;margin:0 auto;padding:.8rem 1rem 2.4rem;display:flex;flex-direction:column;gap:.9rem;
  animation:bmbFade .35s ease;}
@keyframes bmbFade{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}

/* ── Intro ── */
.bmb-intro{background:var(--surface-1);border:1px solid var(--border);border-radius:var(--radius);
  box-shadow:var(--shadow);padding:1.5rem 1.3rem;text-align:center;display:flex;flex-direction:column;
  align-items:center;gap:.7rem;}
.bmb-intro-bomb{font-size:3.6rem;filter:drop-shadow(0 6px 14px rgba(0,0,0,.22));animation:bmbPop .5s ease;}
.bmb-title{font-family:var(--font-d,serif);font-size:2.2rem;line-height:1.05;margin:0;
  background:linear-gradient(90deg,var(--primary),var(--accent));-webkit-background-clip:text;
  background-clip:text;-webkit-text-fill-color:transparent;}
.bmb-lore{color:var(--muted);font-size:.95rem;line-height:1.6;margin:0;font-weight:600;max-width:440px;}
.bmb-lore b{color:var(--text);}
.bmb-players-row{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;}
.bmb-avatar{width:2.6rem;height:2.6rem;border-radius:50%;display:grid;place-items:center;font-size:1.3rem;
  color:#fff;box-shadow:var(--shadow);flex:none;}

.bmb-lives-pick{display:flex;flex-direction:column;gap:.5rem;align-items:center;margin-top:.3rem;}
.bmb-lives-label{font-size:.72rem;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);}
.bmb-lives-btns{display:flex;gap:.6rem;}
.bmb-life-chip{padding:.55rem .9rem;border-radius:999px;border:2px solid var(--border);
  background:var(--surface-2,var(--surface-1));color:var(--text);font-size:1rem;cursor:pointer;
  transition:.16s;box-shadow:var(--shadow);letter-spacing:.05em;}
.bmb-life-chip:hover{transform:translateY(-2px);}
.bmb-life-chip.sel{border-color:var(--primary);box-shadow:var(--shadow-lg);
  background:color-mix(in srgb,var(--primary) 14%,var(--surface-1));}

/* ── Boutons ── */
.bmb-btn{font:inherit;font-weight:900;border-radius:999px;padding:.85rem 1.6rem;cursor:pointer;
  border:1px solid transparent;transition:transform .12s ease,box-shadow .2s ease;font-size:1.05rem;}
.bmb-btn:active{transform:scale(.98);}
.bmb-btn-primary{background:linear-gradient(90deg,var(--primary),var(--accent));color:#fff;box-shadow:var(--shadow-lg);}
.bmb-btn-primary:hover{transform:translateY(-2px);}

.bmb-hint{text-align:center;color:var(--muted);font-size:.9rem;font-weight:700;}
.bmb-warn{color:var(--danger);font-weight:900;}

/* ── Ordre des joueurs ── */
.bmb-order{display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap;}
.bmb-seat{position:relative;flex:0 1 88px;min-width:72px;background:var(--surface-1);border:2px solid var(--border);
  border-radius:var(--radius);padding:.5rem .35rem;display:flex;flex-direction:column;align-items:center;gap:.2rem;
  box-shadow:var(--shadow);transition:.2s;}
.bmb-seat.active{transform:translateY(-2px);}
.bmb-seat.dead{opacity:.5;filter:grayscale(.6);}
.bmb-seat-avatar{width:2.1rem;height:2.1rem;border-radius:50%;display:grid;place-items:center;font-size:1.1rem;
  color:#fff;box-shadow:inset 0 -2px 5px rgba(0,0,0,.2);}
.bmb-seat-name{font-size:.72rem;font-weight:800;color:var(--text);max-width:80px;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap;}
.bmb-seat-hearts{font-size:.62rem;line-height:1;letter-spacing:-1px;}
.bmb-seat-flag{position:absolute;top:-12px;font-size:1.1rem;animation:bmbBob 1s ease-in-out infinite;}
@keyframes bmbBob{0%,100%{transform:translateY(0);}50%{transform:translateY(-3px);}}

/* ── Scène de la bombe ── */
.bmb-stage{display:flex;flex-direction:column;align-items:center;gap:.7rem;padding:.6rem 0 .2rem;}
.bmb-bomb{position:relative;width:170px;height:170px;border-radius:50%;
  background:radial-gradient(circle at 36% 30%,#5b6270 0%,#2c313c 55%,#14171d 100%);
  display:flex;align-items:center;justify-content:center;
  border:3px solid rgba(0,0,0,.35);}
.bmb-bomb-fuse{position:absolute;top:-26px;right:32px;width:4px;height:30px;border-radius:3px;
  background:linear-gradient(#8a5a2b,#6b3f1d);transform:rotate(18deg);transform-origin:bottom;}
.bmb-spark{position:absolute;top:-16px;left:-9px;font-size:1.2rem;
  filter:drop-shadow(0 0 6px var(--warning,#f59e0b));animation:bmbSpark .4s ease-in-out infinite;}
@keyframes bmbSpark{0%,100%{transform:scale(1) rotate(-8deg);}50%{transform:scale(1.25) rotate(8deg);}}
.bmb-bomb-body{text-align:center;}
.bmb-syllable-label{font-size:.62rem;font-weight:900;letter-spacing:.24em;text-transform:uppercase;
  color:rgba(255,255,255,.55);}
.bmb-syllable{font-family:var(--font-d,serif);font-size:3rem;font-weight:900;line-height:1;color:#fff;
  text-shadow:0 2px 18px rgba(var(--danger-rgb,239,68,68),.6);letter-spacing:.04em;animation:bmbPop .3s ease;}
.bmb-stage.danger .bmb-syllable{color:#ffdede;}
.bmb-stage.critical .bmb-bomb{animation:bmbWobble .18s linear infinite;}
@keyframes bmbWobble{0%{transform:rotate(-2deg);}50%{transform:rotate(2deg);}100%{transform:rotate(-2deg);}}

.bmb-fuse-track{width:100%;max-width:340px;height:12px;border-radius:999px;overflow:hidden;
  background:var(--surface-3,rgba(0,0,0,.1));border:1px solid var(--border);}
.bmb-fuse-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--green,#22c55e),var(--warning,#f59e0b));
  transition:width .08s linear;}
.bmb-fuse-fill.danger{background:linear-gradient(90deg,var(--warning,#f59e0b),var(--danger,#ef4444));}
.bmb-fuse-fill.critical{background:var(--danger,#ef4444);animation:bmbFlash .35s steps(2) infinite;}
@keyframes bmbFlash{0%{opacity:1;}50%{opacity:.55;}100%{opacity:1;}}
.bmb-timer{font-family:var(--font-d,serif);font-weight:900;font-size:1.15rem;color:var(--muted);}
.bmb-timer.danger{color:var(--danger,#ef4444);}

/* ── Zone d'action (hauteur fixe pour éviter le reflow) ── */
.bmb-action{min-height:118px;display:flex;align-items:center;justify-content:center;}
.bmb-form{width:100%;display:flex;flex-direction:column;gap:.6rem;}
.bmb-form.shake{animation:bmbShake .42s ease;}
@keyframes bmbShake{0%,100%{transform:translateX(0);}20%{transform:translateX(-8px);}40%{transform:translateX(8px);}
  60%{transform:translateX(-6px);}80%{transform:translateX(6px);}}
.bmb-form-hint{text-align:center;font-weight:800;color:var(--text);font-size:.95rem;}
.bmb-form-hint b{color:var(--primary);}
.bmb-input-row{display:flex;gap:.5rem;}
.bmb-input{flex:1;min-width:0;font:inherit;font-size:1.2rem;font-weight:800;padding:.8rem 1rem;
  border-radius:var(--radius);border:2px solid var(--border);background:var(--surface-1);color:var(--text);
  box-shadow:var(--shadow);outline:none;transition:border-color .15s;}
.bmb-input:focus{border-color:var(--primary);}
.bmb-send{flex:none;padding:.8rem 1.1rem;font-size:1rem;}

.bmb-waiting-turn{width:100%;display:flex;flex-direction:column;align-items:center;gap:.35rem;
  background:var(--surface-1);border:1px solid var(--border);border-radius:var(--radius);
  box-shadow:var(--shadow);padding:.9rem 1rem;}
.bmb-waiting-face{width:2.6rem;height:2.6rem;border-radius:50%;display:grid;place-items:center;font-size:1.35rem;
  color:#fff;box-shadow:var(--shadow);}
.bmb-waiting-txt{font-weight:900;font-size:1.05rem;color:var(--text);}
.bmb-waiting-txt b{color:var(--primary);}
.bmb-waiting-sub{font-size:.8rem;color:var(--muted);font-weight:600;text-align:center;}

/* ── Ticker ── */
.bmb-ticker{min-height:44px;display:flex;align-items:center;justify-content:center;
  background:var(--surface-2,var(--surface-1));border:1px solid var(--border);border-radius:999px;
  padding:.35rem 1rem;box-shadow:var(--shadow);}
.bmb-ticker-inner{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;justify-content:center;}
.bmb-ticker-label{font-size:.66rem;font-weight:900;text-transform:uppercase;letter-spacing:.14em;color:var(--muted);}
.bmb-ticker-word{font-family:var(--font-d,serif);font-weight:900;font-size:1.1rem;color:var(--text);}
.bmb-ticker-by{font-size:.78rem;font-weight:800;color:var(--accent);}

.bmb-alive-count{text-align:center;font-size:.8rem;font-weight:800;color:var(--muted);}

@keyframes bmbPop{from{opacity:0;transform:scale(.7);}to{opacity:1;transform:scale(1);}}

@media (max-width:420px){
  .bmb-title{font-size:1.9rem;}
  .bmb-bomb{width:150px;height:150px;}
  .bmb-syllable{font-size:2.6rem;}
  .bmb-seat{flex-basis:76px;}
}
`;
