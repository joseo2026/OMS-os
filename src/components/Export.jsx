import { useState, useMemo } from "react";
import { useTheme } from "../theme.jsx";
import { fmt } from "../helpers.js";
import { getAppSettings } from "./Settings.jsx";
import { jsPDF } from "jspdf";

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
  const [generating, setGenerating] = useState(false);

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

  // ── PDF Generation ──
  async function generateAndSharePDF() {
    setGenerating(true);
    try {
      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const m = annual.metrics;
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 48;
      const contentW = pageW - margin * 2;
      let y = margin;

      // Colors
      const BLUE   = [29, 78, 216];
      const GREEN  = [21, 128, 61];
      const RED    = [220, 38, 38];
      const AMBER  = [180, 83, 9];
      const GRAY   = [107, 114, 128];
      const LGRAY  = [243, 244, 246];
      const BLACK  = [17, 17, 17];
      const WHITE  = [255, 255, 255];

      // Helpers
      function setColor(rgb, type = "text") {
        if (type === "text") doc.setTextColor(...rgb);
        else doc.setFillColor(...rgb);
      }
      function setFont(style = "normal", size = 11) {
        doc.setFont("helvetica", style);
        doc.setFontSize(size);
      }
      function drawLine(x1, y1, x2, y2, rgb = [229, 231, 235], width = 0.5) {
        doc.setDrawColor(...rgb);
        doc.setLineWidth(width);
        doc.line(x1, y1, x2, y2);
      }
      function fillRect(x, ry, w, h, rgb) {
        setColor(rgb, "fill");
        doc.setDrawColor(...rgb);
        doc.rect(x, ry, w, h, "F");
      }
      function text(str, x, ry, opts = {}) {
        doc.text(str, x, ry, opts);
      }
      function checkPage(needed = 40) {
        if (y + needed > pageH - margin) {
          doc.addPage();
          y = margin;
        }
      }
      function sectionHeader(label) {
        checkPage(40);
        y += 10;
        fillRect(margin, y, contentW, 20, BLUE);
        setFont("bold", 9);
        setColor(WHITE);
        text(label.toUpperCase(), margin + 8, y + 14);
        y += 28;
        setColor(BLACK);
      }
      function rowLine(label, value, valueColor = BLACK, bold = false) {
        checkPage(22);
        setFont("normal", 10);
        setColor(GRAY);
        text(label, margin + 8, y);
        setFont(bold ? "bold" : "normal", 10);
        setColor(valueColor);
        text(value, pageW - margin - 8, y, { align: "right" });
        drawLine(margin, y + 4, pageW - margin, y + 4);
        y += 20;
      }
      function totalLine(label, value, valueColor = BLACK) {
        checkPage(28);
        fillRect(margin, y - 14, contentW, 24, LGRAY);
        setFont("bold", 11);
        setColor(BLACK);
        text(label, margin + 8, y);
        setColor(valueColor);
        text(value, pageW - margin - 8, y, { align: "right" });
        y += 26;
      }

      // ── PAGE 1: Header ──
      // Blue header bar
      fillRect(0, 0, pageW, 90, BLUE);
      setFont("bold", 24);
      setColor(WHITE);
      text("OCASIO", margin, 42);
      setFont("normal", 10);
      text("MECHANICAL SERVICES LLC", margin, 58);
      setFont("normal", 9);
      setColor([191, 219, 254]);
      text(`${BIZ.address}  ·  ${BIZ.city}  ·  ${BIZ.phone}  ·  ${BIZ.email}`, margin, 74);

      // Year badge top right
      setFont("bold", 36);
      setColor(WHITE);
      text(String(year), pageW - margin, 56, { align: "right" });
      setFont("normal", 9);
      setColor([191, 219, 254]);
      text("Annual Tax Summary", pageW - margin, 72, { align: "right" });

      y = 110;

      // Generated + job count
      setFont("normal", 9);
      setColor(GRAY);
      text(
        `Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}   ·   ${annual.jobs.length} jobs completed`,
        margin, y
      );
      y += 20;

      // ── Tax Rate Settings ──
      sectionHeader("Tax Rate Settings Used");
      const colW = contentW / 3;
      const taxLabels = ["Self-Employment Tax", "Federal Income Tax Est.", "IRS Mileage Rate"];
      const taxVals   = [`${(seTaxRate * 100).toFixed(1)}%`, `${(fedTaxRate * 100).toFixed(1)}%`, `$${mileageRate}/mi`];
      taxLabels.forEach((label, i) => {
        const cx = margin + colW * i + colW / 2;
        setFont("normal", 9);
        setColor(GRAY);
        text(label, cx, y, { align: "center" });
        setFont("bold", 18);
        setColor(BLUE);
        text(taxVals[i], cx, y + 20, { align: "center" });
        if (i < 2) drawLine(margin + colW * (i + 1), y - 8, margin + colW * (i + 1), y + 26, [229, 231, 235]);
      });
      y += 40;

      // ── Annual Financial Summary ──
      sectionHeader("Annual Financial Summary");
      rowLine("Gross Revenue", fmt(m.revenue), GREEN);
      rowLine("Total Business Expenses", fmt(m.expTotal), RED);
      rowLine(`Mileage Deduction (${m.miles.toLocaleString()} mi × $${mileageRate})`, fmt(m.mileDeduct), RED);
      totalLine("Net Profit", fmt(m.netProfit), m.netProfit >= 0 ? GREEN : RED);
      y += 4;
      rowLine("Self-Employment Tax (15.3% × 92.35%)", fmt(m.seTax), AMBER);
      rowLine("Federal Income Tax Estimate", fmt(m.fedTax), AMBER);
      totalLine("Total Estimated Tax Liability", fmt(m.totalTax), BLUE);

      // Quarterly payment callout box
      checkPage(50);
      fillRect(margin, y, contentW, 38, [239, 246, 255]);
      doc.setDrawColor(...BLUE);
      doc.setLineWidth(1);
      doc.rect(margin, y, contentW, 38);
      setFont("normal", 10);
      setColor(BLUE);
      text(`Estimated quarterly payment:`, margin + 12, y + 16);
      setFont("bold", 10);
      text(fmt(m.totalTax / 4), margin + 180, y + 16);
      setFont("normal", 9);
      setColor(GRAY);
      text("Due: Q1 Apr 15  ·  Q2 Jun 15  ·  Q3 Sep 15  ·  Q4 Jan 15", margin + 12, y + 30);
      y += 52;

      // ── PAGE 2: Quarterly Breakdown ──
      doc.addPage();
      y = margin;

      sectionHeader("Quarterly Breakdown");

      const qColW = (contentW - 12) / 2;
      const qPairY = [y, y]; // track y for left and right columns

      quarters.forEach((q, i) => {
        const qm = q.metrics;
        const col = i % 2;
        const qx = margin + col * (qColW + 12);
        const qy = col === 0 ? y : y;

        // We'll just stack them vertically for reliability
        checkPage(130);
        const qColorRGB = [[29, 78, 216], [5, 150, 105], [217, 119, 6], [124, 58, 237]][i];

        // Card background
        fillRect(margin, y, contentW, 118, LGRAY);
        // Left accent bar
        fillRect(margin, y, 4, 118, qColorRGB);

        // Quarter label
        setFont("bold", 13);
        setColor(qColorRGB);
        text(q.label, margin + 14, y + 18);
        setFont("normal", 9);
        setColor(GRAY);
        text(q.period, margin + 14, y + 30);
        text(`Est. due: ${q.due}`, pageW - margin - 8, y + 18, { align: "right" });
        text(`${q.jobs.length} jobs · ${q.expenses.length} expenses · ${q.mileage.length} trips`, pageW - margin - 8, y + 30, { align: "right" });

        // Data rows inside card
        let ry = y + 44;
        [
          ["Revenue",    fmt(qm.revenue),    GREEN],
          ["Expenses",   fmt(qm.expTotal),   RED],
          ["Mileage",    `${qm.miles.toLocaleString()} mi`, GRAY],
          ["Net Profit", fmt(qm.netProfit),  qm.netProfit >= 0 ? GREEN : RED],
          ["Tax Est.",   fmt(qm.totalTax),   AMBER],
        ].forEach(([label, value, color]) => {
          setFont("normal", 10);
          setColor(GRAY);
          text(label, margin + 14, ry);
          setFont("bold", 10);
          setColor(color);
          text(value, pageW - margin - 8, ry, { align: "right" });
          drawLine(margin + 14, ry + 3, pageW - margin - 8, ry + 3, [229, 231, 235], 0.3);
          ry += 15;
        });

        y += 128;
      });

      // ── PAGE 3: Expenses + Mileage ──
      doc.addPage();
      y = margin;

      // Expenses by category
      sectionHeader("Business Expenses by Category");

      if (expensesByCategory.length === 0) {
        setFont("normal", 10);
        setColor(GRAY);
        text(`No expenses recorded for ${year}.`, margin + 8, y);
        y += 24;
      } else {
        expensesByCategory.forEach(([cat, total], i) => {
          checkPage(28);
          const pct = m.expTotal > 0 ? (total / m.expTotal * 100).toFixed(1) : "0.0";
          const barW = m.expTotal > 0 ? (total / m.expTotal) * (contentW - 120) : 0;

          setFont("normal", 10);
          setColor(GRAY);
          text(cat, margin + 8, y);
          setFont("normal", 9);
          setColor([156, 163, 175]);
          text(`${pct}%`, margin + 8, y + 11);

          // Bar
          fillRect(margin + 8, y + 14, contentW - 120, 5, [243, 244, 246]);
          if (barW > 0) fillRect(margin + 8, y + 14, barW, 5, [220, 38, 38]);

          setFont("bold", 10);
          setColor(RED);
          text(fmt(total), pageW - margin - 8, y, { align: "right" });

          drawLine(margin, y + 22, pageW - margin, y + 22);
          y += 30;
        });
        y += 4;
        totalLine("Total Business Expenses", fmt(m.expTotal), RED);
      }

      y += 10;

      // Mileage summary
      sectionHeader("Mileage Log Summary");
      rowLine("Total Trips Logged",      String(annual.mileage.length),                  BLACK);
      rowLine("Total Miles Driven",      `${m.miles.toLocaleString()} miles`,            BLACK);
      rowLine("IRS Rate Applied",        `$${mileageRate} per mile`,                     BLACK);
      totalLine("Total Mileage Deduction", fmt(m.mileDeduct), RED);

      // ── Footer on every page ──
      const pageCount = doc.internal.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        fillRect(0, pageH - 36, pageW, 36, [249, 250, 251]);
        drawLine(0, pageH - 36, pageW, pageH - 36, [229, 231, 235]);
        setFont("normal", 8);
        setColor(GRAY);
        text(
          `${BIZ.name}  ·  ${BIZ.address}, ${BIZ.city}  ·  Estimates only — consult a licensed tax professional`,
          pageW / 2, pageH - 20, { align: "center" }
        );
        text(`Page ${p} of ${pageCount}`, pageW - margin, pageH - 20, { align: "right" });
        text(`${year} Annual Tax Summary`, margin, pageH - 20);
      }

      // ── Share as PDF file ──
      const pdfBlob = doc.output("blob");
      const pdfFile = new File([pdfBlob], `OMS-${year}-Annual-Report.pdf`, { type: "application/pdf" });

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `OMS ${year} Annual Tax Summary`,
        });
      } else {
        // Fallback for desktop or unsupported browsers
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `OMS-${year}-Annual-Report.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    } catch (e) {
      if (e.name !== "AbortError") alert("PDF generation failed: " + e.message);
    }
    setGenerating(false);
  }

  // ── App UI styles (use theme) ──
  const P = {
    h2:      { fontSize: 12, fontWeight: 700, color: "#1d4ed8", margin: "0 0 10px 0", paddingBottom: 5, borderBottom: "2px solid #1d4ed8", textTransform: "uppercase", letterSpacing: "0.06em" },
    label:   { color: "#6b7280", fontSize: 12 },
    card:    { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "14px 16px", marginBottom: 18 },
    row:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f3f4f6" },
    rowLast: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10 },
    section: { marginBottom: 24 },
    divider: { borderTop: "2px solid #e5e7eb", margin: "24px 0" },
  };

  return (
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
          style={{ ...S.btnPrimary, width: "100%", padding: "14px 0", fontSize: 14, marginBottom: 8 }}
          onClick={generateAndSharePDF}
          disabled={generating || !hasData}
        >
          {generating ? "Building PDF..." : `Generate & Share ${year} PDF Report`}
        </button>
        <div style={{ fontSize: 11, color: C.textMuted, textAlign: "center" }}>
          Generates a real PDF · share to Mail, Files, AirDrop, or your CPA
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
