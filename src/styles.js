// styles.js
// Stripe-inspired palette · SF Pro on iPhone · Inter fallback

export const DARK = {
  bg:          "#000000",   // pure black — iOS Stocks
  surface:     "#1c1c1e",   // iOS elevated surface
  elevated:    "#2c2c2e",   // Shortcuts card background
  border:      "#38383a",   // subtle separator
  borderLight: "#48484a",   // slightly more visible
  accent:      "#636af7",   // Stripe electric blue-purple
  accentDim:   "#4f56d9",   // pressed/dimmed accent
  green:       "#30d158",   // iOS system green
  red:         "#ff453a",   // iOS system red
  yellow:      "#ffd60a",   // iOS system yellow
  textPrimary:   "#ffffff", // pure white
  textSecondary: "#8e8e93", // iOS secondary label
  textMuted:     "#48484a", // iOS tertiary label
};

export const LIGHT = {
  bg:          "#f6f8fa",   // Stripe light background
  surface:     "#ffffff",   // pure white cards
  elevated:    "#f0f2f5",   // input/elevated surface
  border:      "#e3e8ee",   // Stripe border
  borderLight: "#eaecef",   // subtle border
  accent:      "#635bff",   // Stripe purple-blue
  accentDim:   "#4f49e8",   // pressed accent
  green:       "#09b274",   // Stripe green
  red:         "#df1b41",   // Stripe red
  yellow:      "#b45309",   // warm amber
  textPrimary:   "#0a2540", // Stripe deep navy text
  textSecondary: "#425466", // Stripe secondary text
  textMuted:     "#8898aa", // Stripe muted text
};

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

export function makeStyles(C) {
  return {
    app: {
      background:    C.bg,
      minHeight:     "100dvh",
      fontFamily:    FONT,
      color:         C.textPrimary,
      paddingBottom: "env(safe-area-inset-bottom)",
      paddingLeft:   "env(safe-area-inset-left)",
      paddingRight:  "env(safe-area-inset-right)",
    },
    header: {
      background:      C.surface,
      borderBottom:    `1px solid ${C.border}`,
      padding:         "14px 20px",
      paddingTop:      "calc(env(safe-area-inset-top) + 4px)",
      display:         "flex",
      justifyContent:  "space-between",
      alignItems:      "center",
    },
    nav: { display: "none" },
    navBtn: (active) => ({
      padding:       "12px 16px",
      background:    "none",
      border:        "none",
      borderBottom:  active ? `2px solid ${C.accent}` : "2px solid transparent",
      color:         active ? C.accent : C.textSecondary,
      cursor:        "pointer",
      fontSize:      11,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      fontFamily:    "inherit",
      whiteSpace:    "nowrap",
      transition:    "all 0.15s",
    }),
    content: {
      padding:   "20px",
      maxWidth:  900,
      margin:    "0 auto",
    },
    card: {
      background:   C.surface,
      border:       `1px solid ${C.border}`,
      borderRadius: 12,
      padding:      "16px 20px",
      marginBottom: 12,
    },
    cardTitle: {
      fontSize:      11,
      color:         C.accent,
      letterSpacing: "0.15em",
      textTransform: "uppercase",
      marginBottom:  14,
      fontWeight:    600,
    },
    input: {
      width:        "100%",
      background:   C.elevated,
      border:       `1px solid ${C.border}`,
      borderRadius: 8,
      padding:      "10px 12px",
      color:        C.textPrimary,
      fontSize:     14,
      fontFamily:   "inherit",
      outline:      "none",
      boxSizing:    "border-box",
      transition:   "border-color 0.15s",
    },
    label: {
      display:       "block",
      fontSize:      11,
      color:         C.textMuted,
      marginBottom:  5,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      fontWeight:    500,
    },
    btnPrimary: {
      background:    C.accent,
      border:        "none",
      borderRadius:  8,
      padding:       "11px 20px",
      color:         "#fff",
      fontSize:      13,
      fontWeight:    600,
      letterSpacing: "0.04em",
      cursor:        "pointer",
      fontFamily:    "inherit",
      transition:    "background 0.15s",
    },
    btnSecondary: {
      background:    C.elevated,
      border:        `1px solid ${C.border}`,
      borderRadius:  8,
      padding:       "11px 20px",
      color:         C.textSecondary,
      fontSize:      13,
      fontWeight:    500,
      letterSpacing: "0.04em",
      cursor:        "pointer",
      fontFamily:    "inherit",
      transition:    "background 0.15s",
    },
    btnDanger: {
      background:   "none",
      border:       `1px solid ${C.red}`,
      borderRadius: 8,
      padding:      "7px 14px",
      color:        C.red,
      fontSize:     12,
      cursor:       "pointer",
      fontFamily:   "inherit",
    },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
    grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
    stat: {
      background:   C.elevated,
      border:       `1px solid ${C.border}`,
      borderRadius: 12,
      padding:      "14px 16px",
    },
    statLabel: {
      fontSize:      10,
      color:         C.textMuted,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      marginBottom:  4,
      fontWeight:    500,
    },
    statValue: {
      fontSize:   24,
      fontWeight: 600,
      color:      C.textPrimary,
    },
    tag: (color) => ({
      display:      "inline-block",
      background:   color + "22",
      color:        color,
      border:       `1px solid ${color}44`,
      borderRadius: 6,
      padding:      "2px 8px",
      fontSize:     10,
      letterSpacing: "0.08em",
      fontWeight:   500,
    }),
    row: {
      display:        "flex",
      alignItems:     "center",
      justifyContent: "space-between",
      padding:        "11px 0",
      borderBottom:   `1px solid ${C.border}`,
    },
    sectionHead: {
      display:        "flex",
      justifyContent: "space-between",
      alignItems:     "center",
      marginBottom:   16,
    },
  };
}

export const C = DARK;
export const S = makeStyles(DARK);
