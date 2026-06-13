import { useState } from "react";
import { useTheme } from "../theme.jsx";
import { generateInvoicePDF } from "../utils/generatePDF.js";

// Tolerates both camelCase (local jobs) and snake_case (Supabase jobs)
function get(a, b) {
  return a || b || "";
}

function getPDFFilename(job) {
  return `Ocasio-Receipt-${get(job.jobNumber, job.job_number) || "invoice"}.pdf`;
}

async function buildPDFFile(job) {
  const blob = generateInvoicePDF(job);
  return new File([blob], getPDFFilename(job), { type: "application/pdf" });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export default function ShareButtons({ job }) {
  const { C } = useTheme();
  const [shareLoading, setShareLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const customerName = get(job.customerName, job.customer_name);
  const firstName = customerName?.split(" ")[0] || "there";
  const jobNumber = get(job.jobNumber, job.job_number);
  const vehicleLabel = [
    get(job.vehicleYear, job.vehicle_year),
    get(job.vehicleMake, job.vehicle_make),
    get(job.vehicleModel, job.vehicle_model),
  ].filter(Boolean).join(" ");
  const grandTotal = get(job.grandTotal, job.grand_total);
  const payMethod = get(job.payMethod, job.pay_method);

  const shareTitle = `Receipt ${jobNumber} — Ocasio Mechanical Services`;
  const shareText = `Hi ${firstName}, here is your receipt from Ocasio Mechanical Services${vehicleLabel ? ` for your ${vehicleLabel}` : ""}. Total: $${Number(grandTotal || 0).toFixed(2)} (${payMethod}). Thank you for your business!`;

  function flash(msg, ok = true) {
    setStatus({ msg, ok });
    setTimeout(() => setStatus(null), 4000);
  }

  async function handleShare() {
    setShareLoading(true);
    try {
      const file = await buildPDFFile(job);
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: shareTitle, text: shareText });
        flash("Share sheet opened — pick Mail, Messages, or any app.");
      } else if (navigator.share) {
        downloadBlob(file, getPDFFilename(job));
        await navigator.share({ title: shareTitle, text: shareText });
        flash("PDF downloaded — attach it in the share sheet that opened.", true);
      } else {
        downloadBlob(file, getPDFFilename(job));
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareText);
          flash("PDF downloaded and message copied — paste it into Mail or Messages.", true);
        } else {
          flash("PDF downloaded.", true);
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        flash("Could not open share sheet. PDF downloaded instead.", false);
        try { const blob = generateInvoicePDF(job); downloadBlob(blob, getPDFFilename(job)); } catch {}
      }
    } finally {
      setShareLoading(false);
    }
  }

  async function handleDownload() {
    try {
      const blob = generateInvoicePDF(job);
      downloadBlob(blob, getPDFFilename(job));
      flash("PDF saved to your downloads.");
    } catch {
      flash("Could not generate PDF.", false);
    }
  }

  const btn = {
    display:      "flex",
    alignItems:   "center",
    justifyContent: "center",
    gap:          7,
    flex:         1,
    padding:      "9px 18px",
    borderRadius: 10,
    fontSize:     13,
    fontWeight:   600,
    cursor:       "pointer",
    fontFamily:   "inherit",
    background:   C.elevated,
    border:       `1px solid ${C.border}`,
    color:        C.textPrimary,
    transition:   "opacity 0.15s",
  };

  return (
    <div className="no-print" style={{ marginTop: 16 }}>
      <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
        Send to Customer
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleShare} disabled={shareLoading} style={{ ...btn, opacity: shareLoading ? 0.5 : 1 }}>
          ↑ {shareLoading ? "Preparing…" : "Share"}
        </button>
        <button onClick={handleDownload} style={{ ...btn }}>
          ↓ Save PDF
        </button>
      </div>

      {status && (
        <div style={{
          marginTop:    8,
          padding:      "8px 12px",
          borderRadius: 6,
          fontSize:     11,
          background:   status.ok ? C.green + "18" : C.red + "18",
          color:        status.ok ? C.green : C.red,
          border:       `1px solid ${status.ok ? C.green : C.red}33`,
        }}>
          {status.msg}
        </div>
      )}
    </div>
  );
}
