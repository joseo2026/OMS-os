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
    groupExpensesByCategory(annual.expenses),
    [annual.expenses]
  );

  function printSummary() {
    setPrinting(true);
    // No window.print() — user uses Safari share button to save PDF
    // Avoids "blocked from automatically printing" dialog
  }

  const qColors = [C.accent, "#10b981", "#f59e0b", "#8b5cf6"];
  const hasData = annual.jobs.length > 0 || annual.expenses.length > 0 || annual.mileage.length > 0;

  const P = {
    page:    { fontFamily: "Georgia, 'Times New Roman', serif", color: "#111", background: "#fff", fontSize: 13, lineHeight: 1.6 },
    h1:      { fontSize: 26, fontWeight: 700, color: "#111", margin: 0, letterSpacing: "-0.5px" },
    h2:      { fontSize: 15, fontWeight: 700, color: "#1d4ed8", margin: "0 0 12px 0", paddingBottom: 6, borderBottom: "2px solid #1d4ed8", textTransform: "uppercase", letterSpacing: "0.05em" },
    label:   { color: "#6b7280", fontSize: 12 },
    value:   { fontWeight: 600, fontSize: 13, color: "#111" },
    green:   { color: "#15803d", fontWeight: 700 },
    red:     { color: "#dc2626", fontWeight: 600 },
    yellow:  { color: "#b45309", fontWeight: 700 },
    blue:    { color: "#1d4ed8", fontWeight: 700 },
    divider: { borderTop: "2px solid #e5e7eb", margin: "32px 0" },
    card:    { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "18px 20px", marginBottom: 20 },
    qCard:   { border: "1px solid #e5e7eb", borderRadius: 8, padding: "16px 18px" },
    row:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f3f4f6" },
    rowLast: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 0" },
    section: { marginBottom: 36 },
    badge:   { display: "inline-block", background: "#eff6ff", color: "#1d4ed8", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 },
    footer:  { borderTop: "1px solid #e5e7eb", paddingTop: 16, fontSize: 11, color: "#9ca3af", textAlign: "center", lineHeight: 1.8 },
  };

  return (
    <div>
      <style>{`
        @media print {
          body { background: #fff !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-root { display: block !important; position: static !important; background: #fff !important; }
        }
      `}</style>

      {/* ── App UI ── */}

      {/* Year selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }} className="no-print">
        <button onClick={() => setYear(y => y - 1)} style={{ ...S.btnSecondary, padding: "8px 14px" }}>←</button>
        <div style={{ fontSize: 18, fontWeight: 700, flex: 1, textAlign: "center" }}>{year}</div>
        <button onClick={() => setYear(y => y + 1)} style={{ ...S.btnSecondary, padding: "8px 14px" }}>→</button>
      </div>

      {/* 2x2 Quarterly grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }} className="no-print">
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
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: C.textSecondary }}>Revenue</span>
                  <span style={{ color: C.green, fontWeight: 600 }}>{fmt(m.revenue)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: C.textSecondary }}>Expenses</span>
                  <span style={{ color: C.red }}>{fmt(m.expTotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: C.textSecondary }}>Mileage</span>
                  <span style={{ color: C.textSecondary }}>{m.miles} mi</span>
                </div>
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
      <div style={{ ...S.card, marginBottom: 16 }} className="no-print">
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

      {/* Save PDF button */}
      <div style={{ ...S.card, marginBottom: 24 }} className="no-print">
        <div style={S.cardTitle}>Export</div>
        <button
          style={{ ...S.btnPrimary, width: "100%", padding: "14px 0", fontSize: 14, marginBottom: 8 }}
          onClick={printSummary}
        >
          {printing ? "Report Open — Use Share Button ↗" : `Save ${year} Annual Report as PDF`}
        </button>
        <div style={{ fontSize: 11, color: C.textMuted, textAlign: "center" }}>
          Opens report → tap Share ↗ → Print → pinch preview → Save to Files
        </div>
        {!hasData && (
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8, textAlign: "center" }}>
            No data for {year} — add jobs, expenses, or mileage first.
          </div>
        )}
      </div>

      {/* ── PDF Print Overlay — zero theme variables below this line ── */}
      <div
        className="print-root"
        style={{
          display: printing ? "block" : "none",
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 9999,
          background: "#fff",
          overflowY: "auto",
          ...P.page,
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 32px" }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, paddingBottom: 24, borderBottom: "3px solid #1d4ed8" }}>
            <div>
              <div style={P.h1}>OCASIO</div>
              <div style={{ fontSize: 13, color: "#6b7280", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 2 }}>Mechanical Services LLC</div>
              <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280", lineHeight: 1.8 }}>
                {BIZ.address}<br/>
                {BIZ.city}<br/>
                {BIZ.phone} · {BIZ.email}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em" }}>Annual Tax Summary</div>
              <div style={{ fontSize: 40, fontWeight: 700, color: "#1d4ed8", lineHeight: 1.1 }}>{year}</div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                Generated {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </div>
              <div style={{ marginTop: 10 }}>
                <span style={P.badge}>{annual.jobs.length} Jobs Completed</span>
              </div>
            </div>
          </div>

          {/* Tax rate settings used */}
          <div style={P.section}>
            <div style={P.h2}>Tax Rate Settings Used</div>
            <div style={{ ...P.card, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{ ...P.label, marginBottom: 6 }}>Self-Employment Tax</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#1d4ed8" }}>{(seTaxRate * 100).toFixed(1)}%</div>
              </div>
              <div style={{ textAlign: "center", padding: "8px 0", borderLeft: "1px solid #e5e7eb", borderRight: "1px solid #e5e7eb" }}>
                <div style={{ ...P.label, marginBottom: 6 }}>Federal Income Tax Est.</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#1d4ed8" }}>{(fedTaxRate * 100).toFixed(1)}%</div>
              </div>
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{ ...P.label, marginBottom: 6 }}>IRS Mileage Rate</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#1d4ed8" }}>${mileageRate}/mi</div>
              </div>
            </div>
          </div>

          {/* Annual financial summary */}
          <div style={P.section}>
            <div style={P.h2}>Annual Financial Summary</div>
            <div style={P.card}>
              {[
                ["Gross Revenue",                                                                    fmt(annual.metrics.revenue),    P.green],
                ["Total Business Expenses",                                                          fmt(annual.metrics.expTotal),   P.red],
                [`Mileage Deduction (${annual.metrics.miles.toLocaleString()} mi × $${mileageRate})`, fmt(annual.metrics.mileDeduct), P.red],
              ].map(([label, value, style]) => (
                <div key={label} style={P.row}>
                  <span style={P.label}>{label}</span>
                  <span style={style}>{value}</span>
                </div>
              ))}
              <div style={{ ...P.row, borderBottom: "2px solid #111", paddingBottom: 12, marginBottom: 4 }}>
                <span style={{ ...P.value, fontSize: 15 }}>Net Profit</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: annual.metrics.netProfit >= 0 ? "#15803d" : "#dc2626" }}>
                  {fmt(annual.metrics.netProfit)}
                </span>
              </div>
              <div style={{ height: 8 }} />
              {[
                ["Self-Employment Tax (15.3% × 92.35%)", fmt(annual.metrics.seTax), P.yellow],
                ["Federal Income Tax Estimate",          fmt(annual.metrics.fedTax), P.yellow],
              ].map(([label, value, style]) => (
                <div key={label} style={P.row}>
                  <span style={P.label}>{label}</span>
                  <span style={style}>{value}</span>
                </div>
              ))}
              <div style={P.rowLast}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>Total Estimated Tax Liability</span>
                <span style={{ fontSize: 22, ...P.blue }}>{fmt(annual.metrics.totalTax)}</span>
              </div>
              <div style={{ marginTop: 14, padding: "12px 16px", background: "#eff6ff", borderRadius: 6, fontSize: 12, color: "#1d4ed8", lineHeight: 1.7 }}>
                Estimated quarterly payment: <strong>{fmt(annual.metrics.totalTax / 4)}</strong> per quarter
                <br/>Due dates: Q1 Apr 15 · Q2 Jun 15 · Q3 Sep 15 · Q4 Jan 15
              </div>
            </div>
          </div>

          <div style={P.divider} />

          {/* Quarterly breakdown */}
          <div style={P.section}>
            <div style={P.h2}>Quarterly Breakdown</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {quarters.map((q, i) => {
                const m = q.metrics;
                const qColor = ["#1d4ed8", "#059669", "#d97706", "#7c3aed"][i];
                return (
                  <div key={q.label} style={{ ...P.qCard, borderTop: `4px solid ${qColor}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 17, fontWeight: 700, color: qColor }}>{q.label}</div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>{q.period}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, color: "#9ca3af" }}>Est. due</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{q.due}</div>
                      </div>
                    </div>
                    {[
                      ["Revenue",    fmt(m.revenue),    "#15803d"],
                      ["Expenses",   fmt(m.expTotal),   "#dc2626"],
                      ["Mileage",    `${m.miles.toLocaleString()} mi`, "#6b7280"],
                      ["Net Profit", fmt(m.netProfit),  m.netProfit >= 0 ? "#15803d" : "#dc2626"],
                      ["Tax Est.",   fmt(m.totalTax),   "#b45309"],
                    ].map(([label, value, color]) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                        <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color }}>{value}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 10, fontSize: 11, color: "#9ca3af" }}>
                      {q.jobs.length} job{q.jobs.length !== 1 ? "s" : ""} · {q.expenses.length} expense{q.expenses.length !== 1 ? "s" : ""} · {q.mileage.length} trip{q.mileage.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
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
                  const pct = annual.metrics.expTotal > 0
                    ? (total / annual.metrics.expTotal * 100).toFixed(1)
                    : "0.0";
                  const barWidth = annual.metrics.expTotal > 0
                    ? (total / annual.metrics.expTotal * 100)
                    : 0;
                  return (
                    <div key={cat} style={{ marginBottom: i === expensesByCategory.length - 1 ? 0 : 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={P.label}>{cat}</span>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: "#9ca3af" }}>{pct}%</span>
                          <span style={{ ...P.value, color: "#dc2626" }}>{fmt(total)}</span>
                        </div>
                      </div>
                      <div style={{ height: 6, background: "#f3f4f6", borderRadius: 3 }}>
                        <div style={{ height: 6, width: `${barWidth}%`, background: "#dc2626", borderRadius: 3, opacity: 0.6 }} />
                      </div>
                    </div>
                  );
                })}
                <div style={{ ...P.rowLast, borderTop: "2px solid #111", paddingTop: 12, marginTop: 16 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Total Expenses</span>
                  <span style={{ fontSize: 18, ...P.red }}>{fmt(annual.metrics.expTotal)}</span>
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
                  <span style={{ ...P.value, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={P.footer}>
            <div style={{ marginBottom: 4, fontWeight: 600, color: "#6b7280" }}>
              {BIZ.name} · {BIZ.address}, {BIZ.city} · {BIZ.phone} · {BIZ.email}
            </div>
            <div>
              This report is generated from internal business records and contains estimates only.
              All figures should be reviewed by a licensed tax professional before filing.
            </div>
            <div style={{ marginTop: 6 }}>
              {year} Annual Tax Summary · Generated {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
          </div>

          {/* Instructions + close button */}
          <div style={{ marginTop: 32, padding: "20px 24px", background: "#eff6ff", borderRadius: 8, textAlign: "center" }} className="no-print">
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1d4ed8", marginBottom: 8 }}>
              Ready to Save as PDF
            </div>
            <div style={{ fontSize: 13, color: "#374151", marginBottom: 18, lineHeight: 1.7 }}>
              Tap the <strong>Share icon ↗</strong> at the bottom of Safari,
              then tap <strong>Print</strong>, then pinch the preview outward
              to open the full PDF, then tap <strong>Share → Save to Files</strong>.
            </div>
            <button
              onClick={() => setPrinting(false)}
              style={{ background: "#1d4ed8", border: "none", borderRadius: 8, padding: "12px 36px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Close Report
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
