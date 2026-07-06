import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Avatar } from "./Avatar";
import { Confetti } from "./Confetti";
import { GAMES } from "../lib/gameData";
import { decodeAvatar, PRESET_AVATARS, DEFAULT_AVATAR, type Avatar as AvatarT } from "../lib/avatar";
import { getRanking, getRecords, ACHIEVEMENTS, resetPalmares, type PStat } from "../lib/familyStats";

function avatarFor(name: string): AvatarT {
  try { const m = JSON.parse(localStorage.getItem("khelij_avatars") || "{}"); const a = decodeAvatar(m[name]); if (a) return a; } catch { /* ignore */ }
  return PRESET_AVATARS[name] || DEFAULT_AVATAR;
}
const gameName = (id: string) => GAMES.find(g => g.id === id)?.name || id;
const MEDALS = ["🥇", "🥈", "🥉"];

export function Palmares({ onBack }: { onBack: () => void }) {
  const [nonce, setNonce] = useState(0);
  const ranking = useMemo(() => getRanking(), [nonce]);
  const records = useMemo(() => getRecords(), [nonce]);
  const hasData = ranking.length > 0 && ranking.some(s => s.games > 0);
  const podium = ranking.slice(0, 3);
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean) as PStat[];
  const BAR_H = [66, 96, 46];

  return (
    <div className="screen palmares">
      {hasData && <Confetti burstKey={nonce} />}
      <div className="pal-aurora" aria-hidden />
      <div className="screen-header pal-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <div className="pick-title"><h2>Palmarès famille</h2><span className="pick-sub">🏆 Le hall of fame</span></div>
        <div style={{ width: 40 }} />
      </div>

      {!hasData ? (
        <div className="pal-empty">
          <div className="pal-empty-badge">🏆</div>
          <h3>Aucune partie enregistrée</h3>
          <p>Jouez ensemble : victoires, points et records s'accumuleront ici pour couronner le champion de la famille !</p>
        </div>
      ) : (
        <>
          {/* Podium */}
          <div className="pal-podium">
            {podiumOrder.map(s => {
              const rank = ranking.indexOf(s);
              return (
                <div className="pal-slot" key={s.name}>
                  <motion.div className="pal-podium-player" initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.3 + (2 - rank) * 0.15 }}>
                    <div className={`pal-medal m${rank}`}>{MEDALS[rank]}</div>
                    <Avatar a={avatarFor(s.name)} size={rank === 0 ? 68 : 54} ring={rank === 0 ? "#ffcf3f" : undefined} />
                    <div className="pal-pname">{s.name}</div>
                    <div className="pal-pwins">{s.wins} 🏆</div>
                  </motion.div>
                  <motion.div className={`pal-bar b${rank}`} initial={{ height: 0 }} animate={{ height: BAR_H[rank] }}
                    transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.4 + (2 - rank) * 0.12 }} />
                </div>
              );
            })}
          </div>

          {/* Classement complet */}
          <div className="pal-section-t">Classement complet</div>
          <motion.div className="pal-ranking" initial="h" animate="s" variants={{ h: {}, s: { transition: { staggerChildren: 0.06, delayChildren: 0.8 } } }}>
            {ranking.map((s, i) => (
              <motion.div key={s.name} className={`pal-row ${i === 0 ? "lead" : ""}`}
                variants={{ h: { opacity: 0, x: -20 }, s: { opacity: 1, x: 0 } }}>
                <span className="pal-rank">{MEDALS[i] || `${i + 1}.`}</span>
                <Avatar a={avatarFor(s.name)} size={38} />
                <span className="pal-name">{s.name}
                  {s.streak >= 2 && <span className="pal-streak">🔥 {s.streak}</span>}
                </span>
                <span className="pal-stats">
                  <b>{s.wins}</b> V · {s.games} parties · <b>{s.points}</b> pts
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* Records */}
          <div className="pal-section-t">Records de la famille</div>
          <div className="pal-records">
            {records.topScore && <div className="pal-rec"><span className="pal-rec-ic">💯</span><div><b>{records.topScore.value} pts</b><small>{records.topScore.name} · {gameName(records.topScore.game)}</small></div></div>}
            {records.longestStreak && records.longestStreak.value > 0 && <div className="pal-rec"><span className="pal-rec-ic">🔥</span><div><b>{records.longestStreak.value} d'affilée</b><small>{records.longestStreak.name}</small></div></div>}
            {records.mostWins && <div className="pal-rec"><span className="pal-rec-ic">🏆</span><div><b>{records.mostWins.value} victoires</b><small>{records.mostWins.name}</small></div></div>}
            <div className="pal-rec"><span className="pal-rec-ic">🎲</span><div><b>{records.totalGames} parties</b><small>jouées en famille</small></div></div>
          </div>

          {/* Badges */}
          <div className="pal-section-t">Badges débloqués</div>
          <div className="pal-badges">
            {ACHIEVEMENTS.map(a => {
              const holders = ranking.filter(s => s.achievements.includes(a.id));
              const on = holders.length > 0;
              return (
                <div key={a.id} className={`pal-badge ${on ? "on" : ""}`} title={a.desc}>
                  <span className="pal-badge-e">{a.emoji}</span>
                  <span className="pal-badge-l">{a.label}</span>
                  <span className="pal-badge-d">{on ? holders.map(h => h.name).join(", ") : a.desc}</span>
                </div>
              );
            })}
          </div>

          <button className="pal-reset" onClick={() => { if (confirm("Effacer tout le palmarès de la famille ?")) { resetPalmares(); setNonce(n => n + 1); } }}>
            Réinitialiser le palmarès
          </button>
        </>
      )}
    </div>
  );
}
