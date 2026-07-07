import { Component, type ReactNode, type ErrorInfo } from "react";

/* Filet de sécurité global : empêche l'écran blanc « bloqué ».
   - Une erreur de chargement de module (chunk périmé après un déploiement) →
     rechargement automatique une seule fois pour récupérer les nouveaux assets.
   - Toute autre erreur → écran de secours lisible avec bouton « Recharger ». */

interface Props { children: ReactNode; }
interface State { error: Error | null; info: ErrorInfo | null; }

/** Nom du 1er composant de la pile (le composant fautif) → aide au diagnostic. */
const firstComponent = (info: ErrorInfo | null): string | null => {
  const stack = info?.componentStack || "";
  const m = stack.match(/at\s+([A-Za-z0-9_]+)/) || stack.match(/^\s*([A-Za-z0-9_]+)@/m);
  return m ? m[1] : null;
};

const isChunkError = (e: unknown): boolean => {
  const m = (e instanceof Error ? e.message : String(e || "")).toLowerCase();
  return (
    m.includes("dynamically imported module") ||
    m.includes("failed to fetch dynamically") ||
    m.includes("importing a module script failed") ||
    m.includes("loading chunk") ||
    m.includes("error loading") ||
    m.includes("failed to import")
  );
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info });
    // Chunk périmé : on tente un rechargement unique (garde anti-boucle).
    if (isChunkError(error)) {
      try {
        const KEY = "khelij_chunk_reload";
        if (!sessionStorage.getItem(KEY)) {
          sessionStorage.setItem(KEY, String(Date.now()));
          window.location.reload();
          return;
        }
      } catch { /* sessionStorage indisponible : on montre le secours */ }
    }
  }

  reset = () => {
    try { sessionStorage.removeItem("khelij_chunk_reload"); } catch { /* ignore */ }
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      const chunk = isChunkError(this.state.error);
      return (
        <div className="screen" style={{ display: "grid", placeItems: "center", padding: "1.5rem", textAlign: "center" }}>
          <div style={{ maxWidth: 340, display: "flex", flexDirection: "column", alignItems: "center", gap: ".9rem" }}>
            <div style={{ fontSize: "2.8rem" }} aria-hidden>🎲</div>
            <h2 style={{ fontFamily: "var(--font-d)", fontSize: "1.35rem", color: "var(--text)", margin: 0 }}>
              {chunk ? "Mise à jour disponible" : "Oups, un petit pépin"}
            </h2>
            <p style={{ color: "var(--muted)", fontWeight: 700, fontSize: ".92rem", margin: 0, lineHeight: 1.5 }}>
              {chunk
                ? "Une nouvelle version du salon de jeux vient de sortir. Recharge pour continuer à jouer."
                : "Le jeu a rencontré un souci d'affichage. Un rechargement remet tout d'aplomb."}
            </p>
            <button className="btn btn-primary" style={{ marginTop: ".4rem", minWidth: 180 }} onClick={this.reset}>
              🔄 Recharger
            </button>
            {!chunk && (
              <div style={{ marginTop: ".6rem", width: "100%", fontSize: ".68rem", color: "var(--muted)", fontFamily: "var(--mono, ui-monospace, monospace)", textAlign: "left", background: "var(--surface-2, rgba(0,0,0,.05))", border: "1px solid var(--border)", borderRadius: 10, padding: ".55rem .65rem", wordBreak: "break-word", lineHeight: 1.45 }}>
                <strong>{firstComponent(this.state.info) || "?"}</strong> — {this.state.error.message}
              </div>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
