@echo off
:: start.bat — Windows launcher for India Option Pricing Engine
:: Usage: double-click or run from cmd: start.bat

echo.
echo  India Option Pricing Engine v2.0
echo ====================================
echo.

:: ── Backend ──────────────────────────────
echo [1/4] Setting up Python virtual environment...
cd /d "%~dp0backend"

if not exist "venv" (
    python -m venv venv
)

call venv\Scripts\activate.bat

echo [2/4] Installing Python dependencies...
pip install -r requirements.txt -q

echo [3/4] Starting backend on port 8000...
start "India Pricer Backend" cmd /k "venv\Scripts\activate.bat && python run.py"

:: Wait a moment
timeout /t 3 /nobreak > nul

:: ── Frontend ─────────────────────────────
echo [4/4] Starting frontend on port 5173...
cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo Installing npm packages...
    npm install
)

start "India Pricer Frontend" cmd /k "npm run dev"

timeout /t 3 /nobreak > nul

echo.
echo ====================================
echo  Both servers starting...
echo.
echo  Frontend  -^>  http://localhost:5173
echo  API Docs  -^>  http://localhost:8000/api/docs
echo ====================================
echo.
echo  Close the two terminal windows to stop the servers.
pause
