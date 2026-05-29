import { jsPDF } from "jspdf";

const ORANGE = [59, 130, 246];
const BLACK = [17, 17, 17];
const GRAY = [102, 102, 102];
const LIGHT_GRAY = [153, 153, 153];
const RULE = [224, 224, 224];

function fmt(n) {
  return "$" + Number(n || 0).toFixed(2);
}

function splitText(doc, text, maxWidth) {
  return doc.splitTextToSize(String(text || ""), maxWidth);
}

export function generateInvoicePDF(job) {
  const doc = new jsPDF({ format: "letter", unit: "mm" });
  const W = 215.9;
  const marginL = 18;
  const marginR = 18;
  const contentW = W - marginL - marginR;
  const midX = marginL + contentW / 2;

  let y = 18;

  // ── HEADER ──────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...BLACK);
  doc.text("OCASIO", marginL, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text("MECHANICAL SERVICES LLC", marginL, y + 5);
  doc.text("Mobile Automotive Service · Florida", marginL, y + 9);

  // Right side
  doc.setFontSize(8);
  doc.setTextColor(...LIGHT_GRAY);
  doc.text("RECEIPT", W - marginR, y, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...ORANGE);
  doc.text(job.jobNumber || "", W - marginR, y + 5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...LIGHT_GRAY);
  doc.text(job.date || "", W - marginR, y + 10, { align: "right" });

  y += 16;
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.6);
  doc.line(marginL, y, W - marginR, y);
  y += 7;

  // ── BILL TO / VEHICLE ────────────────────────────────────────────────────
  const colW = contentW / 2 - 4;
  const col2X = midX + 4;

  doc.setFontSize(7.5);
  doc.setTextColor(...LIGHT_GRAY);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", marginL, y);
  doc.text("VEHICLE", col2X, y);
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text(job.customerName || "—", marginL, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`${job.vehicleYear || ""} ${job.vehicleMake || ""} ${job.vehicleModel || ""}`.trim() || "—", col2X, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);

  const custLines = [
    job.customerPhone,
    job.customerAddress,
    job.customerCity ? `${job.customerCity}, FL ${job.customerZip || ""}` : null,
  ].filter(Boolean);

  const vehLines = [
    job.mileage ? `Mileage: ${job.mileage}` : null,
    job.vehicleVin ? `VIN: ${job.vehicleVin}` : null,
  ].filter(Boolean);

  const infoRows = Math.max(custLines.length, vehLines.length);
  for (let i = 0; i < infoRows; i++) {
    if (custLines[i]) doc.text(custLines[i], marginL, y);
    if (vehLines[i]) doc.text(vehLines[i], col2X, y);
    y += 4.5;
  }
  y += 4;

  // ── SERVICES TABLE ───────────────────────────────────────────────────────
  const colServiceW = contentW * 0.5;
  const colLaborW = contentW * 0.17;
  const colPartsW = contentW * 0.17;
  const colTotalW = contentW * 0.16;
  const colLaborX = marginL + colServiceW;
  const colPartsX = colLaborX + colLaborW;
  const colTotalX = colPartsX + colPartsW;

  // Header row
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.3);
  doc.line(marginL, y, W - marginR, y);
  y += 4;

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...LIGHT_GRAY);
  doc.text("SERVICE", marginL, y);
  doc.text("LABOR", colLaborX + colLaborW, y, { align: "right" });
  doc.text("PARTS", colPartsX + colPartsW, y, { align: "right" });
  doc.text("TOTAL", colTotalX + colTotalW, y, { align: "right" });
  y += 3;
  doc.line(marginL, y, W - marginR, y);
  y += 4.5;

  // Service rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);

  const lines = job.lines || [];
  for (const l of lines) {
    const lineTotal = Number(l.labor || 0) + Number(l.parts || 0);
    const serviceLines = splitText(doc, l.service, colServiceW - 4);
    serviceLines.forEach((sl, si) => {
      doc.text(sl, marginL, y + si * 4.5);
    });
    doc.setTextColor(...GRAY);
    doc.text(fmt(l.labor), colLaborX + colLaborW, y, { align: "right" });
    doc.text(fmt(l.parts), colPartsX + colPartsW, y, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BLACK);
    doc.text(fmt(lineTotal), colTotalX + colTotalW, y, { align: "right" });
    doc.setFont("helvetica", "normal");

    y += Math.max(1, serviceLines.length) * 4.5 + 1;
    doc.setDrawColor(...RULE);
    doc.line(marginL, y, W - marginR, y);
    y += 3;
  }
  y += 2;

  // ── TOTALS ───────────────────────────────────────────────────────────────
  const totalsX = midX + 4;
  const valX = W - marginR;

  function totalsRow(label, value, bold = false, color = GRAY) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 10 : 9);
    doc.setTextColor(...color);
    doc.text(label, totalsX, y);
    doc.text(value, valX, y, { align: "right" });
    y += bold ? 5.5 : 4.5;
  }

  totalsRow("Labor", fmt(job.labor));
  totalsRow("Parts", fmt(job.parts));
  totalsRow("Tax (7% on parts)", fmt(job.tax));

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.5);
  doc.line(totalsX, y, valX, y);
  y += 4;

  totalsRow("GRAND TOTAL", fmt(job.grandTotal), true, ORANGE);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...LIGHT_GRAY);
  doc.text(`Payment: ${job.payMethod || ""}`, totalsX, y);
  y += 8;

  // ── AI NOTES ─────────────────────────────────────────────────────────────
  if (job.aiNotes) {
    doc.setDrawColor(...ORANGE);
    doc.setLineWidth(1.2);
    doc.line(marginL, y, marginL, y + 14);
    doc.setLineWidth(0.3);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    const noteLines = splitText(doc, job.aiNotes, contentW - 8);
    noteLines.forEach((nl, ni) => {
      doc.text(nl, marginL + 5, y + ni * 4.5);
    });
    y += noteLines.length * 4.5 + 6;
  }

  // ── TECH NOTES ───────────────────────────────────────────────────────────
  if (job.techNotes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...LIGHT_GRAY);
    doc.text("TECHNICIAN NOTES", marginL, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    const tnLines = splitText(doc, job.techNotes, contentW);
    tnLines.forEach((tl, ti) => {
      doc.text(tl, marginL, y + ti * 4.5);
    });
    y += tnLines.length * 4.5 + 6;
  }

  // ── FOOTER ───────────────────────────────────────────────────────────────
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.3);
  doc.line(marginL, y, W - marginR, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  doc.text("PAYMENT DUE UPON RECEIPT", W / 2, y, { align: "center" });
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text("Make checks payable to: Ocasio Mechanical Services, LLC", W / 2, y, { align: "center" });
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...ORANGE);
  doc.text("Thank You For Your Business!", W / 2, y, { align: "center" });

  return doc.output("blob");
}
