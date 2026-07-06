import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { dbRef, update } from "../../lib/firebase";
import { fx } from "../../lib/sound";
import { useSoloAI } from "../../hooks/useSoloAI";
import type { Room } from "../../types";
import type { Coord, Piece } from "../../lib/blokusPieces";
import { PIECES, ALL_PIECE_IDS, getPiece } from "../../lib/blokusPieces";
import {
  orient,
  placementCells,
  isLegalPlacement,
  hasAnyLegalMove,
  countOwnerCells,
  nextActiveTurn,
  everyonePassed,
  startCorner,
} from "../../lib/blokusRules";
import { bestBlokusMove } from "../../lib/blokusAI";

/* ══════════════════════════════════════════════════════════════════════════
   TERRITOIRES — un jeu de territoire à la Blokus (2–4 joueurs).
   Chaque joueur part d'un coin. On pose des polyominos qui doivent se toucher
   par les coins (jamais par les côtés) avec sa propre couleur. Bloqué ? On
   passe. Le plus de cases posées gagne.
   Source de vérité : room.blk* (voir types.ts). Seul le joueur courant écrit.
   ══════════════════════════════════════════════════════════════════════════ */

const BOARD_SIZE = 14;

// 4 couleurs distinctes, indexées par la place (siège) du joueur.
const PLAYER_COLORS = ["#2f7bed", "#f5a623", "#e5484d", "#33b96a"];
const colorFor = (seat: number) => PLAYER_COLORS[seat % PLAYER_COLORS.length];

interface BlokusProps {
  room: Room;
  roomId: string;
  playerId: string;
  isHost: boolean;
  isSolo: boolean;
  onLeave: () => void;
  onToast: (m: string) => void;
}

function pieceBox(cells: Coord[]): { rows: number; cols: number } {
  let maxR = 0, maxC = 0;
  for (const [r, c] of cells) {
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  }
  return { rows: maxR + 1, cols: maxC + 1 };
}

/** Small static glyph of a piece (used in tray + preview). */
function PieceGlyph({ cells, color, cell }: { cells: Coord[]; color: string; cell: number }) {
  const { rows, cols } = pieceBox(cells);
  const set = new Set(cells.map(c => c[0] + "," + c[1]));
  return (
    <div
      className="blk-glyph"
      style={{ gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gridTemplateRows: `repeat(${rows}, ${cell}px)` }}
    >
      {Array.from({ length: rows * cols }).map((_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const on = set.has(r + "," + c);
        return (
          <div
            key={i}
            className={`blk-glyph-cell ${on ? "on" : ""}`}
            style={on ? { background: color } : undefined}
          />
        );
      })}
    </div>
  );
}

export function Blokus({ room, roomId, playerId, isHost, isSolo, onLeave, onToast }: BlokusProps) {
  /* ── Lectures défensives ── */
  const players = Object.values(room.players || {});
  const board = room.blkBoard ?? null;
  const size = room.blkSize ?? BOARD_SIZE;
  const turn = room.blkTurn ?? 0;
  const order = room.blkOrder ?? [];
  const remaining = room.blkRemaining ?? {};
  const passed = room.blkPassed ?? {};
  const lastCells = room.blkLastCells ?? [];
  const aiId = room.aiId;

  const started = !!board && order.length > 0;
  const myIndex = order.indexOf(playerId);
  const owner = myIndex + 1;
  const currentId = order[turn];
  const allPassed = everyonePassed(order, passed);
  const isMyTurn = started && !allPassed && currentId === playerId && !room.winner;

  /* ── État UI local (jamais dans Firebase) ── */
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rot, setRot] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [target, setTarget] = useState<Coord | null>(null);
  const [hover, setHover] = useState<Coord | null>(null);

  // Nouveau tour → on remet à zéro la sélection.
  useEffect(() => {
    setSelectedId(null);
    setTarget(null);
    setHover(null);
    setRot(0);
    setFlipped(false);
  }, [turn, roomId, started]);

  const selectedPiece: Piece | undefined =
    selectedId != null ? getPiece(selectedId) : undefined;
  const orientCells = useMemo(
    () => (selectedPiece ? orient(selectedPiece.cells, rot, flipped) : []),
    [selectedPiece, rot, flipped],
  );

  const previewAnchor = target ?? hover;
  const previewAbs: Coord[] =
    selectedPiece && previewAnchor ? placementCells(orientCells, previewAnchor) : [];
  const previewLegal =
    board != null && isMyTurn && previewAbs.length > 0 &&
    isLegalPlacement(board, owner, previewAbs, size);
  const previewSet = new Set(previewAbs.map(c => c[0] + "," + c[1]));
  const lastSet = new Set(lastCells.map(c => c[0] + "," + c[1]));

  // Coins de départ (repères visuels sur les cases vides).
  const cornerColor = useMemo(() => {
    const map: Record<string, string> = {};
    order.forEach((_pid, i) => {
      const [r, c] = startCorner(i, size);
      map[r + "," + c] = colorFor(i);
    });
    return map;
  }, [order, size]);

  const myRemaining = remaining[playerId] ?? [];
  const myHasMove = useMemo(() => {
    if (board == null || !isMyTurn) return true;
    return hasAnyLegalMove(board, owner, myRemaining, size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, isMyTurn, turn]);

  /* ════════════════════════════════════════════════════════════════════════
     ACTIONS — le joueur courant est le SEUL à écrire → aucune course.
     ════════════════════════════════════════════════════════════════════════ */

  const startGame = () => {
    const ids = players.map(p => p.id);
    if (ids.length < 2) { onToast("Il faut au moins 2 joueurs"); return; }
    const n = BOARD_SIZE;
    const emptyBoard = Array.from({ length: n }, () => Array<number>(n).fill(0));
    const rem: Record<string, number[]> = {};
    ids.forEach(id => { rem[id] = ALL_PIECE_IDS.slice(); });
    update(dbRef(`games/${roomId}`), {
      blkBoard: emptyBoard,
      blkOrder: ids,
      blkRemaining: rem,
      blkPassed: {},
      blkTurn: 0,
      blkSize: n,
      blkLastCells: [],
    });
  };

  const placeAt = (mover: string, moverIndex: number, abs: Coord[], pieceId: number) => {
    if (board == null) return;
    const nb = board.map(row => row.slice());
    for (const [r, c] of abs) nb[r][c] = moverIndex + 1;
    const rem = (remaining[mover] ?? []).filter(id => id !== pieceId);
    const nextTurn = nextActiveTurn(turn, order, passed);
    fx("place");
    update(dbRef(`games/${roomId}`), {
      blkBoard: nb,
      [`blkRemaining/${mover}`]: rem,
      blkLastCells: abs,
      blkTurn: nextTurn,
    });
  };

  const passFor = (mover: string) => {
    const np = { ...passed, [mover]: true };
    update(dbRef(`games/${roomId}`), {
      [`blkPassed/${mover}`]: true,
      blkTurn: nextActiveTurn(turn, order, np),
    });
  };

  const commit = () => {
    if (board == null || !selectedPiece || !target) return;
    const abs = placementCells(orientCells, target);
    if (!isLegalPlacement(board, owner, abs, size)) {
      onToast("Placement invalide");
      return;
    }
    placeAt(playerId, myIndex, abs, selectedPiece.id);
    setSelectedId(null);
    setTarget(null);
    setHover(null);
  };

  const passTurn = () => {
    if (board == null || !isMyTurn) return;
    passFor(playerId);
    setSelectedId(null);
    setTarget(null);
  };

  const onCellClick = (r: number, c: number) => {
    if (!isMyTurn || board == null) return;
    if (!selectedPiece) { onToast("Choisis d'abord une pièce"); return; }
    // Deuxième tap sur la même case = valider ; sinon on positionne le fantôme.
    if (target && target[0] === r && target[1] === c) { commit(); return; }
    setTarget([r, c]);
  };

  const selectPiece = (id: number) => {
    if (!isMyTurn) return;
    setSelectedId(prev => (prev === id ? null : id));
    setRot(0);
    setFlipped(false);
    setTarget(null);
    setHover(null);
  };

  /* ════════════════════════════════════════════════════════════════════════
     AUTO-PASS — si le joueur courant n'a aucun coup, il passe (jamais bloqué).
     Une seule écriture par tour grâce au ref.
     ════════════════════════════════════════════════════════════════════════ */
  const autoPassRef = useRef<number>(-1);
  useEffect(() => {
    if (board == null || !isMyTurn) return;
    if (aiId && currentId === aiId) return; // l'IA gère son propre passage
    if (myHasMove) return;
    if (autoPassRef.current === turn) return;
    autoPassRef.current = turn;
    onToast("Aucun coup possible — tu passes");
    passFor(playerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, isMyTurn, turn, myHasMove]);

  /* ════════════════════════════════════════════════════════════════════════
     IA SOLO — pilotée sur le client de l'hôte via useSoloAI.
     ════════════════════════════════════════════════════════════════════════ */
  const filled = board ? board.reduce((s, row) => s + row.reduce((x, v) => x + (v ? 1 : 0), 0), 0) : 0;
  const aiSeat = aiId ? order.indexOf(aiId) : -1;
  const aiTurn = !!aiId && started && !allPassed && !room.winner && currentId === aiId && aiSeat >= 0;
  useSoloAI(aiTurn, `${turn}-${filled}`, () => {
    if (board == null || aiSeat < 0 || !aiId) return;
    const rem = remaining[aiId] ?? [];
    const mv = bestBlokusMove(board, aiSeat, rem, size, room.soloDifficulty || "moyen");
    if (!mv) { passFor(aiId); return; }
    placeAt(aiId, aiSeat, mv.cells, mv.pieceId);
  }, 700);

  /* ════════════════════════════════════════════════════════════════════════
     FIN DE PARTIE — l'hôte écrit une seule fois quand tout le monde a passé.
     ════════════════════════════════════════════════════════════════════════ */
  const finishRef = useRef(false);
  useEffect(() => {
    if (!isHost || board == null) return;
    if (room.status === "finished" || room.winner) return;
    if (!allPassed) return;
    if (finishRef.current) return;
    finishRef.current = true;
    const scores: Record<string, number> = {};
    order.forEach((pid, i) => { scores[pid] = countOwnerCells(board, i + 1); });
    let winnerId = order[0];
    order.forEach(pid => { if (scores[pid] > scores[winnerId]) winnerId = pid; });
    const winnerName = room.players?.[winnerId]?.name || "?";
    update(dbRef(`games/${roomId}`), { status: "finished", winner: winnerName, scores });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, board, allPassed]);

  /* ════════════════════════════════════════════════════════════════════════
     RENDER — écran de démarrage
     ════════════════════════════════════════════════════════════════════════ */
  if (!started) {
    return (
      <div className="screen game-screen blk-screen">
        <style>{CSS}</style>
        <div className="game-topbar">
          <button className="btn-back" onClick={onLeave}>✕</button>
          <div className="turn-indicator">🧩 Territoires</div>
          <div className="score-mini" />
        </div>

        <div className="blk-start">
          <div className="blk-start-emoji">🧩</div>
          <h1 className="blk-start-title">Territoires</h1>
          <p className="blk-start-sub">
            Pars de ton coin et pose tes pièces. Chaque nouvelle pièce doit toucher
            ta couleur <b>par un coin</b>, jamais par un côté. Bloque les autres,
            conquiers le plateau : le plus de cases posées l'emporte !
          </p>

          <div className="blk-start-seats">
            {players.map((p, i) => (
              <div key={p.id} className="blk-seat">
                <span className="blk-seat-dot" style={{ background: colorFor(i) }} />
                <span className="blk-seat-name">{p.name}</span>
              </div>
            ))}
          </div>

          {isHost ? (
            <>
              <button className="blk-btn blk-btn-primary" onClick={startGame}>Commencer →</button>
              {players.length < 2 && (
                <div className="blk-hint">Il faut au moins 2 joueurs pour lancer.</div>
              )}
            </>
          ) : (
            <div className="blk-waiting"><span className="blk-dot-pulse" /> En attente de l'hôte…</div>
          )}
          {isSolo && players.length < 2 && (
            <div className="blk-hint">Mode solo : ajoute un ordinateur ou des joueurs.</div>
          )}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════════
     RENDER — plateau de jeu
     ════════════════════════════════════════════════════════════════════════ */
  const currentPlayer = room.players?.[currentId];
  const currentSeat = turn;
  const turnLabel = isMyTurn
    ? "🟢 Ton tour"
    : aiTurn
      ? `🤖 ${currentPlayer?.name || "Ordinateur"} réfléchit…`
      : `⏳ ${currentPlayer?.name || "…"}`;

  return (
    <div className="screen game-screen blk-screen">
      <style>{CSS}</style>

      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className={`turn-indicator ${isMyTurn ? "mine" : "waiting"}`}>{turnLabel}</div>
        <div className="score-mini">
          {order.map((pid, i) => (
            <span key={pid} style={{ color: colorFor(i) }}>
              {(room.players?.[pid]?.name || "?").slice(0, 4)} {board ? countOwnerCells(board, i + 1) : 0}
            </span>
          ))}
        </div>
      </div>

      {room.winner && <div className="win-banner">🎉 {room.winner} conquiert le plateau !</div>}

      {/* Scoreboard des joueurs */}
      <div className="blk-players">
        {order.map((pid, i) => {
          const p = room.players?.[pid];
          const isCur = i === currentSeat && !allPassed && !room.winner;
          const rem = (remaining[pid] ?? []).length;
          return (
            <div key={pid} className={`blk-pchip ${isCur ? "cur" : ""}`} style={isCur ? { borderColor: colorFor(i) } : undefined}>
              <span className="blk-pdot" style={{ background: colorFor(i) }} />
              <span className="blk-pname">{p?.name || "?"}</span>
              {passed[pid]
                ? <span className="blk-ppassed">passé</span>
                : <span className="blk-pcount">{board ? countOwnerCells(board, i + 1) : 0}★ · {rem}▮</span>}
            </div>
          );
        })}
      </div>

      {/* Plateau */}
      <div className="blk-board-wrap">
        <div
          className="blk-board"
          style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, gridTemplateRows: `repeat(${size}, 1fr)` }}
          onPointerLeave={() => setHover(null)}
        >
          {board!.map((row, r) =>
            row.map((v, c) => {
              const kk = r + "," + c;
              const inPreview = previewSet.has(kk);
              const isLast = lastSet.has(kk);
              const corner = v === 0 ? cornerColor[kk] : undefined;
              const cls = [
                "blk-cell",
                v ? "filled" : "",
                inPreview ? (previewLegal ? "gok" : "gbad") : "",
                isLast ? "last" : "",
              ].filter(Boolean).join(" ");
              return (
                <div
                  key={kk}
                  className={cls}
                  onClick={() => onCellClick(r, c)}
                  onPointerEnter={() => { if (isMyTurn && selectedPiece && !target) setHover([r, c]); }}
                >
                  {v > 0 && (
                    <motion.div
                      className="blk-fill"
                      style={{ background: colorFor(v - 1) }}
                      initial={{ scale: 0.25, opacity: 0.4 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 520, damping: 26 }}
                    />
                  )}
                  {corner && !inPreview && (
                    <span className="blk-corner" style={{ background: corner }} />
                  )}
                  {inPreview && (
                    <span className="blk-ghost" style={{ background: previewLegal ? colorFor(owner - 1) : "var(--danger)" }} />
                  )}
                </div>
              );
            }),
          )}
        </div>
      </div>

      {/* Contrôles pièce sélectionnée */}
      {isMyTurn && (
        <div className="blk-controls">
          {selectedPiece ? (
            <>
              <div className="blk-preview">
                <PieceGlyph cells={orientCells} color={colorFor(owner - 1)} cell={16} />
              </div>
              <div className="blk-ctrl-btns">
                <button className="blk-cbtn" onClick={() => setRot(v => (v + 1) % 4)} title="Pivoter">↻</button>
                <button className="blk-cbtn" onClick={() => setFlipped(v => !v)} title="Retourner">⇋</button>
                <button className="blk-cbtn ghost" onClick={() => { setSelectedId(null); setTarget(null); }} title="Annuler">✕</button>
                <button className="blk-cbtn place" disabled={!previewLegal} onClick={commit}>Placer ✓</button>
              </div>
            </>
          ) : (
            <div className="blk-pick-hint">
              {myHasMove ? "👇 Choisis une pièce dans ta réserve" : "Aucun coup possible…"}
              <button className="blk-pass" onClick={passTurn}>Passer</button>
            </div>
          )}
          {selectedPiece && (
            <button className="blk-pass small" onClick={passTurn}>Passer mon tour</button>
          )}
        </div>
      )}

      {!isMyTurn && !room.winner && (
        <div className="blk-wait-turn">{turnLabel}</div>
      )}

      {/* Réserve de pièces (scroll horizontal isolé) */}
      {isMyTurn && (
        <div className="blk-tray-wrap">
          <div className="blk-tray-label">Ta réserve ({myRemaining.length})</div>
          <div className="blk-tray">
            {myRemaining.length === 0 && <div className="blk-tray-empty">Réserve vide 🎉</div>}
            {PIECES.filter(p => myRemaining.includes(p.id)).map(p => (
              <button
                key={p.id}
                className={`blk-tray-piece ${selectedId === p.id ? "sel" : ""}`}
                style={selectedId === p.id ? { borderColor: colorFor(owner - 1) } : undefined}
                onClick={() => selectPiece(p.id)}
              >
                <PieceGlyph cells={p.cells} color={colorFor(owner - 1)} cell={11} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="blk-hint-txt">
        Touche par un coin, jamais par un côté · double-tape une case pour poser
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   STYLES — préfixe blk-, clair + sombre via var() avec fallbacks
   ══════════════════════════════════════════════════════════════════════════ */
const CSS = `
.blk-screen{display:flex;flex-direction:column;gap:.7rem;padding-bottom:1.4rem;overflow-x:hidden;}

/* ── Démarrage ── */
.blk-start{max-width:520px;margin:0 auto;width:100%;padding:1.2rem 1.1rem;text-align:center;
  display:flex;flex-direction:column;align-items:center;gap:.75rem;}
.blk-start-emoji{font-size:3.4rem;filter:drop-shadow(0 6px 14px rgba(0,0,0,.18));animation:blkPop .5s ease;}
.blk-start-title{font-family:var(--font-d,inherit);font-size:2rem;line-height:1.1;
  background:linear-gradient(90deg,var(--primary),var(--accent));
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
.blk-start-sub{color:var(--muted);font-size:.92rem;font-weight:700;line-height:1.55;max-width:440px;}
.blk-start-seats{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin:.2rem 0;}
.blk-seat{display:flex;align-items:center;gap:.4rem;background:var(--surface-1,var(--card,#fff));
  border:1px solid var(--border);border-radius:999px;padding:.35rem .7rem;box-shadow:var(--shadow);}
.blk-seat-dot{width:16px;height:16px;border-radius:5px;box-shadow:inset 0 -2px 4px rgba(0,0,0,.25);}
.blk-seat-name{font-weight:900;font-size:.85rem;color:var(--text);}

.blk-btn{border:none;border-radius:999px;padding:.9rem 2rem;font-size:1.05rem;font-weight:900;
  cursor:pointer;transition:.18s;font-family:var(--font-b,inherit);}
.blk-btn-primary{color:#fff;background:linear-gradient(135deg,var(--primary),var(--accent));
  box-shadow:0 10px 30px rgba(var(--accent-rgb,124,92,191),.4);}
.blk-btn-primary:hover{transform:translateY(-2px);box-shadow:0 14px 40px rgba(var(--accent-rgb,124,92,191),.55);}
.blk-btn-primary:active{transform:translateY(0);}
.blk-hint{font-size:.8rem;font-weight:800;color:var(--muted);}
.blk-waiting{display:flex;align-items:center;justify-content:center;gap:.55rem;font-weight:900;
  color:var(--muted);padding:.8rem;font-size:.95rem;}
.blk-dot-pulse{width:10px;height:10px;border-radius:50%;background:var(--primary);animation:blkPulse 1s infinite;}

/* ── Scoreboard ── */
.blk-players{display:flex;flex-wrap:wrap;gap:.4rem;justify-content:center;padding:0 .6rem;}
.blk-pchip{display:flex;align-items:center;gap:.35rem;background:var(--surface-1,var(--card,#fff));
  border:2px solid var(--border);border-radius:999px;padding:.28rem .6rem;box-shadow:var(--shadow);
  font-size:.78rem;font-weight:800;color:var(--text);transition:.15s;}
.blk-pchip.cur{box-shadow:var(--shadow-lg);transform:translateY(-1px);}
.blk-pdot{width:13px;height:13px;border-radius:4px;flex:0 0 auto;box-shadow:inset 0 -2px 3px rgba(0,0,0,.25);}
.blk-pname{max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.blk-pcount{color:var(--muted);font-weight:900;font-size:.72rem;}
.blk-ppassed{color:var(--danger);font-weight:900;font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;}

/* ── Plateau ── */
.blk-board-wrap{display:flex;justify-content:center;width:100%;padding:0 .4rem;}
.blk-board{display:grid;width:min(94vw,520px);aspect-ratio:1;gap:2px;padding:6px;
  background:linear-gradient(135deg,var(--surface-2,rgba(0,0,0,.06)),var(--surface-1,rgba(0,0,0,.03)));
  border:2px solid var(--border);border-radius:14px;box-shadow:var(--shadow-lg);
  touch-action:manipulation;}
.blk-cell{position:relative;border-radius:3px;background:var(--surface-1,rgba(255,255,255,.55));
  box-shadow:inset 0 0 0 1px rgba(127,127,127,.14);cursor:default;}
.blk-cell.filled{background:transparent;box-shadow:none;}
.blk-fill{position:absolute;inset:0;border-radius:3px;
  box-shadow:inset 0 2px 3px rgba(255,255,255,.35),inset 0 -3px 5px rgba(0,0,0,.28),0 1px 2px rgba(0,0,0,.2);}
.blk-cell.last .blk-fill{animation:blkLast 1.1s ease-out 2;}
.blk-corner{position:absolute;inset:32%;border-radius:2px;opacity:.32;}
.blk-ghost{position:absolute;inset:8%;border-radius:3px;opacity:.6;pointer-events:none;
  box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.55);}
.blk-cell.gok{box-shadow:inset 0 0 0 1px rgba(80,190,110,.7);}
.blk-cell.gbad{box-shadow:inset 0 0 0 1px rgba(229,72,77,.6);}

/* ── Contrôles ── */
.blk-controls{display:flex;flex-direction:column;align-items:center;gap:.55rem;padding:.2rem .6rem;}
.blk-preview{display:flex;justify-content:center;align-items:center;min-height:40px;
  background:var(--surface-1,var(--card,#fff));border:1px solid var(--border);border-radius:var(--radius,12px);
  padding:.5rem .9rem;box-shadow:var(--shadow);}
.blk-ctrl-btns{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;justify-content:center;}
.blk-cbtn{min-width:48px;height:48px;padding:0 .9rem;border-radius:14px;border:2px solid var(--border);
  background:var(--surface-1,var(--card,#fff));color:var(--text);font-size:1.35rem;font-weight:900;
  cursor:pointer;transition:.15s;box-shadow:var(--shadow);display:flex;align-items:center;justify-content:center;}
.blk-cbtn:hover{transform:translateY(-2px);box-shadow:var(--shadow-lg);}
.blk-cbtn:active{transform:translateY(0);}
.blk-cbtn.ghost{color:var(--muted);}
.blk-cbtn.place{color:#fff;font-size:1rem;background:linear-gradient(135deg,var(--green,#2fb344),#1f9c37);
  border-color:transparent;padding:0 1.3rem;}
.blk-cbtn.place:disabled{opacity:.4;cursor:not-allowed;transform:none;box-shadow:var(--shadow);
  filter:grayscale(.5);}
.blk-pick-hint{display:flex;align-items:center;gap:.7rem;flex-wrap:wrap;justify-content:center;
  font-weight:800;color:var(--muted);font-size:.9rem;}
.blk-pass{border:2px solid var(--border);background:var(--surface-1,var(--card,#fff));color:var(--text);
  border-radius:999px;padding:.5rem 1.1rem;font-weight:900;font-size:.85rem;cursor:pointer;transition:.15s;
  box-shadow:var(--shadow);}
.blk-pass:hover{transform:translateY(-2px);box-shadow:var(--shadow-lg);}
.blk-pass.small{font-size:.78rem;padding:.4rem .9rem;opacity:.85;}
.blk-wait-turn{text-align:center;font-weight:900;color:var(--muted);padding:.5rem;font-size:.95rem;}

/* ── Réserve ── */
.blk-tray-wrap{width:100%;}
.blk-tray-label{text-align:center;font-size:.72rem;font-weight:900;text-transform:uppercase;
  letter-spacing:.08em;color:var(--muted);margin-bottom:.35rem;}
.blk-tray{display:flex;gap:.5rem;overflow-x:auto;padding:.3rem .7rem .6rem;scroll-snap-type:x proximity;
  -webkit-overflow-scrolling:touch;}
.blk-tray::-webkit-scrollbar{height:6px;}
.blk-tray::-webkit-scrollbar-thumb{background:var(--border);border-radius:999px;}
.blk-tray-empty{color:var(--muted);font-weight:800;font-size:.9rem;padding:.6rem;}
.blk-tray-piece{flex:0 0 auto;scroll-snap-align:center;display:flex;align-items:center;justify-content:center;
  min-width:52px;min-height:52px;padding:.45rem;border:2px solid var(--border);border-radius:12px;
  background:var(--surface-1,var(--card,#fff));cursor:pointer;transition:.15s;box-shadow:var(--shadow);}
.blk-tray-piece:hover{transform:translateY(-2px);box-shadow:var(--shadow-lg);}
.blk-tray-piece.sel{box-shadow:var(--shadow-lg);transform:translateY(-2px);}

/* ── Glyphe pièce ── */
.blk-glyph{display:grid;gap:2px;}
.blk-glyph-cell{border-radius:2px;}
.blk-glyph-cell.on{box-shadow:inset 0 1px 2px rgba(255,255,255,.35),inset 0 -2px 3px rgba(0,0,0,.28);}

.blk-hint-txt{text-align:center;color:var(--muted);font-size:.78rem;font-weight:700;padding:0 1rem;}

/* ── Animations ── */
@keyframes blkPop{from{transform:scale(.7);opacity:0;}to{transform:scale(1);opacity:1;}}
@keyframes blkPulse{0%,100%{transform:scale(1);opacity:1;}50%{transform:scale(1.5);opacity:.4;}}
@keyframes blkLast{0%{box-shadow:inset 0 2px 3px rgba(255,255,255,.35),inset 0 -3px 5px rgba(0,0,0,.28),0 0 0 0 rgba(255,255,255,.9);}
  50%{box-shadow:inset 0 2px 3px rgba(255,255,255,.35),inset 0 -3px 5px rgba(0,0,0,.28),0 0 0 3px rgba(255,255,255,.55);}
  100%{box-shadow:inset 0 2px 3px rgba(255,255,255,.35),inset 0 -3px 5px rgba(0,0,0,.28),0 0 0 0 rgba(255,255,255,0);}}

@media (max-width:400px){
  .blk-start-title{font-size:1.7rem;}
  .blk-cbtn{min-width:44px;height:44px;}
}
`;
