/* ══════════════════════════════════════════════════════════════════════════
   MOT BOMBE — données du jeu (syllabes + banque de mots)
   - BOMBE_SYLLABLES : syllabes courantes qui ont PLUSIEURS mots enfants.
     Chaque syllabe ci-dessous possède au moins 4 mots dans BOMBE_WORDS
     (vérifié par script, correspondance sans accents).
   - BOMBE_WORDS : banque de mots simples et kid-friendly. Utilisée par l'IA
     du mode solo pour trouver un mot valide contenant la syllabe courante.
   La normalisation (minuscules, sans accents) est faite à la volée dans le
   composant, donc on peut écrire les mots avec leurs accents ici.
   ══════════════════════════════════════════════════════════════════════════ */

export const BOMBE_SYLLABLES: string[] = [
  "CHA", "TRA", "BON", "PAR", "MON", "TER", "POR", "CAR", "MAR", "VOL",
  "RON", "FIL", "SAL", "TON", "VER", "MEN", "RAT", "LON", "POU", "BAL",
  "NET", "COU", "MIN", "TAR", "VIL", "TIN", "BOU", "CHE", "ROU", "MOU",
  "PIN", "CAN",
];

export const BOMBE_WORDS: string[] = [
  // Animaux
  "chat", "chien", "cheval", "chèvre", "chameau", "chaton", "chiot", "cochon",
  "lapin", "souris", "tigre", "lion", "ours", "loup", "renard", "girafe",
  "zèbre", "singe", "éléphant", "crocodile", "serpent", "tortue", "grenouille",
  "poisson", "requin", "dauphin", "baleine", "pingouin", "canard", "poule",
  "vache", "mouton", "agneau", "taureau", "âne", "cerf", "biche", "sanglier",
  "hérisson", "écureuil", "taupe", "hibou", "chouette", "aigle", "corbeau",
  "moineau", "pigeon", "perroquet", "abeille", "papillon", "fourmi",
  "araignée", "escargot", "mouche", "moustique", "coccinelle", "scarabée",
  // Maison
  "maison", "château", "cabane", "igloo", "tente", "immeuble", "ferme",
  "grange", "moulin", "phare", "pont", "tour", "église", "chambre", "cuisine",
  "salon", "salle", "grenier", "cave", "garage", "jardin", "balcon", "toit",
  "porte", "fenêtre", "escalier", "table", "chaise", "fauteuil", "canapé",
  "lit", "armoire", "commode", "bureau", "étagère", "tapis", "lampe", "miroir",
  "horloge", "coussin", "rideau", "balai", "balance",
  // Vaisselle / nourriture
  "assiette", "verre", "couteau", "fourchette", "cuillère", "casserole",
  "poêle", "bol", "tasse", "bouteille", "plateau", "marmite", "tartine",
  "pain", "beurre", "confiture", "fromage", "jambon", "gâteau", "tarte",
  "crêpe", "biscuit", "bonbon", "chocolat", "caramel", "tartelette",
  "pomme", "poire", "banane", "orange", "fraise", "cerise", "raisin", "pêche",
  "melon", "pastèque", "ananas", "citron", "tomate", "carotte", "salade",
  "haricot", "courgette", "poireau", "navet", "radis", "oignon", "champignon",
  "soupe", "purée", "frites", "pâtes", "pizza", "sandwich", "omelette",
  // Véhicules / lieux
  "train", "voiture", "camion", "bus", "vélo", "moto", "avion", "bateau",
  "fusée", "tracteur", "ambulance", "pompier", "taxi", "métro", "tram",
  "scooter", "trottinette", "hélicoptère", "voilier", "barque", "canoë",
  "route", "chemin", "tunnel", "gare", "port", "portail", "station",
  "parking", "trottoir", "carrefour", "carnaval",
  // Nature
  "soleil", "lune", "étoile", "nuage", "pluie", "neige", "vent", "orage",
  "éclair", "brouillard", "tempête", "montagne", "colline", "vallée",
  "rivière", "fleuve", "lac", "mer", "océan", "plage", "forêt", "bois",
  "désert", "champ", "prairie", "volcan", "grotte", "cascade", "source",
  "île", "falaise", "dune", "arbre", "fleur", "herbe", "feuille", "branche",
  "racine", "tronc", "buisson", "rose", "tulipe", "marguerite", "coquelicot",
  "violette", "sapin", "chêne", "palmier", "cactus", "fougère",
  // Jouets / école
  "ballon", "poupée", "toupie", "bille", "corde", "raquette", "patins",
  "luge", "traîneau", "livre", "cahier", "crayon", "stylo", "gomme", "règle",
  "ciseaux", "colle", "feutre", "pinceau", "peinture", "cartable", "trousse",
  "ardoise", "craie", "tableau", "classeur",
  // Personnages
  "roi", "reine", "prince", "princesse", "chevalier", "dragon", "sorcière",
  "fée", "lutin", "ogre", "géant", "nain", "fantôme", "pirate", "sirène",
  "monstre", "licorne", "robot", "clown", "magicien", "menuisier",
  // Métiers
  "docteur", "infirmier", "policier", "facteur", "boulanger", "boucher",
  "coiffeur", "jardinier", "pêcheur", "fermier", "pilote", "marin",
  "cuisinier", "peintre", "musicien", "danseur", "acteur",
  // Corps
  "tête", "cheveux", "front", "nez", "bouche", "dent", "langue", "oreille",
  "joue", "menton", "cou", "épaule", "bras", "main", "doigt", "coude",
  "poignet", "ventre", "dos", "jambe", "genou", "pied", "talon", "cheville",
  // Vêtements
  "chapeau", "casquette", "bonnet", "écharpe", "gant", "manteau", "veste",
  "pull", "chemise", "pantalon", "short", "jupe", "robe", "chaussure",
  "basket", "botte", "sandale", "chaussette", "pyjama", "maillot", "ceinture",
  "cravate",
  // Musique / couleurs / famille
  "guitare", "piano", "violon", "flûte", "trompette", "tambour", "harpe",
  "accordéon", "rouge", "bleu", "vert", "jaune", "violet", "marron", "beige",
  "turquoise", "papa", "maman", "mamie", "papi", "tonton", "tata", "panier",
  // Divers riches en syllabes
  "parapluie", "parachute", "parfum", "parc", "parole", "bonjour", "bonheur",
  "bonhomme", "montre", "monde", "monsieur", "monument", "moment", "terre",
  "terrain", "terrasse", "terrible", "hamster", "police", "carton", "carreau",
  "marteau", "marché", "marmelade", "volant", "voleur", "voile", "volume",
  "ronde", "ronronner", "verger", "vermicelle", "menu", "mensonge", "raton",
  "rateau", "salir", "filet", "fille", "film", "minute", "mince", "minou",
  "village", "villa", "tondeuse", "poussin", "poubelle", "pouce", "couronne",
  "cousin", "couvert", "roue", "roulette", "mousse", "moufle", "moulin",
  "pinceau", "pincée", "canne", "canapé", "cantine", "netteté", "sardine",
  "portrait", "porteur", "sportif", "fil", "profil", "filou", "rat", "rature",
  "ville", "villageois",
];
