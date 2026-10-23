# WindLens

> A wind generation forecasting and accuracy analytics platform using Elexon data to support UK day-ahead electricity procurement decisions.

WindLens is a React/Vite dashboard backed by a FastAPI service. It compares Elexon BMRS `WINDFOR` day-ahead forecasts with `FUELHH` actual wind generation and reports MAE, RMSE, bias, and an accuracy score.

## Architecture

- **Frontend:** React 19, Vite, Tailwind CSS; deployable to Vercel.
- **Backend:** FastAPI and httpx; deployable as a Docker service on Render.
- **Data:** Elexon BMRS `FUELHH` and `WINDFOR` datasets.
- **Scope:** The pilot is intentionally limited to January 2026.

## Environment variables

### Backend

Copy [`backend/.env.example`](backend/.env.example) to `backend/.env` for local development:

| Variable | Required | Description |
| --- | --- | --- |
| `APP_NAME` | No | FastAPI application name. |
| `APP_DESCRIPTION` | No | API description and product description. |
| `BMRS_BASE_URL` | No | Elexon BMRS datasets API base URL. |
| `DEFAULT_DELIVERY_DATE` | No | Date used when `/api/forecast` has no query parameter. |
| `ENABLE_DEMO_FALLBACK` | No | Set to `true` to use deterministic demo data when BMRS is unavailable. |
| `CORS_ORIGINS` | Yes in production | Comma-separated frontend origins, for example `https://windlens.vercel.app`. |

Do not commit `.env` files. The committed example contains only non-secret defaults.

### Frontend

Copy [`frontend/.env.example`](frontend/.env.example) to `frontend/.env`:

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_URL` | Yes in production | Full backend forecast endpoint, for example `https://windlens-api.onrender.com/api/forecast`. |

Vite embeds `VITE_*` values into the browser bundle, so never put secrets in frontend environment variables.

## Run locally

### Without Docker

Backend:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn main:app --reload --port 8000
```

In another terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:5173`. API documentation is available at `http://localhost:8000/docs`.

### With Docker Compose

From the repository root:

```powershell
docker compose up --build
```

Open `http://localhost:4173`; the API is at `http://localhost:8000/docs`.

## Deploy the backend to Render

1. Push this repository to GitHub.
2. In Render, choose **New > Blueprint** and select the repository. Render will read [`render.yaml`](render.yaml).
3. Set `CORS_ORIGINS` to the final Vercel URL, such as `https://windlens.vercel.app`. Include comma-separated preview/custom domains only when needed.
4. Deploy the `windlens-api` service.
5. Verify `https://<render-service>.onrender.com/api/health` returns `{"status":"ok","service":"windlens-api"}`.
6. Copy the Render service URL for the Vercel setup below.

The included [`backend/Dockerfile`](backend/Dockerfile) binds Uvicorn to `0.0.0.0:8000`, which is suitable for Render's Docker runtime. For a non-Docker Render service, use `pip install -r requirements.txt` as the build command and `uvicorn main:app --host 0.0.0.0 --port $PORT` as the start command.

## Deploy the frontend to Vercel

1. In Vercel, choose **Add New > Project** and import this repository.
2. Set **Root Directory** to `frontend`.
3. Keep the framework as **Vite**. Use `npm run build` and `dist` if Vercel does not detect them automatically.
4. Add the production environment variable:

   ```text
   VITE_API_URL=https://<render-service>.onrender.com/api/forecast
   ```

5. Deploy or redeploy the project.
6. Add the final Vercel deployment URL to Render's `CORS_ORIGINS` and redeploy the backend if the URL changed.

[`frontend/vercel.json`](frontend/vercel.json) includes the SPA rewrite required for client-side navigation and direct page refreshes.

## API

```text
GET /api/health
GET /api/forecast?delivery_date=2026-01-15
```

When `ENABLE_DEMO_FALLBACK=true`, the API returns clearly labelled deterministic BMRS-shaped data if Elexon is unavailable or returns no matching rows. Set it to `false` in production when a failed upstream request must be surfaced instead.

## Project structure

```text
backend/
  main.py              FastAPI API, BMRS ingestion, selection, metrics
  Dockerfile           Render-compatible container
  .env.example         Backend configuration template
frontend/
  src/App.jsx          Dashboard and API integration
  Dockerfile           Production static asset container
  vercel.json          Vercel build and SPA routing configuration
render.yaml            Render Blueprint
docker-compose.yml     Local orchestration
```
