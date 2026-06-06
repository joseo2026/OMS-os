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

  const qColor  = C.accent;
  const hasData = annual.jobs.length > 0 || annual.expenses.length > 0 || annual.mileage.length > 0;

  async function buildPDF() {
    setGenerating(true);
    setPdfReady(false);
    pdfFileRef.current = null;
    pdfBlobRef.current = null;
    try {
      const { jsPDF } = await import("jspdf");
      const doc    = new jsPDF({ unit: "pt", format: "letter" });
      const m      = annual.metrics;
      const pageW  = doc.internal.pageSize.getWidth();
      const pageH  = doc.internal.pageSize.getHeight();
      const ML     = 56;
      const colR   = pageW - 56;
      const BOTTOM = pageH - 48;
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

      function f(style, size)           { doc.setFont("helvetica", style); doc.setFontSize(size); }
      function tc(rgb)                  { doc.setTextColor(...rgb); }
      function fc(rgb)                  { doc.setFillColor(...rgb); }
      function dc(rgb, lw = 0.5)        { doc.setDrawColor(...rgb); doc.setLineWidth(lw); }
      function t(str, x, ry, opts = {}) { doc.text(String(str), x, ry, opts); }
      function hline(ry, rgb = LGRAY, lw = 0.5) { dc(rgb, lw); doc.line(ML, ry, colR, ry); }
      function checkPage(needed = 32)   { if (y + needed > BOTTOM) { doc.addPage(); y = 56; } }
      function newPage()                { doc.addPage(); y = 56; }

      function sectionLabel(label) {
        checkPage(32);
        y += 10;
        hline(y - 8, LGRAY, 0.3);
        f("bold", 9);
        tc(NAVY);
        t(label.toUpperCase(), ML, y);
        y += 14;
      }

      function row(label, value, opts = {}) {
        checkPage(18);
        const indent = opts.indent || 0;
        const bold   = opts.bold   || false;
        const color  = opts.color  || DGRAY;
        if (opts.band) {
          fc(XLGRAY); dc(XLGRAY);
          doc.rect(ML, y - 11, colR - ML, 16, "F");
        }
        f(bold ? "bold" : "normal", 10);
        tc(bold ? BLACK : DGRAY);
        t(label, ML + indent, y);
        f(bold ? "bold" : "normal", 10);
        tc(color);
        t(value, colR, y, { align: "right" });
        if (opts.rule) hline(y + 4, LGRAY, 0.3);
        y += opts.rule ? 16 : 14;
      }

      function totalRow(label, value, color = STEEL) {
        checkPage(22);
        fc(XLGRAY); dc(LGRAY, 0.4);
        doc.rect(ML, y - 11, colR - ML, 18, "FD");
        f("bold", 10);
        tc(BLACK);
        t(label, ML + 4, y);
        tc(color);
        t(value, colR, y, { align: "right" });
        hline(y + 5, NAVY, 0.75);
        y += 18;
      }

      function netProfitRow(value, profit) {
        checkPage(24);
        y += 6;
        hline(y - 4, NAVY, 1);
        f("bold", 12);
        tc(NAVY);
        t("Net Profit", ML, y + 8);
        tc(profit >= 0 ? GREEN : RED);
        t(value, colR, y + 8, { align: "right" });
        hline(y + 13, NAVY, 1);
        y += 22;
      }

      // PAGE 1
      fc(NAVY); dc(NAVY);
      doc.rect(0, 0, pageW, 96, "F");
      fc(STEEL); dc(STEEL);
      doc.rect(0, 96, pageW, 3, "F");

      f("bold", 22); tc(WHITE);
      t("OCASIO MECHANICAL SERVICES", ML, 36);
      f("normal", 11); tc([147, 197, 253]);
      t("LLC  ·  Mobile Automotive Service  ·  Florida", ML, 53);
      f("normal", 9); tc([147, 197, 253]);
      t(`${BIZ.address}  ·  ${BIZ.city}  ·  ${BIZ.phone}  ·  ${BIZ.email}`, ML, 69);
      f("bold", 40); tc(WHITE);
      t(String(year), colR, 50, { align: "right" });
      f("normal", 10); tc([147, 197, 253]);
      t("Annual Tax Summary", colR, 68, { align: "right" });

      y = 114;
      f("bold", 13); tc(NAVY);
      t("Annual Tax Summary Report", ML, y);
      y += 13;
      f("normal", 10); tc(DGRAY);
      t(`For the year ended December 31, ${year}  ·  Cash Basis`, ML, y);
      y += 11;
      f("normal", 9); tc(MGRAY);
      t(
        `Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}   ·   ${annual.jobs.length} job${annual.jobs.length !== 1 ? "s" : ""} completed this year`,
        ML, y
      );
      y += 7;
      hline(y, LGRAY, 0.5);
      y += 14;

      sectionLabel("Tax Rate Settings Used");
      row("Self-Employment Tax Rate",            `${(seTaxRate * 100).toFixed(1)}%`,  { rule: true });
      row("Federal Income Tax Rate (Estimated)", `${(fedTaxRate * 100).toFixed(1)}%`, { rule: true });
      row("IRS Standard Mileage Rate",           `$${mileageRate} per mile`,           { rule: true });

      sectionLabel("Income");
      row("Gross Revenue — Automotive Services", fmt(m.revenue), { rule: true, color: BLACK });
      totalRow("Total Income", fmt(m.revenue), GREEN);

      sectionLabel("Deductions");
      row("Business Expenses",                                                      fmt(m.expTotal),   { rule: true, color: BLACK });
      row(`Mileage Deduction  (${m.miles.toLocaleString()} mi × $${mileageRate})`, fmt(m.mileDeduct), { rule: true, color: BLACK });
      totalRow("Total Deductions", fmt(m.expTotal + m.mileDeduct), RED);

      netProfitRow(fmt(m.netProfit), m.netProfit);

      sectionLabel("Estimated Tax Liability");
      row("Self-Employment Tax  (15.3% × 92.35% of net profit)", fmt(m.seTax),  { rule: true, color: BLACK });
      row("Federal Income Tax Estimate",                          fmt(m.fedTax), { rule: true, color: BLACK });
      totalRow("Total Estimated Tax Liability", fmt(m.totalTax), STEEL);

      // PAGE 2
      newPage();

      f("bold", 16); tc(NAVY);
      t("Quarterly Breakdown", ML, y);
      y += 5;
      hline(y, NAVY, 1.5);
      y += 11;
      f("normal", 9); tc(MGRAY);
      t(`${BIZ.name}  ·  ${year} Annual Tax Summary`, ML, y);
      y += 18;

      quarters.forEach((q) => {
        const qm = q.metrics;
        checkPage(100);

        f("bold", 10); tc(NAVY);
        t(q.label, ML, y);
        f("normal", 9); tc(MGRAY);
        t(q.period, ML + 24, y);
        hline(y + 4, NAVY, 0.5);
        y += 14;

        row("Gross Revenue",     fmt(qm.revenue),                   { indent: 8, rule: true, color: BLACK });
        row("Business Expenses", fmt(qm.expTotal),                  { indent: 8, rule: true, color: BLACK });
        row("Mileage",           `${qm.miles.toLocaleString()} mi`, { indent: 8, rule: true, color: DGRAY });
        row("Net Profit",        fmt(qm.netProfit),                 { indent: 8, rule: true, bold: true, color: qm.netProfit >= 0 ? GREEN : RED });
        row("Tax Estimate",      fmt(qm.totalTax),                  { indent: 8, rule: true, bold: true, color: STEEL });
        y += 8;
      });

      checkPage(110);
      y += 4;
      sectionLabel("Full Year Totals");
      y += 4;

      const qCols = [ML, colR - 270, colR - 180, colR - 90, colR];
      f("bold", 8); tc(MGRAY);
      ["", "Q1", "Q2", "Q3", "Q4"].forEach((label, i) =>
        t(label, qCols[i], y, i === 0 ? {} : { align: "right" })
      );
      y += 5;
      hline(y, LGRAY, 0.4);
      y += 10;

      [
        ["Revenue",    quarters.map(q => fmt(q.metrics.revenue)),   BLACK],
        ["Expenses",   quarters.map(q => fmt(q.metrics.expTotal)),  BLACK],
        ["Net Profit", quarters.map(q => fmt(q.metrics.netProfit)), STEEL],
        ["Tax Est.",   quarters.map(q => fmt(q.metrics.totalTax)),  DGRAY],
      ].forEach(([label, vals, color], ri) => {
        if (ri % 2 === 0) { fc(XLGRAY); dc(XLGRAY); doc.rect(ML, y - 11, colR - ML, 16, "F"); }
        f("normal", 10); tc(DGRAY);
        t(label, qCols[0], y);
        f("bold", 10); tc(color);
        vals.forEach((v, i) => t(v, qCols[i + 1], y, { align: "right" }));
        hline(y + 4, LGRAY, 0.3);
        y += 16;
      });

      // Expenses + Mileage
      const expMilNeeded = 80 + Math.max(expensesByCategory.length, 1) * 16 + 120;
      checkPage(expMilNeeded);

      y += 14;
      f("bold", 16); tc(NAVY);
      t("Business Expenses & Mileage", ML, y);
      y += 5;
      hline(y, NAVY, 1.5);
      y += 11;
      f("normal", 9); tc(MGRAY);
      t(`${BIZ.name}  ·  ${year} Annual Tax Summary`, ML, y);
      y += 18;

      sectionLabel("Business Expenses by Category");

      if (expensesByCategory.length === 0) {
        f("normal", 10); tc(MGRAY);
        t(`No expenses recorded for ${year}.`, ML, y);
        y += 16;
      } else {
        f("bold", 8); tc(MGRAY);
        t("CATEGORY", ML, y);
        t("% OF TOTAL", colR - 80, y, { align: "right" });
        t("AMOUNT", colR, y, { align: "right" });
        y += 5;
        hline(y, LGRAY, 0.4);
        y += 10;

        expensesByCategory.forEach(([cat, total], i) => {
          checkPage(18);
          const pct = m.expTotal > 0 ? (total / m.expTotal * 100).toFixed(1) : "0.0";
          if (i % 2 === 0) { fc(XLGRAY); dc(XLGRAY); doc.rect(ML, y - 11, colR - ML, 16, "F"); }
          f("normal", 10); tc(DGRAY);
          t(cat, ML, y);
          tc(MGRAY);
          t(`${pct}%`, colR - 80, y, { align: "right" });
          tc(BLACK);
          t(fmt(total), colR, y, { align: "right" });
          hline(y + 4, LGRAY, 0.3);
          y += 16;
        });
        y += 4;
        totalRow("Total Business Expenses", fmt(m.expTotal), RED);
      }

      y += 6;
      sectionLabel("Mileage Log Summary");

      [
        ["Total Trips Logged",        String(annual.mileage.length)],
        ["Total Miles Driven",        `${m.miles.toLocaleString()} miles`],
        ["IRS Standard Rate Applied", `$${mileageRate} per mile`],
      ].forEach(([label, val], i) => {
        if (i % 2 === 0) { fc(XLGRAY); dc(XLGRAY); doc.rect(ML, y - 11, colR - ML, 16, "F"); }
        row(label, val, { rule: true, color: BLACK });
      });
      y += 4;
      totalRow("Total Mileage Deduction", fmt(m.mileDeduct), RED);

      y += 14;
      checkPage(20);
      hline(y, LGRAY, 0.3);
      y += 10;
      f("normal", 8); tc(MGRAY);
      t(
        "This report is generated from internal business records and contains estimates only. All figures should be reviewed by a licensed tax professional before filing.",
        ML, y
      );

      const pageCount = doc.internal.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        fc(NAVY); dc(NAVY);
        doc.rect(0, pageH - 26, pageW, 26, "F");
        f("normal", 8); tc([147, 197, 253]);
        t(BIZ.name,                    ML,        pageH - 9);
        t(`${year} Annual Tax Summary`, pageW / 2, pageH - 9, { align: "center" });
        t(`Page ${p} of ${pageCount}`, colR,      pageH - 9, { align: "right" });
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

      {/* Quarterly cards — larger, more legible */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {quarters.map((q) => {
          const m = q.metrics;
          return (
            <div key={q.label} style={{
              background:   C.surface,
              border:       `1px solid ${C.border}`,
              borderRadius: 12,
              padding:      "18px 16px",
              borderTop:    `4px solid ${qColor}`,
            }}>
              {/* Quarter label + period */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: qColor, marginBottom: 2 }}>{q.label}</div>
                <div style={{ fontSize: 11, color: C.textSecondary }}>{q.period}</div>
              </div>

              {/* Data rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {[
                  ["Revenue",  fmt(m.revenue),  C.green],
                  ["Expenses", fmt(m.expTotal),  C.red],
                  ["Mileage",  `${m.miles} mi`,  C.textSecondary],
                ].map(([l, v, c]) => (
                  <div key={l} style={{
                    display:       "flex",
                    justifyContent: "space-between",
                    alignItems:    "center",
                    padding:       "7px 0",
                    borderBottom:  `1px solid ${C.border}`,
                  }}>
                    <span style={{ fontSize: 12, color: C.textSecondary }}>{l}</span>
                    <span style={{ fontSize: 13, color: c, fontWeight: 600 }}>{v}</span>
                  </div>
                ))}

                {/* Net Profit */}
                <div style={{
                  display:        "flex",
                  justifyContent: "space-between",
                  alignItems:     "center",
                  padding:        "8px 0",
                  borderBottom:   `1px solid ${C.border}`,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.textPrimary }}>Net Profit</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: m.netProfit >= 0 ? C.green : C.red }}>
                    {fmt(m.netProfit)}
                  </span>
                </div>

                {/* Tax Est */}
                <div style={{
                  display:        "flex",
                  justifyContent: "space-between",
                  alignItems:     "center",
                  padding:        "8px 0 2px",
                }}>
                  <span style={{ fontSize: 12, color: C.textSecondary }}>Tax Est.</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.yellow }}>
                    {fmt(m.totalTax)}
                  </span>
                </div>
              </div>

              {/* Job count footer */}
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 11, color: C.textMuted }}>
                  {q.jobs.length} job{q.jobs.length !== 1 ? "s" : ""}  ·  Due {q.due}
                </span>
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
          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13, color: C.textSecondary }}>{label}</span>
            <span style={{ fontSize: 14, color, fontWeight: 600 }}>{value}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 4px" }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Total Tax Estimate</span>
          <span style={{ fontSize: 17, color: C.yellow, fontWeight: 700 }}>{fmt(annual.metrics.totalTax)}</span>
        </div>
        <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>
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
        <div style={{ fontSize: 12, color: C.textSecondary, textAlign: "center" }}>
          {pdfReady
            ? "PDF ready — tap Share to send to Mail, Files, or AirDrop"
            : "Tap Build to generate your annual PDF report"}
        </div>
        {!hasData && (
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 8, textAlign: "center" }}>
            No data for {year} — add jobs, expenses, or mileage first.
          </div>
        )}
      </div>
    </div>
  );
}
