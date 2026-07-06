import { useMemo } from "react";
import {
  type Avatar as AvatarT, SKINS, BGS, HAIR_COLORS, OUTFIT_COLORS,
} from "../lib/avatar";

/* Personnage vectoriel composé de couches. viewBox 0 0 100 100, tête ~ (50,44). */

interface Props { a: AvatarT; size?: number; ring?: string; className?: string; flat?: boolean; }

let uidc = 0;

export function Avatar({ a, size = 72, ring, className, flat }: Props) {
  const id = useMemo(() => `av${(uidc = (uidc + 1) % 1e6)}`, []);
  const skin = SKINS[a.skin] || SKINS[1];
  const skinD = shade(skin, -18);       // ombre peau
  const bg = BGS[a.bg] || BGS[0];
  const hairC = HAIR_COLORS[a.hairColor] || HAIR_COLORS[0];
  const hairD = shade(hairC, -22);
  const outC = OUTFIT_COLORS[a.outfit % OUTFIT_COLORS.length];

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className}
      style={{ borderRadius: "50%", boxShadow: ring ? `0 0 0 3px ${ring}` : undefined, display: "block" }}>
      <defs>
        <radialGradient id={`${id}bg`} cx="50%" cy="34%" r="80%">
          <stop offset="0%" stopColor={bg.from} />
          <stop offset="100%" stopColor={bg.to} />
        </radialGradient>
        <linearGradient id={`${id}sk`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tint(skin, 8)} />
          <stop offset="100%" stopColor={skin} />
        </linearGradient>
        <clipPath id={`${id}clip`}><circle cx="50" cy="50" r="50" /></clipPath>
      </defs>

      <g clipPath={`url(#${id}clip)`}>
        <rect x="0" y="0" width="100" height="100" fill={`url(#${id}bg)`} />
        {!flat && <circle cx="50" cy="30" r="42" fill="#fff" opacity="0.10" />}

        {/* Cheveux arrière (long / afro / voile) */}
        <BackHair a={a} c={hairC} cd={hairD} />

        {/* Corps + tenue */}
        <Outfit a={a} c={outC} skin={skin} skinD={skinD} id={id} />

        {/* Cou */}
        <path d="M43 55 h14 v10 q-7 4 -14 0 z" fill={skinD} />

        {/* Tête */}
        <ellipse cx="50" cy="43" rx="20.5" ry="22" fill={`url(#${id}sk)`} />
        <ellipse cx="29.5" cy="45" rx="4.2" ry="5" fill={skin} />
        <ellipse cx="70.5" cy="45" rx="4.2" ry="5" fill={skin} />
        {/* Joues */}
        <ellipse cx="37" cy="50" rx="4.5" ry="3" fill="#ff5b93" opacity="0.20" />
        <ellipse cx="63" cy="50" rx="4.5" ry="3" fill="#ff5b93" opacity="0.20" />

        {/* Pilosité (barbe / bouc) sous le visage */}
        <Facial a={a} c={hairC} />

        {/* Traits du visage */}
        <Eyes a={a} />
        {/* Nez */}
        <path d="M49 46 q1.2 3 0 4.4" fill="none" stroke={skinD} strokeWidth="1.1" strokeLinecap="round" opacity=".55" />
        <Mouth a={a} />
        {/* Moustache par-dessus la bouche */}
        <Mustache a={a} c={hairC} />

        {/* Cheveux avant */}
        <FrontHair a={a} c={hairC} cd={hairD} />

        {/* Accessoire au premier plan */}
        <Accessory a={a} id={id} />

        <rect x="0" y="0" width="100" height="100" fill="none" />
      </g>
    </svg>
  );
}

/* ───────────────────────── COIFFURES ───────────────────────── */
function BackHair({ a, c, cd }: { a: AvatarT; c: string; cd: string }) {
  switch (a.hair) {
    case 4: // Afro
      return <circle cx="50" cy="38" r="27" fill={cd} />;
    case 7: // Long
      return <path d="M22 40 q-4 32 6 46 h44 q10 -14 6 -46 q-6 20 -28 20 q-22 0 -28 -20 z" fill={c} />;
    case 6: // Couettes
      return <><circle cx="24" cy="52" r="8" fill={c} /><circle cx="76" cy="52" r="8" fill={c} /></>;
    case 10: // Ondulé (retombe un peu)
      return <path d="M26 42 q-3 20 2 30 h44 q5 -10 2 -30 q-6 16 -24 16 q-18 0 -24 -16 z" fill={c} />;
    case 11: // Voile
      return <path d="M20 44 q0 -30 30 -30 q30 0 30 30 q0 30 -6 42 h-12 q6 -18 4 -34 q-2 -18 -16 -18 q-14 0 -16 18 q-2 16 4 34 h-12 q-6 -12 -6 -42 z" fill={c} />;
    default: return null;
  }
}

function FrontHair({ a, c, cd }: { a: AvatarT; c: string; cd: string }) {
  switch (a.hair) {
    case 0: return null; // Chauve
    case 1: // Court
      return <path d="M28 42 q-2 -26 22 -26 q24 0 22 26 q-4 -12 -10 -13 q3 6 -1 8 q-2 -8 -9 -8 q-7 0 -9 8 q-4 -2 -1 -8 q-6 1 -10 13 z" fill={c} />;
    case 2: // Brosse
      return <path d="M30 38 q0 -22 20 -22 q20 0 20 22 q-6 -8 -20 -8 q-14 0 -20 8 z" fill={c} />;
    case 3: // Bouclé
      return <g fill={c}><circle cx="34" cy="30" r="8" /><circle cx="44" cy="25" r="9" /><circle cx="56" cy="25" r="9" /><circle cx="66" cy="30" r="8" /><circle cx="30" cy="38" r="6" /><circle cx="70" cy="38" r="6" /></g>;
    case 4: return <path d="M30 34 q0 -18 20 -18 q20 0 20 18 q-8 -8 -20 -8 q-12 0 -20 8 z" fill={c} />; // Afro devant
    case 5: // Chignon
      return <><circle cx="50" cy="16" r="7" fill={c} /><path d="M30 40 q0 -24 20 -24 q20 0 20 24 q-6 -10 -20 -10 q-14 0 -20 10 z" fill={c} /></>;
    case 6: // Couettes (frange)
      return <path d="M30 40 q0 -24 20 -24 q20 0 20 24 q-6 -12 -20 -12 q-14 0 -20 12 z" fill={c} />;
    case 7: // Long (frange)
      return <path d="M28 42 q-2 -28 22 -28 q24 0 22 28 q-5 -14 -12 -15 q4 8 -2 10 q-3 -10 -8 -10 q-5 0 -8 10 q-6 -2 -2 -10 q-7 1 -12 15 z" fill={c} />;
    case 8: // Crête (mohawk)
      return <path d="M44 12 q6 -4 12 0 q1 16 -6 24 q-7 -8 -6 -24 z" fill={c} />;
    case 9: // Piquant
      return <path d="M30 40 l4 -14 l4 10 l5 -16 l5 14 l5 -16 l5 16 l5 -14 l4 14 q-8 -8 -20 -8 q-12 0 -20 8 z" fill={c} />;
    case 10: // Ondulé
      return <path d="M28 40 q-2 -24 22 -24 q24 0 22 24 q-5 -10 -11 -8 q3 5 -3 7 q-3 -9 -8 -9 q-5 0 -8 9 q-6 -2 -3 -7 q-6 -2 -11 8 z" fill={c} />;
    case 11: return null; // Voile : géré à l'arrière
    default: return null;
  }
  void cd;
}

/* ───────────────────────── YEUX ───────────────────────── */
function Eyes({ a }: { a: AvatarT }) {
  const L = 41.5, R = 58.5, y = 42;
  const brow = (x: number) => <path d={`M${x - 4} 35.5 q4 -2 8 0`} stroke="#3a2f2a" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity=".55" />;
  switch (a.eyes) {
    case 1: // Joyeux (arcs)
      return <g stroke="#2b2530" strokeWidth="2.4" fill="none" strokeLinecap="round">
        <path d={`M${L - 4} ${y + 1} q4 -5 8 0`} /><path d={`M${R - 4} ${y + 1} q4 -5 8 0`} /></g>;
    case 2: // Clin d'œil
      return <g>{brow(L)}{brow(R)}
        <circle cx={L} cy={y} r="3.2" fill="#2b2530" /><circle cx={L + 1} cy={y - 1} r="1" fill="#fff" />
        <path d={`M${R - 4} ${y} q4 -4 8 0`} stroke="#2b2530" strokeWidth="2.4" fill="none" strokeLinecap="round" /></g>;
    case 3: // Étoilé
      return <g fill="#2b2530">{star(L, y)}{star(R, y)}</g>;
    case 4: // Endormi
      return <g stroke="#2b2530" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <path d={`M${L - 4} ${y} h8`} /><path d={`M${R - 4} ${y} h8`} /></g>;
    case 5: // Surpris (grands)
      return <g>{brow(L)}{brow(R)}
        <circle cx={L} cy={y} r="4.4" fill="#fff" stroke="#c9b8a0" strokeWidth=".5" /><circle cx={R} cy={y} r="4.4" fill="#fff" stroke="#c9b8a0" strokeWidth=".5" />
        <circle cx={L} cy={y} r="2.4" fill="#2b2530" /><circle cx={R} cy={y} r="2.4" fill="#2b2530" /></g>;
    default: // Normal
      return <g>{brow(L)}{brow(R)}
        <ellipse cx={L} cy={y} rx="3" ry="3.6" fill="#fff" /><ellipse cx={R} cy={y} rx="3" ry="3.6" fill="#fff" />
        <circle cx={L} cy={y + 0.4} r="2" fill="#2b2530" /><circle cx={R} cy={y + 0.4} r="2" fill="#2b2530" />
        <circle cx={L + 0.8} cy={y - 0.6} r=".7" fill="#fff" /><circle cx={R + 0.8} cy={y - 0.6} r=".7" fill="#fff" /></g>;
  }
}
function star(x: number, y: number) {
  const pts = [] as string[];
  for (let i = 0; i < 5; i++) {
    const ao = -Math.PI / 2 + (i * 2 * Math.PI) / 5, ai = ao + Math.PI / 5;
    pts.push(`${(x + Math.cos(ao) * 4).toFixed(1)},${(y + Math.sin(ao) * 4).toFixed(1)}`);
    pts.push(`${(x + Math.cos(ai) * 1.7).toFixed(1)},${(y + Math.sin(ai) * 1.7).toFixed(1)}`);
  }
  return <polygon points={pts.join(" ")} />;
}

/* ───────────────────────── BOUCHE ───────────────────────── */
function Mouth({ a }: { a: AvatarT }) {
  const y = 53;
  switch (a.mouth) {
    case 1: // Rire
      return <path d={`M43 ${y} q7 9 14 0 q-7 3 -14 0 z`} fill="#b0304a" stroke="#8f2038" strokeWidth=".6" />;
    case 2: // Neutre
      return <path d={`M45 ${y + 1} h10`} stroke="#8f2038" strokeWidth="1.8" fill="none" strokeLinecap="round" />;
    case 3: // Étonné
      return <ellipse cx="50" cy={y + 1} rx="3" ry="3.6" fill="#b0304a" />;
    case 4: // Malicieux
      return <path d={`M44 ${y} q6 5 12 -1`} stroke="#8f2038" strokeWidth="1.8" fill="none" strokeLinecap="round" />;
    case 5: // Langue
      return <g><path d={`M44 ${y} q6 6 12 0 z`} fill="#b0304a" /><ellipse cx="50" cy={y + 3} rx="2.6" ry="2" fill="#ff7597" /></g>;
    default: // Sourire
      return <path d={`M44 ${y} q6 6 12 0`} stroke="#8f2038" strokeWidth="1.9" fill="none" strokeLinecap="round" />;
  }
}

/* ───────────────────────── PILOSITÉ ───────────────────────── */
function Facial({ a, c }: { a: AvatarT; c: string }) {
  if (a.facial === 1) // Barbe
    return <path d="M30 44 q0 22 20 22 q20 0 20 -22 q-4 14 -20 14 q-16 0 -20 -14 z" fill={c} opacity=".92" />;
  if (a.facial === 3) // Bouc
    return <path d="M43 56 q7 6 14 0 q-1 8 -7 8 q-6 0 -7 -8 z" fill={c} />;
  return null;
}
function Mustache({ a, c }: { a: AvatarT; c: string }) {
  if (a.facial === 2 || a.facial === 3)
    return <path d="M43 51 q7 -3 7 1 q0 -4 7 -1 q-3 4 -7 2 q-4 2 -7 -2 z" fill={c} />;
  return null;
}

/* ───────────────────────── TENUES ───────────────────────── */
function Outfit({ a, c, skin, skinD, id }: { a: AvatarT; c: string; skin: string; skinD: string; id: string }) {
  const base = <path d="M18 100 q0 -30 32 -34 q32 4 32 34 z" />;
  const g = (fill: string) => <g fill={fill}>{base}</g>;
  switch (a.outfit) {
    case 1: // Sweat à capuche
      return <g><g fill={c}>{base}</g><path d="M36 68 q14 10 28 0 q-2 8 -14 8 q-12 0 -14 -8 z" fill={shade(c, -18)} />
        <rect x="47" y="70" width="6" height="26" fill={shade(c, -12)} /></g>;
    case 2: // Costume
      return <g><g fill="#2a2f3a">{base}</g>
        <path d="M40 66 L50 82 L60 66 q10 6 12 22 h-8 L50 96 L36 88 h-8 q2 -16 12 -22 z" fill="#fff" opacity=".95" />
        <path d="M50 82 L46 100 h8 z" fill={c} /></g>;
    case 3: // Héros (cape + emblème)
      return <g><path d="M18 100 q-6 -26 8 -34 q6 20 24 20 q18 0 24 -20 q14 8 8 34 z" fill={shade(c, -26)} />
        <g fill={c}>{base}</g>
        <circle cx="50" cy="82" r="8" fill="#fff" opacity=".95" /><path d="M50 76 l5 9 h-10 z" fill={c} /></g>;
    case 4: // Maillot de sport
      return <g><g fill={c}>{base}</g>
        <path d="M40 66 L50 74 L60 66 l4 3 L50 80 L36 69 z" fill="#fff" opacity=".9" />
        <text x="50" y="94" fontSize="12" fontWeight="900" fill="#fff" textAnchor="middle" fontFamily="Arial">10</text></g>;
    case 5: // Robe
      return <g><path d="M20 100 q2 -30 30 -34 q28 4 30 34 z" fill={c} />
        <path d="M40 66 q10 8 20 0 q-3 7 -10 7 q-7 0 -10 -7 z" fill={shade(c, 14)} />
        <circle cx="50" cy="80" r="1.6" fill="#fff" /><circle cx="50" cy="87" r="1.6" fill="#fff" /></g>;
    case 6: // Magicien (robe étoilée)
      return <g><g fill={shade(c, -10)}>{base}</g>
        <g fill="#ffe27a">{miniStar(42, 82)}{miniStar(58, 78)}{miniStar(50, 92)}</g></g>;
    case 7: // Universitaire (varsity)
      return <g><g fill="#1f2a44">{base}</g>
        <path d="M18 100 q0 -30 32 -34 v38 z" fill={c} />
        <rect x="47" y="70" width="6" height="26" fill="#fff" opacity=".85" /></g>;
    case 8: // Astronaute
      return <g><g fill="#eef2f7">{base}</g>
        <rect x="40" y="76" width="20" height="9" rx="2" fill={c} />
        <circle cx="44" cy="92" r="2" fill="#ef4444" /><circle cx="50" cy="92" r="2" fill="#22c55e" /><circle cx="56" cy="92" r="2" fill="#3b82f6" /></g>;
    case 9: // Ninja
      return <g><g fill="#20242e">{base}</g><rect x="18" y="82" width="64" height="6" fill={c} /></g>;
    case 10: // Rockstar (blouson)
      return <g><g fill="#17181d">{base}</g>
        <path d="M40 66 L50 84 L60 66 l6 4 -8 30 h-16 l-8 -30 z" fill="#2b2d34" />
        <path d="M50 84 v16" stroke={c} strokeWidth="1.5" /></g>;
    case 11: // Kimono
      return <g><g fill={c}>{base}</g>
        <path d="M40 66 L50 100 L60 66 l-10 6 z" fill="#fff" opacity=".9" />
        <rect x="34" y="90" width="32" height="6" fill={shade(c, -20)} /></g>;
    default: // Tee-shirt
      return <g>{g(c)}<path d="M40 66 q10 8 20 0 q-3 6 -10 6 q-7 0 -10 -6 z" fill={tint(c, 16)} /></g>;
  }
  void skin; void skinD; void id;
}
function miniStar(x: number, y: number) {
  const pts = [] as string[];
  for (let i = 0; i < 5; i++) {
    const ao = -Math.PI / 2 + (i * 2 * Math.PI) / 5, ai = ao + Math.PI / 5;
    pts.push(`${(x + Math.cos(ao) * 3).toFixed(1)},${(y + Math.sin(ao) * 3).toFixed(1)}`);
    pts.push(`${(x + Math.cos(ai) * 1.3).toFixed(1)},${(y + Math.sin(ai) * 1.3).toFixed(1)}`);
  }
  return <polygon points={pts.join(" ")} />;
}

/* ───────────────────────── ACCESSOIRES ───────────────────────── */
function Accessory({ a, id }: { a: AvatarT; id: string }) {
  switch (a.accessory) {
    case 1: // Lunettes
      return <g fill="none" stroke="#2b2530" strokeWidth="1.8">
        <rect x="35" y="38.5" width="10" height="8" rx="3" /><rect x="55" y="38.5" width="10" height="8" rx="3" />
        <path d="M45 42 h10" /><path d="M35 41 l-6 -1" /><path d="M65 41 l6 -1" /></g>;
    case 2: // Lunettes de soleil
      return <g><rect x="34" y="38" width="12" height="9" rx="3" fill="#1c1f26" /><rect x="54" y="38" width="12" height="9" rx="3" fill="#1c1f26" />
        <path d="M46 41 h8" stroke="#1c1f26" strokeWidth="2" /><path d="M34 40 l-6 -1 M66 40 l6 -1" stroke="#1c1f26" strokeWidth="1.8" />
        <path d="M36 40 l3 4" stroke="#7cc7ff" strokeWidth="1" opacity=".7" /></g>;
    case 3: // Masque de héros
      return <path d="M30 38 q20 -8 40 0 q-2 8 -8 8 q-6 0 -12 -3 q-6 3 -12 3 q-6 0 -8 -8 z" fill={OUTFIT_COLORS[a.outfit % OUTFIT_COLORS.length]} opacity=".95" />;
    case 4: // Casquette
      return <g><path d="M27 30 q23 -16 46 0 q-23 -6 -46 0 z" fill="#2563eb" /><path d="M27 30 q23 -8 46 0 q6 1 8 4 q-30 -4 -54 0 q0 -3 0 -4 z" fill="#1d4ed8" /><ellipse cx="50" cy="22" rx="3" ry="2.5" fill="#3b82f6" /></g>;
    case 5: // Couronne
      return <path d="M35 26 l3 -10 l5 7 l7 -11 l7 11 l5 -7 l3 10 q-17 -5 -33 0 z" fill="#ffcf3f" stroke="#e0a800" strokeWidth=".6" />;
    case 6: // Casque audio
      return <g><path d="M30 44 q0 -28 40 -28 q0 0 0 28" fill="none" stroke="#2b2530" strokeWidth="2.4" />
        <rect x="25.5" y="41" width="8" height="11" rx="3.5" fill="#2b2530" /><rect x="66.5" y="41" width="8" height="11" rx="3.5" fill="#2b2530" />
        <rect x="27" y="43" width="5" height="7" rx="2.5" fill="#7cc7ff" opacity=".7" /><rect x="68" y="43" width="5" height="7" rx="2.5" fill="#7cc7ff" opacity=".7" /></g>;
    case 7: // Bonnet
      return <g><path d="M28 32 q0 -22 22 -22 q22 0 22 22 q-22 -8 -44 0 z" fill="#d64550" /><rect x="27" y="30" width="46" height="6" rx="3" fill="#b0343e" /><circle cx="50" cy="9" r="3.5" fill="#fff" /></g>;
    case 8: // Cache-œil
      return <g><path d="M34 38 l32 -3" stroke="#1c1f26" strokeWidth="1.5" /><rect x="36" y="38" width="11" height="9" rx="2" fill="#1c1f26" /></g>;
    case 9: // Bandeau (ninja)
      return <g><rect x="27" y="36" width="46" height="6" fill={OUTFIT_COLORS[a.outfit % OUTFIT_COLORS.length]} /><rect x="46" y="36" width="8" height="6" fill="#e5e7eb" /><path d="M73 39 l10 -2 l-8 6 z" fill={OUTFIT_COLORS[a.outfit % OUTFIT_COLORS.length]} /></g>;
    default: return null;
  }
  void id;
}

/* ───────────────────────── COULEURS ───────────────────────── */
function clamp(n: number) { return Math.max(0, Math.min(255, Math.round(n))); }
function parse(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function shade(hex: string, pct: number): string {
  const [r, g, b] = parse(hex); const f = 1 + pct / 100;
  return `#${[r, g, b].map(x => clamp(x * f).toString(16).padStart(2, "0")).join("")}`;
}
function tint(hex: string, pct: number): string {
  const [r, g, b] = parse(hex);
  return `#${[r, g, b].map(x => clamp(x + (255 - x) * (pct / 100)).toString(16).padStart(2, "0")).join("")}`;
}
