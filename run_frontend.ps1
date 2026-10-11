# ThreatScope Frontend Startup Script (Windows PowerShell)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$ScriptDir\frontend"

Write-Host "Starting ThreatScope Frontend on http://localhost:5173..." -ForegroundColor Cyan

npm run dev
