import { useState, useEffect } from "react";
import { useTheme } from "../theme.jsx";
import { uid, today, fmt, saveData, deleteData } from "../helpers.js";
import Input from "./Input.jsx";
import Modal from "./Modal.jsx";

const EMPTY_CUSTOMER = { name: "", phone: "", email: "", address: "", city: "", zip: "" };
const EMPTY_VEHICLE = { year: "", make: "", model: "", vin: "", color: "", notes: "" };
const EMPTY_NEW_VEHICLE = { year: "", make: "", model: "", vin: "", color: "", notes: "" };

function InvoiceModal({ job, onClose }) {
  const { C, S } = useTheme();
  if (!job) return null;
  const getVal = (a, b) => a || b || "";
  return (
    <Modal title={getVal(job.jobNumber, job.job_number)} onClose={onClose}>
      <div style={{ background: "#fff", color: "#111", borderRadius: 8, padding: 16, fontFamily: "inherit" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, paddingBottom: 10, borderBottom: "2px solid #3b82f6" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>OCASIO</div>
            <div style={{ fontSize: 10, color: "#666" }}>MECHANICAL SERVICES LLC</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#3b82f6" }}>{getVal(job.jobNumber, job.job_number)}</div>
            <div style={{ fontSize: 10, color: "#999" }}>{job.date}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 9, color: "#999", textTransform: "uppercase", marginBottom: 3 }}>Bill To</div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{getVal(job.customerName, job.customer_name)}</div>
            <div style={{ fontSize: 11, color: "#555" }}>{getVal(job.customerPhone, job.customer_phone)}</div>
            <div style={{ fontSize: 11, color: "#555" }}>{getVal(job.customerAddress, job.customer_address)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "#999", textTransform: "uppercase", marginBottom: 3 }}>Vehicle</div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{getVal(job.vehicleYear, job.vehicle_year)} {getVal(job.vehicleMake, job.vehicle_make)} {getVal(job.vehicleModel, job.vehicle_model)}</div>
            <div style={{ fontSize: 11, color: "#555" }}>Mileage: {job.mileage}</div>
            {getVal(job.vehicleVin, job.vehicle_vin) && <div style={{ fontSize: 10, color: "#999" }}>VIN: {getVal(job.vehicleVin, job.vehicle_vin)}</div>}
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #ddd" }}>
              {["Service", "Labor", "Parts", "Total"].map(h => (
                <th key={h} style={{ textAlign: h === "Service" ? "left" : "right", fontSize: 9, color: "#999", fontWeight: 400, padding: "3px 0", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(job.lines || []).map((l, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ fontSize: 11, padding: "6px 0" }}>{l.service}</td>
                <td style={{ fontSize: 11, padding: "6px 0", textAlign: "right", color: "#555" }}>{fmt(l.labor)}</td>
                <td style={{ fontSize: 11, padding: "6px 0", textAlign: "right", color: "#555" }}>{fmt(l.parts)}</td>
                <td style={{ fontSize: 11, padding: "6px 0", textAlign: "right", fontWeight: 600 }}>{fmt(Number(l.labor) + Number(l.parts))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ borderTop: "1px solid #eee", paddingTop: 8, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#666", marginBottom: 3 }}><span>Labor</span><span>{fmt(job.labor)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#666", marginBottom: 3 }}><span>Parts</span><span>{fmt(job.parts)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#666", marginBottom: 6 }}><span>Tax</span><span>{fmt(job.tax)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, borderTop: "2px solid #111", paddingTop: 6 }}>
            <span>GRAND TOTAL</span>
            <span style={{ color: "#3b82f6" }}>{fmt(job.grandTotal || job.grand_total)}</span>
          </div>
          <div style={{ fontSize: 10, color: "#999", marginTop: 4 }}>Payment: {job.payMethod || job.pay_method}</div>
        </div>
        {(job.aiNotes || job.ai_notes) && (
          <div style={{ background: "#f9f9f9", borderLeft: "3px solid #3b82f6", padding: "8px 10px", fontSize: 11, color: "#555", lineHeight: 1.5, marginBottom: 10, borderRadius: "0 4px 4px 0" }}>
            {job.aiNotes || job.ai_notes}
          </div>
        )}
        <div style={{ textAlign: "center", borderTop: "1px solid #eee", paddingTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700 }}>PAYMENT DUE UPON RECEIPT</div>
          <div style={{ fontSize: 10, color: "#999" }}>Make checks payable to: Ocasio Mechanical Services, LLC</div>
          <div style={{ fontSize: 11, color: "#3b82f6", marginTop: 4, fontWeight: 700 }}>Thank You For Your Business!</div>
        </div>
      </div>
      <button onClick={() => window.print()} style={{ ...S.btnPrimary, width: "100%", marginTop: 12 }}>
        Print / Save PDF
      </button>
    </Modal>
  );
}

export default function Customers({ data, setData, autoAdd, onAutoAddDone }) {
  const { C, S } = useTheme();
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerForm, setCustomerForm] = useState(EMPTY_CUSTOMER);
  const [newVehicleForm, setNewVehicleForm] = useState(EMPTY_NEW_VEHICLE);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [vehicleModal, setVehicleModal] = useState(null);
  const [vehicleForm, setVehicleForm] = useState(EMPTY_VEHICLE);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmDeleteVehicle, setConfirmDeleteVehicle] = useState(null);
  const [viewingJob, setViewingJob] = useState(null);

  useEffect(() => {
    if (autoAdd) {
      setShowCustomerModal(true);
      if (onAutoAddDone) onAutoAddDone();
    }
  }, [autoAdd]);

  const vehicles = data.vehicles || [];
  const jobs = data.jobs || [];

  const filtered = (data.customers || []).filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  async function saveCustomer() {
    if (!customerForm.name.trim()) return;
    const customerId = uid();
    const newCustomer = { ...customerForm, id: customerId, created_at: today() };
    const hasVehicle = newVehicleForm.year.trim() && newVehicleForm.make.trim() && newVehicleForm.model.trim();
    const newVehicle = hasVehicle ? { ...newVehicleForm, customer_id: customerId, id: uid(), created_at: today() } : null;
    await saveData('customers', newCustomer);
    if (newVehicle) await saveData('vehicles', newVehicle);
    setData({
      ...data,
      customers: [...(data.customers || []), newCustomer],
      vehicles: newVehicle ? [...(data.vehicles || []), newVehicle] : data.vehicles || []
    });
    setCustomerForm(EMPTY_CUSTOMER);
    setNewVehicleForm(EMPTY_NEW_VEHICLE);
    setShowCustomerModal(false);
  }

  async function removeCustomer(id) {
    const custVehicles = (data.vehicles || []).filter(v => v.customer_id === id || v.customerId === id);
    for (const v of custVehicles) await deleteData('vehicles', v.id);
    await deleteData('customers', id);
    setData({
      ...data,
      customers: data.customers.filter(c => c.id !== id),
      vehicles: (data.vehicles || []).filter(v => v.customer_id !== id && v.customerId !== id),
    });
    setExpanded(null);
    setConfirmDelete(null);
  }

  async function saveVehicle() {
    if (!vehicleForm.year || !vehicleForm.make || !vehicleForm.model) return;
    const newVehicle = { ...vehicleForm, customer_id: vehicleModal, id: uid(), created_at: today() };
    await saveData('vehicles', newVehicle);
    setData({ ...data, vehicles: [...(data.vehicles || []), newVehicle] });
    setVehicleForm(EMPTY_VEHICLE);
    setVehicleModal(null);
  }

  async function removeVehicle(id) {
    await deleteData('vehicles', id);
    setData({ ...data, vehicles: (data.vehicles || []).filter(v => v.id !== id) });
    setConfirmDeleteVehicle(null);
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 14 }}>
        {filtered.length} customer{filtered.length !== 1 ? "s" : ""}
      </div>

      <input
        style={{ ...S.input, marginBottom: 14 }}
        placeholder="Search by name, phone, or email..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {filtered.map(c => {
        const cvs = vehicles.filter(v => v.customer_id === c.id || v.customerId === c.id);
        const cJobs = jobs.filter(j => j.customer_id === c.id || j.customerId === c.id || cvs.some(v => v.id === j.vehicleId || v.id === j.vehicle_id));
        const isOpen = expanded === c.id;

        return (
          <div key={c.id} style={{ ...S.card, padding: 0, overflow: "hidden" }}>
            {/* Customer header */}
            <div
              style={{ padding: "14px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              onClick={() => setExpanded(isOpen ? null : c.id)}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: C.textSecondary }}>
                  {c.phone}{c.email ? ` · ${c.email}` : ""}
                </div>
                {c.address && (
                  <div style={{ fontSize: 12, color: C.textMuted }}>{c.address}{c.city ? `, ${c.city}` : ""}{c.zip ? ` ${c.zip}` : ""}</div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: C.accent }}>{cvs.length} vehicle{cvs.length !== 1 ? "s" : ""}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{cJobs.length} job{cJobs.length !== 1 ? "s" : ""}</div>
                </div>
                <div style={{ fontSize: 18, color: C.textMuted, userSelect: "none" }}>{isOpen ? "▲" : "▼"}</div>
              </div>
            </div>

            {/* Expanded — vehicles with jobs nested inside */}
            {isOpen && (
              <div style={{ borderTop: `1px solid ${C.border}`, padding: "14px 18px" }}>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Vehicles & History</div>
                  <button style={{ ...S.btnPrimary, padding: "5px 14px", fontSize: 11 }} onClick={() => { setVehicleModal(c.id); setVehicleForm(EMPTY_VEHICLE); }}>
                    + Add Vehicle
                  </button>
                </div>

                {cvs.length === 0 && (
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>No vehicles on file.</div>
                )}

                {cvs.map(v => {
                  const vJobs = [...jobs.filter(j => j.vehicle_id === v.id || j.vehicleId === v.id)]
                    .sort((a, b) => b.date?.localeCompare(a.date));

                  return (
                    <div key={v.id} style={{ background: C.elevated, borderRadius: 8, marginBottom: 12, overflow: "hidden" }}>
                      {/* Vehicle header */}
                      <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{v.year} {v.make} {v.model}</div>
                          {v.color && <div style={{ fontSize: 11, color: C.textMuted }}>Color: {v.color}</div>}
                          {v.vin && <div style={{ fontSize: 11, color: C.textMuted }}>VIN: {v.vin}</div>}
                          {v.notes && <div style={{ fontSize: 11, color: C.textMuted, fontStyle: "italic", marginTop: 2 }}>{v.notes}</div>}
                          <div style={{ marginTop: 6 }}>
                            <span style={S.tag(C.textSecondary)}>{vJobs.length} job{vJobs.length !== 1 ? "s" : ""}</span>
                          </div>
                        </div>
                        <div>
                          {confirmDeleteVehicle === v.id ? (
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <span style={{ fontSize: 11, color: C.red }}>Remove?</span>
                              <button style={{ ...S.btnDanger, padding: "3px 10px", fontSize: 11 }} onClick={() => removeVehicle(v.id)}>Yes</button>
                              <button style={{ ...S.btnSecondary, padding: "3px 10px", fontSize: 11 }} onClick={() => setConfirmDeleteVehicle(null)}>No</button>
                            </div>
                          ) : (
                            <button style={{ ...S.btnDanger, padding: "4px 10px", fontSize: 11 }} onClick={() => setConfirmDeleteVehicle(v.id)}>Remove</button>
                          )}
                        </div>
                      </div>

                      {/* Jobs for this vehicle */}
                      {vJobs.length > 0 && (
                        <div style={{ borderTop: `1px solid ${C.border}` }}>
                          {vJobs.map((j, idx) => (
                            <div
                              key={j.id}
                              style={{
                                padding: "10px 14px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                borderBottom: idx < vJobs.length - 1 ? `1px solid ${C.border}` : "none",
                              }}
                            >
                              <div>
                                <div style={{ fontSize: 11, color: C.accent, fontWeight: 600, marginBottom: 2 }}>
                                  {j.jobNumber || j.job_number}
                                </div>
                                <div style={{ fontSize: 12, color: C.textPrimary }}>
                                  {j.lines?.map(l => l.service).join(", ")}
                                </div>
                                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                                  {j.date} · {j.mileage} mi
                                </div>
                              </div>
                              <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                                <div style={{ fontSize: 13, color: C.green, fontWeight: 700 }}>
                                  {fmt(j.grandTotal || j.grand_total)}
                                </div>
                                <button
                                  onClick={() => setViewingJob(j)}
                                  style={{ ...S.btnSecondary, padding: "4px 12px", fontSize: 11 }}
                                >
                                  View →
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {vJobs.length === 0 && (
                        <div style={{ padding: "8px 14px", borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.textMuted }}>
                          No service history yet
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Delete customer */}
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 4, display: "flex", justifyContent: "flex-end" }}>
                  {confirmDelete === c.id ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: C.red }}>Delete customer and all their vehicles?</span>
                      <button style={S.btnDanger} onClick={() => removeCustomer(c.id)}>Yes, delete</button>
                      <button style={S.btnSecondary} onClick={() => setConfirmDelete(null)}>Cancel</button>
                    </div>
                  ) : (
                    <button style={S.btnDanger} onClick={() => setConfirmDelete(c.id)}>Delete Customer</button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && <div style={{ fontSize: 12, color: C.textMuted, padding: "20px 0" }}>No customers found</div>}

      {viewingJob && <InvoiceModal job={viewingJob} onClose={() => setViewingJob(null)} />}

      {showCustomerModal && (
        <Modal title="New Customer" onClose={() => { setShowCustomerModal(false); setNewVehicleForm(EMPTY_NEW_VEHICLE); }}>
          <Input label="Full Name *" value={customerForm.name} onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })} placeholder="Customer name" />
          <Input label="Phone" value={customerForm.phone} onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })} placeholder="(555) 555-5555" />
          <Input label="Email" type="email" value={customerForm.email} onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })} placeholder="email@example.com" />
          <Input label="Service Address" value={customerForm.address} onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })} placeholder="Street address" />
          <div style={S.grid2}>
            <Input label="City" value={customerForm.city} onChange={e => setCustomerForm({ ...customerForm, city: e.target.value })} placeholder="City" />
            <Input label="ZIP" value={customerForm.zip} onChange={e => setCustomerForm({ ...customerForm, zip: e.target.value })} placeholder="ZIP" />
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, margin: "16px 0 12px" }} />
          <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 10 }}>
            Vehicle <span style={{ fontWeight: 400, color: C.textMuted }}>(optional)</span>
          </div>
          <div style={S.grid3}>
            <Input label="Year" value={newVehicleForm.year} onChange={e => setNewVehicleForm({ ...newVehicleForm, year: e.target.value })} placeholder="2020" />
            <Input label="Make" value={newVehicleForm.make} onChange={e => setNewVehicleForm({ ...newVehicleForm, make: e.target.value })} placeholder="Toyota" />
            <Input label="Model" value={newVehicleForm.model} onChange={e => setNewVehicleForm({ ...newVehicleForm, model: e.target.value })} placeholder="Camry" />
          </div>
          <div style={S.grid2}>
            <Input label="Color" value={newVehicleForm.color} onChange={e => setNewVehicleForm({ ...newVehicleForm, color: e.target.value })} placeholder="e.g. Silver" />
            <Input label="VIN" value={newVehicleForm.vin} onChange={e => setNewVehicleForm({ ...newVehicleForm, vin: e.target.value })} placeholder="VIN" />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button style={{ ...S.btnSecondary, flex: 1 }} onClick={() => { setShowCustomerModal(false); setNewVehicleForm(EMPTY_NEW_VEHICLE); }}>Cancel</button>
            <button style={{ ...S.btnPrimary, flex: 1 }} onClick={saveCustomer}>Save Customer</button>
          </div>
        </Modal>
      )}

      {vehicleModal && (
        <Modal title="Add Vehicle" onClose={() => setVehicleModal(null)}>
          <div style={{ fontSize: 12, color: C.accent, marginBottom: 12, fontWeight: 500 }}>
            {(data.customers || []).find(c => c.id === vehicleModal)?.name}
          </div>
          <div style={S.grid3}>
            <Input label="Year *" value={vehicleForm.year} onChange={e => setVehicleForm({ ...vehicleForm, year: e.target.value })} placeholder="2020" />
            <Input label="Make *" value={vehicleForm.make} onChange={e => setVehicleForm({ ...vehicleForm, make: e.target.value })} placeholder="Toyota" />
            <Input label="Model *" value={vehicleForm.model} onChange={e => setVehicleForm({ ...vehicleForm, model: e.target.value })} placeholder="Camry" />
          </div>
          <Input label="Color" value={vehicleForm.color} onChange={e => setVehicleForm({ ...vehicleForm, color: e.target.value })} placeholder="e.g. Silver" />
          <Input label="VIN" value={vehicleForm.vin} onChange={e => setVehicleForm({ ...vehicleForm, vin: e.target.value })} placeholder="Vehicle Identification Number" />
          <Input label="Notes" as="textarea" value={vehicleForm.notes} onChange={e => setVehicleForm({ ...vehicleForm, notes: e.target.value })} placeholder="Any vehicle notes..." />
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button style={{ ...S.btnSecondary, flex: 1 }} onClick={() => setVehicleModal(null)}>Cancel</button>
            <button style={{ ...S.btnPrimary, flex: 1 }} onClick={saveVehicle}>Save Vehicle</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
