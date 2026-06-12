export const EXPENSE_CATS = [
  "Administrative", "Fuel", "Insurance", "Legal & Accounting",
  "Marketing", "Miscellaneous", "Parts & Materials", "Technology",
  "Tools & Equipment", "Vehicle Maintenance"
];
export const SERVICES = [
  { name: "Synthetic Oil Change (up to 5qt)", labor: 100, parts: 50 },
  { name: "Conventional Oil Change (up to 5qt)", labor: 75, parts: 35 },
  { name: "Tire Rotation", labor: 40, parts: 0 },
  { name: "Wiper Blade Replacement", labor: 20, parts: 0 },
  { name: "Light Bulb Replacement", labor: 20, parts: 0 },
  { name: "Brake Inspection", labor: 30, parts: 0 },
  { name: "Brake Pad Replacement (per axle)", labor: 80, parts: 0 },
  { name: "Additional Oil Quart", labor: 0, parts: 9 },
  { name: "Custom Service", labor: 0, parts: 0 },
];
export const LIFT_TRUCK_SERVICES = [
  { name: "Trip Charge", labor: 100, parts: 0 },
  { name: "Preventative Maintenance", labor: 0, parts: 0 },
  { name: "Custom Service", labor: 0, parts: 0 },
];
export const FL_TAX = 0.07;
export const SE_TAX_RATE = 0.153;
export const FED_TAX_RATE = 0.22;
export const QUARTERLY_DATES = ["Apr 15", "Jun 15", "Sep 15", "Jan 15"];
export const MILEAGE_RATE = 0.725; // IRS standard mileage rate for 2026
export const STORAGE_KEY = "oms-data-v1";
export const defaultData = {
  customers: [],
  vehicles: [],
  jobs: [],
  expenses: [],
  mileage: [],
  appointments: [],
};
