import type { Brand } from "../types";

/* ══════════════════════════════════════════════════════════════════════════
   DEVINE LA MARQUE — grandes marques mondiales (tech, réseaux, gaming, sport,
   mode, luxe, fast-food, boissons, snacks, auto, divertissement).
   ⚠️ Aucune reproduction de logo : chaque marque est présentée par un
   MONOGRAMME original (initiale + couleurs signature + emoji de secteur + un
   indice). Les NOMS sont des faits ; les couleurs ne sont que des couleurs.
   ══════════════════════════════════════════════════════════════════════════ */

export const MARQUES: Brand[] = [
  /* ── Tech ── */
  { id: 1, name: "Apple", initial: "", c1: "#555555", c2: "#111111", emoji: "🍎", category: "Tech", hint: "La pomme croquée de Cupertino" },
  { id: 2, name: "Samsung", initial: "S", c1: "#1428a0", c2: "#0b1a6b", emoji: "📱", category: "Tech", hint: "Géant coréen de l'électronique" },
  { id: 3, name: "Google", initial: "G", c1: "#4285f4", c2: "#ea4335", emoji: "🔍", category: "Tech", hint: "Le moteur de recherche n°1" },
  { id: 4, name: "Microsoft", initial: "⊞", c1: "#f25022", c2: "#00a4ef", emoji: "💻", category: "Tech", hint: "Windows, Xbox, Office" },
  { id: 5, name: "Sony", initial: "S", c1: "#0a0a0a", c2: "#333333", emoji: "🎮", category: "Tech", hint: "PlayStation et électronique japonaise" },
  { id: 6, name: "Xiaomi", initial: "MI", c1: "#ff6900", c2: "#ff8f00", emoji: "📱", category: "Tech", hint: "Smartphones malins à bon prix" },
  { id: 7, name: "Nvidia", initial: "N", c1: "#76b900", c2: "#4e7c00", emoji: "🖥️", category: "Tech", hint: "Le roi des cartes graphiques" },
  { id: 8, name: "Tesla", initial: "T", c1: "#e82127", c2: "#7a1216", emoji: "🔋", category: "Tech", hint: "Voitures électriques d'Elon Musk" },
  { id: 9, name: "Amazon", initial: "a", c1: "#ff9900", c2: "#232f3e", emoji: "📦", category: "Tech", hint: "E-commerce, la flèche qui sourit" },
  { id: 10, name: "GoPro", initial: "G", c1: "#0092d0", c2: "#00618a", emoji: "📸", category: "Tech", hint: "Les caméras d'action" },

  /* ── Réseaux & apps ── */
  { id: 11, name: "TikTok", initial: "♪", c1: "#25f4ee", c2: "#fe2c55", emoji: "🎵", category: "Réseaux", hint: "Vidéos courtes qui rendent accro" },
  { id: 12, name: "Instagram", initial: "◎", c1: "#f58529", c2: "#dd2a7b", emoji: "📸", category: "Réseaux", hint: "Photos, stories et reels" },
  { id: 13, name: "Snapchat", initial: "👻", c1: "#fffc00", c2: "#ffe600", emoji: "👻", category: "Réseaux", hint: "Le petit fantôme jaune" },
  { id: 14, name: "YouTube", initial: "▶", c1: "#ff0000", c2: "#c40000", emoji: "▶️", category: "Réseaux", hint: "La plateforme vidéo n°1" },
  { id: 15, name: "WhatsApp", initial: "✆", c1: "#25d366", c2: "#128c7e", emoji: "💬", category: "Réseaux", hint: "Messagerie verte au combiné" },
  { id: 16, name: "Discord", initial: "D", c1: "#5865f2", c2: "#404eed", emoji: "🎮", category: "Réseaux", hint: "Le chat vocal des gamers" },
  { id: 17, name: "Twitch", initial: "T", c1: "#9146ff", c2: "#6441a5", emoji: "📺", category: "Réseaux", hint: "Le streaming en direct violet" },
  { id: 18, name: "Pinterest", initial: "P", c1: "#e60023", c2: "#ad001a", emoji: "📌", category: "Réseaux", hint: "Idées et inspirations épinglées" },
  { id: 19, name: "Reddit", initial: "👽", c1: "#ff4500", c2: "#cc3700", emoji: "👽", category: "Réseaux", hint: "Le forum géant, mascotte Snoo" },
  { id: 20, name: "Netflix", initial: "N", c1: "#e50914", c2: "#8b0510", emoji: "🍿", category: "Divertissement", hint: "Séries et films en streaming" },
  { id: 21, name: "Spotify", initial: "♫", c1: "#1db954", c2: "#14833b", emoji: "🎧", category: "Divertissement", hint: "Musique en streaming, ondes vertes" },

  /* ── Gaming ── */
  { id: 22, name: "PlayStation", initial: "PS", c1: "#003791", c2: "#00266b", emoji: "🎮", category: "Gaming", hint: "La console de Sony" },
  { id: 23, name: "Xbox", initial: "X", c1: "#107c10", c2: "#0b5a0b", emoji: "🎮", category: "Gaming", hint: "La console verte de Microsoft" },
  { id: 24, name: "Nintendo", initial: "N", c1: "#e60012", c2: "#a5000d", emoji: "🍄", category: "Gaming", hint: "Mario, Zelda et la Switch" },
  { id: 25, name: "Fortnite", initial: "F", c1: "#9d4dff", c2: "#00c8ff", emoji: "🪂", category: "Gaming", hint: "Battle royale et danses virales" },
  { id: 26, name: "Roblox", initial: "R", c1: "#e2231a", c2: "#111111", emoji: "🧱", category: "Gaming", hint: "Créer et jouer à des mondes" },
  { id: 27, name: "Minecraft", initial: "▤", c1: "#6cae3e", c2: "#8b5a2b", emoji: "⛏️", category: "Gaming", hint: "Le jeu de blocs à creuser" },
  { id: 28, name: "Steam", initial: "S", c1: "#1b2838", c2: "#2a475e", emoji: "🎮", category: "Gaming", hint: "La boutique de jeux PC" },

  /* ── Sport ── */
  { id: 29, name: "Nike", initial: "✔", c1: "#111111", c2: "#000000", emoji: "👟", category: "Sport", hint: "« Just Do It » (la virgule)" },
  { id: 30, name: "Adidas", initial: "▲", c1: "#0a0a0a", c2: "#2b2b2b", emoji: "👟", category: "Sport", hint: "Les 3 bandes" },
  { id: 31, name: "Puma", initial: "P", c1: "#111111", c2: "#000000", emoji: "🐆", category: "Sport", hint: "Le félin bondissant" },
  { id: 32, name: "New Balance", initial: "N", c1: "#cf0a2c", c2: "#9a061f", emoji: "👟", category: "Sport", hint: "Le « N » des baskets" },
  { id: 33, name: "Vans", initial: "V", c1: "#111111", c2: "#000000", emoji: "🛹", category: "Sport", hint: "Skate et « Off The Wall »" },
  { id: 34, name: "Converse", initial: "★", c1: "#111111", c2: "#333333", emoji: "👟", category: "Sport", hint: "L'étoile « All Star »" },
  { id: 35, name: "The North Face", initial: "▲", c1: "#111111", c2: "#e4002b", emoji: "🏔️", category: "Sport", hint: "Vêtements outdoor" },

  /* ── Mode & luxe ── */
  { id: 36, name: "Lacoste", initial: "🐊", c1: "#004526", c2: "#008f4c", emoji: "🐊", category: "Mode", hint: "Le crocodile vert" },
  { id: 37, name: "Zara", initial: "Z", c1: "#111111", c2: "#000000", emoji: "👗", category: "Mode", hint: "Fast-fashion espagnol" },
  { id: 38, name: "H&M", initial: "H", c1: "#e50010", c2: "#b3000c", emoji: "👕", category: "Mode", hint: "Mode suédoise abordable" },
  { id: 39, name: "Uniqlo", initial: "U", c1: "#ff0000", c2: "#c40000", emoji: "🧥", category: "Mode", hint: "Basiques japonais" },
  { id: 40, name: "Supreme", initial: "S", c1: "#e5322d", c2: "#b31e1a", emoji: "🧢", category: "Mode", hint: "Le carré rouge du streetwear" },
  { id: 41, name: "Ralph Lauren", initial: "🐴", c1: "#012169", c2: "#0a3a9c", emoji: "🐴", category: "Mode", hint: "Le joueur de polo" },
  { id: 42, name: "Gucci", initial: "GG", c1: "#006341", c2: "#8b0000", emoji: "💎", category: "Luxe", hint: "Le double G italien" },
  { id: 43, name: "Louis Vuitton", initial: "LV", c1: "#4b2e19", c2: "#c9a227", emoji: "💼", category: "Luxe", hint: "Le monogramme LV" },
  { id: 44, name: "Chanel", initial: "CC", c1: "#111111", c2: "#000000", emoji: "🌸", category: "Luxe", hint: "Les deux C entrelacés" },
  { id: 45, name: "Dior", initial: "D", c1: "#111111", c2: "#333333", emoji: "👜", category: "Luxe", hint: "Maison de couture parisienne" },

  /* ── Fast-food & boissons & snacks ── */
  { id: 46, name: "McDonald's", initial: "M", c1: "#ffc72c", c2: "#da291c", emoji: "🍟", category: "Fast-food", hint: "Les arches dorées" },
  { id: 47, name: "Burger King", initial: "BK", c1: "#d62300", c2: "#8f1700", emoji: "🍔", category: "Fast-food", hint: "Le Whopper" },
  { id: 48, name: "KFC", initial: "K", c1: "#a30000", c2: "#6e0000", emoji: "🍗", category: "Fast-food", hint: "Le poulet du Colonel" },
  { id: 49, name: "Starbucks", initial: "★", c1: "#00704a", c2: "#004a31", emoji: "☕", category: "Fast-food", hint: "La sirène verte du café" },
  { id: 50, name: "Subway", initial: "S", c1: "#008c15", c2: "#ffc600", emoji: "🥪", category: "Fast-food", hint: "Sandwichs sur mesure" },
  { id: 51, name: "Domino's", initial: "D", c1: "#006491", c2: "#e31837", emoji: "🍕", category: "Fast-food", hint: "Pizzas livrées, le domino" },
  { id: 52, name: "Coca-Cola", initial: "C", c1: "#f40009", c2: "#a50006", emoji: "🥤", category: "Boissons", hint: "Le soda rouge n°1" },
  { id: 53, name: "Pepsi", initial: "P", c1: "#004b93", c2: "#e32934", emoji: "🥤", category: "Boissons", hint: "Le rival bleu du cola" },
  { id: 54, name: "Red Bull", initial: "RB", c1: "#001489", c2: "#db0a40", emoji: "🐂", category: "Boissons", hint: "« Donne des ailes », 2 taureaux" },
  { id: 55, name: "Monster", initial: "M", c1: "#a3d900", c2: "#111111", emoji: "🥤", category: "Boissons", hint: "L'énergie à la griffe verte" },
  { id: 56, name: "Fanta", initial: "F", c1: "#ff7f00", c2: "#e35b00", emoji: "🍊", category: "Boissons", hint: "Le soda orange pétillant" },
  { id: 57, name: "Nutella", initial: "N", c1: "#3b2417", c2: "#e30613", emoji: "🍫", category: "Snacks", hint: "La pâte à tartiner noisette" },
  { id: 58, name: "Oreo", initial: "O", c1: "#111111", c2: "#0067b1", emoji: "🍪", category: "Snacks", hint: "Le biscuit noir à fourrer" },
  { id: 59, name: "Kinder", initial: "K", c1: "#d2001f", c2: "#8b4513", emoji: "🍫", category: "Snacks", hint: "Chocolat et surprises" },
  { id: 60, name: "Haribo", initial: "H", c1: "#e30613", c2: "#ffd200", emoji: "🐻", category: "Snacks", hint: "Les bonbons oursons" },

  /* ── Auto ── */
  { id: 61, name: "BMW", initial: "B", c1: "#0066b1", c2: "#003d6b", emoji: "🚗", category: "Auto", hint: "L'hélice bleu-blanc bavaroise" },
  { id: 62, name: "Mercedes-Benz", initial: "☰", c1: "#333333", c2: "#000000", emoji: "🚗", category: "Auto", hint: "L'étoile à 3 branches" },
  { id: 63, name: "Ferrari", initial: "🐎", c1: "#ff2800", c2: "#b31c00", emoji: "🏎️", category: "Auto", hint: "Le cheval cabré italien" },
  { id: 64, name: "Lamborghini", initial: "🐂", c1: "#ddb321", c2: "#111111", emoji: "🏎️", category: "Auto", hint: "Le taureau, supercars" },
  { id: 65, name: "Toyota", initial: "T", c1: "#eb0a1e", c2: "#a50715", emoji: "🚗", category: "Auto", hint: "Constructeur japonais n°1" },
  { id: 66, name: "Peugeot", initial: "🦁", c1: "#111111", c2: "#333333", emoji: "🦁", category: "Auto", hint: "Le lion français" },

  /* ── Divertissement & divers ── */
  { id: 67, name: "Disney", initial: "D", c1: "#006e99", c2: "#00456b", emoji: "🏰", category: "Divertissement", hint: "Le château et Mickey" },
  { id: 68, name: "Marvel", initial: "M", c1: "#ed1d24", c2: "#b30d13", emoji: "🦸", category: "Divertissement", hint: "Les super-héros (Avengers)" },
  { id: 69, name: "Lego", initial: "L", c1: "#d01012", c2: "#ffcf00", emoji: "🧱", category: "Divers", hint: "Les briques danoises" },
  { id: 70, name: "IKEA", initial: "I", c1: "#0051ba", c2: "#ffda1a", emoji: "🛋️", category: "Divers", hint: "Meubles suédois en kit" },
  { id: 71, name: "Airbnb", initial: "◉", c1: "#ff5a5f", c2: "#e0484d", emoji: "🏠", category: "Divers", hint: "Louer un logement chez l'habitant" },
  { id: 72, name: "Uber", initial: "U", c1: "#111111", c2: "#000000", emoji: "🚕", category: "Divers", hint: "Réserver une course en un tap" },
  { id: 73, name: "PayPal", initial: "P", c1: "#003087", c2: "#009cde", emoji: "💳", category: "Divers", hint: "Le paiement en ligne" },
];

const shuffle = <T,>(a: T[], rnd: () => number): T[] => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
};

/** L'initiale du monogramme (première lettre si non précisée). */
export function monogram(b: Brand): string { return b.initial || b.name.charAt(0).toUpperCase(); }

/** Tire une marque en évitant toute répétition (partie + parties récentes). */
export function pickBrand(usedInGame: number[], recent: Set<string>, rnd: () => number = Math.random): Brand {
  const inGame = new Set(usedInGame);
  let pool = MARQUES.filter(b => !inGame.has(b.id) && !recent.has(String(b.id)));
  if (pool.length === 0) pool = MARQUES.filter(b => !inGame.has(b.id));
  if (pool.length === 0) pool = MARQUES;
  return pool[Math.floor(rnd() * pool.length)];
}

/** 4 options (la bonne + 3 leurres, prioritairement de la même catégorie). */
export function buildOptions(answer: Brand, rnd: () => number = Math.random): string[] {
  const sameCat = shuffle(MARQUES.filter(b => b.id !== answer.id && b.category === answer.category), rnd);
  const others = shuffle(MARQUES.filter(b => b.id !== answer.id && b.category !== answer.category), rnd);
  const distractors = [...sameCat, ...others].slice(0, 3).map(b => b.name);
  return shuffle([answer.name, ...distractors], rnd);
}
