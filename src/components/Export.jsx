import { useState, useMemo, useRef } from "react";
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
  const [generating, setGenerating] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);
  const [sharing, setSharing] = useState(false);
  const pdfFileRef = useRef(null);
  const pdfBlobRef = useRef(null);

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

  const qColors = [C.accent, "#10b981", "#f59e0b", "#8b5cf6"];
  const hasData = annual.jobs.length > 0 || annual.expenses.length > 0 || annual.mileage.length > 0;

  async function buildPDF() {
    setGenerating(true);
    setPdfReady(false);
    pdfFileRef.current = null;
    pdfBlobRef.current = null;
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const m = annual.metrics;
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const ML = 56;  // margin left
      const MR = 56;  // margin right
      const colR = pageW - MR; // right edge
      let y = 56;

      // ── Color palette — accounting document style ──
      const BLACK    = [17, 17, 17];
      const DARK     = [40, 40, 40];
      const MID      = [80, 80, 80];
      const LTGRAY   = [180, 180, 180];
      const RULERGRAY= [210, 210, 210];
      const OFFWHITE = [248, 248, 248];
      const TAN      = [161, 130, 98];  // like the reference heading color
      const WHITE    = [255, 255, 255];

      // ── Helpers ──
      function txt(str, x, ry, opts = {}) { doc.text(String(str), x, ry, opts); }
      function setT(rgb) { doc.setTextColor(...rgb); }
      function setF(rgb) { doc.setFillColor(...rgb); }
      function setD(rgb, lw = 0.5) { doc.setDrawColor(...rgb); doc.setLineWidth(lw); }
      function font(style, size) { doc.setFont("times", style); doc.setFontSize(size); }
      function hline(ry, rgb = RULERGRAY, lw = 0.5) {
        setD(rgb, lw);
        doc.line(ML, ry, colR, ry);
      }
      function checkPage(needed = 32) {
        if (y + needed > pageH - 56) { doc.addPage(); y = 56; }
      }

      // ── Section heading — matches reference style ──
      function sectionHeading(label) {
        checkPage(36);
        y += 18;
        font("bold", 13);
        setT(TAN);
        txt(label, ML, y);
        y += 6;
        hline(y, RULERGRAY, 0.75);
        y += 14;
        setT(DARK);
      }

      // Redefine TAN since const isn't hoisted
      const TAN2 = [161, 130, 98];
      function sectionHead(label) {
        checkPage(36);
        y += 18;
        font("bold", 13);
        setT(TAN2);
        txt(label, ML, y);
        y += 6;
        hline(y, RULERGRAY, 0.75);
        y += 14;
        setT(DARK);
      }

      // ── Data row: label left, value right ──
      function dataRow(label, value, opts = {}) {
        checkPage(20);
        const indent = opts.indent || 0;
        const bold   = opts.bold   || false;
        const color  = opts.color  || DARK;
        font(bold ? "bold" : "normal", 10);
        setT(bold ? BLACK : MID);
        txt(label, ML + indent, y);
        setT(color);
        font(bold ? "bold" : "normal", 10);
        txt(value, colR, y, { align: "right" });
        if (opts.rule) hline(y + 3, RULERGRAY, 0.4);
        if (opts.ruleHeavy) hline(y + 3, BLACK, 0.75);
        y += opts.rule || opts.ruleHeavy ? 18 : 16;
      }

      // ── Total row with light background ──
      function totalRow(label, value, color = BLACK) {
        checkPage(24);
        setF(OFFWHITE);
        setD(OFFWHITE);
        doc.rect(ML, y - 12, colR - ML, 18, "F");
        font("bold", 11);
        setT(BLACK);
        txt(label, ML + 4, y);
        setT(color);
        txt(value, colR, y, { align: "right" });
        hline(y + 4, BLACK, 0.75);
        y += 22;
      }

      // ── Quarterly mini-table ──
      function quarterBlock(q, qm) {
        checkPage(110);
        font("bold", 11);
        setT(DARK);
        txt(`${q.label}  —  ${q.period}`, ML, y);
        font("normal", 9);
        setT(LTGRAY);
        txt(`Estimated payment due: ${q.due}`, colR, y, { align: "right" });
        y += 6;
        hline(y, RULERGRAY, 0.5);
        y += 12;

        [
          ["Gross Revenue",   fmt(qm.revenue),    false, DARK],
          ["Business Expenses", fmt(qm.expTotal), false, DARK],
          ["Net Profit",      fmt(qm.netProfit),  true,  qm.netProfit >= 0 ? [21, 128, 61] : [180, 30, 30]],
          ["Tax Estimate",    fmt(qm.totalTax),   true,  [100, 70, 10]],
        ].forEach(([label, val, bold, col]) => {
          dataRow(label, val, { indent: 8, bold, color: col, rule: true });
        });

        font("normal", 8);
        setT(LTGRAY);
        txt(`${q.jobs.length} jobs  ·  ${q.expenses.length} expenses  ·  ${q.mileage.length} mileage trips`, ML + 8, y);
        y += 18;
      }

      // ════════════════════════════════
      // PAGE 1 — Cover / Header
      // ════════════════════════════════

      // Report title — large, tan, serif
      font("bold", 28);
      setT(TAN2);
      txt("Annual Tax Summary", ML, y);
      y += 32;

      font("bold", 13);
      setT(DARK);
      txt(BIZ.name, ML, y);
      y += 18;

      font("normal", 11);
      setT(MID);
      txt(`For the year ended December 31, ${year}`, ML, y);
      y += 16;
      txt("Cash Basis", ML, y);
      y += 24;

      hline(y, BLACK, 1);
      y += 8;

      font("normal", 9);
      setT(LTGRAY);
      txt(`${BIZ.address}  ·  ${BIZ.city}  ·  ${BIZ.phone}  ·  ${BIZ.email}`, ML, y);
      txt(
        `Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
        colR, y, { align: "right" }
      );
      y += 28;

      // ── Tax rate settings ──
      sectionHead("Tax Rate Settings Used");
      dataRow("Self-Employment Tax Rate", `${(seTaxRate * 100).toFixed(1)}%`, { rule: true });
      dataRow("Federal Income Tax Rate (Estimated)", `${(fedTaxRate * 100).toFixed(1)}%`, { rule: true });
      dataRow("IRS Standard Mileage Rate", `$${mileageRate} per mile`, { rule: true });
      y += 8;

      // ── Income ──
      sectionHead("Income");
      dataRow("Gross Revenue — Automotive Services", fmt(m.revenue), { indent: 8, rule: true });
      y += 4;
      totalRow("Total Income", fmt(m.revenue));
      y += 8;

      // ── Deductions ──
      sectionHead("Deductions");
      dataRow("Business Expenses", fmt(m.expTotal), { indent: 8, rule: true });
      dataRow(
        `Mileage Deduction  (${m.miles.toLocaleString()} mi × $${mileageRate})`,
        fmt(m.mileDeduct), { indent: 8, rule: true }
      );
      y += 4;
      totalRow("Total Deductions", fmt(m.expTotal + m.mileDeduct));
      y += 8;

      // ── Net profit ──
      sectionHead("Net Profit");
      totalRow(
        "Net Profit",
        fmt(m.netProfit),
        m.netProfit >= 0 ? [21, 128, 61] : [180, 30, 30]
      );
      y += 8;

      // ── Tax estimates ──
      sectionHead("Estimated Tax Liability");
      dataRow("Self-Employment Tax  (15.3% × 92.35% of net profit)", fmt(m.seTax), { indent: 8, rule: true });
      dataRow("Federal Income Tax Estimate", fmt(m.fedTax), { indent: 8, rule: true });
      y += 4;
      totalRow("Total Estimated Tax Liability", fmt(m.totalTax), [100, 70, 10]);
      y += 4;

      font("normal", 9);
      setT(MID);
      txt(
        `Estimated quarterly payment:  ${fmt(m.totalTax / 4)}  per quarter`,
        ML, y
      );
      y += 14;
      font("normal", 8);
      setT(LTGRAY);
      txt("Due dates:  Q1 Apr 15  ·  Q2 Jun 15  ·  Q3 Sep 15  ·  Q4 Jan 15", ML, y);
      y += 24;

      // ════════════════════════════════
      // PAGE 2 — Quarterly Breakdown
      // ════════════════════════════════
      doc.addPage();
      y = 56;

      font("bold", 18);
      setT(TAN2);
      txt("Quarterly Breakdown", ML, y);
      y += 8;
      hline(y, BLACK, 1);
      y += 20;

      font("normal", 10);
      setT(MID);
      txt(`${BIZ.name}  ·  ${year}`, ML, y);
      y += 24;

      quarters.forEach(q => quarterBlock(q, q.metrics));

      // ── Quarterly totals summary table ──
      y += 8;
      sectionHead("Annual Totals from Quarterly Data");

      // Header row
      const qCols = [colR - 280, colR - 190, colR - 100, colR];
      font("bold", 9);
      setT(LTGRAY);
      ["Q1", "Q2", "Q3", "Q4"].forEach((label, i) => txt(label, qCols[i], y, { align: "right" }));
      y += 6;
      hline(y, RULERGRAY, 0.5);
      y += 12;

      [
        ["Revenue",    quarters.map(q => fmt(q.metrics.revenue))],
        ["Expenses",   quarters.map(q => fmt(q.metrics.expTotal))],
        ["Net Profit", quarters.map(q => fmt(q.metrics.netProfit))],
        ["Tax Est.",   quarters.map(q => fmt(q.metrics.totalTax))],
      ].forEach(([label, vals]) => {
        font("normal", 10);
        setT(MID);
        txt(label, ML + 8, y);
        font("normal", 10);
        vals.forEach((v, i) => {
          setT(DARK);
          txt(v, qCols[i], y, { align: "right" });
        });
        hline(y + 3, RULERGRAY, 0.3);
        y += 16;
      });

      // ════════════════════════════════
      // PAGE 3 — Expenses + Mileage
      // ════════════════════════════════
      doc.addPage();
      y = 56;

      font("bold", 18);
      setT(TAN2);
      txt("Business Expenses & Mileage", ML, y);
      y += 8;
      hline(y, BLACK, 1);
      y += 20;

      font("normal", 10);
      setT(MID);
      txt(`${BIZ.name}  ·  ${year}`, ML, y);
      y += 24;

      // Expenses by category
      sectionHead("Business Expenses by Category");

      if (expensesByCategory.length === 0) {
        font("normal", 10);
        setT(LTGRAY);
        txt(`No expenses recorded for ${year}.`, ML + 8, y);
        y += 20;
      } else {
        // Column header
        font("bold", 9);
        setT(LTGRAY);
        txt("CATEGORY", ML + 8, y);
        txt("AMOUNT", colR, y, { align: "right" });
        txt("% OF TOTAL", colR - 80, y, { align: "right" });
        y += 6;
        hline(y, RULERGRAY, 0.5);
        y += 12;

        expensesByCategory.forEach(([cat, total]) => {
          checkPage(20);
          const pct = m.expTotal > 0 ? (total / m.expTotal * 100).toFixed(1) : "0.0";
          font("normal", 10);
          setT(DARK);
          txt(cat, ML + 8, y);
          setT(MID);
          txt(`${pct}%`, colR - 80, y, { align: "right" });
          setT(DARK);
          txt(fmt(total), colR, y, { align: "right" });
          hline(y + 3, RULERGRAY, 0.3);
          y += 16;
        });

        y += 4;
        totalRow("Total Business Expenses", fmt(m.expTotal));
      }

      y += 12;

      // Mileage
      sectionHead("Mileage Log Summary");

      font("bold", 9);
      setT(LTGRAY);
      txt("DESCRIPTION", ML + 8, y);
      txt("VALUE", colR, y, { align: "right" });
      y += 6;
      hline(y, RULERGRAY, 0.5);
      y += 12;

      [
        ["Total Trips Logged",       String(annual.mileage.length)],
        ["Total Miles Driven",       `${m.miles.toLocaleString()} miles`],
        ["IRS Standard Rate Applied",`$${mileageRate} per mile`],
      ].forEach(([label, val]) => {
        dataRow(label, val, { indent: 8, rule: true });
      });
      y += 4;
      totalRow("Total Mileage Deduction", fmt(m.mileDeduct));

      // ── Footer on every page ──
      const pageCount = doc.internal.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        hline(pageH - 36, RULERGRAY, 0.5);
        font("normal", 8);
        setT(LTGRAY);
        txt(
          `${BIZ.name}  ·  Estimates only — consult a licensed tax professional before filing`,
          pageW / 2, pageH - 22, { align: "center" }
        );
        txt(`${year} Annual Tax Summary`, ML, pageH - 22);
        txt(`Page ${p} of ${pageCount}`, colR, pageH - 22, { align: "right" });
      }

      const blob = doc.output("blob");
      pdfBlobRef.current = blob;
      pdfFileRef.current = new File([blob], `OMS-${year}-Annual-Report.pdf`, { type: "application/pdf" });
      setPdfReady(true);

    } catch (e) {
      alert("PDF build failed: " + e.message);
    }
    setGenerating(false);
  }

  async function sharePDF() {
    if (!pdfFileRef.current || !pdfBlobRef.current) return;
    setSharing(true);
    try {
      const canShare = navigator.canShare && navigator.canShare({ files: [pdfFileRef.current] });
      if (canShare) {
        await navigator.share({
          files: [pdfFileRef.current],
          title: `OMS ${year} Annual Tax Summary`,
        });
      } else {
        const url = URL.createObjectURL(pdfBlobRef.current);
        const a = document.createElement("a");
        a.href = url;
        a.download = `OMS-${year}-Annual-Report.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    } catch (e) {
      if (e.name !== "AbortError") alert("Share failed: " + e.message);
    }
    setSharing(false);
  }

  return (
    <div>
      {/* Year selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => { setYear(y => y - 1); setPdfReady(false); }} style={{ ...S.btnSecondary, padding: "8px 14px" }}>←</button>
        <div style={{ fontSize: 18, fontWeight: 700, flex: 1, textAlign: "center" }}>{year}</div>
        <button onClick={() => { setYear(y => y + 1); setPdfReady(false); }} style={{ ...S.btnSecondary, padding: "8px 14px" }}>→</button>
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
                  ["Revenue",  fmt(m.revenue),  C.green],
                  ["Expenses", fmt(m.expTotal),  C.red],
                  ["Mileage",  `${m.miles} mi`,  C.textSecondary],
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

      {/* Export card */}
      <div style={{ ...S.card, marginBottom: 24 }}>
        <div style={S.cardTitle}>Export</div>
        <button
          style={{ ...S.btnPrimary, width: "100%", padding: "14px 0", fontSize: 14, marginBottom: 10 }}
          onClick={buildPDF}
          disabled={generating || !hasData}
        >
          {generating ? "Building PDF..." : `Build ${year} PDF Report`}
        </button>
        {pdfReady && (
          <button
            style={{ ...S.btnPrimary, width: "100%", padding: "14px 0", fontSize: 14, marginBottom: 8, background: "#059669" }}
            onClick={sharePDF}
            disabled={sharing}
          >
            {sharing ? "Opening Share..." : "Share / Save PDF ↗"}
          </button>
        )}
        <div style={{ fontSize: 11, color: C.textMuted, textAlign: "center" }}>
          {pdfReady
            ? "PDF ready — tap Share to send to Mail, Files, or AirDrop"
            : "Tap Build to generate your annual PDF report"}
        </div>
        {!hasData && (
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8, textAlign: "center" }}>
            No data for {year} — add jobs, expenses, or mileage first.
          </div>
        )}
      </div>
    </div>
  );
}
