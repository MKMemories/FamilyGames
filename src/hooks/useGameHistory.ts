/**
 * Generic game-history utility (FIFO, max 10 sessions).
 * Tracks item IDs/names that were played recently to avoid repeats.
 *
 * Usage:
 *   const history = gameHistory("justeprix");
 *   const fresh = products.filter(p => !history.isUsed(String(p.id)));
 *   history.saveSession(["42", "17"]);
 */

const KEY_PREFIX = "khelij_history_";
const MAX_SESSIONS = 10;

interface HistoryStore {
  sessions: string[][];   // newest first
}

function load(gameId: string): HistoryStore {
  try {
    return JSON.parse(localStorage.getItem(KEY_PREFIX + gameId) || '{"sessions":[]}');
  } catch {
    return { sessions: [] };
  }
}

function save(gameId: string, store: HistoryStore) {
  localStorage.setItem(KEY_PREFIX + gameId, JSON.stringify(store));
}

export function gameHistory(gameId: string) {
  /** All IDs/names played across the last MAX_SESSIONS sessions */
  function getUsedSet(): Set<string> {
    const s = new Set<string>();
    load(gameId).sessions.forEach(sess => sess.forEach(id => s.add(id)));
    return s;
  }

  /** Returns true if this item was played in a recent session */
  function isUsed(id: string): boolean {
    return getUsedSet().has(id);
  }

  /**
   * Record a new session of played items.
   * Automatically evicts the oldest session if we exceed MAX_SESSIONS.
   */
  function saveSession(ids: string[]) {
    if (!ids.length) return;
    const store = load(gameId);
    store.sessions.unshift(ids);
    store.sessions = store.sessions.slice(0, MAX_SESSIONS);
    save(gameId, store);
  }

  /** How many sessions have been recorded */
  function sessionCount(): number {
    return load(gameId).sessions.length;
  }

  return { getUsedSet, isUsed, saveSession, sessionCount };
}
