import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fx } from "../../lib/sound";
import { Confetti } from "../Confetti";
import { MF_PUZZLES, buildModel, type MFModel } from "../../lib/motsFlechesData";

interface Props { onLeave: () => void; }

const KB_ROWS = ["AZERTYUIOP", "QSDFGHJKLM", "WXCVBN⌫"];

export function MotsFleches({ onLeave }: Props) {
  const [pIdx, setPIdx] = useState<number | null>(null);
  const [entries, setEntries] = useState<string[]>([]);
  const [selWord, setSelWord] = useState<number | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [won, setWon] = useState(false);

  const model: MFModel | null = useMemo(() => (pIdx == null ? null : buildModel(MF_PUZZLES[pIdx])), [pIdx]);

  /* Pour chaque case-lettre : la liste des mots qui la contiennent (croisements). */
  const cellWords = useMemo(() => {
    const map: Record<number, number[]> = {};
    model?.words.forEach(w => w.cells.forEach(ci => { (map[ci] ||= []).push(w.id); }));
    return map;
  }, [model]);

  const startPuzzle = (i: number) => {
    setPIdx(i);
    const m = buildModel(MF_PUZZLES[i]);
    setEntries(Array(m.cols * m.rows).fill(""));
    setSelWord(null); setCursor(null); setWrong(new Set()); setWon(false);
  };

  const word = selWord != null && model ? model.words[selWord] : null;

  /* Sélection d'un mot (par sa case-définition ou une case-lettre). */
  const pickWord = (id: number, cell?: number) => {
    if (!model) return;
    const w = model.words[id];
    setSelWord(id);
    setCursor(cell != null && w.cells.includes(cell) ? cell : w.cells.find(ci => !entries[ci]) ?? w.cells[0]);
    fx("tap");
  };
  const tapLetter = (cell: number) => {
    const ids = cellWords[cell]; if (!ids?.length) return;
    // si déjà sur un mot croisant cette case, on bascule vers l'autre mot
    const next = selWord != null && ids.includes(selWord) && ids.length > 1 ? ids.find(x => x !== selWord)! : ids[0];
    pickWord(next, cell);
  };

  const advance = (from: number) => {
    if (!word) return;
    const pos = word.cells.indexOf(from);
    const nextEmpty = word.cells.slice(pos + 1).find(ci => !entries[ci]);
    setCursor(nextEmpty ?? (pos + 1 < word.cells.length ? word.cells[pos + 1] : from));
  };

  const typeLetter = (ch: string) => {
    if (cursor == null || won) return;
    setEntries(e => { const c = [...e]; c[cursor] = ch; return c; });
    setWrong(w => { if (!w.has(cursor)) return w; const n = new Set(w); n.delete(cursor); return n; });
    fx("tap");
    advance(cursor);
  };
  const backspace = () => {
    if (cursor == null || won || !word) return;
    if (entries[cursor]) { setEntries(e => { const c = [...e]; c[cursor] = ""; return c; }); fx("tap"); return; }
    const pos = word.cells.indexOf(cursor);
    if (pos > 0) { const prev = word.cells[pos - 1]; setEntries(e => { const c = [...e]; c[prev] = ""; return c; }); setCursor(prev); fx("tap"); }
  };
  const onKey = (k: string) => (k === "⌫" ? backspace() : typeLetter(k));

  /* Clavier physique. */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!model || won) return;
      if (e.key === "Backspace") { e.preventDefault(); backspace(); }
      else { const c = e.key.toUpperCase(); if (/^[A-Z]$/.test(c)) typeLetter(c); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, won, cursor, selWord, entries]);

  /* Victoire : toutes les cases-lettres correctes. */
  useEffect(() => {
    if (!model || won) return;
    const done = model.cells.every((c, i) => c.kind !== "letter" || entries[i] === c.sol);
    if (done && entries.length) { setWon(true); fx("victory"); }
  }, [entries, model, won]);

  const check = () => {
    if (!model) return;
    const bad = new Set<number>();
    model.cells.forEach((c, i) => { if (c.kind === "letter" && entries[i] && entries[i] !== c.sol) bad.add(i); });
    setWrong(bad); fx(bad.size ? "wrong" : "correct");
    setTimeout(() => setWrong(new Set()), 1200);
  };
  const revealWord = () => {
    if (!word || !model) return;
    setEntries(e => { const c = [...e]; word.cells.forEach(ci => { c[ci] = model.cells[ci].sol!; }); return c; });
    fx("point");
  };

  /* ── Menu ── */
  if (!model || pIdx == null) {
    return (
      <div className="screen game-screen mf-screen" style={{ ["--fx" as string]: "#0d9488", ["--fx2" as string]: "#2dd4bf" }}>
        <span className="fx-aurora" aria-hidden />
        <div className="game-topbar"><button className="btn-back" onClick={onLeave}>✕</button><div className="turn-indicator">➡️ Mots Fléchés</div><div /></div>
        <div className="mf-menu">
          <div className="mf-menu-title">Choisis une grille</div>
          {MF_PUZZLES.map((p, i) => (
            <motion.button key={p.id} className="mf-pick" onClick={() => startPuzzle(i)}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 * i }} whileTap={{ scale: 0.97 }}>
              <span className="mf-pick-emoji">{p.emoji}</span>
              <span className="mf-pick-txt"><b>{p.name}</b><span>{p.words.length} mots · {p.cols}×{p.rows}</span></span>
              <span className="mf-pick-go">→</span>
            </motion.button>
          ))}
        </div>
        <style>{MF_CSS}</style>
      </div>
    );
  }

  return (
    <div className="screen game-screen mf-screen" style={{ ["--fx" as string]: "#0d9488", ["--fx2" as string]: "#2dd4bf" }}>
      <span className="fx-aurora" aria-hidden />
      {won && <Confetti burstKey="mf-win" />}
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className="turn-indicator">{MF_PUZZLES[pIdx].emoji} {MF_PUZZLES[pIdx].name}</div>
        <div />
      </div>

      {/* Définition sélectionnée (lisible) */}
      <div className="mf-clue-bar">
        {word
          ? <><span className="mf-clue-arrow">{word.dir === "R" ? "▶" : "▼"}</span> {word.clue} <b>({word.answer.length})</b></>
          : "👆 Touche une case fléchée pour lire sa définition"}
      </div>

      {/* Grille */}
      <div className="mf-grid" style={{ gridTemplateColumns: `repeat(${model.cols}, 1fr)` }}>
        {model.cells.map((cell, i) => {
          if (cell.kind === "empty") return <div key={i} className="mf-cell mf-empty" />;
          if (cell.kind === "def") {
            return (
              <button key={i} className="mf-cell mf-def" onClick={() => cell.clues && pickWord(cell.clues[0].wordId)}>
                {cell.clues?.map((cl, k) => <span key={k} className="mf-defclue">{cl.text}</span>)}
                {cell.clues?.map((cl, k) => <span key={`a${k}`} className={`mf-arrow ${cl.dir === "R" ? "r" : "d"}`}>{cl.dir === "R" ? "▸" : "▾"}</span>)}
              </button>
            );
          }
          const inWord = !!word && word.cells.includes(i);
          const isCursor = cursor === i;
          const val = entries[i];
          return (
            <button key={i} className={`mf-cell mf-letter ${inWord ? "inword" : ""} ${isCursor ? "cursor" : ""} ${wrong.has(i) ? "wrong" : ""} ${won ? "won" : ""}`}
              onClick={() => tapLetter(i)}>
              {val}
            </button>
          );
        })}
      </div>

      {won && <motion.div className="mf-win" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>🏆 Grille complétée — bravo !</motion.div>}

      {/* Clavier */}
      {!won && (
        <div className="mf-keyboard">
          {KB_ROWS.map((row, i) => (
            <div key={i} className="mf-krow">
              {row.split("").map(k => (
                <button key={k} className={`mf-key ${k === "⌫" ? "wide" : ""}`} onClick={() => onKey(k)} disabled={cursor == null}>{k}</button>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="mf-actions">
        {won
          ? <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setPIdx(null); }}>🔄 Autre grille</button>
          : <>
              <button className="mf-act" onClick={check}>✅ Vérifier</button>
              <button className="mf-act" onClick={revealWord} disabled={!word}>💡 Révéler le mot</button>
              <button className="mf-act" onClick={() => setPIdx(null)}>♻ Grille</button>
            </>}
      </div>

      <style>{MF_CSS}</style>
    </div>
  );
}

const MF_CSS = `
.mf-screen{max-width:520px;margin:0 auto;position:relative;}
.mf-menu{max-width:400px;margin:1.4rem auto;display:flex;flex-direction:column;gap:.7rem;width:calc(100% - 1.6rem);}
.mf-menu-title{text-align:center;font-family:var(--font-d);font-size:1.25rem;color:var(--text);margin-bottom:.3rem;}
.mf-pick{display:flex;align-items:center;gap:.8rem;padding:.9rem 1rem;border-radius:16px;border:1.5px solid var(--border);
  background:linear-gradient(150deg,color-mix(in srgb,var(--fx) 10%,var(--surface-1)),var(--surface-1));box-shadow:var(--shadow);cursor:pointer;}
.mf-pick-emoji{font-size:1.6rem;}
.mf-pick-txt{flex:1;display:flex;flex-direction:column;text-align:left;}
.mf-pick-txt b{font-family:var(--font-d);font-size:1.05rem;color:var(--text);}
.mf-pick-txt span{font-size:.78rem;font-weight:700;color:var(--muted);}
.mf-pick-go{font-family:var(--font-d);font-size:1.3rem;color:var(--fx);}

.mf-clue-bar{max-width:460px;margin:.5rem auto;width:calc(100% - 1rem);text-align:center;font-weight:800;font-size:.9rem;color:var(--text);
  background:color-mix(in srgb,var(--fx) 12%,var(--surface-1));border:1.5px solid color-mix(in srgb,var(--fx) 26%,var(--border));
  border-radius:12px;padding:.55rem .7rem;min-height:1.2rem;line-height:1.35;}
.mf-clue-bar b{color:var(--fx);}
.mf-clue-arrow{color:var(--fx);font-size:.8rem;}

.mf-grid{display:grid;gap:2px;max-width:min(94vw,430px);margin:.3rem auto;background:color-mix(in srgb,var(--fx) 40%,var(--text));
  padding:2px;border-radius:12px;box-shadow:0 12px 30px color-mix(in srgb,var(--fx) 24%,transparent);}
.mf-cell{position:relative;aspect-ratio:1;border:none;padding:0;display:grid;place-items:center;font-family:var(--font-d);}
.mf-empty{background:color-mix(in srgb,var(--fx) 45%,var(--text));}
.mf-def{background:linear-gradient(150deg,#0f766e,#0b5c56);color:#eafffb;cursor:pointer;overflow:hidden;padding:1px;}
.mf-defclue{font-family:var(--font-b);font-weight:700;font-size:.4rem;line-height:1.05;text-align:center;padding:0 1px;
  display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;}
.mf-arrow{position:absolute;color:#ffd86b;font-size:.7rem;line-height:1;}
.mf-arrow.r{right:0;top:50%;transform:translateY(-50%);}
.mf-arrow.d{bottom:-1px;left:50%;transform:translateX(-50%);}
.mf-letter{background:var(--surface-1);color:var(--text);font-size:clamp(.9rem,4.4vw,1.35rem);text-transform:uppercase;cursor:pointer;transition:background .1s;}
.mf-letter.inword{background:color-mix(in srgb,var(--fx) 16%,var(--surface-1));}
.mf-letter.cursor{background:color-mix(in srgb,var(--fx) 34%,var(--surface-1));box-shadow:inset 0 0 0 2px var(--fx);}
.mf-letter.wrong{background:color-mix(in srgb,#ef4444 30%,var(--surface-1));color:#ef4444;}
.mf-letter.won{background:color-mix(in srgb,var(--green) 22%,var(--surface-1));color:var(--green);}

.mf-win{text-align:center;font-family:var(--font-d);font-size:1.15rem;color:var(--fx);margin:.5rem auto;}

.mf-keyboard{max-width:460px;margin:.4rem auto 0;width:calc(100% - .8rem);display:flex;flex-direction:column;gap:.34rem;}
.mf-krow{display:flex;gap:.26rem;justify-content:center;}
.mf-key{flex:1;min-width:0;height:44px;border:none;border-radius:9px;background:var(--surface-2);color:var(--text);
  font-family:var(--font-b);font-weight:900;font-size:1rem;box-shadow:0 2px 0 rgba(0,0,0,.14);cursor:pointer;}
.mf-key.wide{flex:1.6;}
.mf-key:active:not(:disabled){transform:translateY(2px);box-shadow:none;}
.mf-key:disabled{opacity:.45;}

.mf-actions{display:flex;gap:.4rem;justify-content:center;max-width:460px;margin:.6rem auto 0;width:calc(100% - .8rem);}
.mf-act{flex:1;padding:.6rem .3rem;border-radius:12px;border:1.5px solid var(--border);background:var(--surface-1);
  font-weight:800;font-size:.82rem;color:var(--text);cursor:pointer;}
.mf-act:hover:not(:disabled){border-color:color-mix(in srgb,var(--fx) 50%,transparent);}
.mf-act:disabled{opacity:.4;}
`;
