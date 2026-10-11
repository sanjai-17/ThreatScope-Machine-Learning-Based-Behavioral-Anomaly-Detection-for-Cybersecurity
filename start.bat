@echo off
echo ========================================================
echo ThreatScope: Machine Learning-Based Anomaly Detection
echo ========================================================
echo Starting Backend and Frontend Servers...
echo.

start "ThreatScope Backend (Port 8000)" powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0run_backend.ps1"
start "ThreatScope Frontend (Port 5173)" powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0run_frontend.ps1"

echo Both services launched in separate windows!
echo Backend:  http://localhost:8000  (API Docs: http://localhost:8000/docs)
echo Frontend: http://localhost:5173
echo ========================================================
pause
