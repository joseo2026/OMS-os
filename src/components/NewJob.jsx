import { useState } from "react";
import { useTheme } from "../theme.jsx";
import { uid, today, jobNum, fmt, saveData } from "../helpers.js";
import { SERVICES, FL_TAX, MILEAGE_RATE } from "../constants.js";
import Input from "./Input.jsx";
import ShareButtons from "./ShareButtons.jsx";

function fmtMiles(val) {
  const digits = String(val).replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString() : "";
}

function Receipt({ job, onDone }) {
  const { C, S } = useTheme();
  return (
    <div>
      <div style={{ ...S.card, background: "#fff", color: "#111", fontFamily: "inherit" }} className="print-area">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, paddingBottom: 14, borderBottom: "2px solid #3b82f6" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.05em" }}>OCASIO</div>
            <div style={{ fontSize: 11, color: "#666", letterSpacing: "0.1em" }}>MECHANICAL SERVICES LLC</div>
            <div style={{ fontSize: 10, color: "#999" }}>Mobile Automotive Service · Florida</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase" }}>Receipt</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#3b82f6" }}>{job.jobNumber}</div>
            <div style={{ fontSize: 10, color: "#999" }}>{job.date}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Bill To</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{job.customerName}</div>
            <div style={{ fontSize: 12, color: "#555" }}>{job.customerPhone}</div>
            <div style={{ fontSize: 12, color: "#555" }}>{job.customerAddress}</div>
            {job.customerCity && <div style={{ fontSize: 12, color: "#555" }}>{job.customerCity}, FL {job.customerZip}</div>}
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Vehicle</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{job.vehicleYear} {job.vehicleMake} {job.vehicleModel}</div>
            <div style={{ fontSize: 12, color: "#555" }}>Mileage: {job.mileage}</div>
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
            {job.lines.map((l, i) => (
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
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666", marginBottom: 4 }}><span>Labor</span><span>{fmt(job.labor)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666", marginBottom: 4 }}><span>Parts</span><span>{fmt(job.parts)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666", marginBottom: 8 }}><span>Tax (7% on parts)</span><span>{fmt(job.tax)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, borderTop: "2px solid #111", paddingTop: 8 }}>
            <span>GRAND TOTAL</span><span style={{ color: "#3b82f6" }}>{fmt(job.grandTotal)}</span>
          </div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>Payment: {job.payMethod}</div>
        </div>
        {job.aiNotes && (
          <div style={{ background: "#f9f9f9", borderLeft: "3px solid #3b82f6", padding: "10px 12px", fontSize: 12, color: "#555", lineHeight: 1.6, marginBottom: 12, borderRadius: "0 6px 6px 0" }}>
            {job.aiNotes}
          </div>
        )}
        {job.techNotes && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Technician Notes</div>
            <div style={{ fontSize: 12, color: "#555" }}>{job.techNotes}</div>
          </div>
        )}
        <div style={{ borderTop: "1px solid #eee", paddingTop: 12, textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>PAYMENT DUE UPON RECEIPT</div>
          <div style={{ fontSize: 11, color: "#999" }}>Make checks payable to: Ocasio Mechanical Services, LLC</div>
          <div style={{ fontSize: 12, color: "#3b82f6", marginTop: 6, fontWeight: 700 }}>Thank You For Your Business!</div>
        </div>
      </div>
      <ShareButtons job={job} />
      <div style={{ display: "flex", gap: 10, marginTop: 10 }} className="no-print">
        <button style={{ ...S.btnSecondary, flex: 1 }} onClick={onDone}>← Dashboard</button>
        <button style={{ ...S.btnPrimary, flex: 1 }} onClick={() => window.print()}>Print / Save PDF</button>
      </div>
      <p style={{ fontSize: 11, color: "#999", textAlign: "center", marginTop: 8 }} className="no-print">
        Mac: File → Print → PDF · iPhone: Share → Print → pinch to zoom
      </p>
    </div>
  );
}

export default function NewJob({ data, setData, onDone }) {
  const { C, S } = useTheme();
  const [step, setStep] = useState(0);
  const [custMode, setCustMode] = useState("existing");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");

  // Customer autofill state
  const [custSearch, setCustSearch] = useState("");
  const [custSearchActive, setCustSearchActive] = useState(false);

  const [newCust, setNewCust] = useState({ name: "", phone: "", email: "", address: "", city: "", zip: "" });
  const [newVeh, setNewVeh] = useState({ year: "", make: "", model: "", color: "" });
  const [vehMode, setVehMode] = useState("existing");
  const [date, setDate] = useState(today());
  const [mileage, setMileage] = useState("");
  const [travelMiles, setTravelMiles] = useState("");
  const [lines, setLines] = useState([{ service: SERVICES[0].name, labor: 100, parts: 50 }]);
  const [payMethod, setPayMethod] = useState("Cash");
  const [techNotes, setTechNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [invoice, setInvoice] = useState(null);

  const customers = data.customers || [];
  const vehicles  = data.vehicles  || [];

  const custVehicles = selectedCustomer
    ? vehicles.filter(v => v.customer_id === selectedCustomer || v.customerId === selectedCustomer)
    : [];

  // Filtered customer suggestions
  const custSuggestions = custSearch.length >= 1
    ? customers.filter(c =>
        c.name?.toLowerCase().includes(custSearch.toLowerCase()) ||
        c.phone?.includes(custSearch)
      ).slice(0, 6)
    : [];

  function selectCustomerFromSearch(c) {
    setSelectedCustomer(c.id);
    setCustSearch(c.name);
    setCustSearchActive(false);
    setSelectedVehicle("");
    // Auto-select most recent vehicle if only one
    const cvs = vehicles.filter(v => v.customer_id === c.id || v.customerId === c.id);
    if (cvs.length === 1) setSelectedVehicle(cvs[0].id);
  }

  function updateLine(i, field, value) {
    const updated = [...lines];
    if (field === "service") {
      const found = SERVICES.find(s => s.name === value);
      updated[i] = { service: value, labor: found ? found.labor : 0, parts: found ? found.parts : 0 };
    } else {
      updated[i] = { ...updated[i], [field]: parseFloat(value) || 0 };
    }
    setLines(updated);
  }

  const labor      = lines.reduce((s, l) => s + Number(l.labor || 0), 0);
  const parts      = lines.reduce((s, l) => s + Number(l.parts || 0), 0);
  const tax        = parts * FL_TAX;
  const grandTotal = labor + parts + tax;

  async function generate() {
    setGenerating(true);
    let custObj = customers.find(c => c.id === selectedCustomer);
    let vehObj  = vehicles.find(v => v.id === selectedVehicle);

    if (custMode === "new") {
      const nc = { ...newCust, id: uid(), created_at: today() };
      await saveData("customers", nc);
      custObj = nc;
      setData(prev => ({ ...prev, customers: [...(prev.customers || []), nc] }));
    }

    if (vehMode === "new" || !vehObj) {
      const nv = { ...newVeh, customer_id: custObj?.id, id: uid(), created_at: today() };
      await saveData("vehicles", nv);
      vehObj = nv;
      setData(prev => ({ ...prev, vehicles: [...(prev.vehicles || []), nv] }));
    }

    let aiNotes = "Thank you for choosing Ocasio Mechanical Services. Your vehicle has been serviced with quality parts and professional care. We look forward to seeing you at your next scheduled maintenance.";
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are the service assistant for Ocasio Mechanical Services LLC, a professional mobile automotive service in Florida. Write a 2-sentence professional service summary for this receipt. Warm, confident, honest tone. Include a next service reminder. No greeting, just the note.\n\nCustomer: ${custObj?.name}\nVehicle: ${vehObj?.year} ${vehObj?.make} ${vehObj?.model} at ${mileage} miles\nServices: ${lines.map(l => l.service).join(", ")}\nTech notes: ${techNotes || "none"}\nTotal: $${grandTotal.toFixed(2)}`
          }]
        })
      });
      const d = await resp.json();
      aiNotes = d.content?.map(b => b.text || "").join("") || aiNotes;
    } catch (e) {
      console.warn("AI notes unavailable, using fallback");
    }

    const jn  = jobNum();
    const job = {
      id: uid(),
      job_number: jn,
      jobNumber: jn,
      date,
      mileage: mileage.replace(/,/g, ""),
      customer_id: custObj?.id,
      customerId: custObj?.id,
      customerName: custObj?.name,
      customerPhone: custObj?.phone,
      customerEmail: custObj?.email,
      customerAddress: custObj?.address,
      customerCity: custObj?.city,
      customerZip: custObj?.zip,
      vehicle_id: vehObj?.id,
      vehicleId: vehObj?.id,
      vehicleYear: vehObj?.year,
      vehicleMake: vehObj?.make,
      vehicleModel: vehObj?.model,
      lines,
      labor,
      parts,
      tax,
      grand_total: grandTotal,
      grandTotal,
      pay_method: payMethod,
      payMethod,
      tech_notes: techNotes,
      techNotes,
      ai_notes: aiNotes,
      aiNotes,
      created_at: new Date().toISOString(),
    };

    await saveData("jobs", {
      id: job.id,
      job_number: job.job_number,
      date: job.date,
      mileage: job.mileage,
      customer_id: job.customer_id,
      customer_name: job.customerName,
      customer_phone: job.customerPhone,
      customer_email: job.customerEmail,
      customer_address: job.customerAddress,
      customer_city: job.customerCity,
      customer_zip: job.customerZip,
      vehicle_id: job.vehicle_id,
      vehicle_year: job.vehicleYear,
      vehicle_make: job.vehicleMake,
      vehicle_model: job.vehicleModel,
      lines: job.lines,
      labor: job.labor,
      parts: job.parts,
      tax: job.tax,
      grand_total: job.grandTotal,
      pay_method: job.payMethod,
      tech_notes: job.techNotes,
      ai_notes: job.aiNotes,
      created_at: job.created_at,
    });

    const rawTravel = travelMiles.replace(/,/g, "");
    if (rawTravel && Number(rawTravel) > 0) {
      const mileEntry = {
        id: uid(),
        date,
        miles: rawTravel,
        purpose: `Service call: ${custObj?.name || "customer"} — ${vehObj?.year || ""} ${vehObj?.make || ""} ${vehObj?.model || ""}`.trim(),
        from: "",
        to: custObj?.address ? `${custObj.address}${custObj.city ? ", " + custObj.city : ""}` : "",
        job_id: job.id,
        created_at: today(),
      };
      await saveData("mileage", mileEntry);
      setData(prev => ({ ...prev, mileage: [...(prev.mileage || []), mileEntry] }));
    }

    setData(prev => ({ ...prev, jobs: [...(prev.jobs || []), job] }));
    setInvoice(job);
    setGenerating(false);
    setStep(3);
  }

  if (step === 3 && invoice) {
    return <Receipt job={invoice} onDone={onDone} />;
  }

  return (
    <div>
      {/* Progress bar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {["Customer", "Vehicle", "Services", "Invoice"].map((s, i) => (
          <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? C.accent : C.border }} />
        ))}
      </div>

      {/* ── STEP 0: Customer ── */}
      {step === 0 && (
        <div style={S.card}>
          <div style={S.cardTitle}>Customer</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {["existing", "new"].map(m => (
              <button key={m} onClick={() => { setCustMode(m); setCustSearch(""); setSelectedCustomer(""); }}
                style={{ ...m === custMode ? S.btnPrimary : S.btnSecondary, flex: 1, padding: "8px" }}>
                {m === "existing" ? "Existing Customer" : "New Customer"}
              </button>
            ))}
          </div>

          {custMode === "existing" ? (
            <div style={{ position: "relative", marginBottom: 14 }}>
              <label style={S.label}>Search Customer</label>
              <input
                style={{
                  ...S.input,
                  width: "100%",
                  boxSizing: "border-box",
                }}
                placeholder="Type name or phone..."
                value={custSearch}
                onChange={e => {
                  setCustSearch(e.target.value);
                  setCustSearchActive(true);
                  if (!e.target.value) setSelectedCustomer("");
                }}
                onFocus={() => setCustSearchActive(true)}
              />
              {/* Suggestions dropdown */}
              {custSearchActive && custSuggestions.length > 0 && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  zIndex: 100,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
                  overflow: "hidden",
                }}>
                  {custSuggestions.map(c => {
                    const cvs = vehicles.filter(v => v.customer_id === c.id || v.customerId === c.id);
                    return (
                      <div
                        key={c.id}
                        onMouseDown={() => selectCustomerFromSearch(c)}
                        onTouchStart={() => selectCustomerFromSearch(c)}
                        style={{
                          padding: "12px 14px",
                          borderBottom: `1px solid ${C.border}`,
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                          {c.phone}{cvs.length > 0 ? `  ·  ${cvs.map(v => `${v.year} ${v.make} ${v.model}`).join(", ")}` : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Confirm selected */}
              {selectedCustomer && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: C.elevated, borderRadius: 6, borderLeft: `3px solid ${C.accent}` }}>
                  <div style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>
                    ✓ {customers.find(c => c.id === selectedCustomer)?.name}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>
                    {customers.find(c => c.id === selectedCustomer)?.phone}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Input label="Full Name *" value={newCust.name} onChange={e => setNewCust({ ...newCust, name: e.target.value })} placeholder="Customer name" />
              <Input label="Phone" value={newCust.phone} onChange={e => setNewCust({ ...newCust, phone: e.target.value })} placeholder="(555) 555-5555" />
              <Input label="Email" value={newCust.email} onChange={e => setNewCust({ ...newCust, email: e.target.value })} placeholder="email@example.com" />
              <Input label="Service Address" value={newCust.address} onChange={e => setNewCust({ ...newCust, address: e.target.value })} placeholder="Street address" />
              <div style={S.grid2}>
                <Input label="City" value={newCust.city} onChange={e => setNewCust({ ...newCust, city: e.target.value })} placeholder="City" />
                <Input label="ZIP" value={newCust.zip} onChange={e => setNewCust({ ...newCust, zip: e.target.value })} placeholder="ZIP" />
              </div>
            </>
          )}

          <Input label="Service Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <button style={{ ...S.btnPrimary, width: "100%", marginTop: 4 }} onClick={() => setStep(1)}>Next → Vehicle</button>
        </div>
      )}

      {/* ── STEP 1: Vehicle ── */}
      {step === 1 && (
        <div style={S.card}>
          <div style={S.cardTitle}>Vehicle</div>
          {custVehicles.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {["existing", "new"].map(m => (
                <button key={m} onClick={() => setVehMode(m)}
                  style={{ ...m === vehMode ? S.btnPrimary : S.btnSecondary, flex: 1, padding: "8px" }}>
                  {m === "existing" ? "Existing Vehicle" : "New Vehicle"}
                </button>
              ))}
            </div>
          )}
          {(vehMode === "existing" && custVehicles.length > 0) ? (
            <Input label="Select Vehicle" as="select" value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)}>
              <option value="">Choose vehicle...</option>
              {custVehicles.map(v => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>)}
            </Input>
          ) : (
            <>
              <div style={S.grid3}>
                <Input label="Year *" value={newVeh.year} onChange={e => setNewVeh({ ...newVeh, year: e.target.value })} placeholder="2020" />
                <Input label="Make *" value={newVeh.make} onChange={e => setNewVeh({ ...newVeh, make: e.target.value })} placeholder="Toyota" />
                <Input label="Model *" value={newVeh.model} onChange={e => setNewVeh({ ...newVeh, model: e.target.value })} placeholder="Camry" />
              </div>
              <Input label="Color" value={newVeh.color} onChange={e => setNewVeh({ ...newVeh, color: e.target.value })} placeholder="Silver" />
            </>
          )}
          <Input label="Current Mileage" type="text" inputMode="numeric" value={mileage} onChange={e => setMileage(fmtMiles(e.target.value))} placeholder="e.g. 45,000" />
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button style={{ ...S.btnSecondary, flex: 1 }} onClick={() => setStep(0)}>← Back</button>
            <button style={{ ...S.btnPrimary, flex: 1 }} onClick={() => setStep(2)}>Next → Services</button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Services ── */}
      {step === 2 && (
        <div style={S.card}>
          <div style={S.cardTitle}>Services Performed</div>
          {lines.map((line, i) => (
            <div key={i} style={{ background: C.elevated, borderRadius: 6, padding: 12, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Line {i + 1}</span>
                {lines.length > 1 && (
                  <button onClick={() => setLines(lines.filter((_, idx) => idx !== i))}
                    style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 18 }}>×</button>
                )}
              </div>
              <Input as="select" value={line.service} onChange={e => updateLine(i, "service", e.target.value)}>
                {SERVICES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </Input>
              <div style={S.grid2}>
                <Input label="Labor ($)" type="number" inputMode="decimal" value={line.labor} onChange={e => updateLine(i, "labor", e.target.value)} onFocus={e => e.target.select()} />
                <Input label="Parts ($)" type="number" inputMode="decimal" value={line.parts} onChange={e => updateLine(i, "parts", e.target.value)} onFocus={e => e.target.select()} />
              </div>
            </div>
          ))}
          <button style={{ ...S.btnSecondary, width: "100%", marginBottom: 12 }}
            onClick={() => setLines([...lines, { service: SERVICES[0].name, labor: 100, parts: 50 }])}>
            + Add Service Line
          </button>
          <Input label="Tech Notes" as="textarea" value={techNotes} onChange={e => setTechNotes(e.target.value)} placeholder="Observations, recommendations..." />
          <div style={{ background: C.elevated, borderRadius: 6, padding: "10px 14px", marginBottom: 12, borderLeft: `3px solid ${C.accent}` }}>
            <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Internal — Not shown on receipt</div>
            <Input label="Travel Miles (round trip or one-way)" type="text" inputMode="numeric" value={travelMiles} onChange={e => setTravelMiles(fmtMiles(e.target.value))} placeholder="e.g. 12" />
            {travelMiles ? (
              <div style={{ fontSize: 11, color: C.green, marginTop: -6, marginBottom: 4 }}>
                Auto-logs {travelMiles} mi → {fmt(Number(travelMiles.replace(/,/g, "")) * MILEAGE_RATE)} mileage deduction
              </div>
            ) : (
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: -6, marginBottom: 4 }}>
                Miles entered here auto-create a mileage log entry for this job.
              </div>
            )}
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Payment Method</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["Cash", "Card", "Venmo", "Zelle"].map(m => (
                <button key={m} onClick={() => setPayMethod(m)}
                  style={{ flex: 1, padding: "8px 4px", background: payMethod === m ? C.accent : C.elevated, border: `1px solid ${payMethod === m ? C.accent : C.border}`, borderRadius: 6, color: payMethod === m ? "#fff" : C.textSecondary, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div style={{ background: C.elevated, borderRadius: 6, padding: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.textSecondary, marginBottom: 4 }}><span>Labor</span><span>{fmt(labor)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.textSecondary, marginBottom: 4 }}><span>Parts</span><span>{fmt(parts)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.textSecondary, marginBottom: 8 }}><span>Tax (7%)</span><span>{fmt(tax)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
              <span>Total</span><span style={{ color: C.accent }}>{fmt(grandTotal)}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ ...S.btnSecondary, flex: 1 }} onClick={() => setStep(1)}>← Back</button>
            <button style={{ ...S.btnPrimary, flex: 1 }} onClick={generate} disabled={generating}>
              {generating ? "Generating..." : "Generate Invoice →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
