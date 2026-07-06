/* Données du plateau MONOPOLY KHELIJ (40 cases, économie classique équilibrée,
   noms francisés & familiaux). Tout est constant → aucune logique ici. */

export type SpaceType = "go" | "prop" | "rail" | "util" | "tax" | "chance" | "chest" | "jail" | "gotojail" | "parking";

export interface Space {
  i: number;
  type: SpaceType;
  name: string;
  short: string;         // libellé court pour la case
  group?: string;        // groupe de couleur (prop) / "rail" / "util"
  price?: number;
  rent?: number[];       // [base, 1 maison, 2, 3, 4, hôtel]
  house?: number;        // coût d'une maison
  tax?: number;
  color?: string;        // couleur d'affichage du groupe
}

const G: Record<string, string> = {
  brown: "#8b5a2b", light: "#8fd3ff", pink: "#e56ab3", orange: "#f2913d",
  red: "#e0403f", yellow: "#f4d03f", green: "#2fa66a", blue: "#3b6fe0",
  rail: "#333a4d", util: "#6b7280",
};

export const SALARY = 200;
export const JAIL_INDEX = 10;
export const GOTOJAIL_INDEX = 30;
export const JAIL_FINE = 50;
export const START_MONEY = 1500;
export const MAX_HOUSES = 5; // 5 = hôtel

export const BOARD: Space[] = [
  { i: 0, type: "go", name: "Départ", short: "DÉPART" },
  { i: 1, type: "prop", name: "Ruelle des Câlins", short: "Câlins", group: "brown", color: G.brown, price: 60, rent: [2, 10, 30, 90, 160, 250], house: 50 },
  { i: 2, type: "chest", name: "Caisse de Famille", short: "Caisse" },
  { i: 3, type: "prop", name: "Impasse des Jouets", short: "Jouets", group: "brown", color: G.brown, price: 60, rent: [4, 20, 60, 180, 320, 450], house: 50 },
  { i: 4, type: "tax", name: "Impôts", short: "Impôts", tax: 200 },
  { i: 5, type: "rail", name: "Gare du Nord", short: "Gare N.", group: "rail", color: G.rail, price: 200 },
  { i: 6, type: "prop", name: "Allée des Bonbons", short: "Bonbons", group: "light", color: G.light, price: 100, rent: [6, 30, 90, 270, 400, 550], house: 50 },
  { i: 7, type: "chance", name: "Chance", short: "Chance" },
  { i: 8, type: "prop", name: "Rue du Goûter", short: "Goûter", group: "light", color: G.light, price: 100, rent: [6, 30, 90, 270, 400, 550], house: 50 },
  { i: 9, type: "prop", name: "Place des Doudous", short: "Doudous", group: "light", color: G.light, price: 120, rent: [8, 40, 100, 300, 450, 600], house: 50 },
  { i: 10, type: "jail", name: "Prison / Visite", short: "Prison" },
  { i: 11, type: "prop", name: "Avenue des Vacances", short: "Vacances", group: "pink", color: G.pink, price: 140, rent: [10, 50, 150, 450, 625, 750], house: 100 },
  { i: 12, type: "util", name: "Fée Électricité", short: "Électricité", group: "util", color: G.util, price: 150 },
  { i: 13, type: "prop", name: "Boulevard du Cirque", short: "Cirque", group: "pink", color: G.pink, price: 140, rent: [10, 50, 150, 450, 625, 750], house: 100 },
  { i: 14, type: "prop", name: "Rue du Zoo", short: "Zoo", group: "pink", color: G.pink, price: 160, rent: [12, 60, 180, 500, 700, 900], house: 100 },
  { i: 15, type: "rail", name: "Gare de l'Est", short: "Gare E.", group: "rail", color: G.rail, price: 200 },
  { i: 16, type: "prop", name: "Allée du Cinéma", short: "Cinéma", group: "orange", color: G.orange, price: 180, rent: [14, 70, 200, 550, 750, 950], house: 100 },
  { i: 17, type: "chest", name: "Caisse de Famille", short: "Caisse" },
  { i: 18, type: "prop", name: "Rue de la Plage", short: "Plage", group: "orange", color: G.orange, price: 180, rent: [14, 70, 200, 550, 750, 950], house: 100 },
  { i: 19, type: "prop", name: "Avenue du Parc", short: "Parc", group: "orange", color: G.orange, price: 200, rent: [16, 80, 220, 600, 800, 1000], house: 100 },
  { i: 20, type: "parking", name: "Parc Gratuit", short: "Parking" },
  { i: 21, type: "prop", name: "Rue des Gourmands", short: "Gourmands", group: "red", color: G.red, price: 220, rent: [18, 90, 250, 700, 875, 1050], house: 150 },
  { i: 22, type: "chance", name: "Chance", short: "Chance" },
  { i: 23, type: "prop", name: "Boulevard du Sport", short: "Sport", group: "red", color: G.red, price: 220, rent: [18, 90, 250, 700, 875, 1050], house: 150 },
  { i: 24, type: "prop", name: "Avenue de la Fête", short: "Fête", group: "red", color: G.red, price: 240, rent: [20, 100, 300, 750, 925, 1100], house: 150 },
  { i: 25, type: "rail", name: "Gare de Lyon", short: "Gare L.", group: "rail", color: G.rail, price: 200 },
  { i: 26, type: "prop", name: "Rue de la Musique", short: "Musique", group: "yellow", color: G.yellow, price: 260, rent: [22, 110, 330, 800, 975, 1150], house: 150 },
  { i: 27, type: "prop", name: "Allée des Étoiles", short: "Étoiles", group: "yellow", color: G.yellow, price: 260, rent: [22, 110, 330, 800, 975, 1150], house: 150 },
  { i: 28, type: "util", name: "Château d'Eau", short: "Château d'Eau", group: "util", color: G.util, price: 150 },
  { i: 29, type: "prop", name: "Boulevard des Rêves", short: "Rêves", group: "yellow", color: G.yellow, price: 280, rent: [24, 120, 360, 850, 1025, 1200], house: 150 },
  { i: 30, type: "gotojail", name: "Allez en prison", short: "En prison !" },
  { i: 31, type: "prop", name: "Avenue des Héros", short: "Héros", group: "green", color: G.green, price: 300, rent: [26, 130, 390, 900, 1100, 1275], house: 200 },
  { i: 32, type: "prop", name: "Rue des Dragons", short: "Dragons", group: "green", color: G.green, price: 300, rent: [26, 130, 390, 900, 1100, 1275], house: 200 },
  { i: 33, type: "chest", name: "Caisse de Famille", short: "Caisse" },
  { i: 34, type: "prop", name: "Boulevard Royal", short: "Royal", group: "green", color: G.green, price: 320, rent: [28, 150, 450, 1000, 1200, 1400], house: 200 },
  { i: 35, type: "rail", name: "Gare Montparnasse", short: "Gare M.", group: "rail", color: G.rail, price: 200 },
  { i: 36, type: "chance", name: "Chance", short: "Chance" },
  { i: 37, type: "prop", name: "Avenue de l'Arc-en-ciel", short: "Arc-en-ciel", group: "blue", color: G.blue, price: 350, rent: [35, 175, 500, 1100, 1300, 1500], house: 200 },
  { i: 38, type: "tax", name: "Taxe de luxe", short: "Taxe luxe", tax: 100 },
  { i: 39, type: "prop", name: "Palais des Merveilles", short: "Palais", group: "blue", color: G.blue, price: 400, rent: [50, 200, 600, 1400, 1700, 2000], house: 200 },
];

export const RAIL_RENT = [25, 50, 100, 200];  // selon le nombre de gares possédées
export const UTIL_MULT = [4, 10];              // ×dés selon le nombre de compagnies

/* Cartes Chance & Caisse. action = fonction décrite par un objet simple. */
export interface Card {
  text: string;
  kind: "money" | "move" | "moveTo" | "jail" | "getout" | "goto" | "repairs";
  amount?: number;   // money (+/-), or destination index (move/goto)
}

export const CHANCE: Card[] = [
  { text: "Rends-toi à la case Départ. (+200)", kind: "goto", amount: 0 },
  { text: "Rends-toi au Palais des Merveilles.", kind: "goto", amount: 39 },
  { text: "Avance jusqu'à la Gare du Nord.", kind: "goto", amount: 5 },
  { text: "La banque te verse un dividende de 50.", kind: "money", amount: 50 },
  { text: "Sors de prison gratuitement (garde cette carte).", kind: "getout" },
  { text: "Recule de 3 cases.", kind: "move", amount: -3 },
  { text: "Va en prison directement.", kind: "jail" },
  { text: "Amende pour excès de vitesse : paie 15.", kind: "money", amount: -15 },
  { text: "Tes efforts sont récompensés : reçois 150.", kind: "money", amount: 150 },
  { text: "Réparations : paie 25 par maison, 100 par hôtel.", kind: "repairs", amount: 0 },
];

export const CHEST: Card[] = [
  { text: "Rends-toi à la case Départ. (+200)", kind: "goto", amount: 0 },
  { text: "Erreur de la banque en ta faveur : reçois 200.", kind: "money", amount: 200 },
  { text: "Frais de médecin : paie 50.", kind: "money", amount: -50 },
  { text: "Sors de prison gratuitement (garde cette carte).", kind: "getout" },
  { text: "Va en prison directement.", kind: "jail" },
  { text: "C'est ton anniversaire : reçois 100 !", kind: "money", amount: 100 },
  { text: "Remboursement d'impôts : reçois 20.", kind: "money", amount: 20 },
  { text: "Prix de beauté du quartier : reçois 10.", kind: "money", amount: 10 },
  { text: "Facture d'hôpital : paie 100.", kind: "money", amount: -100 },
  { text: "Héritage : reçois 100.", kind: "money", amount: 100 },
];

export const TOKENS = ["🐱", "🐶", "🚗", "🎩", "🐴", "⛵", "🦖", "🌟"];
