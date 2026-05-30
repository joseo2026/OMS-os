import { useTheme } from "../theme.jsx";

export default function Modal({ title, onClose, children }) {
  const { C } = useTheme();
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
      <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 10, width: "100%", maxWidth: 560, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: C.accent, letterSpacing: "0.12em", textTransform: "uppercase" }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textSecondary, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
