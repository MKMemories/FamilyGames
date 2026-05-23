import { useRef, useEffect, useState, useCallback } from "react";
import type { DrawPath, DrawPoint } from "../../types";
import { uid } from "../../lib/gameData";

const COLORS = [
  { label: "Noir",  value: "#1a1a2e" },
  { label: "Rouge", value: "#e63946" },
  { label: "Bleu",  value: "#1d78c5" },
  { label: "Vert",  value: "#2d9e5f" },
  { label: "Orange",value: "#f4a261" },
];
const BRUSH_SIZE = 4;
const ERASER_SIZE = 20;
const CANVAS_W = 500;
const CANVAS_H = 360;

interface DrawingBoardProps {
  paths: DrawPath[];
  isDrawer: boolean;
  onStrokeComplete: (path: DrawPath) => void;
  onClear: () => void;
}

function renderPaths(ctx: CanvasRenderingContext2D, paths: DrawPath[]) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  for (const path of paths) {
    if (!path.points || path.points.length < 1) continue;
    ctx.beginPath();
    ctx.lineWidth  = path.eraser ? ERASER_SIZE : path.size;
    ctx.strokeStyle = path.eraser ? "#ffffff" : path.color;
    ctx.lineCap    = "round";
    ctx.lineJoin   = "round";
    const first = path.points[0];
    ctx.moveTo(first.x * w, first.y * h);
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x * w, path.points[i].y * h);
    }
    ctx.stroke();
  }
}

export function DrawingBoard({ paths, isDrawer, onStrokeComplete, onClear }: DrawingBoardProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const [color, setColor]     = useState(COLORS[0].value);
  const [erasing, setErasing] = useState(false);
  const drawing  = useRef(false);
  const curPoints = useRef<DrawPoint[]>([]);

  /* Redraw everything when paths change */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const safePaths: DrawPath[] = Array.isArray(paths) ? paths : paths ? Object.values(paths as unknown as Record<string, DrawPath>) : [];
    renderPaths(ctx, safePaths);
  }, [paths]);

  const getPoint = useCallback((e: React.MouseEvent | React.TouchEvent): DrawPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    let clientX: number, clientY: number;
    if ("touches" in e) {
      if (!e.touches[0]) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: ((clientX - rect.left) * scaleX) / CANVAS_W,
      y: ((clientY - rect.top)  * scaleY) / CANVAS_H,
    };
  }, []);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer) return;
    e.preventDefault();
    const p = getPoint(e);
    if (!p) return;
    drawing.current  = true;
    curPoints.current = [p];
    /* Draw the first dot locally for instant feedback */
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(p.x * CANVAS_W, p.y * CANVAS_H, (erasing ? ERASER_SIZE : BRUSH_SIZE) / 2, 0, Math.PI * 2);
    ctx.fillStyle = erasing ? "#ffffff" : color;
    ctx.fill();
  }, [isDrawer, color, erasing, getPoint]);

  const moveDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer || !drawing.current) return;
    e.preventDefault();
    const p = getPoint(e);
    if (!p) return;
    curPoints.current.push(p);
    /* Live preview */
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const pts = curPoints.current;
    if (pts.length < 2) return;
    const prev = pts[pts.length - 2];
    const curr = pts[pts.length - 1];
    ctx.beginPath();
    ctx.lineWidth   = erasing ? ERASER_SIZE : BRUSH_SIZE;
    ctx.strokeStyle = erasing ? "#ffffff" : color;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.moveTo(prev.x * CANVAS_W, prev.y * CANVAS_H);
    ctx.lineTo(curr.x * CANVAS_W, curr.y * CANVAS_H);
    ctx.stroke();
  }, [isDrawer, color, erasing, getPoint]);

  const endDraw = useCallback(() => {
    if (!isDrawer || !drawing.current) return;
    drawing.current = false;
    if (curPoints.current.length < 1) return;
    const path: DrawPath = {
      id: uid(),
      points: curPoints.current,
      color,
      size: BRUSH_SIZE,
      eraser: erasing,
    };
    curPoints.current = [];
    onStrokeComplete(path);
  }, [isDrawer, color, erasing, onStrokeComplete]);

  return (
    <div className="drawing-board-wrap">
      {/* Canvas */}
      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className={`drawing-canvas ${isDrawer ? (erasing ? "cursor-eraser" : "cursor-draw") : "cursor-watch"}`}
          onMouseDown={startDraw}
          onMouseMove={moveDraw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={moveDraw}
          onTouchEnd={endDraw}
        />
        {!isDrawer && (
          <div className="canvas-readonly-badge">👁️ Spectateur</div>
        )}
      </div>

      {/* Toolbar (drawer only) */}
      {isDrawer && (
        <div className="drawing-toolbar">
          <div className="toolbar-colors">
            {COLORS.map(c => (
              <button
                key={c.value}
                className={`color-btn ${color === c.value && !erasing ? "active" : ""}`}
                style={{ background: c.value }}
                onClick={() => { setColor(c.value); setErasing(false); }}
                title={c.label}
              />
            ))}
          </div>
          <button
            className={`tool-btn ${erasing ? "active" : ""}`}
            onClick={() => setErasing(e => !e)}
            title="Gomme"
          >🧹</button>
          <button
            className="tool-btn"
            onClick={onClear}
            title="Tout effacer"
          >🗑️</button>
        </div>
      )}
    </div>
  );
}
