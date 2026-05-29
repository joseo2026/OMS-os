import { useState } from "react";
import { C, S } from "../styles.js";
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

      // Try Web Share API with file (works on iOS Safari & Android Chrome)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: shareTitle,
          text: shareText,
        });
        flash("Share sheet opened — pick Mail to send the PDF.");
      } else {
        // Desktop fallback: download PDF then open mail app
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
        try {
          const blob = generateInvoicePDF(job);
          downloadBlob(blob, getPDFFilename(job));
        } catch {}
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
        await navigator.share({
          files: [file],
          title: shareTitle,
          text: shareText,
        });
        flash("Share sheet opened — pick Messages to send the PDF.");
      } else {
        // Desktop fallback: download PDF + open SMS app with text summary
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
        try {
          const blob = generateInvoicePDF(job);
          downloadBlob(blob, getPDFFilename(job));
        } catch {}
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

  const btnBase = {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 7, flex: 1, padding: "10px 14px", borderRadius: 6,
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "inherit", letterSpacing: "0.08em",
    border: "none", transition: "opacity 0.15s",
  };

  return (
    <div className="no-print" style={{ marginTop: 10 }}>
      <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
        Send PDF to Customer
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={handleEmail}
          disabled={emailLoading}
          style={{ ...btnBase, background: C.accent, color: "#fff", opacity: emailLoading ? 0.6 : 1 }}
          title={job.customerEmail ? `Email PDF to ${job.customerEmail}` : "Open email app with PDF"}
        >
          <span>✉</span>
          <span>{emailLoading ? "Generating…" : "Email PDF"}</span>
        </button>

        <button
          onClick={handleSMS}
          disabled={smsLoading}
          style={{ ...btnBase, background: "#22c55e22", color: "#4ade80", border: `1px solid #4ade8044`, opacity: smsLoading ? 0.6 : 1 }}
          title={job.customerPhone ? `Text PDF to ${job.customerPhone}` : "Open messages app with PDF"}
        >
          <span>💬</span>
          <span>{smsLoading ? "Generating…" : "Text PDF"}</span>
        </button>

        <button
          onClick={handleDownload}
          style={{ ...btnBase, background: C.elevated, color: C.textSecondary, border: `1px solid ${C.border}`, flex: "0 0 auto", padding: "10px 16px" }}
          title="Download PDF"
        >
          ↓ PDF
        </button>
      </div>

      {status && (
        <div style={{
          marginTop: 8, padding: "8px 12px", borderRadius: 6, fontSize: 11,
          background: status.ok ? C.green + "18" : C.red + "18",
          color: status.ok ? C.green : C.red,
          border: `1px solid ${status.ok ? C.green : C.red}33`,
        }}>
          {status.msg}
        </div>
      )}

      <div style={{ fontSize: 10, color: C.textMuted, marginTop: 6 }}>
        {navigator.canShare ? "On mobile: tap to open share sheet with PDF attached." : "On desktop: PDF downloads automatically — attach it to the email or message."}
        {!job.customerEmail && !job.customerPhone && " Add contact info to the customer record to pre-fill email/phone."}
      </div>
    </div>
  );
}
