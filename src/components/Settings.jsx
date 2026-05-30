import { useTheme } from "../theme.jsx";

const TOGGLEABLE_TABS = [
  { key: "New Job",      desc: "Job creation wizard" },
  { key: "Jobs",         desc: "Job history & receipts" },
  { key: "Customers",    desc: "Customer database" },
  { key: "Expenses",     desc: "Expense tracking" },
  { key: "Mileage",      desc: "IRS mileage log" },
  { key: "Appointments", desc: "Appointment scheduling" },
  { key: "Export",       desc: "Reports & Excel export" },
];

function Toggle({ on, onToggle, disabled }) {
  const { C } = useTheme();
  return (
    <div
      onClick={disabled ? undefined : onToggle}
      style={{
        width: 40, height: 22, borderRadius: 11,
        background: on ? C.accent : C.elevated,
        border: `1px solid ${on ? C.accent : C.border}`,
        position: "relative", cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.2s, border-color 0.2s",
        flexShrink: 0,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <div style={{
        position: "absolute", top: 2,
        left: on ? 20 : 2,
        width: 16, height: 16, borderRadius: "50%",
        background: on ? "#fff" : C.textMuted,
        transition: "left 0.2s",
      }} />
    </div>
  );
}

export default function Settings({ tabVisibility, setTabVisibility }) {
  const { C, S, isDark, toggleTheme } = useTheme();

  function toggleTab(key) {
    setTabVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div>
      <div style={S.card}>
        <div style={S.cardTitle}>Appearance</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
          <div>
            <div style={{ fontSize: 13, color: C.textPrimary, marginBottom: 2 }}>Theme</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>
              {isDark ? "Dark mode — ChatGPT black" : "Light mode — clean white"}
            </div>
          </div>
          <button
            onClick={toggleTheme}
            style={{
              background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 6,
              padding: "8px 16px", color: C.textPrimary, fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em",
              minWidth: 110,
            }}
          >
            {isDark ? "Switch to Light" : "Switch to Dark"}
          </button>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>Navigation Tabs</div>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 14 }}>
          Toggle tabs on or off to keep your navigation focused. Dashboard is always visible.
        </div>
        {TOGGLEABLE_TABS.map(({ key, desc }) => {
          const isOn = tabVisibility[key] !== false;
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 13, color: isOn ? C.textPrimary : C.textMuted, fontWeight: isOn ? 500 : 400 }}>{key}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{desc}</div>
              </div>
              <Toggle on={isOn} onToggle={() => toggleTab(key)} />
            </div>
          );
        })}
      </div>

      <div style={{ ...S.card, marginTop: 4 }}>
        <div style={S.cardTitle}>About</div>
        <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.7 }}>
          <div>Ocasio Mechanical Services LLC</div>
          <div style={{ color: C.textMuted }}>Mobile Automotive Service · Florida</div>
          <div style={{ color: C.textMuted, marginTop: 6 }}>FL Sales Tax: 7% · IRS Mileage: $0.70/mi</div>
          <div style={{ color: C.textMuted }}>SE Tax: 15.3% · Federal: 22%</div>
        </div>
      </div>
    </div>
  );
}
