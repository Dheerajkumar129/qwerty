# WindView — UK Wind Power Procurement Intelligence Portal

> A web app for UK energy utility traders to monitor and evaluate national GB wind generation forecasts, supporting day-ahead market procurement decisions.

**Live App:** `https://kjhwr.vercel.app` *(or your assigned Vercel URL)*  
**API Docs:** `https://kjhwr.vercel.app/api/docs`

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
├── api/
│   └── index.py              ← Vercel serverless FastAPI entrypoint
├── vercel.json               ← Unified full-stack Vercel deployment config
├── requirements.txt          ← Root Python dependencies for Vercel
├── docker-compose.yml        ← Runs both services locally via Docker
│
├── backend/                  ← FastAPI Python backend
│   ├── app/
│   │   ├── main.py           ← FastAPI app, CORS, router registration
│   │   ├── routers/
│   │   │   ├── actuals.py    ← /api/v1/actuals/wind (FUELHH)
│   │   │   ├── forecasts.py  ← /api/v1/forecasts/wind (WINDFOR)
│   │   │   └── analytics.py  ← /api/v1/analytics/accuracy
│   │   ├── services/
│   │   │   ├── elexon.py     ← Async Elexon BMRS API client (httpx) + caching
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
│   │   │   └── client.ts      ← Axios API calls (same-origin on Vercel)
│   │   ├── utils/
│   │   │   └── metrics.ts     ← Client-side error metric computation
│   │   └── types/
│   │       └── index.ts       ← TypeScript types
│   ├── nginx.conf
│   ├── Dockerfile
│   ├── vite.config.ts
│   └── package.json
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
Browser (React SPA on Vercel)
     ↕ HTTPS (/api/v1/* same-origin)
FastAPI Serverless Function (Vercel Python Runtime)
     ↕ HTTPS (httpx async + in-memory caching)
Elexon BMRS API (public)
  - /datasets/FUELHH/stream
  - /datasets/WINDFOR/stream
```

**Key design decisions:**
- **Single unified deployment on Vercel**: Both React frontend and FastAPI backend run under the same `*.vercel.app` domain via `vercel.json` rewrites. Zero CORS issues and zero cost.
- **In-memory cache**: Elexon stream responses are cached in memory for sub-second repeat analytics lookups.
- **Async client**: All upstream Elexon API calls use `httpx.AsyncClient` with 60s timeout.
- **Resolution alignment**: FUELHH 30-min actuals are aggregated to hourly values before computing error metrics against hourly WINDFOR forecasts.

---

## Deployment (100% Vercel)

The entire full-stack app deploys to Vercel in 1 click:

1. Import your GitHub repository (`https://github.com/Dheerajkumar129/kjhwr`) into Vercel.
2. Vercel automatically detects `vercel.json` and configures:
   - Frontend static build from `frontend/`
   - Python serverless functions from `api/index.py` using `requirements.txt`
3. Click **Deploy**. Both the web portal and the API are live at `https://<your-project>.vercel.app`.

---

## Tech Stack

- **Backend:** Python 3.12, FastAPI, httpx (async), Pydantic v2, Uvicorn
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Recharts, Axios, date-fns, Lucide icons
- **Infrastructure:** Docker, docker-compose, nginx (frontend serving)
- **Data:** Elexon BMRS public API (no auth required)
