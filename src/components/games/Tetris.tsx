import { useRef, useState, useEffect, useCallback } from "react";
import { fx } from "../../lib/sound";
import {
  COLS, ROWS, COLORS, SHAPES, emptyBoard, spawn, tryRotate, collides, merge,
  ghostRow, lineScore, makeBag, dropInterval, type Board, type Piece,
} from "../../lib/tetrisData";

interface Props { onLeave: () => void; }

const CELL = 30;               // taille logique d'une case (canvas mis à l'échelle)
const LOCK_DELAY = 480;        // ms de sursis avant verrouillage
const MAX_LOCK_RESETS = 15;
const CLEAR_MS = 150;          // durée du flash de ligne

interface G {
  board: Board; piece: Piece; hold: number | null; canHold: boolean;
  bag: ReturnType<typeof makeBag>; queue: number[];
  score: number; lines: number; level: number;
  over: boolean; paused: boolean; started: boolean;
  fallAcc: number; lockAcc: number; lockResets: number; soft: boolean;
  clearing: { rows: number[]; ms: number } | null;
}

const bestKey = "khelij_tetris_best";

export function Tetris({ onLeave }: Props) {
  const cv = useRef<HTMLCanvasElement>(null);
  const G = useRef<G | null>(null);
  const raf = useRef<number>(0);
  const last = useRef<number>(0);
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);
  const [hud, setHud] = useState({ score: 0, lines: 0, level: 1, over: false, paused: false, started: false, hold: null as number | null, queue: [] as number[] });
  const [best, setBest] = useState<number>(() => { try { return Number(localStorage.getItem(bestKey)) || 0; } catch { return 0; } });

  const sync = () => {
    const g = G.current; if (!g) return;
    setHud({ score: g.score, lines: g.lines, level: g.level, over: g.over, paused: g.paused, started: g.started, hold: g.hold, queue: g.queue.slice(0, 5) });
  };

  const newGame = useCallback(() => {
    const bag = makeBag();
    const queue = Array.from({ length: 6 }, () => bag.next());
    G.current = {
      board: emptyBoard(), piece: spawn(queue.shift()!), hold: null, canHold: true,
      bag, queue, score: 0, lines: 0, level: 1, over: false, paused: false, started: true,
      fallAcc: 0, lockAcc: 0, lockResets: 0, soft: false, clearing: null,
    };
    // recharge la file à 5+
    while (G.current.queue.length < 5) G.current.queue.push(bag.next());
    sync();
  }, []);

  const pullNext = (g: G) => {
    const id = g.queue.shift()!;
    while (g.queue.length < 5) g.queue.push(g.bag.next());
    return spawn(id);
  };

  const lockPiece = (g: G) => {
    g.board = merge(g.board, g.piece);
    fx("place");
    const full: number[] = [];
    for (let r = 0; r < ROWS; r++) if (g.board[r].every(v => v)) full.push(r);
    if (full.length) { g.clearing = { rows: full, ms: 0 }; fx(full.length === 4 ? "victory" : "correct"); }
    else nextPiece(g);
  };

  const applyClear = (g: G) => {
    const rows = new Set(g.clearing!.rows);
    const kept = g.board.filter((_, r) => !rows.has(r));
    while (kept.length < ROWS) kept.unshift(Array(COLS).fill(0));
    g.board = kept;
    const n = g.clearing!.rows.length;
    g.score += lineScore(n, g.level);
    g.lines += n;
    g.level = 1 + Math.floor(g.lines / 10);
    g.clearing = null;
    nextPiece(g);
    sync();
  };

  const nextPiece = (g: G) => {
    g.piece = pullNext(g);
    g.canHold = true; g.lockAcc = 0; g.lockResets = 0;
    if (collides(g.board, g.piece.mat, g.piece.r, g.piece.c)) {
      g.over = true; g.started = true; fx("explode");
      setBest(b => { const nb = Math.max(b, g.score); try { localStorage.setItem(bestKey, String(nb)); } catch { /* ignore */ } return nb; });
      sync();
    }
  };

  /* ── Actions ── */
  const move = (dc: number) => {
    const g = G.current; if (!g || g.over || g.paused || g.clearing) return;
    if (!collides(g.board, g.piece.mat, g.piece.r, g.piece.c + dc)) {
      g.piece = { ...g.piece, c: g.piece.c + dc };
      if (g.lockResets < MAX_LOCK_RESETS) { g.lockAcc = 0; g.lockResets++; }
      fx("tap");
    }
  };
  const rotate = (cw: boolean) => {
    const g = G.current; if (!g || g.over || g.paused || g.clearing) return;
    const np = tryRotate(g.board, g.piece, cw);
    if (np) { g.piece = np; if (g.lockResets < MAX_LOCK_RESETS) { g.lockAcc = 0; g.lockResets++; } fx("tap"); }
  };
  const softDown = () => {
    const g = G.current; if (!g || g.over || g.paused || g.clearing) return;
    if (!collides(g.board, g.piece.mat, g.piece.r + 1, g.piece.c)) { g.piece = { ...g.piece, r: g.piece.r + 1 }; g.score += 1; g.fallAcc = 0; }
  };
  const hardDrop = () => {
    const g = G.current; if (!g || g.over || g.paused || g.clearing) return;
    const gr = ghostRow(g.board, g.piece);
    g.score += (gr - g.piece.r) * 2;
    g.piece = { ...g.piece, r: gr };
    lockPiece(g); sync();
  };
  const hold = () => {
    const g = G.current; if (!g || g.over || g.paused || g.clearing || !g.canHold) return;
    const cur = g.piece.id;
    if (g.hold == null) { g.hold = cur; g.piece = pullNext(g); }
    else { const h = g.hold; g.hold = cur; g.piece = spawn(h); }
    g.canHold = false; g.lockAcc = 0; fx("swap"); sync();
  };
  const togglePause = () => { const g = G.current; if (!g || g.over) return; g.paused = !g.paused; last.current = 0; sync(); };

  /* ── Boucle de jeu ── */
  useEffect(() => {
    const loop = (t: number) => {
      const g = G.current;
      if (g && g.started && !g.over) {
        if (!last.current) last.current = t;
        const dt = Math.min(t - last.current, 100); last.current = t;
        if (!g.paused) {
          if (g.clearing) { g.clearing.ms += dt; if (g.clearing.ms >= CLEAR_MS) applyClear(g); }
          else {
            g.fallAcc += dt;
            const interval = g.soft ? 45 : dropInterval(g.level);
            while (g.fallAcc >= interval) {
              g.fallAcc -= interval;
              if (!collides(g.board, g.piece.mat, g.piece.r + 1, g.piece.c)) { g.piece = { ...g.piece, r: g.piece.r + 1 }; if (g.soft) g.score += 1; }
            }
            if (collides(g.board, g.piece.mat, g.piece.r + 1, g.piece.c)) { g.lockAcc += dt; if (g.lockAcc >= LOCK_DELAY) { lockPiece(g); sync(); } }
            else g.lockAcc = 0;
          }
        }
      }
      draw();
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Rendu Canvas ── */
  const draw = () => {
    const c = cv.current, g = G.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (c.width !== COLS * CELL * dpr) { c.width = COLS * CELL * dpr; c.height = ROWS * CELL * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, COLS * CELL, ROWS * CELL);
    // fond + quadrillage
    ctx.fillStyle = "rgba(255,255,255,.03)";
    for (let r = 0; r < ROWS; r++) for (let cc = 0; cc < COLS; cc++) { if ((r + cc) % 2) { ctx.fillRect(cc * CELL, r * CELL, CELL, CELL); } }
    ctx.strokeStyle = "rgba(150,160,220,.12)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) { ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, ROWS * CELL); ctx.stroke(); }
    for (let i = 0; i <= ROWS; i++) { ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(COLS * CELL, i * CELL); ctx.stroke(); }
    if (!g) return;
    // plateau figé
    for (let r = 0; r < ROWS; r++) for (let cc = 0; cc < COLS; cc++) if (g.board[r][cc]) cell(ctx, cc, r, COLORS[g.board[r][cc]]);
    if (!g.over) {
      // pièce fantôme
      const gr = ghostRow(g.board, g.piece);
      if (!g.clearing) for (let i = 0; i < g.piece.mat.length; i++) for (let j = 0; j < g.piece.mat[i].length; j++)
        if (g.piece.mat[i][j] && gr + i >= 0) ghost(ctx, g.piece.c + j, gr + i, COLORS[g.piece.id]);
      // pièce courante
      if (!g.clearing) for (let i = 0; i < g.piece.mat.length; i++) for (let j = 0; j < g.piece.mat[i].length; j++)
        if (g.piece.mat[i][j] && g.piece.r + i >= 0) cell(ctx, g.piece.c + j, g.piece.r + i, COLORS[g.piece.id]);
    }
    // flash de ligne
    if (g.clearing) {
      const a = 1 - g.clearing.ms / CLEAR_MS;
      ctx.fillStyle = `rgba(255,255,255,${0.85 * a})`;
      for (const r of g.clearing.rows) ctx.fillRect(0, r * CELL, COLS * CELL, CELL);
    }
  };

  const cell = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    const px = x * CELL, py = y * CELL, s = CELL;
    ctx.fillStyle = color; rr(ctx, px + 1, py + 1, s - 2, s - 2, 5); ctx.fill();
    const gr = ctx.createLinearGradient(px, py, px, py + s);
    gr.addColorStop(0, "rgba(255,255,255,.45)"); gr.addColorStop(.5, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(0,0,0,.28)");
    ctx.fillStyle = gr; rr(ctx, px + 1, py + 1, s - 2, s - 2, 5); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 1.2; rr(ctx, px + 2, py + 2, s - 4, s - 4, 4); ctx.stroke();
  };
  const ghost = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    ctx.globalAlpha = .2; ctx.fillStyle = color; rr(ctx, x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4, 4); ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = color; ctx.lineWidth = 1.5; rr(ctx, x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4, 4); ctx.stroke();
  };
  const rr = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };

  /* ── Contrôles clavier ── */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const g = G.current; if (!g || !g.started) return;
      const k = e.key;
      if (k === "ArrowLeft") { move(-1); e.preventDefault(); }
      else if (k === "ArrowRight") { move(1); e.preventDefault(); }
      else if (k === "ArrowUp" || k === "x" || k === "X") { rotate(true); e.preventDefault(); }
      else if (k === "Control" || k === "z" || k === "Z") { rotate(false); e.preventDefault(); }
      else if (k === "ArrowDown") { if (g) g.soft = true; e.preventDefault(); }
      else if (k === " ") { hardDrop(); e.preventDefault(); }
      else if (k === "Shift" || k === "c" || k === "C") { hold(); e.preventDefault(); }
      else if (k === "p" || k === "P") togglePause();
    };
    const up = (e: KeyboardEvent) => { if (e.key === "ArrowDown" && G.current) G.current.soft = false; };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Répétition tactile (maintien) pour gauche/droite/bas. */
  const startRepeat = (fn: () => void) => { fn(); if (repeat.current) clearInterval(repeat.current); repeat.current = setInterval(fn, 110); };
  const stopRepeat = () => { if (repeat.current) { clearInterval(repeat.current); repeat.current = null; } if (G.current) G.current.soft = false; };

  const MiniPiece = ({ id }: { id: number | null }) => {
    const mat = id ? SHAPES[id - 1] : null;
    return (
      <div className="tet-mini">
        {Array.from({ length: 4 }).map((_, r) => (
          <div key={r} className="tet-mini-row">
            {Array.from({ length: 4 }).map((_, c) => {
              const on = mat && mat[r]?.[c];
              return <span key={c} className="tet-mini-cell" style={on ? { background: COLORS[id!], boxShadow: "inset 0 1px 0 rgba(255,255,255,.5)" } : undefined} />;
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="screen game-screen tet-screen" style={{ ["--fx" as string]: "#6d28d9", ["--fx2" as string]: "#a78bfa" }}>
      <span className="fx-aurora" aria-hidden />
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className="turn-indicator">🧱 Tetris</div>
        <button className="tet-pause" onClick={togglePause} disabled={!hud.started || hud.over}>{hud.paused ? "▶" : "⏸"}</button>
      </div>

      {!hud.started ? (
        <div className="tet-menu">
          <div className="tet-logo">🧱</div>
          <h2 className="tet-title">Tetris</h2>
          <p className="tet-sub">Empile les pièces, complète des lignes, vise le TETRIS (4 lignes) !</p>
          {best > 0 && <div className="tet-best">🏆 Record : {best.toLocaleString("fr")}</div>}
          <button className="btn btn-primary tet-play" onClick={newGame}>Jouer →</button>
        </div>
      ) : (
        <div className="tet-layout">
          <div className="tet-side">
            <div className="tet-panel"><span className="tet-lbl">Score</span><b>{hud.score.toLocaleString("fr")}</b></div>
            <div className="tet-panel tet-row2"><div><span className="tet-lbl">Niv.</span><b>{hud.level}</b></div><div><span className="tet-lbl">Lignes</span><b>{hud.lines}</b></div></div>
            <div className="tet-panel"><span className="tet-lbl">Réserve</span><MiniPiece id={hud.hold} /></div>
            <div className="tet-panel"><span className="tet-lbl">Suivant</span>
              <div className="tet-queue">{hud.queue.slice(0, 3).map((id, i) => <MiniPiece key={i} id={id} />)}</div>
            </div>
          </div>

          <div className="tet-wellwrap">
            <canvas ref={cv} className="tet-canvas" style={{ width: "min(58vw, 300px)", aspectRatio: `${COLS}/${ROWS}` }} />
            {hud.over && (
              <div className="tet-over">
                <div className="tet-over-emoji">💥</div>
                <h3>Game Over</h3>
                <p>Score : <b>{hud.score.toLocaleString("fr")}</b>{hud.score >= best && hud.score > 0 ? " · 🏆 record !" : ""}</p>
                <button className="btn btn-primary" onClick={newGame}>🔄 Rejouer</button>
              </div>
            )}
            {hud.paused && !hud.over && <div className="tet-over"><h3>⏸ Pause</h3><button className="btn btn-primary" onClick={togglePause}>Reprendre</button></div>}
          </div>
        </div>
      )}

      {hud.started && !hud.over && (
        <div className="tet-controls">
          <button className="tet-ctl" onPointerDown={() => startRepeat(() => move(-1))} onPointerUp={stopRepeat} onPointerLeave={stopRepeat}>◀</button>
          <button className="tet-ctl" onPointerDown={() => { if (G.current) G.current.soft = true; startRepeat(softDown); }} onPointerUp={stopRepeat} onPointerLeave={stopRepeat}>▼</button>
          <button className="tet-ctl" onPointerDown={() => startRepeat(() => move(1))} onPointerUp={stopRepeat} onPointerLeave={stopRepeat}>▶</button>
          <button className="tet-ctl accent" onClick={() => rotate(true)}>⟳</button>
          <button className="tet-ctl" onClick={hold}>HOLD</button>
          <button className="tet-ctl accent" onClick={hardDrop}>⤓</button>
        </div>
      )}

      <style>{TET_CSS}</style>
    </div>
  );
}

const TET_CSS = `
.tet-screen{max-width:520px;margin:0 auto;position:relative;}
.tet-pause{width:38px;height:38px;border-radius:50%;border:1.5px solid var(--border);background:var(--surface-1);color:var(--text);font-size:1rem;cursor:pointer;}
.tet-pause:disabled{opacity:.4;}

.tet-menu{max-width:360px;margin:2.2rem auto;text-align:center;display:flex;flex-direction:column;align-items:center;gap:.5rem;}
.tet-logo{font-size:3.4rem;}
.tet-title{font-family:var(--font-d);font-size:2rem;color:var(--text);margin:0;}
.tet-sub{color:var(--muted);font-weight:700;font-size:.9rem;margin:0 0 .3rem;}
.tet-best{font-weight:800;color:var(--fx);}
.tet-play{width:100%;max-width:220px;margin-top:.6rem;}

.tet-layout{display:flex;gap:.7rem;justify-content:center;align-items:flex-start;margin:.5rem auto;padding:0 .5rem;}
.tet-side{display:flex;flex-direction:column;gap:.5rem;width:88px;flex:none;}
.tet-panel{background:var(--surface-1);border:1.5px solid var(--border);border-radius:12px;padding:.45rem .5rem;display:flex;flex-direction:column;gap:.15rem;box-shadow:var(--shadow);}
.tet-lbl{font-size:.6rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);}
.tet-panel b{font-family:var(--font-d);font-size:1rem;color:var(--text);line-height:1;}
.tet-row2{flex-direction:row;justify-content:space-between;gap:.3rem;}
.tet-row2 div{display:flex;flex-direction:column;gap:.1rem;}
.tet-queue{display:flex;flex-direction:column;gap:.25rem;}

.tet-mini{display:flex;flex-direction:column;gap:1px;}
.tet-mini-row{display:flex;gap:1px;}
.tet-mini-cell{width:9px;height:9px;border-radius:2px;background:transparent;}

.tet-wellwrap{position:relative;}
.tet-canvas{display:block;border-radius:12px;background:linear-gradient(160deg,#1a1035,#0e0a24);
  border:2px solid color-mix(in srgb,var(--fx) 55%,transparent);box-shadow:0 16px 40px color-mix(in srgb,var(--fx) 40%,transparent),inset 0 2px 10px rgba(0,0,0,.5);}
.tet-over{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.5rem;text-align:center;
  background:rgba(10,8,30,.82);backdrop-filter:blur(4px);border-radius:12px;color:#fff;padding:1rem;}
.tet-over-emoji{font-size:2.6rem;}
.tet-over h3{font-family:var(--font-d);font-size:1.5rem;margin:0;}
.tet-over p{margin:0;font-weight:700;opacity:.9;}
.tet-over .btn{margin-top:.5rem;}

.tet-controls{display:grid;grid-template-columns:repeat(6,1fr);gap:.4rem;max-width:420px;margin:.7rem auto 0;width:calc(100% - 1rem);}
.tet-ctl{height:52px;border:none;border-radius:14px;background:linear-gradient(150deg,var(--surface-2),var(--surface-1));
  border:1.5px solid var(--border);font-size:1.2rem;font-weight:900;color:var(--text);cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.12);touch-action:none;user-select:none;}
.tet-ctl:active{transform:translateY(2px);box-shadow:none;}
.tet-ctl.accent{background:linear-gradient(150deg,var(--fx2),var(--fx));color:#fff;border-color:transparent;}
.tet-ctl:has-text{font-size:.8rem;}
`;
