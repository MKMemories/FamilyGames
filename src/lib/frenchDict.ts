/** Dictionnaire français local pour « Mot pour Mot » : validation instantanée
 *  (coloriage rouge/vert à la saisie) et suggestion d'un mot jouable depuis le
 *  chevalet. Le mot-liste (public/dict_fr.txt) est normalisé MAJUSCULES + sans
 *  accents, longueurs 2–8, et chargé une seule fois puis mis en cache. */

let cache: Set<string> | null = null;
let inflight: Promise<Set<string>> | null = null;

/** MAJUSCULES, accents retirés, lettres A–Z uniquement (comme les tuiles). */
export function normalizeWord(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z]/g, "");
}

/** Charge le dictionnaire (une fois). En cas d'échec réseau → set vide (on
 *  laisse alors passer les mots pour ne pas bloquer le jeu). */
export function loadFrenchDict(): Promise<Set<string>> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL || "/";
  inflight = fetch(base + "dict_fr.txt")
    .then((r) => r.text())
    .then((txt) => { cache = new Set(txt.split("\n").filter(Boolean)); return cache; })
    .catch(() => { cache = new Set(); return cache!; });
  return inflight;
}

/** Injecte un dictionnaire (préchargement / tests). */
export function primeFrenchDict(set: Set<string>) { cache = set; }

export function isValidWord(dict: Set<string> | null, word: string): boolean {
  const w = normalizeWord(word);
  if (w.length < 2) return false;
  if (!dict || dict.size === 0) return true; // dictionnaire indisponible → on autorise
  return dict.has(w);
}

/** Cherche le meilleur mot (score Scrabble) formable avec les lettres du
 *  chevalet, et renvoie les indices des tuiles à sélectionner, dans l'ordre. */
export function suggestFromRack(
  dict: Set<string> | null,
  rack: string[],
  letterVals: Record<string, number>,
): { word: string; indices: number[]; score: number } | null {
  if (!dict || dict.size === 0) return null;
  const rackCount: Record<string, number> = {};
  rack.forEach((l) => { rackCount[l] = (rackCount[l] || 0) + 1; });

  let best: string | null = null;
  let bestScore = -1;
  for (const w of dict) {
    if (w.length < 2 || w.length > rack.length) continue;
    const need: Record<string, number> = {};
    let ok = true;
    for (const ch of w) {
      need[ch] = (need[ch] || 0) + 1;
      if (need[ch] > (rackCount[ch] || 0)) { ok = false; break; }
    }
    if (!ok) continue;
    let score = 0;
    for (const ch of w) score += letterVals[ch] || 0;
    if (score > bestScore) { bestScore = score; best = w; }
  }
  if (!best) return null;

  const used = new Array(rack.length).fill(false);
  const indices: number[] = [];
  for (const ch of best) {
    const i = rack.findIndex((l, idx) => !used[idx] && l === ch);
    if (i < 0) return null;
    used[i] = true;
    indices.push(i);
  }
  return { word: best, indices, score: bestScore };
}
