import { useState } from "react";
import { useTheme } from "../theme.jsx";
import { uid, today, saveData, deleteData } from "../helpers.js";
import Input from "./Input.jsx";
import Modal from "./Modal.jsx";

export default function Appointments({ data, setData }) {
  const { C, S } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ date: today(), time: "", customerId: "", vehicleId: "", services: "", notes: "", status: "Scheduled" });

  async function save() {
    if (!form.date || !form.customerId) return;
    const newAppt = { ...form, id: uid(), created_at: today() };
    await saveData('appointments', newAppt);
    setData({ ...data, appointments: [...(data.appointments || []), newAppt] });
    setForm({ date: today(), time: "", customerId: "", vehicleId: "", services: "", notes: "", status: "Scheduled" });
    setShowModal(false);
  }

  async function remove(id) {
    await deleteData('appointments', id);
    setData({ ...data, appointments: data.appointments.filter(a => a.id !== id) });
  }

  async function updateStatus(id, status) {
    const appt = data.appointments.find(a => a.id === id);
    if (!appt) return;
    await saveData('appointments', { ...appt, status });
    setData({ ...data, appointments: data.appointments.map(a => a.id === id ? { ...a, status } : a) });
  }

  const appts = [...(data.appointments || [])].sort((a, b) => a.date?.localeCompare(b.date));
  const upcoming = appts.filter(a => a.date >= today() && a.status !== "Cancelled");
  const past = appts.filter(a => a.date < today() || a.status === "Cancelled");
  const customers = data.customers || [];
  const vehicles = data.vehicles || [];
  const selectedCustVehicles = form.customerId
    ? vehicles.filter(v => v.customer_id === form.customerId || v.customerId === form.customerId)
    : [];

  const statusColor = { Scheduled: C.yellow, Confirmed: C.green, Completed: C.textMuted, Cancelled: C.red };

  function ApptCard({ a }) {
    const cust = customers.find(c => c.id === a.customerId || c.id === a.customer_id);
    const veh = vehicles.find(v => v.id === a.vehicleId || v.id === a.vehicle_id);
    return (
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{cust?.name || "Unknown"}</span>
              <span style={S.tag(statusColor[a.status] || C.textMuted)}>{a.status}</span>
            </div>
            {veh && <div style={{ fontSize: 12, color: C.textSecondary }}>{veh.year} {veh.make} {veh.model}</div>}
            {a.services && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{a.services}</div>}
            {a.notes && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, fontStyle: "italic" }}>{a.notes}</div>}
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{a.date}{a.time && ` at ${a.time}`}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            <select value={a.status} onChange={e => updateStatus(a.id, e.target.value)}
              style={{ ...S.input, width: "auto", fontSize: 11, padding: "4px 8px" }}>
              {["Scheduled", "Confirmed", "Completed", "Cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button style={S.btnDanger} onClick={() => remove(a.id)}>Remove</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={S.sectionHead}>
        <div style={{ fontSize: 12, color: C.textSecondary }}>{upcoming.length} upcoming</div>
        <button style={S.btnPrimary} onClick={() => setShowModal(true)}>+ Book Appointment</button>
      </div>

      {upcoming.length > 0 && (
        <>
          <div style={S.cardTitle}>Upcoming</div>
          {upcoming.map(a => <ApptCard key={a.id} a={a} />)}
        </>
      )}
      {upcoming.length === 0 && <div style={{ fontSize: 12, color: C.textMuted, padding: "8px 0 16px" }}>No upcoming appointments</div>}

      {past.length > 0 && (
        <>
          <div style={{ ...S.cardTitle, marginTop: 16 }}>Past / Cancelled</div>
          {past.map(a => <ApptCard key={a.id} a={a} />)}
        </>
      )}

      {showModal && (
        <Modal title="Book Appointment" onClose={() => setShowModal(false)}>
          <div style={S.grid2}>
            <Input label="Date *" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            <Input label="Time" type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
          </div>
          <Input label="Customer *" as="select" value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value, vehicleId: "" })}>
            <option value="">Select customer...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Input>
          {selectedCustVehicles.length > 0 && (
            <Input label="Vehicle" as="select" value={form.vehicleId} onChange={e => setForm({ ...form, vehicleId: e.target.value })}>
              <option value="">Select vehicle...</option>
              {selectedCustVehicles.map(v => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>)}
            </Input>
          )}
          <Input label="Services Requested" value={form.services} onChange={e => setForm({ ...form, services: e.target.value })} placeholder="e.g. Synthetic oil change, tire rotation" />
          <Input label="Notes" as="textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any special instructions..." />
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button style={{ ...S.btnSecondary, flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
            <button style={{ ...S.btnPrimary, flex: 1 }} onClick={save}>Save Appointment</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
