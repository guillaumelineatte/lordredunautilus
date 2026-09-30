// Petit bandeau affiché seulement sur la version de test (déploiements "preview"
// de Vercel), pour ne jamais la confondre avec le vrai site.
export function TestBanner() {
  if (process.env.VERCEL_ENV !== "preview") return null;
  return (
    <div
      role="note"
      style={{
        position: "fixed",
        left: 12,
        bottom: 12,
        zIndex: 2147483647,
        padding: "6px 12px",
        borderRadius: 999,
        background: "#f5b841",
        color: "#132438",
        font: "600 12px/1.2 system-ui, sans-serif",
        letterSpacing: "0.04em",
        pointerEvents: "none",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.35)",
      }}
    >
      Version de test
    </div>
  );
}
