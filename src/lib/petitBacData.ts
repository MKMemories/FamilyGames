/* ══════════════════════════════════════════════════════════════════════════
   PETIT BAC — données statiques
   • Pool de catégories (français, adapté 12–15 ans)
   • Lettres autorisées (on retire les lettres difficiles : K Q U W X Y Z)
   • Banque de mots pour l'ordinateur (mode solo) : par catégorie, l'IA choisit
     un mot commençant par la lettre courante (comparaison sans accent).
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

/* Banque de mots par catégorie (variés, connus des ados). */
const PB_BANK: Record<string, string[]> = {
  "Prénom": [
    "Alice", "Bruno", "Camille", "David", "Emma", "Fanny", "Gabriel", "Hugo",
    "Inès", "Julie", "Louis", "Marie", "Nathan", "Oscar", "Paul", "Rose",
    "Sophie", "Thomas", "Victor",
  ],
  "Animal": [
    "Abeille", "Baleine", "Chat", "Dauphin", "Éléphant", "Fourmi", "Girafe",
    "Hibou", "Iguane", "Jaguar", "Lion", "Mouton", "Narval", "Ours", "Panda",
    "Renard", "Serpent", "Tigre", "Vache",
  ],
  "Pays ou Ville": [
    "Allemagne", "Belgique", "Canada", "Danemark", "Espagne", "France", "Grèce",
    "Hongrie", "Italie", "Japon", "Lyon", "Maroc", "Norvège", "Oslo", "Portugal",
    "Rome", "Suisse", "Tunisie", "Venise",
  ],
  "Métier": [
    "Avocat", "Boulanger", "Coiffeur", "Dentiste", "Électricien", "Facteur",
    "Garagiste", "Horloger", "Infirmier", "Jardinier", "Libraire", "Médecin",
    "Notaire", "Opticien", "Pompier", "Réalisateur", "Serveur", "Traducteur",
    "Vétérinaire",
  ],
  "Fruit ou Légume": [
    "Abricot", "Banane", "Cerise", "Datte", "Endive", "Fraise", "Grenade",
    "Haricot", "Igname", "Litchi", "Mangue", "Navet", "Orange", "Poire",
    "Radis", "Salade", "Tomate", "Vanille",
  ],
  "Objet": [
    "Armoire", "Ballon", "Chaise", "Dé", "Écran", "Fourchette", "Gomme",
    "Horloge", "Igloo", "Journal", "Lampe", "Marteau", "Nappe", "Ordinateur",
    "Parapluie", "Radio", "Stylo", "Table", "Vase",
  ],
  "Couleur": [
    "Argent", "Beige", "Corail", "Doré", "Émeraude", "Fuchsia", "Gris",
    "Indigo", "Jaune", "Lilas", "Mauve", "Noir", "Orange", "Pourpre", "Rouge",
    "Saumon", "Turquoise", "Violet",
  ],
  "Sport": [
    "Athlétisme", "Basket", "Cyclisme", "Danse", "Escrime", "Football", "Golf",
    "Handball", "Judo", "Lutte", "Marche", "Natation", "Plongée", "Rugby",
    "Ski", "Tennis", "Voile",
  ],
  "Personnage": [
    "Aladdin", "Batman", "Cendrillon", "Dracula", "Elsa", "Flash", "Gandalf",
    "Hulk", "Iron Man", "Joker", "Luigi", "Mario", "Néo", "Obélix", "Pikachu",
    "Rémi", "Simba", "Tintin", "Vador",
  ],
  "Nourriture": [
    "Assiette", "Baguette", "Crêpe", "Donut", "Éclair", "Frites", "Gâteau",
    "Hamburger", "Jambon", "Lasagnes", "Miel", "Nouilles", "Omelette", "Pizza",
    "Riz", "Soupe", "Tarte", "Vermicelle",
  ],
  "Marque": [
    "Adidas", "BMW", "Chanel", "Dior", "Ferrari", "Gucci", "Intel", "Jaguar",
    "Lego", "Mercedes", "Nike", "Orange", "Puma", "Renault", "Samsung",
    "Toyota", "Volvo",
  ],
  "Élément de la nature": [
    "Air", "Brume", "Cascade", "Dune", "Éclair", "Feu", "Givre", "Herbe",
    "Île", "Lune", "Montagne", "Nuage", "Océan", "Pluie", "Rivière", "Soleil",
    "Terre", "Vent",
  ],
  "Vêtement": [
    "Anorak", "Blouson", "Chaussette", "Débardeur", "Écharpe", "Foulard", "Gant",
    "Imperméable", "Jupe", "Legging", "Manteau", "Nœud", "Pantalon", "Robe",
    "Salopette", "Tee-shirt", "Veste",
  ],
  "Instrument de musique": [
    "Accordéon", "Banjo", "Cymbale", "Djembé", "Épinette", "Flûte", "Guitare",
    "Harpe", "Ipu", "Jarana", "Luth", "Maracas", "Orgue", "Piano", "Rebab",
    "Saxophone", "Trompette", "Violon",
  ],
  "Moyen de transport": [
    "Avion", "Bus", "Camion", "Draisienne", "Engin", "Ferry", "Gondole",
    "Hélicoptère", "Jet", "Locomotive", "Métro", "Navire", "Overboard", "Paquebot",
    "Rollers", "Scooter", "Taxi", "Vélo",
  ],
  "Partie du corps": [
    "Avant-bras", "Bras", "Cheville", "Doigt", "Épaule", "Front", "Genou",
    "Hanche", "Index", "Jambe", "Langue", "Main", "Nez", "Oreille", "Poignet",
    "Rotule", "Sourcil", "Talon", "Ventre",
  ],
  "Boisson": [
    "Ananas", "Bissap", "Café", "Diabolo", "Eau", "Frappé", "Grenadine",
    "Infusion", "Jus", "Lait", "Menthe", "Nectar", "Orangeade", "Punch",
    "Sirop", "Thé", "Tisane", "Vichy",
  ],
  "Plat ou spécialité": [
    "Aïoli", "Bruschetta", "Couscous", "Dahl", "Empanada",
    "Fondue", "Gratin", "Houmous", "Involtini", "Jambalaya", "Lasagnes",
    "Moussaka", "Nems", "Osso-buco", "Paella", "Raclette", "Sushi", "Tajine",
  ],
  "Dans la cuisine": [
    "Assiette", "Bol", "Casserole", "Décapsuleur", "Écumoire",
    "Fouet", "Grille-pain", "Hachoir", "Îlot", "Jatte", "Louche", "Marmite",
    "Nappe", "Ouvre-boîte", "Poêle", "Râpe", "Saladier", "Tasse", "Verre",
  ],
  "Dans la salle de bain": [
    "Armoire", "Brosse", "Coton", "Douche", "Éponge", "Flacon", "Gant",
    "Huile", "Interrupteur", "Jacuzzi", "Lavabo", "Miroir", "Nécessaire",
    "Ouate", "Peigne", "Rasoir", "Savon", "Tapis", "Vernis",
  ],
  "À l'école": [
    "Ardoise", "Bureau", "Cartable", "Dictionnaire", "Élève", "Feutre",
    "Gomme", "Horloge", "Institutrice", "Journal", "Livre", "Maîtresse",
    "Note", "Ordinateur", "Professeur", "Récréation", "Stylo", "Tableau", "Vacances",
  ],
  "Au zoo": [
    "Autruche", "Buffle", "Crocodile", "Dromadaire", "Éléphant", "Flamant",
    "Girafe", "Hippopotame", "Iguane", "Jaguar", "Lémurien", "Manchot",
    "Nandou", "Otarie", "Panthère", "Rhinocéros", "Suricate", "Tigre", "Vautour",
  ],
  "Ce qui vole": [
    "Abeille", "Ballon", "Cerf-volant", "Drone", "Épervier", "Fusée", "Guêpe",
    "Hélicoptère", "Insecte", "Jet", "Libellule", "Moineau", "Nuage", "Oiseau",
    "Papillon", "Roquette", "Satellite", "Vautour",
  ],
  "Verbe d'action": [
    "Aller", "Bondir", "Courir", "Danser", "Écrire", "Foncer", "Grimper",
    "Hurler", "Imiter", "Jouer", "Lancer", "Marcher", "Nager", "Observer",
    "Plonger", "Rouler", "Sauter", "Tourner", "Voler",
  ],
  "Adjectif (qualité)": [
    "Aimable", "Brave", "Calme", "Doux", "Élégant", "Fidèle", "Généreux",
    "Honnête", "Intelligent", "Joyeux", "Loyal", "Malin", "Noble", "Optimiste",
    "Patient", "Rapide", "Sage", "Tendre", "Vaillant",
  ],
};

/**
 * Renvoie un mot plausible pour la catégorie donnée commençant par `letter`
 * (comparaison sans accent), ou "" si la banque n'en contient aucun.
 */
export function pbAiAnswer(category: string, letter: string): string {
  const bank = PB_BANK[category];
  if (!bank) return "";
  const target = pbStripAccents(letter)[0];
  const matches = bank.filter((w) => pbStripAccents(w)[0] === target);
  if (matches.length === 0) return "";
  return matches[Math.floor(Math.random() * matches.length)];
}
