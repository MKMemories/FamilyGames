import { useState, useRef, useCallback } from "react";
import { dbRef, set, get, onValue, update, remove } from "./lib/firebase";
import { uid, getInitData, buildBag, MEMBER_PRESETS, GAMES } from "./lib/gameData";
import { HomeScreen } from "./components/HomeScreen";
import { PickScreen } from "./components/PickScreen";
import { SetupScreen } from "./components/SetupScreen";
import { LobbyScreen } from "./components/LobbyScreen";
import { ResultScreen } from "./components/ResultScreen";
import { Connect4 } from "./components/games/Connect4";
import { Checkers } from "./components/games/Checkers";
import { Chess } from "./components/games/Chess";
import { Scrabble } from "./components/games/Scrabble";
import { Quiz } from "./components/games/Quiz";
import { Defi } from "./components/games/Defi";
import { JustePrix } from "./components/games/JustePrix";
import { Dessin } from "./components/games/Dessin";
import { Toast } from "./components/Toast";
import type { AppState, GameId, Room } from "./types";

function App() {
  const [state, setState] = useState<AppState>({
    screen: "home",
    game: null,
    roomId: null,
    playerId: null,
    playerName: null,
    playerColor: null,
    isHost: false,
    isSolo: false,
    room: null,
  });
  const [toast, setToast] = useState("");
  const unsubs = useRef<(() => void)[]>([]);

  const showToast = (msg: string) => setToast(msg);

  const go = useCallback((screen: AppState["screen"]) => {
    setState(s => ({ ...s, screen }));
  }, []);

  const subscribeRoom = useCallback((roomId: string) => {
    unsubs.current.forEach(u => u());
    unsubs.current = [];
    const unsub = onValue(dbRef(`games/${roomId}`), snap => {
      const room = snap.val() as Room | null;
      if (!room) return;
      setState(s => {
        let nextScreen = s.screen;
        if (s.screen === "lobby" && room.status === "playing") nextScreen = "game";
        else if ((s.screen === "game" || s.screen === "lobby") && room.status === "finished") nextScreen = "result";
        return { ...s, room, screen: nextScreen };
      });
    });
    unsubs.current.push(() => unsub());
  }, []);

  const createRoom = async () => {
    const { game, playerId, playerName, playerColor } = state;
    if (!game || !playerId || !playerName) { showToast("Choisis ton prénom d'abord !"); return; }
    const roomId = uid();
    const preset = MEMBER_PRESETS.find(m => m.name === playerName);
    const playerObj = { id: playerId, name: playerName, color: playerColor || "#c9b8ff", emoji: preset?.emoji || "👤" };
    const initData = getInitData(game);
    const roomData = {
      id: roomId, game, status: "lobby",
      hostId: playerId,
      players: { [playerId]: playerObj },
      scores: { [playerId]: 0 },
      createdAt: Date.now(),
      ...initData,
    };
    await set(dbRef(`games/${roomId}`), roomData);
    setState(s => ({ ...s, roomId, isHost: true, isSolo: false, screen: "lobby" }));
    subscribeRoom(roomId);
  };

  const startSoloMode = async (gameId: GameId) => {
    const { playerId, playerName, playerColor } = state;
    if (!playerId || !playerName) { showToast("Choisis ton prénom d'abord !"); return; }
    const roomId = uid();
    const preset = MEMBER_PRESETS.find(m => m.name === playerName);
    const playerObj = { id: playerId, name: playerName, color: playerColor || "#c9b8ff", emoji: preset?.emoji || "👤" };
    const initData = getInitData(gameId);
    let extra: Record<string, any> = {};
    if (gameId === "scrabble") {
      let b = buildBag();
      const racks: Record<string, string[]> = {};
      racks[playerId] = b.slice(0, 7);
      b = b.slice(7);
      extra = { racks, bag: b };
    }
    const roomData: any = {
      id: roomId, game: gameId, status: "playing",
      hostId: playerId,
      players: { [playerId]: playerObj },
      scores: { [playerId]: 0 },
      createdAt: Date.now(),
      ...initData,
      ...extra,
    };
    await set(dbRef(`games/${roomId}`), roomData);
    setState(s => ({ ...s, game: gameId, roomId, isHost: true, isSolo: true, screen: "game" }));
    subscribeRoom(roomId);
  };

  const joinRoom = async (code: string) => {
    const { game, playerId, playerName, playerColor } = state;
    if (!game || !playerId || !playerName) { showToast("Choisis ton prénom d'abord !"); return; }
    const snap = await get(dbRef(`games/${code}`));
    if (!snap.exists()) { showToast("Salon introuvable !"); return; }
    const room = snap.val() as Room;
    if (room.game !== game) { showToast("Ce salon est pour un autre jeu !"); return; }
    const g = GAMES.find(x => x.id === game);
    if (Object.keys(room.players || {}).length >= (g?.max || 4)) { showToast("Salon complet !"); return; }
    const preset = MEMBER_PRESETS.find(m => m.name === playerName);
    const playerObj = { id: playerId, name: playerName, color: playerColor || "#c9b8ff", emoji: preset?.emoji || "👤" };
    await update(dbRef(`games/${code}/players`), { [playerId]: playerObj });
    setState(s => ({ ...s, roomId: code, isHost: false, isSolo: false, screen: "lobby" }));
    subscribeRoom(code);
  };

  const startGame = async () => {
    const { room, game, roomId } = state;
    if (!room || !game || !roomId) return;
    const players = Object.values(room.players || {});
    const g = GAMES.find(x => x.id === game);
    if (players.length < (g?.min || 2)) { showToast(`Il faut au moins ${g?.min || 2} joueurs !`); return; }
    let extra: Record<string, any> = {};
    if (game === "scrabble") {
      let b = buildBag();
      const racks: Record<string, string[]> = {};
      players.forEach(p => {
        racks[p.id] = b.slice(0, 7);
        b = b.slice(7);
      });
      extra = { racks, bag: b };
    }
    if (game === "dessin") {
      extra = { dessinTotalManches: players.length };
    }
    await update(dbRef(`games/${roomId}`), { status: "playing", ...extra });
  };

  const leaveRoom = async () => {
    const { roomId, playerId } = state;
    if (roomId && playerId) {
      await remove(dbRef(`games/${roomId}/players/${playerId}`));
    }
    unsubs.current.forEach(u => u());
    unsubs.current = [];
    setState(s => ({ ...s, room: null, roomId: null, isHost: false, isSolo: false, screen: "home" }));
  };

  const restartGame = async () => {
    const { game, roomId, isSolo, playerId, playerName, playerColor } = state;
    if (!game || !roomId) return;
    const initData = getInitData(game);
    if (isSolo && playerId && playerName) {
      const preset = MEMBER_PRESETS.find(m => m.name === playerName);
      const playerObj = { id: playerId, name: playerName, color: playerColor || "#c9b8ff", emoji: preset?.emoji || "👤" };
      let extra: Record<string, any> = {};
      if (game === "scrabble") {
        let b = buildBag();
        const racks: Record<string, string[]> = {};
        racks[playerId] = b.slice(0, 7);
        b = b.slice(7);
        extra = { racks, bag: b };
      }
      await update(dbRef(`games/${roomId}`), {
        status: "playing", winner: null,
        scores: { [playerId]: 0 },
        players: { [playerId]: playerObj },
        ...initData, ...extra,
      });
      go("game");
    } else {
      await update(dbRef(`games/${roomId}`), { status: "lobby", winner: null, scores: {}, ...initData });
      go("lobby");
    }
  };

  const handleSelectPlayer = (name: string, color: string) => {
    const id = name ? (MEMBER_PRESETS.find(m => m.name === name) ? name : name + Math.floor(Math.random() * 100)) : "";
    setState(s => ({ ...s, playerName: name || null, playerColor: color || null, playerId: id || null }));
  };

  const { screen, game, room, roomId, playerId, playerName, isHost, isSolo } = state;

  return (
    <>
      {screen === "home" && (
        <HomeScreen
          playerName={playerName}
          onSelectPlayer={handleSelectPlayer}
          onContinue={() => go("pick")}
          onToast={showToast}
        />
      )}

      {screen === "pick" && (
        <PickScreen
          onSelect={(g: GameId) => setState(s => ({ ...s, game: g, screen: "setup" }))}
          onBack={() => go("home")}
        />
      )}

      {screen === "setup" && game && (
        <SetupScreen
          game={game}
          onBack={() => go("pick")}
          onCreate={createRoom}
          onJoin={joinRoom}
          onSolo={() => startSoloMode(game)}
          onToast={showToast}
        />
      )}

      {screen === "lobby" && room && game && roomId && playerId && (
        <LobbyScreen
          room={room}
          game={game}
          roomId={roomId}
          playerId={playerId}
          isHost={isHost}
          onLeave={leaveRoom}
          onStart={startGame}
        />
      )}

      {screen === "game" && room && game && roomId && playerId && (
        <>
          {game === "connect4" && <Connect4 room={room} roomId={roomId} playerId={playerId} onLeave={leaveRoom} />}
          {game === "checkers" && <Checkers room={room} roomId={roomId} playerId={playerId} onLeave={leaveRoom} />}
          {game === "chess" && <Chess room={room} roomId={roomId} playerId={playerId} onLeave={leaveRoom} />}
          {game === "scrabble" && (
            <Scrabble
              room={room} roomId={roomId} playerId={playerId}
              isHost={isHost} isSolo={isSolo}
              onLeave={leaveRoom} onToast={showToast}
            />
          )}
          {game === "quiz" && (
            <Quiz
              room={room} roomId={roomId} playerId={playerId}
              isHost={isHost} isSolo={isSolo}
              onLeave={leaveRoom}
            />
          )}
          {game === "defi" && <Defi room={room} roomId={roomId} playerId={playerId} isHost={isHost} onLeave={leaveRoom} />}
          {game === "justeprix" && (
            <JustePrix room={room} roomId={roomId} playerId={playerId} isHost={isHost} isSolo={isSolo} onLeave={leaveRoom} />
          )}
          {game === "dessin" && (
            <Dessin room={room} roomId={roomId} playerId={playerId} isHost={isHost} isSolo={isSolo} onLeave={leaveRoom} />
          )}
        </>
      )}

      {screen === "result" && room && (
        <ResultScreen
          room={room}
          isHost={isHost}
          onRestart={restartGame}
          onHome={leaveRoom}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}

export default App;
