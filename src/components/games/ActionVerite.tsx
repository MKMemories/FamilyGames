import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { dbRef, update } from "../../lib/firebase";
import { gameHistory } from "../../hooks/useGameHistory";
import { fx } from "../../lib/sound";
import { pickPrompt } from "../../lib/actionVeriteData";
import type { Room } from "../../types";

interface Props { room: Room; roomId: string; playerId: string; isHost: boolean; isSolo: boolean; onLeave: () => void; onToast: (m: string) => void; }

const hist = gameHistory("actionverite");
const shuffle = <T,>(a: T[]): T[] => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

export function ActionVerite({ room, roomId, playerId, isHost, onLeave, onToast }: Props) {
  const players = Object.values(room.players || {});
  const order = room.avOrder ?? [];
  const turn = room.avTurn ?? 0;
  const type = room.avType ?? null;
  const prompt = room.avPrompt ?? null;
  const usedV = room.avUsedV ?? [];
  const usedA = room.avUsedA ?? [];
  const counts = room.avCounts ?? {};
  const round = room.avRound ?? 0;
  const over = room.status === "finished";
  const path = `games/${roomId}`;
  const cur = order[turn] || "";
  const isMyTurn = cur === playerId && !over;
  const pOf = (id: string) => (room.players || {})[id];
  const nameOf = (id: string) => pOf(id)?.name || "Joueur";

  /* Hôte : fixe l'ordre de passage. */
  useEffect(() => {
    if (!isHost || order.length > 0 || players.length === 0) return;
    update(dbRef(path), { avOrder: shuffle(players.map(p => p.id)), avTurn: 0, avType: null, avPrompt: null, avRound: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, order.length, players.length]);

  const draw = (t: "verite" | "action") => {
    if (!isMyTurn || over) return;
    const used = t === "verite" ? usedV : usedA;
    const { idx, text } = pickPrompt(t, used, hist.getUsedSet());
    fx(t === "action" ? "start" : "select");
    update(dbRef(path), {
      avType: t, avPrompt: text,
      ...(t === "verite" ? { avUsedV: [...usedV, idx] } : { avUsedA: [...usedA, idx] }),
    });
  };

  const another = () => {
    if (!isMyTurn || !type || over) return;
    const used = type === "verite" ? usedV : usedA;
    const { idx, text } = pickPrompt(type, used, hist.getUsedSet());
    fx("tap");
    update(dbRef(path), { avPrompt: text, ...(type === "verite" ? { avUsedV: [...usedV, idx] } : { avUsedA: [...usedA, idx] }) });
  };

  const next = () => {
    if (over || !type) return;
    hist.saveSession([`${type === "verite" ? "v" : "a"}:${(type === "verite" ? usedV : usedA).slice(-1)[0] ?? 0}`]);
    update(dbRef(path), {
      avTurn: (turn + 1) % Math.max(order.length, 1),
      avType: null, avPrompt: null, avRound: round + 1,
      [`avCounts/${cur}`]: (counts[cur] || 0) + 1,
    });
    fx("point");
  };

  const finish = () => {
    if (over) return;
    update(dbRef(path), { status: "finished", winner: "Toute la famille 🎉" });
  };

  const canControl = isMyTurn || isHost;

  return (
    <div className="screen game-screen av-screen" style={{ ["--fx" as string]: "#e11d48", ["--fx2" as string]: "#fb7185" }}>
      <span className="fx-aurora" aria-hidden />
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className="turn-indicator">🎯 Action ou Vérité</div>
        {isHost && !over ? <button className="tet-pause" onClick={finish} title="Terminer">🏁</button> : <div />}
      </div>

      {/* Bandeau des joueurs */}
      <div className="av-players">
        {order.map(id => (
          <div key={id} className={`av-pl ${id === cur && !over ? "cur" : ""}`}>
            <span className="av-pl-emoji">{pOf(id)?.emoji || "🙂"}</span>
            <span className="av-pl-name">{nameOf(id).slice(0, 8)}</span>
            {(counts[id] || 0) > 0 && <span className="av-pl-badge">{counts[id]}</span>}
          </div>
        ))}
      </div>

      {over ? (
        <div className="av-over">
          <div className="av-over-emoji">🎉</div>
          <h2>Bravo la famille !</h2>
          <p>{round} défis et vérités relevés ensemble.</p>
        </div>
      ) : (
        <div className="av-stage">
          <div className="av-whose">{isMyTurn ? "🟢 À toi de jouer !" : `Au tour de ${nameOf(cur)}`}</div>

          <AnimatePresence mode="wait">
            {!type ? (
              <motion.div key="choose" className="av-choose" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {isMyTurn ? (
                  <>
                    <button className="av-btn av-verite" onClick={() => draw("verite")}>
                      <span className="av-btn-emoji">💬</span><b>Vérité</b><span>Une question rigolote</span>
                    </button>
                    <button className="av-btn av-action" onClick={() => draw("action")}>
                      <span className="av-btn-emoji">🎬</span><b>Action</b><span>Un petit défi</span>
                    </button>
                  </>
                ) : (
                  <div className="av-wait">⏳ {nameOf(cur)} choisit Vérité ou Action…</div>
                )}
              </motion.div>
            ) : (
              <motion.div key={prompt} className={`av-card ${type}`} initial={{ opacity: 0, scale: 0.9, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                <div className="av-card-badge">{type === "verite" ? "💬 Vérité" : "🎬 Action"}</div>
                <div className="av-card-who">{pOf(cur)?.emoji} {nameOf(cur)}</div>
                <div className="av-card-text">{prompt}</div>
                {canControl && (
                  <div className="av-card-actions">
                    {isMyTurn && <button className="av-mini" onClick={another}>🔄 Autre</button>}
                    <button className="btn btn-primary av-next" onClick={next}>Suivant →</button>
                  </div>
                )}
                {!canControl && <div className="waiting-host">⏳ En attente…</div>}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="av-hint">100 % bienveillant · chacun son tour · l'hôte peut terminer avec 🏁</div>
        </div>
      )}

      <style>{AV_CSS}</style>
    </div>
  );
}

const AV_CSS = `
.av-screen{max-width:520px;margin:0 auto;position:relative;}
.av-players{display:flex;gap:.4rem;justify-content:center;flex-wrap:wrap;margin:.5rem auto;max-width:480px;}
.av-pl{position:relative;display:flex;flex-direction:column;align-items:center;gap:.05rem;padding:.35rem .55rem;border-radius:12px;background:var(--surface-1);border:1.5px solid var(--border);min-width:52px;}
.av-pl.cur{border-color:color-mix(in srgb,var(--fx) 60%,transparent);box-shadow:0 0 0 2px color-mix(in srgb,var(--fx) 26%,transparent);}
.av-pl-emoji{font-size:1.2rem;line-height:1;}
.av-pl-name{font-size:.68rem;font-weight:900;color:var(--text);}
.av-pl-badge{position:absolute;top:-6px;right:-6px;min-width:16px;height:16px;padding:0 3px;border-radius:9px;background:var(--fx);color:#fff;font-size:.6rem;font-weight:900;display:grid;place-items:center;}

.av-stage{max-width:440px;margin:.5rem auto;width:calc(100% - 1rem);display:flex;flex-direction:column;align-items:center;gap:.7rem;}
.av-whose{font-family:var(--font-d);font-size:1.15rem;color:var(--text);text-align:center;}

.av-choose{display:grid;grid-template-columns:1fr 1fr;gap:.7rem;width:100%;}
.av-btn{display:flex;flex-direction:column;align-items:center;gap:.15rem;padding:1.3rem .8rem;border-radius:20px;border:none;cursor:pointer;color:#fff;box-shadow:0 10px 26px rgba(0,0,0,.18);transition:transform .12s;}
.av-btn:active{transform:scale(.96);}
.av-btn-emoji{font-size:2rem;}
.av-btn b{font-family:var(--font-d);font-size:1.35rem;}
.av-btn span{font-size:.72rem;font-weight:700;opacity:.92;}
.av-verite{background:linear-gradient(150deg,#6366f1,#818cf8);}
.av-action{background:linear-gradient(150deg,#e11d48,#fb7185);}
.av-wait{grid-column:1/-1;text-align:center;font-weight:800;color:var(--muted);padding:1.5rem 0;}

.av-card{width:100%;border-radius:22px;padding:1.4rem 1.2rem;text-align:center;color:#fff;position:relative;
  box-shadow:0 16px 40px rgba(0,0,0,.22),inset 0 2px 0 rgba(255,255,255,.25);}
.av-card.verite{background:linear-gradient(155deg,#6366f1,#4338ca);}
.av-card.action{background:linear-gradient(155deg,#e11d48,#be123c);}
.av-card-badge{display:inline-block;font-weight:900;font-size:.78rem;background:rgba(255,255,255,.22);padding:.25rem .7rem;border-radius:999px;margin-bottom:.6rem;}
.av-card-who{font-family:var(--font-d);font-size:1.05rem;margin-bottom:.5rem;opacity:.95;}
.av-card-text{font-family:var(--font-d);font-size:1.5rem;line-height:1.3;margin:.2rem 0 1rem;text-wrap:balance;}
.av-card-actions{display:flex;gap:.5rem;justify-content:center;align-items:center;flex-wrap:wrap;}
.av-mini{border:none;background:rgba(255,255,255,.22);color:#fff;font-weight:800;font-size:.85rem;padding:.55rem .9rem;border-radius:12px;cursor:pointer;}
.av-next{background:#fff;color:var(--fx);border:none;}
.av-card .waiting-host{margin-top:.6rem;color:rgba(255,255,255,.9);}

.av-hint{text-align:center;font-size:.74rem;font-weight:700;color:var(--muted);margin-top:.3rem;max-width:340px;line-height:1.4;}

.av-over{max-width:400px;margin:2rem auto;text-align:center;display:flex;flex-direction:column;align-items:center;gap:.4rem;}
.av-over-emoji{font-size:3.2rem;}
.av-over h2{font-family:var(--font-d);font-size:1.7rem;color:var(--fx);margin:0;}
.av-over p{color:var(--muted);font-weight:700;margin:0;}
`;
