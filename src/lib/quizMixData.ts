import { QUIZ_BANK } from "./gameData";
import { JP_PRODUCTS } from "./justePrixData";
import { MARQUES, buildOptions } from "./marquesData";
import type { MixRound } from "../types";

/* ══════════════════════════════════════════════════════════════════════════
   QUIZ KHELIJ « LE GRAND MIX » — construit une playlist de manches où le
   FORMAT change à chaque tour (Culture QCM · Vrai/Faux · Juste Prix · Marque),
   en réutilisant les bases existantes. Contenu Vrai/Faux 100 % original.
   ══════════════════════════════════════════════════════════════════════════ */

export interface VraiFaux { text: string; answer: boolean; explain?: string; }

export const VRAI_FAUX: VraiFaux[] = [
  { text: "La Tour Eiffel se trouve à Paris.", answer: true },
  { text: "Un triangle a quatre côtés.", answer: false, explain: "Il en a trois." },
  { text: "Le miel est fabriqué par les abeilles.", answer: true },
  { text: "Le Soleil tourne autour de la Terre.", answer: false, explain: "C'est la Terre qui tourne autour du Soleil." },
  { text: "Les dauphins sont des mammifères.", answer: true },
  { text: "L'eau bout à 100 °C au niveau de la mer.", answer: true },
  { text: "Une année compte 13 mois.", answer: false, explain: "Elle en compte 12." },
  { text: "Le sang humain est bleu à l'intérieur du corps.", answer: false, explain: "Il est toujours rouge." },
  { text: "Les araignées ont huit pattes.", answer: true },
  { text: "Le Nil est un fleuve d'Afrique.", answer: true },
  { text: "Les manchots peuvent voler.", answer: false, explain: "Ils nagent mais ne volent pas." },
  { text: "Le chocolat est fabriqué à partir de la fève de cacao.", answer: true },
  { text: "Il y a sept continents sur Terre.", answer: true },
  { text: "Le cœur se trouve du côté droit du corps.", answer: false, explain: "Il penche plutôt à gauche." },
  { text: "Le mont Everest est la plus haute montagne du monde.", answer: true },
  { text: "Les chauves-souris sont des oiseaux.", answer: false, explain: "Ce sont des mammifères." },
  { text: "Un carré a tous ses côtés égaux.", answer: true },
  { text: "La Lune produit sa propre lumière.", answer: false, explain: "Elle reflète la lumière du Soleil." },
  { text: "L'Australie est à la fois un pays et un continent.", answer: true },
  { text: "Les tomates sont des fruits pour les botanistes.", answer: true },
  { text: "Le guépard est l'animal terrestre le plus rapide.", answer: true },
  { text: "Il fait généralement plus froid en été qu'en hiver.", answer: false },
  { text: "Le diamant est l'un des matériaux naturels les plus durs.", answer: true },
  { text: "Les poissons respirent grâce à des poumons.", answer: false, explain: "Ils respirent avec des branchies." },
  { text: "La Grande Muraille se trouve en Chine.", answer: true },
  { text: "Un kilomètre vaut cent mètres.", answer: false, explain: "Il vaut mille mètres." },
  { text: "Saturne est connue pour ses anneaux.", answer: true },
  { text: "Ajouter du sel rend l'eau moins salée.", answer: false },
  { text: "Le papillon sort d'une chenille.", answer: true },
  { text: "Les escargots possèdent des milliers de minuscules dents.", answer: true },
  { text: "Le Sahara est un désert de glace.", answer: false, explain: "C'est un désert de sable et de chaleur." },
  { text: "Le drapeau du Japon comporte un rond rouge.", answer: true },
  { text: "Un adulte possède vingt dents.", answer: false, explain: "Il en a en général 32." },
  { text: "Les kangourous vivent surtout en Australie.", answer: true },
  { text: "La girafe a un cou plus court que celui du cheval.", answer: false },
  { text: "Le citron est un fruit plus sucré que la fraise.", answer: false },
  { text: "L'oxygène est le gaz que l'on respire pour vivre.", answer: true },
  { text: "Les fourmis peuvent porter plusieurs fois leur propre poids.", answer: true },
  { text: "Le pingouin et le manchot sont exactement le même animal.", answer: false },
  { text: "La vitesse de la lumière est plus rapide que celle du son.", answer: true },
];

const shuffle = <T,>(a: T[], rnd: () => number): T[] => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
};

export const MIX_TYPES = ["qcm", "vf", "prix", "marque"] as const;
export type MixType = typeof MIX_TYPES[number];

const CAT_LABEL: Record<MixType, string> = {
  qcm: "🧠 Culture", vf: "⚖️ Vrai ou Faux", prix: "💰 Le Juste Prix", marque: "🏷️ Devine la Marque",
};

/** Clé unique d'une manche (non-répétition inter-parties). */
export function mixKey(r: MixRound): string {
  if (r.type === "qcm") return `q:${r.q}`;
  if (r.type === "vf") return `v:${r.q}`;
  if (r.type === "prix") return `p:${r.product?.id}`;
  return `m:${r.brand?.id}`;
}

function buildOne(type: MixType, used: Set<string>, rnd: () => number): MixRound | null {
  if (type === "qcm") {
    const pool = shuffle(QUIZ_BANK, rnd).find(x => !used.has(`q:${x.question}`));
    if (!pool) return null;
    return { type, cat: CAT_LABEL.qcm, sub: pool.category, q: pool.question,
      options: shuffle([pool.answer, ...pool.badAnswers.slice(0, 3)], rnd), answer: pool.answer };
  }
  if (type === "vf") {
    const pick = shuffle(VRAI_FAUX, rnd).find(x => !used.has(`v:${x.text}`));
    if (!pick) return null;
    const r: MixRound = { type, cat: CAT_LABEL.vf, q: pick.text, options: ["Vrai", "Faux"],
      answer: pick.answer ? "Vrai" : "Faux" };
    if (pick.explain) r.explain = pick.explain;   // pas de clé `undefined` (refusée par Firebase)
    return r;
  }
  if (type === "prix") {
    const p = shuffle(JP_PRODUCTS, rnd).find(x => !used.has(`p:${x.id}`));
    if (!p) return null;
    return { type, cat: CAT_LABEL.prix, product: p };
  }
  const b = shuffle(MARQUES, rnd).find(x => !used.has(`m:${x.id}`));
  if (!b) return null;
  return { type, cat: CAT_LABEL.marque, brand: b, options: buildOptions(b, rnd), answer: b.name };
}

/** Construit une playlist de `count` manches en alternant les formats et sans
 *  répéter un contenu (dans la partie ET par rapport aux parties récentes). */
export function buildMixPlaylist(count: number, recent: Set<string>, types: MixType[] = [...MIX_TYPES], rnd: () => number = Math.random): MixRound[] {
  const used = new Set(recent);
  const order = shuffle(types, rnd);
  const rounds: MixRound[] = [];
  for (let i = 0; i < count; i++) {
    let r: MixRound | null = null;
    // essaie le format prévu, puis les autres si épuisé
    for (let k = 0; k < order.length && !r; k++) r = buildOne(order[(i + k) % order.length], used, rnd);
    if (!r) { // tout est « déjà vu » : on oublie l'historique récent et on repart
      used.clear();
      r = buildOne(order[i % order.length], used, rnd);
    }
    if (r) { rounds.push(r); used.add(mixKey(r)); }
  }
  return rounds;
}
