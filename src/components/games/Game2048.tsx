import { useState, useRef, useEffect, useCallback } from "react";
import { fx } from "../../lib/sound";
import { Confetti } from "../Confetti";
import { move, emptyCells, hasMoves, bestTile, SIZE, type Tile, type Dir } from "../../lib/g2048";

interface Props { onLeave: () => void; }
const bestKey = "khelij_2048_best";

const COLORS: Record<number, [string, string]> = {
  2: ["#eef2ff", "#4338ca"], 4: ["#dbeafe", "#3730a3"], 8: ["#a5b4fc", "#1e1b4b"],
  16: ["#818cf8", "#fff"], 32: ["#6366f1", "#fff"], 64: ["#4f46e5", "#fff"],
  128: ["#fbbf24", "#fff"], 256: ["#fb923c", "#fff"], 512: ["#f97316", "#fff"],
  1024: ["#ec4899", "#fff"], 2048: ["#a855f7", "#fff"],
};
const tileStyle = (val: number) => {
  const [bg, color] = COLORS[val] || ["#7c3aed", "#fff"];
  const fs = val >= 1024 ? "1.25rem" : val >= 128 ? "1.5rem" : "1.75rem";
  return { background: bg, color, fontSize: fs } as React.CSSProperties;
};

export function Game2048({ onLeave }: Props) {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => { try { return Number(localStorage.getItem(bestKey)) || 0; } catch { return 0; } });
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keepGoing, setKeepGoing] = useState(false);
  const nextId = useRef(1);
  const busy = useRef(false);
  const tilesRef = useRef<Tile[]>([]);
  tilesRef.current = tiles;

  const addTile = (list: Tile[]): Tile[] => {
    const empties = emptyCells(list);
    if (!empties.length) return list;
    const [r, c] = empties[Math.floor(Math.random() * empties.length)];
    return [...list, { id: nextId.current++, r, c, val: Math.random() < 0.9 ? 2 : 4 }];
  };

  const newGame = useCallback(() => {
    nextId.current = 1;
    let t: Tile[] = [];
    t = addTile(t); t = addTile(t);
    setTiles(t); setScore(0); setOver(false); setWon(false); setKeepGoing(false);
  }, []);

  useEffect(() => { newGame(); }, [newGame]);

  const doMove = (dir: Dir) => {
    if (busy.current || over) return;
    const cur = tilesRef.current;
    const { survivors, absorbed, moved, gain, mergedIds } = move(cur, dir);
    if (!moved) return;
    busy.current = true;
    fx("tap");
    if (gain) { fx("place"); setScore(s => s + gain); }
    // 1) glissement : survivants (val fusionnée) + tuiles absorbées qui rejoignent la cible
    const mergedSet = new Set(mergedIds);
    setTiles([...survivors.map(t => ({ ...t, pop: mergedSet.has(t.id) } as Tile & { pop?: boolean })), ...absorbed]);
    setTimeout(() => {
      // 2) on retire les absorbées, on fait apparaître une nouvelle tuile
      let next = survivors.map(t => ({ ...t }));
      next = addTile(next);
      setTiles(next.map(t => ({ ...t, isNew: (t as any).isNew } as Tile)));
      if (!won && !keepGoing && bestTile(next) >= 2048) { setWon(true); fx("victory"); }
      if (!hasMoves(next)) {
        setOver(true); fx("explode");
        setScore(s => { setBest(b => { const nb = Math.max(b, s); try { localStorage.setItem(bestKey, String(nb)); } catch { /* ignore */ } return nb; }); return s; });
      }
      busy.current = false;
    }, 110);
  };
  const doMoveRef = useRef(doMove); doMoveRef.current = doMove;

  /* Clavier. */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const d: Record<string, Dir> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
      if (d[e.key]) { e.preventDefault(); doMoveRef.current(d[e.key]); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* Swipe tactile. */
  const start = useRef<{ x: number; y: number } | null>(null);
  const onDown = (e: React.PointerEvent) => { start.current = { x: e.clientX, y: e.clientY }; };
  const onUp = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x, dy = e.clientY - start.current.y;
    start.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? "right" : "left");
    else doMove(dy > 0 ? "down" : "up");
  };

  const bt = bestTile(tiles);

  return (
    <div className="screen game-screen g48-screen" style={{ ["--fx" as string]: "#6366f1", ["--fx2" as string]: "#a855f7" }}>
      <span className="fx-aurora" aria-hidden />
      {won && !keepGoing && <Confetti burstKey="g48-win" />}
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className="turn-indicator">🔢 2048</div>
        <button className="tet-pause" onClick={newGame} title="Nouvelle partie">↺</button>
      </div>

      <div className="g48-scores">
        <div className="g48-sc"><span>Score</span><b>{score}</b></div>
        <div className="g48-sc"><span>Record</span><b>{Math.max(best, score)}</b></div>
      </div>

      <div className="g48-boardwrap">
        <div className="g48-board" onPointerDown={onDown} onPointerUp={onUp}>
          {Array.from({ length: SIZE * SIZE }).map((_, i) => <div key={i} className="g48-well" />)}
          {tiles.map(t => {
            const tt = t as Tile & { pop?: boolean; isNew?: boolean };
            return (
              <div key={t.id} className="g48-tile" style={{ left: `${t.c * 25}%`, top: `${t.r * 25}%` }}>
                <div className={`g48-tileinner ${tt.pop ? "pop" : ""} ${tt.isNew ? "new" : ""}`} style={tileStyle(t.val)}>{t.val}</div>
              </div>
            );
          })}
          {(over || (won && !keepGoing)) && (
            <div className="g48-overlay">
              <div className="g48-over-emoji">{won && !over ? "🏆" : "💥"}</div>
              <h3>{won && !over ? "2048 atteint !" : "Perdu !"}</h3>
              <p>Score : <b>{score}</b>{score >= best && score > 0 ? " · record !" : ""}</p>
              <div className="g48-over-btns">
                {won && !over && <button className="btn btn-primary" onClick={() => { setKeepGoing(true); }}>Continuer</button>}
                <button className={`btn ${won && !over ? "btn-ghost" : "btn-primary"}`} onClick={newGame}>🔄 Rejouer</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="g48-hint">👆 Glisse (ou flèches ⬆⬇⬅➡) pour fusionner les tuiles · but : atteindre <b>2048</b>{bt >= 128 ? ` · meilleure : ${bt}` : ""}</div>

      <style>{G48_CSS}</style>
    </div>
  );
}

const G48_CSS = `
.g48-screen{max-width:480px;margin:0 auto;position:relative;}
.g48-scores{display:flex;gap:.6rem;justify-content:center;margin:.5rem auto;}
.g48-sc{background:var(--surface-1);border:1.5px solid var(--border);border-radius:12px;padding:.4rem 1rem;text-align:center;box-shadow:var(--shadow);min-width:92px;}
.g48-sc span{display:block;font-size:.62rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);}
.g48-sc b{font-family:var(--font-d);font-size:1.3rem;color:var(--text);}

.g48-boardwrap{max-width:min(92vw,400px);margin:.4rem auto;}
.g48-board{position:relative;width:100%;aspect-ratio:1;border-radius:16px;padding:0;touch-action:none;user-select:none;
  background:linear-gradient(160deg,color-mix(in srgb,var(--fx) 22%,#2a2350),color-mix(in srgb,var(--fx2) 20%,#241d44));
  display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(4,1fr);gap:0;
  box-shadow:0 16px 40px color-mix(in srgb,var(--fx) 30%,transparent),inset 0 2px 8px rgba(0,0,0,.35);overflow:hidden;}
.g48-well{margin:5px;border-radius:11px;background:rgba(255,255,255,.06);}
.g48-tile{position:absolute;width:25%;height:25%;transition:left .11s ease,top .11s ease;}
.g48-tileinner{position:absolute;inset:5px;border-radius:11px;display:grid;place-items:center;font-family:var(--font-d);font-weight:900;
  box-shadow:0 3px 8px rgba(0,0,0,.22),inset 0 2px 0 rgba(255,255,255,.4);}
.g48-tileinner.new{animation:g48pop .16s ease;}
.g48-tileinner.pop{animation:g48merge .18s ease;}
@keyframes g48pop{0%{transform:scale(0)}100%{transform:scale(1)}}
@keyframes g48merge{0%{transform:scale(1)}45%{transform:scale(1.16)}100%{transform:scale(1)}}

.g48-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.4rem;text-align:center;
  background:rgba(20,16,45,.82);backdrop-filter:blur(4px);color:#fff;padding:1rem;z-index:5;}
.g48-over-emoji{font-size:2.6rem;}
.g48-overlay h3{font-family:var(--font-d);font-size:1.5rem;margin:0;}
.g48-overlay p{margin:0;font-weight:700;opacity:.92;}
.g48-over-btns{display:flex;gap:.5rem;margin-top:.4rem;flex-wrap:wrap;justify-content:center;}

.g48-hint{text-align:center;font-size:.78rem;font-weight:700;color:var(--muted);margin:.5rem auto;max-width:360px;line-height:1.4;padding:0 .5rem;}
.g48-hint b{color:var(--fx);}
`;
