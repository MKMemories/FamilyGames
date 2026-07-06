import { useEffect, useRef } from "react";

/* Canon à confettis plein écran (canvas, sans dépendance). Tire une salve à
   l'apparition ; se relance quand `burstKey` change. Léger et fluide. */
interface Props { burstKey?: number | string; count?: number; duration?: number; }
const COLORS = ["#ff5b93", "#7b5cff", "#ffcf3f", "#22c55e", "#38bdf8", "#f97316", "#e11d48"];

interface P { x: number; y: number; vx: number; vy: number; g: number; rot: number; vr: number; size: number; color: string; shape: number; life: number; }

export function Confetti({ burstKey = 0, count = 150, duration = 2600 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    const resize = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize();
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const parts: P[] = [];
    const spawn = (ox: number, dir: number) => {
      for (let i = 0; i < count / 2; i++) {
        const ang = (-Math.PI / 2) + dir * (Math.random() * 0.6 + 0.1);
        const sp = 6 + Math.random() * 9;
        parts.push({ x: ox, y: H * 0.42, vx: Math.cos(ang) * sp * dir + (Math.random() - 0.5) * 2, vy: Math.sin(ang) * sp - Math.random() * 3,
          g: 0.16 + Math.random() * 0.08, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
          size: 5 + Math.random() * 6, color: COLORS[(Math.random() * COLORS.length) | 0], shape: (Math.random() * 3) | 0, life: 1 });
      }
    };
    spawn(W * 0.12, 1); spawn(W * 0.88, -1); spawn(W * 0.5, Math.random() < 0.5 ? 1 : -1);

    const t0 = performance.now();
    let raf = 0;
    const frame = (t: number) => {
      const el = t - t0;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.rot += p.vr;
        if (el > duration - 700) p.life = Math.max(0, p.life - 0.02);
        ctx.save(); ctx.globalAlpha = p.life; ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color;
        if (p.shape === 0) ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
        else if (p.shape === 1) { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, 6.28); ctx.fill(); }
        else { ctx.beginPath(); ctx.moveTo(0, -p.size / 2); ctx.lineTo(p.size / 2, p.size / 2); ctx.lineTo(-p.size / 2, p.size / 2); ctx.closePath(); ctx.fill(); }
        ctx.restore();
      }
      if (el < duration) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [burstKey, count, duration]);

  return <canvas ref={ref} className="confetti-canvas" aria-hidden />;
}
