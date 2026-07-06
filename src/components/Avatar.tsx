import { useMemo } from "react";
import {
  type Avatar as AvatarT, SKINS, BGS, HAIR_COLORS, OUTFIT_COLORS,
} from "../lib/avatar";

/* Personnage vectoriel composé de couches. viewBox 0 0 100 100, tête ~ (50,44). */

interface Props { a: AvatarT; size?: number; ring?: string; className?: string; flat?: boolean; }

let uidc = 0;

/* Contour de tête réutilisé (visage + masque de lumière). */
const FACE_D = "M50 20.5 C 62.5 20.5 71 29 71 41.5 C 71 53 63.5 64.5 50 66 C 36.5 64.5 29 53 29 41.5 C 29 29 37.5 20.5 50 20.5 Z";

export function Avatar({ a, size = 72, ring, className, flat }: Props) {
  const id = useMemo(() => `av${(uidc = (uidc + 1) % 1e6)}`, []);
  const skin = SKINS[a.skin] || SKINS[1];
  const skinD = shade(skin, -16);       // ombre peau
  const skinDD = shade(skin, -30);      // ombre profonde (cou)
  const bg = BGS[a.bg] || BGS[0];
  const hairC = HAIR_COLORS[a.hairColor] || HAIR_COLORS[0];
  const hairD = shade(hairC, -26);
  const hairUrl = `url(#${id}hair)`;
  const outC = OUTFIT_COLORS[a.outfit % OUTFIT_COLORS.length];

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className}
      style={{ borderRadius: "50%", boxShadow: ring ? `0 0 0 3px ${ring}` : undefined, display: "block" }}>
      <defs>
        <radialGradient id={`${id}bg`} cx="50%" cy="30%" r="85%">
          <stop offset="0%" stopColor={tint(bg.from, 10)} />
          <stop offset="60%" stopColor={bg.from} />
          <stop offset="100%" stopColor={bg.to} />
        </radialGradient>
        {/* Peau : lumière en haut à gauche → ombre en bas à droite */}
        <linearGradient id={`${id}sk`} x1="0.25" y1="0.05" x2="0.8" y2="1">
          <stop offset="0%" stopColor={tint(skin, 16)} />
          <stop offset="55%" stopColor={skin} />
          <stop offset="100%" stopColor={shade(skin, -10)} />
        </linearGradient>
        {/* Modelé du visage (ombres latérales douces) */}
        <radialGradient id={`${id}face`} cx="50%" cy="42%" r="58%">
          <stop offset="60%" stopColor={skin} stopOpacity="0" />
          <stop offset="100%" stopColor={shade(skin, -22)} stopOpacity="0.55" />
        </radialGradient>
        <linearGradient id={`${id}hair`} x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor={tint(hairC, 30)} />
          <stop offset="45%" stopColor={hairC} />
          <stop offset="100%" stopColor={hairD} />
        </linearGradient>
        <radialGradient id={`${id}iris`} cx="42%" cy="36%" r="65%">
          <stop offset="0%" stopColor={tint(irisFor(a), 34)} />
          <stop offset="55%" stopColor={irisFor(a)} />
          <stop offset="100%" stopColor={shade(irisFor(a), -45)} />
        </radialGradient>
        <linearGradient id={`${id}lip`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c85f6d" />
          <stop offset="100%" stopColor="#e08f9a" />
        </linearGradient>
        <clipPath id={`${id}clip`}><circle cx="50" cy="50" r="50" /></clipPath>
        <clipPath id={`${id}faceclip`}><path d={FACE_D} /></clipPath>
      </defs>

      <g clipPath={`url(#${id}clip)`}>
        <rect x="0" y="0" width="100" height="100" fill={`url(#${id}bg)`} />
        {!flat && <ellipse cx="50" cy="22" rx="48" ry="34" fill="#fff" opacity="0.13" />}

        {/* Cheveux arrière */}
        <BackHair a={a} c={hairUrl} cd={hairD} />

        {/* Corps + tenue */}
        <Outfit a={a} c={outC} skin={skin} skinD={skinD} id={id} />

        {/* Cou + ombre sous le menton */}
        <path d="M43 54 h14 v11 q-7 4 -14 0 z" fill={skin} />
        <path d="M43 54 h14 v4 q-7 5 -14 0 z" fill={skinDD} opacity=".55" />

        {/* Oreilles */}
        <ellipse cx="29.5" cy="44.5" rx="4.3" ry="5.4" fill={`url(#${id}sk)`} />
        <ellipse cx="70.5" cy="44.5" rx="4.3" ry="5.4" fill={`url(#${id}sk)`} />
        <path d="M28.5 42.5 q2 2.5 1 5" stroke={skinD} strokeWidth="1" fill="none" strokeLinecap="round" opacity=".6" />
        <path d="M71.5 42.5 q-2 2.5 -1 5" stroke={skinD} strokeWidth="1" fill="none" strokeLinecap="round" opacity=".6" />

        {/* Tête */}
        <path d={FACE_D} fill={`url(#${id}sk)`} />
        <path d={FACE_D} fill={`url(#${id}face)`} />

        {/* Joues */}
        <ellipse cx="37.5" cy="50" rx="4.8" ry="3.1" fill="#ff5b7e" opacity="0.22" />
        <ellipse cx="62.5" cy="50" rx="4.8" ry="3.1" fill="#ff5b7e" opacity="0.22" />

        {/* Pilosité (barbe / bouc) */}
        <Facial a={a} c={hairD} id={id} />

        {/* Sourcils + yeux + nez + bouche */}
        <Brows a={a} c={hairD} />
        <Eyes a={a} id={id} />
        <path d="M48.4 45.5 q-1.6 4 1.6 5.4 q3.2 -1.4 1.6 -5.4" fill="none" stroke={shade(skin, -18)} strokeWidth="1" strokeLinecap="round" opacity=".5" />
        <Mouth a={a} id={id} />
        <Mustache a={a} c={hairD} />

        {/* Cheveux avant + reflet */}
        <FrontHair a={a} c={hairUrl} cd={hairD} />

        {/* Accessoire au premier plan */}
        <Accessory a={a} id={id} />
      </g>
    </svg>
  );
}

/* Couleur d'iris déterministe (variété douce selon le fond choisi). */
const IRISES = ["#6b4a2b", "#3a2a1a", "#3f6d8c", "#5b7a4a", "#7a5a3a", "#4d4a63", "#2f6d6d"];
function irisFor(a: AvatarT): string { return IRISES[a.bg % IRISES.length] || "#6b4a2b"; }

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
    case 13: // Rideau — mi-long qui encadre
      return <path d="M26 42 q-2 20 2 30 h44 q4 -10 2 -30 q-6 16 -24 16 q-18 0 -24 -16 z" fill={c} />;
    case 15: // Tresses — deux nattes le long du visage
      return <g fill={c}>
        <path d="M25 40 q-3 22 1 42 h6 q-3 -18 -1 -42 z" /><path d="M75 40 q3 22 -1 42 h-6 q3 -18 1 -42 z" />
        <g fill={cd} opacity=".6"><path d="M26 48 h5 M27 56 h5 M27 64 h5 M27 72 h5" stroke={cd} strokeWidth="1.2" /><path d="M69 48 h5 M69 56 h5 M69 64 h5 M69 72 h5" stroke={cd} strokeWidth="1.2" /></g>
      </g>;
    case 16: // Carré (bob)
      return <path d="M25 42 q-1 -28 25 -28 q26 0 25 28 q0 17 -3 27 q-3 2 -6 1 q3 -16 1 -30 q-17 8 -34 0 q-2 14 1 30 q-3 1 -6 -1 q-3 -10 -3 -27 z" fill={c} />;
    case 17: // Frange effilée (long dégradé)
      return <path d="M23 42 q-4 30 4 44 h46 q8 -14 4 -44 q-6 18 -13 8 q-4 15 -14 15 q-10 0 -14 -15 q-7 10 -13 -8 z" fill={c} />;
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
    case 12: // Dégradé (fade + touffe texturée, côtés rasés)
      return <path d="M34 33 q-1 -20 16 -20 q17 0 16 20 q-3 -9 -8 -6 q0 -6 -8 -6 q-8 0 -8 6 q-5 -3 -8 6 q1 -3 2 -1 z" fill={c} />;
    case 13: // Rideau (raie au milieu, mèches qui tombent)
      return <path d="M28 41 q-2 -27 22 -27 q24 0 22 27 q-4 -11 -9 -10 q-2 9 -7 13 q-3 -6 -6 -6 q-3 0 -6 6 q-5 -4 -7 -13 q-5 -1 -9 10 z" fill={c} />;
    case 14: // Man bun (chignon haut + côtés courts / undercut)
      return <><circle cx="50" cy="13" r="6" fill={c} /><rect x="47.5" y="15" width="5" height="6" fill={c} />
        <path d="M32 34 q-1 -17 18 -18 q19 1 18 18 q-5 -9 -18 -9 q-13 0 -18 9 z" fill={c} /></>;
    case 15: // Tresses (raie centrale, sommet lisse)
      return <path d="M30 40 q0 -25 20 -25 q20 0 20 25 q-5 -11 -9 -9 q-4 6 -11 6 q-7 0 -11 -6 q-4 -2 -9 9 z" fill={c} />;
    case 16: // Carré (frange nette)
      return <path d="M28 40 q0 -25 22 -25 q22 0 22 25 q-6 -13 -22 -13 q-16 0 -22 13 z" fill={c} />;
    case 17: // Frange effilée (rideau long)
      return <path d="M28 42 q-2 -28 22 -28 q24 0 22 28 q-4 -12 -9 -11 q-3 10 -8 14 q-2 -8 -5 -8 q-3 0 -5 8 q-5 -4 -8 -14 q-5 -1 -9 11 z" fill={c} />;
    default: return null;
  }
  void cd;
}

/* ───────────────────────── SOURCILS ───────────────────────── */
function Brows({ a, c }: { a: AvatarT; c: string }) {
  if (a.eyes === 3) return null;
  const raise = a.eyes === 5 ? -1.4 : 0; // surpris : sourcils levés
  const b = (x: number) => <path d={`M${x - 5} ${36.2 + raise} Q${x} ${33 + raise} ${x + 5} ${35.8 + raise} Q${x} ${34.8 + raise} ${x - 5} ${36.2 + raise} Z`} fill={c} />;
  return <g opacity=".92">{b(41.5)}{b(58.5)}</g>;
}

/* ───────────────────────── YEUX ───────────────────────── */
const L = 41.5, R = 58.5, EY = 42;
function eyeOpen(ex: number, ey: number, id: string, big = false) {
  const rw = big ? 4.2 : 3.7, rh = big ? 3.4 : 2.9, ir = big ? 2.5 : 2.2;
  return <g key={ex}>
    <path d={`M${ex - rw} ${ey} Q${ex} ${ey - rh} ${ex + rw} ${ey} Q${ex} ${ey + rh * 0.88} ${ex - rw} ${ey} Z`} fill="#fdf7f2" />
    <circle cx={ex} cy={ey} r={ir} fill={`url(#${id}iris)`} />
    <circle cx={ex} cy={ey} r={ir * 0.46} fill="#160d06" />
    <circle cx={ex - ir * 0.4} cy={ey - ir * 0.42} r={ir * 0.32} fill="#fff" opacity=".95" />
    <circle cx={ex + ir * 0.45} cy={ey + ir * 0.5} r={ir * 0.16} fill="#fff" opacity=".55" />
    <path d={`M${ex - rw} ${ey - 0.2} Q${ex} ${ey - rh} ${ex + rw} ${ey - 0.2}`} stroke="#3a2a26" strokeWidth="1.05" fill="none" strokeLinecap="round" />
  </g>;
}
function Eyes({ a, id }: { a: AvatarT; id: string }) {
  switch (a.eyes) {
    case 1: // Joyeux (arcs souriants)
      return <g stroke="#2b2530" strokeWidth="2.3" fill="none" strokeLinecap="round">
        <path d={`M${L - 3.8} ${EY + 1.2} q3.8 -5 7.6 0`} /><path d={`M${R - 3.8} ${EY + 1.2} q3.8 -5 7.6 0`} /></g>;
    case 2: // Clin d'œil
      return <g>{eyeOpen(L, EY, id)}
        <path d={`M${R - 4} ${EY} q4 -4.5 8 0`} stroke="#2b2530" strokeWidth="2.3" fill="none" strokeLinecap="round" /></g>;
    case 3: // Étoilé
      return <g fill="#ffd23f" stroke="#e0a800" strokeWidth=".4">{star(L, EY)}{star(R, EY)}</g>;
    case 4: // Endormi (mi-clos)
      return <g>
        <g clipPath="none">{eyeOpen(L, EY + 0.6, id)}{eyeOpen(R, EY + 0.6, id)}</g>
        <path d={`M${L - 4.2} ${EY - 0.4} q4.2 2 8.4 0`} stroke="#3a2a26" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d={`M${R - 4.2} ${EY - 0.4} q4.2 2 8.4 0`} stroke="#3a2a26" strokeWidth="2.6" fill="none" strokeLinecap="round" /></g>;
    case 5: // Surpris (grands yeux)
      return <g>{eyeOpen(L, EY, id, true)}{eyeOpen(R, EY, id, true)}</g>;
    default: // Normal
      return <g>{eyeOpen(L, EY, id)}{eyeOpen(R, EY, id)}</g>;
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

/* ───────────────────────── BOUCHE (lèvres) ───────────────────────── */
function Mouth({ a, id }: { a: AvatarT; id: string }) {
  const y = 53, lip = `url(#${id}lip)`;
  switch (a.mouth) {
    case 1: // Rire (dents visibles)
      return <g>
        <path d={`M43.5 ${y - 0.5} q6.5 8.5 13 0 q-6.5 3 -13 0 z`} fill="#7a1f30" />
        <path d={`M44.5 ${y} q5.5 2 11 0 q-5.5 3.5 -11 0 z`} fill="#fff" />
        <path d={`M43.5 ${y - 0.5} q6.5 5 13 0`} fill="none" stroke="#8f2038" strokeWidth=".7" />
        <ellipse cx="50" cy={y + 3.6} rx="3" ry="1.6" fill="#e06a80" opacity=".8" /></g>;
    case 2: // Neutre
      return <path d={`M45 ${y + 1} q5 1.5 10 0`} stroke="#a84a58" strokeWidth="1.8" fill="none" strokeLinecap="round" />;
    case 3: // Étonné (petit rond)
      return <g><ellipse cx="50" cy={y + 1} rx="2.8" ry="3.4" fill="#7a1f30" /><ellipse cx="50" cy={y + 0.4} rx="2.4" ry="2.4" fill={lip} /></g>;
    case 4: // Malicieux (sourire en coin)
      return <g>
        <path d={`M44 ${y} q6 1 8 -0.5 q2 -0.5 4 -1.5`} stroke="#a84a58" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d={`M45 ${y + 0.6} q5 3 11 -1.5`} stroke="#e08f9a" strokeWidth="1" fill="none" strokeLinecap="round" opacity=".6" /></g>;
    case 5: // Tire la langue
      return <g>
        <path d={`M44 ${y} q6 3 12 0 q-2 2 -6 2 q-4 0 -6 -2 z`} fill="#7a1f30" />
        <path d={`M46.5 ${y + 1.5} q3.5 5 7 0 q-1 3.5 -3.5 3.5 q-2.5 0 -3.5 -3.5 z`} fill="#ff8098" />
        <path d={`M50 ${y + 2} v3`} stroke="#e0607a" strokeWidth=".6" /></g>;
    default: // Sourire (lèvres pleines)
      return <g>
        <path d={`M43.5 ${y - 0.3} q6.5 2 13 0 q-6.5 6.5 -13 0 z`} fill={lip} />
        <path d={`M43.5 ${y - 0.3} q6.5 2 13 0`} fill="none" stroke="#b25563" strokeWidth=".7" />
        <path d={`M46 ${y + 2.4} q4 1.6 8 0`} stroke="#fff" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity=".5" /></g>;
  }
}

/* ───────────────────────── PILOSITÉ ───────────────────────── */
function Facial({ a, c }: { a: AvatarT; c: string; id?: string }) {
  if (a.facial === 1) // Barbe
    return <path d="M29.5 43 q0 23 20.5 23 q20.5 0 20.5 -23 q-4.5 15 -20.5 15 q-16 0 -20.5 -15 z" fill={c} opacity=".95" />;
  if (a.facial === 3) // Bouc
    return <path d="M43 56 q7 6 14 0 q-1 8.5 -7 8.5 q-6 0 -7 -8.5 z" fill={c} />;
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
    case 4: { // Maillot de foot — couleurs PSG (bleu marine, bande rouge bordée de blanc)
      const cid = `${id}jrs`;
      return <g>
        <defs><clipPath id={cid}><path d="M18 100 q0 -30 32 -34 q32 4 32 34 z" /></clipPath></defs>
        <g clipPath={`url(#${cid})`}>
          <rect x="14" y="60" width="72" height="42" fill="#11224f" />
          <rect x="42" y="60" width="16" height="42" fill="#e30613" />
          <rect x="40.5" y="60" width="1.6" height="42" fill="#fff" />
          <rect x="57.9" y="60" width="1.6" height="42" fill="#fff" />
        </g>
        <path d="M40 66 q10 7 20 0 q-3 6 -10 6 q-7 0 -10 -6 z" fill="#fff" />
        <text x="50" y="95" fontSize="10" fontWeight="900" fill="#fff" textAnchor="middle" fontFamily="Arial">10</text>
      </g>;
    }
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
