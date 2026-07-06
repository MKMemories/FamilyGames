import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { dbRef, update } from "../../lib/firebase";
import { gameHistory } from "../../hooks/useGameHistory";
import { JokerBar } from "../JokerBar";
import { fx } from "../../lib/sound";
import { initJokers, jokerCount, speedBonus, type JokerType } from "../../lib/jokers";
import { pickBrand, buildOptions, monogram } from "../../lib/marquesData";
import type { Room, Brand } from "../../types";

const MK_JOKERS: JokerType[] = ["fifty", "double", "timeplus"];
const MK_TIMEPLUS_SEC = 6;
const TIMER_SEC = 16;
const TOTAL_ROUNDS = 10;
const mkHistory = gameHistory("marque");

/* Les indices se dévoilent progressivement (0→3) au fil du chrono.
   0 : silhouette + secteur · 1 : catégorie · 2 : monogramme · 3 : indice texte.
   Le NOM n'apparaît jamais avant la révélation. */
function clueStage(elapsed: number): number {
  if (elapsed >= 9) return 3;
  if (elapsed >= 6) return 2;
  if (elapsed >= 3) return 1;
  return 0;
}

/* Illustration ORIGINALE par marque : une icône produit/secteur (aucun logo
   réel), dévoilée d'abord floue puis nette au fil des indices. */
const ICON_BY_NAME: Record<string, string> = {
  // Tech / réseaux
  Google: "search", Amazon: "cart", GoPro: "camera", Nvidia: "chip", Tesla: "car", Microsoft: "laptop", Sony: "controller",
  YouTube: "play", Netflix: "play", Spotify: "music", WhatsApp: "chat", Instagram: "camera", Snapchat: "camera",
  Twitch: "play", Pinterest: "cart", Reddit: "chat", Discord: "chat", TikTok: "music",
  LG: "phone", Lenovo: "laptop", Canon: "camera", JBL: "headphones", Bose: "headphones",
  Facebook: "chat", Telegram: "chat", LinkedIn: "chat", ChatGPT: "robot", Zoom: "play", Deezer: "music", SoundCloud: "music",
  // Gaming
  EA: "controller", Ubisoft: "controller", "Epic Games": "controller", "Call of Duty": "controller", Pokémon: "ball", Sega: "controller", Razer: "controller",
  // Fast-food
  Starbucks: "coffee", KFC: "drumstick", "Domino's": "pizza", Subway: "burger", "McDonald's": "burger", "Burger King": "burger",
  "Pizza Hut": "pizza", "Five Guys": "burger", "Krispy Kreme": "donut", "Dunkin'": "donut", "Ben & Jerry's": "icecream", Chipotle: "burger",
  // Boissons : canette VS bouteille
  "Red Bull": "can", Monster: "can", "Capri-Sun": "can",
  "Coca-Cola": "bottle", Pepsi: "bottle", Fanta: "bottle", Sprite: "bottle", Orangina: "bottle", Oasis: "bottle", Evian: "bottle", Nescafé: "coffee",
  // Snacks
  Nutella: "jar", Oreo: "cookie", Kinder: "chocolate", Haribo: "candy", "M&M's": "candy", "Chupa Chups": "candy",
  Doritos: "chips", "Lay's": "chips", Pringles: "chips", KitKat: "chocolate", Snickers: "chocolate", Twix: "chocolate", Milka: "chocolate",
  // Mode / luxe / divers
  Lego: "brick", Roblox: "brick", Minecraft: "brick", IKEA: "cart", Airbnb: "house", Uber: "car", PayPal: "card",
  Disney: "star", Marvel: "star", Supreme: "cap", "The North Face": "mountain", Lacoste: "shirt",
  Levis: "shirt", "Levi's": "shirt", "Calvin Klein": "shirt", "Tommy Hilfiger": "shirt", Shein: "shirt", Sephora: "bag", Prada: "bag", Balenciaga: "bag",
  Reebok: "sneaker", Asics: "sneaker", Jordan: "ball", Decathlon: "ball", "Under Armour": "shirt",
  Audi: "car", Volkswagen: "car", Porsche: "car", Renault: "car",
  eBay: "cart", Temu: "cart", Ryanair: "plane", Booking: "house",
};
const ICON_BY_CAT: Record<string, string> = {
  Tech: "phone", "Réseaux": "chat", Gaming: "controller", Sport: "sneaker", Mode: "shirt",
  Luxe: "bag", "Fast-food": "burger", Boissons: "can", Snacks: "chocolate", Auto: "car", Divertissement: "play", Divers: "cart",
};
export function iconFor(b: Brand): string { return ICON_BY_NAME[b.name] || ICON_BY_CAT[b.category] || "star"; }

export function BrandIcon({ icon }: { icon: string }) {
  const W = "#ffffff";
  const P: Record<string, React.ReactNode> = {
    phone: <g><rect x="36" y="20" width="28" height="60" rx="6" fill={W} /><rect x="40" y="27" width="20" height="42" rx="2" fill="#000" opacity=".22" /><circle cx="50" cy="74" r="2.4" fill="#000" opacity=".3" /></g>,
    chat: <g><path d="M24 30 h52 a6 6 0 0 1 6 6 v26 a6 6 0 0 1 -6 6 H44 l-12 10 v-10 h-8 a6 6 0 0 1 -6 -6 V36 a6 6 0 0 1 6 -6 z" fill={W} /><g fill="#000" opacity=".2"><circle cx="38" cy="49" r="3.5" /><circle cx="51" cy="49" r="3.5" /><circle cx="64" cy="49" r="3.5" /></g></g>,
    controller: <g><rect x="20" y="38" width="60" height="30" rx="15" fill={W} /><rect x="30" y="49" width="12" height="4" rx="2" fill="#000" opacity=".28" /><rect x="34" y="45" width="4" height="12" rx="2" fill="#000" opacity=".28" /><circle cx="62" cy="48" r="3.4" fill="#000" opacity=".28" /><circle cx="70" cy="55" r="3.4" fill="#000" opacity=".28" /></g>,
    sneaker: <g><path d="M15 60 q0 -5 6 -6 q9 -1 13 -6 l7 -9 q3 -4 7 -2 q2 1 2 4 l1 5 q3 3 9 5 q13 4 19 8 q5 3 5 8 v4 H17 z" fill={W} /><g stroke="#000" strokeOpacity=".22" strokeWidth="2" strokeLinecap="round"><path d="M43 42 l3 7" /><path d="M49 44 l2 7" /><path d="M55 47 l1 6" /></g><path d="M50 41 q10 4 20 9" stroke="#000" strokeOpacity=".18" strokeWidth="2.5" fill="none" /><rect x="16" y="66" width="68" height="7" rx="3.5" fill="#000" opacity=".2" /></g>,
    shirt: <g><path d="M38 26 l-16 8 l6 12 l8 -4 v32 h28 V42 l8 4 l6 -12 l-16 -8 q-6 6 -14 0 z" fill={W} /></g>,
    bag: <g><path d="M30 40 h40 l4 38 H26 z" fill={W} /><path d="M38 40 a12 12 0 0 1 24 0" fill="none" stroke={W} strokeWidth="4" /></g>,
    burger: <g><path d="M26 34 q24 -12 48 0 q-24 6 -48 0 z" fill={W} /><rect x="24" y="44" width="52" height="6" rx="3" fill={W} /><rect x="26" y="52" width="48" height="5" rx="2.5" fill="#000" opacity=".22" /><path d="M26 60 q24 12 48 0 v2 q-24 10 -48 0 z" fill={W} /></g>,
    pizza: <g><path d="M50 20 L78 74 Q50 84 22 74 Z" fill={W} /><circle cx="44" cy="58" r="4" fill="#000" opacity=".22" /><circle cx="58" cy="55" r="4" fill="#000" opacity=".22" /><circle cx="50" cy="70" r="3.5" fill="#000" opacity=".22" /></g>,
    can: <g><rect x="38" y="22" width="24" height="56" rx="6" fill={W} /><ellipse cx="50" cy="24" rx="12" ry="3.5" fill="#000" opacity=".2" /><rect x="43" y="40" width="14" height="20" rx="2" fill="#000" opacity=".18" /></g>,
    chocolate: <g><rect x="28" y="28" width="44" height="44" rx="4" fill={W} /><g stroke="#000" strokeOpacity=".2" strokeWidth="2"><path d="M50 28 v44 M28 50 h44 M39 28 v44 M61 28 v44 M28 39 h44 M28 61 h44" /></g></g>,
    cookie: <g><circle cx="50" cy="50" r="26" fill={W} /><g fill="#000" opacity=".24"><circle cx="42" cy="42" r="3" /><circle cx="58" cy="46" r="3" /><circle cx="48" cy="58" r="3" /><circle cx="60" cy="58" r="2.4" /><circle cx="40" cy="55" r="2.4" /></g></g>,
    candy: <g><path d="M20 50 l14 -8 v16 z" fill={W} /><path d="M80 50 l-14 -8 v16 z" fill={W} /><circle cx="50" cy="50" r="16" fill={W} /><path d="M44 44 l12 12 M56 44 l-12 12" stroke="#000" strokeOpacity=".2" strokeWidth="2" /></g>,
    car: <g><path d="M20 58 q2 -12 8 -12 l6 -8 q3 -4 8 -4 h16 q5 0 8 4 l6 8 q6 0 8 12 v6 H20 z" fill={W} /><circle cx="34" cy="64" r="6" fill="#000" opacity=".35" /><circle cx="66" cy="64" r="6" fill="#000" opacity=".35" /><path d="M36 46 h28 l-4 -6 h-20 z" fill="#000" opacity=".18" /></g>,
    play: <g><rect x="24" y="28" width="52" height="44" rx="10" fill={W} /><path d="M44 40 v20 l18 -10 z" fill="#000" opacity=".3" /></g>,
    cart: <g><path d="M22 30 h8 l6 30 h34 l6 -22 H34" fill="none" stroke={W} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" /><circle cx="42" cy="70" r="5" fill={W} /><circle cx="68" cy="70" r="5" fill={W} /></g>,
    search: <g><circle cx="45" cy="45" r="18" fill="none" stroke={W} strokeWidth="7" /><path d="M58 58 l16 16" stroke={W} strokeWidth="8" strokeLinecap="round" /></g>,
    camera: <g><rect x="22" y="34" width="56" height="40" rx="7" fill={W} /><path d="M38 34 l4 -7 h16 l4 7 z" fill={W} /><circle cx="50" cy="54" r="12" fill="#000" opacity=".22" /><circle cx="50" cy="54" r="6" fill="#000" opacity=".25" /></g>,
    coffee: <g><path d="M28 36 h34 v18 a17 17 0 0 1 -34 0 z" fill={W} /><path d="M62 40 a10 10 0 0 1 0 18" fill="none" stroke={W} strokeWidth="4" /><rect x="30" y="70" width="34" height="5" rx="2.5" fill={W} /><path d="M40 26 q4 4 0 8 M50 26 q4 4 0 8" stroke={W} strokeWidth="3" fill="none" strokeLinecap="round" opacity=".7" /></g>,
    music: <g><path d="M58 22 v34 a10 10 0 1 1 -6 -9 V32 l-20 6 v24 a10 10 0 1 1 -6 -9 V34 z" fill={W} /></g>,
    brick: <g><rect x="28" y="38" width="44" height="30" rx="3" fill={W} /><rect x="35" y="30" width="12" height="10" rx="3" fill={W} /><rect x="53" y="30" width="12" height="10" rx="3" fill={W} /></g>,
    house: <g><path d="M50 24 L78 48 H22 Z" fill={W} /><rect x="30" y="46" width="40" height="30" fill={W} /><rect x="44" y="58" width="12" height="18" fill="#000" opacity=".22" /></g>,
    card: <g><rect x="22" y="34" width="56" height="34" rx="5" fill={W} /><rect x="22" y="42" width="56" height="7" fill="#000" opacity=".28" /><rect x="28" y="58" width="16" height="4" rx="2" fill="#000" opacity=".22" /></g>,
    star: <g><path d="M50 22 l8 18 20 2 -15 14 4 20 -17 -10 -17 10 4 -20 -15 -14 20 -2 z" fill={W} /></g>,
    laptop: <g><rect x="30" y="28" width="40" height="27" rx="3" fill={W} /><rect x="34" y="32" width="32" height="19" rx="1.5" fill="#000" opacity=".22" /><path d="M22 60 h56 l-5 7 h-46 z" fill={W} /></g>,
    headphones: <g><path d="M28 55 v-6 a22 22 0 0 1 44 0 v6" fill="none" stroke={W} strokeWidth="6" strokeLinecap="round" /><rect x="22" y="52" width="11" height="20" rx="5" fill={W} /><rect x="67" y="52" width="11" height="20" rx="5" fill={W} /></g>,
    robot: <g><rect x="46" y="20" width="8" height="8" rx="2" fill={W} /><circle cx="50" cy="20" r="3" fill={W} /><rect x="30" y="32" width="40" height="34" rx="9" fill={W} /><circle cx="42" cy="49" r="4.5" fill="#000" opacity=".3" /><circle cx="58" cy="49" r="4.5" fill="#000" opacity=".3" /><rect x="43" y="58" width="14" height="3" rx="1.5" fill="#000" opacity=".25" /></g>,
    drumstick: <g><ellipse cx="42" cy="42" rx="18" ry="15" fill={W} transform="rotate(-22 42 42)" /><rect x="53" y="50" width="8" height="22" rx="4" fill={W} transform="rotate(-22 57 61)" /><circle cx="64" cy="70" r="6" fill={W} /><circle cx="58" cy="74" r="5" fill={W} /></g>,
    bottle: <g><path d="M45 20 h10 v6 q0 3 3 6 q5 5 5 13 v27 a6 6 0 0 1 -6 6 H43 a6 6 0 0 1 -6 -6 V45 q0 -8 5 -13 q3 -3 3 -6 z" fill={W} /><rect x="43" y="18" width="14" height="5" rx="2" fill={W} /><rect x="39" y="56" width="22" height="16" rx="2" fill="#000" opacity=".18" /></g>,
    fries: <g><g fill={W}><rect x="37" y="28" width="4.5" height="22" rx="2" /><rect x="44" y="24" width="4.5" height="26" rx="2" /><rect x="51" y="26" width="4.5" height="24" rx="2" /><rect x="58" y="30" width="4.5" height="20" rx="2" /></g><path d="M33 46 h34 l-4 30 h-26 z" fill={W} /><g stroke="#000" strokeOpacity=".2" strokeWidth="3"><path d="M40 52 v22 M50 52 v22 M60 52 v22" /></g></g>,
    donut: <g><circle cx="50" cy="50" r="25" fill={W} /><circle cx="50" cy="50" r="9" fill="#000" opacity=".24" /><g fill="#000" opacity=".26"><rect x="46" y="28" width="6" height="2.5" rx="1.2" transform="rotate(30 49 29)" /><rect x="63" y="42" width="6" height="2.5" rx="1.2" transform="rotate(-20 66 43)" /><rect x="34" y="46" width="6" height="2.5" rx="1.2" transform="rotate(50 37 47)" /><rect x="58" y="64" width="6" height="2.5" rx="1.2" transform="rotate(70 61 65)" /></g></g>,
    icecream: <g><path d="M39 50 h22 l-11 28 z" fill={W} /><circle cx="43" cy="44" r="10" fill={W} /><circle cx="57" cy="44" r="10" fill={W} /><circle cx="50" cy="36" r="10.5" fill={W} /><path d="M40 52 l4 4 M50 52 l4 4 M56 52 l4 4" stroke="#000" strokeOpacity=".14" strokeWidth="2" /></g>,
    chips: <g><path d="M34 24 h32 l-3 8 v42 q-13 6 -26 0 v-42 z" fill={W} /><path d="M34 24 l32 0 -4 6 h-24 z" fill="#000" opacity=".18" /><path d="M44 44 l6 6 6 -6 -6 -6 z" fill="#000" opacity=".2" /></g>,
    ball: <g><circle cx="50" cy="50" r="25" fill={W} /><path d="M50 40 l9 6.5 -3.5 11 h-11 l-3.5 -11 z" fill="#000" opacity=".26" /><g stroke="#000" strokeOpacity=".2" strokeWidth="2"><path d="M50 25 v9 M71 42 l-8 5 M64 71 l-6 -8 M36 71 l6 -8 M29 42 l8 5" /></g></g>,
    plane: <g><path d="M50 18 q4 0 5 12 l22 13 v7 l-22 -6 -1 14 7 6 v5 l-11 -4 -11 4 v-5 l7 -6 -1 -14 -22 6 v-7 l22 -13 q1 -12 5 -12 z" fill={W} /></g>,
    chip: <g><rect x="34" y="34" width="32" height="32" rx="4" fill={W} /><rect x="41" y="41" width="18" height="18" rx="2" fill="#000" opacity=".22" /><g stroke={W} strokeWidth="3"><path d="M40 34 v-8 M50 34 v-8 M60 34 v-8 M40 66 v8 M50 66 v8 M60 66 v8 M34 40 h-8 M34 50 h-8 M34 60 h-8 M66 40 h8 M66 50 h8 M66 60 h8" /></g></g>,
    jar: <g><rect x="36" y="36" width="28" height="40" rx="6" fill={W} /><rect x="38" y="24" width="24" height="10" rx="3" fill={W} /><rect x="40" y="48" width="20" height="18" rx="2" fill="#000" opacity=".18" /></g>,
    cap: <g><path d="M22 58 q6 -26 28 -26 q22 0 28 26 q-28 -10 -56 0 z" fill={W} /><path d="M20 58 q10 -5 22 -6 l-2 8 q-12 1 -20 4 z" fill={W} opacity=".85" /><circle cx="50" cy="34" r="3" fill="#000" opacity=".2" /></g>,
    mountain: <g><path d="M20 74 L42 34 L54 56 L62 44 L80 74 Z" fill={W} /><path d="M42 34 l6 11 -6 4 -6 -4 z" fill="#000" opacity=".18" /></g>,
    watch: <g><rect x="41" y="22" width="18" height="14" rx="4" fill={W} /><rect x="41" y="64" width="18" height="14" rx="4" fill={W} /><circle cx="50" cy="50" r="16" fill={W} /><circle cx="50" cy="50" r="12.5" fill="#000" opacity=".2" /><path d="M50 50 v-6 M50 50 l5 3" stroke={W} strokeWidth="2" strokeLinecap="round" /></g>,
  };
  return <svg viewBox="0 0 100 100" width="58%" height="58%" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,.35))" }}>{P[icon] || P.star}</svg>;
}

interface Props { room: Room; roomId: string; playerId: string; isHost: boolean; isSolo: boolean; onLeave: () => void; }

export function Marque({ room, roomId, playerId, isHost, isSolo, onLeave }: Props) {
  const [timeLeft, setTimeLeft] = useState(TIMER_SEC);
  const [pending, setPending] = useState<string | null>(null);      // choix optimiste local
  const [fiftyHidden, setFiftyHidden] = useState<string[]>([]);
  const didPick = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const players = Object.values(room.players || {});
  const round = room.mkRound ?? 0;
  const total = room.mkTotalRounds ?? TOTAL_ROUNDS;
  const brand = (room.mkBrand ?? null) as Brand | null;
  const options = room.mkOptions ?? [];
  const answers = room.mkAnswers ?? {};
  const times = room.mkTimes ?? {};
  const revealed = room.mkRevealed ?? false;
  const scores = room.scores ?? {};
  const jokerActiveMap = room.jokerActive ?? {};
  const myJokerActive = jokerActiveMap[playerId] || null;

  const myAnswer = answers[playerId] !== undefined ? answers[playerId] : (pending ?? undefined);
  const submitted = answers[playerId] !== undefined || pending !== null;
  const elapsed = TIMER_SEC - timeLeft;
  const stage = revealed ? 3 : clueStage(elapsed);

  /* ── Host choisit la marche à suivre ── */
  useEffect(() => {
    if (!isHost || brand || didPick.current) return;
    didPick.current = true;
    pickAndSet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, brand]);

  useEffect(() => {
    if (!isHost || room.jokers) return;
    update(dbRef(`games/${roomId}`), { jokers: initJokers(players.map(p => p.id), MK_JOKERS), jokerActive: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, room.jokers]);

  const pickAndSet = async () => {
    const used = room.mkUsed ?? [];
    const b = pickBrand(used, mkHistory.getUsedSet());
    await update(dbRef(`games/${roomId}`), {
      mkBrand: b, mkOptions: buildOptions(b), mkAnswers: {}, mkTimes: {}, mkRevealed: false,
      mkUsed: [...used, b.id],
    });
  };

  /* ── Reset par manche ── */
  useEffect(() => {
    setPending(null); setFiftyHidden([]); didPick.current = false; setTimeLeft(TIMER_SEC);
  }, [round]);

  /* ── Chrono ── */
  useEffect(() => {
    if (!brand || revealed) { if (timerRef.current) clearInterval(timerRef.current); return; }
    setTimeLeft(TIMER_SEC);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); if (isHost) update(dbRef(`games/${roomId}`), { mkRevealed: true }); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand?.id, revealed]);

  /* ── Révélation auto quand tout le monde a répondu ── */
  useEffect(() => {
    if (!brand || revealed || !isHost) return;
    if (players.length > 0 && players.every(p => answers[p.id] !== undefined)) update(dbRef(`games/${roomId}`), { mkRevealed: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

  /* ── Gains : bonne réponse (10) + vitesse ⚡ (+3/+2/+1) ×2 joker Double. ── */
  const computeGains = (): Record<string, number> => {
    const correct = brand?.name;
    const rightOrder = players
      .filter(p => answers[p.id] === correct)
      .sort((a, b) => (times[a.id] ?? Infinity) - (times[b.id] ?? Infinity))
      .map(p => p.id);
    const gains: Record<string, number> = {};
    players.forEach(p => {
      let g = 0;
      if (answers[p.id] === correct) { g += 10; g += speedBonus(rightOrder.indexOf(p.id)); }
      if (jokerActiveMap[p.id] === "double") g *= 2;
      gains[p.id] = g;
    });
    return gains;
  };

  const answer = (opt: string) => {
    if (submitted || revealed || !brand) return;
    setPending(opt); fx(opt === brand.name ? "correct" : "select");
    update(dbRef(`games/${roomId}`), { [`mkAnswers/${playerId}`]: opt, [`mkTimes/${playerId}`]: Date.now() });
  };

  const useJoker = (type: JokerType) => {
    if (submitted || revealed || !brand) return;
    if (jokerCount(room.jokers, playerId, type) <= 0) return;
    const upd: Record<string, unknown> = { [`jokers/${playerId}/${type}`]: jokerCount(room.jokers, playerId, type) - 1 };
    if (type === "double") upd[`jokerActive/${playerId}`] = "double";
    else if (type === "timeplus") setTimeLeft(t => t + MK_TIMEPLUS_SEC);
    else if (type === "fifty") {
      const wrong = options.filter(o => o !== brand.name);
      setFiftyHidden(wrong.sort(() => Math.random() - 0.5).slice(0, 2));
    }
    update(dbRef(`games/${roomId}`), upd);
  };

  const nextRound = async () => {
    if (!brand) return;
    const gains = computeGains();
    const newScores = { ...scores };
    players.forEach(p => { newScores[p.id] = (newScores[p.id] || 0) + (gains[p.id] || 0); });
    mkHistory.saveSession([String(brand.id)]);
    const next = round + 1;
    if (next >= total) {
      const winner = [...players].sort((a, b) => (newScores[b.id] || 0) - (newScores[a.id] || 0))[0]?.name || "?";
      await update(dbRef(`games/${roomId}`), { scores: newScores, status: "finished", winner, mkRound: next });
    } else {
      await update(dbRef(`games/${roomId}`), {
        scores: newScores, mkRound: next, mkBrand: null, mkOptions: [], mkAnswers: {}, mkTimes: {}, mkRevealed: false, jokerActive: {},
      });
    }
  };

  const timerPct = (timeLeft / TIMER_SEC) * 100;
  const timerColor = timerPct > 55 ? "#4caf50" : timerPct > 28 ? "#ffbe42" : "#ff5252";

  if (!brand) {
    return (
      <div className="screen game-screen">
        <div className="game-topbar"><button className="btn-back" onClick={onLeave}>✕</button><div className="turn-indicator">🏷️ Devine la Marque</div><div /></div>
        <div className="quiz-loading"><div className="quiz-spinner" /><div>{isHost ? "Préparation…" : "En attente…"}</div></div>
        <style>{MK_CSS}</style>
      </div>
    );
  }

  const correct = brand.name;
  const gains = revealed ? computeGains() : {};
  const fastestId = players.filter(p => answers[p.id] === correct).sort((a, b) => (times[a.id] ?? Infinity) - (times[b.id] ?? Infinity))[0]?.id;

  return (
    <div className="screen game-screen mk-screen" style={{ ["--c1" as string]: brand.c1, ["--c2" as string]: brand.c2 }}>
      <div className="game-topbar">
        <button className="btn-back" onClick={onLeave}>✕</button>
        <div className="turn-indicator">🏷️ Marque {round + 1}/{total}</div>
        <div className="score-mini">{players.map(p => <span key={p.id} style={{ color: p.color || "#333" }}>{p.name.slice(0, 4)} {scores[p.id] || 0}</span>)}</div>
      </div>

      {!revealed && (
        <div className="quiz-timer-bar">
          <div className="quiz-timer-fill" style={{ width: `${timerPct}%`, background: timerColor }} />
          <span className="quiz-timer-num" style={{ color: timerColor }}>{timeLeft}s</span>
        </div>
      )}

      {/* Carte marque — illustration originale, floue puis nette au fil des indices */}
      <div className="mk-card">
        <span className="mk-aura" aria-hidden />
        <span className="mk-shine" aria-hidden />
        <motion.div className="mk-illus" key={brand.id}
          initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 240, damping: 18 }}
          style={{ filter: `blur(${revealed ? 0 : [11, 7, 3.5, 1.5][stage]}px)`, transition: "filter .6s ease" }}>
          <BrandIcon icon={iconFor(brand)} />
        </motion.div>
        <span className="mk-sector" title="Secteur">{brand.emoji}</span>
        {!revealed && stage < 2 && <span className="mk-qmark">?</span>}
      </div>

      {/* Indices dévoilés + progression */}
      <div className="mk-clues">
        <motion.div className={`mk-clue ${stage >= 1 ? "on" : ""}`} animate={{ opacity: stage >= 1 ? 1 : 0.4 }}>
          <span className="mk-clue-ic">🗂️</span>{stage >= 1 ? <b>{brand.category}</b> : <i>Catégorie…</i>}
        </motion.div>
        <motion.div className={`mk-clue ${stage >= 2 ? "on" : ""}`} animate={{ opacity: stage >= 2 ? 1 : 0.4 }}>
          <span className="mk-clue-ic">🔤</span>{stage >= 2 ? <b>Initiale « {monogram(brand)} »</b> : <i>Monogramme…</i>}
        </motion.div>
        <motion.div className={`mk-clue ${stage >= 3 ? "on" : ""}`} animate={{ opacity: stage >= 3 ? 1 : 0.4 }}>
          <span className="mk-clue-ic">💡</span>{stage >= 3 ? <b>{brand.hint}</b> : <i>Indice…</i>}
        </motion.div>
        {!revealed && <div className="mk-progress">{[0, 1, 2].map(i => <i key={i} className={stage > i ? "on" : ""} />)}</div>}
      </div>

      {!revealed ? (
        <div className="mk-options">
          {options.map(opt => {
            const hidden = fiftyHidden.includes(opt);
            const chosen = myAnswer === opt;
            return (
              <motion.button key={opt} className={`mk-opt ${chosen ? "chosen" : ""} ${hidden ? "gone" : ""}`}
                disabled={submitted || hidden} onClick={() => answer(opt)} whileTap={{ scale: 0.97 }}>
                {hidden ? "—" : opt}
              </motion.button>
            );
          })}
          {submitted && <div className="mk-waiting">✅ Réponse envoyée · {Object.keys(answers).length}/{players.length}</div>}
          <div style={{ marginTop: ".5rem" }}>
            <JokerBar types={MK_JOKERS} counts={(room.jokers || {})[playerId] || {}} active={myJokerActive} onUse={useJoker} />
          </div>
        </div>
      ) : (
        <div className="mk-reveal">
          <motion.div className="mk-answer" initial={{ scale: 0, rotate: -6 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 320, damping: 14 }}>
            C'était <strong>{brand.name}</strong> !
          </motion.div>
          <div className="mk-results">
            {players.map((p, i) => {
              const a = answers[p.id];
              const good = a === correct;
              return (
                <motion.div key={p.id} className={`mk-result ${good ? "good" : ""}`} style={{ borderLeftColor: p.color || "var(--accent)" }}
                  initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }}>
                  <span className="mk-r-name">{p.emoji} {p.name}</span>
                  <span className="mk-r-ans">{a === undefined ? "⏰ —" : good ? "✅ " + a : "❌ " + a}</span>
                  {(gains[p.id] || 0) > 0 && <span className="mk-r-gain">+{gains[p.id]}{p.id === fastestId ? " ⚡" : ""}{jokerActiveMap[p.id] === "double" ? " ×2" : ""}</span>}
                </motion.div>
              );
            })}
          </div>
          {(isHost || isSolo)
            ? <button className="btn btn-primary" style={{ marginTop: "1rem", width: "100%" }} onClick={nextRound}>{round + 1 >= total ? "🏆 Voir le podium" : "Marque suivante →"}</button>
            : <div className="waiting-host">⏳ En attente de l'hôte…</div>}
        </div>
      )}

      <style>{MK_CSS}</style>
    </div>
  );
}

const MK_CSS = `
.mk-screen{max-width:560px;margin:0 auto;}
.mk-card{position:relative;width:min(74vw,240px);aspect-ratio:1.15;margin:.7rem auto .4rem;border-radius:26px;overflow:hidden;
  display:grid;place-items:center;background:linear-gradient(150deg,var(--c1),var(--c2));
  box-shadow:0 18px 44px color-mix(in srgb, var(--c1) 45%, transparent),inset 0 2px 0 rgba(255,255,255,.25),inset 0 -8px 18px rgba(0,0,0,.25);}
.mk-aura{position:absolute;width:120%;height:120%;background:radial-gradient(circle at 34% 26%, rgba(255,255,255,.35), transparent 55%);}
.mk-shine{position:absolute;top:-40%;left:-30%;width:50%;height:200%;transform:rotate(18deg);
  background:linear-gradient(100deg,transparent,rgba(255,255,255,.35),transparent);animation:mkShine 4.5s ease-in-out infinite;}
@keyframes mkShine{0%,100%{transform:translateX(-140%) rotate(18deg)}55%,100%{transform:translateX(360%) rotate(18deg)}}
@media (prefers-reduced-motion: reduce){.mk-shine{animation:none;}}
.mk-illus{position:relative;z-index:2;width:100%;height:100%;display:grid;place-items:center;}
.mk-qmark{position:absolute;z-index:3;top:10px;left:14px;font-family:var(--font-d);font-size:1.7rem;color:rgba(255,255,255,.85);text-shadow:0 2px 6px rgba(0,0,0,.4);}
.mk-sector{position:absolute;bottom:10px;right:12px;z-index:3;font-size:1.4rem;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4));
  background:rgba(255,255,255,.92);width:38px;height:38px;border-radius:50%;display:grid;place-items:center;box-shadow:0 4px 10px rgba(0,0,0,.3);}

.mk-clues{max-width:340px;margin:.2rem auto .5rem;display:flex;flex-direction:column;gap:.3rem;}
.mk-clue{display:flex;align-items:center;gap:.5rem;font-size:.84rem;color:var(--text);background:var(--surface-1);
  border:1px solid var(--border);border-radius:12px;padding:.4rem .7rem;transition:opacity .3s,border-color .3s;}
.mk-clue.on{border-color:color-mix(in srgb, var(--c1) 45%, var(--border));box-shadow:0 4px 12px color-mix(in srgb, var(--c1) 18%, transparent);}
.mk-clue i{color:var(--muted);font-style:italic;font-weight:600;} .mk-clue b{color:var(--text);}
.mk-clue-ic{font-size:1rem;}
.mk-progress{display:flex;gap:.4rem;justify-content:center;margin-top:.15rem;}
.mk-progress i{width:26px;height:5px;border-radius:999px;background:var(--border);transition:background .3s;}
.mk-progress i.on{background:linear-gradient(90deg,var(--c1),var(--c2));}

.mk-options{max-width:360px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:.55rem;padding:0 .3rem;}
.mk-opt{padding:.85rem .6rem;border-radius:14px;font-weight:800;font-size:.92rem;color:var(--text);
  background:var(--surface-1);border:2px solid var(--border);box-shadow:var(--shadow);transition:transform .15s,border-color .15s,background .15s;}
.mk-opt:hover:not(:disabled){border-color:color-mix(in srgb,var(--c1) 55%,transparent);transform:translateY(-2px);}
.mk-opt.chosen{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,var(--surface-1));}
.mk-opt.gone{opacity:.25;}
.mk-opt:disabled{cursor:default;}
.mk-waiting{grid-column:1 / -1;text-align:center;font-weight:800;color:var(--green);font-size:.85rem;margin-top:.2rem;}

.mk-reveal{max-width:380px;margin:0 auto;width:100%;display:flex;flex-direction:column;align-items:center;padding:0 .3rem;}
.mk-answer{font-family:var(--font-d);font-size:1.4rem;color:#fff;background:linear-gradient(135deg,var(--c1),var(--c2));
  padding:.5rem 1.4rem;border-radius:1rem;margin:.2rem 0 .8rem;box-shadow:0 8px 22px color-mix(in srgb,var(--c1) 40%,transparent);}
.mk-answer strong{font-weight:900;}
.mk-results{width:100%;display:flex;flex-direction:column;gap:.4rem;}
.mk-result{display:flex;align-items:center;gap:.5rem;background:var(--surface-1);border:1px solid var(--border);
  border-left:4px solid var(--accent);border-radius:12px;padding:.5rem .7rem;}
.mk-result.good{background:color-mix(in srgb,var(--green) 12%,var(--surface-1));}
.mk-r-name{font-weight:800;flex:1;color:var(--text);}
.mk-r-ans{font-size:.82rem;font-weight:700;color:var(--muted);}
.mk-r-gain{font-family:var(--font-d);font-size:.82rem;color:var(--green);background:color-mix(in srgb,var(--green) 16%,transparent);padding:.05rem .4rem;border-radius:999px;}
`;
