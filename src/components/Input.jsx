import { useState } from "react";
import { useTheme } from "../theme.jsx";

export default function Input({ label, as, children, onFocus: extFocus, onBlur: extBlur, ...props }) {
  const { C, S } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = focused ? C.accent : C.border;

  const handleFocus = (e) => { setFocused(true); extFocus?.(e); };
  const handleBlur  = (e) => { setFocused(false); extBlur?.(e); };

  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={S.label}>{label}</label>}
      {as === "select" ? (
        <select
          {...props}
          style={{ ...S.input, borderColor }}
          onFocus={handleFocus}
          onBlur={handleBlur}
        >
          {children}
        </select>
      ) : as === "textarea" ? (
        <textarea
          {...props}
          style={{ ...S.input, borderColor, resize: "vertical", minHeight: 70 }}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      ) : (
        <input
          {...props}
          style={{ ...S.input, borderColor }}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      )}
    </div>
  );
}
