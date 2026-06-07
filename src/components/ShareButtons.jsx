import { useState } from "react";
import { useTheme } from "../theme.jsx";
import { generateInvoicePDF } from "../utils/generatePDF.js";

function getPDFFilename(job) {
  return `Ocasio-Receipt-${job.jobNumber || "invoice"}.pdf`;
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
  const [emailLoading, setEmailLoading] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const firstName = job.customerName?.split(" ")[0] || "there";
  const shareTitle = `Receipt ${job.jobNumber} — Ocasio Mechanical Services`;
  const shareText = `Hi ${firstName}, here is your receipt from Ocasio Mechanical Services for your ${job.vehicleYear} ${job.vehicleMake} ${job.vehicleModel}. Total: $${Number(job.grandTotal || 0).toFixed(2)} (${job.payMethod}). Thank you for your business!`;

  function flash(msg, ok = true) {
    setStatus({ msg, ok });
    setTimeout(() => setStatus(null), 4000);
  }

  async function handleEmail() {
    setEmailLoading(true);
    try {
      const file = await buildPDFFile(job);
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: shareTitle, text: shareText });
        flash("Share sheet opened — pick Mail to send the PDF.");
      } else {
        downloadBlob(file, getPDFFilename(job));
        const subject = encodeURIComponent(`Your Receipt — Ocasio Mechanical Services (${job.jobNumber})`);
        const body = encodeURIComponent(`Hi ${firstName},\n\nPlease find your invoice PDF attached.\n\n${shareText}\n\n— Ocasio Mechanical Services LLC`);
        const email = job.customerEmail ? encodeURIComponent(job.customerEmail) : "";
        window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_self");
        flash("PDF downloaded — attach it to the email that just opened.", true);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        flash("Could not share. PDF downloaded instead.", false);
        try { const blob = generateInvoicePDF(job); downloadBlob(blob, getPDFFilename(job)); } catch {}
      }
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleSMS() {
    setSmsLoading(true);
    try {
      const file = await buildPDFFile(job);
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: shareTitle, text: shareText });
        flash("Share sheet opened — pick Messages to send the PDF.");
      } else {
        downloadBlob(file, getPDFFilename(job));
        const phone = (job.customerPhone || "").replace(/\D/g, "");
        const body = encodeURIComponent(shareText + " (PDF invoice downloaded to your device)");
        const sep = /iPhone|iPad|Mac/.test(navigator.userAgent) ? "&" : "?";
        window.open(`sms:${phone}${sep}body=${body}`, "_self");
        flash("PDF downloaded — attach it to the message that just opened.", true);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        flash("Could not share. PDF downloaded instead.", false);
        try { const blob = generateInvoicePDF(job); downloadBlob(blob, getPDFFilename(job)); } catch {}
      }
    } finally {
      setSmsLoading(false);
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
        <button onClick={handleEmail} disabled={emailLoading} style={{ ...btn, opacity: emailLoading ? 0.5 : 1 }}>
          ✉ {emailLoading ? "Generating…" : "Email"}
        </button>
        <button onClick={handleSMS} disabled={smsLoading} style={{ ...btn, opacity: smsLoading ? 0.5 : 1 }}>
          💬 {smsLoading ? "Generating…" : "Text"}
        </button>
        <button onClick={handleDownload} style={{ ...btn }}>
          ↓ PDF
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
