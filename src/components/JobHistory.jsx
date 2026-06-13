import { useState } from "react";
import { useTheme } from "../theme.jsx";
import { fmt, deleteData } from "../helpers.js";
import ShareButtons from "./ShareButtons.jsx";

function JobReceipt({ j, onBack, onDelete }) {
  const { C, S } = useTheme();
  const [confirming, setConfirming] = useState(false);
  const get = (a, b) => a || b || "";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }} className="no-print">
        <button style={S.btnSecondary} onClick={onBack}>← Back</button>
        {confirming ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: C.red }}>Delete this job?</span>
            <button style={S.btnDanger} onClick={() => onDelete(j)}>Yes, delete</button>
            <button style={S.btnSecondary} onClick={() => setConfirming(false)}>Cancel</button>
          </div>
        ) : (
          <button style={S.btnDanger} onClick={() => setConfirming(true)}>Delete Job</button>
        )}
      </div>

      <div style={{ ...S.card, background: "#fff", color: "#111" }} className="print-area">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, paddingBottom: 14, borderBottom: "2px solid #3b82f6" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>OCASIO</div>
            <div style={{ fontSize: 11, color: "#666", letterSpacing: "0.1em" }}>MECHANICAL SERVICES LLC</div>
            <div style={{ fontSize: 10, color: "#999" }}>Mobile Automotive Service · Florida</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase" }}>Receipt</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#3b82f6" }}>{get(j.jobNumber, j.job_number)}</div>
            <div style={{ fontSize: 10, color: "#999" }}>{j.date}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Bill To</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{get(j.customerName, j.customer_name)}</div>
            <div style={{ fontSize: 12, color: "#555" }}>{get(j.customerPhone, j.customer_phone)}</div>
            <div style={{ fontSize: 12, color: "#555" }}>{get(j.customerAddress, j.customer_address)}</div>
            {get(j.customerCity, j.customer_city) && <div style={{ fontSize: 12, color: "#555" }}>{get(j.customerCity, j.customer_city)}, FL {get(j.customerZip, j.customer_zip)}</div>}
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Vehicle</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{get(j.vehicleYear, j.vehicle_year)} {get(j.vehicleMake, j.vehicle_make)} {get(j.vehicleModel, j.vehicle_model)}</div>
            <div style={{ fontSize: 12, color: "#555" }}>Mileage: {j.mileage}</div>
            {get(j.vehicleVin, j.vehicle_vin) && <div style={{ fontSize: 11, color: "#999" }}>VIN: {get(j.vehicleVin, j.vehicle_vin)}</div>}
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #ddd" }}>
              {["Service", "Labor", "Parts", "Total"].map(h => (
                <th key={h} style={{ textAlign: h === "Service" ? "left" : "right", fontSize: 10, color: "#999", fontWeight: 400, padding: "4px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(j.lines || []).map((l, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ fontSize: 12, padding: "7px 0" }}>{l.service}</td>
                <td style={{ fontSize: 12, padding: "7px 0", textAlign: "right", color: "#555" }}>{fmt(l.labor)}</td>
                <td style={{ fontSize: 12, padding: "7px 0", textAlign: "right", color: "#555" }}>{fmt(l.parts)}</td>
                <td style={{ fontSize: 12, padding: "7px 0", textAlign: "right", fontWeight: 600 }}>{fmt(Number(l.labor) + Number(l.parts))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ borderTop: "1px solid #eee", paddingTop: 10, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666", marginBottom: 4 }}><span>Labor</span><span>{fmt(j.labor)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666", marginBottom: 4 }}><span>Parts</span><span>{fmt(j.parts)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666", marginBottom: 8 }}><span>Tax (7% on parts)</span><span>{fmt(j.tax)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, borderTop: "2px solid #111", paddingTop: 8 }}>
            <span>GRAND TOTAL</span><span style={{ color: "#3b82f6" }}>{fmt(j.grandTotal || j.grand_total)}</span>
          </div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>Payment: {get(j.payMethod, j.pay_method)}</div>
        </div>

        {get(j.aiNotes, j.ai_notes) && (
          <div style={{ background: "#f9f9f9", borderLeft: "3px solid #3b82f6", padding: "10px 12px", fontSize: 12, color: "#555", lineHeight: 1.6, marginBottom: 12, borderRadius: "0 6px 6px 0" }}>
            {get(j.aiNotes, j.ai_notes)}
          </div>
        )}
        {get(j.techNotes, j.tech_notes) && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Technician Notes</div>
            <div style={{ fontSize: 12, color: "#555" }}>{get(j.techNotes, j.tech_notes)}</div>
          </div>
        )}

        <div style={{ borderTop: "1px solid #eee", paddingTop: 12, textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>PAYMENT DUE UPON RECEIPT</div>
          <div style={{ fontSize: 11, color: "#999" }}>Make checks payable to: Ocasio Mechanical Services, LLC</div>
          <div style={{ fontSize: 12, color: "#3b82f6", marginTop: 6, fontWeight: 700 }}>Thank You For Your Business!</div>
        </div>
      </div>

<ShareButtons job={j} />
    </div>
  );
}

export default function JobHistory({ data, setData }) {
  const { C, S } = useTheme();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const jobs = [...(data.jobs || [])].sort((a, b) => b.date?.localeCompare(a.date));

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    return (
      (j.customerName || j.customer_name)?.toLowerCase().includes(q) ||
      (j.jobNumber || j.job_number)?.toLowerCase().includes(q) ||
      (j.vehicleMake || j.vehicle_make)?.toLowerCase().includes(q) ||
      (j.vehicleModel || j.vehicle_model)?.toLowerCase().includes(q)
    );
  });

  async function handleDelete(job) {
    // Delete linked mileage entry if it exists
    const linkedMileage = (data.mileage || []).find(m => m.job_id === job.id);
    if (linkedMileage) {
      await deleteData('mileage', linkedMileage.id);
      setData(prev => ({ ...prev, mileage: prev.mileage.filter(m => m.id !== linkedMileage.id) }));
    }
    // Delete the job
    await deleteData('jobs', job.id);
    setData(prev => ({ ...prev, jobs: prev.jobs.filter(j => j.id !== job.id) }));
    setSelected(null);
    setDeletingId(null);
  }

  if (selected) {
    return <JobReceipt j={selected} onBack={() => setSelected(null)} onDelete={handleDelete} />;
  }

  return (
    <div>
      <input
        style={{ ...S.input, marginBottom: 14 }}
        placeholder="Search by customer, job #, vehicle..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 12 }}>{filtered.length} jobs</div>

      {filtered.map(j => {
        const get = (a, b) => a || b || "";
        return (
          <div key={j.id} style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ cursor: "pointer", flex: 1 }} onClick={() => setSelected(j)}>
                <div style={{ fontSize: 11, color: C.accent, fontWeight: 600, marginBottom: 2 }}>
                  {get(j.jobNumber, j.job_number)}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                  {get(j.customerName, j.customer_name)}
                </div>
                <div style={{ fontSize: 12, color: C.textSecondary }}>
                  {get(j.vehicleYear, j.vehicle_year)} {get(j.vehicleMake, j.vehicle_make)} {get(j.vehicleModel, j.vehicle_model)} · {j.mileage} mi
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                  {j.date} · {get(j.payMethod, j.pay_method)}
                </div>
                <div style={{ fontSize: 11, color: C.textMuted }}>
                  {(j.lines || []).map(l => l.service).join(", ")}
                </div>
              </div>
              <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <div style={{ fontSize: 15, color: C.green, fontWeight: 700 }}>
                  {fmt(j.grandTotal || j.grand_total)}
                </div>
                <div style={{ fontSize: 11, color: C.accent, cursor: "pointer" }} onClick={() => setSelected(j)}>
                  View →
                </div>
                {deletingId === j.id ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: C.red }}>Delete?</span>
                    <button style={{ ...S.btnDanger, padding: "3px 10px", fontSize: 11 }} onClick={() => handleDelete(j)}>Yes</button>
                    <button style={{ ...S.btnSecondary, padding: "3px 10px", fontSize: 11 }} onClick={() => setDeletingId(null)}>No</button>
                  </div>
                ) : (
                  <button style={{ ...S.btnDanger, padding: "3px 10px", fontSize: 11 }} onClick={() => setDeletingId(j.id)}>Delete</button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ fontSize: 12, color: C.textMuted, padding: "20px 0" }}>No jobs found</div>
      )}
    </div>
  );
}
