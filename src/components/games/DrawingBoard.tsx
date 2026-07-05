import { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import type { DrawPath, DrawPoint, DrawTool } from "../../types";
import { uid } from "../../lib/gameData";

/* ══════════════════════════════════════════════════════════════════════════
   ATELIER DE DESSIN — interface premium (pinceau, marqueur, formes, gomme),
   palette riche + sélecteur de couleur, épaisseur réglable, remplissage,
   annulation. Les tracés sont normalisés (0..1) → indépendants de la taille
   d'affichage et synchronisés tels quels via Firebase.
   ══════════════════════════════════════════════════════════════════════════ */

const CANVAS_W = 760;
const CANVAS_H = 540;

/* Palette large mais lisible (2 rangées de 8). */
const PALETTE = [
  "#1a1a2e", "#4b5563", "#9ca3af", "#ffffff",
  "#e11d48", "#f97316", "#f59e0b", "#facc15",
  "#22c55e", "#10b981", "#06b6d4", "#3b82f6",
  "#6366f1", "#8b5cf6", "#ec4899", "#a16207",
];

interface Tool { id: DrawTool; icon: string; label: string; }
const TOOLS: Tool[] = [
  { id: "pen",     icon: "✏️", label: "Crayon" },
  { id: "marker",  icon: "🖊️", label: "Marqueur" },
  { id: "line",    icon: "／",  label: "Ligne" },
  { id: "rect",    icon: "▭",  label: "Rectangle" },
  { id: "ellipse", icon: "◯",  label: "Cercle" },
  { id: "arrow",   icon: "↗",  label: "Flèche" },
  { id: "eraser",  icon: "🧽", label: "Gomme" },
];
const SHAPE_TOOLS: DrawTool[] = ["line", "rect", "ellipse", "arrow"];

/* Paramètres effectifs d'un outil pour une épaisseur de base donnée. */
function toolParams(tool: DrawTool, base: number): { size: number; opacity: number } {
  if (tool === "marker") return { size: base * 2.4, opacity: 0.3 };
  if (tool === "eraser") return { size: Math.max(base * 2.8, 18), opacity: 1 };
  return { size: base, opacity: 1 };
}

/* Dessine un tracé (pinceau/forme/gomme) sur le contexte. */
function drawOne(ctx: CanvasRenderingContext2D, path: DrawPath, w: number, h: number) {
  const pts = path.points;
  if (!pts || pts.length < 1) return;
  const tool: DrawTool = path.eraser ? "eraser" : (path.tool || "pen");
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = path.size;
  ctx.strokeStyle = tool === "eraser" ? "#ffffff" : path.color;
  ctx.fillStyle = path.color;
  ctx.globalAlpha = path.opacity ?? 1;

  if (tool === "pen" || tool === "marker" || tool === "eraser") {
    ctx.beginPath();
    ctx.moveTo(pts[0].x * w, pts[0].y * h);
    if (pts.length === 1) {
      // point unique → petit disque
      ctx.arc(pts[0].x * w, pts[0].y * h, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = tool === "eraser" ? "#ffffff" : path.color;
      ctx.fill();
    } else {
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * w, pts[i].y * h);
      ctx.stroke();
    }
  } else {
    const a = pts[0], b = pts[pts.length - 1];
    const x0 = a.x * w, y0 = a.y * h, x1 = b.x * w, y1 = b.y * h;
    if (tool === "line") {
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    } else if (tool === "rect") {
      const x = Math.min(x0, x1), y = Math.min(y0, y1), ww = Math.abs(x1 - x0), hh = Math.abs(y1 - y0);
      if (path.fill) { ctx.globalAlpha = (path.opacity ?? 1) * 0.9; ctx.fillRect(x, y, ww, hh); ctx.globalAlpha = path.opacity ?? 1; }
      ctx.strokeRect(x, y, ww, hh);
    } else if (tool === "ellipse") {
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = Math.abs(x1 - x0) / 2, ry = Math.abs(y1 - y0) / 2;
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      if (path.fill) { ctx.globalAlpha = (path.opacity ?? 1) * 0.9; ctx.fill(); ctx.globalAlpha = path.opacity ?? 1; }
      ctx.stroke();
    } else if (tool === "arrow") {
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      const ang = Math.atan2(y1 - y0, x1 - x0);
      const head = Math.max(12, path.size * 3.2);
      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(x1 - head * Math.cos(ang - Math.PI / 6), y1 - head * Math.sin(ang - Math.PI / 6));
      ctx.moveTo(x1, y1); ctx.lineTo(x1 - head * Math.cos(ang + Math.PI / 6), y1 - head * Math.sin(ang + Math.PI / 6));
      ctx.stroke();
    }
  }
  ctx.restore();
}

function paintBase(ctx: CanvasRenderingContext2D, paths: DrawPath[]) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  for (const p of paths) drawOne(ctx, p, CANVAS_W, CANVAS_H);
}

interface DrawingBoardProps {
  paths: DrawPath[];
  isDrawer: boolean;
  onStrokeComplete: (path: DrawPath) => void;
  onClear: () => void;
  onUndo: () => void;
}

export function DrawingBoard({ paths, isDrawer, onStrokeComplete, onClear, onUndo }: DrawingBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<DrawTool>("pen");
  const [color, setColor] = useState(PALETTE[0]);
  const [size, setSize] = useState(5);
  const [fill, setFill] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  const drawing = useRef(false);
  const curPoints = useRef<DrawPoint[]>([]);
  const pathsRef = useRef<DrawPath[]>([]);          // pour re-render pendant l'aperçu des formes

  const safePaths: DrawPath[] = Array.isArray(paths)
    ? paths
    : paths ? Object.values(paths as unknown as Record<string, DrawPath>) : [];

  /* Re-render complet quand les tracés changent (source de vérité Firebase). */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    pathsRef.current = safePaths;
    paintBase(ctx, safePaths);
  }, [paths]);

  const getPoint = useCallback((e: React.MouseEvent | React.TouchEvent): DrawPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ("touches" in e) {
      const t = e.touches[0] || e.changedTouches[0];
      if (!t) return null;
      clientX = t.clientX; clientY = t.clientY;
    } else { clientX = e.clientX; clientY = e.clientY; }
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  }, []);

  const previewPath = (end: DrawPoint): DrawPath => {
    const { size: eff, opacity } = toolParams(tool, size);
    const isShape = SHAPE_TOOLS.includes(tool);
    return {
      id: "preview",
      points: isShape ? [curPoints.current[0], end] : curPoints.current,
      color, size: eff, eraser: tool === "eraser", tool,
      opacity, fill: fill && (tool === "rect" || tool === "ellipse"),
    };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer) return;
    e.preventDefault();
    const p = getPoint(e);
    if (!p) return;
    drawing.current = true;
    curPoints.current = [p];
    // feedback immédiat : un point
    const canvas = canvasRef.current;
    if (canvas) drawOne(canvas.getContext("2d")!, previewPath(p), CANVAS_W, CANVAS_H);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrawer, tool, color, size, fill, getPoint]);

  const moveDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer || !drawing.current) return;
    e.preventDefault();
    const p = getPoint(e);
    if (!p) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    if (SHAPE_TOOLS.includes(tool)) {
      // aperçu live : on repeint la base + la forme en cours
      paintBase(ctx, pathsRef.current);
      drawOne(ctx, previewPath(p), CANVAS_W, CANVAS_H);
    } else {
      // pinceau/marqueur/gomme : segment incrémental
      curPoints.current.push(p);
      const pts = curPoints.current;
      if (pts.length >= 2) {
        const { size: eff, opacity } = toolParams(tool, size);
        ctx.save();
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.lineWidth = eff;
        ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.moveTo(pts[pts.length - 2].x * CANVAS_W, pts[pts.length - 2].y * CANVAS_H);
        ctx.lineTo(pts[pts.length - 1].x * CANVAS_W, pts[pts.length - 1].y * CANVAS_H);
        ctx.stroke();
        ctx.restore();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrawer, tool, color, size, fill, getPoint]);

  const endDraw = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer || !drawing.current) return;
    drawing.current = false;
    const pts = curPoints.current;
    if (pts.length < 1) return;
    const isShape = SHAPE_TOOLS.includes(tool);
    let endPt = pts[pts.length - 1];
    if (isShape && e) { const p = getPoint(e); if (p) endPt = p; }
    const { size: eff, opacity } = toolParams(tool, size);
    const path: DrawPath = {
      id: uid(),
      points: isShape ? [pts[0], endPt] : pts,
      color, size: eff, eraser: tool === "eraser", tool,
      opacity, fill: fill && (tool === "rect" || tool === "ellipse"),
    };
    curPoints.current = [];
    if (tool !== "eraser") setRecent(r => [color, ...r.filter(c => c !== color)].slice(0, 5));
    onStrokeComplete(path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrawer, tool, color, size, fill, getPoint, onStrokeComplete]);

  const pickColor = (c: string) => { setColor(c); if (tool === "eraser") setTool("pen"); };

  return (
    <div className="draw-studio">
      {/* Toile */}
      <div className="draw-canvas-frame">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className={`draw-canvas ${isDrawer ? (tool === "eraser" ? "c-eraser" : "c-draw") : "c-watch"}`}
          onMouseDown={startDraw}
          onMouseMove={moveDraw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={moveDraw}
          onTouchEnd={endDraw}
        />
        {!isDrawer && <div className="draw-watch-badge">👁️ Tu devines…</div>}
      </div>

      {/* Barre d'outils (dessinateur uniquement) */}
      {isDrawer && (
        <div className="draw-tools">
          {/* Outils */}
          <div className="draw-row draw-tool-row">
            {TOOLS.map(t => (
              <motion.button
                key={t.id}
                className={`draw-tool ${tool === t.id ? "active" : ""}`}
                onClick={() => setTool(t.id)}
                title={t.label}
                whileTap={{ scale: 0.9 }}
                whileHover={{ y: -2 }}
              >
                <span className="draw-tool-ico">{t.icon}</span>
              </motion.button>
            ))}
            <span className="draw-sep" />
            <motion.button className="draw-tool ghost" onClick={onUndo} title="Annuler" whileTap={{ scale: 0.9 }}>↶</motion.button>
            <motion.button className="draw-tool ghost danger" onClick={onClear} title="Tout effacer" whileTap={{ scale: 0.9 }}>🗑️</motion.button>
          </div>

          {/* Couleurs */}
          <div className="draw-row draw-color-row">
            {PALETTE.map(c => (
              <button
                key={c}
                className={`draw-swatch ${color === c && tool !== "eraser" ? "active" : ""} ${c === "#ffffff" ? "is-white" : ""}`}
                style={{ background: c }}
                onClick={() => pickColor(c)}
                aria-label={`Couleur ${c}`}
              />
            ))}
            <label className="draw-swatch draw-custom" title="Couleur personnalisée" style={{ background: color }}>
              <span className="draw-custom-ico">🎨</span>
              <input type="color" value={color} onChange={e => pickColor(e.target.value)} />
            </label>
            {recent.length > 0 && <span className="draw-sep" />}
            {recent.map((c, i) => (
              <button key={`r${i}`} className={`draw-swatch small ${color === c ? "active" : ""}`} style={{ background: c }} onClick={() => pickColor(c)} aria-label="Couleur récente" />
            ))}
          </div>

          {/* Épaisseur + remplissage */}
          <div className="draw-row draw-size-row">
            <span className="draw-size-preview" aria-hidden="true">
              <span className="draw-size-dot" style={{ width: Math.max(4, size), height: Math.max(4, size), background: tool === "eraser" ? "var(--muted)" : color }} />
            </span>
            <input
              type="range" min={1} max={40} value={size}
              onChange={e => setSize(Number(e.target.value))}
              className="draw-size-range"
              style={{ ["--accent-track" as string]: color }}
            />
            <span className="draw-size-val">{size}px</span>
            {(tool === "rect" || tool === "ellipse") && (
              <button className={`draw-fill-btn ${fill ? "on" : ""}`} onClick={() => setFill(f => !f)} title="Remplir la forme">
                {fill ? "◼ Rempli" : "▢ Contour"}
              </button>
            )}
          </div>
        </div>
      )}

      <style>{STUDIO_CSS}</style>
    </div>
  );
}

const STUDIO_CSS = `
.draw-studio{display:flex;flex-direction:column;gap:.7rem;width:100%;max-width:780px;margin:0 auto;}
.draw-canvas-frame{position:relative;width:100%;aspect-ratio:${CANVAS_W} / ${CANVAS_H};
  border-radius:18px;overflow:hidden;background:#fff;
  border:1px solid var(--border);
  box-shadow:0 14px 40px rgba(0,0,0,.18),inset 0 0 0 1px rgba(255,255,255,.6);}
.draw-canvas{display:block;width:100%;height:100%;touch-action:none;background:#fff;}
.draw-canvas.c-draw{cursor:crosshair;}
.draw-canvas.c-eraser{cursor:cell;}
.draw-canvas.c-watch{cursor:not-allowed;}
.draw-watch-badge{position:absolute;top:.6rem;left:.6rem;background:rgba(20,20,40,.72);color:#fff;
  font-size:.78rem;font-weight:800;padding:.3rem .6rem;border-radius:999px;backdrop-filter:blur(6px);}

.draw-tools{display:flex;flex-direction:column;gap:.55rem;padding:.7rem;border-radius:16px;
  background:var(--surface-1);border:1px solid var(--border);box-shadow:var(--shadow);}
.draw-row{display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;justify-content:center;}

.draw-tool{width:42px;height:42px;border-radius:12px;border:1.5px solid var(--border);
  background:var(--surface-2,var(--bg));color:var(--text);cursor:pointer;font-size:1.15rem;line-height:1;
  display:grid;place-items:center;transition:border-color .15s,background .15s,transform .1s;}
.draw-tool.active{border-color:var(--accent);background:linear-gradient(135deg,rgba(var(--accent-rgb),.2),var(--surface-1));
  box-shadow:0 0 0 3px rgba(var(--accent-rgb),.2);}
.draw-tool.ghost{font-size:1.25rem;font-weight:900;}
.draw-tool.ghost.danger{color:var(--danger);}
.draw-tool-ico{pointer-events:none;}
.draw-sep{width:1px;height:26px;background:var(--border);margin:0 .15rem;}

.draw-swatch{width:26px;height:26px;border-radius:50%;border:2px solid rgba(0,0,0,.12);cursor:pointer;
  padding:0;transition:transform .1s,box-shadow .15s;position:relative;}
.draw-swatch.small{width:22px;height:22px;}
.draw-swatch.is-white{border-color:var(--border);}
.draw-swatch:hover{transform:scale(1.12);}
.draw-swatch.active{box-shadow:0 0 0 3px var(--surface-1),0 0 0 5px var(--accent);transform:scale(1.12);}
.draw-custom{display:grid;place-items:center;overflow:hidden;border-style:dashed;border-color:var(--muted);}
.draw-custom-ico{font-size:.8rem;filter:drop-shadow(0 1px 1px rgba(0,0,0,.4));}
.draw-custom input[type=color]{position:absolute;inset:0;opacity:0;cursor:pointer;}

.draw-size-row{gap:.6rem;}
.draw-size-preview{width:44px;height:44px;border-radius:10px;display:grid;place-items:center;
  background:var(--surface-2,var(--bg));border:1px solid var(--border);flex:0 0 auto;}
.draw-size-dot{border-radius:50%;display:block;box-shadow:0 1px 3px rgba(0,0,0,.25);}
.draw-size-range{flex:1;min-width:120px;accent-color:var(--accent);height:6px;}
.draw-size-val{font-size:.78rem;font-weight:800;color:var(--muted);min-width:38px;text-align:right;}
.draw-fill-btn{border:1.5px solid var(--border);background:var(--surface-2,var(--bg));color:var(--text);
  border-radius:10px;padding:.4rem .6rem;font-size:.78rem;font-weight:800;cursor:pointer;white-space:nowrap;}
.draw-fill-btn.on{border-color:var(--accent);color:var(--accent);background:rgba(var(--accent-rgb),.12);}
`;
