import { useState } from "react";
import { C, S } from "../styles.js";
import { fmt } from "../helpers.js";

function buildEmailBody(job) {
  const services = job.lines?.map(l => {
    const lineTotal = Number(l.labor || 0) + Number(l.parts || 0);
    return `  • ${l.service}${lineTotal > 0 ? " — " + fmt(lineTotal) : ""}`;
  }).join("\n") || "";

  return [
    `Hi ${job.customerName?.split(" ")[0] || "there"},`,
    ``,
    `Thank you for choosing Ocasio Mechanical Services! Here is your receipt for today's service.`,
    ``,
    `─────────────────────────────`,
    `RECEIPT  ${job.jobNumber}`,
    `Date: ${job.date}`,
    `Vehicle: ${job.vehicleYear} ${job.vehicleMake} ${job.vehicleModel}${job.mileage ? " · " + job.mileage + " mi" : ""}`,
    `─────────────────────────────`,
    ``,
    `SERVICES PERFORMED`,
    services,
    ``,
    `Labor:     ${fmt(job.labor)}`,
    `Parts:     ${fmt(job.parts)}`,
    `Tax (7%):  ${fmt(job.tax)}`,
    `─────────────────────────────`,
    `TOTAL:     ${fmt(job.grandTotal)}`,
    `Payment:   ${job.payMethod}`,
    `─────────────────────────────`,
    ``,
    job.aiNotes ? job.aiNotes + "\n" : "",
    `Make checks payable to: Ocasio Mechanical Services, LLC`,
    ``,
    `Questions? Reply to this email or call/text us.`,
    ``,
    `— Ocasio Mechanical Services LLC`,
    `Mobile Automotive Service · Florida`,
  ].join("\n");
}

function buildSmsBody(job) {
  const serviceNames = job.lines?.map(l => l.service).join(", ") || "service";
  return `Hi ${job.customerName?.split(" ")[0] || "there"} — receipt from Ocasio Mechanical Services for ${serviceNames} on your ${job.vehicleYear} ${job.vehicleMake} ${job.vehicleModel}. Total: ${fmt(job.grandTotal)} (${job.payMethod}). Job #${job.jobNumber}. Thank you!`;
}

export default function ShareButtons({ job }) {
  const [copied, setCopied] = useState(false);

  const email = job.customerEmail || "";
  const phone = (job.customerPhone || "").replace(/\D/g, "");

  const emailSubject = `Your Receipt — Ocasio Mechanical Services (${job.jobNumber})`;
  const emailBody = buildEmailBody(job);
  const smsBody = buildSmsBody(job);

  const mailtoHref = `mailto:${email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
  const smsHref = `sms:${phone}${/iPhone|iPad|Mac/.test(navigator.userAgent) ? "&" : "?"}body=${encodeURIComponent(smsBody)}`;

  async function copyReceipt() {
    try {
      await navigator.clipboard.writeText(emailBody);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const btnBase = {
    display: "flex", alignItems: "center", gap: 8,
    flex: 1, padding: "10px 14px", borderRadius: 6,
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "inherit", letterSpacing: "0.08em",
    textDecoration: "none", justifyContent: "center",
    border: "none", transition: "opacity 0.15s",
  };

  return (
    <div className="no-print" style={{ marginTop: 10 }}>
      <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
        Send to Customer
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a
          href={mailtoHref}
          style={{ ...btnBase, background: C.accent, color: "#fff", flex: "1 1 120px" }}
          title={email ? `Send to ${email}` : "No email on file — will open mail app"}
        >
          <span>✉</span>
          <span>{email ? "Email Receipt" : "Email (no address on file)"}</span>
        </a>

        <a
          href={smsHref}
          style={{ ...btnBase, background: "#22c55e22", color: "#4ade80", border: `1px solid #4ade8044`, flex: "1 1 120px" }}
          title={phone ? `Text ${job.customerPhone}` : "No phone on file — will open messages app"}
        >
          <span>💬</span>
          <span>{phone ? "Text Receipt" : "Text (no phone on file)"}</span>
        </a>

        <button
          onClick={copyReceipt}
          style={{ ...btnBase, background: C.elevated, color: copied ? C.green : C.textSecondary, border: `1px solid ${C.border}`, flex: "0 0 auto", padding: "10px 16px" }}
          title="Copy receipt text to clipboard"
        >
          {copied ? "✓ Copied!" : "Copy"}
        </button>
      </div>

      {(!email || !phone) && (
        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 6 }}>
          {!email && !phone
            ? "No contact info on file — add email/phone to the customer record to pre-fill these."
            : !email
            ? "No email on file — add it to the customer record to pre-fill the address."
            : "No phone on file — add it to the customer record to pre-fill the number."}
        </div>
      )}
    </div>
  );
}
