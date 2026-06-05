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

export default function Export({ data }) {
  const { C, S } = useTheme();
  const { mileageRate, seTaxRate, fedTaxRate } = getAppSettings();
  const [year, setYear] = useState(new Date().getFullYear());
  const [printing, setPrinting] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  function buildCSV() {
    const m = annual.metrics;
    const rows = [];

    rows.push([`OCASIO MECHANICAL SERVICES LLC — ${year} TAX SUMMARY`]);
    rows.push([`Generated: ${new Date().toLocaleDateString()}`]);
    rows.push([]);

    rows.push(["ANNUAL TOTALS", "Amount"]);
    rows.push(["Gross Revenue", m.revenue]);
    rows.push(["Business Expenses", m.expTotal]);
    rows.push([`Mileage Deduction (${m.miles} mi)`, m.mileDeduct]);
    rows.push(["Net Profit", m.netProfit]);
    rows.push(["Self-Employment Tax (15.3%)", m.seTax]);
    rows.push(["Federal Income Tax Est.", m.fedTax]);
    rows.push(["Total Estimated Tax", m.totalTax]);
    rows.push([]);

    rows.push(["QUARTERLY BREAKDOWN", "Revenue", "Expenses", "Net Profit", "Tax Est.", "Due Date"]);
    quarters.forEach(q => {
      rows.push([
        `${q.label} (${q.period})`,
        q.metrics.revenue, q.metrics.expTotal,
        q.metrics.netProfit, q.metrics.totalTax, q.due,
      ]);
    });
    rows.push([]);

    rows.push(["--- JOBS ---"]);
    rows.push(["Job #", "Date", "Customer", "Phone", "Veh Year", "Make", "Model",
      "Services", "Labor", "Parts", "Tax", "Grand Total", "Payment"]);
    annual.jobs.forEach(j => {
      rows.push([
        j.jobNumber || j.job_number, j.date,
        j.customerName || j.customer_name, j.customerPhone || j.customer_phone,
        j.vehicleYear || j.vehicle_year, j.vehicleMake || j.vehicle_make,
        j.vehicleModel || j.vehicle_model,
        j.lines?.map(l => l.service).join("; "),
        Number(j.labor), Number(j.parts), Number(j.tax),
        Number(j.grandTotal || j.grand_total), j.payMethod || j.pay_method,
      ]);
    });
    rows.push(["", "", "", "", "", "", "", "TOTAL",
      annual.jobs.reduce((s, j) => s + Number(j.labor || 0), 0),
      annual.jobs.reduce((s, j) => s + Number(j.parts || 0), 0),
      annual.jobs.reduce((s, j) => s + Number(j.tax   || 0), 0),
      m.revenue, ""]);
    rows.push([]);

    rows.push(["--- EXPENSES ---"]);
    rows.push(["Date", "Category", "Description", "Vendor", "Amount"]);
    annual.expenses.forEach(e => {
      rows.push([e.date, e.category, e.description, e.vendor, Number(e.amount)]);
    });
    rows.push(["", "", "", "TOTAL", m.expTotal]);
    rows.push([]);

    rows.push(["--- MILEAGE ---"]);
    rows.push(["Date", "Purpose", "From", "To", "Miles", `Deduction ($${mileageRate}/mi)`]);
    annual.mileage.forEach(mi => {
      rows.push([
        mi.date, mi.purpose, mi.from, mi.to,
        Number(mi.miles),
        +(Number(mi.miles) * mileageRate).toFixed(2),
      ]);
    });
    rows.push(["", "", "", "TOTAL", m.miles, +m.mileDeduct.toFixed(2)]);
    rows.push([]);
    rows.push(["Note: Estimates only. Consult a licensed tax professional."]);

    return rows.map(row =>
      row.map(cell => {
        const val = cell == null ? "" : String(cell);
        return val.includes(",") || val.includes('"') || val.includes("\n")
          ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(",")
    ).join("\n");
  }

  function exportCSV() {
    setExporting(true);
    try {
      const csv = buildCSV();
      // mailto approach — works on every iOS device, no Safari restrictions
      const subject = `OMS ${year} Business Report`;
      const body = csv;
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } catch (e) {
      alert("Export failed: " + e.message);
    }
    setTimeout(() => setExporting(false), 1500);
  }

  function printSummary() {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrinting(false), 500);
    }, 300);
  }

  const qColors = [C.accent, "#10b981", "#f59e0b", "#8b5cf6"];
  const hasData = annual.jobs.length > 0 || annual.expenses.length > 0 || annual.mileage.length > 0;

  return (
    <div>
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

      {/* Export buttons */}
      <div style={{ ...S.card, marginBottom: 12 }} className="no-print">
        <div style={S.cardTitle}>Export</div>
        <button
          style={{ ...S.btnPrimary, width: "100%", padding: "12px 0", fontSize: 13, marginBottom: 10 }}
          onClick={exportCSV}
          disabled={exporting}
        >
          {exporting ? "Opening Mail..." : `↓ Export ${year} Report`}
        </button>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10, textAlign: "center" }}>
          Opens Mail app — send to yourself or your accountant
        </div>
        <button
          style={{ ...S.btnSecondary, width: "100%" }}
          onClick={printSummary}
          disabled={printing}
        >
          {printing ? "Preparing..." : "Print / Save as PDF"}
        </button>
        {!hasData && (
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8, textAlign: "center" }}>
            No data for {year} — add jobs, expenses, or mileage first.
          </div>
        )}
      </div>

      {/* Print report */}
      <div
        style={{
          display: printing ? "block" : "none",
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 9999,
          background: "#fff",
          fontFamily: "'Roboto', Arial, sans-serif",
          color: "#111",
          padding: "32px 40px",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #3b82f6", paddingBottom: 16, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>OCASIO</div>
            <div style={{ fontSize: 12, color: "#666", letterSpacing: "0.1em" }}>MECHANICAL SERVICES LLC</div>
            <div style={{ fontSize: 11, color: "#999" }}>Mobile Automotive Service · Florida</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#3b82f6" }}>{year} Tax Summary Report</div>
            <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>Generated: {new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          {quarters.map((q, i) => {
            const m = q.metrics;
            const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];
            return (
              <div key={q.label} style={{ border: "1px solid #e0e0e0", borderTop: `3px solid ${colors[i]}`, borderRadius: 6, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, color: colors[i] }}>{q.label} — {q.period}</div>
                  <div style={{ fontSize: 10, color: "#999" }}>Due {q.due}</div>
                </div>
                <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                  <tbody>
                    <tr><td style={{ color: "#555", padding: "2px 0" }}>Revenue</td><td style={{ textAlign: "right", color: "#16a34a", fontWeight: 600 }}>{fmt(m.revenue)}</td></tr>
                    <tr><td style={{ color: "#555", padding: "2px 0" }}>Expenses</td><td style={{ textAlign: "right", color: "#dc2626" }}>{fmt(m.expTotal)}</td></tr>
                    <tr><td style={{ color: "#555", padding: "2px 0" }}>Net Profit</td><td style={{ textAlign: "right", fontWeight: 600 }}>{fmt(m.netProfit)}</td></tr>
                    <tr><td style={{ color: "#555", padding: "2px 0" }}>Tax Est.</td><td style={{ textAlign: "right", color: "#b45309", fontWeight: 600 }}>{fmt(m.totalTax)}</td></tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        <div style={{ background: "#f9f9f9", borderRadius: 6, padding: "16px 18px", marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: "#3b82f6", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontWeight: 600 }}>Annual Summary</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <tbody>
              {[
                ["Gross Revenue",               fmt(annual.metrics.revenue),               "#16a34a", true],
                ["Business Expenses",           `− ${fmt(annual.metrics.expTotal)}`,       "#dc2626", false],
                ["Mileage Deduction",           `− ${fmt(annual.metrics.mileDeduct)}`,     "#dc2626", false],
                ["Net Profit",                  fmt(annual.metrics.netProfit),             "#111",    true],
                ["Self-Employment Tax (15.3%)", fmt(annual.metrics.seTax),                "#b45309", false],
                ["Federal Income Tax Est.",     fmt(annual.metrics.fedTex),               "#b45309", false],
                ["Total Estimated Tax",         fmt(annual.metrics.totalTax),             "#3b82f6", true],
              ].map(([label, value, color, bold], i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "7px 0", color: "#333" }}>{label}</td>
                  <td style={{ padding: "7px 0", textAlign: "right", fontWeight: bold ? 700 : 400, color }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 11, color: "#999", marginTop: 8, borderTop: "1px solid #e8e8e8", paddingTop: 8 }}>
            Quarterly payment: <strong>{fmt(annual.metrics.totalTax / 4)}</strong> · Due: Q1 Apr 15 · Q2 Jun 15 · Q3 Sep 15 · Q4 Jan 15
          </div>
        </div>

        <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: 16, fontSize: 10, color: "#999", textAlign: "center" }}>
          Estimates only — consult a licensed tax professional. Ocasio Mechanical Services LLC · Florida · {new Date().toLocaleDateString()}
        </div>

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <button
            onClick={() => { window.print(); }}
            style={{ background: "#3b82f6", border: "none", borderRadius: 6, padding: "12px 32px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", marginRight: 12 }}
          >
            Print / Save PDF
          </button>
          <button
            onClick={() => setPrinting(false)}
            style={{ background: "#eee", border: "none", borderRadius: 6, padding: "12px 32px", color: "#333", fontSize: 13, cursor: "pointer" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
