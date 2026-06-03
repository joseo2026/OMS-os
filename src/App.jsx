import { useState, useEffect } from "react";
import { ThemeProvider, useTheme } from "./theme.jsx";
import { loadData } from "./helpers.js";
import { defaultData } from "./constants.js";
import Dashboard from "./components/Dashboard.jsx";
import NewJob from "./components/NewJob.jsx";
import JobHistory from "./components/JobHistory.jsx";
import Customers from "./components/Customers.jsx";
import Expenses from "./components/Expenses.jsx";
import Mileage from "./components/Mileage.jsx";
import Export from "./components/Export.jsx";
import Settings from "./components/Settings.jsx";

const TABS = ["Dashboard", "Records", "Reports", "Settings"];

function Records({ data, setData }) {
  const { C } = useTheme();
  const [subTab, setSubTab] = useState("Customers");

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {["Customers", "Expenses", "Jobs", "Mileage"].map(t => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            style={{
              flex: 1,
              padding: "10px",
              background: subTab === t ? "#3b82f6" : "#1e1e1e",
              border: `1px solid ${subTab === t ? "#3b82f6" : "#2a2a2a"}`,
              borderRadius: 6,
              color: subTab === t ? "#fff" : "#8a8a8a",
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
      {subTab === "Customers" && <Customers data={data} setData={setData} />}
      {subTab === "Expenses"  && <Expenses data={data} setData={setData} />}
      {subTab === "Jobs"      && <JobHistory data={data} setData={setData} />}
      {subTab === "Mileage"   && <Mileage data={data} setData={setData} />}
    </div>
  );
}

function AppContent() {
  const { C, S } = useTheme();
  const [tab, setTab] = useState("Dashboard");
  const [data, setData] = useState(defaultData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData().then(d => {
      setData(d);
      setLoading(false);
    });
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
          {TABS.map(t => (
            <button key={t} style={S.navBtn(tab === t)} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ ...S.content, paddingBottom: 100 }}>
        {tab === "Dashboard" && <Dashboard data={data} />}
        {tab === "New Job"   && <NewJob data={data} setData={setData} onDone={() => setTab("Dashboard")} />}
        {tab === "Records"   && <Records data={data} setData={setData} />}
        {tab === "Reports"   && <Export data={data} />}
        {tab === "Settings"  && <Settings />}
      </div>

      {tab !== "New Job" && (
        <button
          className="no-print"
          onClick={() => setTab("New Job")}
          style={{
            position: "fixed",
            bottom: `calc(24px + env(safe-area-inset-bottom))`,
            right: 24,
            zIndex: 200,
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: C.accent,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 16px rgba(59,130,246,0.4)",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}
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
