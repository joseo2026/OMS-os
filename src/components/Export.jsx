import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { C, S } from "../styles.js";
import { fmt } from "../helpers.js";
import { SE_TAX_RATE, FED_TAX_RATE, MILEAGE_RATE } from "../constants.js";

function getPresetRange(preset) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case "this_month":
      return { from: new Date(y, m, 1).toISOString().slice(0, 10), to: new Date(y, m + 1, 0).toISOString().slice(0, 10) };
    case "last_month": {
      const lm = m === 0 ? 11 : m - 1;
      const ly = m === 0 ? y - 1 : y;
      return { from: new Date(ly, lm, 1).toISOString().slice(0, 10), to: new Date(ly, lm + 1, 0).toISOString().slice(0, 10) };
    }
    case "this_quarter": {
      const q = Math.floor(m / 3);
      return { from: new Date(y, q * 3, 1).toISOString().slice(0, 10), to: new Date(y, q * 3 + 3, 0).toISOString().slice(0, 10) };
    }
    case "last_quarter": {
      const q = Math.floor(m / 3);
      const lq = q === 0 ? 3 : q - 1;
      const lqy = q === 0 ? y - 1 : y;
      return { from: new Date(lqy, lq * 3, 1).toISOString().slice(0, 10), to: new Date(lqy, lq * 3 + 3, 0).toISOString().slice(0, 10) };
    }
    case "this_year":  return { from: `${y}-01-01`, to: `${y}-12-31` };
    case "last_year":  return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    default: return null;
  }
}

const PRESETS = [
  { key: "this_month",   label: "This Month" },
  { key: "last_month",   label: "Last Month" },
  { key: "this_quarter", label: "This Quarter" },
  { key: "last_quarter", label: "Last Quarter" },
  { key: "this_year",    label: "This Year" },
  { key: "last_year",    label: "Last Year" },
  { key: "custom",       label: "Custom" },
];

export default function Export({ data }) {
  const [preset, setPreset] = useState("this_year");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [printMode,  setPrintMode]  = useState(false);

  const range = preset === "custom" ? { from: customFrom, to: customTo } : getPresetRange(preset);
  const { from, to } = range || { from: "", to: "" };

  const inRange = (date) => {
    if (!date) return false;
    if (from && date < from) return false;
    if (to   && date > to)   return false;
    return true;
  };

  const jobs     = useMemo(() => (data.jobs     || []).filter(j => inRange(j.date)), [data.jobs,     from, to]);
  const expenses = useMemo(() => (data.expenses || []).filter(e => inRange(e.date)), [data.expenses, from, to]);
  const mileage  = useMemo(() => (data.mileage  || []).filter(m => inRange(m.date)), [data.mileage,  from, to]);

  const totalRevenue   = jobs.reduce((s, j)     => s + Number(j.grandTotal || 0), 0);
  const totalLabor     = jobs.reduce((s, j)     => s + Number(j.labor      || 0), 0);
  const totalParts     = jobs.reduce((s, j)     => s + Number(j.parts      || 0), 0);
  const totalSalesTax  = jobs.reduce((s, j)     => s + Number(j.tax        || 0), 0);
  const totalExpenses  = expenses.reduce((s, e) => s + Number(e.amount     || 0), 0);
  const totalMiles     = mileage.reduce((s, m)  => s + Number(m.miles      || 0), 0);
  const mileageDeduction = totalMiles * MILEAGE_RATE;
  const netProfit      = totalRevenue - totalExpenses;
  // IRS-correct SE tax: net profit × 92.35% × 15.3%
  const seTax          = Math.max(0, netProfit) * 0.9235 * SE_TAX_RATE;
  // Federal: taxable income after mileage deduction + 50% SE tax deduction
  const taxableIncome  = Math.max(0, netProfit - mileageDeduction - seTax * 0.5);
  const fedTax         = taxableIncome * FED_TAX_RATE;
  const totalTaxEst    = seTax + fedTax;
  const quarterlyEst   = totalTaxEst / 4;

  // ── Excel export ──────────────────────────────────────────────────────────
  function exportExcel() {
    const wb = XLSX.utils.book_new();

    // Sheet 1 — Tax Summary
    const summaryRows = [
      ["OCASIO MECHANICAL SERVICES LLC — TAX SUMMARY"],
      [`Period: ${from} to ${to}`],
      [`Generated: ${new Date().toLocaleDateString()}`],
      [],
      ["INCOME"],
      ["Gross Revenue",                                  totalRevenue],
      ["  Labor",                                        totalLabor],
      ["  Parts",                                        totalParts],
      ["  FL Sales Tax Collected (7%)",                  totalSalesTax],
      [],
      ["DEDUCTIONS"],
      ["Business Expenses",                              totalExpenses],
      [`Mileage Deduction (${totalMiles} mi × $${MILEAGE_RATE}/mi)`, mileageDeduction],
      [],
      ["TAX ESTIMATES (2026 IRS RATES)"],
      ["Net Profit (Revenue − Expenses)",                netProfit],
      ["SE Tax Base (Net Profit × 92.35%)",              Math.max(0, netProfit) * 0.9235],
      ["Self-Employment Tax (15.3%)",                    seTax],
      ["SE Tax Deduction (50% of SE Tax)",               seTax * 0.5],
      ["Net Taxable Income (Federal)",                   taxableIncome],
      ["Federal Income Tax Est. (22%)",                  fedTax],
      ["TOTAL ESTIMATED TAX",                            totalTaxEst],
      [],
      ["QUARTERLY PAYMENTS"],
      ["Q1 — Due Apr 15",   quarterlyEst],
      ["Q2 — Due Jun 15",   quarterlyEst],
      ["Q3 — Due Sep 15",   quarterlyEst],
      ["Q4 — Due Jan 15",   quarterlyEst],
      [],
      ["Note: This is an estimate for planning purposes. Consult a licensed tax professional."],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
    ws1["!cols"] = [{ wch: 45 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Tax Summary");

    // Sheet 2 — Jobs
    const jobHeaders = ["Job #", "Date", "Customer", "Phone", "Email", "Address", "City", "ZIP",
      "Veh Year", "Make", "Model", "VIN", "Mileage", "Services", "Labor", "Parts", "Sales Tax", "Grand Total", "Payment"];
    const jobRows = jobs.map(j => [
      j.jobNumber, j.date, j.customerName, j.customerPhone, j.customerEmail,
      j.customerAddress, j.customerCity, j.customerZip,
      j.vehicleYear, j.vehicleMake, j.vehicleModel, j.vehicleVin, j.mileage,
      j.lines?.map(l => l.service).join("; "),
      Number(j.labor), Number(j.parts), Number(j.tax), Number(j.grandTotal), j.payMethod,
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([jobHeaders, ...jobRows]);
    ws2["!cols"] = [8,10,20,13,22,22,12,7,8,10,10,18,8,40,9,9,9,11,10].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws2, "Jobs");

    // Sheet 3 — Expenses
    const expHeaders = ["Date", "Category", "Description", "Vendor", "Amount"];
    const expRows = expenses.map(e => [e.date, e.category, e.description, e.vendor, Number(e.amount)]);
    expRows.push(["", "", "", "TOTAL", totalExpenses]);
    const ws3 = XLSX.utils.aoa_to_sheet([expHeaders, ...expRows]);
    ws3["!cols"] = [{ wch: 12 }, { wch: 22 }, { wch: 30 }, { wch: 20 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws3, "Expenses");

    // Sheet 4 — Mileage
    const milHeaders = ["Date", "Purpose", "From", "To", "Miles", `Deduction ($${MILEAGE_RATE}/mi)`];
    const milRows = mileage.map(m => [
      m.date, m.purpose, m.from, m.to,
      Number(m.miles),
      +(Number(m.miles) * MILEAGE_RATE).toFixed(2),
    ]);
    milRows.push(["", "", "", "TOTAL", totalMiles, +mileageDeduction.toFixed(2)]);
    const ws4 = XLSX.utils.aoa_to_sheet([milHeaders, ...milRows]);
    ws4["!cols"] = [{ wch: 12 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 8 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws4, "Mileage");

    XLSX.writeFile(wb, `Ocasio-Business-Report-${from}-to-${to}.xlsx`);
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

      {/* Date range selector */}
      <div style={{ ...S.card, marginBottom: 16 }} className="no-print">
        <div style={S.cardTitle}>Date Range</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {PRESETS.map(p => (
            <button key={p.key} onClick={() => setPreset(p.key)}
              style={{ padding: "6px 12px", background: preset === p.key ? C.accent : C.elevated, border: `1px solid ${preset === p.key ? C.accent : C.border}`, borderRadius: 4, color: preset === p.key ? "#fff" : C.textSecondary, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
              {p.label}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div style={S.grid2}>
            <div><label style={S.label}>From</label><input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={S.input} /></div>
            <div><label style={S.label}>To</label><input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={S.input} /></div>
          </div>
        )}
        {from && to && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>{from} → {to}</div>}
      </div>

      {/* Summary stats */}
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

      {/* Tax estimate card */}
      <div style={{ ...S.card, marginBottom: 12 }} className="no-print">
        <div style={S.cardTitle}>2026 Tax Estimate</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          {[
            ["Net Profit",            fmt(netProfit),       netProfit >= 0 ? C.green : C.red],
            ["Mileage Deduction",    `-${fmt(mileageDeduction)}`, C.red],
            ["SE Tax (15.3% × 92.35%)", fmt(seTax),        C.yellow],
            ["Federal Income Tax",   fmt(fedTax),           C.yellow],
          ].map(([label, value, color]) => (
            <div key={label} style={{ background: C.elevated, borderRadius: 6, padding: "10px 14px" }}>
              <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>
        <div style={{ background: C.elevated, borderRadius: 6, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Quarterly Payment (÷4)</div>
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>Apr 15 · Jun 15 · Sep 15 · Jan 15</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.accent }}>{fmt(quarterlyEst)}</div>
        </div>
        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 8 }}>
          IRS 2026 rates: $0.70/mi standard mileage · 15.3% SE tax (on 92.35% of net profit) · 22% federal bracket · Consult a tax professional for official guidance.
        </div>
      </div>

      {/* Excel export */}
      <div style={{ ...S.card, marginBottom: 12 }} className="no-print">
        <div style={S.cardTitle}>Download Excel Workbook</div>
        <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 14 }}>
          One .xlsx file with 4 separate tabs: Tax Summary, Jobs, Expenses, and Mileage.
        </div>
        <button
          style={{ ...S.btnPrimary, width: "100%", padding: "12px 0", fontSize: 13 }}
          onClick={exportExcel}
          disabled={jobs.length === 0 && expenses.length === 0 && mileage.length === 0}
        >
          ↓ Download Excel Workbook
        </button>
        {jobs.length === 0 && expenses.length === 0 && mileage.length === 0 && (
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8, textAlign: "center" }}>No data in selected date range.</div>
        )}
      </div>

      {/* Print tax summary */}
      <div style={S.card} className="no-print">
        <div style={S.cardTitle}>Printable Tax Summary</div>
        <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 14 }}>
          Formatted report for {presetLabel.toLowerCase()} — ready for your accountant.
        </div>
        <button style={{ ...S.btnPrimary, width: "100%" }} onClick={printSummary}>
          Print / Save as PDF
        </button>
      </div>

      {/* Print-only report */}
      <div className="print-only" style={{ display: printMode ? "block" : "none", fontFamily: "'Roboto', Arial, sans-serif", color: "#111", padding: "32px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #3b82f6", paddingBottom: 16, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>OCASIO</div>
            <div style={{ fontSize: 12, color: "#666", letterSpacing: "0.1em" }}>MECHANICAL SERVICES LLC</div>
            <div style={{ fontSize: 11, color: "#999" }}>Mobile Automotive Service · Florida</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase" }}>Tax Summary Report</div>
            <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{from} — {to}</div>
            <div style={{ fontSize: 11, color: "#999" }}>Generated: {new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 28 }}>
          {[
            { label: "Total Jobs",       value: String(jobs.length), sub: `${fmt(totalRevenue)} revenue` },
            { label: "Total Expenses",   value: fmt(totalExpenses),  sub: `${expenses.length} transactions` },
            { label: "Miles Driven",     value: String(totalMiles),  sub: `${fmt(mileageDeduction)} deduction @ $${MILEAGE_RATE}/mi` },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ border: "1px solid #e0e0e0", borderRadius: 6, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
              <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: "#3b82f6", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontWeight: 600 }}>Income & Deductions</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <tbody>
              {[
                ["Gross Revenue",                              fmt(totalRevenue),                    "#22c55e", true],
                ["  — Labor",                                 fmt(totalLabor),                      "#555",    false],
                ["  — Parts",                                 fmt(totalParts),                      "#555",    false],
                ["  — FL Sales Tax Collected (7%)",           fmt(totalSalesTax),                   "#555",    false],
                ["Business Expenses",                         `− ${fmt(totalExpenses)}`,            "#f87171", false],
                [`Mileage Deduction (${totalMiles} mi × $${MILEAGE_RATE}/mi)`, `− ${fmt(mileageDeduction)}`, "#f87171", false],
                ["Net Profit",                                fmt(netProfit),                       "#111",    true],
              ].map(([label, value, color, bold], i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "8px 0", color: label.startsWith("  ") ? "#999" : "#333" }}>{label}</td>
                  <td style={{ padding: "8px 0", textAlign: "right", fontWeight: bold ? 700 : 400, color }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: "#f9f9f9", borderRadius: 6, padding: "16px 18px", marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: "#3b82f6", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontWeight: 600 }}>Estimated Tax Liability (2026)</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <tbody>
              <tr style={{ borderBottom: "1px solid #e8e8e8" }}>
                <td style={{ padding: "7px 0", color: "#555" }}>SE Tax Base (Net Profit × 92.35%)</td>
                <td style={{ padding: "7px 0", textAlign: "right", color: "#555" }}>{fmt(Math.max(0, netProfit) * 0.9235)}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e8e8e8" }}>
                <td style={{ padding: "7px 0", color: "#555" }}>Self-Employment Tax (15.3%)</td>
                <td style={{ padding: "7px 0", textAlign: "right", color: "#fbbf24", fontWeight: 600 }}>{fmt(seTax)}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e8e8e8" }}>
                <td style={{ padding: "7px 0", color: "#555" }}>SE Tax Deduction (50% of SE Tax)</td>
                <td style={{ padding: "7px 0", textAlign: "right", color: "#555" }}>− {fmt(seTax * 0.5)}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e8e8e8" }}>
                <td style={{ padding: "7px 0", color: "#555" }}>Net Taxable Income (Federal)</td>
                <td style={{ padding: "7px 0", textAlign: "right", color: "#555" }}>{fmt(taxableIncome)}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e8e8e8" }}>
                <td style={{ padding: "7px 0", color: "#555" }}>Federal Income Tax Est. (22%)</td>
                <td style={{ padding: "7px 0", textAlign: "right", color: "#fbbf24", fontWeight: 600 }}>{fmt(fedTax)}</td>
              </tr>
              <tr>
                <td style={{ padding: "10px 0", fontWeight: 700, fontSize: 14 }}>Total Estimated Tax</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 700, fontSize: 14, color: "#3b82f6" }}>{fmt(totalTaxEst)}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ fontSize: 11, color: "#999", marginTop: 8, borderTop: "1px solid #e8e8e8", paddingTop: 8 }}>
            Quarterly estimated payment: <strong>{fmt(quarterlyEst)}</strong> · Due: Q1 Apr 15 · Q2 Jun 15 · Q3 Sep 15 · Q4 Jan 15
          </div>
        </div>

        {jobs.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: "#3b82f6", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontWeight: 600 }}>Job Log ({jobs.length} jobs)</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #ddd" }}>
                  {["Date", "Job #", "Customer", "Vehicle", "Services", "Total", "Payment"].map(h => (
                    <th key={h} style={{ textAlign: h === "Total" ? "right" : "left", padding: "5px 0", color: "#999", fontWeight: 500, textTransform: "uppercase", fontSize: 10 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id} style={{ borderBottom: "1px solid #f4f4f4" }}>
                    <td style={{ padding: "5px 0", color: "#555" }}>{j.date}</td>
                    <td style={{ padding: "5px 0", color: "#3b82f6", fontSize: 10 }}>{j.jobNumber}</td>
                    <td style={{ padding: "5px 0" }}>{j.customerName}</td>
                    <td style={{ padding: "5px 0", color: "#555" }}>{j.vehicleYear} {j.vehicleMake} {j.vehicleModel}</td>
                    <td style={{ padding: "5px 0", color: "#555", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.lines?.map(l => l.service).join(", ")}</td>
                    <td style={{ padding: "5px 0", textAlign: "right", fontWeight: 600 }}>{fmt(j.grandTotal)}</td>
                    <td style={{ padding: "5px 0", color: "#555" }}>{j.payMethod}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid #111" }}>
                  <td colSpan={5} style={{ padding: "8px 0", fontWeight: 700, textAlign: "right", paddingRight: 8 }}>TOTAL</td>
                  <td style={{ padding: "8px 0", fontWeight: 700, textAlign: "right", color: "#3b82f6" }}>{fmt(totalRevenue)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {expenses.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: "#3b82f6", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontWeight: 600 }}>Expense Log ({expenses.length} entries)</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #ddd" }}>
                  {["Date", "Category", "Description", "Vendor", "Amount"].map(h => (
                    <th key={h} style={{ textAlign: h === "Amount" ? "right" : "left", padding: "5px 0", color: "#999", fontWeight: 500, textTransform: "uppercase", fontSize: 10 }}>{h}</th>
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
          IRS 2026 rates applied. This report is an estimate for planning purposes only — consult a licensed tax professional for official guidance.
          Ocasio Mechanical Services LLC · Florida · Generated {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
