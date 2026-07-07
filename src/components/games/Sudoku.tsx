import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fx } from "../../lib/sound";
import { Confetti } from "../Confetti";
import { generate, conflicts, isSolved, digitCounts, type SGrid, type SDiff } from "../../lib/sudokuData";

interface Props { onLeave: () => void; }

const DIFFS: { id: SDiff; label: string; emoji: string; hint: string }[] = [
  { id: "facile", label: "Facile", emoji: "🙂", hint: "40 indices — détente" },
  { id: "moyen", label: "Moyen", emoji: "😏", hint: "32 indices — équilibré" },
  { id: "difficile", label: "Difficile", emoji: "🔥", hint: "27 indices — costaud" },
];

const ROW = (i: number) => Math.floor(i / 9);
const COL = (i: number) => i % 9;
const BOX = (i: number) => Math.floor(ROW(i) / 3) * 3 + Math.floor(COL(i) / 3);
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function Sudoku({ onLeave }: Props) {
  const [diff, setDiff] = useState<SDiff | null>(null);
  const [puzzle, setPuzzle] = useState<SGrid | null>(null);
  const [solution, setSolution] = useState<SGrid | null>(null);
  const [grid, setGrid] = useState<SGrid>([]);
  const [notes, setNotes] = useState<number[][]>([]);        // notes[i] = chiffres crayonnés
  const [sel, setSel] = useState<number | null>(null);
  const [noteMode, setNoteMode] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [wrongFlash, setWrongFlash] = useState<number | null>(null);
  const [secs, setSecs] = useState(0);
  const [won, setWon] = useState(false);
  const [building, setBuilding] = useState(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  const given = useMemo(() => (puzzle ? puzzle.map(v => v !== 0) : []), [puzzle]);
  const bad = useMemo(() => conflicts(grid), [grid]);
  const counts = useMemo(() => digitCounts(grid), [grid]);

  /* Génération (asynchrone visuellement pour laisser paraître le spinner). */
  const start = (d: SDiff) => {
    setDiff(d); setBuilding(true);
    setTimeout(() => {
      const { puzzle: p, solution: s } = generate(d);
      setPuzzle(p); setSolution(s); setGrid([...p]);
      setNotes(Array.from({ length: 81 }, () => []));
      setSel(null); setMistakes(0); setSecs(0); setWon(false); setBuilding(false);
    }, 30);
  };

  /* Chronomètre. */
  useEffect(() => {
    if (!puzzle || won) { if (tick.current) clearInterval(tick.current); return; }
    tick.current = setInterval(() => setSecs(s => s + 1), 1000);
    return () => { if (tick.current) clearInterval(tick.current); };
  }, [puzzle, won]);

  /* Victoire. */
  useEffect(() => {
    if (puzzle && grid.length && isSolved(grid) && !won) { setWon(true); fx("victory"); }
  }, [grid, puzzle, won]);

  const setCell = (n: number) => {
    if (sel == null || given[sel] || won) return;
    if (noteMode) {
      setNotes(ns => { const c = [...ns]; const cur = new Set(c[sel]); cur.has(n) ? cur.delete(n) : cur.add(n); c[sel] = [...cur].sort(); return c; });
      fx("tap");
      return;
    }
    setGrid(g => { const c = [...g]; c[sel] = c[sel] === n ? 0 : n; return c; });
    setNotes(ns => { const c = [...ns]; c[sel] = []; return c; });
    if (solution && n !== solution[sel]) { setMistakes(m => m + 1); setWrongFlash(sel); setTimeout(() => setWrongFlash(null), 500); fx("wrong"); }
    else fx("place");
  };

  const erase = () => {
    if (sel == null || given[sel] || won) return;
    setGrid(g => { const c = [...g]; c[sel] = 0; return c; });
    setNotes(ns => { const c = [...ns]; c[sel] = []; return c; });
    fx("tap");
  };

  const hint = () => {
    if (sel == null || given[sel] || won || !solution) return;
    setGrid(g => { const c = [...g]; c[sel] = solution[sel]; return c; });
    setNotes(ns => { const c = [...ns]; c[sel] = []; return c; });
    fx("point");
  };

  /* Clavier physique (confort desktop). */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!puzzle || won) return;
      if (e.key >= "1" && e.key <= "9") setCell(Number(e.key));
      else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") erase();
      else if (sel != null) {
        const r = ROW(sel), c = COL(sel);
        if (e.key === "ArrowUp" && r > 0) setSel(sel - 9);
        else if (e.key === "ArrowDown" && r < 8) setSel(sel + 9);
        else if (e.key === "ArrowLeft" && c > 0) setSel(sel - 1);
        else if (e.key === "ArrowRight" && c < 8) setSel(sel + 1);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle, won, sel, noteMode, solution]);

  const selVal = sel != null ? grid[sel] : 0;

  /* ── Écran menu (choix du niveau) ── */
  if (!puzzle) {
    return (
      <div className="screen game-screen sdk-screen" style={{ ["--fx" as string]: "#6366f1", ["--fx2" as string]: "#818cf8" }}>
        <span className="fx-aurora" aria-hidden />
        <div className="game-topbar"><button className="btn-back" onClick={onLeave}>✕</button><div className="turn-indicator">🔢 Sudoku</div><div /></div>
        {building ? (
          <div className="quiz-loading"><div className="quiz-spinner" /><div>Génération de la grille…</div></div>
        ) : (
          <div className="sdk-menu">
            <div className="sdk-menu-title">Choisis ton niveau</div>
            {DIFFS.map((d, i) => (
              <motion.button key={d.id} className="sdk-diff" onClick={() => start(d.id)}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 * i }} whileTap={{ scale: 0.97 }}>
                <span className="sdk-diff-emoji">{d.emoji}</span>
                <span className="sdk-diff-txt"><b>{d.label}</b><span>{d.hint}</span></span>
                <span className="sdk-diff-go">→</span>
              </motion.button>
            ))}
          </div>
        )}
        <style>{SDK_CSS}</style>
      </div>
    );
  }

  return (
    <div className="screen game-screen sdk-screen" style={{ ["--fx" as string]: "#6366f1", ["--fx2" as string]: "#818cf8" }}>
      <span className="fx-aurora" aria-hidden />
      {won && <Confetti burstKey="sdk-win" />}
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className="turn-indicator">🔢 {DIFFS.find(d => d.id === diff)?.label}</div>
        <div className="sdk-stats"><span>⏱ {fmt(secs)}</span><span className={mistakes ? "err" : ""}>✗ {mistakes}</span></div>
      </div>

      {/* Grille */}
      <div className="sdk-board">
        {grid.map((v, i) => {
          const isSel = sel === i;
          const peer = sel != null && (ROW(sel) === ROW(i) || COL(sel) === COL(i) || BOX(sel) === BOX(i));
          const sameVal = !!v && v === selVal && !isSel;
          const cls = [
            "sdk-cell",
            given[i] ? "given" : "",
            isSel ? "sel" : peer ? "peer" : "",
            sameVal ? "same" : "",
            bad.has(i) ? "bad" : "",
            wrongFlash === i ? "wrong" : "",
            COL(i) % 3 === 2 && COL(i) !== 8 ? "br" : "",
            ROW(i) % 3 === 2 && ROW(i) !== 8 ? "bb" : "",
          ].filter(Boolean).join(" ");
          return (
            <button key={i} className={cls} onClick={() => setSel(i)}>
              {v ? <span className="sdk-num">{v}</span> : notes[i]?.length ? (
                <span className="sdk-notes">{Array.from({ length: 9 }, (_, k) => <i key={k}>{notes[i].includes(k + 1) ? k + 1 : ""}</i>)}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {won && (
        <motion.div className="sdk-win" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          🏆 Résolu en {fmt(secs)} {mistakes === 0 ? "· sans faute !" : ""}
        </motion.div>
      )}

      {/* Pavé numérique */}
      <div className="sdk-pad">
        {Array.from({ length: 9 }, (_, k) => k + 1).map(n => (
          <button key={n} className={`sdk-key ${counts[n] >= 9 ? "done" : ""}`} onClick={() => setCell(n)} disabled={won}>
            <span>{n}</span><i>{Math.max(0, 9 - counts[n])}</i>
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="sdk-actions">
        <button className={`sdk-act ${noteMode ? "on" : ""}`} onClick={() => setNoteMode(m => !m)} disabled={won}>✏️ Notes{noteMode ? " ✓" : ""}</button>
        <button className="sdk-act" onClick={erase} disabled={won}>⌫ Effacer</button>
        <button className="sdk-act" onClick={hint} disabled={won}>💡 Indice</button>
        <button className="sdk-act" onClick={() => { setPuzzle(null); setSolution(null); }}>♻ Niveau</button>
      </div>

      <AnimatePresence>
        {won && (
          <motion.button className="btn btn-primary sdk-again" onClick={() => diff && start(diff)}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            🔄 Nouvelle grille
          </motion.button>
        )}
      </AnimatePresence>

      <style>{SDK_CSS}</style>
    </div>
  );
}

const SDK_CSS = `
.sdk-screen{max-width:520px;margin:0 auto;position:relative;}
.sdk-stats{display:flex;gap:.5rem;font-weight:800;font-size:.8rem;color:var(--text);}
.sdk-stats .err{color:#ef4444;}

.sdk-menu{max-width:400px;margin:1.4rem auto;display:flex;flex-direction:column;gap:.7rem;width:calc(100% - 1.6rem);}
.sdk-menu-title{text-align:center;font-family:var(--font-d);font-size:1.25rem;color:var(--text);margin-bottom:.3rem;}
.sdk-diff{display:flex;align-items:center;gap:.8rem;padding:.9rem 1rem;border-radius:16px;border:1.5px solid var(--border);
  background:linear-gradient(150deg,color-mix(in srgb,var(--fx) 10%,var(--surface-1)),var(--surface-1));box-shadow:var(--shadow);cursor:pointer;}
.sdk-diff-emoji{font-size:1.6rem;}
.sdk-diff-txt{flex:1;display:flex;flex-direction:column;text-align:left;}
.sdk-diff-txt b{font-family:var(--font-d);font-size:1.05rem;color:var(--text);}
.sdk-diff-txt span{font-size:.78rem;font-weight:700;color:var(--muted);}
.sdk-diff-go{font-family:var(--font-d);font-size:1.3rem;color:var(--fx);}

.sdk-board{display:grid;grid-template-columns:repeat(9,1fr);gap:0;max-width:min(94vw,440px);aspect-ratio:1;margin:.6rem auto;
  border-radius:14px;overflow:hidden;background:var(--surface-1);
  border:3px solid color-mix(in srgb,var(--fx) 55%,var(--text));box-shadow:0 14px 34px color-mix(in srgb,var(--fx) 26%,transparent);}
.sdk-cell{position:relative;border:.5px solid color-mix(in srgb,var(--fx) 22%,var(--border));background:var(--surface-1);
  display:grid;place-items:center;cursor:pointer;padding:0;aspect-ratio:1;transition:background .12s;}
.sdk-cell.br{border-right:2px solid color-mix(in srgb,var(--fx) 55%,var(--text));}
.sdk-cell.bb{border-bottom:2px solid color-mix(in srgb,var(--fx) 55%,var(--text));}
.sdk-cell.peer{background:color-mix(in srgb,var(--fx) 8%,var(--surface-1));}
.sdk-cell.same{background:color-mix(in srgb,var(--fx) 20%,var(--surface-1));}
.sdk-cell.sel{background:color-mix(in srgb,var(--fx) 32%,var(--surface-1));box-shadow:inset 0 0 0 2px var(--fx);}
.sdk-cell.bad .sdk-num{color:#ef4444;}
.sdk-cell.wrong{animation:sdkWrong .5s ease;}
@keyframes sdkWrong{0%,100%{background:var(--surface-1)}30%,70%{background:color-mix(in srgb,#ef4444 30%,var(--surface-1))}}
.sdk-num{font-family:var(--font-d);font-size:clamp(1rem,4.6vw,1.5rem);color:var(--fx);line-height:1;}
.sdk-cell.given .sdk-num{color:var(--text);}
.sdk-notes{position:absolute;inset:1px;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);}
.sdk-notes i{font-style:normal;font-size:.5rem;font-weight:800;color:var(--muted);display:grid;place-items:center;line-height:1;}

.sdk-win{text-align:center;font-family:var(--font-d);font-size:1.1rem;color:var(--fx);margin:.5rem auto;}

.sdk-pad{display:grid;grid-template-columns:repeat(9,1fr);gap:.3rem;max-width:min(94vw,440px);margin:.3rem auto;width:calc(100% - .8rem);}
.sdk-key{position:relative;aspect-ratio:.82;border:none;border-radius:11px;background:linear-gradient(150deg,var(--surface-2),var(--surface-1));
  border:1.5px solid var(--border);box-shadow:0 3px 0 rgba(0,0,0,.08);cursor:pointer;display:grid;place-items:center;}
.sdk-key span{font-family:var(--font-d);font-size:1.3rem;color:var(--fx);}
.sdk-key i{position:absolute;bottom:1px;font-style:normal;font-size:.5rem;font-weight:800;color:var(--muted);}
.sdk-key:active{transform:translateY(2px);box-shadow:none;}
.sdk-key.done{opacity:.35;}
.sdk-key.done span{color:var(--muted);}

.sdk-actions{display:flex;gap:.4rem;justify-content:center;flex-wrap:wrap;max-width:440px;margin:.5rem auto 0;width:calc(100% - .8rem);}
.sdk-act{flex:1;min-width:70px;padding:.55rem .3rem;border-radius:12px;border:1.5px solid var(--border);background:var(--surface-1);
  font-weight:800;font-size:.8rem;color:var(--text);cursor:pointer;transition:border-color .15s,background .15s;}
.sdk-act:hover:not(:disabled){border-color:color-mix(in srgb,var(--fx) 50%,transparent);}
.sdk-act.on{background:color-mix(in srgb,var(--fx) 16%,var(--surface-1));border-color:var(--fx);color:var(--fx);}
.sdk-act:disabled{opacity:.4;cursor:default;}
.sdk-again{margin:.8rem auto 0;display:block;width:calc(100% - .8rem);max-width:440px;}
`;
