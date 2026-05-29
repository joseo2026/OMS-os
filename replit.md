# Ocasio Mechanical Services LLC — Business OS

A full-featured business operating system for a mobile automotive service business in Florida.

## What it does

- **Dashboard** — Monthly revenue, YTD net profit, tax estimates (SE + federal), mileage deduction summary, recent jobs
- **New Job** — Multi-step wizard (Customer → Vehicle → Services → Invoice) with AI-generated service notes on receipts
- **Jobs** — Full job history with searchable receipt viewer and print/PDF support
- **Customers** — Customer database with linked vehicles
- **Vehicles** — Vehicle records with service history and last-service tracking
- **Expenses** — Business expense tracking by category with YTD totals
- **Mileage** — IRS standard mileage log ($0.67/mi) for tax deductions
- **Appointments** — Appointment scheduling with status tracking

## Tech stack

- **Frontend**: React + Vite (port 5000)
- **Backend**: Express (port 3001) — proxies AI invoice notes via Anthropic API
- **Storage**: Browser `localStorage` (no database required)
- **AI**: Claude claude-opus-4-5 for generating professional service summaries on invoices

## Running

```
npm run dev
```

This starts both the Vite dev server (port 5000) and the Express API server (port 3001) concurrently.

## Environment variables

- `ANTHROPIC_API_KEY` — Required for AI-generated invoice notes. Without it, a default message is used.

## User preferences

- Florida-based mobile mechanic business
- FL sales tax rate: 7% (applied to parts only)
- IRS mileage rate: $0.67/mi
- Tax estimates: 15.3% SE + 22% federal income tax
