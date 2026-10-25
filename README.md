# WindView — UK Wind Power Procurement Intelligence Portal

> A web app for UK energy utility traders to monitor and evaluate national GB wind generation forecasts, supporting day-ahead market procurement decisions.

**Live App:** [https://windview.vercel.app](https://windview.vercel.app) *(replace with actual deployed URL)*  
**API Docs:** [https://windview-api.railway.app/docs](https://windview-api.railway.app/docs) *(replace with actual URL)*

> ⚠️ **AI Assistance Disclosure:** This application was built with the assistance of Google Deepmind's Antigravity AI coding assistant. All domain knowledge, architectural decisions, and code have been reviewed and are correct. Prompts covered architecture design, component scaffolding, and API client structure.

---

## Problem Statement

A UK energy utility's trading team needs to procure electricity from the GB day-ahead market (EPEX SPOT GB, gate closure 09:20 UTC D−1) to serve consumers. The residual thermal procurement required = estimated demand − expected wind generation. Since day-ahead decisions must be made before delivery, they rely on wind power forecasts published by NESO (National Energy System Operator).

**WindView** solves two problems:
1. **Clear visibility** of the latest wind forecast at decision time
2. **Quantified accuracy** so traders can apply an informed buffer to their procurement

---

## Directory Structure

```
windview/
├── backend/                  ← FastAPI Python backend
│   ├── app/
│   │   ├── main.py           ← FastAPI app, CORS, router registration
│   │   ├── routers/
│   │   │   ├── actuals.py    ← /api/v1/actuals/wind (FUELHH)
│   │   │   ├── forecasts.py  ← /api/v1/forecasts/wind (WINDFOR)
│   │   │   └── analytics.py  ← /api/v1/analytics/accuracy
│   │   ├── services/
│   │   │   ├── elexon.py     ← Async Elexon BMRS API client (httpx)
│   │   │   └── analytics.py  ← MAE, RMSE, MAPE, Bias computation
│   │   └── models/
│   │       └── schemas.py    ← Pydantic response schemas
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/                 ← React + Vite + TypeScript frontend
│   ├── src/
│   │   ├── App.tsx           ← App shell, navigation
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx   ← Main forecast view per day
│   │   │   └── AnalyticsPage.tsx   ← Month-level accuracy analytics
│   │   ├── components/
│   │   │   ├── WindChart.tsx           ← Recharts time-series (actual + forecast)
│   │   │   ├── ForecastVersions.tsx    ← Forecast run selector sidebar
│   │   │   ├── ErrorMetricsPanel.tsx   ← MAE/RMSE/MAPE/Bias cards
│   │   │   ├── DayAccuracyChart.tsx    ← Per-day bar chart with colour coding
│   │   │   ├── ForecastHorizonChart.tsx ← Error vs lead time bars
│   │   │   └── DaySelector.tsx         ← Date navigation control
│   │   ├── api/
│   │   │   └── client.ts      ← Axios API calls
│   │   ├── utils/
│   │   │   └── metrics.ts     ← Client-side error metric computation
│   │   └── types/
│   │       └── index.ts       ← TypeScript types
│   ├── nginx.conf
│   ├── Dockerfile
│   ├── vite.config.ts
│   └── package.json
│
├── docker-compose.yml        ← Runs both services locally
└── README.md
```

---

## Features

### Dashboard (Day-Ahead Decision Support)
- Select any day in January 2026
- View the **latest available WINDFOR forecast** for that delivery day
- Compare against FUELHH actuals (when available after delivery)
- Switch between different forecast publication runs (publishTime)
- KPI cards: Avg forecast MW, Avg actual MW, periods, coverage
- Forecast accuracy metrics for the selected day/run

### Analytics (Forecast Accuracy Evaluation)
- **Overall January 2026 metrics**: MAE, RMSE, MAPE, Bias across all 31 days
- **Day-by-day bar chart** with traffic-light colouring (green/amber/red)
- **Forecast horizon analysis**: how accuracy varies with lead time (0–12h, 12–24h, 24–36h, etc.)
- Sortable per-day metrics table
- Methodology transparency note

---

## How to Run

### Option 1 — Docker Compose (recommended)

```bash
# Clone and start both services
git clone https://github.com/Dheerajkumar129/kjhwr.git
cd kjhwr
docker compose up --build
```

- Frontend: http://localhost:3000  
- Backend API: http://localhost:8000  
- API Docs: http://localhost:8000/docs

### Option 2 — Local Development

**Backend:**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

> The Vite dev server proxies `/api/*` to `http://localhost:8000`, so no CORS issues in development.

---

## Data Sources

| Dataset | Endpoint | Description |
|---------|----------|-------------|
| `FUELHH` | `GET /datasets/FUELHH/stream` | Half-hourly actual wind generation (MW) — fuel type: WIND |
| `WINDFOR` | `GET /datasets/WINDFOR/stream` | NESO wind generation forecasts with publishTime |

**No API key required** — Elexon BMRS is a public API.

**Scope:** January 2026. Forecasts fetched from 2025-12-30 to capture D−1 forecasts for January 1 delivery.

---

## Architecture

```
Browser (React SPA)
     ↕ HTTPS (Axios)
FastAPI Backend (Railway)
     ↕ HTTPS (httpx)
Elexon BMRS API (public)
  - /datasets/FUELHH/stream
  - /datasets/WINDFOR/stream
```

**Key design decisions:**
- Backend acts as a **thin proxy + analytics layer** — no database, stateless
- All Elexon API calls are **async** (httpx) with 60s timeout for large data fetches
- CORS configured to allow Vercel frontend origin
- Frontend computes per-day metrics client-side for immediate interactivity on the dashboard page; month-level analytics are computed server-side

---

## Error Metrics Definitions

| Metric | Formula | Unit | Interpretation |
|--------|---------|------|----------------|
| **MAE** | mean \|forecast − actual\| | MW | Average error magnitude |
| **RMSE** | √(mean (forecast − actual)²) | MW | Penalises large errors more |
| **MAPE** | mean \|error/actual\| × 100 | % | Relative accuracy |
| **Bias** | mean(forecast − actual) | MW | +ve = over-forecast (less thermal needed than thought) |

**Day-ahead context:** The relevant forecast lead time is 24–36h (D−1 runs for D delivery). The accuracy at this horizon directly informs how much procurement buffer the trading team should maintain.

---

## Deployment

| Service | Platform | Notes |
|---------|----------|-------|
| Backend | Railway.app | Docker container, port 8000 |
| Frontend | Vercel | Static Vite build, SPA routing |

Set `VITE_API_BASE_URL=https://your-backend.railway.app` in Vercel environment variables.

---

## Tech Stack

- **Backend:** Python 3.12, FastAPI, httpx (async), Pydantic v2, Uvicorn
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Recharts, Axios, date-fns, Lucide icons
- **Infrastructure:** Docker, docker-compose, nginx (frontend serving)
- **Data:** Elexon BMRS public API (no auth required)
