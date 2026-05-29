import { useState } from "react";
import { C, S } from "../styles.js";

export default function Input({ label, as, children, ...props }) {
  const [focused, setFocused] = useState(false);
  const borderColor = focused ? C.accent : C.border;

  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={S.label}>{label}</label>}
      {as === "select" ? (
        <select
          {...props}
          style={{ ...S.input, borderColor }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        >
          {children}
        </select>
      ) : as === "textarea" ? (
        <textarea
          {...props}
          style={{ ...S.input, borderColor, resize: "vertical", minHeight: 70 }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      ) : (
        <input
          {...props}
          style={{ ...S.input, borderColor }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      )}
    </div>
  );
}
