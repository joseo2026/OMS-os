import { useState, useEffect } from "react";
import { ThemeProvider, useTheme } from "./theme.jsx";
import { loadData, saveData } from "./helpers.js";
import { defaultData } from "./constants.js";
import Dashboard from "./components/Dashboard.jsx";
import NewJob from "./components/NewJob.jsx";
import JobHistory from "./components/JobHistory.jsx";
import Customers from "./components/Customers.jsx";
import Expenses from "./components/Expenses.jsx";
import Mileage from "./components/Mileage.jsx";
import Appointments from "./components/Appointments.jsx";
import Export from "./components/Export.jsx";
import Settings from "./components/Settings.jsx";

const ALL_TABS = ["Dashboard", "New Job", "Records", "Customers", "Expenses", "Appointments", "Export", "Settings"];
const ALWAYS_VISIBLE = ["Dashboard", "Settings"];

function loadTabVisibility() {
  try {
    const saved = localStorage.getItem("oms-tab-visibility");
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function Records({ data, setData }) {
  const { C, S } = useTheme();
  const [subTab, setSubTab] = useState("Jobs");

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["Jobs", "Mileage"].map(t => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            style={{
              flex: 1,
              padding: "10px",
              background: subTab === t ? C.accent : C.elevated,
              border: `1px solid ${subTab === t ? C.accent : C.border}`,
              borderRadius: 6,
              color: subTab === t ? "#fff" : C.textSecondary,
              fontSize: 12,
              fontWeight: subTab === t ? 600 : 400,
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              transition: "all 0.15s",
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {subTab === "Jobs" && <JobHistory data={data} setData={setData} />}
      {subTab === "Mileage" && <Mileage data={data} setData={setData} />}
    </div>
  );
}

function AppContent() {
  const { C, S } = useTheme();
  const [tab, setTab] = useState("Dashboard");
  const [data, setData] = useState(defaultData);
  const [loading, setLoading] = useState(true);
  const [tabVisibility, setTabVisibility] = useState(loadTabVisibility);

  useEffect(() => {
    loadData().then(d => {
      setData(d);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    localStorage.setItem("oms-tab-visibility", JSON.stringify(tabVisibility));
    if (tabVisibility[tab] === false && !ALWAYS_VISIBLE.includes(tab)) {
      setTab("Dashboard");
    }
  }, [tabVisibility]);

  const visibleTabs = ALL_TABS.filter(t => ALWAYS_VISIBLE.includes(t) || tabVisibility[t] !== false);

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
      <div style={{ position: "sticky", top: 0, zIndex: 100 }}>
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
          {visibleTabs.map(t => (
            <button key={t} style={S.navBtn(tab === t)} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div style={S.content}>
        {tab === "Dashboard"    && <Dashboard data={data} />}
        {tab === "New Job"      && <NewJob data={data} setData={setData} onDone={() => setTab("Dashboard")} />}
        {tab === "Records"      && <Records data={data} setData={setData} />}
        {tab === "Customers"    && <Customers data={data} setData={setData} />}
        {tab === "Expenses"     && <Expenses data={data} setData={setData} />}
        {tab === "Appointments" && <Appointments data={data} setData={setData} />}
        {tab === "Export"       && <Export data={data} />}
        {tab === "Settings"     && <Settings tabVisibility={tabVisibility} setTabVisibility={setTabVisibility} />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
