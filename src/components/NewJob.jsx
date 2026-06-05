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
  const [payMethod, setPayMethod] = use
