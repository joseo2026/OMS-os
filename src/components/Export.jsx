import { useState, useMemo } from "react";
import { C, S } from "../styles.js";
import { fmt } from "../helpers.js";
import { SE_TAX_RATE, FED_TAX_RATE, MILEAGE_RATE } from "../constants.js";

function getPresetRange(preset) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (preset) {
    case "this_month":
      return {
        from: new Date(y, m, 1).toISOString().slice(0, 10),
        to: new Date(y, m + 1, 0).toISOString().slice(0, 10),
      };
    case "last_month": {
      const lm = m === 0 ? 11 : m - 1;
      const ly = m === 0 ? y - 1 : y;
      return {
        from: new Date(ly, lm, 1).toISOString().slice(0, 10),
        to: new Date(ly, lm + 1, 0).toISOString().slice(0, 10),
      };
    }
    case "this_quarter": {
      const q = Math.floor(m / 3);
      return {
        from: new Date(y, q * 3, 1).toISOString().slice(0, 10),
        to: new Date(y, q * 3 + 3, 0).toISOString().slice(0, 10),
      };
    }
    case "last_quarter": {
      const q = Math.floor(m / 3);
      const lq = q === 0 ? 3 : q - 1;
      const lqy = q === 0 ? y - 1 : y;
      return {
        from: new Date(lqy, lq * 3, 1).toISOString().slice(0, 10),
        to: new Date(lqy, lq * 3 + 3, 0).toISOString().slice(0, 10),
      };
    }
    case "this_year":
      return {
        from: `${y}-01-01`,
        to: `${y}-12-31`,
      };
    case "last_year":
      return {
        from: `${y - 1}-01-01`,
        to: `${y - 1}-12-31`,
      };
    default:
      return null;
  }
}

function downloadCSV(filename, rows) {
  const escape = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const csv = rows.map(r => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const PRESETS = [
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "this_quarter", label: "This Quarter" },
  { key: "last_quarter", label: "Last Quarter" },
  { key: "this_year", label: "This Year" },
  { key: "last_year", label: "Last Year" },
  { key: "custom", label: "Custom" },
];

export default function Export({ data }) {
  const [preset, setPreset] = useState("this_year");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [printMode, setPrintMode] = useState(false);

  const range = preset === "custom"
    ? { from: customFrom, to: customTo }
    : getPresetRange(preset);

  const { from, to } = range || { from: "", to: "" };

  const inRange = (date) => {
    if (!date) return false;
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  };

  const jobs = useMemo(() => (data.jobs || []).filter(j => inRange(j.date)), [data.jobs, from, to]);
  const expenses = useMemo(() => (data.expenses || []).filter(e => inRange(e.date)), [data.expenses, from, to]);
  const mileage = useMemo(() => (data.mileage || []).filter(m => inRange(m.date)), [data.mileage, from, to]);

  const totalRevenue = jobs.reduce((s, j) => s + Number(j.grandTotal || 0), 0);
  const totalLabor = jobs.reduce((s, j) => s + Number(j.labor || 0), 0);
  const totalParts = jobs.reduce((s, j) => s + Number(j.parts || 0), 0);
  const totalTax = jobs.reduce((s, j) => s + Number(j.tax || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalMiles = mileage.reduce((s, m) => s + Number(m.miles || 0), 0);
  const mileageDeduction = totalMiles * MILEAGE_RATE;
  const netProfit = totalRevenue - totalExpenses;
  const taxableIncome = Math.max(0, netProfit - mileageDeduction);
  const seTax = Math.max(0, netProfit) * SE_TAX_RATE;
  const fedTax = Math.max(0, netProfit) * FED_TAX_RATE;
  const totalTaxEst = seTax + fedTax;

  function exportJobs() {
    const headers = ["Job #", "Date", "Customer", "Phone", "Email", "Address", "City", "ZIP", "Vehicle Year", "Make", "Model", "VIN", "Mileage", "Services", "Labor", "Parts", "Tax", "Grand Total", "Payment Method", "Tech Notes"];
    const rows = jobs.map(j => [
      j.jobNumber, j.date, j.customerName, j.customerPhone, j.customerEmail,
      j.customerAddress, j.customerCity, j.customerZip,
      j.vehicleYear, j.vehicleMake, j.vehicleModel, j.vehicleVin, j.mileage,
      j.lines?.map(l => l.service).join("; "),
      j.labor, j.parts, j.tax, j.grandTotal, j.payMethod, j.techNotes
    ]);
    downloadCSV(`ocasio-jobs-${from}-to-${to}.csv`, [headers, ...rows]);
  }

  function exportExpenses() {
    const headers = ["Date", "Category", "Description", "Vendor", "Amount"];
    const rows = expenses.map(e => [e.date, e.category, e.description, e.vendor, e.amount]);
    downloadCSV(`ocasio-expenses-${from}-to-${to}.csv`, [headers, ...rows]);
  }

  function exportMileage() {
    const headers = ["Date", "Purpose", "From", "To", "Miles", "Deduction ($0.67/mi)"];
    const rows = mileage.map(m => [
      m.date, m.purpose, m.from, m.to, m.miles,
      (Number(m.miles) * MILEAGE_RATE).toFixed(2)
    ]);
    downloadCSV(`ocasio-mileage-${from}-to-${to}.csv`, [headers, ...rows]);
  }

  function printSummary() {
    setPrintMode(true);
    setTimeout(() => { window.print(); setPrintMode(false); }, 200);
  }

  const presetLabel = PRESETS.find(p => p.key === preset)?.label || "Selected Period";

  return (
    <div>
      <div style={S.sectionHead} className="no-print">
        <div style={{ fontSize: 12, color: C.textSecondary }}>Export & Tax Reports</div>
      </div>

      <div style={{ ...S.card, marginBottom: 16 }} className="no-print">
        <div style={S.cardTitle}>Date Range</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {PRESETS.map(p => (
            <button key={p.key} onClick={() => setPreset(p.key)}
              style={{ padding: "6px 12px", background: preset === p.key ? C.accent : C.elevated, border: `1px solid ${preset === p.key ? C.accent : C.border}`, borderRadius: 4, color: preset === p.key ? "#fff" : C.textSecondary, fontSize: 11, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em" }}>
              {p.label}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div style={S.grid2}>
            <div>
              <label style={S.label}>From</label>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={S.input} />
            </div>
            <div>
              <label style={S.label}>To</label>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={S.input} />
            </div>
          </div>
        )}
        {from && to && (
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>
            {from} → {to}
          </div>
        )}
      </div>

      <div style={{ ...S.grid3, marginBottom: 12 }} className="no-print">
        <div style={S.stat}>
          <div style={S.statLabel}>Jobs</div>
          <div style={{ ...S.statValue, fontSize: 26 }}>{jobs.length}</div>
          <div style={{ fontSize: 11, color: C.green, marginTop: 4 }}>{fmt(totalRevenue)} revenue</div>
        </div>
        <div style={S.stat}>
          <div style={S.statLabel}>Expenses</div>
          <div style={{ ...S.statValue, fontSize: 26 }}>{expenses.length}</div>
          <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>{fmt(totalExpenses)} total</div>
        </div>
        <div style={S.stat}>
          <div style={S.statLabel}>Mileage</div>
          <div style={{ ...S.statValue, fontSize: 26 }}>{totalMiles}</div>
          <div style={{ fontSize: 11, color: C.green, marginTop: 4 }}>{fmt(mileageDeduction)} deduction</div>
        </div>
      </div>

      <div style={S.card} className="no-print">
        <div style={S.cardTitle}>Download CSV Files</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: C.elevated, borderRadius: 6 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Jobs</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>
                {jobs.length} records · customer, vehicle, services, totals
              </div>
            </div>
            <button style={S.btnPrimary} onClick={exportJobs} disabled={jobs.length === 0}>
              Download CSV
            </button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: C.elevated, borderRadius: 6 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Expenses</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>
                {expenses.length} records · date, category, description, amount
              </div>
            </div>
            <button style={S.btnPrimary} onClick={exportExpenses} disabled={expenses.length === 0}>
              Download CSV
            </button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: C.elevated, borderRadius: 6 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Mileage Log</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>
                {mileage.length} entries · {totalMiles} miles · {fmt(mileageDeduction)} deduction
              </div>
            </div>
            <button style={S.btnPrimary} onClick={exportMileage} disabled={mileage.length === 0}>
              Download CSV
            </button>
          </div>
        </div>
      </div>

      <div style={S.card} className="no-print">
        <div style={S.cardTitle}>Tax Summary Report</div>
        <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 14 }}>
          Generates a printable tax summary for {presetLabel.toLowerCase()} — ready for your accountant.
        </div>
        <button style={{ ...S.btnPrimary, width: "100%" }} onClick={printSummary}>
          Print / Save as PDF
        </button>
      </div>

      <div className="print-only" style={{ display: printMode ? "block" : "none", fontFamily: "'DM Mono', 'Courier New', monospace", color: "#111", padding: "32px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #e8633a", paddingBottom: 16, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.05em" }}>OCASIO</div>
            <div style={{ fontSize: 12, color: "#666", letterSpacing: "0.1em" }}>MECHANICAL SERVICES LLC</div>
            <div style={{ fontSize: 11, color: "#999" }}>Mobile Automotive Service · Florida</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e8633a", textTransform: "uppercase" }}>Tax Summary Report</div>
            <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{from} — {to}</div>
            <div style={{ fontSize: 11, color: "#999" }}>Generated: {new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 28 }}>
          {[
            { label: "Total Jobs", value: String(jobs.length), sub: `${fmt(totalRevenue)} revenue` },
            { label: "Total Expenses", value: fmt(totalExpenses), sub: `${expenses.length} transactions` },
            { label: "Miles Driven", value: String(totalMiles), sub: `${fmt(mileageDeduction)} deduction` },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ border: "1px solid #e0e0e0", borderRadius: 6, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
              <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: "#e8633a", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12, fontWeight: 600 }}>Income & Tax Calculation</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <tbody>
              {[
                ["Gross Revenue", fmt(totalRevenue), C.green],
                ["  — Labor", fmt(totalLabor), "#555"],
                ["  — Parts", fmt(totalParts), "#555"],
                ["  — Sales Tax Collected", fmt(totalTax), "#555"],
                ["Business Expenses", `- ${fmt(totalExpenses)}`, "#f87171"],
                [`Mileage Deduction (${totalMiles} mi × $0.67)`, `- ${fmt(mileageDeduction)}`, "#f87171"],
                ["Net Taxable Income", fmt(taxableIncome), "#111"],
              ].map(([label, value, color], i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "8px 0", color: label.startsWith("  ") ? "#999" : "#111" }}>{label}</td>
                  <td style={{ padding: "8px 0", textAlign: "right", fontWeight: label === "Net Taxable Income" || label === "Gross Revenue" ? 700 : 400, color }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: "#f9f9f9", borderRadius: 6, padding: "16px 18px", marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: "#e8633a", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12, fontWeight: 600 }}>Estimated Tax Liability</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <tbody>
              <tr style={{ borderBottom: "1px solid #e8e8e8" }}>
                <td style={{ padding: "7px 0", color: "#555" }}>Self-Employment Tax (15.3%)</td>
                <td style={{ padding: "7px 0", textAlign: "right", color: "#fbbf24", fontWeight: 600 }}>{fmt(seTax)}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e8e8e8" }}>
                <td style={{ padding: "7px 0", color: "#555" }}>Federal Income Tax Est. (22%)</td>
                <td style={{ padding: "7px 0", textAlign: "right", color: "#fbbf24", fontWeight: 600 }}>{fmt(fedTax)}</td>
              </tr>
              <tr>
                <td style={{ padding: "10px 0", fontWeight: 700, fontSize: 14 }}>Total Estimated Tax</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 700, fontSize: 14, color: "#e8633a" }}>{fmt(totalTaxEst)}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ fontSize: 11, color: "#999", marginTop: 8, borderTop: "1px solid #e8e8e8", paddingTop: 8 }}>
            Quarterly estimated payment: {fmt(totalTaxEst / 4)} · Due: Q1 Apr 15 · Q2 Jun 15 · Q3 Sep 15 · Q4 Jan 15
          </div>
        </div>

        {jobs.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: "#e8633a", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12, fontWeight: 600 }}>Job Log ({jobs.length} jobs)</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #ddd" }}>
                  {["Date", "Job #", "Customer", "Vehicle", "Services", "Total", "Payment"].map(h => (
                    <th key={h} style={{ textAlign: h === "Total" ? "right" : "left", padding: "5px 0", color: "#999", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id} style={{ borderBottom: "1px solid #f4f4f4" }}>
                    <td style={{ padding: "5px 0", color: "#555" }}>{j.date}</td>
                    <td style={{ padding: "5px 0", color: "#e8633a", fontSize: 10 }}>{j.jobNumber}</td>
                    <td style={{ padding: "5px 0" }}>{j.customerName}</td>
                    <td style={{ padding: "5px 0", color: "#555" }}>{j.vehicleYear} {j.vehicleMake} {j.vehicleModel}</td>
                    <td style={{ padding: "5px 0", color: "#555", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.lines?.map(l => l.service).join(", ")}</td>
                    <td style={{ padding: "5px 0", textAlign: "right", fontWeight: 600 }}>{fmt(j.grandTotal)}</td>
                    <td style={{ padding: "5px 0", color: "#555" }}>{j.payMethod}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid #111" }}>
                  <td colSpan={5} style={{ padding: "8px 0", fontWeight: 700, textAlign: "right", paddingRight: 8 }}>TOTAL</td>
                  <td style={{ padding: "8px 0", fontWeight: 700, textAlign: "right", color: "#e8633a" }}>{fmt(totalRevenue)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {expenses.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: "#e8633a", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12, fontWeight: 600 }}>Expense Log ({expenses.length} entries)</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #ddd" }}>
                  {["Date", "Category", "Description", "Vendor", "Amount"].map(h => (
                    <th key={h} style={{ textAlign: h === "Amount" ? "right" : "left", padding: "5px 0", color: "#999", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id} style={{ borderBottom: "1px solid #f4f4f4" }}>
                    <td style={{ padding: "5px 0", color: "#555" }}>{e.date}</td>
                    <td style={{ padding: "5px 0", color: "#555" }}>{e.category}</td>
                    <td style={{ padding: "5px 0" }}>{e.description}</td>
                    <td style={{ padding: "5px 0", color: "#555" }}>{e.vendor}</td>
                    <td style={{ padding: "5px 0", textAlign: "right", fontWeight: 600, color: "#f87171" }}>{fmt(e.amount)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid #111" }}>
                  <td colSpan={4} style={{ padding: "8px 0", fontWeight: 700, textAlign: "right", paddingRight: 8 }}>TOTAL</td>
                  <td style={{ padding: "8px 0", fontWeight: 700, textAlign: "right", color: "#f87171" }}>{fmt(totalExpenses)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: 16, fontSize: 10, color: "#999", textAlign: "center" }}>
          This report is an estimate for planning purposes. Consult a licensed tax professional for official guidance.
          Ocasio Mechanical Services LLC · Florida · Generated {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
