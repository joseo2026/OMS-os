import { useState } from "react";
import { useTheme } from "../theme.jsx";
import { uid, today, fmt, saveData } from "../helpers.js";
import { EXPENSE_CATS } from "../constants.js";
import Input from "./Input.jsx";
import Modal from "./Modal.jsx";

export default function Expenses({ data, setData }) {
  const { C, S } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("All");
  const [form, setForm] = useState({ date: today(), category: EXPENSE_CATS[0], description: "", amount: "", vendor: "", receipt: "" });

  function save() {
    if (!form.amount || !form.description) return;
    const updated = { ...data, expenses: [...(data.expenses || []), { ...form, id: uid() }] };
    setData(updated);
    saveData(updated);
    setForm({ date: today(), category: EXPENSE_CATS[0], description: "", amount: "", vendor: "", receipt: "" });
    setShowModal(false);
  }

  function remove(id) {
    const updated = { ...data, expenses: data.expenses.filter(e => e.id !== id) };
    setData(updated);
    saveData(updated);
  }

  const expenses = [...(data.expenses || [])].sort((a, b) => b.date?.localeCompare(a.date));
  const filtered = filter === "All" ? expenses : expenses.filter(e => e.category === filter);
  const total = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);

  const catTotals = EXPENSE_CATS.map(cat => ({
    cat,
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount || 0), 0)
  })).filter(x => x.total > 0).sort((a, b) => b.total - a.total);

  return (
    <div>
      <div style={S.sectionHead}>
        <div>
          <div style={{ fontSize: 12, color: C.textSecondary }}>{filtered.length} expenses</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.red, marginTop: 2 }}>{fmt(total)}</div>
        </div>
        <button style={S.btnPrimary} onClick={() => setShowModal(true)}>+ Add Expense</button>
      </div>

      {catTotals.length > 0 && (
        <div style={S.card}>
          <div style={S.cardTitle}>By Category</div>
          {catTotals.map(({ cat, total: ct }) => (
            <div key={cat} style={S.row}>
              <span style={{ fontSize: 12, color: C.textSecondary }}>{cat}</span>
              <span style={{ fontSize: 13, color: C.red }}>{fmt(ct)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {["All", ...EXPENSE_CATS].map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            style={{ padding: "4px 10px", background: filter === cat ? C.accent : C.elevated, border: `1px solid ${filter === cat ? C.accent : C.border}`, borderRadius: 4, color: filter === cat ? "#fff" : C.textSecondary, fontSize: 10, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em" }}>
            {cat}
          </button>
        ))}
      </div>

      {filtered.map(e => (
        <div key={e.id} style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{e.description}</div>
              <div style={{ fontSize: 11, color: C.textSecondary }}>{e.category}{e.vendor ? ` · ${e.vendor}` : ""}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{e.date}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <div style={{ fontSize: 15, color: C.red, fontWeight: 600 }}>{fmt(e.amount)}</div>
              <button style={S.btnDanger} onClick={() => remove(e.id)}>Remove</button>
            </div>
          </div>
        </div>
      ))}
      {filtered.length === 0 && <div style={{ fontSize: 12, color: C.textMuted, padding: "20px 0" }}>No expenses recorded</div>}

      {showModal && (
        <Modal title="Add Expense" onClose={() => setShowModal(false)}>
          <div style={S.grid2}>
            <Input label="Date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            <Input label="Amount ($) *" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
          </div>
          <Input label="Category" as="select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
            {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </Input>
          <Input label="Description *" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What was purchased" />
          <Input label="Vendor / Store" value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} placeholder="Where purchased" />
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button style={{ ...S.btnSecondary, flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
            <button style={{ ...S.btnPrimary, flex: 1 }} onClick={save}>Save Expense</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
