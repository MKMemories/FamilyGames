import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { dbRef, update } from "../../lib/firebase";
import { gameHistory } from "../../hooks/useGameHistory";
import type { Room, JpProduct } from "../../types";

interface DummyJsonResponse {
  products: { id: number; title: string; price: number; thumbnail: string; category: string }[];
}

const TIMER_SEC   = 15;
const TOTAL_ROUNDS = 10;
const jpHistory   = gameHistory("justeprix");

const FALLBACK_PRODUCTS: JpProduct[] = [
  { id: 9001, title: "Écouteurs Bluetooth sans fil",  price: 49.99,  thumbnail: "", category: "Électronique" },
  { id: 9002, title: "Montre connectée sport",         price: 189.00, thumbnail: "", category: "Électronique" },
  { id: 9003, title: "Chaise de bureau ergonomique",   price: 299.99, thumbnail: "", category: "Mobilier" },
  { id: 9004, title: "Cafetière expresso automatique", price: 129.99, thumbnail: "", category: "Cuisine" },
  { id: 9005, title: "Tapis de yoga antidérapant",     price: 34.99,  thumbnail: "", category: "Sport" },
  { id: 9006, title: "Lampe de bureau LED flexible",   price: 24.99,  thumbnail: "", category: "Maison" },
  { id: 9007, title: "Casque audio à réduction de bruit", price: 249.00, thumbnail: "", category: "Électronique" },
  { id: 9008, title: "Robot aspirateur connecté",      price: 349.99, thumbnail: "", category: "Maison" },
  { id: 9009, title: "Paire de baskets de running",    price: 89.90,  thumbnail: "", category: "Sport" },
  { id: 9010, title: "Grille-pain 4 tranches inox",    price: 44.99,  thumbnail: "", category: "Cuisine" },
  { id: 9011, title: "Sac à dos de randonnée 40L",     price: 74.99,  thumbnail: "", category: "Sport" },
  { id: 9012, title: "Enceinte portable étanche",      price: 59.99,  thumbnail: "", category: "Électronique" },
  { id: 9013, title: "Set de 12 verres à eau",         price: 19.99,  thumbnail: "", category: "Cuisine" },
  { id: 9014, title: "Ventilateur sur pied silencieux",price: 39.99,  thumbnail: "", category: "Maison" },
  { id: 9015, title: "Trottinette électrique pliable", price: 399.00, thumbnail: "", category: "Mobilité" },
  { id: 9016, title: "Parapluie tempête automatique",  price: 22.50,  thumbnail: "", category: "Accessoires" },
];

interface JustePrixProps {
  room: Room;
  roomId: string;
  playerId: string;
  isHost: boolean;
  isSolo: boolean;
  onLeave: () => void;
}

export function JustePrix({ room, roomId, playerId, isHost, isSolo, onLeave }: JustePrixProps) {
  const [guess, setGuess]       = useState("");
  const [timeLeft, setTimeLeft] = useState(TIMER_SEC);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const didFetch = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const players    = Object.values(room.players || {});
  const round      = room.jpRound      ?? 0;
  const totalRounds = room.jpTotalRounds ?? TOTAL_ROUNDS;
  const product    = room.jpProduct    ?? null;
  const jpAnswers  = room.jpAnswers    ?? {};
  const revealed   = room.jpRevealed   ?? false;
  const scores     = room.scores       ?? {};

  /* ── Fetch product (host only) ── */
  useEffect(() => {
    if (!isHost || product || didFetch.current) return;
    didFetch.current = true;
    fetchProduct();
  }, [isHost, product]);

  /* ── Reset per round ── */
  useEffect(() => {
    setGuess(""); setSubmitted(false);
    didFetch.current = false;
    setTimeLeft(TIMER_SEC);
  }, [round]);

  /* ── Countdown timer ── */
  useEffect(() => {
    if (!product || revealed) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setTimeLeft(TIMER_SEC);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          if (isHost) update(dbRef(`games/${roomId}`), { jpRevealed: true });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [product?.id, revealed]);

  /* ── Auto-reveal when everyone answers ── */
  useEffect(() => {
    if (!product || revealed || !isHost) return;
    const allAnswered = players.length > 0 && players.every(p => jpAnswers[p.id] !== undefined);
    if (allAnswered) update(dbRef(`games/${roomId}`), { jpRevealed: true });
  }, [jpAnswers]);

  const fetchProduct = async () => {
    setIsLoading(true);
    try {
      const res  = await fetch("https://dummyjson.com/products?limit=100");
      const data: DummyJsonResponse = await res.json();
      const used = jpHistory.getUsedSet();
      const fresh = data.products.filter(p => !used.has(String(p.id)));
      const pool  = fresh.length >= 1 ? fresh : data.products;
      const prod  = pool[Math.floor(Math.random() * pool.length)];
      await update(dbRef(`games/${roomId}`), {
        jpProduct: { id: prod.id, title: prod.title, price: prod.price, thumbnail: prod.thumbnail, category: prod.category },
        jpAnswers: {}, jpRevealed: false,
      });
    } catch {
      const used  = jpHistory.getUsedSet();
      const fresh = FALLBACK_PRODUCTS.filter(p => !used.has(String(p.id)));
      const pool  = fresh.length >= 1 ? fresh : FALLBACK_PRODUCTS;
      const prod  = pool[Math.floor(Math.random() * pool.length)];
      await update(dbRef(`games/${roomId}`), {
        jpProduct: prod, jpAnswers: {}, jpRevealed: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    if (submitted || revealed || !product) return;
    const val = parseFloat(guess.replace(",", "."));
    if (isNaN(val) || val < 0) return;
    setSubmitted(true);
    update(dbRef(`games/${roomId}`), { [`jpAnswers/${playerId}`]: val });
  };

  const handleNextRound = async () => {
    if (!product) return;
    /* Award points */
    const newScores = { ...scores };
    const entries = players.map(p => ({
      p, diff: jpAnswers[p.id] !== undefined
        ? Math.abs(jpAnswers[p.id] - product.price)
        : Infinity,
    }));
    const minDiff = Math.min(...entries.map(e => e.diff));
    entries.forEach(({ p, diff }) => {
      if (diff === minDiff && diff !== Infinity) {
        newScores[p.id] = (newScores[p.id] || 0) + 10;
        if (diff === 0) newScores[p.id] += 25; // Bonus: exact!
      }
    });
    /* History */
    jpHistory.saveSession([String(product.id)]);
    const nextRound = round + 1;
    if (nextRound >= totalRounds) {
      const winner = [...players].sort((a, b) => (newScores[b.id] || 0) - (newScores[a.id] || 0))[0]?.name || "?";
      await update(dbRef(`games/${roomId}`), { scores: newScores, status: "finished", winner, jpRound: nextRound });
    } else {
      await update(dbRef(`games/${roomId}`), {
        scores: newScores, jpRound: nextRound, jpProduct: null, jpRevealed: false, jpAnswers: {},
      });
    }
  };

  const timerPct   = (timeLeft / TIMER_SEC) * 100;
  const timerColor = timerPct > 55 ? "#4caf50" : timerPct > 28 ? "#ffbe42" : "#ff5252";

  // Presentation-only: slot-machine count-up for the price reveal.
  const priceCount = useCountUp(product ? product.price : 0, 1200, revealed && !!product);

  /* ── Loading ── */
  if (isLoading || !product) {
    return (
      <div className="screen game-screen">
        <div className="game-topbar">
          <button className="btn-back" onClick={onLeave}>✕</button>
          <div className="turn-indicator">💰 Le Juste Prix</div>
          <div />
        </div>
        <div className="quiz-loading">
          <div className="quiz-spinner" />
          <div>{isHost ? "Chargement du produit…" : "En attente du produit…"}</div>
        </div>
      </div>
    );
  }

  /* ── Score rows for reveal ── */
  const revealEntries = players.map(p => ({
    p,
    val:  jpAnswers[p.id],
    diff: jpAnswers[p.id] !== undefined ? Math.abs(jpAnswers[p.id] - product.price) : Infinity,
  }));
  const minDiff = Math.min(...revealEntries.map(e => e.diff));

  return (
    <div className="screen game-screen jp-screen">
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className="turn-indicator">💰 Manche {round + 1}/{totalRounds}</div>
        <div className="score-mini">
          {players.map(p => (
            <span key={p.id} style={{ color: p.color || "#333" }}>
              {p.name.slice(0, 4)} {scores[p.id] || 0}
            </span>
          ))}
        </div>
      </div>

      {/* Timer */}
      {!revealed && (
        <div className="quiz-timer-bar">
          <div className="quiz-timer-fill" style={{ width: `${timerPct}%`, background: timerColor }} />
          <span className="quiz-timer-num" style={{ color: timerColor }}>{timeLeft}s</span>
        </div>
      )}

      {/* Product card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={product.id}
          className="jp-product-card"
          initial={{ opacity: 0, scale: 0.85, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -16 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
        >
          {product.thumbnail ? (
            <motion.img
              src={product.thumbnail} alt={product.title} className="jp-product-img"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 20, delay: 0.1 }}
            />
          ) : (
            <div className="jp-img-placeholder">🛒</div>
          )}
          <motion.div
            className="jp-product-cat"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 15, delay: 0.16 }}
          >
            {product.category}
          </motion.div>
          <motion.div
            className="jp-product-title"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.32 }}
          >
            {product.title}
          </motion.div>
          <div className="jp-question">💬 À ton avis, combien ça coûte ?</div>
        </motion.div>
      </AnimatePresence>

      {/* Input zone / reveal */}
      {!revealed ? (
        <motion.div
          className="jp-input-zone"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.3 }}
        >
          {submitted ? (
            <div className="jp-submitted">
              ✅ Réponse envoyée !
              <div className="jp-waiting-count">
                {Object.keys(jpAnswers).length}/{players.length} joueur(s) ont répondu
              </div>
            </div>
          ) : (
            <div className="jp-input-row">
              <span className="jp-euro">€</span>
              <input
                type="number"
                className="jp-input"
                placeholder="Prix estimé…"
                value={guess}
                onChange={e => setGuess(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                min="0" step="0.01" autoFocus
              />
              <button className="btn btn-primary jp-submit-btn" onClick={handleSubmit} disabled={!guess}>
                →
              </button>
            </div>
          )}
        </motion.div>
      ) : (
        <div className="jp-reveal">
          <motion.div
            className="jp-real-price"
            initial={{ scale: 0, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 13, delay: 0.1 }}
          >
            Prix réel : <strong>{priceCount.toFixed(2)} €</strong>
          </motion.div>
          <div className="jp-results">
            {(() => {
              const sorted = revealEntries.slice().sort((a, b) => a.diff - b.diff);
              const finite = sorted.filter(e => e.diff !== Infinity).map(e => e.diff);
              const maxDiff = finite.length ? Math.max(...finite, 0.0001) : 1;
              return sorted.map(({ p, val, diff }, i) => {
                const isWinner = diff === minDiff && diff !== Infinity;
                const isPerfect = diff === 0;
                // Closeness fill: 100% for the closest, shrinking with distance.
                const closeness = diff === Infinity ? 0 : Math.max(0.06, 1 - diff / maxDiff);
                const barColor = isPerfect || isWinner ? "var(--green)" : "var(--accent)";
                return (
                  <motion.div
                    key={p.id}
                    className={`jp-result-row ${isWinner ? "jp-winner-row" : ""}`}
                    style={{ borderLeftColor: p.color || "var(--accent)" }}
                    initial={{ opacity: 0, x: -22 }}
                    animate={isWinner
                      ? { opacity: 1, x: 0, scale: [1, 1.06, 1.01] }
                      : { opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.12, type: "spring", stiffness: 300, damping: 22 }}
                  >
                    {isWinner && (
                      <span className="jp-confetti" aria-hidden="true">
                        {[...Array(6)].map((_, k) => (
                          <motion.i
                            key={k}
                            className="jp-confetti-bit"
                            style={{ left: `${12 + k * 14}%`, background: ["var(--gold)", "var(--primary)", "var(--accent)", "var(--green)"][k % 4] }}
                            initial={{ opacity: 0, y: 6, scale: 0 }}
                            animate={{ opacity: [0, 1, 0], y: -26 - (k % 3) * 8, scale: [0, 1, 0.6] }}
                            transition={{ duration: 1, delay: 0.6 + i * 0.12 + k * 0.04, ease: "easeOut" }}
                          />
                        ))}
                      </span>
                    )}
                    <span className="jp-r-name">{p.emoji} {p.name}</span>
                    {val !== undefined ? (
                      <>
                        <span className="jp-r-guess">{val.toFixed(2)} €</span>
                        <span className="jp-r-diff">
                          {isPerfect ? "🎯 Parfait ! +35pts" : isWinner ? `✨ ±${diff.toFixed(2)} € +10pts` : `±${diff.toFixed(2)} €`}
                        </span>
                      </>
                    ) : (
                      <span className="jp-r-noans">⏰ Pas de réponse</span>
                    )}
                    <span className="jp-closeness-track">
                      <motion.span
                        className="jp-closeness-fill"
                        style={{ background: barColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${closeness * 100}%` }}
                        transition={{ delay: 0.62 + i * 0.12, duration: 0.7, ease: "easeOut" }}
                      />
                    </span>
                  </motion.div>
                );
              });
            })()}
          </div>
          {(isHost || isSolo) ? (
            <button className="btn btn-primary" style={{ marginTop: "1rem", width: "100%" }} onClick={handleNextRound}>
              {round + 1 >= totalRounds ? "🏆 Voir le podium" : "Manche suivante →"}
            </button>
          ) : (
            <div className="waiting-host">⏳ En attente de l'hôte…</div>
          )}
        </div>
      )}

      <style>{JP_CSS}</style>
    </div>
  );
}

/* Presentation-only count-up: animates a number from 0 → target with an
   ease-out curve when `run` flips true. Pure React + rAF, no libraries. */
function useCountUp(target: number, duration: number, run: boolean) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run) { setVal(0); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setVal(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, run]);
  return val;
}

/* Premium chrome for Le Juste Prix. Theme-variable driven for light + dark.
   Only decorates presentation — product fetch, answers, scoring untouched. */
const JP_CSS = `
.jp-real-price {
  position: relative;
  box-shadow: 0 6px 20px rgba(240,171,52,.4);
  will-change: transform;
}
.jp-result-row { position: relative; overflow: hidden; }
.jp-closeness-track {
  position: absolute; left: 0; bottom: 0; height: 3px; width: 100%;
  background: transparent; pointer-events: none;
}
.jp-closeness-fill {
  display: block; height: 100%; border-radius: 0 3px 0 0;
  box-shadow: 0 0 6px currentColor;
}
.jp-winner-row {
  animation: jpWinnerGlow 1.6s ease-in-out infinite alternate;
}
@keyframes jpWinnerGlow {
  0%   { box-shadow: 0 2px 10px color-mix(in srgb, var(--green) 26%, transparent); }
  100% { box-shadow: 0 4px 20px color-mix(in srgb, var(--green) 55%, transparent); }
}
.jp-confetti {
  position: absolute; inset: 0; pointer-events: none; overflow: visible; z-index: 2;
}
.jp-confetti-bit {
  position: absolute; top: 40%; width: 6px; height: 6px; border-radius: 1px;
  display: block;
}
`;
