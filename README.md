# QuickServe

QuickServe is a full-stack group ordering system for cafes/restaurants.

This repository contains:
- `quickserve-frontend`: Next.js customer + admin web app
- `fastapi-backend`: FastAPI backend with SQLite, WebSocket support, and scheduler jobs

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS
- Backend: FastAPI, SQLAlchemy (async), SQLite, APScheduler

## Prerequisites

- Node.js 20+ and npm
- Python 3.10+ and `pip`
- Git

## 1) Clone

```bash
git clone https://github.com/kalvin-l/QuickServe.git
cd QuickServe
```

## 2) Backend Setup (`fastapi-backend`)

### Create virtual environment

Windows (PowerShell):
```powershell
cd fastapi-backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

macOS/Linux:
```bash
cd fastapi-backend
python3 -m venv .venv
source .venv/bin/activate
```

### Install dependencies

```bash
pip install -r requirements.txt
```

### Create `.env`

Create `fastapi-backend/.env`:

```env
API_HOST=0.0.0.0
API_PORT=8000
API_PREFIX=/api
FRONTEND_URL=http://localhost:3000
DATABASE_URL=sqlite+aiosqlite:///./quickserve.db
SECRET_KEY=replace-with-your-own-long-random-secret
MAX_GROUP_SIZE=6
JOIN_REQUEST_TIMEOUT_MINUTES=5
SESSION_TIMEOUT_HOURS=24
TAX_RATE=0.12
ENVIRONMENT=development
DEBUG=true
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=10
TIMEZONE=UTC
ENABLE_SMART_SESSION_END=true
```

### Run backend

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend URLs:
- API root: `http://localhost:8000/`
- Swagger docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

On first startup, backend auto-creates:
- SQLite DB file (`quickserve.db`)
- Default admin account:
  - Email: `admin@gmail.com`
  - Password: `admin@123`

## 3) Frontend Setup (`quickserve-frontend`)

Open a new terminal:

```bash
cd quickserve-frontend
npm install
```

### Create `.env.local`

Create `quickserve-frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### Run frontend

```bash
npm run dev
```

Frontend URL:
- `http://localhost:3000`

## 4) Run Both Together

Use two terminals:

- Terminal 1:
  - Activate backend venv
  - Run FastAPI on `:8000`
- Terminal 2:
  - Run Next.js on `:3000`

## 5) Build for Production

Frontend:
```bash
cd quickserve-frontend
npm run build
npm run start
```

Backend:
```bash
cd fastapi-backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Common Issues

- CORS/API errors in frontend:
  - Check `NEXT_PUBLIC_API_URL` points to backend `http://localhost:8000/api`.
- WebSocket connection fails:
  - Check `NEXT_PUBLIC_WS_URL=ws://localhost:8000`.
- Missing Python packages:
  - Ensure venv is activated before `pip install -r requirements.txt`.
- Port already in use:
  - Change ports in env/commands and keep frontend/backend URLs aligned.

## License

Add your preferred open-source license file (for example, `MIT`) in the repository root.
