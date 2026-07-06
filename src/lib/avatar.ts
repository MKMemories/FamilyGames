/* ══════════════════════════════════════════════════════════════════════════
   AVATARS KHELIJ — personnage vectoriel 100 % SVG, entièrement personnalisable.
   Aucune image externe : peau, fond, coiffure, yeux, bouche, tenue, pilosité et
   accessoire sont des index compacts (sérialisables dans Firebase). Des « packs
   à la mode » (super-héros, sport, ciné, ninja…) composent plusieurs couches
   d'un coup pour un look instantané.
   ══════════════════════════════════════════════════════════════════════════ */

export interface Avatar {
  skin: number;
  bg: number;
  hair: number;
  hairColor: number;
  eyes: number;
  mouth: number;
  outfit: number;
  facial: number;
  accessory: number;
}

/* ── Palettes ── */
export const SKINS = ["#ffe0bd", "#f6cea4", "#eab68a", "#d99a6c", "#b97a4e", "#8d5a34", "#623a1e"];

export const BGS: { from: string; to: string }[] = [
  { from: "#ff9a9e", to: "#f6416c" },   // rose ardent
  { from: "#fbc2eb", to: "#a66cff" },   // violet bonbon
  { from: "#a1c4fd", to: "#3b6fe0" },   // bleu ciel
  { from: "#84fab0", to: "#12b886" },   // menthe
  { from: "#ffe29f", to: "#ffa751" },   // coucher de soleil
  { from: "#f6d365", to: "#f5a623" },   // or
  { from: "#5ee7df", to: "#128a8a" },   // turquoise
  { from: "#c2e9fb", to: "#5b7cfa" },   // azur
  { from: "#d4a5ff", to: "#7b2ff7" },   // améthyste
  { from: "#ff8177", to: "#b12a5b" },   // grenade
  { from: "#43e97b", to: "#0f9b6e" },   // émeraude
  { from: "#30cfd0", to: "#330867" },   // néon nuit
  { from: "#f093fb", to: "#f5576c" },   // fuchsia
  { from: "#c9d6ff", to: "#8a99b8" },   // acier
];

export const HAIR_COLORS = ["#2b2b33", "#4a3120", "#7a4a24", "#b06a2c", "#e0b34a", "#ede4d3", "#c0392b", "#7b2ff7", "#2e86de", "#12b886", "#ff5b93"];

/* Identifiants de style (l'ordre = l'index stocké — ne jamais réordonner :
   on ajoute les nouveautés à la fin pour ne pas casser les avatars enregistrés) */
export const HAIRS = [
  "Chauve", "Court", "Brosse", "Bouclé", "Afro", "Chignon", "Couettes", "Long", "Crête", "Piquant", "Ondulé", "Voile",
  // ── Coupes tendance 2026 ──
  "Dégradé", "Rideau", "Man bun", "Tresses", "Carré", "Frange",
] as const;
export const EYES = ["Normal", "Joyeux", "Clin d'œil", "Étoilé", "Endormi", "Surpris"] as const;
export const MOUTHS = ["Sourire", "Rire", "Neutre", "Étonné", "Malicieux", "Langue"] as const;
export const OUTFITS = ["Tee-shirt", "Sweat", "Costume", "Héros", "Maillot", "Robe", "Magicien", "Universitaire", "Astronaute", "Ninja", "Rockstar", "Kimono"] as const;
export const FACIALS = ["Aucune", "Barbe", "Moustache", "Bouc"] as const;
export const ACCESSORIES = ["Aucun", "Lunettes", "Soleil", "Masque héros", "Casquette", "Couronne", "Casque audio", "Bonnet", "Cache-œil", "Bandeau"] as const;

/* Teinte principale des tenues (emblèmes / cols). L'indice 4 (Maillot) = bleu PSG. */
export const OUTFIT_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#a855f7", "#11224f", "#ec4899", "#0ea5e9", "#111827"];

export const DEFAULT_AVATAR: Avatar = { skin: 1, bg: 1, hair: 1, hairColor: 1, eyes: 0, mouth: 0, outfit: 0, facial: 0, accessory: 0 };

/* Avatars par défaut des membres de la famille (personnalisables ensuite). */
export const PRESET_AVATARS: Record<string, Avatar> = {
  Mohamed:  { skin: 2, bg: 2, hair: 12, hairColor: 1, eyes: 0, mouth: 0, outfit: 4, facial: 0, accessory: 0 }, // dégradé
  Saoussen: { skin: 1, bg: 12, hair: 16, hairColor: 1, eyes: 1, mouth: 0, outfit: 4, facial: 0, accessory: 0 }, // carré
  Sara:     { skin: 1, bg: 0, hair: 15, hairColor: 2, eyes: 1, mouth: 0, outfit: 4, facial: 0, accessory: 0 }, // tresses
  Lilya:    { skin: 1, bg: 3, hair: 7, hairColor: 2, eyes: 1, mouth: 0, outfit: 4, facial: 0, accessory: 0 },  // long
};

/* ── Packs « à la mode » : un look complet en un tap ── */
export interface AvatarPack { id: string; label: string; emoji: string; patch: Partial<Avatar>; }
export const AVATAR_PACKS: AvatarPack[] = [
  { id: "hero",   label: "Super-héros", emoji: "🦸", patch: { outfit: 3, accessory: 3, bg: 9, mouth: 1, eyes: 0 } },
  { id: "sport",  label: "Star du sport", emoji: "⚽", patch: { outfit: 4, accessory: 4, bg: 3, mouth: 1 } },
  { id: "cine",   label: "Star de ciné", emoji: "🎬", patch: { outfit: 2, accessory: 2, bg: 13, mouth: 4 } },
  { id: "royal",  label: "Royauté", emoji: "👑", patch: { outfit: 5, accessory: 5, bg: 5, mouth: 0 } },
  { id: "wizard", label: "Magicien", emoji: "🧙", patch: { outfit: 6, accessory: 0, hair: 10, bg: 11, mouth: 2, facial: 1 } },
  { id: "ninja",  label: "Ninja", emoji: "🥷", patch: { outfit: 9, accessory: 9, bg: 11, eyes: 0 } },
  { id: "rock",   label: "Rockstar", emoji: "🎸", patch: { outfit: 10, accessory: 2, hair: 8, hairColor: 6, bg: 12, mouth: 4 } },
  { id: "astro",  label: "Astronaute", emoji: "🚀", patch: { outfit: 8, accessory: 0, bg: 11, eyes: 3, mouth: 1 } },
  { id: "cyber",  label: "Cyber", emoji: "🤖", patch: { outfit: 7, accessory: 1, hairColor: 8, bg: 11, eyes: 3 } },
  { id: "geek",   label: "Intello", emoji: "🤓", patch: { outfit: 1, accessory: 1, bg: 2, mouth: 0 } },
];

const CATS: (keyof Avatar)[] = ["skin", "bg", "hair", "hairColor", "eyes", "mouth", "outfit", "facial", "accessory"];
const LEN: Record<keyof Avatar, number> = {
  skin: SKINS.length, bg: BGS.length, hair: HAIRS.length, hairColor: HAIR_COLORS.length,
  eyes: EYES.length, mouth: MOUTHS.length, outfit: OUTFITS.length, facial: FACIALS.length, accessory: ACCESSORIES.length,
};

export function randomAvatar(rnd: () => number = Math.random): Avatar {
  const a = { ...DEFAULT_AVATAR };
  for (const c of CATS) a[c] = Math.floor(rnd() * LEN[c]);
  a.facial = rnd() < 0.6 ? 0 : a.facial;   // pilosité plus rare
  return a;
}

/** Encode un avatar en chaîne courte pour localStorage / URL. */
export function encodeAvatar(a: Avatar): string { return CATS.map(c => a[c]).join("."); }
export function decodeAvatar(s: string | null | undefined): Avatar | null {
  if (!s) return null;
  const p = s.split(".").map(Number);
  if (p.length !== CATS.length || p.some(n => Number.isNaN(n))) return null;
  const a = { ...DEFAULT_AVATAR };
  CATS.forEach((c, i) => { a[c] = Math.max(0, Math.min(LEN[c] - 1, p[i])); });
  return a;
}
