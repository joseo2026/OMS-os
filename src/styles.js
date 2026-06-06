// styles.js
// Dark: Reddit-inspired navy-tinted black · Light: Stripe · Helvetica Neue

export const DARK = {
  bg:          "#0f1419",   // Reddit dark — navy-tinted black, warmer than pure black
  surface:     "#1a1e23",   // card background — lifts naturally from bg
  elevated:    "#252a30",   // inputs, nested elements
  border:      "#2f3336",   // very subtle — used minimally
  borderLight: "#3d4449",   // slightly more visible when needed
  accent:      "#636af7",   // blue-purple — used sparingly
  accentDim:   "#4f56d9",   // pressed/dimmed accent
  green:       "#30d158",   // iOS system green
  red:         "#ff453a",   // iOS system red
  yellow:      "#ffd60a",   // iOS system yellow
  textPrimary:   "#f7f9f9", // Reddit near-white — softer than pure white
  textSecondary: "#8b98a5", // Reddit metadata gray — readable, not harsh
  textMuted:     "#536471", // Reddit timestamp gray — subtle
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

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

// Dark mode card shadow — creates depth without borders
const DARK_SHADOW = "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)";
const LIGHT_SHADOW = "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)";

export function makeStyles(C, isDark = true) {
  const shadow = isDark ? DARK_SHADOW : LIGHT_SHADOW;
  // Dark mode — no borders, shadow creates depth
  // Light mode — subtle border + shadow
  const cardBorder = isDark ? "none" : `1px solid ${C.border}`;

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
      background:     C.surface,
      borderBottom:   isDark ? "none" : `1px solid ${C.border}`,
      boxShadow:      isDark ? "0 1px 0 rgba(255,255,255,0.04)" : LIGHT_SHADOW,
      padding:        "12px 20px",
      paddingTop:     "calc(env(safe-area-inset-top) + 4px)",
      display:        "flex",
      justifyContent: "space-between",
      alignItems:     "center",
    },
    nav: { display: "none" },
    navBtn: (active) => ({
      padding:       "10px 16px",
      background:    "none",
      border:        "none",
      borderBottom:  active ? `2px solid ${C.accent}` : "2px solid transparent",
      color:         active ? C.accent : C.textMuted,
      cursor:        "pointer",
      fontSize:      10,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      fontFamily:    "inherit",
      whiteSpace:    "nowrap",
      transition:    "all 0.15s",
      fontWeight:    active ? 600 : 400,
    }),
    content: {
      padding:  "16px 20px",
      maxWidth: 900,
      margin:   "0 auto",
    },
    card: {
      background:   C.surface,
      border:       cardBorder,
      borderRadius: 14,
      padding:      "16px 18px",
      marginBottom: 10,
      boxShadow:    shadow,
    },
    cardTitle: {
      fontSize:     13,
      color:        C.textSecondary,
      marginBottom: 12,
      fontWeight:   600,
      letterSpacing: 0,
      textTransform: "none",
    },
    input: {
      width:        "100%",
      background:   C.elevated,
      border:       `1px solid ${C.border}`,
      borderRadius: 10,
      padding:      "11px 14px",
      color:        C.textPrimary,
      fontSize:     15,
      fontFamily:   "inherit",
      outline:      "none",
      boxSizing:    "border-box",
      transition:   "border-color 0.15s",
    },
    label: {
      display:       "block",
      fontSize:      12,
      color:         C.textSecondary,
      marginBottom:  6,
      fontWeight:    500,
      textTransform: "none",
      letterSpacing: 0,
    },
    btnPrimary: {
      background:    C.accent,
      border:        "none",
      borderRadius:  10,
      padding:       "13px 20px",
      color:         "#fff",
      fontSize:      15,
      fontWeight:    600,
      cursor:        "pointer",
      fontFamily:    "inherit",
      transition:    "opacity 0.15s",
      letterSpacing: 0,
    },
    btnSecondary: {
      background:    C.elevated,
      border:        `1px solid ${C.border}`,
      borderRadius:  10,
      padding:       "13px 20px",
      color:         C.textSecondary,
      fontSize:      15,
      fontWeight:    500,
      cursor:        "pointer",
      fontFamily:    "inherit",
      transition:    "opacity 0.15s",
      letterSpacing: 0,
    },
    btnDanger: {
      background:   "none",
      border:       `1px solid ${C.red}`,
      borderRadius: 10,
      padding:      "8px 16px",
      color:        C.red,
      fontSize:     13,
      cursor:       "pointer",
      fontFamily:   "inherit",
    },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
    grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
    stat: {
      background:   C.surface,
      border:       cardBorder,
      borderRadius: 14,
      padding:      "16px 18px",
      boxShadow:    shadow,
    },
    statLabel: {
      fontSize:      11,
      color:         C.textSecondary,
      marginBottom:  6,
      fontWeight:    500,
      textTransform: "none",
      letterSpacing: 0,
    },
    statValue: {
      fontSize:   26,
      fontWeight: 500,
      color:      C.textPrimary,
      letterSpacing: "-0.5px",
    },
    tag: (color) => ({
      display:      "inline-block",
      background:   color + "22",
      color:        color,
      border:       `1px solid ${color}33`,
      borderRadius: 6,
      padding:      "3px 8px",
      fontSize:     11,
      fontWeight:   500,
    }),
    row: {
      display:        "flex",
      alignItems:     "center",
      justifyContent: "space-between",
      padding:        "13px 0",
      borderBottom:   `1px solid ${C.border}`,
    },
    sectionHead: {
      display:        "flex",
      justifyContent: "space-between",
      alignItems:     "center",
      marginBottom:   14,
    },
    // Section label — plain bold, no all-caps, no accent color
    sectionLabel: {
      fontSize:   17,
      fontWeight: 700,
      color:      C.textPrimary,
      marginBottom: 12,
    },
    // Sub-navigation tabs — underline style
    subTab: (active) => ({
      padding:       "10px 4px",
      background:    "none",
      border:        "none",
      borderBottom:  active ? `2px solid ${C.accent}` : "2px solid transparent",
      color:         active ? C.accent : C.textSecondary,
      cursor:        "pointer",
      fontSize:      13,
      fontWeight:    active ? 600 : 400,
      fontFamily:    "inherit",
      whiteSpace:    "nowrap",
      transition:    "all 0.15s",
      marginRight:   20,
    }),
  };
}

export const C = DARK;
export const S = makeStyles(DARK, true);
