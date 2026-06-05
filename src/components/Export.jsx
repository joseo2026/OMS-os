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

  // Step 1 — build the PDF, store it, show Share button
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
      const margin = 48;
      const contentW = pageW - margin * 2;
      let y = margin;

      const BLUE  = [29, 78, 216];
      const GREEN = [21, 128, 61];
      const RED   = [220, 38, 38];
      const AMBER = [180, 83, 9];
      const GRAY  = [107, 114, 128];
      const LGRAY = [243, 244, 246];
      const BLACK = [17, 17, 17];
      const WHITE = [255, 255, 255];

      function setColor(rgb, type = "text") {
        if (type === "text") doc.setTextColor(...rgb);
        else doc.setFillColor(...rgb);
      }
      function setFont(style = "normal", size = 11) {
        doc.setFont("helvetica", style);
        doc.setFontSize(size);
      }
      function drawLine(x1, y1, x2, y2, rgb = [229, 231, 235], lw = 0.5) {
        doc.setDrawColor(...rgb);
        doc.setLineWidth(lw);
        doc.line(x1, y1, x2, y2);
      }
      function fillRect(x, ry, w, h, rgb) {
        setColor(rgb, "fill");
        doc.setDrawColor(...rgb);
        doc.rect(x, ry, w, h, "F");
      }
      function checkPage(needed = 40) {
        if (y + needed > pageH - margin) { doc.addPage(); y = margin; }
      }
      function sectionHeader(label) {
        checkPage(40);
        y += 10;
        fillRect(margin, y, contentW, 22, BLUE);
        setFont("bold", 9);
        setColor(WHITE);
        doc.text(label.toUpperCase(), margin + 8, y + 15);
        y += 30;
        setColor(BLACK);
      }
      function rowLine(label, value, valueColor = BLACK) {
        checkPage(22);
        setFont("normal", 10);
        setColor(GRAY);
        doc.text(label, margin + 8, y);
        setFont("bold", 10);
        setColor(valueColor);
        doc.text(value, pageW - margin - 8, y, { align: "right" });
        drawLine(margin, y + 4, pageW - margin, y + 4);
        y += 20;
      }
      function totalLine(label, value, valueColor = BLACK) {
        checkPage(28);
        fillRect(margin, y - 14, contentW, 24, LGRAY);
        setFont("bold", 11);
        setColor(BLACK);
        doc.text(label, margin + 8, y);
        setColor(valueColor);
        doc.text(value, pageW - margin - 8, y, { align: "right" });
        y += 28;
      }

      // PAGE 1 — Header
      fillRect(0, 0, pageW, 90, BLUE);
      setFont("bold", 24);
      setColor(WHITE);
      doc.text("OCASIO", margin, 42);
      setFont("normal", 10);
      doc.text("MECHANICAL SERVICES LLC", margin, 58);
      setFont("normal", 9);
      setColor([191, 219, 254]);
      doc.text(`${BIZ.address}  ·  ${BIZ.city}  ·  ${BIZ.phone}  ·  ${BIZ.email}`, margin, 74);
      setFont("bold", 36);
      setColor(WHITE);
      doc.text(String(year), pageW - margin, 56, { align: "right" });
      setFont("normal", 9);
      setColor([191, 219, 254]);
      doc.text("Annual Tax Summary", pageW - margin, 72, { align: "right" });
      y = 110;
      setFont("normal", 9);
      setColor(GRAY);
      doc.text(
        `Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}   ·   ${annual.jobs.length} jobs completed`,
        margin, y
      );
      y += 22;

      // Tax rate settings
      sectionHeader("Tax Rate Settings Used");
      const colW = contentW / 3;
      const taxLabels = ["Self-Employment Tax", "Federal Income Tax Est.", "IRS Mileage Rate"];
      const taxVals   = [`${(seTaxRate * 100).toFixed(1)}%`, `${(fedTaxRate * 100).toFixed(1)}%`, `$${mileageRate}/mi`];
      taxLabels.forEach((label, i) => {
        const cx = margin + colW * i + colW / 2;
        setFont("normal", 9);
        setColor(GRAY);
        doc.text(label, cx, y, { align: "center" });
        setFont("bold", 18);
        setColor(BLUE);
        doc.text(taxVals[i], cx, y + 20, { align: "center" });
        if (i < 2) drawLine(margin + colW * (i + 1), y - 8, margin + colW * (i + 1), y + 26, [229, 231, 235]);
      });
      y += 42;

      // Annual summary
      sectionHeader("Annual Financial Summary");
      rowLine("Gross Revenue", fmt(m.revenue), GREEN);
      rowLine("Total Business Expenses", fmt(m.expTotal), RED);
      rowLine(`Mileage Deduction (${m.miles.toLocaleString()} mi × $${mileageRate})`, fmt(m.mileDeduct), RED);
      totalLine("Net Profit", fmt(m.netProfit), m.netProfit >= 0 ? GREEN : RED);
      y += 4;
      rowLine("Self-Employment Tax (15.3% × 92.35%)", fmt(m.seTax), AMBER);
      rowLine("Federal Income Tax Estimate", fmt(m.fedTax), AMBER);
      totalLine("Total Estimated Tax Liability", fmt(m.totalTax), BLUE);

      // Quarterly callout box
      checkPage(50);
      fillRect(margin, y, contentW, 40, [239, 246, 255]);
      doc.setDrawColor(...BLUE);
      doc.setLineWidth(1);
      doc.rect(margin, y, contentW, 40);
      setFont("normal", 10);
      setColor(BLUE);
      doc.text("Estimated quarterly payment:", margin + 12, y + 16);
      setFont("bold", 10);
      doc.text(fmt(m.totalTax / 4), margin + 195, y + 16);
      setFont("normal", 9);
      setColor(GRAY);
      doc.text("Due: Q1 Apr 15  ·  Q2 Jun 15  ·  Q3 Sep 15  ·  Q4 Jan 15", margin + 12, y + 30);
      y += 54;

      // PAGE 2 — Quarterly breakdown
      doc.addPage();
      y = margin;
      sectionHeader("Quarterly Breakdown");
      quarters.forEach((q, i) => {
        const qm = q.metrics;
        const qColorRGB = [[29, 78, 216], [5, 150, 105], [217, 119, 6], [124, 58, 237]][i];
        checkPage(130);
        fillRect(margin, y, contentW, 120, LGRAY);
        fillRect(margin, y, 4, 120, qColorRGB);
        setFont("bold", 13);
        setColor(qColorRGB);
        doc.text(q.label, margin + 14, y + 18);
        setFont("normal", 9);
        setColor(GRAY);
        doc.text(q.period, margin + 14, y + 30);
        doc.text(`Est. due: ${q.due}`, pageW - margin - 8, y + 18, { align: "right" });
        doc.text(`${q.jobs.length} jobs · ${q.expenses.length} expenses · ${q.mileage.length} trips`, pageW - margin - 8, y + 30, { align: "right" });
        let ry = y + 46;
        [
          ["Revenue",    fmt(qm.revenue),    GREEN],
          ["Expenses",   fmt(qm.expTotal),   RED],
          ["Mileage",    `${qm.miles.toLocaleString()} mi`, GRAY],
          ["Net Profit", fmt(qm.netProfit),  qm.netProfit >= 0 ? GREEN : RED],
          ["Tax Est.",   fmt(qm.totalTax),   AMBER],
        ].forEach(([label, value, color]) => {
          setFont("normal", 10);
          setColor(GRAY);
          doc.text(label, margin + 14, ry);
          setFont("bold", 10);
          setColor(color);
          doc.text(value, pageW - margin - 8, ry, { align: "right" });
          drawLine(margin + 14, ry + 3, pageW - margin - 8, ry + 3, [229, 231, 235], 0.3);
          ry += 15;
        });
        y += 130;
      });

      // PAGE 3 — Expenses + Mileage
      doc.addPage();
      y = margin;
      sectionHeader("Business Expenses by Category");
      if (expensesByCategory.length === 0) {
        setFont("normal", 10);
        setColor(GRAY);
        doc.text(`No expenses recorded for ${year}.`, margin + 8, y);
        y += 24;
      } else {
        expensesByCategory.forEach(([cat, total]) => {
          checkPage(30);
          const pct = m.expTotal > 0 ? (total / m.expTotal * 100).toFixed(1) : "0.0";
          const barW = m.expTotal > 0 ? (total / m.expTotal) * (contentW - 120) : 0;
          setFont("normal", 10);
          setColor(GRAY);
          doc.text(cat, margin + 8, y);
          setFont("normal", 9);
          setColor([156, 163, 175]);
          doc.text(`${pct}%`, margin + 8, y + 11);
          fillRect(margin + 8, y + 14, contentW - 120, 5, [243, 244, 246]);
          if (barW > 0) fillRect(margin + 8, y + 14, barW, 5, RED);
          setFont("bold", 10);
          setColor(RED);
          doc.text(fmt(total), pageW - margin - 8, y, { align: "right" });
          drawLine(margin, y + 22, pageW - margin, y + 22);
          y += 30;
        });
        y += 4;
        totalLine("Total Business Expenses", fmt(m.expTotal), RED);
      }

      y += 10;
      sectionHeader("Mileage Log Summary");
      rowLine("Total Trips Logged",      String(annual.mileage.length),                  BLACK);
      rowLine("Total Miles Driven",      `${m.miles.toLocaleString()} miles`,            BLACK);
      rowLine("IRS Rate Applied",        `$${mileageRate} per mile`,                     BLACK);
      totalLine("Total Mileage Deduction", fmt(m.mileDeduct), RED);

      // Footer on every page
      const pageCount = doc.internal.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        fillRect(0, pageH - 36, pageW, 36, [249, 250, 251]);
        drawLine(0, pageH - 36, pageW, pageH - 36, [229, 231, 235]);
        setFont("normal", 8);
        setColor(GRAY);
        doc.text(
          `${BIZ.name}  ·  Estimates only — consult a licensed tax professional`,
          pageW / 2, pageH - 20, { align: "center" }
        );
        doc.text(`Page ${p} of ${pageCount}`, pageW - margin, pageH - 20, { align: "right" });
        doc.text(`${year} Annual Tax Summary`, margin, pageH - 20);
      }

      // Store blob and file for share step
      const blob = doc.output("blob");
      pdfBlobRef.current = blob;
      pdfFileRef.current = new File([blob], `OMS-${year}-Annual-Report.pdf`, { type: "application/pdf" });
      setPdfReady(true);
    } catch (e) {
      alert("PDF build failed: " + e.message);
    }
    setGenerating(false);
  }

  // Step 2 — share from a clean direct tap
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
        // Desktop fallback
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
        <button onClick={() => setYear(y => { setPdfReady(false); return y - 1; })} style={{ ...S.btnSecondary, padding: "8px 14px" }}>←</button>
        <div style={{ fontSize: 18, fontWeight: 700, flex: 1, textAlign: "center" }}>{year}</div>
        <button onClick={() => setYear(y => { setPdfReady(false); return y + 1; })} style={{ ...S.btnSecondary, padding: "8px 14px" }}>→</button>
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

        {/* Step 1 — Build */}
        <button
          style={{ ...S.btnPrimary, width: "100%", padding: "14px 0", fontSize: 14, marginBottom: 10 }}
          onClick={buildPDF}
          disabled={generating || !hasData}
        >
          {generating ? "Building PDF..." : `Build ${year} PDF Report`}
        </button>

        {/* Step 2 — Share (only appears once PDF is ready) */}
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
            ? "PDF is ready — tap Share to send to Mail, Files, or AirDrop"
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
