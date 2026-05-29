import { useState } from "react";
import { C, S } from "../styles.js";
import { uid, today, saveData } from "../helpers.js";
import Input from "./Input.jsx";
import Modal from "./Modal.jsx";

export default function Vehicles({ data, setData }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ customerId: "", year: "", make: "", model: "", vin: "", color: "", notes: "" });

  function save() {
    if (!form.year || !form.make || !form.model) return;
    const updated = { ...data, vehicles: [...(data.vehicles || []), { ...form, id: uid(), createdAt: today() }] };
    setData(updated);
    saveData(updated);
    setForm({ customerId: "", year: "", make: "", model: "", vin: "", color: "", notes: "" });
    setShowModal(false);
  }

  function remove(id) {
    const updated = { ...data, vehicles: data.vehicles.filter(v => v.id !== id) };
    setData(updated);
    saveData(updated);
  }

  const customers = data.customers || [];
  const vehicles = data.vehicles || [];
  const jobs = data.jobs || [];

  return (
    <div>
      <div style={S.sectionHead}>
        <div style={{ fontSize: 12, color: C.textSecondary }}>{vehicles.length} vehicles</div>
        <button style={S.btnPrimary} onClick={() => setShowModal(true)}>+ Add Vehicle</button>
      </div>
      {vehicles.map(v => {
        const owner = customers.find(c => c.id === v.customerId);
        const vJobs = jobs.filter(j => j.vehicleId === v.id);
        const lastJob = [...vJobs].sort((a, b) => b.date?.localeCompare(a.date))[0];
        return (
          <div key={v.id} style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{v.year} {v.make} {v.model}</div>
                {owner && <div style={{ fontSize: 12, color: C.accent, marginBottom: 4 }}>{owner.name}</div>}
                {v.vin && <div style={{ fontSize: 11, color: C.textMuted }}>VIN: {v.vin}</div>}
                {v.color && <div style={{ fontSize: 11, color: C.textMuted }}>Color: {v.color}</div>}
                {lastJob && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>Last service: {lastJob.date} · {lastJob.mileage} mi</div>}
                <div style={{ marginTop: 6 }}><span style={S.tag(C.textSecondary)}>{vJobs.length} service{vJobs.length !== 1 ? "s" : ""}</span></div>
              </div>
              <button style={S.btnDanger} onClick={() => remove(v.id)}>Remove</button>
            </div>
          </div>
        );
      })}
      {vehicles.length === 0 && <div style={{ fontSize: 12, color: C.textMuted, padding: "20px 0" }}>No vehicles recorded</div>}

      {showModal && (
        <Modal title="Add Vehicle" onClose={() => setShowModal(false)}>
          <Input label="Customer" as="select" value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}>
            <option value="">Select customer...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Input>
          <div style={S.grid3}>
            <Input label="Year *" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} placeholder="2020" />
            <Input label="Make *" value={form.make} onChange={e => setForm({ ...form, make: e.target.value })} placeholder="Toyota" />
            <Input label="Model *" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="Camry" />
          </div>
          <Input label="VIN" value={form.vin} onChange={e => setForm({ ...form, vin: e.target.value })} placeholder="Vehicle Identification Number" />
          <Input label="Color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} placeholder="e.g. Silver" />
          <Input label="Notes" as="textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any vehicle notes..." />
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button style={{ ...S.btnSecondary, flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
            <button style={{ ...S.btnPrimary, flex: 1 }} onClick={save}>Save Vehicle</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
