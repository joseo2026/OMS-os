import { useState } from "react";
import { C, S } from "../styles.js";
import { uid, today, saveData } from "../helpers.js";
import Input from "./Input.jsx";
import Modal from "./Modal.jsx";

export default function Customers({ data, setData }) {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", city: "", zip: "" });

  const filtered = (data.customers || []).filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  function save() {
    if (!form.name.trim()) return;
    const updated = { ...data, customers: [...(data.customers || []), { ...form, id: uid(), createdAt: today() }] };
    setData(updated);
    saveData(updated);
    setForm({ name: "", phone: "", email: "", address: "", city: "", zip: "" });
    setShowModal(false);
  }

  function remove(id) {
    const updated = { ...data, customers: data.customers.filter(c => c.id !== id) };
    setData(updated);
    saveData(updated);
  }

  const vehicles = data.vehicles || [];

  return (
    <div>
      <div style={S.sectionHead}>
        <div style={{ fontSize: 12, color: C.textSecondary }}>{filtered.length} customers</div>
        <button style={S.btnPrimary} onClick={() => setShowModal(true)}>+ Add Customer</button>
      </div>
      <input style={{ ...S.input, marginBottom: 14 }} placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} />
      {filtered.map(c => {
        const cvs = vehicles.filter(v => v.customerId === c.id);
        return (
          <div key={c.id} style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: C.textSecondary }}>{c.phone}{c.email && ` · ${c.email}`}</div>
                {c.address && <div style={{ fontSize: 12, color: C.textMuted }}>{c.address}, {c.city} {c.zip}</div>}
                {cvs.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {cvs.map(v => <span key={v.id} style={S.tag(C.accent)}>{v.year} {v.make} {v.model}</span>)}
                  </div>
                )}
              </div>
              <button style={S.btnDanger} onClick={() => remove(c.id)}>Remove</button>
            </div>
          </div>
        );
      })}
      {filtered.length === 0 && <div style={{ fontSize: 12, color: C.textMuted, padding: "20px 0" }}>No customers found</div>}

      {showModal && (
        <Modal title="New Customer" onClose={() => setShowModal(false)}>
          <Input label="Full Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Customer name" />
          <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(555) 555-5555" />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
          <Input label="Service Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Street address" />
          <div style={S.grid2}>
            <Input label="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="City" />
            <Input label="ZIP" value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} placeholder="ZIP" />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button style={{ ...S.btnSecondary, flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
            <button style={{ ...S.btnPrimary, flex: 1 }} onClick={save}>Save Customer</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
