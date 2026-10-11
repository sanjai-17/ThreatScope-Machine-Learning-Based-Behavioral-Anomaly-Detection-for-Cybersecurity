# ThreatScope Backend Startup Script (Windows PowerShell)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$ScriptDir\backend"

Write-Host "Starting ThreatScope Backend on http://localhost:8000..." -ForegroundColor Cyan

& "$ScriptDir\venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
