/* ══════════════════════════════════════════════════════════════════════════
   LE MOT MYSTÈRE — deviner un mot caché de 5 lettres avec indices de couleur
   (vert : bien placé · jaune : présent mal placé · gris : absent). Mécanique
   originale, mots français courants (sans accent → clavier simple, familial).
   ══════════════════════════════════════════════════════════════════════════ */

export const WM_LEN = 5;

/* Mots-solutions : 5 lettres, sans accent, connus des enfants. */
export const WM_SOLUTIONS: string[] = [
  "ARBRE", "TABLE", "CHIEN", "PORTE", "LIVRE", "POMME", "PLAGE", "ROUTE", "FLEUR", "NUAGE",
  "SUCRE", "PLUME", "TIGRE", "ZEBRE", "KOALA", "PANDA", "PIZZA", "SALON", "LAMPE", "ROBOT",
  "AVION", "TRAIN", "BALLE", "VILLE", "NEIGE", "GLACE", "CADRE", "VERRE", "BOITE", "ROUGE",
  "MONDE", "CANNE", "RONDE", "CARRE", "GRAND", "PETIT", "LARGE", "COURT", "MARIN", "PLUIE",
  "TERRE", "POIRE", "DATTE", "MELON", "VACHE", "SINGE", "LAPIN", "HIBOU", "AIGLE", "STYLO",
  "GOMME", "REGLE", "CARTE", "RADIO", "PIANO", "FLUTE", "VERTE", "JAUNE", "NOIRE", "BLEUE",
  "BLANC", "BRUNE", "ORAGE", "VAGUE", "SABLE", "ROCHE", "FORET", "CREPE", "FRITE", "SAUCE",
  "SOUPE", "VOILE", "DANSE", "CHANT", "VESTE", "BOTTE", "METRO", "RUCHE", "BIJOU", "PERLE",
  "CLOWN", "MAGIE", "CYGNE", "RENNE", "GUEPE", "CRABE", "MOULE", "ROULE", "SAUTE", "CRAIE",
  "OASIS", "HERBE", "GRAIN", "PATTE", "QUEUE", "MUSEE", "PONEY", "OURSE", "PHARE", "ALGUE",
  "PATES", "TARTE", "CACAO", "SIROP", "MIMER", "JOUER", "CIDRE", "RADIS", "NAVET", "OLIVE",
  "CROIX", "JUPES", "MOTOS", "VELOS", "TAXIS", "ROSES", "LILAS", "LIONS", "LOUPE", "LUNES",
  "NUITS", "MATIN", "AUBES", "SEVES", "MAINS",
].filter((w, i, a) => w.length === WM_LEN && /^[A-Z]+$/.test(w) && a.indexOf(w) === i);

/* Couleurs d'un essai vs solution : "g" bien placé, "y" présent, "x" absent. */
export function scoreGuess(guess: string, sol: string): ("g" | "y" | "x")[] {
  const g = guess.toUpperCase(), s = sol.toUpperCase();
  const res: ("g" | "y" | "x")[] = Array(g.length).fill("x");
  const left: Record<string, number> = {};
  for (let i = 0; i < s.length; i++) { if (g[i] === s[i]) res[i] = "g"; else left[s[i]] = (left[s[i]] || 0) + 1; }
  for (let i = 0; i < g.length; i++) {
    if (res[i] === "g") continue;
    if (left[g[i]] > 0) { res[i] = "y"; left[g[i]]--; }
  }
  return res;
}

/** État agrégé du clavier (meilleure info connue par lettre). */
export function keyStates(guesses: string[], sol: string): Record<string, "g" | "y" | "x"> {
  const rank = { x: 0, y: 1, g: 2 } as const;
  const out: Record<string, "g" | "y" | "x"> = {};
  for (const gz of guesses) {
    const sc = scoreGuess(gz, sol);
    for (let i = 0; i < gz.length; i++) {
      const l = gz[i].toUpperCase(), st = sc[i];
      if (!out[l] || rank[st] > rank[out[l]]) out[l] = st;
    }
  }
  return out;
}

export function pickWord(used: number[], recent: Set<string>, rnd: () => number = Math.random): { word: string; idx: number } {
  let pool = WM_SOLUTIONS.map((w, i) => ({ w, i })).filter(x => !used.includes(x.i) && !recent.has(x.w));
  if (pool.length === 0) pool = WM_SOLUTIONS.map((w, i) => ({ w, i })).filter(x => !used.includes(x.i));
  if (pool.length === 0) pool = WM_SOLUTIONS.map((w, i) => ({ w, i }));
  const c = pool[Math.floor(rnd() * pool.length)];
  return { word: c.w, idx: c.i };
}
