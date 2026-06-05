import { useState, useMemo } from "react";
import { useTheme } from "../theme.jsx";
import { fmt } from "../helpers.js";
import { getAppSettings } from "./Settings.jsx";

const QUARTERS = [
  { label: "Q1", period: "Jan 1 – Mar 31", due: "Apr 15", from: (y) => `${y}-01-01`, to: (y) => `${y}-03-31` },
  { label: "Q2", period: "Apr 1 – May 31", due: "Jun 15", from: (y) => `${y}-04-01`, to: (y) => `${y}-05-31` },
  { label: "Q3", period: "Jun 1 – Aug 31", due: "Sep 15", from: (y) => `${y}-06-01`, to: (y) => `${y}-08-31` },
  { label: "Q4", period: "Sep 1 – Dec 31", due: "Jan 15", from: (y) => `${y}-09-01`, to: (y) => `${y}-12-31` },
];

const BIZ = {
  name:    "Ocasio Mechanical Services LLC",
  address: "1234 Main Street",
  city:    "Boynton Beach, FL 33426",
  phone:   "(555) 555-5555",
  email:   "jose@oms.com",
};

function calcMetrics(jobs, expenses, mileage, mileageRate, seTaxRate, fedTaxRate) {
  const revenue    = jobs.reduce((s, j) => s + Number(j.grandTotal || j.grand_total || 0), 0);
  const expTotal   = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const miles      = mileage.reduce((s, m) => s + Number(String(m.miles || 0).replace(/,/g, "")), 0);
  const mileDeduct = miles * mileageRate;
  const netProfit  = revenue - expTotal;
  const seTax      = Math.max(0, netProfit) * 0.9235 * seTaxRate;
  const taxable    = Math.max(0, netProfit - mileDeduct - seTax * 0.5);
  const fedTax     = taxable * fedTaxRate;
  const totalTax   = seTax + fedTax;
  return { revenue, expTotal, miles, mileDeduct, netProfit, seTax, fedTax, totalTax };
}

function inRange(date, from, to) {
  if (!date) return false;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function groupExpensesByCategory(expenses) {
  const map = {};
  expenses.forEach(e => {
    const cat = e.category || "Uncategorized";
    if (!map[cat]) map[cat] = 0;
    map[cat] += Number(e.amount || 0);
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

export default function Export({ data }) {
  const { C, S } = useTheme();
  const { mileageRate, seTaxRate, fedTaxRate } = getAppSettings();
  const [year, setYear] = useState(new Date().getFullYear());
  const [printing, setPrinting] = useState(false);

  const allJobs     = data.jobs     || [];
  const allExpenses = data.expenses || [];
  const allMileage  = data.mileage  || [];

  const quarters = useMemo(() => QUARTERS.map(q => {
    const from     = q.from(year);
    const to       = q.to(year);
    const jobs     = allJobs.filter(j => inRange(j.date, from, to));
    const expenses = allExpenses.filter(e => inRange(e.date, from, to));
    const mileage  = allMileage.filter(m => inRange(m.date, from, to));
    const metrics  = calcMetrics(jobs, expenses, mileage, mileageRate, seTaxRate, fedTaxRate);
    return { ...q, from, to, jobs, expenses, mileage, metrics };
  }), [allJobs, allExpenses, allMileage, year, mileageRate, seTaxRate, fedTaxRate]);

  const annual = useMemo(() => {
    const jobs     = allJobs.filter(j => inRange(j.date, `${year}-01-01`, `${year}-12-31`));
    const expenses = allExpenses.filter(e => inRange(e.date, `${year}-01-01`, `${year}-12-31`));
    const mileage  = allMileage.filter(m => inRange(m.date, `${year}-01-01`, `${year}-12-31`));
    return { jobs, expenses, mileage, metrics: calcMetrics(jobs, expenses, mileage, mileageRate, seTaxRate, fedTaxRate) };
  }, [allJobs, allExpenses, allMileage, year, mileageRate, seTaxRate, fedTaxRate]);

  const expensesByCategory = useMemo(() =>
    groupExpensesByCategory(annual.expenses), [annual.expenses]);

  function openReport() {
    setPrinting(true);
  }

  const qColors = [C.accent, "#10b981", "#f59e0b", "#8b5cf6"];
  const hasData = annual.jobs.length > 0 || annual.expenses.length > 0 || annual.mileage.length > 0;

  const P = {
    h2:      { fontSize: 13, fontWeight: 700, color: "#1d4ed8", margin: "0 0 10px 0", paddingBottom: 5, borderBottom: "2px solid #1d4ed8", textTransform: "uppercase", letterSpacing: "0.05em" },
    label:   { color: "#6b7280", fontSize: 12 },
    value:   { fontWeight: 600, fontSize: 13, color: "#111" },
    green:   { color: "#15803d", fontWeight: 700 },
    red:     { color: "#dc2626", fontWeight: 600 },
    yellow:  { color: "#b45309", fontWeight: 700 },
    blue:    { color: "#1d4ed8", fontWeight: 700 },
    card:    { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "14px 16px", marginBottom: 18 },
    row:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f3f4f6" },
    rowLast: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10 },
    section: { marginBottom: 24 },
    divider: { borderTop: "2px solid #e5e7eb", margin: "24px 0" },
  };

  return (
    <div>
      <style>{`
        @media print {
          body, html { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          .print-root { display: block !important; position: static !important; overflow: visible !important; }
        }
      `}</style>

      {/* ── App UI (hidden when report is open) ── */}
      {!printing && (
        <div>
          {/* Year selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <button onClick={() => setYear(y => y - 1)} style={{ ...S.btnSecondary, padding: "8px 14px" }}>←</button>
            <div style={{ fontSize: 18, fontWeight: 700, flex: 1, textAlign: "center" }}>{year}</div>
            <button onClick={() => setYear(y => y + 1)} style={{ ...S.btnSecondary, padding: "8px 14px" }}>→</button>
          </div>

          {/* 2x2 Quarterly grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {quarters.map((q, i) => {
              const m = q.metrics;
              const color = qColors[i];
              return (
                <div key={q.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 16px", borderTop: `3px solid ${color}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color }}>{q.label}</div>
                      <div style={{ fontSize: 10, color: C.textMuted }}>{q.period}</div>
                    </div>
                    <div style={{ fontSize: 10, color: C.textMuted, textAlign: "right" }}>
                      Due {q.due}<br/>
                      <span style={{ color: C.textSecondary }}>{q.jobs.length} jobs</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[
                      ["Revenue",    fmt(m.revenue),    C.green],
                      ["Expenses",   fmt(m.expTotal),   C.red],
                      ["Mileage",    `${m.miles} mi`,   C.textSecondary],
                    ].map(([l, v, c]) => (
                      <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: C.textSecondary }}>{l}</span>
                        <span style={{ color: c, fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 6, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: C.textSecondary }}>Net Profit</span>
                      <span style={{ color: m.netProfit >= 0 ? C.green : C.red, fontWeight: 600 }}>{fmt(m.netProfit)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: C.textSecondary }}>Tax Est.</span>
                      <span style={{ color: C.yellow, fontWeight: 600 }}>{fmt(m.totalTax)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Annual total */}
          <div style={{ ...S.card, marginBottom: 16 }}>
            <div style={S.cardTitle}>{year} Annual Total</div>
            {[
              ["Gross Revenue",     fmt(annual.metrics.revenue),    C.green],
              ["Total Expenses",    fmt(annual.metrics.expTotal),   C.red],
              ["Mileage Deduction", fmt(annual.metrics.mileDeduct), C.red],
              ["Net Profit",        fmt(annual.metrics.netProfit),  annual.metrics.netProfit >= 0 ? C.green : C.red],
              ["SE Tax (15.3%)",    fmt(annual.metrics.seTax),      C.yellow],
              ["Federal Tax Est.",  fmt(annual.metrics.fedTax),     C.yellow],
            ].map(([label, value, color]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 12, color: C.textSecondary }}>{label}</span>
                <span style={{ fontSize: 13, color, fontWeight: 600 }}>{value}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 4px" }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Total Tax Estimate</span>
              <span style={{ fontSize: 16, color: C.yellow, fontWeight: 700 }}>{fmt(annual.metrics.totalTax)}</span>
            </div>
            <div style={{ fontSize: 11, color: C.textMuted }}>
              Quarterly payment: <span style={{ color: C.accent, fontWeight: 600 }}>{fmt(annual.metrics.totalTax / 4)}</span> per quarter
            </div>
          </div>

          {/* Export button */}
          <div style={{ ...S.card, marginBottom: 24 }}>
            <div style={S.cardTitle}>Export</div>
            <button
              style={{ ...S.btnPrimary, width: "100%", padding: "14px 0", fontSize: 14, marginBottom: 8 }}
              onClick={openReport}
            >
              {`View ${year} Annual Report`}
            </button>
            <div style={{ fontSize: 11, color: C.textMuted, textAlign: "center" }}>
              Opens full report → use Share ↗ to save as PDF
            </div>
            {!hasData && (
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8, textAlign: "center" }}>
                No data for {year} — add jobs, expenses, or mileage first.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PDF Report — renders in place, full scroll, no fixed overlay ── */}
      {printing && (
        <div
          className="print-root"
          style={{
            background: "#fff",
            color: "#111",
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 13,
            lineHeight: 1.7,
            padding: "24px 20px",
            minHeight: "100vh",
          }}
        >
          {/* Close button — top of screen, hidden when printing */}
          <div className="no-print" style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              onClick={() => setPrinting(false)}
              style={{ background: "#f3f4f6", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, color: "#374151", cursor: "pointer" }}
            >
              ← Back
            </button>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Share ↗ → Print → Save to Files
            </div>
          </div>

          {/* Header */}
          <div style={{ borderBottom: "3px solid #1d4ed8", paddingBottom: 20, marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#111", letterSpacing: "-0.5px" }}>OCASIO</div>
            <div style={{ fontSize: 11, color: "#6b7280", letterSpacing: "0.12em", textTransform: "uppercase" }}>Mechanical Services LLC</div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280", lineHeight: 1.8 }}>
              {BIZ.address} · {BIZ.city}<br/>
              {BIZ.phone} · {BIZ.email}
            </div>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em" }}>Annual Tax Summary</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#1d4ed8", lineHeight: 1.1 }}>{year}</div>
              </div>
              <div style={{ textAlign: "right", fontSize: 11, color: "#9ca3af" }}>
                {annual.jobs.length} jobs completed<br/>
                Generated {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </div>
            </div>
          </div>

          {/* Tax settings */}
          <div style={P.section}>
            <div style={P.h2}>Tax Rate Settings Used</div>
            <div style={{ ...P.card, display: "flex", justifyContent: "space-around", textAlign: "center" }}>
              <div>
                <div style={P.label}>Self-Employment Tax</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#1d4ed8" }}>{(seTaxRate * 100).toFixed(1)}%</div>
              </div>
              <div style={{ borderLeft: "1px solid #e5e7eb", borderRight: "1px solid #e5e7eb", padding: "0 20px" }}>
                <div style={P.label}>Federal Income Tax</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#1d4ed8" }}>{(fedTaxRate * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div style={P.label}>IRS Mileage Rate</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#1d4ed8" }}>${mileageRate}/mi</div>
              </div>
            </div>
          </div>

          {/* Annual summary */}
          <div style={P.section}>
            <div style={P.h2}>Annual Financial Summary</div>
            <div style={P.card}>
              {[
                ["Gross Revenue",                                                                        fmt(annual.metrics.revenue),    "#15803d"],
                ["Total Business Expenses",                                                              fmt(annual.metrics.expTotal),   "#dc2626"],
                [`Mileage Deduction (${annual.metrics.miles.toLocaleString()} mi × $${mileageRate})`,   fmt(annual.metrics.mileDeduct), "#dc2626"],
              ].map(([label, value, color]) => (
                <div key={label} style={P.row}>
                  <span style={P.label}>{label}</span>
                  <span style={{ fontWeight: 600, color }}>{value}</span>
                </div>
              ))}
              <div style={{ ...P.row, borderBottom: "2px solid #111" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>Net Profit</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: annual.metrics.netProfit >= 0 ? "#15803d" : "#dc2626" }}>
                  {fmt(annual.metrics.netProfit)}
                </span>
              </div>
              <div style={{ height: 6 }} />
              {[
                ["Self-Employment Tax (15.3% × 92.35%)", fmt(annual.metrics.seTax), "#b45309"],
                ["Federal Income Tax Estimate",          fmt(annual.metrics.fedTax), "#b45309"],
              ].map(([label, value, color]) => (
                <div key={label} style={P.row}>
                  <span style={P.label}>{label}</span>
                  <span style={{ fontWeight: 600, color }}>{value}</span>
                </div>
              ))}
              <div style={P.rowLast}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Total Estimated Tax Liability</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#1d4ed8" }}>{fmt(annual.metrics.totalTax)}</span>
              </div>
              <div style={{ marginTop: 12, padding: "10px 14px", background: "#eff6ff", borderRadius: 6, fontSize: 12, color: "#1d4ed8", lineHeight: 1.7 }}>
                Quarterly payment: <strong>{fmt(annual.metrics.totalTax / 4)}</strong>
                <br/>Due: Q1 Apr 15 · Q2 Jun 15 · Q3 Sep 15 · Q4 Jan 15
              </div>
            </div>
          </div>

          <div style={P.divider} />

          {/* Quarterly breakdown */}
          <div style={P.section}>
            <div style={P.h2}>Quarterly Breakdown</div>
            {quarters.map((q, i) => {
              const m = q.metrics;
              const qColor = ["#1d4ed8", "#059669", "#d97706", "#7c3aed"][i];
              return (
                <div key={q.label} style={{ ...P.card, borderLeft: `4px solid ${qColor}`, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <div>
                      <span style={{ fontSize: 15, fontWeight: 700, color: qColor }}>{q.label}</span>
                      <span style={{ fontSize: 11, color: "#6b7280", marginLeft: 8 }}>{q.period}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>Est. due {q.due}</div>
                  </div>
                  {[
                    ["Revenue",    fmt(m.revenue),    "#15803d"],
                    ["Expenses",   fmt(m.expTotal),   "#dc2626"],
                    ["Mileage",    `${m.miles.toLocaleString()} mi`, "#6b7280"],
                    ["Net Profit", fmt(m.netProfit),  m.netProfit >= 0 ? "#15803d" : "#dc2626"],
                    ["Tax Est.",   fmt(m.totalTax),   "#b45309"],
                  ].map(([label, value, color]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f3f4f6" }}>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color }}>{value}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 8, fontSize: 11, color: "#9ca3af" }}>
                    {q.jobs.length} job{q.jobs.length !== 1 ? "s" : ""} · {q.expenses.length} expense{q.expenses.length !== 1 ? "s" : ""} · {q.mileage.length} trip{q.mileage.length !== 1 ? "s" : ""}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={P.divider} />

          {/* Expense categories */}
          <div style={P.section}>
            <div style={P.h2}>Business Expenses by Category</div>
            {expensesByCategory.length === 0 ? (
              <div style={{ color: "#9ca3af", fontSize: 13 }}>No expenses recorded for {year}.</div>
            ) : (
              <div style={P.card}>
                {expensesByCategory.map(([cat, total], i) => {
                  const pct = annual.metrics.expTotal > 0 ? (total / annual.metrics.expTotal * 100).toFixed(1) : "0.0";
                  const barWidth = annual.metrics.expTotal > 0 ? (total / annual.metrics.expTotal * 100) : 0;
                  return (
                    <div key={cat} style={{ marginBottom: i === expensesByCategory.length - 1 ? 0 : 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={P.label}>{cat}</span>
                        <div style={{ display: "flex", gap: 10 }}>
                          <span style={{ fontSize: 11, color: "#9ca3af" }}>{pct}%</span>
                          <span style={{ fontWeight: 600, color: "#dc2626" }}>{fmt(total)}</span>
                        </div>
                      </div>
                      <div style={{ height: 5, background: "#f3f4f6", borderRadius: 3 }}>
                        <div style={{ height: 5, width: `${barWidth}%`, background: "#dc2626", borderRadius: 3, opacity: 0.5 }} />
                      </div>
                    </div>
                  );
                })}
                <div style={{ ...P.rowLast, borderTop: "2px solid #111", marginTop: 14 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Total Expenses</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#dc2626" }}>{fmt(annual.metrics.expTotal)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Mileage summary */}
          <div style={P.section}>
            <div style={P.h2}>Mileage Log Summary</div>
            <div style={P.card}>
              {[
                ["Total Trips Logged",      annual.mileage.length.toString(),                  "#111"],
                ["Total Miles Driven",      `${annual.metrics.miles.toLocaleString()} miles`,  "#111"],
                ["IRS Rate Applied",        `$${mileageRate} per mile`,                        "#111"],
                ["Total Mileage Deduction", fmt(annual.metrics.mileDeduct),                    "#dc2626"],
              ].map(([label, value, color], i) => (
                <div key={label} style={{ ...P.row, borderBottom: i === 3 ? "none" : "1px solid #f3f4f6" }}>
                  <span style={P.label}>{label}</span>
                  <span style={{ fontWeight: 600, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 14, fontSize: 11, color: "#9ca3af", textAlign: "center", lineHeight: 1.8, marginBottom: 24 }}>
            <div style={{ fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>{BIZ.name} · {BIZ.address}, {BIZ.city}</div>
            <div>{BIZ.phone} · {BIZ.email}</div>
            <div style={{ marginTop: 6 }}>
              Estimates only — review with a licensed tax professional before filing.
            </div>
            <div>{year} Annual Tax Summary · Generated {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
          </div>

          {/* Bottom close button */}
          <div className="no-print" style={{ textAlign: "center", paddingBottom: 40 }}>
            <button
              onClick={() => setPrinting(false)}
              style={{ background: "#1d4ed8", border: "none", borderRadius: 8, padding: "12px 36px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Close Report
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
