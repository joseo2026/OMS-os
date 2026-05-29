import { useState, useEffect } from "react";
import { C, S } from "./styles.js";
import { loadData, saveData } from "./helpers.js";
import { defaultData } from "./constants.js";
import Dashboard from "./components/Dashboard.jsx";
import NewJob from "./components/NewJob.jsx";
import JobHistory from "./components/JobHistory.jsx";
import Customers from "./components/Customers.jsx";
import Vehicles from "./components/Vehicles.jsx";
import Expenses from "./components/Expenses.jsx";
import Mileage from "./components/Mileage.jsx";
import Appointments from "./components/Appointments.jsx";
import Export from "./components/Export.jsx";

const TABS = ["Dashboard", "New Job", "Jobs", "Customers", "Vehicles", "Expenses", "Mileage", "Appointments", "Export"];

export default function App() {
  const [tab, setTab] = useState("Dashboard");
  const [data, setData] = useState(defaultData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const d = loadData();
    setData(d);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, color: C.accent, letterSpacing: "0.2em", marginBottom: 8 }}>OCASIO</div>
          <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.15em" }}>LOADING SYSTEM...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.app}>
      <div style={S.header} className="no-print">
        <div>
          <div style={{ fontSize: 11, color: C.accent, letterSpacing: "0.2em", textTransform: "uppercase" }}>Ocasio Mechanical Services LLC</div>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "0.05em" }}>Business OS</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: C.textMuted }}>
            {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
          </div>
          <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>
            {(data.jobs || []).length} jobs · {(data.customers || []).length} customers
          </div>
        </div>
      </div>

      <div style={S.nav} className="no-print">
        {TABS.map(t => (
          <button key={t} style={S.navBtn(tab === t)} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div style={S.content}>
        {tab === "Dashboard" && <Dashboard data={data} />}
        {tab === "New Job" && <NewJob data={data} setData={setData} onDone={() => setTab("Dashboard")} />}
        {tab === "Jobs" && <JobHistory data={data} setData={setData} />}
        {tab === "Customers" && <Customers data={data} setData={setData} />}
        {tab === "Vehicles" && <Vehicles data={data} setData={setData} />}
        {tab === "Expenses" && <Expenses data={data} setData={setData} />}
        {tab === "Mileage" && <Mileage data={data} setData={setData} />}
        {tab === "Appointments" && <Appointments data={data} setData={setData} />}
        {tab === "Export" && <Export data={data} />}
      </div>
    </div>
  );
}
