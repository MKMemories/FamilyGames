import { useState, useEffect, useRef } from "react";
import { dbRef, update } from "../../lib/firebase";
import { gameHistory } from "../../hooks/useGameHistory";
import { DrawingBoard } from "./DrawingBoard";
import type { Room, DrawPath, DessinGuessEntry } from "../../types";
import MOTS_RAW from "../../data/mots_dessin.json";

const MOTS: string[]  = MOTS_RAW as string[];
const ROUND_SEC       = 60;
const dessinHist      = gameHistory("dessin");

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

interface DessinProps {
  room: Room;
  roomId: string;
  playerId: string;
  isHost: boolean;
  isSolo: boolean;
  onLeave: () => void;
}

export function Dessin({ room, roomId, playerId, isHost, isSolo, onLeave }: DessinProps) {
  const [guessText, setGuessText] = useState("");
  const [timeLeft, setTimeLeft]   = useState(ROUND_SEC);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const players        = Object.values(room.players || {});
  const manche         = room.dessinManche      ?? 0;
  const totalManches   = room.dessinTotalManches ?? players.length;
  const mot            = room.dessinMot         ?? null;
  const dessinateurId  = room.dessinDessinateur ?? null;
  const rawPaths = room.dessinPaths;
  const paths: DrawPath[] = Array.isArray(rawPaths) ? rawPaths : rawPaths ? Object.values(rawPaths as unknown as Record<string, DrawPath>) : [];
  const correctGuesser = room.dessinCorrectGuesser ?? null;
  const roundActive    = room.dessinRoundActive ?? false;
  const rawChat = room.dessinGuessChat;
  const guessChat: DessinGuessEntry[] = Array.isArray(rawChat) ? rawChat : rawChat ? Object.values(rawChat as unknown as Record<string, DessinGuessEntry>) : [];
  const scores         = room.scores ?? {};

  const amIDrawer     = dessinateurId === playerId;
  const currentDrawer = players.find(p => p.id === dessinateurId);
  const roundDone     = !roundActive && mot !== null;

  /* ── Timer ── */
  useEffect(() => {
    if (!roundActive) { if (timerRef.current) clearInterval(timerRef.current); return; }
    setTimeLeft(ROUND_SEC);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          if (isHost) update(dbRef(`games/${roomId}`), { dessinRoundActive: false });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [roundActive, mot]);

  /* ── Start a new manche (host) ── */
  const startManche = async () => {
    const used  = dessinHist.getUsedSet();
    const fresh = MOTS.filter(m => !used.has(m));
    const pool  = fresh.length >= 1 ? fresh : MOTS;
    const word  = pool[Math.floor(Math.random() * pool.length)];
    const drawerIdx = manche % players.length;
    const drawer    = players[drawerIdx];
    await update(dbRef(`games/${roomId}`), {
      dessinMot: word,
      dessinDessinateur: drawer?.id || players[0]?.id,
      dessinPaths: [],
      dessinCorrectGuesser: null,
      dessinRoundActive: true,
      dessinGuessChat: [],
    });
  };

  /* ── Stroke sync ── */
  const handleStrokeComplete = async (path: DrawPath) => {
    const current = Array.isArray(room.dessinPaths) ? room.dessinPaths : [];
    await update(dbRef(`games/${roomId}`), {
      dessinPaths: [...current, path].slice(-60),
    });
  };

  const handleClear = async () => {
    await update(dbRef(`games/${roomId}`), { dessinPaths: [] });
  };

  /* ── Guess submission ── */
  const handleGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = guessText.trim();
    if (!text || !mot || correctGuesser || !roundActive || amIDrawer) return;
    setGuessText("");
    const correct = normalize(text) === normalize(mot);
    const player  = players.find(p => p.id === playerId);
    const entry: DessinGuessEntry = {
      playerId, playerName: player?.name || "?", text, correct, ts: Date.now(),
    };
    const newChat = [...guessChat, entry].slice(-12);
    const upd: Record<string, any> = { dessinGuessChat: newChat };
    if (correct && !correctGuesser) {
      upd.dessinCorrectGuesser = playerId;
      upd.dessinRoundActive    = false;
      const newScores = { ...scores };
      newScores[playerId] = (newScores[playerId] || 0) + 10;
      if (dessinateurId) newScores[dessinateurId] = (newScores[dessinateurId] || 0) + 5;
      upd.scores = newScores;
    }
    await update(dbRef(`games/${roomId}`), upd);
  };

  /* ── Next manche (host) ── */
  const handleNextManche = async () => {
    if (mot) dessinHist.saveSession([mot]);
    const next = manche + 1;
    if (next >= totalManches) {
      const winner = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))[0]?.name || "?";
      await update(dbRef(`games/${roomId}`), { status: "finished", winner, dessinManche: next, dessinRoundActive: false });
    } else {
      await update(dbRef(`games/${roomId}`), {
        dessinManche: next, dessinMot: null, dessinRoundActive: false,
        dessinPaths: [], dessinCorrectGuesser: null, dessinGuessChat: [],
      });
    }
  };

  /* ── Solo: just validate to move on ── */
  const handleSoloNext = async () => {
    if (mot) dessinHist.saveSession([mot]);
    const next = manche + 1;
    if (next >= totalManches) {
      await update(dbRef(`games/${roomId}`), { status: "finished", winner: players[0]?.name || "Solo", dessinManche: next });
    } else {
      await update(dbRef(`games/${roomId}`), {
        dessinManche: next, dessinMot: null, dessinRoundActive: false,
        dessinPaths: [], dessinGuessChat: [],
      });
    }
  };

  const timerPct   = (timeLeft / ROUND_SEC) * 100;
  const timerColor = timerPct > 55 ? "#4caf50" : timerPct > 28 ? "#ffbe42" : "#ff5252";

  /* ══ LOBBY / BETWEEN ROUNDS ══ */
  if (!mot) {
    return (
      <div className="screen game-screen dessin-screen">
        <div className="game-topbar">
          <button className="btn-back" onClick={onLeave}>✕</button>
          <div className="turn-indicator">🎨 Manche {manche + 1}/{totalManches}</div>
          <div className="score-mini">
            {players.map(p => (
              <span key={p.id} style={{ color: p.color }}>{p.name.slice(0, 4)} {scores[p.id] || 0}</span>
            ))}
          </div>
        </div>
        <div className="dessin-lobby">
          <div className="dessin-lobby-icon">🎨</div>
          <div className="dessin-lobby-title">Manche {manche + 1}</div>
          <div className="dessin-lobby-drawer">
            {players[manche % players.length]?.emoji} <strong>{players[manche % players.length]?.name}</strong> va dessiner !
          </div>
          {(isHost || isSolo) ? (
            <button className="btn btn-primary" style={{ marginTop: "1rem" }} onClick={startManche}>
              🚀 Lancer la manche !
            </button>
          ) : (
            <div className="waiting-host">⏳ L'hôte va lancer la manche…</div>
          )}
        </div>
      </div>
    );
  }

  /* ══ ACTIVE ROUND ══ */
  const correctGuesserPlayer = players.find(p => p.id === correctGuesser);

  return (
    <div className="screen game-screen dessin-screen">
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className="turn-indicator">
          🎨 {amIDrawer ? "Tu dessines !" : `${currentDrawer?.emoji} ${currentDrawer?.name} dessine`}
        </div>
        <div className="score-mini">
          {players.map(p => (
            <span key={p.id} style={{ color: p.color }}>{p.name.slice(0, 4)} {scores[p.id] || 0}</span>
          ))}
        </div>
      </div>

      {/* Timer */}
      {roundActive && (
        <div className="quiz-timer-bar">
          <div className="quiz-timer-fill" style={{ width: `${timerPct}%`, background: timerColor }} />
          <span className="quiz-timer-num" style={{ color: timerColor }}>{timeLeft}s</span>
        </div>
      )}

      {/* Word display */}
      {amIDrawer && mot && (
        <div className="dessin-word-banner">
          <span className="dessin-word-label">Ton mot :</span>
          <span className="dessin-word">{mot}</span>
        </div>
      )}
      {!amIDrawer && !isSolo && roundActive && (
        <div className="dessin-word-banner dessin-word-hidden">
          <span>🔍 {String(mot.length)} lettres — devine le dessin !</span>
        </div>
      )}
      {!amIDrawer && !isSolo && roundDone && (
        <div className="dessin-word-banner">
          <span className="dessin-word-label">Le mot était :</span>
          <span className="dessin-word">{mot}</span>
        </div>
      )}

      {/* Canvas */}
      <DrawingBoard
        paths={paths}
        isDrawer={amIDrawer || isSolo}
        onStrokeComplete={handleStrokeComplete}
        onClear={handleClear}
      />

      {/* Round result overlay */}
      {roundDone && (
        <div className="dessin-round-result">
          {correctGuesserPlayer ? (
            <div className="dessin-correct">
              🎉 <strong style={{ color: correctGuesserPlayer.color }}>{correctGuesserPlayer.name}</strong> a trouvé !
              {dessinateurId && <div style={{ fontSize: ".75rem", marginTop: ".2rem", color: "var(--muted)" }}>
                {correctGuesserPlayer.name} +10pts · {currentDrawer?.name} +5pts
              </div>}
            </div>
          ) : (
            <div className="dessin-timeout">⏰ Temps écoulé ! Le mot était : <strong>{mot}</strong></div>
          )}
          {isSolo ? (
            <button className="btn btn-primary" style={{ marginTop: ".7rem" }} onClick={handleSoloNext}>
              {manche + 1 >= totalManches ? "🏆 Terminer" : "Mot suivant →"}
            </button>
          ) : isHost ? (
            <button className="btn btn-primary" style={{ marginTop: ".7rem" }} onClick={handleNextManche}>
              {manche + 1 >= totalManches ? "🏆 Voir le podium" : "Manche suivante →"}
            </button>
          ) : (
            <div className="waiting-host">⏳ En attente de l'hôte…</div>
          )}
        </div>
      )}

      {/* Guess chat (spectators) */}
      {!amIDrawer && !isSolo && roundActive && (
        <div className="dessin-guess-zone">
          <div className="dessin-chat">
            {guessChat.slice(-6).map((e, i) => (
              <div key={i} className={`dessin-chat-entry ${e.correct ? "dessin-chat-correct" : ""}`}>
                <span className="dce-name">{e.playerName}</span>
                <span className="dce-text">{e.correct ? `✅ ${e.text}` : e.text}</span>
              </div>
            ))}
          </div>
          <form className="dessin-guess-form" onSubmit={handleGuess}>
            <input
              ref={inputRef}
              type="text"
              className="dessin-guess-input"
              placeholder="Ta proposition…"
              value={guessText}
              onChange={e => setGuessText(e.target.value)}
              disabled={!!correctGuesser}
              autoFocus
            />
            <button type="submit" className="btn btn-primary dessin-guess-btn" disabled={!guessText || !!correctGuesser}>
              →
            </button>
          </form>
        </div>
      )}

      {/* Guess chat for drawer (read only) */}
      {amIDrawer && roundActive && guessChat.length > 0 && (
        <div className="dessin-guess-zone dessin-drawer-chat">
          <div className="dessin-chat">
            {guessChat.slice(-5).map((e, i) => (
              <div key={i} className={`dessin-chat-entry ${e.correct ? "dessin-chat-correct" : ""}`}>
                <span className="dce-name">{e.playerName}</span>
                <span className="dce-text">{e.correct ? `✅ ${e.text}` : "💬 …"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
