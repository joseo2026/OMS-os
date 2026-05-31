import { useState } from "react";
import { useTheme } from "../theme.jsx";
import { uid, today, fmt, saveData, deleteData } from "../helpers.js";
import { getAppSettings } from "./Settings.jsx";
import Input from "./Input.jsx";
import Modal from "./Modal.jsx";

function fmtMiles(val) {
  const digits = String(val).replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString() : "";
}

export default function Mileage({ data, setData }) {
  const { C, S } = useTheme();
  const { mileageRate: MILEAGE_RATE } = getAppSettings();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ date: today(), miles: "", purpose: "", from: "", to: "" });

  async function save() {
    if (!form.miles || !form.purpose) return;
    const rawMiles = form.miles.replace(/,/g, "");
    const newEntry = { ...form, miles: rawMiles, id: uid(), created_at: today() };
    await saveData('mileage', newEntry);
    setData({ ...data, mileage: [...(data.mileage || []), newEntry] });
    setForm({ date: today(), miles: "", purpose: "", from: "", to: "" });
    setShowModal(false);
  }

  async function remove(id) {
    await deleteData('mileage', id);
    setData({ ...data, mileage: data.mileage.filter(m => m.id !== id) });
  }

  const entries = [...(data.mileage || [])].sort((a, b) => b.date?.localeCompare(a.date));
  const totalMiles = entries.reduce((s, m) => s + Number(String(m.miles || 0).replace(/,/g, "")), 0);
  const deduction = totalMiles * MILEAGE_RATE;

  return (
    <div>
      <div style={S.sectionHead}>
        <div>
          <div style={{ fontSize: 12, color: C.textSecondary }}>{entries.length} entries · {totalMiles.toLocaleString()} total miles</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.green, marginTop: 2 }}>{fmt(deduction)} deduction @ ${Number(MILEAGE_RATE).toFixed(3)}/mi</div>
        </div>
        <button style={S.btnPrimary} onClick={() => setShowModal(true)}>+ Log Miles</button>
      </div>

      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={S.cardTitle}>IRS Standard Mileage Rate (2026)</div>
        <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.6 }}>
          ${Number(MILEAGE_RATE).toFixed(3)} per mile for business use. Keep this log for tax deductions. Your {totalMiles.toLocaleString()} miles
          equals a <span style={{ color: C.green, fontWeight: 600 }}>{fmt(deduction)}</span> tax deduction.
        </div>
      </div>

      {entries.map(m => (
        <div key={m.id} style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{m.purpose}</div>
              {(m.from || m.to) && (
                <div style={{ fontSize: 12, color: C.textSecondary }}>
                  {m.from && <span>{m.from}</span>}
                  {m.from && m.to && <span style={{ color: C.textMuted }}> → </span>}
                  {m.to && <span>{m.to}</span>}
                </div>
              )}
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{m.date}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, textAlign: "right" }}>{Number(m.miles).toLocaleString()} mi</div>
                <div style={{ fontSize: 11, color: C.green, textAlign: "right" }}>{fmt(Number(String(m.miles).replace(/,/g, "")) * MILEAGE_RATE)}</div>
              </div>
              <button style={S.btnDanger} onClick={() => remove(m.id)}>Remove</button>
            </div>
          </div>
        </div>
      ))}
      {entries.length === 0 && <div style={{ fontSize: 12, color: C.textMuted, padding: "20px 0" }}>No mileage logged yet</div>}

      {showModal && (
        <Modal title="Log Mileage" onClose={() => setShowModal(false)}>
          <div style={S.grid2}>
            <Input label="Date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            <Input label="Miles *" type="text" inputMode="numeric" value={form.miles} onChange={e => setForm({ ...form, miles: fmtMiles(e.target.value) })} placeholder="0" />
          </div>
          <Input label="Purpose *" value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} placeholder="e.g. Customer service call" />
          <div style={S.grid2}>
            <Input label="From" value={form.from} onChange={e => setForm({ ...form, from: e.target.value })} placeholder="Starting location" />
            <Input label="To" value={form.to} onChange={e => setForm({ ...form, to: e.target.value })} placeholder="Destination" />
          </div>
          {form.miles && (
            <div style={{ background: C.elevated, borderRadius: 6, padding: "10px 12px", marginBottom: 12, fontSize: 12, color: C.green }}>
              Deduction: {fmt(Number(form.miles.replace(/,/g, "")) * MILEAGE_RATE)} @ ${Number(MILEAGE_RATE).toFixed(3)}/mi
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button style={{ ...S.btnSecondary, flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
            <button style={{ ...S.btnPrimary, flex: 1 }} onClick={save}>Save Entry</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
