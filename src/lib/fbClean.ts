/* Firebase RTDB refuse toute valeur `undefined` (une seule suffit à faire
   échouer toute l'écriture). On les retire récursivement avant chaque écriture.
   `null` est conservé (Firebase l'interprète comme une suppression). */
export function stripUndefined<T>(v: T): T {
  if (Array.isArray(v)) return v.map(stripUndefined) as unknown as T;
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (val !== undefined) out[k] = stripUndefined(val);
    }
    return out as T;
  }
  return v;
}

/** true si la valeur contient au moins un `undefined` (ce que Firebase refuse). */
export function hasUndefined(v: unknown): boolean {
  if (v === undefined) return true;
  if (Array.isArray(v)) return v.some(hasUndefined);
  if (v && typeof v === "object") return Object.values(v as Record<string, unknown>).some(hasUndefined);
  return false;
}
