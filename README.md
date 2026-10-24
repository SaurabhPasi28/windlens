# WindLens

> Wind generation forecasting and accuracy analytics for UK day-ahead electricity procurement.

WindLens is a React 19 + FastAPI dashboard that compares Elexon BMRS `WINDFOR` day-ahead wind-generation forecasts with `FUELHH` actual wind generation and reports **MAE, RMSE, MAPE, bias, and an accuracy score** — giving trading desks a clear, quantified picture of forecast uncertainty before the gate closure.

> **AI tools used:** This project was built with assistance from Google Gemini / Antigravity AI coding assistant (architecture review, code improvements, bug fixes, test generation). All logic, design decisions, and final code were reviewed and verified by the developer.

---

## Architecture

```
┌──────────────────────┐        Elexon BMRS API
│  React 19 + Vite     │ ──────▶  FUELHH  (actuals)
│  Tailwind CSS v4     │         WINDFOR  (forecasts)
│  (Vercel)            │              │
└──────────┬───────────┘              │
           │ REST / JSON              ▼
┌──────────▼───────────┐   ┌──────────────────────┐
│  FastAPI + httpx      │◀──│ /api/forecast        │
│  Python 3.12          │   │ /api/summary         │
│  (Render · Docker)    │   │ /api/health          │
└──────────────────────┘   └──────────────────────┘
```

- **Frontend:** React 19, Vite 8, Tailwind CSS v4 — single-page app deployable to Vercel.
- **Backend:** FastAPI + httpx; containerised with Docker; deployable to Render.
- **Data scope:** Elexon BMRS `FUELHH` (fuel-type `WIND`) and `WINDFOR` datasets, January 2026.
- **Decision gate:** The latest `WINDFOR` publication at or before **16:00 UTC** on the eve of delivery is used — matching the UK day-ahead gate closure convention.

---

## Features

| Feature | Detail |
|---|---|
| Decision brief | Overview page shows forecast, latest MW figure, gate-cutoff time, and procurement signal |
| Forecast explorer | Interactive SVG chart with hover tooltip; filterable table (all / over / under forecast); one-click CSV export |
| Accuracy analysis | MAE, RMSE, **MAPE**, Bias, accuracy score; error-distribution bar chart; procurement implication text |
| Monthly trends | Per-day MAE bar chart for the full January 2026 pilot period; click a bar to drill into that day |
| Dark mode | Full dark theme; toggled per session |
| Direct date input | Click the formatted date to open a native date picker |
| Demo fallback | When `ENABLE_DEMO_FALLBACK=true`, shape-realistic synthetic data is served and labelled **Demo** |

---

## Environment variables

### Backend (`backend/.env`)

Copy `backend/.env.example` → `backend/.env` for local development.

| Variable | Required | Default | Description |
|---|---|---|---|
| `APP_NAME` | No | `WindLens Energy Forecast API` | FastAPI app title |
| `APP_DESCRIPTION` | No | — | API description |
| `BMRS_BASE_URL` | No | `https://data.elexon.co.uk/bmrs/api/v1/datasets` | Elexon datasets base URL |
| `DEFAULT_DELIVERY_DATE` | No | `2026-01-15` | Date used when no `delivery_date` query param is supplied |
| `ENABLE_DEMO_FALLBACK` | No | `true` | `true` = return synthetic demo data when BMRS is unavailable; set `false` in production |
| `CORS_ORIGINS` | **Yes (prod)** | `http://localhost:5173,http://localhost:4173` | Comma-separated allowed origins |
| `DECISION_HOUR_UTC` | No | `16` | Gate-closure hour (UTC) used for forecast selection |
| `HTTPX_TIMEOUT` | No | `20` | Seconds before Elexon API requests time out |

### Frontend (`frontend/.env`)

Copy `frontend/.env.example` → `frontend/.env`.

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | **Yes (prod)** | `http://localhost:8000/api/forecast` | Backend forecast endpoint (can be base URL or full path — both are handled) |

> `VITE_*` variables are baked into the browser bundle at build time. Never put secrets here.

---

## Run locally

### Without Docker

**Backend:**

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn main:app --reload --port 8000
```

**Frontend** (separate terminal):

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:5173`. API docs: `http://localhost:8000/docs`.

### With Docker Compose

```powershell
cd E:\Revision\GridBricks
docker compose up --build
```

App: `http://localhost:4173` · API docs: `http://localhost:8000/docs`

Stop and remove:

```powershell
docker compose down
```

---

## Run backend tests

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install pytest pytest-asyncio httpx
python -m pytest tests/ -v
```

Tests cover: `filter_actuals`, `select_forecasts` (gate logic), `compute_metrics` (MAE, RMSE, MAPE, bias), `combine_data`, demo-fallback shape, and HTTP endpoint validation.

---

## Deploy

### Backend → Render

1. Push this repo to a public GitHub repository.
2. In Render: **New → Blueprint**, select the repo. Render reads `render.yaml`.
3. Set `CORS_ORIGINS` to your Vercel URL (e.g. `https://windlens.vercel.app`).
4. Deploy `windlens-api`.
5. Verify: `https://<render-service>.onrender.com/api/health` → `{"status":"ok","service":"windlens-api","version":"1.1.0"}`.

### Frontend → Vercel

1. In Vercel: **Add New → Project**, import the repo.
2. Set **Root Directory** → `frontend`.
3. Add environment variable: `VITE_API_URL=https://<render-service>.onrender.com/api/forecast`
4. Deploy, then copy the Vercel URL back to Render's `CORS_ORIGINS` and redeploy.

`frontend/vercel.json` includes the SPA rewrite rule for client-side routing.

---

## API reference

```
GET /                              → health message
GET /api/health                    → {"status":"ok","service":"windlens-api","version":"1.1.0"}
GET /api/forecast?delivery_date=YYYY-MM-DD
                                   → forecast + actual half-hourly points, metrics
GET /api/summary                   → per-day MAE/RMSE/MAPE/accuracy for all of January 2026
```

Interactive docs: `/docs` (Swagger UI) and `/redoc`.

### `/api/forecast` response shape

```json
{
  "deliveryDate": "2026-01-15",
  "source": "Elexon BMRS",
  "decisionCutoff": "2026-01-14T16:00:00+00:00",
  "decisionHourUTC": 16,
  "datasets": { "actuals": "FUELHH", "forecasts": "WINDFOR" },
  "intervalCount": 48,
  "forecast": [
    { "startTime": "...", "time": "00:00", "forecast": 950.0, "actual": 920.0, "error": 30.0, "publishTime": "..." }
  ],
  "metrics": { "mae": 85.2, "rmse": 110.4, "mape": 9.8, "bias": -12.1, "accuracy": 92.9 }
}
```

---

## Project structure

```
backend/
  main.py              FastAPI app: BMRS fetch, gate logic, metrics, /api/forecast, /api/summary
  requirements.txt     fastapi, uvicorn, httpx, python-dotenv
  Dockerfile           python:3.12-slim; runs uvicorn on 0.0.0.0:8000
  .env.example         Non-secret configuration template
  tests/
    test_main.py       Pytest unit tests (metrics, gate, parsing, endpoints)
frontend/
  src/
    App.jsx            All pages: Overview, ForecastExplorer, Accuracy, Monthly + shared components
    index.css          Tailwind v4 import + dark-variant rule
    main.jsx           React root mount
  public/
    favicon.svg
    icons.svg
  Dockerfile           Multi-stage: node:22-alpine build → serve
  vercel.json          SPA rewrite rule + Vite build settings
  .env.example         VITE_API_URL template
docker-compose.yml     Local orchestration (backend + frontend)
render.yaml            Render Blueprint (Docker web service)
README.md              This file
```

---

## Submission checklist

- [ ] `cd frontend && npm run lint && npm run build`
- [ ] `cd backend && python -m pytest tests/ -v`
- [ ] Backend deployed to Render; `/api/health` returns 200
- [ ] Frontend deployed to Vercel; linked to Render backend via `VITE_API_URL`
- [ ] Render `CORS_ORIGINS` includes the Vercel deployment URL
- [ ] All URLs verified in incognito / private mode
- [ ] GitHub repo is public with an anonymous name
- [ ] Video (≤10 min): Part 1 customer pitch, Part 2 technical walkthrough
- [ ] Submission form completed with repo URL, app URL, API health URL, video URL
