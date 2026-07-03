import type { Game, MemberPreset, GameId, Difficulty } from "../types";

/* ── Solo vs Ordinateur ── */
export const AI_ID = "zzz-ai";
export const AI_PLAYER = { id: AI_ID, name: "Ordinateur", color: "#8b93a7", emoji: "🤖" };
export const AI_GAMES = new Set<GameId>(["morpion", "connect4", "chess", "checkers", "bataille"]);
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

export const GAMES: Game[] = [
  { id: "scrabble", name: "Mot pour Mot", emoji: "🔤", desc: "Scrabble familial — forme des mots, marque des points", min: 2, max: 4, color: "#14b8a6" },
  { id: "chess", name: "Échecs", emoji: "♟️", desc: "Échecs classique 8×8 — Rois, reines, stratégie", min: 2, max: 2, color: "#6366f1" },
  { id: "checkers", name: "Dames", emoji: "⬛", desc: "Jeu de dames — captures et dames couronnées", min: 2, max: 2, color: "#f59e0b" },
  { id: "connect4", name: "Puissance 4", emoji: "🔴", desc: "Aligne 4 jetons avant ton adversaire", min: 2, max: 2, color: "#ef4444" },
  { id: "quiz", name: "Quiz KHELIJ", emoji: "🧠", desc: "Questions sur la famille, la culture et le monde", min: 2, max: 4, color: "#ec4899" },
  { id: "defi", name: "Défis Chrono", emoji: "⏱️", desc: "Mini-défis rigolos — le plus rapide gagne", min: 2, max: 4, color: "#84cc16" },
  { id: "justeprix", name: "Le Juste Prix", emoji: "💰", desc: "Estime le prix d'un objet — le plus proche gagne !", min: 1, max: 4, color: "#fb923c" },
  { id: "dessin", name: "Dessinez, c'est gagné", emoji: "🎨", desc: "Dessine un mot et fais deviner les autres", min: 2, max: 4, color: "#22c55e" },
  { id: "imposteur", name: "L'Imposteur", emoji: "🕵️", desc: "Chacun son mot secret — démasque l'intrus par le vote", min: 3, max: 8, color: "#f43f5e" },
  { id: "quidenous", name: "Qui de nous… ?", emoji: "🙋", desc: "Vote en secret, révélation hilarante en famille", min: 3, max: 8, color: "#10b981" },
  { id: "bataille", name: "Bataille Navale", emoji: "🚢", desc: "Place ta flotte, coule celle de l'adversaire", min: 2, max: 2, color: "#3b82f6" },
  { id: "morpion", name: "Morpion", emoji: "❎", desc: "Aligne 3 symboles avant l'autre joueur", min: 2, max: 2, color: "#8b5cf6" },
  { id: "chronovore", name: "Le Chronovore", emoji: "🔮", desc: "Escape room 3D narrative — échappe-toi d'un instant figé du temps", min: 1, max: 1, color: "#38bdf8" },
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

export const DEFIS = [
  { id:"tongue", text:"Dis 3 fois vite : 'Les chaussettes de l'archiduchesse'", type:"group", timer:10 },
  { id:"count", text:"Comptez ensemble de 1 à 20, chacun dit un chiffre à tour de rôle", type:"group", timer:20 },
  { id:"animal", text:"Imite un animal sans parler — les autres devinent", type:"solo", timer:15 },
  { id:"hum", text:"Fredonne une chanson sans paroles — les autres devinent", type:"solo", timer:20 },
  { id:"letters", text:"Chacun dit un mot commençant par la lettre B en moins de 3 secondes", type:"group", timer:30 },
  { id:"describe", text:"Décris un objet de la pièce sans le nommer — les autres devinent", type:"solo", timer:20 },
  { id:"handshake", text:"Inventez une poignée de main secrète à 2 en 30 secondes", type:"duo", timer:30 },
  { id:"portrait", text:"Fais un portrait en 10 secondes avec tes doigts dans l'air", type:"solo", timer:10 },
  { id:"song", text:"Chante les paroles d'une chanson à l'envers (commence par la fin)", type:"solo", timer:20 },
  { id:"mirror", text:"Faites le miroir : imitez exactement les mouvements de l'autre", type:"duo", timer:20 },
  { id:"whisper", text:"Passe le message : chuchote une phrase, elle doit arriver intacte", type:"group", timer:30 },
  { id:"1min", text:"Sans regarder ta montre, lève la main quand tu penses qu'une minute s'est écoulée", type:"group", timer:60 },
];

export function uid(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function getInitData(game: GameId): Record<string, any> {
  if (game === "connect4") return { board: Array(6).fill(null).map(() => Array(7).fill(0)), currentTurn: 0, selected: null, hints: [] };
  if (game === "checkers") return { board: initCheckersBoard(), currentTurn: 0, selected: null, hints: [], chkChain: null };
  if (game === "chess") return { board: CHESS_INIT.map(r => [...r]), currentTurn: 0, selected: null, hints: [], chessCastle: "KQkq", chessEp: null, chessCheck: null };
  if (game === "quiz") return { questionIdx: 0, quizThemes: ["all"], quizAnswers: {}, quizQuestions: null, quizOptions: [], revealed: false, totalQuestions: 10 };
  if (game === "defi") { const d = DEFIS[0]; return { defiIdx: 0, timerLeft: d.timer, timerRunning: false }; }
  if (game === "justeprix") return { jpRound: 0, jpTotalRounds: 3, jpProduct: null, jpAnswers: {}, jpRevealed: false };
  if (game === "dessin") return { dessinManche: 0, dessinTotalManches: 0, dessinMot: null, dessinDessinateur: null, dessinPaths: [], dessinCorrectGuesser: null, dessinRoundActive: false, dessinGuessChat: [] };
  if (game === "scrabble") { const bag = buildBag(); return { bag, racks: {}, currentTurn: 0, roundWord: "", selectedTiles: [], wordHistory: [] }; }
  if (game === "chronovore") return {};
  if (game === "imposteur") return { impPhase: null, impRound: 0, impVotes: {}, impSeen: {} };
  if (game === "quidenous") return { qdnPhase: null, qdnRound: 0, qdnTotalRounds: 8, qdnUsed: [], qdnVotes: {} };
  if (game === "bataille") return { bnPhase: "place", bnGrids: {}, bnReady: {}, bnShots: {}, bnTurn: "", bnWinner: "" };
  if (game === "morpion") return { mpCells: Array(9).fill(""), mpTurn: "", mpWinner: "", mpLine: [] };
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
