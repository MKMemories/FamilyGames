import type { JpProduct } from "../types";

/* ══════════════════════════════════════════════════════════════════════════
   LE JUSTE PRIX — catalogue localisé FRANCE, prix moyens indicatifs 2024.
   • Fruits & légumes : la quantité / le poids est précisé dans le titre.
   • Chaque prix indique sa SOURCE et le PAYS où il s'applique.
   Sources :
   - Produits frais (fruits & légumes) : moyennes indicatives d'après le Réseau
     des Nouvelles des Marchés (RNM) de FranceAgriMer, 2024.
   - Épicerie / produits du quotidien : relevés indicatifs en grande
     distribution (France, 2024), ordre de grandeur type panier Insee.
   - Produits non alimentaires : prix courants indicatifs e-commerce /
     grande distribution (France, 2024).
   Les prix sont des MOYENNES INDICATIVES (ils varient selon saison et enseigne).
   ══════════════════════════════════════════════════════════════════════════ */

const FR = "France";
const SRC_FL = "FranceAgriMer / RNM 2024 (moyenne indicative)";
const SRC_EP = "Relevé grande distribution France 2024 (indicatif)";
const SRC_NA = "Prix courant e-commerce France 2024 (indicatif)";

export const JP_PRODUCTS: JpProduct[] = [
  /* ── Fruits & légumes (quantité précisée) ── */
  { id: 1001, title: "1 kg de pommes Golden", price: 2.30, emoji: "🍏", category: "Fruits & légumes", source: SRC_FL, country: FR, thumbnail: "" },
  { id: 1002, title: "1 kg de bananes", price: 1.90, emoji: "🍌", category: "Fruits & légumes", source: SRC_FL, country: FR, thumbnail: "" },
  { id: 1003, title: "500 g de fraises (Gariguette)", price: 4.50, emoji: "🍓", category: "Fruits & légumes", source: SRC_FL, country: FR, thumbnail: "" },
  { id: 1004, title: "1 kg de tomates rondes", price: 2.80, emoji: "🍅", category: "Fruits & légumes", source: SRC_FL, country: FR, thumbnail: "" },
  { id: 1005, title: "Filet de 2 kg d'oranges", price: 3.20, emoji: "🍊", category: "Fruits & légumes", source: SRC_FL, country: FR, thumbnail: "" },
  { id: 1006, title: "1 kg de pommes de terre", price: 1.50, emoji: "🥔", category: "Fruits & légumes", source: SRC_FL, country: FR, thumbnail: "" },
  { id: 1007, title: "1 kg de carottes", price: 1.30, emoji: "🥕", category: "Fruits & légumes", source: SRC_FL, country: FR, thumbnail: "" },
  { id: 1008, title: "1 botte de radis", price: 1.20, emoji: "🌱", category: "Fruits & légumes", source: SRC_FL, country: FR, thumbnail: "" },
  { id: 1009, title: "1 kg de courgettes", price: 2.20, emoji: "🥒", category: "Fruits & légumes", source: SRC_FL, country: FR, thumbnail: "" },
  { id: 1010, title: "1 kg de poires Conférence", price: 2.60, emoji: "🍐", category: "Fruits & légumes", source: SRC_FL, country: FR, thumbnail: "" },
  { id: 1011, title: "500 g de champignons de Paris", price: 2.40, emoji: "🍄", category: "Fruits & légumes", source: SRC_FL, country: FR, thumbnail: "" },
  { id: 1012, title: "1 kg de raisin blanc", price: 3.50, emoji: "🍇", category: "Fruits & légumes", source: SRC_FL, country: FR, thumbnail: "" },
  { id: 1013, title: "1 salade (laitue)", price: 1.10, emoji: "🥬", category: "Fruits & légumes", source: SRC_FL, country: FR, thumbnail: "" },
  { id: 1014, title: "1 kg d'oignons jaunes", price: 1.60, emoji: "🧅", category: "Fruits & légumes", source: SRC_FL, country: FR, thumbnail: "" },
  { id: 1015, title: "1 kg de clémentines", price: 2.90, emoji: "🍊", category: "Fruits & légumes", source: SRC_FL, country: FR, thumbnail: "" },
  { id: 1016, title: "1 kg de citrons", price: 3.00, emoji: "🍋", category: "Fruits & légumes", source: SRC_FL, country: FR, thumbnail: "" },
  { id: 1017, title: "1 kg de poivrons", price: 3.80, emoji: "🫑", category: "Fruits & légumes", source: SRC_FL, country: FR, thumbnail: "" },
  { id: 1018, title: "1 kg de haricots verts", price: 4.20, emoji: "🫛", category: "Fruits & légumes", source: SRC_FL, country: FR, thumbnail: "" },
  { id: 1019, title: "1 avocat (à l'unité)", price: 1.40, emoji: "🥑", category: "Fruits & légumes", source: SRC_FL, country: FR, thumbnail: "" },
  { id: 1020, title: "1 ananas (à l'unité)", price: 2.50, emoji: "🍍", category: "Fruits & légumes", source: SRC_FL, country: FR, thumbnail: "" },
  { id: 1021, title: "1 kg de brocolis", price: 3.10, emoji: "🥦", category: "Fruits & légumes", source: SRC_FL, country: FR, thumbnail: "" },
  { id: 1022, title: "1 melon (à l'unité)", price: 2.20, emoji: "🍈", category: "Fruits & légumes", source: SRC_FL, country: FR, thumbnail: "" },

  /* ── Épicerie & produits du quotidien ── */
  { id: 2001, title: "1 baguette de pain (250 g)", price: 1.10, emoji: "🥖", category: "Boulangerie", source: SRC_EP, country: FR, thumbnail: "" },
  { id: 2002, title: "1 litre de lait demi-écrémé", price: 1.05, emoji: "🥛", category: "Produits frais", source: SRC_EP, country: FR, thumbnail: "" },
  { id: 2003, title: "1 plaquette de beurre (250 g)", price: 2.40, emoji: "🧈", category: "Produits frais", source: SRC_EP, country: FR, thumbnail: "" },
  { id: 2004, title: "1 boîte de 12 œufs moyens", price: 3.30, emoji: "🥚", category: "Produits frais", source: SRC_EP, country: FR, thumbnail: "" },
  { id: 2005, title: "1 paquet de pâtes (500 g)", price: 1.15, emoji: "🍝", category: "Épicerie", source: SRC_EP, country: FR, thumbnail: "" },
  { id: 2006, title: "1 kg de sucre en poudre", price: 1.20, emoji: "🧂", category: "Épicerie", source: SRC_EP, country: FR, thumbnail: "" },
  { id: 2007, title: "1 paquet de café moulu (250 g)", price: 3.50, emoji: "☕", category: "Épicerie", source: SRC_EP, country: FR, thumbnail: "" },
  { id: 2008, title: "1 tablette de chocolat (100 g)", price: 1.80, emoji: "🍫", category: "Épicerie", source: SRC_EP, country: FR, thumbnail: "" },
  { id: 2009, title: "1 kg de riz long", price: 2.10, emoji: "🍚", category: "Épicerie", source: SRC_EP, country: FR, thumbnail: "" },
  { id: 2010, title: "1 pot de pâte à tartiner (400 g)", price: 3.60, emoji: "🍯", category: "Épicerie", source: SRC_EP, country: FR, thumbnail: "" },
  { id: 2011, title: "1 pack d'eau (6 × 1,5 L)", price: 2.70, emoji: "💧", category: "Boissons", source: SRC_EP, country: FR, thumbnail: "" },
  { id: 2012, title: "1 litre de jus d'orange", price: 2.20, emoji: "🧃", category: "Boissons", source: SRC_EP, country: FR, thumbnail: "" },
  { id: 2013, title: "1 camembert (250 g)", price: 2.30, emoji: "🧀", category: "Produits frais", source: SRC_EP, country: FR, thumbnail: "" },
  { id: 2014, title: "1 paquet de biscuits (200 g)", price: 1.90, emoji: "🍪", category: "Épicerie", source: SRC_EP, country: FR, thumbnail: "" },
  { id: 2015, title: "1 croissant (boulangerie)", price: 1.20, emoji: "🥐", category: "Boulangerie", source: SRC_EP, country: FR, thumbnail: "" },
  { id: 2016, title: "1 pack de yaourts nature (×8)", price: 2.10, emoji: "🥛", category: "Produits frais", source: SRC_EP, country: FR, thumbnail: "" },

  /* ── Produits non alimentaires ── */
  { id: 3001, title: "Écouteurs Bluetooth sans fil", price: 39.99, emoji: "🎧", category: "Électronique", source: SRC_NA, country: FR, thumbnail: "" },
  { id: 3002, title: "Casque audio à réduction de bruit", price: 199.00, emoji: "🎧", category: "Électronique", source: SRC_NA, country: FR, thumbnail: "" },
  { id: 3003, title: "Cafetière expresso automatique", price: 89.99, emoji: "☕", category: "Électroménager", source: SRC_NA, country: FR, thumbnail: "" },
  { id: 3004, title: "Aspirateur robot connecté", price: 299.00, emoji: "🤖", category: "Électroménager", source: SRC_NA, country: FR, thumbnail: "" },
  { id: 3005, title: "Paire de baskets de running", price: 79.90, emoji: "👟", category: "Sport", source: SRC_NA, country: FR, thumbnail: "" },
  { id: 3006, title: "Tapis de yoga antidérapant", price: 24.99, emoji: "🧘", category: "Sport", source: SRC_NA, country: FR, thumbnail: "" },
  { id: 3007, title: "Ballon de football taille 5", price: 19.99, emoji: "⚽", category: "Sport", source: SRC_NA, country: FR, thumbnail: "" },
  { id: 3008, title: "Trottinette électrique pliable", price: 349.00, emoji: "🛴", category: "Mobilité", source: SRC_NA, country: FR, thumbnail: "" },
  { id: 3009, title: "Ventilateur sur pied silencieux", price: 34.99, emoji: "🌀", category: "Maison", source: SRC_NA, country: FR, thumbnail: "" },
  { id: 3010, title: "Parapluie tempête automatique", price: 14.90, emoji: "☂️", category: "Accessoires", source: SRC_NA, country: FR, thumbnail: "" },
  { id: 3011, title: "Lampe de bureau LED", price: 24.99, emoji: "💡", category: "Maison", source: SRC_NA, country: FR, thumbnail: "" },
  { id: 3012, title: "Enceinte portable étanche", price: 49.99, emoji: "🔊", category: "Électronique", source: SRC_NA, country: FR, thumbnail: "" },
];
