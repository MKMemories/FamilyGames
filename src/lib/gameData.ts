import type { Game, MemberPreset, GameId, Difficulty, StoredQuizQuestion } from "../types";

/* ── Solo vs Ordinateur ── */
export const AI_ID = "zzz-ai";
export const AI_PLAYER = { id: AI_ID, name: "Ordinateur", color: "#8b93a7", emoji: "🤖" };
export const AI_GAMES = new Set<GameId>(["morpion", "connect4", "chess", "checkers", "bataille", "petitbac", "bombe", "des", "blokus", "grandscrabble", "monopoly", "uno"]);
export function gameSupportsAI(g: GameId): boolean { return AI_GAMES.has(g); }
export const DIFFICULTIES: { id: Difficulty; label: string; emoji: string; desc: string }[] = [
  { id: "facile", label: "Facile", emoji: "🙂", desc: "L'ordinateur joue simplement" },
  { id: "moyen", label: "Moyen", emoji: "😏", desc: "Un adversaire équilibré" },
  { id: "difficile", label: "Difficile", emoji: "😈", desc: "L'ordinateur joue pour gagner" },
];

export const MEMBER_PRESETS: MemberPreset[] = [
  { name: "Mohamed", color: "#ff87b2", emoji: "👨" },
  { name: "Saoussen", color: "#7cc7ff", emoji: "👩" },
  { name: "Sara", color: "#ffbe72", emoji: "👧" },
  { name: "Lilya", color: "#67d9b5", emoji: "🧒" },
];

/* Ordre pensé pour la soirée famille : les grands jeux à 4 d'abord,
   puis les duels à 2, puis l'aventure solo. */
export const GAMES: Game[] = [
  /* ── 🎉 EN FAMILLE (2–4 joueurs et +) ── les pépites en tête ── */
  { id: "uno", name: "UNO KHELIJ", emoji: "🎴", desc: "Assortis couleur ou chiffre, dégaine les cartes spéciales… et crie UNO !", min: 2, max: 4, color: "#ef4444", grad: "#f97316", cat: "famille", star: true },
  { id: "monopoly", name: "Monopoly KHELIJ", emoji: "🏦", desc: "Achète, construis, ruine la famille — le grand plateau immobilier", min: 2, max: 4, color: "#16a34a", grad: "#4ade80", cat: "famille", star: true },
  { id: "grandscrabble", name: "Grand Scrabble", emoji: "🔠", desc: "Le vrai Scrabble : plateau 15×15, cases bonus et mots croisés", min: 2, max: 4, color: "#0f766e", grad: "#2dd4bf", cat: "famille", star: true },
  { id: "dessin", name: "Dessinez, c'est gagné", emoji: "🎨", desc: "Dessine un mot et fais deviner les autres", min: 2, max: 4, color: "#22c55e", grad: "#4ade80", cat: "famille", star: true },
  { id: "quiz", name: "Quiz KHELIJ", emoji: "🧠", desc: "Questions sur la famille, la culture et le monde", min: 2, max: 4, color: "#ec4899", grad: "#f472b6", cat: "famille" },
  { id: "marque", name: "Devine la Marque", emoji: "🏷️", desc: "Des indices se dévoilent peu à peu — reconnais la grande marque !", min: 1, max: 6, color: "#e11d48", grad: "#fb7185", cat: "famille" },
  { id: "petitbac", name: "Petit Bac", emoji: "🅰️", desc: "Une lettre, des catégories — remplis plus vite que les autres", min: 2, max: 4, color: "#0ea5e9", grad: "#38bdf8", cat: "famille" },
  { id: "bombe", name: "Mot Bombe", emoji: "💣", desc: "Trouve un mot avec la syllabe avant que la bombe explose !", min: 2, max: 4, color: "#f97316", grad: "#fbbf24", cat: "famille" },
  { id: "des", name: "Bluff des Dés", emoji: "🎲", desc: "Mise, bluffe et démasque les menteurs", min: 2, max: 4, color: "#a855f7", grad: "#c084fc", cat: "famille" },
  { id: "blokus", name: "Territoires", emoji: "🧩", desc: "Pose tes pièces, bloque les autres, conquiers le plateau", min: 2, max: 4, color: "#0d9488", grad: "#2dd4bf", cat: "famille" },
  { id: "defi", name: "Défis Chrono", emoji: "⏱️", desc: "Mini-défis rigolos — le plus rapide gagne", min: 2, max: 4, color: "#84cc16", grad: "#bef264", cat: "famille" },
  { id: "justeprix", name: "Le Juste Prix", emoji: "💰", desc: "Estime le prix d'un objet — le plus proche gagne !", min: 1, max: 4, color: "#fb923c", grad: "#fbbf24", cat: "famille" },
  { id: "scrabble", name: "Mot pour Mot", emoji: "🔤", desc: "Scrabble familial — forme des mots, marque des points", min: 2, max: 4, color: "#14b8a6", grad: "#2dd4bf", cat: "famille" },
  { id: "imposteur", name: "L'Imposteur", emoji: "🕵️", desc: "Chacun son mot secret — démasque l'intrus par le vote", min: 3, max: 8, color: "#f43f5e", grad: "#fb7185", cat: "famille" },
  { id: "quidenous", name: "Qui de nous… ?", emoji: "🙋", desc: "Vote en secret, révélation hilarante en famille", min: 3, max: 8, color: "#10b981", grad: "#34d399", cat: "famille" },
  /* ── ⚔️ DUEL (2 joueurs) ── */
  { id: "chess", name: "Échecs", emoji: "♟️", desc: "Échecs classique 8×8 — rois, reines, stratégie", min: 2, max: 2, color: "#6366f1", grad: "#818cf8", cat: "duo" },
  { id: "checkers", name: "Dames", emoji: "⬛", desc: "Jeu de dames — captures et dames couronnées", min: 2, max: 2, color: "#f59e0b", grad: "#fbbf24", cat: "duo" },
  { id: "connect4", name: "Puissance 4", emoji: "🔴", desc: "Aligne 4 jetons avant ton adversaire", min: 2, max: 2, color: "#ef4444", grad: "#f87171", cat: "duo" },
  { id: "bataille", name: "Bataille Navale", emoji: "🚢", desc: "Place ta flotte, coule celle de l'adversaire", min: 2, max: 2, color: "#3b82f6", grad: "#60a5fa", cat: "duo" },
  { id: "morpion", name: "Morpion", emoji: "❎", desc: "Aligne 3 symboles avant l'autre joueur", min: 2, max: 2, color: "#8b5cf6", grad: "#a78bfa", cat: "duo" },
  /* ── 🧭 AVENTURE SOLO ── */
  { id: "chronovore", name: "Le Chronovore", emoji: "🔮", desc: "Escape room 3D narrative — échappe-toi d'un instant figé du temps", min: 1, max: 1, color: "#38bdf8", grad: "#7dd3fc", cat: "solo" },
];

/* Rubriques de la ludothèque, dans l'ordre d'affichage. */
export const GAME_SECTIONS: { cat: import("../types").GameCat; label: string; icon: string; hint: string }[] = [
  { cat: "famille", label: "En famille", icon: "🎉", hint: "À 2, 3 ou 4 — le top pour la soirée" },
  { cat: "duo", label: "Duel à deux", icon: "⚔️", hint: "Face à face, ou contre l'ordinateur" },
  { cat: "solo", label: "Aventure solo", icon: "🧭", hint: "Rien que pour toi" },
];

/* ── L'Imposteur : paires de mots (civil / imposteur, proches mais différents) ── */
export const IMPOSTEUR_WORDS: { civil: string; imposter: string }[] = [
  { civil: "Chat", imposter: "Chien" }, { civil: "Plage", imposter: "Piscine" },
  { civil: "Café", imposter: "Thé" }, { civil: "Pizza", imposter: "Quiche" },
  { civil: "Voiture", imposter: "Moto" }, { civil: "Été", imposter: "Hiver" },
  { civil: "Football", imposter: "Rugby" }, { civil: "Pomme", imposter: "Poire" },
  { civil: "Soleil", imposter: "Lune" }, { civil: "Roi", imposter: "Reine" },
  { civil: "Guitare", imposter: "Violon" }, { civil: "Médecin", imposter: "Infirmier" },
  { civil: "Montagne", imposter: "Colline" }, { civil: "Train", imposter: "Métro" },
  { civil: "Chocolat", imposter: "Bonbon" }, { civil: "Livre", imposter: "Magazine" },
  { civil: "Neige", imposter: "Pluie" }, { civil: "Lion", imposter: "Tigre" },
  { civil: "Fraise", imposter: "Framboise" }, { civil: "Avion", imposter: "Hélicoptère" },
  { civil: "Professeur", imposter: "Élève" }, { civil: "Téléphone", imposter: "Tablette" },
  { civil: "Boulanger", imposter: "Pâtissier" }, { civil: "Rivière", imposter: "Lac" },
  { civil: "Sandwich", imposter: "Hamburger" }, { civil: "Château", imposter: "Palais" },
  { civil: "Vélo", imposter: "Trottinette" }, { civil: "Miel", imposter: "Confiture" },
  { civil: "Éléphant", imposter: "Rhinocéros" }, { civil: "Noël", imposter: "Anniversaire" },
  { civil: "Piano", imposter: "Orgue" }, { civil: "Tomate", imposter: "Poivron" },
  { civil: "Requin", imposter: "Baleine" }, { civil: "Désert", imposter: "Savane" },
  { civil: "Cinéma", imposter: "Théâtre" }, { civil: "Crayon", imposter: "Stylo" },
  { civil: "Gâteau", imposter: "Tarte" }, { civil: "Abeille", imposter: "Guêpe" },
  { civil: "Papillon", imposter: "Libellule" }, { civil: "Fenêtre", imposter: "Porte" },
  { civil: "Bateau", imposter: "Sous-marin" }, { civil: "Casquette", imposter: "Chapeau" },
  { civil: "Basket", imposter: "Sandale" }, { civil: "Écharpe", imposter: "Gant" },
  { civil: "Ballon", imposter: "Bulle" }, { civil: "Docteur", imposter: "Dentiste" },
  { civil: "Pompier", imposter: "Policier" }, { civil: "Cuisinier", imposter: "Serveur" },
  { civil: "Girafe", imposter: "Zèbre" }, { civil: "Kangourou", imposter: "Koala" },
  { civil: "Perroquet", imposter: "Toucan" }, { civil: "Grenouille", imposter: "Crapaud" },
  { civil: "Dauphin", imposter: "Phoque" }, { civil: "Fourmi", imposter: "Termite" },
  { civil: "Orange", imposter: "Mandarine" }, { civil: "Pastèque", imposter: "Melon" },
  { civil: "Carotte", imposter: "Radis" }, { civil: "Champignon", imposter: "Truffe" },
  { civil: "Riz", imposter: "Pâtes" }, { civil: "Soupe", imposter: "Purée" },
  { civil: "Glace", imposter: "Sorbet" }, { civil: "Croissant", imposter: "Brioche" },
  { civil: "Lunettes", imposter: "Loupe" }, { civil: "Montre", imposter: "Réveil" },
  { civil: "Ordinateur", imposter: "Console" }, { civil: "Robot", imposter: "Drone" },
  { civil: "Fusée", imposter: "Navette" }, { civil: "Étoile", imposter: "Planète" },
  { civil: "Forêt", imposter: "Jungle" }, { civil: "Île", imposter: "Presqu'île" },
  { civil: "Volcan", imposter: "Geyser" }, { civil: "Tempête", imposter: "Ouragan" },
  { civil: "Roi", imposter: "Prince" }, { civil: "Sorcier", imposter: "Magicien" },
  { civil: "Pirate", imposter: "Corsaire" }, { civil: "Chevalier", imposter: "Soldat" },
  { civil: "Dragon", imposter: "Dinosaure" }, { civil: "Fantôme", imposter: "Zombie" },
  { civil: "Trompette", imposter: "Saxophone" }, { civil: "Tambour", imposter: "Batterie" },
  { civil: "Peintre", imposter: "Sculpteur" }, { civil: "Danseur", imposter: "Acrobate" },
  { civil: "Pull", imposter: "Gilet" }, { civil: "Jupe", imposter: "Robe" },
  { civil: "Pont", imposter: "Tunnel" }, { civil: "Escalier", imposter: "Ascenseur" },
  { civil: "Parapluie", imposter: "Ombrelle" }, { civil: "Bougie", imposter: "Lampe" },
  { civil: "Miroir", imposter: "Vitre" }, { civil: "Coussin", imposter: "Oreiller" },
];

/* ── Qui de nous… ? : questions rigolotes (familiales) ── */
export const QUIDENOUS_QUESTIONS: string[] = [
  "Qui est le plus susceptible d'oublier son propre anniversaire ?",
  "Qui piquerait le dernier morceau de gâteau ?",
  "Qui rirait à un moment inapproprié ?",
  "Qui deviendrait célèbre sur les réseaux sociaux ?",
  "Qui se perdrait dans sa propre ville ?",
  "Qui parlerait à un inconnu pendant des heures ?",
  "Qui oublierait où il a garé la voiture ?",
  "Qui mangerait des pâtes au petit-déjeuner ?",
  "Qui dormirait jusqu'à midi le week-end ?",
  "Qui gagnerait un concours de grimaces ?",
  "Qui chanterait sous la douche le plus fort ?",
  "Qui serait le meilleur dans une émission de cuisine ?",
  "Qui raconterait la même histoire trois fois ?",
  "Qui survivrait le plus longtemps sur une île déserte ?",
  "Qui pleurerait devant un dessin animé ?",
  "Qui aurait le plus de mal à garder un secret ?",
  "Qui deviendrait le prochain président ?",
  "Qui adopterait dix animaux ?",
  "Qui danserait toute la nuit à une fête ?",
  "Qui oublierait son téléphone à la maison ?",
  "Qui serait en retard à son propre mariage ?",
  "Qui dépenserait tout son argent en bonbons ?",
  "Qui deviendrait un grand explorateur ?",
  "Qui gagnerait à un jeu télévisé ?",
  "Qui serait le plus courageux face à une araignée ?",
  "Qui deviendrait un chef étoilé ?",
  "Qui rangerait sa chambre en dernier ?",
  "Qui ferait le tour du monde en solo ?",
  "Qui inventerait un mot qui n'existe pas ?",
  "Qui serait la star d'un karaoké ?",
  "Qui mangerait une pizza entière tout seul ?",
  "Qui donnerait un surnom rigolo à tout le monde ?",
  "Qui deviendrait millionnaire en premier ?",
  "Qui craquerait pour un chiot dans la rue ?",
  "Qui serait le plus bavard en voyage ?",
  "Qui ferait le plus de blagues nulles ?",
  "Qui oublierait le prénom de quelqu'un juste après lui avoir dit bonjour ?",
  "Qui garderait son calme dans une maison hantée ?",
  "Qui deviendrait le meilleur influenceur voyage ?",
  "Qui passerait le plus de temps à choisir un film à regarder ?",
  "Qui parlerait à son animal comme à un humain ?",
  "Qui gagnerait un concours de mangeur de gâteaux ?",
  "Qui serait incapable de garder une plante en vie ?",
  "Qui deviendrait un super-héros pour de vrai ?",
  "Qui rirait tout seul en repensant à un souvenir gênant ?",
  "Qui prendrait 100 photos du même coucher de soleil ?",
  "Qui serait le plus doué pour raconter des histoires le soir ?",
  "Qui perdrait tout de suite au jeu du silence ?",
  "Qui deviendrait champion du monde de sieste ?",
  "Qui commanderait toujours le même plat au restaurant ?",
  "Qui aurait le plus de mal à se lever le matin ?",
  "Qui deviendrait un grand inventeur farfelu ?",
  "Qui chanterait faux sans jamais s'en rendre compte ?",
  "Qui serait le plus fort à un jeu vidéo ?",
  "Qui garderait un bonbon dans sa poche pendant une semaine ?",
  "Qui deviendrait dresseur d'animaux ?",
  "Qui pleurerait de rire pour un rien ?",
  "Qui serait le meilleur guide dans un labyrinthe ?",
  "Qui oublierait de répondre à un message pendant trois jours ?",
  "Qui deviendrait astronaute ?",
  "Qui danserait même sans musique ?",
  "Qui aurait la plus grande collection d'objets inutiles ?",
  "Qui trouverait toujours une excuse pour ne pas faire la vaisselle ?",
  "Qui deviendrait détective ?",
  "Qui parlerait pendant tout un film ?",
  "Qui serait le plus rapide pour se préparer le matin ?",
  "Qui adopterait un animal exotique ?",
  "Qui gagnerait un concours de blagues ?",
  "Qui se ferait avoir par un poisson d'avril chaque année ?",
  "Qui deviendrait maître dans l'art de faire des câlins ?",
  "Qui construirait la plus grande cabane ?",
  "Qui aurait le plus peur sur un grand huit ?",
  "Qui serait le champion des grimaces ?",
  "Qui deviendrait le prochain grand cuisinier de la famille ?",
  "Qui oublierait ses clés le plus souvent ?",
  "Qui apprendrait à jongler en premier ?",
  "Qui deviendrait un grand chanteur de karaoké international ?",
  "Qui resterait éveillé le plus longtemps à une soirée pyjama ?",
];

export const LETTERS_FR: Record<string, number> = {
  A:9,B:2,C:2,D:3,E:15,F:2,G:2,H:2,I:8,J:1,K:1,L:5,M:3,N:6,O:6,P:2,Q:1,R:6,S:6,T:6,U:6,V:2,W:1,X:1,Y:1,Z:1
};

export const LETTER_VALS: Record<string, number> = {
  A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:10,L:1,M:2,N:1,O:1,P:3,Q:8,R:1,S:1,T:1,U:1,V:4,W:10,X:10,Y:10,Z:10
};

export function buildBag(): string[] {
  const bag: string[] = [];
  Object.entries(LETTERS_FR).forEach(([l, n]) => {
    for (let i = 0; i < n; i++) bag.push(l);
  });
  return bag.sort(() => Math.random() - 0.5);
}

export const CHESS_INIT: string[][] = [
  ["r","n","b","q","k","b","n","r"],
  ["p","p","p","p","p","p","p","p"],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["P","P","P","P","P","P","P","P"],
  ["R","N","B","Q","K","B","N","R"],
];

export const CHESS_UNICODE: Record<string, string> = {
  k:"♚",q:"♛",r:"♜",b:"♝",n:"♞",p:"♟",
  K:"♔",Q:"♕",R:"♖",B:"♗",N:"♘",P:"♙"
};

export function initCheckersBoard(): number[][] {
  const b: number[][] = Array(8).fill(null).map(() => Array(8).fill(0));
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 8; c++)
      if ((r + c) % 2 === 1) b[r][c] = 2;
  for (let r = 5; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if ((r + c) % 2 === 1) b[r][c] = 1;
  return b;
}

export const QUIZ_QUESTIONS = [
  { q: "Quel est le prénom du père de la famille KHELIJ ?", opts: ["Mohamed","Hassan","Karim","Youssef"], a: 0, cat: "Famille 👨‍👩‍👧‍👧" },
  { q: "Combien d'enfants ont Mohamed et Saoussen ?", opts: ["1","2","3","4"], a: 1, cat: "Famille 👨‍👩‍👧‍👧" },
  { q: "Quel pays a remporté la Coupe du Monde 2022 ?", opts: ["France","Brésil","Argentine","Allemagne"], a: 2, cat: "Sport ⚽" },
  { q: "Qui est le premier homme à avoir marché sur la Lune ?", opts: ["Buzz Aldrin","Yuri Gagarin","Neil Armstrong","John Glenn"], a: 2, cat: "Histoire 🌍" },
  { q: "Quelle est la capitale de la Grèce ?", opts: ["Istanbul","Athènes","Rome","Madrid"], a: 1, cat: "Géographie 🗺️" },
  { q: "Combien font 7 × 8 ?", opts: ["48","54","56","64"], a: 2, cat: "Maths 🔢" },
  { q: "Quel est l'animal terrestre le plus rapide ?", opts: ["Lion","Guépard","Cheval","Léopard"], a: 1, cat: "Nature 🌿" },
  { q: "Quelle est la couleur du ciel par temps clair ?", opts: ["Vert","Rouge","Bleu","Violet"], a: 2, cat: "Facile 😄" },
  { q: "Dans quel pays se trouve la Tour Eiffel ?", opts: ["Italie","Espagne","Allemagne","France"], a: 3, cat: "Culture 🗼" },
  { q: "Combien de cases un échiquier a-t-il ?", opts: ["32","48","64","72"], a: 2, cat: "Jeux 🎲" },
  { q: "Quelle île grecque est connue pour ses maisons bleues et blanches ?", opts: ["Crète","Mykonos","Santorin","Rhodes"], a: 2, cat: "Voyages ✈️" },
  { q: "Quel est le plus grand océan du monde ?", opts: ["Atlantique","Indien","Arctique","Pacifique"], a: 3, cat: "Géographie 🗺️" },
  { q: "Qui a peint la Joconde ?", opts: ["Michel-Ange","Raphaël","Léonard de Vinci","Picasso"], a: 2, cat: "Art 🎨" },
  { q: "Combien de planètes dans notre système solaire ?", opts: ["7","8","9","10"], a: 1, cat: "Sciences 🔭" },
  { q: "Quelle est la langue la plus parlée au monde ?", opts: ["Anglais","Hindi","Mandarin","Espagnol"], a: 2, cat: "Monde 🌏" },
  { q: "Le Maroc est en quel continent ?", opts: ["Asie","Europe","Amérique","Afrique"], a: 3, cat: "Géographie 🗺️" },
  { q: "Quel sport se joue avec un volant ?", opts: ["Tennis","Badminton","Squash","Ping-pong"], a: 1, cat: "Sport ⚽" },
  { q: "Combien de doigts sur deux mains ?", opts: ["8","9","10","12"], a: 2, cat: "Facile 😄" },
  { q: "Quelle est la couleur du soleil ?", opts: ["Blanc","Orange","Jaune","Rouge"], a: 2, cat: "Sciences 🔭" },
  { q: "Qui a écrit Harry Potter ?", opts: ["Tolkien","J.K. Rowling","Roald Dahl","C.S. Lewis"], a: 1, cat: "Culture 🎭" },
];

/* ── Grande banque de questions Quiz KHELIJ (français, familial) ──
   Catégories avec emoji → illustrations visuelles dans le jeu.               */
export const QUIZ_BANK: StoredQuizQuestion[] = [
  // Géographie 🗺️
  { question:"Quelle est la capitale de l'Italie ?", answer:"Rome", badAnswers:["Milan","Venise","Naples"], category:"Géographie 🗺️" },
  { question:"Quelle est la capitale de l'Espagne ?", answer:"Madrid", badAnswers:["Barcelone","Séville","Valence"], category:"Géographie 🗺️" },
  { question:"Quelle est la capitale du Japon ?", answer:"Tokyo", badAnswers:["Kyoto","Osaka","Séoul"], category:"Géographie 🗺️" },
  { question:"Quel est le plus grand pays du monde ?", answer:"La Russie", badAnswers:["Le Canada","La Chine","Les États-Unis"], category:"Géographie 🗺️" },
  { question:"Sur quel continent se trouve le désert du Sahara ?", answer:"L'Afrique", badAnswers:["L'Asie","L'Australie","L'Amérique"], category:"Géographie 🗺️" },
  { question:"Quelle est la capitale de l'Allemagne ?", answer:"Berlin", badAnswers:["Munich","Francfort","Hambourg"], category:"Géographie 🗺️" },
  { question:"Quel est le plus grand océan du monde ?", answer:"Le Pacifique", badAnswers:["L'Atlantique","L'Indien","L'Arctique"], category:"Géographie 🗺️" },
  { question:"Quel pays a la forme d'une botte ?", answer:"L'Italie", badAnswers:["La Grèce","L'Espagne","La Croatie"], category:"Géographie 🗺️" },
  { question:"Quelle est la capitale de la Belgique ?", answer:"Bruxelles", badAnswers:["Anvers","Liège","Gand"], category:"Géographie 🗺️" },
  { question:"Quelle est la plus haute montagne du monde ?", answer:"L'Everest", badAnswers:["Le Mont Blanc","Le Kilimandjaro","Le K2"], category:"Géographie 🗺️" },
  // Espace 🚀 / Sciences 🔭
  { question:"Quelle est la planète la plus proche du Soleil ?", answer:"Mercure", badAnswers:["Vénus","Mars","La Terre"], category:"Espace 🚀" },
  { question:"Quelle planète est surnommée « la planète rouge » ?", answer:"Mars", badAnswers:["Jupiter","Vénus","Saturne"], category:"Espace 🚀" },
  { question:"Combien de planètes compte le système solaire ?", answer:"8", badAnswers:["7","9","10"], category:"Espace 🚀" },
  { question:"Quelle est la plus grande planète du système solaire ?", answer:"Jupiter", badAnswers:["Saturne","La Terre","Neptune"], category:"Espace 🚀" },
  { question:"Quelle étoile est la plus proche de la Terre ?", answer:"Le Soleil", badAnswers:["Sirius","L'étoile Polaire","Alpha du Centaure"], category:"Espace 🚀" },
  { question:"Quel gaz respirons-nous pour vivre ?", answer:"L'oxygène", badAnswers:["L'azote","L'hydrogène","Le carbone"], category:"Sciences 🔭" },
  { question:"Quelle est la formule chimique de l'eau ?", answer:"H₂O", badAnswers:["CO₂","O₂","H₂O₂"], category:"Sciences 🔭" },
  { question:"Qu'est-ce qui va le plus vite ?", answer:"La lumière", badAnswers:["Le son","Le vent","Un avion"], category:"Sciences 🔭" },
  // Histoire 📜
  { question:"Qui fut le premier homme à marcher sur la Lune ?", answer:"Neil Armstrong", badAnswers:["Buzz Aldrin","Youri Gagarine","Thomas Pesquet"], category:"Histoire 📜" },
  { question:"Qui a peint la Joconde ?", answer:"Léonard de Vinci", badAnswers:["Picasso","Michel-Ange","Van Gogh"], category:"Histoire 📜" },
  { question:"En quelle année a eu lieu la Révolution française ?", answer:"1789", badAnswers:["1815","1492","1914"], category:"Histoire 📜" },
  { question:"Qui était Napoléon Bonaparte ?", answer:"Un empereur", badAnswers:["Un roi","Un peintre","Un explorateur"], category:"Histoire 📜" },
  { question:"Quel monument les pharaons ont-ils fait construire ?", answer:"Les pyramides", badAnswers:["Le Colisée","La Tour Eiffel","Le Parthénon"], category:"Histoire 📜" },
  // Sport ⚽
  { question:"Quel pays a gagné la Coupe du Monde de foot 2018 ?", answer:"La France", badAnswers:["La Croatie","Le Brésil","L'Allemagne"], category:"Sport ⚽" },
  { question:"Combien de joueurs par équipe sur un terrain de foot ?", answer:"11", badAnswers:["9","10","12"], category:"Sport ⚽" },
  { question:"Quel sport se joue avec un panier et un ballon orange ?", answer:"Le basket", badAnswers:["Le volley","Le hand","Le rugby"], category:"Sport ⚽" },
  { question:"Tous les combien ont lieu les Jeux Olympiques d'été ?", answer:"4 ans", badAnswers:["2 ans","3 ans","5 ans"], category:"Sport ⚽" },
  { question:"Quel sport pratique Rafael Nadal ?", answer:"Le tennis", badAnswers:["Le golf","Le football","La boxe"], category:"Sport ⚽" },
  // Animaux 🐾 / Nature 🌿
  { question:"Quel est l'animal terrestre le plus rapide ?", answer:"Le guépard", badAnswers:["Le lion","Le cheval","Le léopard"], category:"Animaux 🐾" },
  { question:"Quel est le plus grand animal du monde ?", answer:"La baleine bleue", badAnswers:["L'éléphant","La girafe","Le requin"], category:"Animaux 🐾" },
  { question:"Combien de pattes a une araignée ?", answer:"8", badAnswers:["6","4","10"], category:"Animaux 🐾" },
  { question:"Quel insecte produit le miel ?", answer:"L'abeille", badAnswers:["La guêpe","La fourmi","Le papillon"], category:"Animaux 🐾" },
  { question:"Quel animal est surnommé « le roi des animaux » ?", answer:"Le lion", badAnswers:["Le tigre","L'éléphant","L'aigle"], category:"Animaux 🐾" },
  { question:"Quel est le plus grand oiseau du monde ?", answer:"L'autruche", badAnswers:["L'aigle","Le manchot","Le condor"], category:"Animaux 🐾" },
  { question:"Combien de bosses a un dromadaire ?", answer:"1", badAnswers:["2","3","0"], category:"Animaux 🐾" },
  { question:"Quel animal peut changer de couleur ?", answer:"Le caméléon", badAnswers:["La grenouille","Le serpent","Le lézard"], category:"Animaux 🐾" },
  { question:"De quoi se nourrit principalement le panda ?", answer:"De bambou", badAnswers:["De poisson","De viande","D'herbe"], category:"Animaux 🐾" },
  { question:"Combien de pattes a un insecte ?", answer:"6", badAnswers:["4","8","2"], category:"Nature 🌿" },
  // Corps humain 🫀
  { question:"Quel organe pompe le sang dans le corps ?", answer:"Le cœur", badAnswers:["Le foie","Les poumons","L'estomac"], category:"Corps humain 🫀" },
  { question:"Combien de dents a un adulte ?", answer:"32", badAnswers:["28","30","24"], category:"Corps humain 🫀" },
  { question:"Combien d'os compte le corps humain adulte ?", answer:"206", badAnswers:["150","300","100"], category:"Corps humain 🫀" },
  // Maths 🔢
  { question:"Combien font 7 × 8 ?", answer:"56", badAnswers:["48","54","64"], category:"Maths 🔢" },
  { question:"Combien de côtés a un triangle ?", answer:"3", badAnswers:["4","5","6"], category:"Maths 🔢" },
  { question:"Combien font 12 + 15 ?", answer:"27", badAnswers:["25","28","26"], category:"Maths 🔢" },
  { question:"Combien de minutes dans une heure ?", answer:"60", badAnswers:["30","100","24"], category:"Maths 🔢" },
  { question:"Combien de côtés a un hexagone ?", answer:"6", badAnswers:["5","7","8"], category:"Maths 🔢" },
  // Art 🎨 / Musique 🎵 / Cinéma 🎬
  { question:"Combien de cordes a une guitare classique ?", answer:"6", badAnswers:["4","5","8"], category:"Musique 🎵" },
  { question:"Qui a écrit les romans Harry Potter ?", answer:"J.K. Rowling", badAnswers:["Tolkien","Roald Dahl","C.S. Lewis"], category:"Art 🎨" },
  { question:"Quel instrument a des touches noires et blanches ?", answer:"Le piano", badAnswers:["Le violon","La flûte","La guitare"], category:"Musique 🎵" },
  { question:"Quel personnage a un nez qui grandit quand il ment ?", answer:"Pinocchio", badAnswers:["Aladdin","Peter Pan","Bambi"], category:"Cinéma 🎬" },
  { question:"Quelle couleur obtient-on en mélangeant le bleu et le jaune ?", answer:"Le vert", badAnswers:["L'orange","Le violet","Le marron"], category:"Art 🎨" },
  { question:"Combien y a-t-il de notes de musique de base ?", answer:"7", badAnswers:["5","8","12"], category:"Musique 🎵" },
  // France 🇫🇷 / Culture 🌍 / Facile 😄
  { question:"Quel fleuve traverse Paris ?", answer:"La Seine", badAnswers:["La Loire","Le Rhône","La Garonne"], category:"France 🇫🇷" },
  { question:"Quelle monnaie utilise-t-on en France ?", answer:"L'euro", badAnswers:["Le franc","Le dollar","La livre"], category:"France 🇫🇷" },
  { question:"Quelles sont les couleurs du drapeau français ?", answer:"Bleu, blanc, rouge", badAnswers:["Rouge, blanc, vert","Bleu, blanc, jaune","Vert, blanc, rouge"], category:"France 🇫🇷" },
  { question:"Quelle est la couleur du ciel par beau temps ?", answer:"Bleu", badAnswers:["Vert","Rouge","Violet"], category:"Facile 😄" },
  { question:"Combien de jours compte une semaine ?", answer:"7", badAnswers:["5","6","8"], category:"Facile 😄" },
  { question:"Combien de mois compte une année ?", answer:"12", badAnswers:["10","11","13"], category:"Facile 😄" },
  { question:"Combien de doigts a-t-on à deux mains ?", answer:"10", badAnswers:["8","9","12"], category:"Facile 😄" },
  { question:"Quel jour vient juste après mardi ?", answer:"Mercredi", badAnswers:["Lundi","Jeudi","Vendredi"], category:"Facile 😄" },
  { question:"À quelle saison les feuilles tombent-elles ?", answer:"L'automne", badAnswers:["L'été","L'hiver","Le printemps"], category:"Facile 😄" },
  { question:"Combien de saisons y a-t-il dans une année ?", answer:"4", badAnswers:["2","3","5"], category:"Facile 😄" },
  { question:"Quel animal fait « meuh » ?", answer:"La vache", badAnswers:["Le mouton","Le cheval","La chèvre"], category:"Facile 😄" },
  // Cuisine 🍳
  { question:"Quel est l'ingrédient principal du pain ?", answer:"La farine", badAnswers:["Le riz","Le sucre","Le sel"], category:"Cuisine 🍳" },
  { question:"Quel fromage est plein de trous ?", answer:"L'emmental", badAnswers:["Le camembert","Le brie","Le roquefort"], category:"Cuisine 🍳" },
  { question:"Quel fruit est jaune et courbé ?", answer:"La banane", badAnswers:["La pomme","La poire","L'orange"], category:"Cuisine 🍳" },
  { question:"Avec quel fruit fabrique-t-on le vin ?", answer:"Le raisin", badAnswers:["La pomme","Le blé","L'orge"], category:"Cuisine 🍳" },
  { question:"Le chocolat est fabriqué à partir de quelles fèves ?", answer:"Les fèves de cacao", badAnswers:["Les fèves de café","Les fèves de soja","Les haricots"], category:"Cuisine 🍳" },
  // ── Enrichissement (questions originales, familiales) ──
  { question:"Quelle est la capitale du Portugal ?", answer:"Lisbonne", badAnswers:["Porto","Madrid","Séville"], category:"Géographie 🗺️" },
  { question:"Quel pays est traversé par le Nil ?", answer:"L'Égypte", badAnswers:["Le Maroc","La Grèce","L'Inde"], category:"Géographie 🗺️" },
  { question:"Quelle est la mer entre la France et l'Algérie ?", answer:"La Méditerranée", badAnswers:["La mer du Nord","La Baltique","La mer Rouge"], category:"Géographie 🗺️" },
  { question:"Quel est le plus petit pays du monde ?", answer:"Le Vatican", badAnswers:["Monaco","Malte","Andorre"], category:"Géographie 🗺️" },
  { question:"Sur quel continent se trouve l'Australie ?", answer:"L'Océanie", badAnswers:["L'Asie","L'Afrique","L'Amérique"], category:"Géographie 🗺️" },
  { question:"Combien de lunes possède la Terre ?", answer:"1", badAnswers:["2","0","3"], category:"Espace 🚀" },
  { question:"Quelle planète a de magnifiques anneaux ?", answer:"Saturne", badAnswers:["Mars","Vénus","Mercure"], category:"Espace 🚀" },
  { question:"Comment s'appelle notre galaxie ?", answer:"La Voie lactée", badAnswers:["Andromède","La Grande Ourse","Orion"], category:"Espace 🚀" },
  { question:"Quel animal est le meilleur ami de l'homme ?", answer:"Le chien", badAnswers:["Le chat","Le cheval","Le lapin"], category:"Animaux 🐾" },
  { question:"Combien de cœurs possède une pieuvre ?", answer:"3", badAnswers:["1","2","4"], category:"Animaux 🐾" },
  { question:"Quel animal dort debout ?", answer:"Le cheval", badAnswers:["Le chien","Le chat","La poule"], category:"Animaux 🐾" },
  { question:"Quel est le petit de la vache ?", answer:"Le veau", badAnswers:["L'agneau","Le poulain","Le chevreau"], category:"Animaux 🐾" },
  { question:"Combien de couleurs y a-t-il dans un arc-en-ciel ?", answer:"7", badAnswers:["5","6","8"], category:"Nature 🌿" },
  { question:"Quel organe utilise-t-on pour sentir les odeurs ?", answer:"Le nez", badAnswers:["La langue","L'oreille","L'œil"], category:"Corps humain 🫀" },
  { question:"Combien de poumons a un être humain ?", answer:"2", badAnswers:["1","3","4"], category:"Corps humain 🫀" },
  { question:"Combien font 9 × 9 ?", answer:"81", badAnswers:["72","91","99"], category:"Maths 🔢" },
  { question:"Combien font 100 ÷ 4 ?", answer:"25", badAnswers:["20","24","40"], category:"Maths 🔢" },
  { question:"Combien de secondes dans une minute ?", answer:"60", badAnswers:["100","30","90"], category:"Maths 🔢" },
  { question:"Combien de côtés a un carré ?", answer:"4", badAnswers:["3","5","6"], category:"Maths 🔢" },
  { question:"Quel sport se pratique sur un tatami ?", answer:"Le judo", badAnswers:["Le tennis","Le golf","La natation"], category:"Sport ⚽" },
  { question:"Dans quel sport marque-t-on des « paniers » ?", answer:"Le basket", badAnswers:["Le foot","Le rugby","Le hand"], category:"Sport ⚽" },
  { question:"Combien de joueurs dans une équipe de basket sur le terrain ?", answer:"5", badAnswers:["6","7","11"], category:"Sport ⚽" },
  { question:"Quel instrument a 88 touches ?", answer:"Le piano", badAnswers:["La guitare","L'accordéon","L'orgue"], category:"Musique 🎵" },
  { question:"Combien de musiciens dans un duo ?", answer:"2", badAnswers:["3","4","1"], category:"Musique 🎵" },
  { question:"De quelle couleur est une émeraude ?", answer:"Verte", badAnswers:["Rouge","Bleue","Jaune"], category:"Art 🎨" },
  { question:"Quelles couleurs donnent de l'orange ?", answer:"Rouge et jaune", badAnswers:["Bleu et jaune","Rouge et bleu","Vert et rouge"], category:"Art 🎨" },
  { question:"Combien de jours en février une année bissextile ?", answer:"29", badAnswers:["28","30","31"], category:"Facile 😄" },
  { question:"Quel est le premier mois de l'année ?", answer:"Janvier", badAnswers:["Février","Décembre","Mars"], category:"Facile 😄" },
  { question:"Combien de roues a un vélo ?", answer:"2", badAnswers:["1","3","4"], category:"Facile 😄" },
  { question:"Quel animal fait « cocorico » ?", answer:"Le coq", badAnswers:["La poule","Le canard","L'oie"], category:"Facile 😄" },
  { question:"Quelle boisson chaude est faite à partir de feuilles ?", answer:"Le thé", badAnswers:["Le lait","Le jus","L'eau"], category:"Cuisine 🍳" },
  { question:"Avec quoi fait-on de la confiture ?", answer:"Des fruits", badAnswers:["Des légumes","De la viande","Du poisson"], category:"Cuisine 🍳" },
  { question:"Quel légume fait pleurer quand on le coupe ?", answer:"L'oignon", badAnswers:["La carotte","La tomate","Le poireau"], category:"Cuisine 🍳" },
  { question:"Quel pays a inventé la pizza ?", answer:"L'Italie", badAnswers:["La France","L'Espagne","La Grèce"], category:"Culture 🌍" },
  { question:"Dans quelle ville se trouve la Statue de la Liberté ?", answer:"New York", badAnswers:["Londres","Paris","Rome"], category:"Culture 🌍" },
  { question:"Quel est l'astre qui éclaire la nuit ?", answer:"La Lune", badAnswers:["Le Soleil","Une comète","Mars"], category:"Sciences 🔭" },
];

export interface DefiItem { id: string; emoji: string; text: string; type: "group" | "solo" | "duo"; timer: number; }
export const DEFIS: DefiItem[] = [
  { id:"tongue", emoji:"👅", text:"Dis 3 fois vite : « Les chaussettes de l'archiduchesse sont-elles sèches ? »", type:"solo", timer:15 },
  { id:"count", emoji:"🔢", text:"Comptez ensemble de 1 à 30, chacun un chiffre à tour de rôle, sans se tromper", type:"group", timer:25 },
  { id:"animal", emoji:"🐒", text:"Imite un animal sans parler — les autres devinent", type:"solo", timer:20 },
  { id:"hum", emoji:"🎵", text:"Fredonne une chanson sans les paroles — les autres devinent", type:"solo", timer:25 },
  { id:"letterB", emoji:"🅱️", text:"Chacun dit un mot commençant par B, sans répéter, à tour de rôle", type:"group", timer:30 },
  { id:"describe", emoji:"🔍", text:"Décris un objet de la pièce sans le nommer — les autres devinent", type:"solo", timer:25 },
  { id:"handshake", emoji:"🤝", text:"Inventez une poignée de main secrète à deux en 30 secondes", type:"duo", timer:30 },
  { id:"portrait", emoji:"🖐️", text:"Dessine un portrait dans l'air avec ton doigt — les autres devinent qui", type:"solo", timer:20 },
  { id:"backwards", emoji:"🔤", text:"Épelle ton prénom à l'envers", type:"solo", timer:15 },
  { id:"mirror", emoji:"🪞", text:"Faites le miroir : imitez exactement les gestes de l'autre", type:"duo", timer:25 },
  { id:"whisper", emoji:"🤫", text:"Passe le message : chuchote une phrase, elle doit arriver intacte", type:"group", timer:30 },
  { id:"minute", emoji:"⏱️", text:"Sans regarder, lève la main quand tu penses qu'une minute s'est écoulée", type:"group", timer:60 },
  { id:"nolaugh", emoji:"😐", text:"Regarde quelqu'un dans les yeux sans rire ni sourire", type:"duo", timer:20 },
  { id:"balance", emoji:"🦩", text:"Tiens en équilibre sur un pied, les yeux fermés", type:"solo", timer:20 },
  { id:"capitals", emoji:"🏙️", text:"Citez à tour de rôle une capitale de pays, sans répéter", type:"group", timer:40 },
  { id:"robot", emoji:"🤖", text:"Parle comme un robot pendant tout ton tour", type:"solo", timer:20 },
  { id:"freeze", emoji:"🧊", text:"Statue ! Restez totalement immobiles", type:"group", timer:20 },
  { id:"compliment", emoji:"💗", text:"Fais un compliment sincère à chaque joueur", type:"solo", timer:30 },
  { id:"fruits", emoji:"🍎", text:"Nommez à tour de rôle un fruit ou un légume, sans répéter", type:"group", timer:30 },
  { id:"dance", emoji:"💃", text:"Invente un pas de danse et fais-le refaire aux autres", type:"solo", timer:25 },
  { id:"accent", emoji:"🗣️", text:"Raconte ta journée avec un accent inventé", type:"solo", timer:25 },
  { id:"clap", emoji:"👏", text:"Créez un rythme à taper dans les mains, tous ensemble", type:"group", timer:25 },
  { id:"impression", emoji:"🎭", text:"Imite quelqu'un de la famille — les autres devinent qui", type:"solo", timer:20 },
  { id:"story", emoji:"📖", text:"Inventez une histoire : chacun ajoute une phrase à tour de rôle", type:"group", timer:45 },
  { id:"opposite", emoji:"↔️", text:"Réponds à 3 questions en disant toujours le contraire de la vérité", type:"duo", timer:25 },
  { id:"jump", emoji:"🤸", text:"Fais 10 sauts en comptant à voix haute", type:"solo", timer:20 },
  { id:"colors", emoji:"🌈", text:"Trouve 5 objets de la même couleur dans la pièce", type:"solo", timer:25 },
  { id:"opera", emoji:"🎤", text:"Chante « Joyeux anniversaire » façon opéra", type:"solo", timer:20 },
  { id:"emoji", emoji:"📱", text:"Mime un emoji de ton choix — les autres devinent lequel", type:"solo", timer:20 },
  { id:"memory", emoji:"🧠", text:"Liste qui s'allonge : chacun ajoute un objet et redit toute la liste", type:"group", timer:45 },
  { id:"slowmo", emoji:"🐢", text:"Marche au ralenti pendant tout ton tour", type:"solo", timer:20 },
  { id:"rhyme", emoji:"📝", text:"Trouve 3 mots qui riment avec « chapeau »", type:"solo", timer:20 },
  { id:"letter", emoji:"🙌", text:"En équipe, formez une lettre avec vos corps", type:"group", timer:30 },
  { id:"wink", emoji:"😉", text:"Fais un clin d'œil à chaque joueur sans sourire", type:"solo", timer:15 },
];

export function uid(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function getInitData(game: GameId): Record<string, any> {
  if (game === "connect4") return { board: Array(6).fill(null).map(() => Array(7).fill(0)), currentTurn: 0, selected: null, hints: [] };
  if (game === "checkers") return { board: initCheckersBoard(), currentTurn: 0, selected: null, hints: [], chkChain: null };
  if (game === "chess") return { board: CHESS_INIT.map(r => [...r]), currentTurn: 0, selected: null, hints: [], chessCastle: "KQkq", chessEp: null, chessCheck: null };
  if (game === "quiz") return { questionIdx: 0, quizThemes: ["all"], quizAnswers: {}, quizQuestions: null, quizOptions: [], revealed: false, totalQuestions: 10 };
  if (game === "defi") {
    const deck = DEFIS.map((_, i) => i).sort(() => Math.random() - 0.5); // shuffle → no repeats in a game
    return { defiIdx: 0, defiDeck: deck, timerLeft: DEFIS[deck[0]].timer, timerRunning: false };
  }
  if (game === "justeprix") return { jpRound: 0, jpTotalRounds: 10, jpProduct: null, jpAnswers: {}, jpRevealed: false, jpUsed: [] };
  if (game === "marque") return { mkRound: 0, mkTotalRounds: 10, mkBrand: null, mkOptions: [], mkAnswers: {}, mkTimes: {}, mkRevealed: false, mkUsed: [] };
  if (game === "dessin") return { dessinManche: 0, dessinTotalManches: 0, dessinMot: null, dessinDessinateur: null, dessinPaths: [], dessinCorrectGuesser: null, dessinRoundActive: false, dessinGuessChat: [] };
  if (game === "scrabble") { const bag = buildBag(); return { bag, racks: {}, currentTurn: 0, roundWord: "", selectedTiles: [], wordHistory: [] }; }
  if (game === "chronovore") return {};
  if (game === "imposteur") return { impPhase: null, impRound: 0, impVotes: {}, impSeen: {} };
  if (game === "quidenous") return { qdnPhase: null, qdnRound: 0, qdnTotalRounds: 8, qdnUsed: [], qdnVotes: {} };
  if (game === "bataille") return { bnPhase: "place", bnGrids: {}, bnReady: {}, bnShots: {}, bnTurn: "", bnWinner: "" };
  if (game === "morpion") return { mpCells: Array(9).fill(""), mpTurn: "", mpWinner: "", mpLine: [] };
  if (game === "petitbac") return { pbPhase: null, pbRound: 0, pbTotalRounds: 5, pbUsedLetters: [], pbAnswers: {}, pbDone: {}, pbStopBy: null, pbStopAt: null };
  if (game === "bombe") return { bmbPhase: null, bmbLives: {}, bmbUsedWords: [], bmbUsedSyllables: [], bmbRoundId: 0, bmbOrder: [] };
  if (game === "des") return { dsPhase: null, dsDice: {}, dsCounts: {}, dsBid: null, dsRoundId: 0, dsOrder: [], dsReveal: null };
  if (game === "blokus") return { blkBoard: null, blkTurn: 0, blkOrder: [], blkRemaining: {}, blkPassed: {} };
  if (game === "grandscrabble") return { gsPhase: null, gsBoard: null, gsBag: [], gsRacks: {}, gsOrder: [], gsTurn: 0, gsHistory: [], gsPasses: 0 };
  if (game === "monopoly") return { mono: null };
  if (game === "uno") return { uno: null };
  return {};
}

export function checkConnect4Win(board: number[][], row: number, col: number, val: number): boolean {
  const dirs: [number,number][] = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr, dc] of dirs) {
    let cnt = 1;
    for (let i = 1; i < 4; i++) { const r = row+dr*i, c = col+dc*i; if (r>=0&&r<6&&c>=0&&c<7&&board[r][c]===val) cnt++; else break; }
    for (let i = 1; i < 4; i++) { const r = row-dr*i, c = col-dc*i; if (r>=0&&r<6&&c>=0&&c<7&&board[r][c]===val) cnt++; else break; }
    if (cnt >= 4) return true;
  }
  return false;
}

export function getCheckersMoves(board: number[][], r: number, c: number, playerIdx: number): [number,number][] {
  const piece = board[r][c];
  const dirs: number[] = playerIdx === 0 ? [-1] : [1];
  if (piece === 3 || piece === 4) dirs.push(playerIdx === 0 ? 1 : -1);
  const moves: [number,number][] = [];
  const opp = playerIdx === 0 ? [2,4] : [1,3];
  for (const dr of dirs) {
    for (const dc of [-1, 1]) {
      const nr = r+dr, nc = c+dc;
      if (nr>=0&&nr<8&&nc>=0&&nc<8&&board[nr][nc]===0) moves.push([nr, nc]);
      const cr = r+dr*2, cc = c+dc*2;
      if (nr>=0&&nr<8&&nc>=0&&nc<8&&opp.includes(board[nr][nc])&&cr>=0&&cr<8&&cc>=0&&cc<8&&board[cr][cc]===0) moves.push([cr, cc]);
    }
  }
  return moves;
}

export function getChessMoves(board: string[][], r: number, c: number, isWhite: boolean): [number,number][] {
  const piece = board[r][c];
  const moves: [number,number][] = [];
  const inB = (r: number, c: number) => r>=0&&r<8&&c>=0&&c<8;
  const isEnemy = (r: number, c: number) => { const t = board[r][c]; return t&&((isWhite&&t===t.toLowerCase())||(!isWhite&&t===t.toUpperCase())); };
  const isEmpty = (r: number, c: number) => inB(r,c)&&!board[r][c];
  const canTo = (r: number, c: number) => inB(r,c)&&(!board[r][c]||isEnemy(r,c));
  const slide = (dr: number, dc: number) => {
    for (let i=1;i<8;i++) {
      const nr=r+dr*i,nc=c+dc*i;
      if (!inB(nr,nc)) break;
      if (isEmpty(nr,nc)) moves.push([nr,nc]);
      else { if (isEnemy(nr,nc)) moves.push([nr,nc]); break; }
    }
  };
  const p = piece.toLowerCase();
  if (p==='p') {
    const dir = isWhite ? -1 : 1;
    if (isEmpty(r+dir,c)) { moves.push([r+dir,c]); if ((isWhite&&r===6||!isWhite&&r===1)&&isEmpty(r+dir*2,c)) moves.push([r+dir*2,c]); }
    for (const dc of [-1,1]) { if (inB(r+dir,c+dc)&&isEnemy(r+dir,c+dc)) moves.push([r+dir,c+dc]); }
  } else if (p==='r') { [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>slide(dr,dc)); }
  else if (p==='b') { [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc])=>slide(dr,dc)); }
  else if (p==='q') { [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc])=>slide(dr,dc)); }
  else if (p==='n') { [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>{ if(canTo(r+dr,c+dc)) moves.push([r+dr,c+dc]); }); }
  else if (p==='k') { [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>{ if(canTo(r+dr,c+dc)) moves.push([r+dr,c+dc]); }); }
  return moves;
}
