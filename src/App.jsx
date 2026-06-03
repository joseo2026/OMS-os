import { useState, useEffect, useRef } from "react";
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

const TAB_ICONS = {
  Dashboard: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
  Records: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  Reports: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  Settings: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
};

function Records({ data, setData, initialSubTab, onSubTabChange }) {
  const { C } = useTheme();
  const [subTab, setSubTab] = useState(initialSubTab || "Customers");

  function handleSubTab(t) {
    setSubTab(t);
    if (onSubTabChange) onSubTabChange(t);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {["Customers", "Expenses", "Jobs", "Mileage"].map(t => (
          <button
            key={t}
            onClick={() => handleSubTab(t)}
            style={{
              flex: 1, padding: "10px",
              background: subTab === t ? "#3b82f6" : "#1e1e1e",
              border: `1px solid ${subTab === t ? "#3b82f6" : "#2a2a2a"}`,
              borderRadius: 6,
              color: subTab === t ? "#fff" : "#8a8a8a",
              fontSize: 12, fontWeight: subTab === t ? 600 : 400,
              cursor: "pointer", fontFamily: "inherit",
              letterSpacing: "0.08em", textTransform: "uppercase",
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
  const [tabIndex, setTabIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [slideDir, setSlideDir] = useState(0); // -1 left, 1 right
  const [data, setData] = useState(defaultData);
  const [loading, setLoading] = useState(true);
  const [fabOpen, setFabOpen] = useState(false);
  const [recordsSubTab, setRecordsSubTab] = useState("Customers");

  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const pendingTabIndex = useRef(null);

  const tab = TABS[tabIndex];

  useEffect(() => {
    loadData().then(d => {
      setData(d);
      setLoading(false);
    });
  }, []);

  function navigateTo(newIndex) {
    if (newIndex === tabIndex || animating) return;
    const dir = newIndex > tabIndex ? 1 : -1;
    setSlideDir(dir);
    setAnimating(true);
    pendingTabIndex.current = newIndex;
  }

  function setTab(name) {
    const idx = TABS.indexOf(name);
    if (idx !== -1) navigateTo(idx);
    else if (name === "New Job") {
      setTabIndex(-1);
    }
  }

  useEffect(() => {
    if (!animating) return;
    const timer = setTimeout(() => {
      setTabIndex(pendingTabIndex.current);
      setAnimating(false);
      setSlideDir(0);
    }, 280);
    return () => clearTimeout(timer);
  }, [animating]);

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0 && tabIndex < TABS.length - 1) navigateTo(tabIndex + 1);
      if (dx > 0 && tabIndex > 0) navigateTo(tabIndex - 1);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }

  function handleFabAction(action) {
    setFabOpen(false);
    if (action === "job") {
      setTabIndex(-1); // special new job state
    } else if (action === "customer") {
      navigateTo(TABS.indexOf("Records"));
      setRecordsSubTab("Customers");
    } else if (action === "expense") {
      navigateTo(TABS.indexOf("Records"));
      setRecordsSubTab("Expenses");
    } else if (action === "mileage") {
      navigateTo(TABS.indexOf("Records"));
      setRecordsSubTab("Mileage");
    }
  }

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

  // Slide animation styles
  const entering = {
    transform: animating ? `translateX(${slideDir * 100}%)` : "translateX(0)",
    opacity: animating ? 0 : 1,
    transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.28s ease",
  };

  const exiting = {
    transform: animating ? `translateX(${slideDir * 100}%)` : "translateX(0)",
    opacity: animating ? 0 : 1,
    transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.28s ease",
    position: "absolute",
    top: 0, left: 0, right: 0,
  };

  const isNewJob = tabIndex === -1;

  return (
    <div
      style={S.app}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
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
      </div>

      {/* Content with slide animation */}
      <div style={{ ...S.content, paddingBottom: 120, position: "relative", overflow: "hidden" }}>
        <div style={entering}>
          {isNewJob && <NewJob data={data} setData={setData} onDone={() => navigateTo(0)} />}
          {!isNewJob && tab === "Dashboard" && <Dashboard data={data} />}
          {!isNewJob && tab === "Records"   && <Records data={data} setData={setData} initialSubTab={recordsSubTab} onSubTabChange={setRecordsSubTab} />}
          {!isNewJob && tab === "Reports"   && <Export data={data} />}
          {!isNewJob && tab === "Settings"  && <Settings />}
        </div>
      </div>

      {/* Bottom Nav Bar */}
      <div
        className="no-print"
        style={{
          position: "fixed",
          bottom: 0, left: 0, right: 0,
          zIndex: 100,
          background: C.surface,
          borderTop: `1px solid ${C.border}`,
          display: "flex",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => navigateTo(i)}
            style={{
              flex: 1, background: "none", border: "none",
              padding: "10px 4px 8px",
              cursor: "pointer",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 3,
              color: !isNewJob && tabIndex === i ? C.accent : C.textMuted,
              fontFamily: "inherit",
              transition: "color 0.15s",
            }}
          >
            {TAB_ICONS[t]}
            <span style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: !isNewJob && tabIndex === i ? 600 : 400 }}>
              {t}
            </span>
          </button>
        ))}
      </div>

      {/* FAB overlay */}
      {fabOpen && (
        <div
          onClick={() => setFabOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 149, background: "rgba(0,0,0,0.4)" }}
        />
      )}

      {/* FAB actions */}
      {fabOpen && (
        <div style={{
          position: "fixed",
          bottom: `calc(90px + env(safe-area-inset-bottom))`,
          right: 20, zIndex: 150,
          display: "flex", flexDirection: "column",
          gap: 10, alignItems: "flex-end",
        }}>
          {[
            { label: "New Job",      action: "job",      color: C.accent },
            { label: "New Customer", action: "customer", color: "#10b981" },
            { label: "New Expense",  action: "expense",  color: "#f59e0b" },
            { label: "Log Mileage",  action: "mileage",  color: "#8b5cf6" },
          ].map(({ label, action, color }) => (
            <div key={action} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 20, padding: "6px 14px",
                fontSize: 12, color: C.textPrimary,
                fontFamily: "inherit", whiteSpace: "nowrap",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}>
                {label}
              </div>
              <button
                onClick={() => handleFabAction(action)}
                style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: color, border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 3px 10px ${color}66`, flexShrink: 0,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        className="no-print"
        onClick={() => setFabOpen(!fabOpen)}
        style={{
          position: "fixed",
          bottom: `calc(76px + env(safe-area-inset-bottom))`,
          right: 20, zIndex: 151,
          width: 56, height: 56, borderRadius: "50%",
          background: fabOpen ? C.elevated : C.accent,
          border: `1px solid ${fabOpen ? C.border : C.accent}`,
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(59,130,246,0.4)",
          transition: "all 0.2s",
        }}
      >
        <svg
          width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke={fabOpen ? C.textSecondary : "#fff"}
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: fabOpen ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        >
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
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
