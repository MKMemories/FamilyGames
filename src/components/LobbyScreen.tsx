import { GAMES } from "../lib/gameData";
import { Avatar } from "./Avatar";
import { decodeAvatar } from "../lib/avatar";
import type { Room, GameId } from "../types";

interface LobbyScreenProps {
  room: Room;
  game: GameId;
  roomId: string;
  playerId: string;
  isHost: boolean;
  onLeave: () => void;
  onStart: () => void;
}

export function LobbyScreen({ room, game, roomId, playerId, isHost, onLeave, onStart }: LobbyScreenProps) {
  const players = Object.values(room.players || {});
  const g = GAMES.find(x => x.id === game)!;
  const canStart = isHost && players.length >= g.min && players.length <= g.max;

  const emptySlots = Math.max(0, g.max - players.length);

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <h2>Salle d'attente</h2>
        <div style={{ width: 40 }} />
      </div>

      <div className="room-code-box">
        <div className="code-label">Code du salon</div>
        <div className="code-display">{roomId}</div>
        <div className="code-hint">Partage ce code aux autres joueurs</div>
      </div>

      <div className="players-list">
        {players.map(p => (
          <div key={p.id} className="player-row" style={{ "--pc": p.color } as React.CSSProperties}>
            {decodeAvatar(p.avatar)
              ? <Avatar a={decodeAvatar(p.avatar)!} size={46} />
              : <div className="player-avatar">{p.emoji || "👤"}</div>}
            <div className="player-info">
              <div className="player-name">{p.name}</div>
              <div className="player-status">
                {p.id === room.hostId ? "👑 Hôte" : "✅ Prêt"}
              </div>
            </div>
          </div>
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={i} className="player-row empty">
            <div className="player-avatar">?</div>
            <div className="player-info">
              <div className="player-name" style={{ color: "var(--muted)" }}>En attente…</div>
            </div>
          </div>
        ))}
      </div>

      <div className="lobby-info">
        Jeu : {g.emoji} {g.name} · {g.min}–{g.max} joueurs
      </div>

      {isHost ? (
        <button
          className={`btn btn-primary big-btn ${canStart ? "" : "disabled"}`}
          onClick={canStart ? onStart : undefined}
          disabled={!canStart}
        >
          {canStart ? "🚀 Lancer la partie !" : "En attente des joueurs…"}
        </button>
      ) : (
        <div className="waiting-host">
          <div className="pulse-dot" />
          En attente que l'hôte lance…
        </div>
      )}
    </div>
  );
}
