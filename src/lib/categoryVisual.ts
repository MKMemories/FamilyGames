/** Maps a quiz category (or challenge theme) to an illustration: a big icon,
 *  a few drifting background emojis, and an accent hue — so each question is
 *  visually tied to its topic. */
export interface CatVisual { icon: string; floaters: string[]; hue: string; }

const MAP: { keys: string[]; v: CatVisual }[] = [
  { keys: ["géographie", "geographie", "monde", "voyage"], v: { icon: "🗺️", floaters: ["🌍", "🧭", "📍", "🏔️"], hue: "#3b82f6" } },
  { keys: ["espace", "astronom"], v: { icon: "🚀", floaters: ["🪐", "⭐", "🌙", "☄️"], hue: "#8b5cf6" } },
  { keys: ["science"], v: { icon: "🔬", floaters: ["⚗️", "🧪", "🧫", "💡"], hue: "#06b6d4" } },
  { keys: ["histoire"], v: { icon: "📜", floaters: ["🏛️", "👑", "⚔️", "🗿"], hue: "#d97706" } },
  { keys: ["sport"], v: { icon: "⚽", floaters: ["🏀", "🏆", "🎾", "🥇"], hue: "#22c55e" } },
  { keys: ["animaux", "animal"], v: { icon: "🐾", floaters: ["🦁", "🐘", "🦒", "🐬"], hue: "#f59e0b" } },
  { keys: ["nature"], v: { icon: "🌿", floaters: ["🌳", "🍃", "🌸", "🐝"], hue: "#16a34a" } },
  { keys: ["corps"], v: { icon: "🫀", floaters: ["🦷", "🧠", "👁️", "🫁"], hue: "#ef4444" } },
  { keys: ["maths", "math", "nombre"], v: { icon: "🔢", floaters: ["➗", "➕", "✖️", "📐"], hue: "#7c3aed" } },
  { keys: ["art", "littérature", "litterature", "peinture"], v: { icon: "🎨", floaters: ["🖌️", "🖼️", "🎭", "✏️"], hue: "#ec4899" } },
  { keys: ["musique"], v: { icon: "🎵", floaters: ["🎸", "🎹", "🥁", "🎤"], hue: "#a855f7" } },
  { keys: ["cinéma", "cinema", "film"], v: { icon: "🎬", floaters: ["🍿", "🎥", "⭐", "🎞️"], hue: "#ef4444" } },
  { keys: ["france"], v: { icon: "🗼", floaters: ["🥖", "🧀", "🍷", "🎨"], hue: "#3b82f6" } },
  { keys: ["cuisine", "nourriture"], v: { icon: "🍳", floaters: ["🍕", "🍎", "🧀", "🥐"], hue: "#f97316" } },
  { keys: ["facile"], v: { icon: "😄", floaters: ["⭐", "✨", "🎈", "🌈"], hue: "#eab308" } },
];
const DEFAULT: CatVisual = { icon: "💡", floaters: ["❓", "💭", "🌟", "🎲"], hue: "#7b5cff" };

export function categoryVisual(category: string): CatVisual {
  const c = (category || "").toLowerCase();
  for (const { keys, v } of MAP) if (keys.some(k => c.includes(k))) return v;
  return DEFAULT;
}
