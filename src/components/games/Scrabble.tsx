import { useState } from "react";
import { dbRef, update } from "../../lib/firebase";
import { LETTER_VALS } from "../../lib/gameData";
import type { Room } from "../../types";

interface WiktionaryPage {
  pageid?: number;
  title: string;
  missing?: string;
}
interface WiktionaryResponse {
  query: { pages: Record<string, WiktionaryPage> };
}

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
  const [isChecking, setIsChecking] = useState(false);

  const players = Object.values(room.players || {});
  const currentTurn = room.currentTurn || 0;
  const isMyTurn = isSolo || players[currentTurn % players.length]?.id === playerId;
  const rack = (room.racks || {})[playerId] || [];
  const roundWord = room.roundWord || "";
  const selectedTiles = (room.selectedTiles || []) as number[];
  const passedTurn = room.passedTurn || {};

  const handleTile = (idx: number) => {
    if (!isMyTurn || room.winner) return;
    const sel = [...selectedTiles];
    if (sel.includes(idx)) {
      const pos = sel.lastIndexOf(idx);
      sel.splice(pos, 1);
      const newWord = roundWord.slice(0, -1);
      update(dbRef(`games/${roomId}`), { selectedTiles: sel, roundWord: newWord });
    } else {
      sel.push(idx);
      const newWord = roundWord + rack[idx];
      update(dbRef(`games/${roomId}`), { selectedTiles: sel, roundWord: newWord });
    }
  };

  const playWord = async () => {
    const myIdx = players.findIndex(p => p.id === playerId);
    if (!isSolo && myIdx !== currentTurn % players.length) return;
    const word = roundWord.toUpperCase();
    if (word.length < 2) { onToast("Mot trop court !"); return; }

    setIsChecking(true);
    try {
      const res = await fetch(
        `https://fr.wiktionary.org/w/api.php?action=query&titles=${word.toLowerCase()}&format=json&origin=*`
      );
      const data: WiktionaryResponse = await res.json();
      const pages = data?.query?.pages || {};
      if (Object.keys(pages)[0] === "-1") {
        onToast(`"${word}" n'existe pas dans le dictionnaire !`);
        setIsChecking(false);
        return;
      }
    } catch {
      // API unavailable: allow the word anyway
    }
    setIsChecking(false);

    const pts = word.split("").reduce((s, l) => s + (LETTER_VALS[l] || 0), 0);
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
          {players.map(p => (
            <span key={p.id} style={{ color: p.color || "#333" }}>
              {p.name.slice(0, 4)} {(room.scores || {})[p.id] ?? 0}
            </span>
          ))}
        </div>
      </div>

      {room.winner && <div className="win-banner">🎉 {room.winner} gagne !</div>}

      <div className="scrabble-zone">
        <div className="scrabble-word-display">
          {roundWord ? (
            roundWord.split("").map((l, i) => <span key={i} className="placed-tile">{l}</span>)
          ) : (
            <span style={{ color: "var(--muted)" }}>Sélectionne des lettres…</span>
          )}
        </div>

        {isMyTurn && !room.winner && (
          <div className="rack-swap-row">
            {rack.map((_, i) => (
              <button
                key={i}
                className="tile-swap-btn"
                onClick={() => swapOneLetter(i)}
                title="Échanger cette lettre (-1 pt)"
              >↺</button>
            ))}
          </div>
        )}

        <div className="scrabble-rack">
          {rack.map((l, i) => (
            <button
              key={i}
              className={`rack-tile ${selectedTiles.includes(i) ? "selected" : ""}`}
              onClick={() => handleTile(i)}
              disabled={!isMyTurn || !!room.winner}
            >
              {l}
              <span className="tile-val">{LETTER_VALS[l] || 0}</span>
            </button>
          ))}
        </div>

        {isMyTurn && !room.winner && (
          <>
            <div className="scrabble-actions">
              <button
                className="btn btn-primary"
                onClick={playWord}
                disabled={isChecking || roundWord.length < 2}
              >
                {isChecking ? "⏳ Vérification…" : "✅ Valider"}
              </button>
              <button className="btn btn-ghost" onClick={skip}>⏭ Passer mon tour</button>
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
        {(room.wordHistory || []).slice(-5).map((w, i) => (
          <div key={i} className="word-hist-row">
            <span>{w.player}</span>
            <strong>{w.word}</strong>
            <span style={{ color: w.pts > 0 ? "var(--green)" : "var(--primary)" }}>
              {w.pts > 0 ? "+" : ""}{w.pts} pts
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
