/* ══════════════════════════════════════════════════════════════════════════
   PETIT BAC — données statiques (catégories + lettres).
   La validation des réponses et le dictionnaire par catégorie vivent dans
   petitBacDict.ts (source unique des mots reconnus + réponses de l'ordinateur).
   ══════════════════════════════════════════════════════════════════════════ */

export const PB_CATEGORY_POOL: string[] = [
  "Prénom",
  "Animal",
  "Pays ou Ville",
  "Métier",
  "Fruit ou Légume",
  "Objet",
  "Couleur",
  "Sport",
  "Personnage",
  "Nourriture",
  "Marque",
  "Élément de la nature",
  "Vêtement",
  "Instrument de musique",
  "Moyen de transport",
  "Partie du corps",
  "Boisson",
  "Plat ou spécialité",
  "Dans la cuisine",
  "Dans la salle de bain",
  "À l'école",
  "Au zoo",
  "Ce qui vole",
  "Verbe d'action",
  "Adjectif (qualité)",
];

/* A B C D E F G H I J L M N O P R S T V — lettres « faciles » uniquement. */
export const PB_LETTERS: string[] = "ABCDEFGHIJLMNOPRSTV".split("");

/* Retire les accents et met en minuscule (comparaison de première lettre). */
export function pbStripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
