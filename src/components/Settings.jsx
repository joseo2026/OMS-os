import { useState, useEffect } from "react";
import { useTheme } from "../theme.jsx";
import { supabase } from "../helpers.js";
import Export from "./Export.jsx";

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
    seTaxRate:   saved?.seTaxRate   ?? 0.153,
    fedTaxRate:  saved?.fedTaxRate  ?? 0.22,
    flTax:       saved?.flTax       ?? 0.07,
  };
}

export default function Settings({ data }) {
  const { C, S, isDark, toggleTheme } = useTheme();
  const saved = loadSettings();
  const currentYear = new Date().getFullYear();

  const [mileageRate, setMileageRate] = useState(saved?.mileageRate ?? 0.725);
  const [seTaxRate,   setSeTaxRate]   = useState(saved?.seTaxRate   ?? 0.153);
  const [fedTaxRate,  setFedTaxRate]  = useState(saved?.fedTaxRate  ?? 0.22);
  const [flTax,       setFlTax]       = useState(saved?.flTax       ?? 0.07);
  const [savedMsg,    setSavedMsg]    = useState(false);
  const [saving,      setSaving]      = useState(false);

  // Export section year
  const [exportYear, setExportYear] = useState(currentYear);

  // Load current year rates from Supabase on mount
  useEffect(() => {
    async function fetchCurrentRates() {
      try {
        const { data: rows } = await supabase
          .from("tax_rates")
          .select("*")
          .eq("year", currentYear)
          .limit(1);

        if (rows && rows.length > 0) {
          const r = rows[0];
          const fetched = {
            mileageRate: Number(r.mileage_rate) || 0.725,
            seTaxRate:   Number(r.se_tax)        || 0.153,
            fedTaxRate:  Number(r.fed_tax)        || 0.22,
            flTax:       Number(r.sales_tax)      || 0.07,
          };
          // Sync localStorage with Supabase
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(fetched));
          setMileageRate(fetched.mileageRate);
          setSeTaxRate(fetched.seTaxRate);
          setFedTaxRate(fetched.fedTaxRate);
          setFlTax(fetched.flTax);
        }
      } catch (e) {
        // Fall back to localStorage values — already loaded in useState
      }
    }
    fetchCurrentRates();
  }, []);

  async function saveSettings() {
    setSaving(true);
    const settings = { mileageRate, seTaxRate, fedTaxRate, flTax };

    // Save to localStorage for immediate app use
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

    // Save to Supabase with current year stamp
    try {
      const { data: existing } = await supabase
        .from("tax_rates")
        .select("id")
        .eq("year", currentYear)
        .limit(1);

      if (existing && existing.length > 0) {
        // Update existing row for this year
        await supabase
          .from("tax_rates")
          .update({
            mileage_rate: mileageRate,
            se_tax:       seTaxRate,
            fed_tax:      fedTaxRate,
            sales_tax:    flTax,
          })
          .eq("year", currentYear);
      } else {
        // Insert new row for this year
        await supabase
          .from("tax_rates")
          .insert({
            year:         currentYear,
            mileage_rate: mileageRate,
            se_tax:       seTaxRate,
            fed_tax:      fedTaxRate,
            sales_tax:    flTax,
          });
      }
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2500);
    } catch (e) {
      alert("Failed to save to database: " + e.message);
    }
    setSaving(false);
  }

  const inputStyle = {
    ...S.input,
    width:     "90px",
    textAlign: "right",
    padding:   "8px 10px",
    fontSize:  14,
  };

  return (
    <div>

      {/* Appearance */}
      <div style={S.card}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, marginBottom: 14 }}>
          Appearance
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
          <div>
            <div style={{ fontSize: 14, color: C.textPrimary, fontWeight: 500, marginBottom: 2 }}>Theme</div>
            <div style={{ fontSize: 12, color: C.textMuted }}>
              {isDark ? "Dark mode" : "Light mode"}
            </div>
          </div>
         <button
            onClick={toggleTheme}
            style={{
              ...S.btnPrimary,
              padding:      "9px 18px",
              fontSize:     13,
            }}
          >
            {isDark ? "Switch to Light" : "Switch to Dark"}
          </button>
        </div>
      </div>

      {/* Tax & Rate Settings */}
      <div style={S.card}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
          Tax & Rate Settings
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>
          Rates saved for <span style={{ color: C.accent, fontWeight: 600 }}>{currentYear}</span> — update each January when IRS announces new rates.
        </div>

        {[
          {
            label:    "IRS Mileage Rate",
            sublabel: "Per mile business deduction",
            value:    mileageRate,
            setter:   v => setMileageRate(parseFloat(v)),
            prefix:   "$",
            suffix:   "/mi",
            step:     "0.001",
            display:  mileageRate,
          },
          {
            label:    "Self-Employment Tax",
            sublabel: "Currently 15.3% — rarely changes",
            value:    (seTaxRate * 100).toFixed(1),
            setter:   v => setSeTaxRate(parseFloat(v) / 100),
            prefix:   "",
            suffix:   "%",
            step:     "0.1",
          },
          {
            label:    "Federal Income Tax Est.",
            sublabel: "Based on your tax bracket",
            value:    (fedTaxRate * 100).toFixed(0),
            setter:   v => setFedTaxRate(parseFloat(v) / 100),
            prefix:   "",
            suffix:   "%",
            step:     "1",
          },
          {
            label:    "Florida Sales Tax",
            sublabel: "Applied to parts only",
            value:    (flTax * 100).toFixed(0),
            setter:   v => setFlTax(parseFloat(v) / 100),
            prefix:   "",
            suffix:   "%",
            step:     "0.1",
          },
        ].map(({ label, sublabel, value, setter, prefix, suffix, step }) => (
          <div key={label} style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            padding:        "13px 0",
            borderBottom:   `1px solid ${C.border}`,
          }}>
            <div>
              <div style={{ fontSize: 14, color: C.textPrimary, fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{sublabel}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {prefix && <span style={{ fontSize: 13, color: C.textSecondary }}>{prefix}</span>}
              <input
                type="number"
                step={step}
                value={value}
                onChange={e => setter(e.target.value)}
                style={inputStyle}
              />
              {suffix && <span style={{ fontSize: 13, color: C.textSecondary }}>{suffix}</span>}
            </div>
          </div>
        ))}

        <button
          onClick={saveSettings}
          disabled={saving}
          style={{ ...S.btnPrimary, width: "100%", marginTop: 18, padding: "14px 0", fontSize: 15 }}
        >
          {saving ? "Saving..." : savedMsg ? "✓ Saved to " + currentYear : `Save ${currentYear} Rate Settings`}
        </button>

        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 10, textAlign: "center" }}>
          IRS announces new mileage rates each December at irs.gov
        </div>
      </div>

      {/* Annual Export */}
      <div style={S.card}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
          Annual Report
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>
          Generate and share your CPA-ready PDF tax summary. Uses the tax rates saved for that year.
        </div>
        <Export
          data={data || { jobs: [], expenses: [], mileage: [] }}
          year={exportYear}
          onYearChange={setExportYear}
        />
      </div>

    </div>
  );
}
