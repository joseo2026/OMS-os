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

  // All quarter cards same navy accent
  const qColor = C.accent;
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
      const ML = 56;
      const MR = 56;
      const colR = pageW - MR;
      let y = 0;

      const NAVY   = [10,  36,  99];
      const STEEL  = [37,  99,  235];
      const BLACK  = [10,  10,  10];
      const DGRAY  = [55,  65,  81];
      const MGRAY  = [107, 114, 128];
      const LGRAY  = [209, 213, 219];
      const XLGRAY = [243, 244, 246];
      const WHITE  = [255, 255, 255];
      const GREEN  = [21,  128, 61];
      const RED    = [185, 28,  28];

      function f(style, size) { doc.setFont("helvetica", style); doc.setFontSize(size); }
      function tc(rgb) { doc.setTextColor(...rgb); }
      function fc(rgb) { doc.setFillColor(...rgb); }
      function dc(rgb, lw = 0.5) { doc.setDrawColor(...rgb); doc.setLineWidth(lw); }
      function t(str, x, ry, opts = {}) { doc.text(String(str), x, ry, opts); }
      function hline(ry, rgb = LGRAY, lw = 0.5) { dc(rgb, lw); doc.line(ML, ry, colR, ry); }
      function checkPage(needed = 32) {
        if (y + needed > pageH - 56) { doc.addPage(); y = 56; }
      }

      function row(label, value, opts = {}) {
        checkPage(22);
        const indent = opts.indent || 0;
        const bold   = opts.bold   || false;
        const color  = opts.color  || BLACK;
        if (opts.band) {
          fc(XLGRAY); dc(XLGRAY);
          doc.rect(ML, y - 12, colR - ML, 17, "F");
        }
        f(bold ? "bold" : "normal", opts.size || 10);
        tc(bold ? BLACK : DGRAY);
        t(label, ML + indent, y);
        tc(color);
        f(bold ? "bold" : "normal", opts.size || 10);
        t(value, colR, y, { align: "right" });
        if (opts.rule)      hline(y + 4, LGRAY, 0.4);
        if (opts.ruleHeavy) hline(y + 4, BLACK, 1);
        if (opts.ruleBlue)  hline(y + 4, STEEL, 0.75);
        y += (opts.rule || opts.ruleHeavy || opts.ruleBlue) ? 20 : 18;
      }

      function totalRow(label, value, color = STEEL) {
        checkPage(26);
        fc(XLGRAY); dc(LGRAY, 0.5);
        doc.rect(ML, y - 13, colR - ML, 20, "FD");
        f("bold", 11);
        tc(NAVY);
        t(label, ML + 6, y);
        tc(color);
        t(value, colR, y, { align: "right" });
        hline(y + 5, NAVY, 1);
        y += 24;
      }

      function sectionHead(label) {
        checkPage(38);
        y += 14;
        fc(NAVY); dc(NAVY);
        doc.rect(ML, y - 13, colR - ML, 20, "F");
        f("bold", 10);
        tc(WHITE);
        t(label.toUpperCase(), ML + 8, y);
        y += 16;
      }

      function colHeader(labels, xs) {
        f("bold", 8);
        tc(MGRAY);
        labels.forEach((label, i) => t(label, xs[i], y, i === 0 ? {} : { align: "right" }));
        y += 6;
        hline(y, LGRAY, 0.5);
        y += 10;
      }

      // ── PAGE 1: Header + Annual Summary ──
      fc(NAVY); dc(NAVY);
      doc.rect(0, 0, pageW, 100, "F");
      fc(STEEL); dc(STEEL);
      doc.rect(0, 100, pageW, 3, "F");

      f("bold", 22); tc(WHITE);
      t("OCASIO MECHANICAL SERVICES", ML, 38);
      f("normal", 11); tc([147, 197, 253]);
      t("LLC  ·  Mobile Automotive Service  ·  Florida", ML, 56);
      f("normal", 9); tc([147, 197, 253]);
      t(`${BIZ.address}  ·  ${BIZ.city}  ·  ${BIZ.phone}  ·  ${BIZ.email}`, ML, 72);

      f("bold", 42); tc(WHITE);
      t(String(year), colR, 52, { align: "right" });
      f("normal", 10); tc([147, 197, 253]);
      t("Annual Tax Summary", colR, 70, { align: "right" });

      y = 120;
      f("bold", 13); tc(NAVY);
      t("Annual Tax Summary Report", ML, y);
      y += 16;
      f("normal", 10); tc(DGRAY);
      t(`For the year ended December 31, ${year}  ·  Cash Basis`, ML, y);
      y += 14;
      f("normal", 9); tc(MGRAY);
      t(`Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}   ·   ${annual.jobs.length} jobs completed this year`, ML, y);
      y += 6;
      hline(y, LGRAY, 0.5);
      y += 18;

      sectionHead("Tax Rate Settings Used");
      colHeader(["SETTING", "RATE APPLIED"], [ML + 8, colR]);
      row("Self-Employment Tax Rate",            `${(seTaxRate * 100).toFixed(1)}%`,  { indent: 8, rule: true });
      row("Federal Income Tax Rate (Estimated)", `${(fedTaxRate * 100).toFixed(1)}%`, { indent: 8, rule: true });
      row("IRS Standard Mileage Rate",           `$${mileageRate} per mile`,           { indent: 8, rule: true });
      y += 6;

      sectionHead("Income");
      colHeader(["DESCRIPTION", "AMOUNT"], [ML + 8, colR]);
      row("Gross Revenue — Automotive Services", fmt(m.revenue), { indent: 8, rule: true, color: BLACK });
      y += 2;
      totalRow("Total Income", fmt(m.revenue), GREEN);
      y += 6;

      sectionHead("Deductions");
      colHeader(["DESCRIPTION", "AMOUNT"], [ML + 8, colR]);
      row("Business Expenses", fmt(m.expTotal), { indent: 8, rule: true, color: BLACK });
      row(`Mileage Deduction  (${m.miles.toLocaleString()} mi × $${mileageRate})`, fmt(m.mileDeduct), { indent: 8, rule: true, color: BLACK });
      y += 2;
      totalRow("Total Deductions", fmt(m.expTotal + m.mileDeduct), RED);
      y += 6;

      sectionHead("Net Profit");
      y += 4;
      totalRow("Net Profit", fmt(m.netProfit), m.netProfit >= 0 ? GREEN : RED);
      y += 6;

      sectionHead("Estimated Tax Liability");
      colHeader(["DESCRIPTION", "AMOUNT"], [ML + 8, colR]);
      row("Self-Employment Tax  (15.3% × 92.35% of net profit)", fmt(m.seTax),  { indent: 8, rule: true, color: BLACK });
      row("Federal Income Tax Estimate",                          fmt(m.fedTax), { indent: 8, rule: true, color: BLACK });
      y += 2;
      totalRow("Total Estimated Tax Liability", fmt(m.totalTax), STEEL);
      y += 8;

      checkPage(46);
      fc([239, 246, 255]); dc(STEEL, 1);
      doc.rect(ML, y, colR - ML, 38, "FD");
      fc(STEEL); dc(STEEL);
      doc.rect(ML, y, 4, 38, "F");
      f("bold", 10); tc(NAVY);
      t("Estimated Quarterly Tax Payment", ML + 14, y + 14);
      f("bold", 13); tc(STEEL);
      t(fmt(m.totalTax / 4), colR - 8, y + 14, { align: "right" });
      f("normal", 8); tc(MGRAY);
      t("Due: Q1 Apr 15  ·  Q2 Jun 15  ·  Q3 Sep 15  ·  Q4 Jan 15", ML + 14, y + 28);
      y += 52;

      // ── PAGE 2: Quarterly Breakdown ──
      doc.addPage();
      y = 56;

      f("bold", 18); tc(NAVY);
      t("Quarterly Breakdown", ML, y);
      y += 6;
      hline(y, NAVY, 1.5);
      y += 14;
      f("normal", 9); tc(MGRAY);
      t(`${BIZ.name}  ·  ${year} Annual Tax Summary`, ML, y);
      y += 22;

      quarters.forEach((q) => {
        const qm = q.metrics;
        checkPage(120);

        // All quarters — same navy bar
        fc(NAVY); dc(NAVY);
        doc.rect(ML, y, colR - ML, 22, "F");
        f("bold", 11); tc(WHITE);
        t(q.label, ML + 10, y + 15);
        f("normal", 9); tc([147, 197, 253]);
        t(q.period, ML + 38, y + 15);
        t(`Est. due: ${q.due}  ·  ${q.jobs.length} jobs  ·  ${q.expenses.length} expenses`, colR - 8, y + 15, { align: "right" });
        y += 28;

        row("Gross Revenue",     fmt(qm.revenue),                   { indent: 8, rule: true, color: BLACK });
        row("Business Expenses", fmt(qm.expTotal),                  { indent: 8, rule: true, color: BLACK });
        row("Mileage",           `${qm.miles.toLocaleString()} mi`, { indent: 8, rule: true, color: DGRAY });
        row("Net Profit",        fmt(qm.netProfit),                 { indent: 8, rule: true, bold: true, color: qm.netProfit >= 0 ? GREEN : RED });
        row("Tax Estimate",      fmt(qm.totalTax),                  { indent: 8, rule: true, bold: true, color: STEEL });
        y += 12;
      });

      y += 4;
      sectionHead("Full Year Totals");
      y += 4;

      const qCols = [ML + 8, colR - 270, colR - 180, colR - 90, colR];
      colHeader(["", "Q1", "Q2", "Q3", "Q4"], qCols);

      [
        ["Revenue",    quarters.map(q => fmt(q.metrics.revenue)),   BLACK],
        ["Expenses",   quarters.map(q => fmt(q.metrics.expTotal)),  BLACK],
        ["Net Profit", quarters.map(q => fmt(q.metrics.netProfit)), STEEL],
        ["Tax Est.",   quarters.map(q => fmt(q.metrics.totalTax)),  DGRAY],
      ].forEach(([label, vals, color], ri) => {
        checkPage(20);
        if (ri % 2 === 0) { fc(XLGRAY); dc(XLGRAY); doc.rect(ML, y - 12, colR - ML, 17, "F"); }
        f("normal", 10); tc(DGRAY);
        t(label, qCols[0], y);
        f("bold", 10); tc(color);
        vals.forEach((v, i) => t(v, qCols[i + 1], y, { align: "right" }));
        hline(y + 4, LGRAY, 0.3);
        y += 18;
      });

      // ── PAGE 3: Expenses + Mileage ──
      doc.addPage();
      y = 56;

      f("bold", 18); tc(NAVY);
      t("Business Expenses & Mileage", ML, y);
      y += 6;
      hline(y, NAVY, 1.5);
      y += 14;
      f("normal", 9); tc(MGRAY);
      t(`${BIZ.name}  ·  ${year} Annual Tax Summary`, ML, y);
      y += 22;

      sectionHead("Business Expenses by Category");
      colHeader(["CATEGORY", "% OF TOTAL", "AMOUNT"], [ML + 8, colR - 80, colR]);

      if (expensesByCategory.length === 0) {
        f("normal", 10); tc(MGRAY);
        t(`No expenses recorded for ${year}.`, ML + 8, y);
        y += 20;
      } else {
        expensesByCategory.forEach(([cat, total], i) => {
          checkPage(20);
          const pct = m.expTotal > 0 ? (total / m.expTotal * 100).toFixed(1) : "0.0";
          if (i % 2 === 0) { fc(XLGRAY); dc(XLGRAY); doc.rect(ML, y - 12, colR - ML, 17, "F"); }
          f("normal", 10); tc(DGRAY);
          t(cat, ML + 8, y);
          tc(MGRAY);
          t(`${pct}%`, colR - 80, y, { align: "right" });
          tc(BLACK);
          t(fmt(total), colR, y, { align: "right" });
          hline(y + 4, LGRAY, 0.3);
          y += 18;
        });
        y += 4;
        totalRow("Total Business Expenses", fmt(m.expTotal), RED);
      }

      y += 12;
      sectionHead("Mileage Log Summary");
      colHeader(["DESCRIPTION", "VALUE"], [ML + 8, colR]);

      [
        ["Total Trips Logged",        String(annual.mileage.length)],
        ["Total Miles Driven",        `${m.miles.toLocaleString()} miles`],
        ["IRS Standard Rate Applied", `$${mileageRate} per mile`],
      ].forEach(([label, val], i) => {
        if (i % 2 === 0) { fc(XLGRAY); dc(XLGRAY); doc.rect(ML, y - 12, colR - ML, 17, "F"); }
        row(label, val, { indent: 8, rule: true, color: BLACK });
      });
      y += 4;
      totalRow("Total Mileage Deduction", fmt(m.mileDeduct), RED);

      y += 20;
      checkPage(50);
      fc([239, 246, 255]); dc(LGRAY, 0.5);
      doc.rect(ML, y, colR - ML, 36, "FD");
      f("normal", 8); tc(MGRAY);
      t("This report is generated from internal business records and contains estimates only.", pageW / 2, y + 13, { align: "center" });
      t("All figures should be reviewed by a licensed tax professional before filing.",        pageW / 2, y + 25, { align: "center" });
      y += 44;

      // ── Footer on every page ──
      const pageCount = doc.internal.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        fc(NAVY); dc(NAVY);
        doc.rect(0, pageH - 28, pageW, 28, "F");
        f("normal", 8); tc([147, 197, 253]);
        t(BIZ.name,                    ML,        pageH - 10);
        t(`${year} Annual Tax Summary`, pageW / 2, pageH - 10, { align: "center" });
        t(`Page ${p} of ${pageCount}`, colR,      pageH - 10, { align: "right" });
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
        await navigator.share({ files: [pdfFileRef.current], title: `OMS ${year} Annual Tax Summary` });
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

      {/* Quarterly cards — all same navy accent */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {quarters.map((q) => {
          const m = q.metrics;
          return (
            <div key={q.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 16px", borderTop: `3px solid ${qColor}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: qColor }}>{q.label}</div>
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
