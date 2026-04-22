@echo off
echo ========================================
echo Starting QuickServe Backend
echo ========================================
echo.

REM Use virtual environment Python
set PYTHON_EXE=venv\Scripts\python.exe

REM Check if venv exists
if not exist %PYTHON_EXE% (
    echo ERROR: Virtual environment not found!
    echo Please run: python -m venv venv
    echo Then run: venv\Scripts\activate
    echo Then run: pip install -r requirements.txt
    pause
    exit /b
)

echo Using Python: %PYTHON_EXE%
echo.

REM Clear cache
echo Clearing Python cache...
for /d /r . %%d in (__pycache__) do @if exist "%%d" rd /s /q "%%d"
del /s /q *.pyc >nul 2>&1
echo Cache cleared.
echo.

REM Start the server
echo Starting backend server on http://192.168.8.125:8000
echo.
%PYTHON_EXE% -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

pause
