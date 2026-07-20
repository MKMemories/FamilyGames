/* ══════════════════════════════════════════════════════════════════════════
   PETIT BAC — dictionnaires PAR catégorie + validation.

   Objectif : n'accepter que des réponses réelles ET en lien avec la catégorie
   (fini les mots bidon « Nouuu », « None », ou les fautes « idiotte »,
   « Inteligent »). Chaque catégorie possède une liste de mots reconnus ;
   une réponse est valable si :
     • elle commence par la bonne lettre, ET
     • elle figure dans le dictionnaire de la catégorie (catégories « fermées »),
       ou — pour les catégories ouvertes (Prénom, Ville, Marque, Personnage) —
       elle ressemble à un vrai nom propre (pas de charabia).

   Tout est local, déterministe et hors-ligne (aucun réseau).
   ══════════════════════════════════════════════════════════════════════════ */

/** minuscule, sans accents, ligatures œ/æ développées, ponctuation légère
    conservée (espace, tiret, apostrophe). */
export function pbNorm(s: string): string {
  return s
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe").replace(/æ/g, "ae")
    .replace(/[^a-z' -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Clé de dédup entre joueurs : normalisée + pluriel simple retiré. */
export function pbDedupKey(s: string): string {
  const n = pbNorm(s);
  if (n.length > 3 && (n.endsWith("s") || n.endsWith("x"))) return n.slice(0, -1);
  return n;
}

/* Catégories « ouvertes » : ensembles infinis de noms propres → on ne peut pas
   tout lister. On valide alors par plausibilité (vrai nom propre, pas charabia)
   en plus de la liste de départ. */
export const PB_OPEN_CATEGORIES = new Set<string>([
  "Prénom", "Pays ou Ville", "Marque", "Personnage",
]);

/* ── Listes par catégorie (généreuses, français, ados/famille) ── */
export const PB_DICT: Record<string, string[]> = {
  "Prénom": [
    "Alice","Adam","Antoine","Amir","Aya","Anna","Basile","Bruno","Bilal","Camille","Chloé","Clara","Célia",
    "David","Diane","Dylan","Emma","Enzo","Eva","Elias","Éric","Fanny","Farid","Fatima","Gabriel","Gaël",
    "Hugo","Hana","Inès","Isaac","Ismaël","Jules","Julie","Jade","Léo","Lucas","Lina","Lola","Marie","Malik",
    "Manon","Mehdi","Nathan","Nadia","Noé","Nour","Oscar","Olivia","Omar","Paul","Rania","Rayan","Rose",
    "Sophie","Sami","Sarah","Selma","Thomas","Tom","Théo","Victor","Valentine",
  ],
  "Animal": [
    "Abeille","Aigle","Âne","Antilope","Alligator","Araignée","Baleine","Belette","Biche","Bison","Buffle",
    "Chat","Chien","Cheval","Chèvre","Chameau","Cobra","Crabe","Crocodile","Dauphin","Daim","Dindon",
    "Écureuil","Éléphant","Escargot","Faucon","Fourmi","Flamant","Girafe","Gorille","Guépard","Grenouille",
    "Hibou","Hérisson","Hippopotame","Hamster","Iguane","Jaguar","Lion","Lapin","Loup","Léopard","Lézard",
    "Mouton","Moustique","Marmotte","Narval","Ours","Otarie","Oie","Panda","Pieuvre","Perroquet","Pingouin",
    "Panthère","Renard","Rat","Requin","Rhinocéros","Serpent","Souris","Sanglier","Singe","Tigre","Tortue",
    "Taureau","Vache","Vipère","Veau",
  ],
  "Pays ou Ville": [
    "Allemagne","Angola","Alger","Amsterdam","Athènes","Belgique","Brésil","Berlin","Barcelone","Bordeaux",
    "Canada","Chine","Caire","Casablanca","Danemark","Dublin","Dakar","Espagne","Égypte","Éthiopie","France",
    "Finlande","Florence","Grèce","Genève","Hongrie","Inde","Irlande","Istanbul","Italie","Japon","Jordanie",
    "Liban","Lyon","Lisbonne","Londres","Maroc","Mexique","Madrid","Marseille","Milan","Norvège","Nice",
    "Nantes","Oslo","Portugal","Paris","Pologne","Prague","Rome","Russie","Roumanie","Rabat","Suisse","Suède",
    "Sénégal","Séville","Tunisie","Turquie","Tokyo","Toulouse","Venise","Vienne","Vietnam",
  ],
  "Métier": [
    "Avocat","Acteur","Agriculteur","Architecte","Boulanger","Boucher","Bijoutier","Charpentier","Coiffeur",
    "Cuisinier","Chauffeur","Chanteur","Comptable","Dentiste","Danseur","Développeur","Électricien","Écrivain",
    "Éboueur","Facteur","Fleuriste","Fermier","Garagiste","Guide","Horloger","Infirmier","Ingénieur",
    "Instituteur","Jardinier","Journaliste","Juge","Libraire","Livreur","Maçon","Médecin","Menuisier",
    "Mécanicien","Notaire","Nourrice","Opticien","Ouvrier","Peintre","Plombier","Pompier","Policier","Pilote",
    "Professeur","Pâtissier","Réalisateur","Serveur","Soldat","Secrétaire","Styliste","Tailleur","Traducteur",
    "Vendeur","Vétérinaire","Violoniste",
  ],
  "Fruit ou Légume": [
    "Abricot","Ananas","Amande","Artichaut","Aubergine","Ail","Avocat","Banane","Betterave","Brocoli","Cerise",
    "Carotte","Citron","Concombre","Champignon","Chou","Courgette","Datte","Endive","Épinard","Échalote",
    "Fraise","Framboise","Figue","Fenouil","Grenade","Groseille","Haricot","Igname","Litchi","Laitue",
    "Lentille","Mangue","Melon","Mûre","Mandarine","Maïs","Navet","Nectarine","Noisette","Noix","Orange",
    "Oignon","Olive","Poire","Pomme","Pêche","Prune","Poireau","Poivron","Pastèque","Radis","Raisin",
    "Rhubarbe","Salade","Tomate","Vanille",
  ],
  "Objet": [
    "Aiguille","Armoire","Assiette","Ampoule","Balai","Ballon","Bougie","Bouteille","Brosse","Chaise","Clé",
    "Ciseaux","Casserole","Crayon","Couteau","Drapeau","Écran","Enveloppe","Éponge","Échelle","Fourchette",
    "Fauteuil","Gomme","Gant","Horloge","Journal","Jouet","Lampe","Livre","Lunettes","Marteau","Miroir",
    "Montre","Nappe","Ordinateur","Oreiller","Parapluie","Peigne","Panier","Pinceau","Radio","Rideau","Règle",
    "Stylo","Sac","Seau","Serviette","Table","Tasse","Téléphone","Tabouret","Valise","Vase","Verre",
  ],
  "Couleur": [
    "Argent","Abricot","Azur","Beige","Blanc","Bleu","Bordeaux","Brun","Bronze","Corail","Cyan","Carmin",
    "Doré","Écru","Émeraude","Ébène","Fuchsia","Grenat","Gris","Indigo","Ivoire","Jaune","Lilas","Lavande",
    "Mauve","Marron","Magenta","Noir","Ocre","Orange","Olive","Or","Pourpre","Prune","Rose","Rouge","Roux",
    "Rubis","Saumon","Sable","Turquoise","Taupe","Vert","Violet","Vermillon",
  ],
  "Sport": [
    "Athlétisme","Aviron","Aïkido","Alpinisme","Badminton","Basket","Boxe","Billard","Cyclisme","Course",
    "Canoë","Danse","Escrime","Équitation","Escalade","Football","Fléchettes","Golf","Gymnastique","Handball",
    "Hockey","Judo","Javelot","Lutte","Marche","Musculation","Natation","Pétanque","Patinage","Plongée",
    "Rugby","Randonnée","Ski","Surf","Squash","Skate","Tennis","Trampoline","Tir","Voile","Volley",
  ],
  "Personnage": [
    "Aladdin","Astérix","Ariel","Batman","Bambi","Cendrillon","Casimir","Dracula","Dora","Elsa","Flash",
    "Gandalf","Goku","Hulk","Jafar","Luigi","Mario","Merlin","Mulan","Naruto","Néo","Nemo","Obélix","Olaf",
    "Pikachu","Pinocchio","Raiponce","Rémi","Sonic","Simba","Shrek","Superman","Spiderman","Tarzan","Tintin",
    "Titi","Vaiana","Voldemort",
  ],
  "Nourriture": [
    "Ananas","Abricot","Amande","Baguette","Beurre","Bonbon","Biscuit","Brioche","Chocolat","Crêpe","Croissant",
    "Confiture","Céréales","Donut","Éclair","Escalope","Frites","Fromage","Flan","Gâteau","Gaufre","Glace",
    "Hamburger","Jambon","Lasagnes","Lait","Miel","Muffin","Nouilles","Omelette","Œuf","Pizza","Pain","Pâtes",
    "Pomme","Purée","Riz","Raviolis","Salade","Soupe","Sandwich","Sushi","Saucisse","Tarte","Tomate","Vermicelle",
  ],
  "Marque": [
    "Adidas","Apple","Audi","Amazon","Bic","Chanel","Coca","Citroën","Dior","Danone","Ferrari","Fiat","Fanta",
    "Gucci","Google","Honda","Hermès","Intel","Ikea","Jaguar","Lego","Lacoste","Mercedes","Microsoft","Nike",
    "Nokia","Nintendo","Nutella","Orange","Oreo","Puma","Peugeot","Pepsi","Renault","Rolex","Reebok","Samsung",
    "Sony","Sega","Toyota","Tesla","Volvo","Volkswagen","Vans",
  ],
  "Élément de la nature": [
    "Air","Arbre","Averse","Brume","Brise","Bourrasque","Cascade","Ciel","Colline","Dune","Désert","Eau",
    "Éclair","Étoile","Étang","Falaise","Feu","Fleuve","Forêt","Fumée","Givre","Glacier","Grotte","Herbe","Île",
    "Iceberg","Jungle","Lac","Lune","Lave","Montagne","Mer","Marée","Nuage","Neige","Océan","Orage","Ouragan",
    "Pluie","Plaine","Prairie","Rivière","Rocher","Rosée","Ruisseau","Soleil","Sable","Source","Tempête","Terre",
    "Tonnerre","Torrent","Vent","Vague","Volcan","Vallée",
  ],
  "Vêtement": [
    "Anorak","Bonnet","Blouson","Botte","Béret","Bermuda","Cravate","Chemise","Chaussure","Chaussette","Chapeau",
    "Ceinture","Débardeur","Doudoune","Écharpe","Foulard","Gant","Gilet","Imperméable","Jean","Jupe","Legging",
    "Maillot","Manteau","Mitaine","Pantalon","Pull","Pyjama","Polo","Robe","Salopette","Sandale","Short",
    "Survêtement","Sweat","Tee-shirt","Tunique","Tablier","Veste","Voile",
  ],
  "Instrument de musique": [
    "Accordéon","Alto","Banjo","Basse","Batterie","Clarinette","Cor","Cornemuse","Cymbales","Djembé","Flûte",
    "Fifre","Guitare","Harpe","Harmonica","Hautbois","Luth","Lyre","Mandoline","Maracas","Orgue","Ocarina",
    "Piano","Percussion","Rebab","Saxophone","Synthétiseur","Sitar","Tambour","Trompette","Trombone","Triangle",
    "Tuba","Violon","Violoncelle","Vielle",
  ],
  "Moyen de transport": [
    "Avion","Ambulance","Bus","Bateau","Barque","Bicyclette","Camion","Caravane","Car","Charrette","Diligence",
    "Draisienne","Ferry","Fusée","Fourgon","Gondole","Hélicoptère","Hydravion","Jet","Locomotive","Limousine",
    "Métro","Moto","Montgolfière","Navire","Navette","Paquebot","Péniche","Pirogue","Planeur","Rollers","Radeau",
    "Scooter","Sous-marin","Skate","Taxi","Train","Tramway","Traîneau","Trottinette","Vélo","Voiture","Voilier",
  ],
  "Partie du corps": [
    "Abdomen","Avant-bras","Aisselle","Bouche","Bras","Cheville","Cou","Cœur","Coude","Cuisse","Cerveau","Doigt",
    "Dos","Dent","Épaule","Estomac","Front","Foie","Fesse","Genou","Gorge","Hanche","Index","Jambe","Joue",
    "Langue","Lèvre","Main","Menton","Mollet","Muscle","Nez","Nuque","Nombril","Ongle","Oreille","Œil","Orteil",
    "Os","Poignet","Pied","Poumon","Peau","Paume","Rein","Rotule","Sourcil","Sang","Talon","Tête","Tibia",
    "Ventre","Veine","Visage",
  ],
  "Boisson": [
    "Anisette","Bière","Bissap","Cidre","Café","Cacao","Champagne","Citronnade","Diabolo","Eau","Expresso",
    "Frappé","Grenadine","Gin","Infusion","Jus","Lait","Limonade","Menthe","Milkshake","Mojito","Nectar",
    "Orangeade","Punch","Sirop","Smoothie","Soda","Thé","Tisane","Vin",
  ],
  "Plat ou spécialité": [
    "Aïoli","Bruschetta","Blanquette","Couscous","Cassoulet","Chili","Curry","Dahl","Empanada","Enchilada",
    "Fondue","Falafel","Gratin","Goulash","Houmous","Hachis","Involtini","Jambalaya","Lasagnes","Moussaka",
    "Nems","Osso-buco","Omelette","Paella","Pizza","Poutine","Ratatouille","Raclette","Risotto","Samoussa",
    "Sushi","Salade","Tajine","Tacos","Taboulé","Tartiflette","Velouté",
  ],
  "Dans la cuisine": [
    "Assiette","Autocuiseur","Balance","Bol","Batteur","Casserole","Couteau","Cuillère","Cocotte","Décapsuleur",
    "Économe","Écumoire","Éplucheur","Évier","Fouet","Four","Fourchette","Frigo","Grille-pain","Gobelet",
    "Hachoir","Îlot","Jatte","Louche","Mixeur","Marmite","Micro-ondes","Nappe","Ouvre-boîte","Passoire","Poêle",
    "Plat","Planche","Râpe","Robot","Rouleau","Saladier","Spatule","Tasse","Théière","Tablier","Verre","Vaisselle",
  ],
  "Dans la salle de bain": [
    "Armoire","Baignoire","Brosse","Bain","Coton","Ciseaux","Crème","Douche","Dentifrice","Éponge","Essuie-main",
    "Flacon","Gant","Gel","Huile","Interrupteur","Jacuzzi","Lavabo","Lotion","Maquillage","Miroir","Mousse",
    "Nécessaire","Ouate","Peigne","Parfum","Pantoufle","Rasoir","Robinet","Rideau","Savon","Serviette",
    "Shampoing","Séchoir","Tapis","Toilette","Vernis",
  ],
  "À l'école": [
    "Ardoise","Agenda","Bureau","Bibliothèque","Cartable","Cahier","Cour","Craie","Classe","Compas","Ciseaux",
    "Colle","Dictionnaire","Devoir","Directeur","Élève","École","Écran","Feutre","Feuille","Gomme","Globe",
    "Horloge","Instituteur","Journal","Leçon","Livre","Maître","Maîtresse","Manuel","Note","Ordinateur",
    "Professeur","Pupitre","Récréation","Règle","Sac","Stylo","Surveillant","Tableau","Trousse","Vacances",
  ],
  "Au zoo": [
    "Autruche","Antilope","Alligator","Âne","Babouin","Buffle","Bison","Crocodile","Chameau","Chimpanzé",
    "Dromadaire","Éléphant","Émeu","Flamant","Fauve","Girafe","Gorille","Guépard","Gnou","Hippopotame","Hyène",
    "Iguane","Jaguar","Lion","Lémurien","Léopard","Lama","Manchot","Nandou","Ours","Otarie","Okapi","Panthère",
    "Perroquet","Phoque","Python","Rhinocéros","Reptile","Serpent","Suricate","Singe","Tigre","Tortue","Toucan",
    "Vautour","Varan",
  ],
  "Ce qui vole": [
    "Abeille","Aigle","Avion","Albatros","Ballon","Bourdon","Buse","Cerf-volant","Corbeau","Colombe","Cigogne",
    "Chauve-souris","Drone","Dirigeable","Épervier","Étourneau","Fusée","Frelon","Faucon","Guêpe","Goéland",
    "Hélicoptère","Hibou","Hirondelle","Insecte","Jet","Libellule","Moineau","Mouche","Moustique","Montgolfière",
    "Mésange","Nuage","Oiseau","Oie","Papillon","Pigeon","Perroquet","Pélican","Planeur","Roquette","Rossignol",
    "Satellite","Sauterelle","Vautour",
  ],
  "Verbe d'action": [
    "Aller","Arriver","Attraper","Appeler","Avancer","Bondir","Boire","Battre","Briller","Courir","Chanter",
    "Crier","Construire","Casser","Danser","Dessiner","Dormir","Écrire","Écouter","Entrer","Escalader","Foncer",
    "Frapper","Fuir","Glisser","Grimper","Grandir","Hurler","Imiter","Jouer","Jeter","Lancer","Lire","Lever",
    "Marcher","Manger","Monter","Nager","Nettoyer","Observer","Ouvrir","Plonger","Pousser","Porter","Peindre",
    "Ramper","Rouler","Rire","Sauter","Sourire","Souffler","Tomber","Tourner","Tirer","Voler","Voir","Venir",
  ],
  "Adjectif (qualité)": [
    "Aimable","Attentif","Adroit","Actif","Ambitieux","Brave","Bon","Beau","Calme","Courageux","Curieux",
    "Créatif","Doux","Discret","Drôle","Dynamique","Élégant","Énergique","Enthousiaste","Fidèle","Fort","Franc",
    "Fiable","Généreux","Gentil","Gai","Habile","Honnête","Humble","Intelligent","Ingénieux","Joyeux","Juste",
    "Loyal","Lucide","Malin","Modeste","Motivé","Noble","Naturel","Optimiste","Ordonné","Ouvert","Patient","Poli",
    "Prudent","Ponctuel","Rapide","Rêveur","Rigoureux","Sage","Sincère","Sympathique","Serviable","Tendre",
    "Tolérant","Travailleur","Vaillant","Vif",
  ],
};

/* Ensembles normalisés (clé dédup) précalculés une fois. */
const CAT_SETS: Record<string, Set<string>> = {};
for (const [cat, words] of Object.entries(PB_DICT)) {
  CAT_SETS[cat] = new Set(words.map(pbDedupKey));
}

/** Le mot (déjà normalisé côté lettre) appartient-il à la catégorie ? */
function inCategory(cat: string, answer: string): boolean {
  const set = CAT_SETS[cat];
  if (!set) return false;
  return set.has(pbDedupKey(answer));
}

/* Détecte un charabia : pas de voyelle, ou 3+ fois la même lettre d'affilée. */
function looksLikeGibberish(n: string): boolean {
  if (n.replace(/[ '-]/g, "").length < 2) return true;
  if (!/[aeiouyœæ]/.test(n)) return true;
  if (/(.)\1\1/.test(n)) return true;
  return false;
}

export type PbStatus = "empty" | "letter" | "unknown" | "ok";

/**
 * Statut d'une réponse pour une catégorie et une lettre données.
 *   empty   → rien saisi
 *   letter  → ne commence pas par la bonne lettre
 *   unknown → bonne lettre mais mot non reconnu / hors catégorie
 *   ok      → valide (compte les points)
 */
export function pbAnswerStatus(category: string, answer: string, letter: string): PbStatus {
  const raw = (answer || "").trim();
  if (!raw) return "empty";

  const target = pbNorm(letter)[0] || "";
  const first = pbNorm(raw)[0] || "";
  if (!target || first !== target) return "letter";

  const n = pbNorm(raw);
  if (n.length < 2) return "unknown";

  if (inCategory(category, raw)) return "ok";

  // Catégories ouvertes : on accepte un nom propre plausible (pas de charabia).
  if ((PB_OPEN_CATEGORIES.has(category) || !CAT_SETS[category]) && !looksLikeGibberish(n)) {
    return "ok";
  }
  return "unknown";
}

/** Réponse de l'ordinateur : un mot valide de la catégorie pour cette lettre. */
export function pbDictAnswer(category: string, letter: string): string {
  const words = PB_DICT[category];
  if (!words) return "";
  const target = pbNorm(letter)[0] || "";
  const matches = words.filter((w) => pbNorm(w)[0] === target);
  if (matches.length === 0) return "";
  return matches[Math.floor(Math.random() * matches.length)];
}
