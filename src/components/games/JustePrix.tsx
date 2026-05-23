import { useState, useEffect, useRef } from "react";
import { dbRef, update } from "../../lib/firebase";
import { gameHistory } from "../../hooks/useGameHistory";
import type { Room, JpProduct } from "../../types";

interface DummyJsonResponse {
  products: { id: number; title: string; price: number; thumbnail: string; category: string }[];
}

const TIMER_SEC   = 15;
const TOTAL_ROUNDS = 3;
const jpHistory   = gameHistory("justeprix");

const FALLBACK_PRODUCTS: JpProduct[] = [
  { id: 9001, title: "Écouteurs Bluetooth sans fil",  price: 49.99,  thumbnail: "", category: "Électronique" },
  { id: 9002, title: "Montre connectée sport",         price: 189.00, thumbnail: "", category: "Électronique" },
  { id: 9003, title: "Chaise de bureau ergonomique",   price: 299.99, thumbnail: "", category: "Mobilier" },
  { id: 9004, title: "Cafetière expresso automatique", price: 129.99, thumbnail: "", category: "Cuisine" },
  { id: 9005, title: "Tapis de yoga antidérapant",     price: 34.99,  thumbnail: "", category: "Sport" },
  { id: 9006, title: "Lampe de bureau LED flexible",   price: 24.99,  thumbnail: "", category: "Maison" },
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
    update(dbRef(`games/${roomId}`), { jpAnswers: { ...jpAnswers, [playerId]: val } });
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
      <div className="jp-product-card">
        {product.thumbnail ? (
          <img src={product.thumbnail} alt={product.title} className="jp-product-img" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className="jp-img-placeholder">🛒</div>
        )}
        <div className="jp-product-cat">{product.category}</div>
        <div className="jp-product-title">{product.title}</div>
        <div className="jp-question">💬 À ton avis, combien ça coûte ?</div>
      </div>

      {/* Input zone / reveal */}
      {!revealed ? (
        <div className="jp-input-zone">
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
        </div>
      ) : (
        <div className="jp-reveal">
          <div className="jp-real-price">
            Prix réel : <strong>{product.price.toFixed(2)} €</strong>
          </div>
          <div className="jp-results">
            {revealEntries.sort((a, b) => a.diff - b.diff).map(({ p, val, diff }) => {
              const isWinner = diff === minDiff && diff !== Infinity;
              const isPerfect = diff === 0;
              return (
                <div key={p.id} className={`jp-result-row ${isWinner ? "jp-winner-row" : ""}`}
                  style={{ borderLeftColor: p.color || "var(--accent)" }}>
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
                </div>
              );
            })}
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
    </div>
  );
}
