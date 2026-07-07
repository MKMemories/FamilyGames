import { useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { fx } from "../../lib/sound";
import { Confetti } from "../Confetti";
import { MM_THEMES, generate, segment, type MMGrid } from "../../lib/motsMelesData";

interface Props { onLeave: () => void; }

const WORD_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#ef4444", "#0ea5e9", "#f97316"];
const kc = (r: number, c: number) => `${r},${c}`;

export function MotsMeles({ onLeave }: Props) {
  const [themeIdx, setThemeIdx] = useState<number | null>(null);
  const [g, setG] = useState<MMGrid | null>(null);
  const [found, setFound] = useState<Set<string>>(new Set());          // mots trouvés
  const [cellColor, setCellColor] = useState<Record<string, string>>({}); // case → couleur du mot
  const [drag, setDrag] = useState<{ a: [number, number]; b: [number, number] } | null>(null);
  const [flash, setFlash] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  const start = (i: number) => {
    setThemeIdx(i); setG(generate(MM_THEMES[i])); setFound(new Set()); setCellColor({}); setDrag(null);
  };

  const preview = useMemo(() => (drag ? segment(drag.a, drag.b) : null), [drag]);
  const previewSet = useMemo(() => new Set((preview || []).map(([r, c]) => kc(r, c))), [preview]);
  const won = !!g && found.size >= g.words.length;

  const cellAt = (e: React.PointerEvent): [number, number] | null => {
    const el = boardRef.current; if (!el || !g) return null;
    const rect = el.getBoundingClientRect();
    const s = rect.width / g.size;
    const c = Math.floor((e.clientX - rect.left) / s), r = Math.floor((e.clientY - rect.top) / s);
    if (r < 0 || r >= g.size || c < 0 || c >= g.size) return null;
    return [r, c];
  };

  const onDown = (e: React.PointerEvent) => { if (won) return; const cell = cellAt(e); if (cell) setDrag({ a: cell, b: cell }); };
  const onMove = (e: React.PointerEvent) => { if (!drag) return; const cell = cellAt(e); if (cell) setDrag(d => (d ? { ...d, b: cell } : d)); };
  const onUp = () => {
    if (!drag || !g) { setDrag(null); return; }
    const seg = segment(drag.a, drag.b);
    if (seg) {
      const key = (cells: number[][]) => cells.map(x => x.join(",")).join("|");
      const pf = key(seg), pr = key([...seg].reverse());
      const w = g.words.find(w => !found.has(w.word) && (key(w.cells) === pf || key(w.cells) === pr));
      if (w) {
        const col = WORD_COLORS[found.size % WORD_COLORS.length];
        setCellColor(cc => { const n = { ...cc }; w.cells.forEach(([r, c]) => { n[kc(r, c)] = col; }); return n; });
        const nf = new Set(found); nf.add(w.word); setFound(nf);
        fx(nf.size >= g.words.length ? "victory" : "correct");
      } else { fx("wrong"); setFlash(true); setTimeout(() => setFlash(false), 250); }
    }
    setDrag(null);
  };

  /* ── Menu ── */
  if (!g || themeIdx == null) {
    return (
      <div className="screen game-screen mm2-screen" style={{ ["--fx" as string]: "#0891b2", ["--fx2" as string]: "#22d3ee" }}>
        <span className="fx-aurora" aria-hidden />
        <div className="game-topbar"><button className="btn-back" onClick={onLeave}>✕</button><div className="turn-indicator">🔤 Mots Mêlés</div><div /></div>
        <div className="mm2-menu">
          <div className="mm2-menu-title">Choisis un thème</div>
          {MM_THEMES.map((t, i) => (
            <motion.button key={t.id} className="mm2-pick" onClick={() => start(i)}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} whileTap={{ scale: 0.97 }}>
              <span className="mm2-pick-emoji">{t.emoji}</span>
              <span className="mm2-pick-txt"><b>{t.name}</b><span>{Math.min(9, t.words.length)} mots à trouver</span></span>
              <span className="mm2-pick-go">→</span>
            </motion.button>
          ))}
        </div>
        <style>{MM2_CSS}</style>
      </div>
    );
  }

  return (
    <div className="screen game-screen mm2-screen" style={{ ["--fx" as string]: "#0891b2", ["--fx2" as string]: "#22d3ee" }}>
      <span className="fx-aurora" aria-hidden />
      {won && <Confetti burstKey="mm2-win" />}
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className="turn-indicator">{MM_THEMES[themeIdx].emoji} {found.size}/{g.words.length}</div>
        <button className="tet-pause" onClick={() => setThemeIdx(null)} title="Autre thème">↺</button>
      </div>

      <div className="mm2-boardwrap">
        <div ref={boardRef} className={`mm2-board ${flash ? "flash" : ""}`}
          style={{ gridTemplateColumns: `repeat(${g.size}, 1fr)` }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
          {g.grid.map((row, r) => row.map((ch, c) => {
            const found = cellColor[kc(r, c)];
            const inPrev = previewSet.has(kc(r, c));
            return (
              <span key={kc(r, c)} className={`mm2-cell ${found ? "found" : ""} ${inPrev ? "prev" : ""}`}
                style={found ? { background: found, color: "#fff" } : undefined}>{ch}</span>
            );
          }))}
        </div>
      </div>

      <div className="mm2-words">
        {g.words.map(w => (
          <span key={w.word} className={`mm2-word ${found.has(w.word) ? "ok" : ""}`}>{w.word}</span>
        ))}
      </div>

      {won && <div className="mm2-win">🏆 Tous les mots trouvés — bravo !</div>}
      <div className="mm2-hint">{won ? "" : "👆 Glisse du premier au dernier caractère d'un mot (dans tous les sens, même en diagonale)"}</div>

      <style>{MM2_CSS}</style>
    </div>
  );
}

const MM2_CSS = `
.mm2-screen{max-width:520px;margin:0 auto;position:relative;}
.mm2-menu{max-width:400px;margin:1.2rem auto;display:flex;flex-direction:column;gap:.7rem;width:calc(100% - 1.6rem);}
.mm2-menu-title{text-align:center;font-family:var(--font-d);font-size:1.25rem;color:var(--text);margin-bottom:.3rem;}
.mm2-pick{display:flex;align-items:center;gap:.8rem;padding:.9rem 1rem;border-radius:16px;border:1.5px solid var(--border);
  background:linear-gradient(150deg,color-mix(in srgb,var(--fx) 10%,var(--surface-1)),var(--surface-1));box-shadow:var(--shadow);cursor:pointer;}
.mm2-pick-emoji{font-size:1.6rem;}
.mm2-pick-txt{flex:1;display:flex;flex-direction:column;text-align:left;}
.mm2-pick-txt b{font-family:var(--font-d);font-size:1.05rem;color:var(--text);}
.mm2-pick-txt span{font-size:.78rem;font-weight:700;color:var(--muted);}
.mm2-pick-go{font-family:var(--font-d);font-size:1.3rem;color:var(--fx);}

.mm2-boardwrap{max-width:min(94vw,440px);margin:.4rem auto;}
.mm2-board{display:grid;gap:2px;width:100%;aspect-ratio:1;padding:6px;border-radius:14px;touch-action:none;user-select:none;
  background:linear-gradient(160deg,color-mix(in srgb,var(--fx) 16%,var(--surface-1)),var(--surface-1));
  border:1.5px solid color-mix(in srgb,var(--fx) 26%,var(--border));box-shadow:0 12px 30px color-mix(in srgb,var(--fx) 22%,transparent);}
.mm2-board.flash{animation:mm2flash .25s ease;}
@keyframes mm2flash{0%,100%{}40%{box-shadow:0 0 0 3px #ef4444;}}
.mm2-cell{display:grid;place-items:center;aspect-ratio:1;border-radius:6px;font-family:var(--font-d);font-weight:800;
  font-size:clamp(.6rem,3vw,1.05rem);color:var(--text);background:var(--surface-1);transition:background .1s;text-transform:uppercase;}
.mm2-cell.prev{background:color-mix(in srgb,var(--fx) 40%,var(--surface-1));color:#fff;box-shadow:inset 0 0 0 2px var(--fx);}
.mm2-cell.found{box-shadow:inset 0 1px 0 rgba(255,255,255,.4);}

.mm2-words{display:flex;flex-wrap:wrap;gap:.35rem;justify-content:center;max-width:440px;margin:.5rem auto;width:calc(100% - 1rem);}
.mm2-word{font-weight:800;font-size:.8rem;color:var(--text);background:var(--surface-2);border:1px solid var(--border);border-radius:999px;padding:.25rem .6rem;transition:opacity .2s;}
.mm2-word.ok{opacity:.5;text-decoration:line-through;color:var(--green);border-color:color-mix(in srgb,var(--green) 40%,transparent);}

.mm2-win{text-align:center;font-family:var(--font-d);font-size:1.15rem;color:var(--fx);margin:.4rem auto;}
.mm2-hint{text-align:center;font-size:.76rem;font-weight:700;color:var(--muted);margin:.3rem auto;max-width:360px;line-height:1.4;padding:0 .5rem;}
`;
