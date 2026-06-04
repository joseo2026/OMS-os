import { useTheme } from "../theme.jsx";
import { createPortal } from "react-dom";

export default function Modal({ title, onClose, children }) {
  const { C } = useTheme();
  return createPortal(
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      background: "#000a",
      zIndex: 500,
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      overflowY: "auto",
      paddingTop: "env(safe-area-inset-top)",
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        width: "100%",
        maxWidth: 560,
        margin: "16px",
        padding: 24,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: C.accent, letterSpacing: "0.12em", textTransform: "uppercase" }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textSecondary, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>,
    document.getElementById("modal-root")
  );
}
