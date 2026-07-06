import { useState, useRef, useCallback, useEffect, lazy, Suspense } from "react";
import { dbRef, set, get, onValue, update, remove, removeOnDisconnect, cancelOnDisconnect } from "./lib/firebase";
import { uid, getInitData, buildBag, MEMBER_PRESETS, GAMES, AI_PLAYER, gameSupportsAI } from "./lib/gameData";
import { HomeScreen } from "./components/HomeScreen";
import { PickScreen } from "./components/PickScreen";
import { SetupScreen } from "./components/SetupScreen";
import { LobbyScreen } from "./components/LobbyScreen";
import { ResultScreen } from "./components/ResultScreen";
/* Chaque jeu est chargé à la demande (code-splitting) → démarrage instantané ;
   les gros jeux (ex. Chronovore/Three.js) ne pèsent plus sur le bundle initial. */
const Connect4 = lazy(() => import("./components/games/Connect4").then(m => ({ default: m.Connect4 })));
const Checkers = lazy(() => import("./components/games/Checkers").then(m => ({ default: m.Checkers })));
const Chess = lazy(() => import("./components/games/Chess").then(m => ({ default: m.Chess })));
const Scrabble = lazy(() => import("./components/games/Scrabble").then(m => ({ default: m.Scrabble })));
const QuizMix = lazy(() => import("./components/games/QuizMix").then(m => ({ default: m.QuizMix })));
const Defi = lazy(() => import("./components/games/Defi").then(m => ({ default: m.Defi })));
const JustePrix = lazy(() => import("./components/games/JustePrix").then(m => ({ default: m.JustePrix })));
const Dessin = lazy(() => import("./components/games/Dessin").then(m => ({ default: m.Dessin })));
const Chronovore = lazy(() => import("./components/games/Chronovore").then(m => ({ default: m.Chronovore })));
const Imposteur = lazy(() => import("./components/games/Imposteur").then(m => ({ default: m.Imposteur })));
const QuiDeNous = lazy(() => import("./components/games/QuiDeNous").then(m => ({ default: m.QuiDeNous })));
const BatailleNavale = lazy(() => import("./components/games/BatailleNavale").then(m => ({ default: m.BatailleNavale })));
const Morpion = lazy(() => import("./components/games/Morpion").then(m => ({ default: m.Morpion })));
const PetitBac = lazy(() => import("./components/games/PetitBac").then(m => ({ default: m.PetitBac })));
const Bombe = lazy(() => import("./components/games/Bombe").then(m => ({ default: m.Bombe })));
const Des = lazy(() => import("./components/games/Des").then(m => ({ default: m.Des })));
const Blokus = lazy(() => import("./components/games/Blokus").then(m => ({ default: m.Blokus })));
const ScrabbleBoard = lazy(() => import("./components/games/ScrabbleBoard").then(m => ({ default: m.ScrabbleBoard })));
const Monopoly = lazy(() => import("./components/games/Monopoly").then(m => ({ default: m.Monopoly })));
const Uno = lazy(() => import("./components/games/Uno").then(m => ({ default: m.Uno })));
const Marque = lazy(() => import("./components/games/Marque").then(m => ({ default: m.Marque })));
import { Toast } from "./components/Toast";
import { ThemeToggle } from "./components/ThemeToggle";
import { SoundToggle } from "./components/SoundToggle";
import { RulesSheet } from "./components/RulesSheet";
import { useTheme } from "./hooks/useTheme";
import { rankPoints, accumulate, pickNextPartyGame, canParty } from "./lib/party";
import { recordPlay } from "./lib/gameStats";
import type { AppState, GameId, Room, Difficulty } from "./types";

/* ── Reprise de session : on garde de quoi rejoindre le salon après un
   rafraîchissement ou une mise en veille du téléphone. ── */
const SESSION_KEY = "khelij_session";
interface SavedSession {
  roomId: string; game: GameId; playerId: string; playerName: string; playerColor: string; emoji: string; avatar?: string;
}
function saveSession(s: SavedSession) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}
function loadSession(): SavedSession | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}
function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

function App() {
  const [state, setState] = useState<AppState>({
    screen: "home",
    game: null,
    roomId: null,
    playerId: null,
    playerName: null,
    playerColor: null,
    playerAvatar: null,
    isHost: false,
    isSolo: false,
    room: null,
  });
  const [toast, setToast] = useState("");
  const unsubs = useRef<(() => void)[]>([]);
  const playRef = useRef<{ game: GameId; t: number } | null>(null);
  const { theme, toggle: toggleTheme } = useTheme();

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
        // Follow the room status from ANY in-game screen (incl. "result"), so
        // restarts move everyone lobby↔game↔result together — no stuck clients.
        if (s.screen === "lobby" || s.screen === "game" || s.screen === "result") {
          if (room.status === "playing") nextScreen = "game";
          else if (room.status === "finished") nextScreen = "result";
          else if (room.status === "lobby") nextScreen = "lobby";
        }
        return { ...s, room, screen: nextScreen };
      });
    });
    unsubs.current.push(() => unsub());
  }, []);

  /* ── Reprise de connexion : après un rafraîchissement / une veille, on
     rejoint automatiquement le même salon (le joueur retrouve sa partie). ── */
  const didReconnect = useRef(false);
  useEffect(() => {
    if (didReconnect.current) return;
    didReconnect.current = true;
    const sess = loadSession();
    if (!sess) return;
    (async () => {
      const snap = await get(dbRef(`games/${sess.roomId}`));
      const r = snap.exists() ? (snap.val() as Room) : null;
      if (!r) { clearSession(); return; }
      const playerObj = { id: sess.playerId, name: sess.playerName, color: sess.playerColor, emoji: sess.emoji, ...(sess.avatar ? { avatar: sess.avatar } : {}) };
      await update(dbRef(`games/${sess.roomId}/players`), { [sess.playerId]: playerObj });
      if ((r.scores || {})[sess.playerId] === undefined) {
        await update(dbRef(`games/${sess.roomId}/scores`), { [sess.playerId]: 0 });
      }
      removeOnDisconnect(`games/${sess.roomId}/players/${sess.playerId}`);
      const screen = r.status === "playing" ? "game" : r.status === "finished" ? "result" : "lobby";
      setState(s => ({
        ...s, game: sess.game, roomId: sess.roomId, playerId: sess.playerId,
        playerName: sess.playerName, playerColor: sess.playerColor, playerAvatar: sess.avatar || null, isSolo: false, screen, room: r,
      }));
      subscribeRoom(sess.roomId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Migration d'hôte : si l'hôte n'est plus dans le salon (parti / déconnecté),
     les joueurs restants élisent le même remplaçant (id le plus petit) ; seul
     l'élu écrit hostId → aucune course, la partie ne se fige jamais. ── */
  useEffect(() => {
    if (!state.room || !state.roomId || !state.playerId || state.isSolo) return;
    const ids = Object.keys(state.room.players || {});
    if (ids.length === 0) return;
    if (state.room.hostId && ids.includes(state.room.hostId)) return; // hôte présent
    const newHost = [...ids].sort()[0];
    if (newHost === state.playerId) update(dbRef(`games/${state.roomId}`), { hostId: newHost });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.room?.hostId, state.room?.players, state.roomId, state.playerId]);

  const createRoom = async () => {
    const { game, playerId, playerName, playerColor, playerAvatar } = state;
    if (!game || !playerId || !playerName) { showToast("Choisis ton prénom d'abord !"); return; }
    const roomId = uid();
    const preset = MEMBER_PRESETS.find(m => m.name === playerName);
    const playerObj = { id: playerId, name: playerName, color: playerColor || "#c9b8ff", emoji: preset?.emoji || "👤", ...(playerAvatar ? { avatar: playerAvatar } : {}) };
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
    saveSession({ roomId, game, playerId, playerName, playerColor: playerObj.color, emoji: playerObj.emoji, avatar: playerAvatar || undefined });
    removeOnDisconnect(`games/${roomId}/players/${playerId}`);
    setState(s => ({ ...s, roomId, isHost: true, isSolo: false, screen: "lobby" }));
    subscribeRoom(roomId);
  };

  const startSoloMode = async (gameId: GameId, difficulty?: Difficulty) => {
    const { playerId, playerName, playerColor, playerAvatar } = state;
    if (!playerId || !playerName) { showToast("Choisis ton prénom d'abord !"); return; }
    const roomId = uid();
    const preset = MEMBER_PRESETS.find(m => m.name === playerName);
    const playerObj = { id: playerId, name: playerName, color: playerColor || "#c9b8ff", emoji: preset?.emoji || "👤", ...(playerAvatar ? { avatar: playerAvatar } : {}) };
    const initData = getInitData(gameId);
    let extra: Record<string, any> = {};
    if (gameId === "scrabble") {
      let b = buildBag();
      const racks: Record<string, string[]> = {};
      racks[playerId] = b.slice(0, 7);
      b = b.slice(7);
      extra = { racks, bag: b };
    }

    // Solo vs computer: add the AI as a second player (games that support it).
    const players: Record<string, any> = { [playerId]: playerObj };
    const scores: Record<string, number> = { [playerId]: 0 };
    let aiFields: Record<string, any> = {};
    if (difficulty && gameSupportsAI(gameId)) {
      players[AI_PLAYER.id] = { ...AI_PLAYER };
      scores[AI_PLAYER.id] = 0;
      aiFields = { aiId: AI_PLAYER.id, soloDifficulty: difficulty };
    }

    const roomData: any = {
      id: roomId, game: gameId, status: "playing",
      hostId: playerId,
      players,
      scores,
      createdAt: Date.now(),
      ...initData,
      ...extra,
      ...aiFields,
    };
    await set(dbRef(`games/${roomId}`), roomData);
    setState(s => ({ ...s, game: gameId, roomId, isHost: true, isSolo: true, screen: "game" }));
    subscribeRoom(roomId);
  };

  const joinRoom = async (code: string) => {
    const { game, playerId, playerName, playerColor, playerAvatar } = state;
    if (!game || !playerId || !playerName) { showToast("Choisis ton prénom d'abord !"); return; }
    const snap = await get(dbRef(`games/${code}`));
    if (!snap.exists()) { showToast("Salon introuvable !"); return; }
    const room = snap.val() as Room;
    if (room.game !== game) { showToast("Ce salon est pour un autre jeu !"); return; }
    const g = GAMES.find(x => x.id === game);
    if (Object.keys(room.players || {}).length >= (g?.max || 4)) { showToast("Salon complet !"); return; }
    const preset = MEMBER_PRESETS.find(m => m.name === playerName);
    const playerObj = { id: playerId, name: playerName, color: playerColor || "#c9b8ff", emoji: preset?.emoji || "👤", ...(playerAvatar ? { avatar: playerAvatar } : {}) };
    await update(dbRef(`games/${code}/players`), { [playerId]: playerObj });
    saveSession({ roomId: code, game, playerId, playerName, playerColor: playerObj.color, emoji: playerObj.emoji, avatar: playerAvatar || undefined });
    removeOnDisconnect(`games/${code}/players/${playerId}`);
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
    clearSession();
    if (roomId && playerId) {
      cancelOnDisconnect(`games/${roomId}/players/${playerId}`);
      await remove(dbRef(`games/${roomId}/players/${playerId}`));
    }
    unsubs.current.forEach(u => u());
    unsubs.current = [];
    setState(s => ({ ...s, room: null, roomId: null, isHost: false, isSolo: false, screen: "home" }));
  };

  const restartGame = async () => {
    const { game, roomId, isSolo, playerId, playerName, playerColor, playerAvatar } = state;
    if (!game || !roomId) return;
    const initData = getInitData(game);
    if (isSolo && playerId && playerName) {
      const preset = MEMBER_PRESETS.find(m => m.name === playerName);
      const playerObj = { id: playerId, name: playerName, color: playerColor || "#c9b8ff", emoji: preset?.emoji || "👤", ...(playerAvatar ? { avatar: playerAvatar } : {}) };
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

  /* ── Soirée famille : enchaîne un nouveau jeu en cumulant les points. ── */
  const partyAdvance = async (initParty: boolean) => {
    const { room, roomId } = state;
    if (!room || !room.game || !roomId) return;
    const playerIds = Object.keys(room.players || {});
    const gained = rankPoints(room.scores || {}, playerIds);
    const partyScores = accumulate(initParty ? {} : (room.partyScores || {}), gained);
    const next = pickNextPartyGame(playerIds.length, room.game, Math.random());
    const freshScores: Record<string, number> = {};
    playerIds.forEach(id => { freshScores[id] = 0; });
    await update(dbRef(`games/${roomId}`), {
      game: next,
      ...getInitData(next),
      scores: freshScores,
      status: "playing",
      winner: null,
      partyMode: true,
      partyScores,
      partyIndex: (room.partyIndex || 0) + 1,
      partyFinished: false,
    });
  };
  const partyEnd = async () => {
    const { room, roomId } = state;
    if (!room || !roomId) return;
    const playerIds = Object.keys(room.players || {});
    const gained = rankPoints(room.scores || {}, playerIds);
    const partyScores = accumulate(room.partyScores || {}, gained);
    const winnerId = [...playerIds].sort((a, b) => (partyScores[b] || 0) - (partyScores[a] || 0))[0];
    const winner = (room.players || {})[winnerId]?.name || "?";
    await update(dbRef(`games/${roomId}`), { partyScores, partyFinished: true, winner });
  };

  const handleSelectPlayer = (name: string, color: string, avatar?: string) => {
    const id = name ? (MEMBER_PRESETS.find(m => m.name === name) ? name : name + Math.floor(Math.random() * 100)) : "";
    setState(s => ({ ...s, playerName: name || null, playerColor: color || null, playerId: id || null, playerAvatar: avatar ?? s.playerAvatar }));
  };
  const handleSetAvatar = (avatar: string) => setState(s => ({ ...s, playerAvatar: avatar }));

  const { screen, game, room, roomId, playerId, playerName, isSolo } = state;
  // L'hôte est DÉRIVÉ de room.hostId → la migration d'hôte prend effet
  // instantanément partout (sinon l'ancien hôte parti fige la partie).
  const isHost = room && playerId ? room.hostId === playerId : state.isHost;
  // Le jeu actif suit room.game (le mode Soirée le change entre deux manches).
  const activeGame = (room?.game ?? game) as GameId | null;

  /* ── Statistiques de temps de jeu (local) : on chronomètre chaque jeu tant
     qu'on est sur l'écran de partie, pour remonter les plus joués en tête. ── */
  useEffect(() => {
    const now = Date.now();
    const cur = playRef.current;
    if (screen === "game" && activeGame) {
      if (!cur || cur.game !== activeGame) {
        if (cur) recordPlay(cur.game, (now - cur.t) / 1000, now);   // changement de jeu (Soirée)
        playRef.current = { game: activeGame, t: now };
      }
    } else if (cur) {
      recordPlay(cur.game, (now - cur.t) / 1000, now);              // on quitte la partie
      playRef.current = null;
    }
  }, [screen, activeGame]);

  /* Sauvegarde la session en cours si l'onglet se ferme/masque. */
  useEffect(() => {
    const flush = () => { const c = playRef.current; if (c && document.visibilityState === "hidden") { recordPlay(c.game, (Date.now() - c.t) / 1000, Date.now()); playRef.current = null; } };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, []);

  return (
    <>
      <SoundToggle />
      {screen !== "game" && <ThemeToggle theme={theme} onToggle={toggleTheme} />}

      {screen === "home" && (
        <HomeScreen
          playerName={playerName}
          playerAvatar={state.playerAvatar}
          onSelectPlayer={handleSelectPlayer}
          onSetAvatar={handleSetAvatar}
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
          onSolo={(d?: Difficulty) => startSoloMode(game, d)}
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

      {screen === "game" && room && activeGame && roomId && playerId && (
        <Suspense fallback={<div className="screen" style={{ display: "grid", placeItems: "center" }}><div className="spinner" /></div>}>
          {activeGame !== "chronovore" && <RulesSheet gameId={activeGame} />}
          {activeGame === "connect4" && <Connect4 room={room} roomId={roomId} playerId={playerId} onLeave={leaveRoom} />}
          {activeGame === "checkers" && <Checkers room={room} roomId={roomId} playerId={playerId} onLeave={leaveRoom} />}
          {activeGame === "chess" && <Chess room={room} roomId={roomId} playerId={playerId} onLeave={leaveRoom} />}
          {activeGame === "scrabble" && (
            <Scrabble
              room={room} roomId={roomId} playerId={playerId}
              isHost={isHost} isSolo={isSolo}
              onLeave={leaveRoom} onToast={showToast}
            />
          )}
          {activeGame === "quiz" && (
            <QuizMix
              room={room} roomId={roomId} playerId={playerId}
              isHost={isHost} isSolo={isSolo}
              onLeave={leaveRoom}
            />
          )}
          {activeGame === "defi" && <Defi room={room} roomId={roomId} playerId={playerId} isHost={isHost} onLeave={leaveRoom} />}
          {activeGame === "justeprix" && (
            <JustePrix room={room} roomId={roomId} playerId={playerId} isHost={isHost} isSolo={isSolo} onLeave={leaveRoom} />
          )}
          {activeGame === "marque" && (
            <Marque room={room} roomId={roomId} playerId={playerId} isHost={isHost} isSolo={isSolo} onLeave={leaveRoom} />
          )}
          {activeGame === "dessin" && (
            <Dessin room={room} roomId={roomId} playerId={playerId} isHost={isHost} isSolo={isSolo} onLeave={leaveRoom} />
          )}
          {activeGame === "chronovore" && <Chronovore onLeave={leaveRoom} />}
          {activeGame === "imposteur" && (
            <Imposteur room={room} roomId={roomId} playerId={playerId} isHost={isHost} isSolo={isSolo} onLeave={leaveRoom} onToast={showToast} />
          )}
          {activeGame === "quidenous" && (
            <QuiDeNous room={room} roomId={roomId} playerId={playerId} isHost={isHost} isSolo={isSolo} onLeave={leaveRoom} onToast={showToast} />
          )}
          {activeGame === "bataille" && (
            <BatailleNavale room={room} roomId={roomId} playerId={playerId} isHost={isHost} isSolo={isSolo} onLeave={leaveRoom} onToast={showToast} />
          )}
          {activeGame === "morpion" && (
            <Morpion room={room} roomId={roomId} playerId={playerId} isHost={isHost} isSolo={isSolo} onLeave={leaveRoom} onToast={showToast} />
          )}
          {activeGame === "petitbac" && (
            <PetitBac room={room} roomId={roomId} playerId={playerId} isHost={isHost} isSolo={isSolo} onLeave={leaveRoom} onToast={showToast} />
          )}
          {activeGame === "bombe" && (
            <Bombe room={room} roomId={roomId} playerId={playerId} isHost={isHost} isSolo={isSolo} onLeave={leaveRoom} onToast={showToast} />
          )}
          {activeGame === "des" && (
            <Des room={room} roomId={roomId} playerId={playerId} isHost={isHost} isSolo={isSolo} onLeave={leaveRoom} onToast={showToast} />
          )}
          {activeGame === "blokus" && (
            <Blokus room={room} roomId={roomId} playerId={playerId} isHost={isHost} isSolo={isSolo} onLeave={leaveRoom} onToast={showToast} />
          )}
          {activeGame === "grandscrabble" && (
            <ScrabbleBoard room={room} roomId={roomId} playerId={playerId} isHost={isHost} isSolo={isSolo} onLeave={leaveRoom} onToast={showToast} />
          )}
          {activeGame === "monopoly" && (
            <Monopoly room={room} roomId={roomId} playerId={playerId} isHost={isHost} isSolo={isSolo} onLeave={leaveRoom} onToast={showToast} />
          )}
          {activeGame === "uno" && (
            <Uno room={room} roomId={roomId} playerId={playerId} isHost={isHost} isSolo={isSolo} onLeave={leaveRoom} onToast={showToast} />
          )}
        </Suspense>
      )}

      {screen === "result" && room && (
        <ResultScreen
          room={room}
          isHost={isHost}
          canParty={!isSolo && !!activeGame && canParty(activeGame, Object.keys(room.players || {}).length)}
          onRestart={restartGame}
          onHome={leaveRoom}
          onPartyStart={() => partyAdvance(true)}
          onPartyNext={() => partyAdvance(false)}
          onPartyEnd={partyEnd}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}

export default App;
