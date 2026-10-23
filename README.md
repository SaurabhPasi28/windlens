# GridBricks Energy Intelligence

GridBricks is a React + FastAPI pilot dashboard for UK day-ahead wind generation decisions. It focuses on the January 2026 scope from the GridBricks full-stack challenge.

## What the product does

- Shows the latest wind forecast available by the day-ahead decision cutoff.
- Compares Elexon BMRS `WINDFOR` forecasts with `FUELHH` actual wind generation.
- Reports MAE, RMSE, bias, and a readable accuracy score.
- Provides an explorer table for half-hourly delivery intervals.
- Includes a responsive UI and Tailwind class-based dark mode.

The backend selects the most recent `publishTime` at or before 16:00 UTC on the day before delivery. The application is limited deliberately to January 2026, as required by the brief.

## Project structure

```text
backend/
  main.py              FastAPI API, BMRS ingestion, selection, metrics
  requirements.txt     Python dependencies
frontend/
  src/App.jsx          Dashboard views and API integration
  src/App.css          Product layout and theme styles
  src/index.css        Tailwind import and dark variant
  vite.config.js       Vite + Tailwind configuration
Dockerfile             Multi-stage frontend image
docker-compose.yml     Frontend and backend local orchestration
```

## Run locally

### Without Docker

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. For a hosted frontend, copy `frontend/.env.example` to the deployment environment and set `VITE_API_URL` to the hosted FastAPI URL.

### With Docker

Run the commands from the **project root** (`E:\Revision\GridBricks`), the folder containing `docker-compose.yml`:

```powershell
cd E:\Revision\GridBricks
docker compose up --build
```

Open `http://localhost:4173`. The API is available at `http://localhost:8000/docs`.

Stop the containers with `Ctrl+C`, or from the project root run:

```powershell
docker compose down
```

### What Docker is doing here

Docker packages an application together with its runtime and dependencies into an isolated, repeatable container. This avoids the classic “works on my machine” problem.

This project has two containers:

- **backend**: builds from `backend/Dockerfile`, installs Python/FastAPI dependencies, and serves the API on port `8000`.
- **frontend**: builds the Vite app from `frontend/Dockerfile`, then serves the production `dist` files on port `4173`.

`docker-compose.yml` starts both containers as one local application. `--build` is useful after changing source code or dependency files; without it, Docker may reuse an older image.

In general:

- An **image** is the packaged blueprint.
- A **container** is a running instance of an image.
- A **Dockerfile** describes how to build an image.
- Docker Compose describes how multiple containers connect and run together.
- A **volume** persists data outside a container; this stateless dashboard does not need one.

## API

```text
GET /api/forecast?delivery_date=2026-01-15
GET /api/health
```

The service uses the official Elexon BMRS datasets:

- `FUELHH` for actual generation, filtered to `fuelType=WIND`
- `WINDFOR` for forecasts, filtered by `startTime` and `publishTime`

If BMRS is unavailable, a clearly-labelled deterministic BMRS-shaped fallback keeps the demo usable. It is not presented as live market data.

## AI and delivery notes

AI tools were used to accelerate UI scaffolding, implementation, and review. Domain rules and the forecast selection logic are documented in the backend source and this README.

The frontend includes `frontend/vercel.json` for a Vercel deployment. The FastAPI service can be deployed with the included backend Dockerfile to a container host, then supplied as `VITE_API_URL`. A public GitHub URL, hosted URL, and unlisted demo-video URL should be added to this section after deployment; they cannot be created from this local workspace without the owner's accounts and credentials.
