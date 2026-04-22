# How to Run QuickServe FastAPI Backend

Complete guide to start and run the Python backend server.

---

## Prerequisites

1. **Python installed** (3.8 or higher)
2. **Virtual environment created**
3. **Dependencies installed**

---

## Quick Start (Development Mode)

### Step 1: Activate Virtual Environment

**Windows (Command Prompt):**
```cmd
cd c:\DG\fastapi-backend
venv\Scripts\activate
```

**Windows (PowerShell):**
```powershell
cd c:\DG\fastapi-backend
venv\Scripts\Activate.ps1
```

**Linux/Mac:**
```bash
cd /path/to/fastapi-backend
source venv/bin/activate
```

You should see `(venv)` in your terminal prompt.

---

### Step 2: Install Dependencies (First Time Only)

```bash
pip install -r requirements.txt
```

Wait for installation to complete (may take 2-5 minutes).

---

### Step 3: Run the Server

**Option A: Run with Python (Recommended)**
```bash
python main.py
```

**Option B: Run with Uvicorn Directly**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Option C: Run with Specific Port**
```bash
python main.py
# Or specify custom port:
uvicorn main:app --reload --port 8080
```

---

### Step 4: Verify Server is Running

You should see output like:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [12345] using StatReload
INFO:     Started server process [12346]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

---

## Access the API

Once the server is running, open your browser:

### **API Root:**
```
http://localhost:8000
```
Response:
```json
{
  "message": "QuickServe API is running!",
  "version": "1.0.0",
  "docs": "/docs",
  "status": "healthy"
}
```

### **Interactive API Documentation (Swagger UI):**
```
http://localhost:8000/docs
```
This shows all your endpoints with testing interface!

### **Alternative Documentation (ReDoc):**
```
http://localhost:8000/redoc
```

### **Health Check:**
```
http://localhost:8000/health
```

---

## Development vs Production

### **Development Mode (With Auto-Reload)**
```bash
# Auto-restarts when you save code changes
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or using Python
python main.py
```

**Features:**
- ✅ Auto-reload on code changes
- ✅ Detailed error messages
- ✅ Debug information
- ✅ Hot module replacement

---

### **Production Mode (Without Auto-Reload)**
```bash
# Single worker, no reload
uvicorn main:app --host 0.0.0.0 --port 8000

# Multiple workers (better performance)
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

**Features:**
- ✅ Better performance
- ✅ Multiple workers
- ✅ No auto-reload
- ✅ Optimized for production

---

## Common Uvicorn Options

```bash
# Basic usage
uvicorn main:app --reload

# Specify host and port
uvicorn main:app --host 127.0.0.1 --port 8080 --reload

# Multiple workers (production)
uvicorn main:app --workers 4

# SSL/HTTPS (production)
uvicorn main:app --host 0.0.0.0 --port 443 --ssl-keyfile key.pem --ssl-certfile cert.pem

# Log level
uvicorn main:app --log-level debug

# With access logs
uvicorn main:app --reload --log-level info
```

---

## Stopping the Server

**Press:** `Ctrl + C` in the terminal where the server is running.

---

## Testing the API

### **Using Browser:**
1. Open `http://localhost:8000/docs`
2. Click on any endpoint (e.g., `GET /`)
3. Click "Try it out"
4. Click "Execute"
5. See the response

### **Using cURL:**
```bash
# Test root endpoint
curl http://localhost:8000/

# Test health check
curl http://localhost:8000/health
```

### **Using Python:**
```python
import requests

response = requests.get("http://localhost:8000/")
print(response.json())
```

---

## Project Structure After Setup

```
fastapi-backend/
├── main.py                  # Main application file ✅
├── requirements.txt         # Python dependencies ✅
├── venv/                    # Virtual environment
├── quickserve.db           # SQLite database (auto-created)
├── .env                    # Environment variables (create this)
└── app/                    # Application code (to be created)
    ├── __init__.py
    ├── config.py
    ├── core/
    ├── models/
    ├── schemas/
    ├── services/
    └── routers/
```

---

## Environment Variables (.env)

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=sqlite+aiosqlite:///./quickserve.db

# API Settings
API_HOST=0.0.0.0
API_PORT=8000
API_PREFIX=/api

# Security
SECRET_KEY=your-secret-key-change-this-in-production

# Business Logic
MAX_GROUP_SIZE=6
JOIN_REQUEST_TIMEOUT_MINUTES=5
SESSION_TIMEOUT_HOURS=24
TAX_RATE=0.12

# Environment
ENVIRONMENT=development
DEBUG=True
```

---

## Troubleshooting

### **Issue: Port 8000 Already in Use**
```bash
# Find process using port 8000 (Windows)
netstat -ano | findstr :8000

# Kill the process (replace PID with actual process ID)
taskkill /PID 12345 /F

# Or use a different port
uvicorn main:app --port 8080 --reload
```

### **Issue: Module Not Found Error**
```bash
# Make sure virtual environment is activated
# Windows:
venv\Scripts\activate

# Make sure dependencies are installed
pip install -r requirements.txt
```

### **Issue: Permission Denied (PowerShell)**
```powershell
# Allow running scripts (PowerShell)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### **Issue: Import Errors**
```bash
# Make sure you're in the correct directory
cd c:\DG\fastapi-backend

# Check Python path
python -c "import sys; print(sys.path)"
```

---

## Next Steps

Once the server is running:

1. ✅ Test the API at `http://localhost:8000/docs`
2. ✅ Create the database models
3. ✅ Implement the services
4. ✅ Add API endpoints
5. ✅ Connect to frontend

---

## Useful Commands Reference

```bash
# Activate virtual environment
venv\Scripts\activate          # Windows
source venv/bin/activate       # Linux/Mac

# Deactivate virtual environment
deactivate

# Install dependencies
pip install -r requirements.txt

# Add new dependency
pip install package-name
pip freeze > requirements.txt

# Run server (development)
python main.py

# Run server (production)
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4

# Check installed packages
pip list

# Update all packages
pip install --upgrade -r requirements.txt
```

---

## FastAPI Automatic Documentation

When you run the server, FastAPI automatically provides:

1. **Swagger UI** (interactive docs)
   - `http://localhost:8000/docs`

2. **ReDoc** (beautiful documentation)
   - `http://localhost:8000/redoc`

3. **OpenAPI Schema** (JSON)
   - `http://localhost:8000/openapi.json`

These docs update automatically as you add endpoints!

---

## Monitoring & Logs

The server will log all requests:

```
INFO:     127.0.0.1:54321 - "GET / HTTP/1.1" 200 OK
INFO:     127.0.0.1:54321 - "GET /health HTTP/1.1" 200 OK
```

To see more detailed logs:
```bash
uvicorn main:app --log-level debug --reload
```

---

**🎉 Your FastAPI backend is now ready to develop!**

Start the server with: `python main.py`
