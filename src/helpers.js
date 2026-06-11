import { defaultData } from './constants.js';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function fmt(n) {
  return "$" + Number(n || 0).toFixed(2);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function jobNum() {
  const n = new Date();
  return `OMS-${n.getFullYear()}${String(n.getMonth() + 1).padStart(2, "0")}${String(n.getDate()).padStart(2, "0")}-${String(n.getHours()).padStart(2, "0")}${String(n.getMinutes()).padStart(2, "0")}`;
}

export async function loadData() {
  try {
    const [customers, vehicles, jobs, expenses, mileage, appointments] = await Promise.all([
      supabase.from('customers').select('*'),
      supabase.from('vehicles').select('*'),
      supabase.from('jobs').select('*'),
      supabase.from('expenses').select('*'),
      supabase.from('mileage').select('*'),
      supabase.from('appointments').select('*'),
    ]);
    return {
      customers: customers.data || [],
      vehicles:  vehicles.data  || [],
      jobs:      jobs.data      || [],
      expenses:  expenses.data  || [],
      mileage:   mileage.data   || [],
      appointments: appointments.data || [],
    };
  } catch {
    return defaultData;
  }
}

export async function saveData(table, row) {
  const { error } = await supabase.from(table).upsert(row);
  if (error) {
    console.error(`SAVE FAILED [${table}]:`, error.message, error.details, error.hint);
    alert(`Save failed (${table}): ${error.message}`);
  }
}

export async function deleteData(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) {
    console.error(`DELETE FAILED [${table}]:`, error.message);
    alert(`Delete failed (${table}): ${error.message}`);
  }
}
