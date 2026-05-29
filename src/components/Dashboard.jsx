import { C, S } from "../styles.js";
import { fmt } from "../helpers.js";
import { SE_TAX_RATE, FED_TAX_RATE, QUARTERLY_DATES, MILEAGE_RATE } from "../constants.js";

export default function Dashboard({ data }) {
  const jobs = data.jobs || [];
  const expenses = data.expenses || [];
  const mileage = data.mileage || [];

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthJobs = jobs.filter(j => j.date?.startsWith(thisMonth));
  const monthIncome = monthJobs.reduce((s, j) => s + Number(j.grandTotal || 0), 0);
  const totalIncome = jobs.reduce((s, j) => s + Number(j.grandTotal || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const netProfit = totalIncome - totalExpenses;
  const seTax = Math.max(0, netProfit) * SE_TAX_RATE;
  const fedTax = Math.max(0, netProfit) * FED_TAX_RATE;
  const totalTaxEstimate = seTax + fedTax;
  const quarterlyEstimate = totalTaxEstimate / 4;
  const totalMiles = mileage.reduce((s, m) => s + Number(m.miles || 0), 0);
  const mileageDeduction = totalMiles * MILEAGE_RATE;

  const recentJobs = [...jobs].sort((a, b) => b.date?.localeCompare(a.date)).slice(0, 5);

  return (
    <div>
      <div style={{ ...S.grid2, marginBottom: 12, gridTemplateColumns: "repeat(2, 1fr)" }}>
        <div style={S.stat}>
          <div style={S.statLabel}>This Month</div>
          <div style={{ ...S.statValue, color: C.green }}>{fmt(monthIncome)}</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{monthJobs.length} jobs</div>
        </div>
        <div style={S.stat}>
          <div style={S.statLabel}>Net Profit (YTD)</div>
          <div style={{ ...S.statValue, color: netProfit >= 0 ? C.green : C.red }}>{fmt(netProfit)}</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>after expenses</div>
        </div>
        <div style={S.stat}>
          <div style={S.statLabel}>Total Expenses</div>
          <div style={{ ...S.statValue, color: C.red }}>{fmt(totalExpenses)}</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>+ {fmt(mileageDeduction)} mileage deduction</div>
        </div>
        <div style={S.stat}>
          <div style={S.statLabel}>Quarterly Tax Est.</div>
          <div style={{ ...S.statValue, color: C.yellow }}>{fmt(quarterlyEstimate)}</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{fmt(totalTaxEstimate)} annual est.</div>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>Tax Breakdown (YTD)</div>
        <div style={S.row}>
          <span style={{ fontSize: 12, color: C.textSecondary }}>Gross Revenue</span>
          <span style={{ fontSize: 13, color: C.green }}>{fmt(totalIncome)}</span>
        </div>
        <div style={S.row}>
          <span style={{ fontSize: 12, color: C.textSecondary }}>Business Expenses</span>
          <span style={{ fontSize: 13, color: C.red }}>- {fmt(totalExpenses)}</span>
        </div>
        <div style={S.row}>
          <span style={{ fontSize: 12, color: C.textSecondary }}>Mileage Deduction ({totalMiles} mi × $0.67)</span>
          <span style={{ fontSize: 13, color: C.red }}>- {fmt(mileageDeduction)}</span>
        </div>
        <div style={{ ...S.row, borderBottom: "none" }}>
          <span style={{ fontSize: 12, color: C.textSecondary }}>Net Taxable Income</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{fmt(Math.max(0, netProfit - mileageDeduction))}</span>
        </div>
        <div style={{ background: C.elevated, borderRadius: 6, padding: "12px 14px", marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textMuted, marginBottom: 6 }}>
            <span>Self-Employment Tax (15.3%)</span><span style={{ color: C.yellow }}>{fmt(seTax)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textMuted, marginBottom: 10 }}>
            <span>Federal Income Tax Est. (22%)</span><span style={{ color: C.yellow }}>{fmt(fedTax)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
            <span>Quarterly Payment Est.</span><span style={{ color: C.yellow }}>{fmt(quarterlyEstimate)}</span>
          </div>
          <div style={{ fontSize: 10, color: C.textMuted, marginTop: 8 }}>
            Due: {QUARTERLY_DATES.map((d, i) => <span key={i} style={{ marginRight: 10 }}>Q{i + 1}: {d}</span>)}
          </div>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>Recent Jobs</div>
        {recentJobs.length === 0 ? (
          <div style={{ fontSize: 12, color: C.textMuted, padding: "8px 0" }}>No jobs recorded yet</div>
        ) : recentJobs.map(j => (
          <div key={j.id} style={S.row}>
            <div>
              <div style={{ fontSize: 13 }}>{j.customerName}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{j.vehicleYear} {j.vehicleMake} {j.vehicleModel} · {j.date}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, color: C.green, fontWeight: 600 }}>{fmt(j.grandTotal)}</div>
              <div style={{ fontSize: 10, color: C.textMuted }}>{j.jobNumber}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
