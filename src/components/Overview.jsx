import { useState, useMemo, useEffect } from "react";
import { useTheme } from "../theme.jsx";
import { fmt, supabase } from "../helpers.js";

const QUARTERS = [
  { label: "Q1", period: "Jan 1 – Mar 31", due: "Apr 15", from: (y) => `${y}-01-01`, to: (y) => `${y}-03-31` },
  { label: "Q2", period: "Apr 1 – May 31", due: "Jun 15", from: (y) => `${y}-04-01`, to: (y) => `${y}-05-31` },
  { label: "Q3", period: "Jun 1 – Aug 31", due: "Sep 15", from: (y) => `${y}-06-01`, to: (y) => `${y}-08-31` },
  { label: "Q4", period: "Sep 1 – Dec 31", due: "Jan 15", from: (y) => `${y}-09-01`, to: (y) => `${y}-12-31` },
];

function calcAnnualMetrics(jobs, expenses, mileage, mileageRate, seTaxRate, fedTaxRate) {
  const revenue    = jobs.reduce((s, j) => s + Number(j.grandTotal || j.grand_total || 0), 0);
  const expTotal   = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const miles      = mileage.reduce((s, m) => s + Number(String(m.miles || 0).replace(/,/g, "")), 0);
  const mileDeduct = miles * mileageRate;
  const netProfit  = revenue - expTotal;
  const seTax      = Math.max(0, netProfit) * 0.9235 * seTaxRate;
  const taxable    = Math.max(0, netProfit - mileDeduct - seTax * 0.5);
  const fedTax     = taxable * fedTaxRate;
  const totalTax   = seTax + fedTax;
  return { revenue, expTotal, miles, mileDeduct, netProfit, seTax, fedTax, totalTax };
}

function calcQuarterMetrics(jobs, expenses, mileage, mileageRate, seTaxRate, fedTaxRate) {
  const revenue   = jobs.reduce((s, j) => s + Number(j.grandTotal || j.grand_total || 0), 0);
  const expTotal  = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const miles     = mileage.reduce((s, m) => s + Number(String(m.miles || 0).replace(/,/g, "")), 0);
  const netProfit = revenue - expTotal;
  const seTax     = Math.max(0, netProfit) * 0.9235 * seTaxRate;
  const taxable   = Math.max(0, netProfit - seTax * 0.5);
  const fedTax    = taxable * fedTaxRate;
  const totalTax  = seTax + fedTax;
  return { revenue, expTotal, miles, mileDeduct: miles * mileageRate, netProfit, seTax, fedTax, totalTax };
}

function inRange(date, from, to) {
  if (!date) return false;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

const DEFAULT_RATES = {
  mileageRate: 0.725,
  seTaxRate:   0.153,
  fedTaxRate:  0.22,
  salesTax:    0.07,
};

export default function Overview({ data, setData }) {
  const { C, S } = useTheme();
  const [year, setYear] = useState(new Date().getFullYear());
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [loadingRates, setLoadingRates] = useState(true);

  const allJobs     = data.jobs     || [];
  const allExpenses = data.expenses || [];
  const allMileage  = data.mileage  || [];

  useEffect(() => {
    async function fetchRates() {
      setLoadingRates(true);
      try {
        const { data: rows } = await supabase
          .from("tax_rates")
          .select("*")
          .eq("year", year)
          .limit(1);

        if (rows && rows.length > 0) {
          const r = rows[0];
          setRates({
            mileageRate: Number(r.mileage_rate) || DEFAULT_RATES.mileageRate,
            seTaxRate:   Number(r.se_tax)        || DEFAULT_RATES.seTaxRate,
            fedTaxRate:  Number(r.fed_tax)        || DEFAULT_RATES.fedTaxRate,
            salesTax:    Number(r.sales_tax)      || DEFAULT_RATES.salesTax,
          });
        } else {
          const { data: recent } = await supabase
            .from("tax_rates")
            .select("*")
            .lt("year", year)
            .order("year", { ascending: false })
            .limit(1);
          if (recent && recent.length > 0) {
            const r = recent[0];
            setRates({
              mileageRate: Number(r.mileage_rate) || DEFAULT_RATES.mileageRate,
              seTaxRate:   Number(r.se_tax)        || DEFAULT_RATES.seTaxRate,
              fedTaxRate:  Number(r.fed_tax)        || DEFAULT_RATES.fedTaxRate,
              salesTax:    Number(r.sales_tax)      || DEFAULT_RATES.salesTax,
            });
          } else {
            setRates(DEFAULT_RATES);
          }
        }
      } catch (e) {
        setRates(DEFAULT_RATES);
      }
      setLoadingRates(false);
    }
    fetchRates();
  }, [year]);

  const { mileageRate, seTaxRate, fedTaxRate } = rates;

  const quarters = useMemo(() => QUARTERS.map(q => {
    const from     = q.from(year);
    const to       = q.to(year);
    const jobs     = allJobs.filter(j => inRange(j.date, from, to));
    const expenses = allExpenses.filter(e => inRange(e.date, from, to));
    const mileage  = allMileage.filter(m => inRange(m.date, from, to));
    const metrics  = calcQuarterMetrics(jobs, expenses, mileage, mileageRate, seTaxRate, fedTaxRate);
    return { ...q, from, to, jobs, expenses, mileage, metrics };
  }), [allJobs, allExpenses, allMileage, year, mileageRate, seTaxRate, fedTaxRate]);

  const annual = useMemo(() => {
    const jobs     = allJobs.filter(j => inRange(j.date, `${year}-01-01`, `${year}-12-31`));
    const expenses = allExpenses.filter(e => inRange(e.date, `${year}-01-01`, `${year}-12-31`));
    const mileage  = allMileage.filter(m => inRange(m.date, `${year}-01-01`, `${year}-12-31`));
    return { jobs, expenses, mileage, metrics: calcAnnualMetrics(jobs, expenses, mileage, mileageRate, seTaxRate, fedTaxRate) };
  }, [allJobs, allExpenses, allMileage, year, mileageRate, seTaxRate, fedTaxRate]);

  const ytdTax = useMemo(() =>
    quarters.reduce((s, q) => s + q.metrics.totalTax, 0), [quarters]);

  const recentJobs = useMemo(() =>
    [...(data.jobs || [])]
      .sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at))
      .slice(0, 5),
    [data.jobs]
  );

  return (
    <div>
      {/* Year selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => setYear(y => y - 1)}
          style={{ ...S.btnPrimary, padding: "8px 16px", fontSize: 16 }}
        >←</button>
        <div style={{ fontSize: 20, fontWeight: 700, flex: 1, textAlign: "center", letterSpacing: "-0.5px" }}>
          {year}
          {loadingRates && (
            <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 400, marginLeft: 8 }}>
              loading...
            </span>
          )}
        </div>
       <button
          onClick={() => setYear(y => y + 1)}
          style={{ ...S.btnPrimary, padding: "8px 16px", fontSize: 16 }}
        >→</button>
      </div>

      {/* Quarterly breakdown — full width, statement style */}
      <div style={{ ...S.card, padding: 0, overflow: "hidden", marginBottom: 14 }}>
        {/* Card header */}
        <div style={{
          padding:      "14px 18px",
          borderBottom: `1px solid ${C.border}`,
          display:      "flex",
          justifyContent: "space-between",
          alignItems:   "center",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
            Quarterly Breakdown
          </div>
          <div style={{ fontSize: 11, color: C.textMuted }}>
            {year}
          </div>
        </div>

        {/* Column headers */}
        <div style={{
          display:        "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          padding:        "10px 18px",
          borderBottom:   `1px solid ${C.border}`,
          background:     C.elevated,
        }}>
          {["Revenue", "Expenses", "Net Profit", "Tax Est."].map(h => (
            <div key={h} style={{
              fontSize:  10,
              color:     C.textMuted,
              fontWeight: 500,
              textAlign: h === "Revenue" ? "left" : "right",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}>
              {h}
            </div>
          ))}
        </div>

        {/* Quarter rows */}
        {quarters.map((q, i) => {
          const m = q.metrics;
          const hasActivity = m.revenue > 0 || m.expTotal > 0;
          return (
            <div key={q.label} style={{
              borderBottom: i < quarters.length - 1 ? `1px solid ${C.border}` : "none",
            }}>
              {/* Quarter label row */}
              <div style={{
                display:        "flex",
                justifyContent: "space-between",
                alignItems:     "center",
                padding:        "10px 18px 6px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    fontSize:   12,
                    fontWeight: 700,
                    color:      hasActivity ? C.accent : C.textMuted,
                  }}>
                    {q.label}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>
                    {q.period}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: C.textMuted }}>
                  {q.jobs.length > 0
                    ? `${q.jobs.length} job${q.jobs.length !== 1 ? "s" : ""}`
                    : `Due ${q.due}`}
                </div>
              </div>

              {/* Data row */}
              <div style={{
                display:             "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                padding:             "4px 18px 12px",
                alignItems:          "center",
              }}>
                {/* Revenue */}
                <div style={{
                  fontSize:  14,
                  fontWeight: 600,
                  color:     m.revenue > 0 ? C.green : C.textMuted,
                }}>
                  {fmt(m.revenue)}
                </div>

                {/* Expenses */}
                <div style={{
                  fontSize:  14,
                  fontWeight: 600,
                  color:     m.expTotal > 0 ? C.red : C.textMuted,
                  textAlign: "right",
                }}>
                  {fmt(m.expTotal)}
                </div>

                {/* Net Profit */}
                <div style={{
                  fontSize:  14,
                  fontWeight: 700,
                  color:     m.netProfit > 0 ? C.green : m.netProfit < 0 ? C.red : C.textMuted,
                  textAlign: "right",
                }}>
                  {fmt(m.netProfit)}
                </div>

                {/* Tax Est */}
                <div style={{
                  fontSize:  14,
                  fontWeight: 600,
                  color:     m.totalTax > 0 ? C.yellow : C.textMuted,
                  textAlign: "right",
                }}>
                  {fmt(m.totalTax)}
                </div>
              </div>
            </div>
          );
        })}

        {/* YTD Tax summary row */}
        <div style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "center",
          padding:        "12px 18px",
          background:     C.elevated,
          borderTop:      `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 12, color: C.textSecondary, fontWeight: 500 }}>
            YTD Tax Estimate
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.yellow }}>
            {fmt(ytdTax)}
          </div>
        </div>
      </div>

      {/* Annual Summary */}
      <div style={{ ...S.card, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, marginBottom: 14 }}>
          {year} Annual Summary
        </div>
        {[
          ["Gross Revenue",     fmt(annual.metrics.revenue),    C.green],
          ["Total Expenses",    fmt(annual.metrics.expTotal),   C.red],
          ["Mileage Deduction", fmt(annual.metrics.mileDeduct), C.red],
          ["Net Profit",        fmt(annual.metrics.netProfit),  annual.metrics.netProfit >= 0 ? C.green : C.red],
          ["SE Tax (15.3%)",    fmt(annual.metrics.seTax),      C.yellow],
          ["Federal Tax Est.",  fmt(annual.metrics.fedTax),     C.yellow],
        ].map(([label, value, color]) => (
          <div key={label} style={{
            display:        "flex",
            justifyContent: "space-between",
            padding:        "9px 0",
            borderBottom:   `1px solid ${C.border}`,
          }}>
            <span style={{ fontSize: 13, color: C.textSecondary }}>{label}</span>
            <span style={{ fontSize: 14, color, fontWeight: 600 }}>{value}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 2px" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>
            Total Tax Estimate
          </span>
          <span style={{ fontSize: 18, color: C.yellow, fontWeight: 700 }}>
            {fmt(annual.metrics.totalTax)}
          </span>
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
          Includes mileage deduction · CPA applies at filing
        </div>
      </div>

      {/* Recent Jobs */}
      <div style={{ ...S.card, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, marginBottom: 14 }}>
          Recent Jobs
        </div>
        {recentJobs.length === 0 ? (
          <div style={{ fontSize: 13, color: C.textMuted, textAlign: "center", padding: "20px 0" }}>
            No jobs yet — tap + to create your first job
          </div>
        ) : (
          recentJobs.map((job, i) => {
            const isLiftTruck = job.jobType === "lift_truck" || job.job_type === "lift_truck";
            const vehicleLabel = isLiftTruck
              ? `${job.vehicleMake || ""} ${job.vehicleModel || ""}`.trim()
              : `${job.vehicleYear || ""} ${job.vehicleMake || ""} ${job.vehicleModel || ""}`.trim();
            return (
              <div key={job.id} style={{
                display:        "flex",
                justifyContent: "space-between",
                alignItems:     "center",
                padding:        "11px 0",
                borderBottom:   i < recentJobs.length - 1 ? `1px solid ${C.border}` : "none",
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, marginBottom: 2 }}>
                    {job.customerName || job.customer_name}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>
                    {vehicleLabel}  ·  {job.date}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>
                    {fmt(job.grandTotal || job.grand_total || 0)}
                  </div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>
                    {job.jobNumber || job.job_number}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
