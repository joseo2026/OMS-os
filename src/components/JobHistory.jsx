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
  const [expandedCustomers, setExpandedCustomers] = useState(() => new Set());
  const [expandedVehicles, setExpandedVehicles] = useState(() => new Set());

  const get = (a, b) => a || b || "";

  const jobs = [...(data.jobs || [])].sort((a, b) => b.date?.localeCompare(a.date));

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    return (
      get(j.customerName, j.customer_name)?.toLowerCase().includes(q) ||
      get(j.jobNumber, j.job_number)?.toLowerCase().includes(q) ||
      get(j.vehicleMake, j.vehicle_make)?.toLowerCase().includes(q) ||
      get(j.vehicleModel, j.vehicle_model)?.toLowerCase().includes(q)
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

  // Group filtered jobs into Customer → Vehicle → Jobs (most recently active first)
  const groups = [];
  const custIndex = new Map();
  for (const j of filtered) {
    const custKey = get(j.customerId, j.customer_id) || get(j.customerName, j.customer_name) || "unknown";
    const custName = get(j.customerName, j.customer_name) || "Unknown Customer";
    let cust = custIndex.get(custKey);
    if (!cust) {
      cust = { key: custKey, name: custName, jobCount: 0, total: 0, vehicles: [], vehicleIndex: new Map() };
      custIndex.set(custKey, cust);
      groups.push(cust);
    }
    cust.jobCount++;
    cust.total += Number(j.grandTotal || j.grand_total || 0);

    const isLiftTruck = (j.jobType || j.job_type) === "lift_truck";
    const vehLabel = isLiftTruck
      ? `${get(j.vehicleMake, j.vehicle_make)} ${get(j.vehicleModel, j.vehicle_model)}`.trim() || "Lift Truck"
      : `${get(j.vehicleYear, j.vehicle_year)} ${get(j.vehicleMake, j.vehicle_make)} ${get(j.vehicleModel, j.vehicle_model)}`.trim() || "Vehicle";
    const vehKey = get(j.vehicleId, j.vehicle_id) || vehLabel;

    let veh = cust.vehicleIndex.get(vehKey);
    if (!veh) {
      veh = { key: vehKey, label: vehLabel, jobs: [], total: 0 };
      cust.vehicleIndex.set(vehKey, veh);
      cust.vehicles.push(veh);
    }
    veh.jobs.push(j);
    veh.total += Number(j.grandTotal || j.grand_total || 0);
  }

  const searching = search.trim().length > 0;

  function toggleCustomer(key) {
    setExpandedCustomers(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
  function toggleVehicle(key) {
    setExpandedVehicles(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  return (
    <div>
      <input
        style={{ ...S.input, marginBottom: 14 }}
        placeholder="Search by customer, job #, vehicle..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 12 }}>
        {filtered.length} job{filtered.length !== 1 ? "s" : ""} · {groups.length} customer{groups.length !== 1 ? "s" : ""}
      </div>

      {groups.map(cust => {
        const custOpen = searching || expandedCustomers.has(cust.key);
        return (
          <div key={cust.key} style={{ ...S.card, padding: 0, overflow: "hidden", marginBottom: 10 }}>
            <div
              onClick={() => toggleCustomer(cust.key)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, color: C.textMuted, width: 12, display: "inline-block" }}>{custOpen ? "▾" : "▸"}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{cust.name}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                    {cust.vehicles.length} vehicle{cust.vehicles.length !== 1 ? "s" : ""} · {cust.jobCount} job{cust.jobCount !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>{fmt(cust.total)}</div>
            </div>

            {custOpen && (
              <div style={{ borderTop: `1px solid ${C.border}` }}>
                {cust.vehicles.map(veh => {
                  const vehKey = `${cust.key}::${veh.key}`;
                  const vehOpen = searching || expandedVehicles.has(vehKey);
                  return (
                    <div key={vehKey} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <div
                        onClick={() => toggleVehicle(vehKey)}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px 10px 34px", cursor: "pointer", background: C.elevated }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 10, color: C.textMuted, width: 12, display: "inline-block" }}>{vehOpen ? "▾" : "▸"}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{veh.label}</div>
                            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                              {veh.jobs.length} job{veh.jobs.length !== 1 ? "s" : ""}
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary }}>{fmt(veh.total)}</div>
                      </div>

                      {vehOpen && (
                        <div style={{ padding: "10px 12px 10px 34px" }}>
                          {veh.jobs.map(j => (
                            <div key={j.id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div style={{ cursor: "pointer", flex: 1 }} onClick={() => setSelected(j)}>
                                  <div style={{ fontSize: 11, color: C.accent, fontWeight: 600, marginBottom: 2 }}>
                                    {get(j.jobNumber, j.job_number)}
                                  </div>
                                  <div style={{ fontSize: 12, color: C.textMuted }}>
                                    {j.date} · {get(j.payMethod, j.pay_method)}{j.mileage ? ` · ${j.mileage} mi` : ""}
                                  </div>
                                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                                    {(j.lines || []).map(l => l.customName || l.service).join(", ")}
                                  </div>
                                </div>
                             <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                                  <div style={{ fontSize: 14, color: C.green, fontWeight: 700 }}>
                                    {fmt(j.grandTotal || j.grand_total)}
                                  </div>
                                  {deletingId === j.id ? (
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
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ fontSize: 12, color: C.textMuted, padding: "20px 0" }}>No jobs found</div>
      )}
    </div>
  );
}
