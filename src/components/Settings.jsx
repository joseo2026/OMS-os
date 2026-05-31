import { useState } from "react";
import { useTheme } from "../theme.jsx";

const TOGGLEABLE_TABS = [
  { key: "Records", desc: "Customers, jobs, expenses & mileage" },
  { key: "Export",  desc: "Reports & Excel export" },
];

const SETTINGS_KEY = "oms-settings-v1";

function loadSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function getAppSettings() {
  const saved = loadSettings();
  return {
    mileageRate: saved?.mileageRate ?? 0.725,
    seTaxRate: saved?.seTaxRate ?? 0.153,
    fedTaxRate: saved?.fedTaxRate ?? 0.22,
    flTax: saved?.flTax ?? 0.07,
  };
}

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
  const saved = loadSettings();

  const [mileageRate, setMileageRate] = useState(saved?.mileageRate ?? 0.725);
  const [seTaxRate, setSeTaxRate] = useState(saved?.seTaxRate ?? 0.153);
  const [fedTaxRate, setFedTaxRate] = useState(saved?.fedTaxRate ?? 0.22);
  const [flTax, setFlTax] = useState(saved?.flTax ?? 0.07);
  const [savedMsg, setSavedMsg] = useState(false);

  function toggleTab(key) {
    setTabVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function saveSettings() {
    const settings = { mileageRate, seTaxRate, fedTaxRate, flTax };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  }

  const inputStyle = {
    ...S.input,
    width: "100px",
    textAlign: "right",
  };

  return (
    <div>

      {/* Appearance */}
      <div style={S.card}>
        <div style={S.cardTitle}>Appearance</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
          <div>
            <div style={{ fontSize: 13, color: C.textPrimary, marginBottom: 2 }}>Theme</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>
              {isDark ? "Dark mode" : "Light mode"}
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

      {/* Navigation Tabs */}
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

      {/* Tax & Rates */}
      <div style={S.card}>
        <div style={S.cardTitle}>Tax & Rate Settings</div>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 14 }}>
          Update these each January when the IRS announces new rates. Changes apply immediately across the entire app.
        </div>

        {[
          { label: "IRS Mileage Rate", sublabel: "Per mile business deduction", value: mileageRate, setter: setMileageRate, prefix: "$", suffix: "/mi", step: "0.001" },
          { label: "Self-Employment Tax", sublabel: "Currently 15.3% — rarely changes", value: (seTaxRate * 100).toFixed(1), setter: v => setSeTaxRate(parseFloat(v) / 100), prefix: "", suffix: "%", step: "0.1" },
          { label: "Federal Income Tax Est.", sublabel: "Based on your tax bracket", value: (fedTaxRate * 100).toFixed(0), setter: v => setFedTaxRate(parseFloat(v) / 100), prefix: "", suffix: "%", step: "1" },
          { label: "Florida Sales Tax", sublabel: "Applied to parts only", value: (flTax * 100).toFixed(0), setter: v => setFlTax(parseFloat(v) / 100), prefix: "", suffix: "%", step: "0.1" },
        ].map(({ label, sublabel, value, setter, prefix, suffix, step }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
            <div>
              <div style={{ fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{sublabel}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {prefix && <span style={{ fontSize: 12, color: C.textSecondary }}>{prefix}</span>}
              <input
                type="number"
                step={step}
                value={value}
                onChange={e => setter(e.target.value)}
                style={inputStyle}
              />
              {suffix && <span style={{ fontSize: 12, color: C.textSecondary }}>{suffix}</span>}
            </div>
          </div>
        ))}

        <button
          onClick={saveSettings}
          style={{ ...S.btnPrimary, width: "100%", marginTop: 16 }}
        >
          {savedMsg ? "✓ Saved" : "Save Rate Settings"}
        </button>

        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 10, textAlign: "center" }}>
          IRS announces new mileage rates each December at irs.gov
        </div>
      </div>

      {/* About */}
      <div style={{ ...S.card, marginTop: 4 }}>
        <div style={S.cardTitle}>About</div>
        <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.7 }}>
          <div>Ocasio Mechanical Services LLC</div>
          <div style={{ color: C.textMuted }}>Mobile Automotive Service · Florida</div>
          <div style={{ color: C.textMuted, marginTop: 6 }}>
            FL Sales Tax: {(flTax * 100).toFixed(0)}% · IRS Mileage: ${mileageRate}/mi
          </div>
          <div style={{ color: C.textMuted }}>
            SE Tax: {(seTaxRate * 100).toFixed(1)}% · Federal Est: {(fedTaxRate * 100).toFixed(0)}%
          </div>
        </div>
      </div>

    </div>
  );
}
